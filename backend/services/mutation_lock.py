"""Cross-process, cross-language mutation lock for a shared JSON file.

The TypeScript side (src/utils/mutation-lock.ts) implements the same protocol
against the same lock path, so a Studio request and a CLI command never
interleave their read-modify-write cycles on clips.json.

Protocol
- Acquire: create ``<target>.lock`` with O_EXCL (atomic on NTFS and POSIX),
  then write an owner record ``{pid, host, token, created_at, tool}`` into it.
- Release: unlink the lock only if its owner record still carries our token,
  re-checked before every removal attempt. Another process's lock is never
  removed by a release.
- Contention: poll with backoff until the timeout elapses, then raise a
  FileLockError describing the owner and how to recover. A living owner is
  never displaced merely because time passed.
- Crash recovery: a lock whose recorded owner pid is provably dead on this
  host is removed by one waiter at a time. That waiter first creates
  ``<target>.lock.reclaim`` with O_EXCL (the recovery file), re-reads the lock
  under it, and removes the lock only if it still carries the dead record it
  assessed. The recovery file is released by token, like the lock.
- Unknown owner: a lock with no readable owner record is never removed
  automatically, however old it is. Its owner may be a live process paused
  between creating the file and writing the record, and elapsed time cannot
  prove otherwise. Acquisition fails closed at the timeout and names the file.
- Orphaned recovery file: the recovery file is held for one read and one
  unlink and is never recovered automatically. If a reclaimer crashed there,
  acquisition of a dead lock fails closed at the timeout naming both files.
- PID reuse / foreign host: if the pid is alive (possibly reused) or belongs to
  another host name, the lock is treated as live and acquisition fails closed
  at the timeout with the owner details and the lock path so the operator can
  confirm no Clipperz process holds it and delete it by hand.
- Interrupted acquisition: waiting creates no files.

Why this is mutually exclusive: at most one process can create the lock
(O_EXCL). The lock is removed only by its owner (token-verified) or by a
reclaimer holding the recovery file that has just read a dead record under it;
the recovery file is itself O_EXCL and released only by its creator, so the
record cannot change between that read and the removal (no one else can
remove the lock, and no one can create one while it exists). A live owner's
pid is never assessed as dead, and a record-less lock is never assessed at
all, so no living acquirer loses its lock.

``os.kill(pid, 0)`` is never used on Windows: there it terminates the target.
"""
from __future__ import annotations

import json
import os
import socket
import sys
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator, NamedTuple, Optional

DEFAULT_LOCK_TIMEOUT_MS = 10_000
_POLL_MIN_S = 0.02
_POLL_MAX_S = 0.25


class FileLockError(RuntimeError):
    """Raised when the lock cannot be acquired or recorded. ``code`` is
    ``LOCK_TIMEOUT`` or ``LOCK_RECORD_FAILED``; ``owner`` is the last owner
    record seen, if any."""

    def __init__(self, code: str, message: str, lock_path: str, owner: Optional[dict]):
        super().__init__(message)
        self.code = code
        self.lock_path = lock_path
        self.owner = owner


def lock_path_for(target_path: str) -> str:
    return f"{target_path}.lock"


def reclaim_path_for(lock_path: str) -> str:
    return f"{lock_path}.reclaim"


def _default_timeout_ms() -> int:
    raw = os.environ.get("PODCLI_HISTORY_LOCK_TIMEOUT_MS")
    try:
        value = int(raw) if raw else DEFAULT_LOCK_TIMEOUT_MS
    except ValueError:
        return DEFAULT_LOCK_TIMEOUT_MS
    return value if value >= 0 else DEFAULT_LOCK_TIMEOUT_MS


def _host() -> str:
    return socket.gethostname()


# Windows refuses to delete a file another process has open without
# FILE_SHARE_DELETE, which Python's own open() never requests. A waiter reading
# the owner record holds it for microseconds, so removal retries briefly
# instead of leaving a lock behind that its own owner would then wait on.
REMOVE_RETRY_S = 2.0
_REMOVE_RETRY_STEP_S = 0.025


def pid_alive(pid: int) -> Optional[bool]:
    """True = alive, False = provably dead, None = cannot tell (treated as alive)."""
    if not isinstance(pid, int) or pid <= 0:
        return None
    if os.name == "nt":
        import ctypes
        from ctypes import wintypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        process_query_limited_information = 0x1000
        still_active = 259
        error_invalid_parameter = 87
        error_access_denied = 5
        handle = kernel32.OpenProcess(process_query_limited_information, False, pid)
        if not handle:
            err = ctypes.get_last_error()
            if err == error_invalid_parameter:
                return False
            if err == error_access_denied:
                return True
            return None
        try:
            code = wintypes.DWORD()
            if kernel32.GetExitCodeProcess(handle, ctypes.byref(code)):
                return code.value == still_active
            return None
        finally:
            kernel32.CloseHandle(handle)
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return None


def _parse_owner(raw: str) -> Optional[dict]:
    try:
        value = json.loads(raw.lstrip("﻿"))
    except ValueError:
        return None
    if not isinstance(value, dict):
        return None
    pid, host, token = value.get("pid"), value.get("host"), value.get("token")
    if not isinstance(pid, int) or isinstance(pid, bool) or not isinstance(host, str) or not isinstance(token, str) or not token:
        return None
    return {
        "pid": pid,
        "host": host,
        "token": token,
        "created_at": value.get("created_at") if isinstance(value.get("created_at"), str) else "",
        "tool": value.get("tool") if isinstance(value.get("tool"), str) else "unknown",
    }


class OwnerRead(NamedTuple):
    exists: bool
    owner: Optional[dict]
    unreadable: bool  # present but could not be read (for example a transient sharing violation)


def _read_owner(path: str) -> OwnerRead:
    try:
        with open(path, encoding="utf-8", errors="replace") as handle:
            raw = handle.read()
        return OwnerRead(True, _parse_owner(raw), False)
    except FileNotFoundError:
        return OwnerRead(False, None, False)
    except OSError:
        return OwnerRead(True, None, True)


def _assess(read: OwnerRead) -> str:
    """Decide what a lock file we did not create represents: ``gone``,
    ``live`` or ``dead``. Only a readable record naming a provably dead process
    on this host is dead; everything else, including a missing or unreadable
    record, is live."""
    if not read.exists:
        return "gone"
    if read.owner is None:
        return "live"
    if read.owner["host"].lower() != _host().lower():
        return "live"
    return "dead" if pid_alive(read.owner["pid"]) is False else "live"


def _try_create(lock_path: str, owner: dict) -> bool:
    try:
        fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        return False
    try:
        os.write(fd, json.dumps(owner).encode("utf-8"))
    except OSError as exc:
        os.close(fd)
        # The file is ours (created with O_EXCL an instant ago) and record-less
        # files are never removed by anyone else, so this path is still ours.
        try:
            os.remove(lock_path)
        except OSError:
            pass
        raise FileLockError(
            "LOCK_RECORD_FAILED", f"Could not record ownership of {lock_path}: {exc}", lock_path, None
        ) from exc
    os.close(fd)
    return True


def remove_owned(path: str, token: str) -> bool:
    """Remove ``path`` only while it still carries ``token``, re-reading before
    every attempt so a bounded retry can never unlink a file whose ownership
    changed meanwhile. Returns True when the file is gone (removed here or
    already absent) and False when it now belongs to someone else. Transient
    sharing violations are retried for REMOVE_RETRY_S, then re-raised."""
    deadline = time.monotonic() + REMOVE_RETRY_S
    while True:
        current = _read_owner(path)
        if not current.exists:
            return True
        if not current.unreadable:
            if current.owner is None or current.owner["token"] != token:
                return False
            try:
                os.remove(path)
                return True
            except FileNotFoundError:
                return True
            except PermissionError:
                if time.monotonic() >= deadline:
                    raise
        elif time.monotonic() >= deadline:
            raise OSError(f"could not read {path} to confirm ownership before removing it")
        time.sleep(_REMOVE_RETRY_STEP_S)


def _reclaim(lock_path: str, expected: dict, owner: dict) -> tuple[str, Optional[OwnerRead]]:
    """Remove a lock whose record names a dead process, under the recovery file.

    Returns ``("removed", None)`` when the lock is gone and the caller may try
    to create its own; ``("changed", None)`` when the lock no longer carries the
    assessed dead record; ``("blocked", recovery_read)`` when the recovery file
    exists. The recovery file is never taken over; its record is returned so a
    timeout can describe it."""
    recovery_path = reclaim_path_for(lock_path)
    if not _try_create(recovery_path, owner):
        return "blocked", _read_owner(recovery_path)
    try:
        current = _read_owner(lock_path)
        if not current.exists:
            return "removed", None
        if current.owner is None or current.owner["token"] != expected["token"] or _assess(current) != "dead":
            return "changed", None
        return ("removed" if remove_owned(lock_path, expected["token"]) else "changed"), None
    except OSError:
        return "changed", None
    finally:
        try:
            remove_owned(recovery_path, owner["token"])
        except OSError:
            pass


def _holder_text(owner: dict) -> str:
    since = f" since {owner['created_at']}" if owner.get("created_at") else ""
    return f"{owner['tool']} process {owner['pid']} on {owner['host']}{since}"


_MANUAL_STEP = "If no Clipperz Studio or CLI process is running, delete"


def _describe_timeout(lock_path: str, last_seen: Optional[OwnerRead], blocked_by: Optional[OwnerRead]) -> str:
    owner = last_seen.owner if last_seen is not None else None
    if owner is None:
        return (
            f"The lock file {lock_path} has no readable owner record, so its owner cannot be identified "
            f"and the file is never removed automatically. {_MANUAL_STEP} that file and retry."
        )
    if blocked_by is not None:
        recovery_path = reclaim_path_for(lock_path)
        holder = blocked_by.owner
        if holder is None:
            state = f"the recovery file {recovery_path} has no readable owner record"
        elif _assess(blocked_by) == "dead":
            state = f"the recovery file {recovery_path} was left by {_holder_text(holder)}, which is no longer running"
        else:
            state = f"the recovery file {recovery_path} is held by {_holder_text(holder)} (recovery in progress)"
        return (
            f"History is locked by {_holder_text(owner)}, which is no longer running, and automatic recovery "
            f"is blocked: {state}. {_MANUAL_STEP} {recovery_path} and {lock_path}, then retry."
        )
    return f"History is locked by {_holder_text(owner)}. If that process is no longer running, delete {lock_path} and retry."


def _release_own(lock_path: str, token: str) -> None:
    """Unlink the lock only while it still carries our token. A removal that
    keeps failing is reported on stderr rather than raised, so the caller's
    completed mutation is not misreported; the next acquisition would then
    time out naming this process and the lock path."""
    try:
        remove_owned(lock_path, token)
    except OSError as exc:
        print(
            f"clipperz: could not release {lock_path} ({exc}). "
            f"Delete it by hand if process {os.getpid()} is no longer running.",
            file=sys.stderr,
        )


@contextmanager
def file_lock(target_path: str, timeout_ms: Optional[int] = None, tool: str = "clipperz-python") -> Iterator[dict]:
    """Hold the mutation lock for ``target_path`` for the duration of the block.

    Network, AI, and render work belong outside the block; hold the lock only
    for the fresh read, the in-memory change, and the atomic replacement.
    """
    lock_path = lock_path_for(target_path)
    owner = {
        "pid": os.getpid(),
        "host": _host(),
        "token": uuid.uuid4().hex,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "tool": tool,
    }
    timeout = _default_timeout_ms() if timeout_ms is None else timeout_ms
    deadline = time.monotonic() + timeout / 1000.0
    delay = _POLL_MIN_S
    last_seen: Optional[OwnerRead] = None
    blocked_by: Optional[OwnerRead] = None

    while True:
        if _try_create(lock_path, owner):
            break
        current = _read_owner(lock_path)
        if current.exists and not current.unreadable:
            last_seen = current
        blocked_by = None
        state = _assess(current)
        if state == "gone":
            continue
        if state == "dead":
            outcome, recovery = _reclaim(lock_path, current.owner, owner)
            if outcome == "removed":
                continue
            if outcome == "blocked":
                blocked_by = recovery
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise FileLockError(
                "LOCK_TIMEOUT",
                f"Timed out after {timeout} ms waiting to update {target_path}. "
                f"{_describe_timeout(lock_path, last_seen, blocked_by)}",
                lock_path,
                last_seen.owner if last_seen is not None else None,
            )
        time.sleep(min(delay, max(0.0, remaining)))
        delay = min(_POLL_MAX_S, delay * 1.5)

    try:
        yield owner
    finally:
        _release_own(lock_path, owner["token"])
