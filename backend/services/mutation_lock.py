"""Cross-process, cross-language mutation lock for a shared JSON file.

The TypeScript side (src/utils/mutation-lock.ts) implements the same protocol
against the same lock path, so a Studio request and a CLI command never
interleave their read-modify-write cycles on clips.json.

Protocol
- Acquire: create ``<target>.lock`` with O_EXCL (atomic on NTFS and POSIX),
  then write an owner record ``{pid, host, token, created_at, tool}`` into it.
- Release: unlink the lock only if its owner record still carries our token.
  Another process's lock is never removed by a release.
- Contention: poll with backoff until the timeout elapses, then raise a
  FileLockError describing the owner and how to recover. A living owner is
  never displaced merely because time passed.
- Crash recovery: an owner record whose pid is provably dead on this host is
  reclaimed. Reclaim runs under a second O_EXCL file (``<target>.lock.reclaim``)
  and re-reads the owner record under it, so two waiters cannot remove a lock
  that a third process created in between.
- Unknown owner: a lock with no readable owner record (a crash between create
  and write, or a foreign tool) is reclaimed only once it is older than
  UNKNOWN_OWNER_GRACE_MS; a fresh unreadable lock is treated as live.
- PID reuse / foreign host: if the pid is alive (possibly reused) or belongs to
  another host name, the lock is treated as live and acquisition fails closed
  at the timeout with the owner details and the lock path so the operator can
  confirm no Clipperz process holds it and delete it by hand.
- Interrupted acquisition: waiting creates no files. A crash after creating the
  lock file but before the owner record is the unknown-owner case above.

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
from typing import Iterator, Optional

DEFAULT_LOCK_TIMEOUT_MS = 10_000
UNKNOWN_OWNER_GRACE_MS = 60_000
_RECLAIM_MUTEX_GRACE_MS = 30_000
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


def _reclaim_path_for(lock_path: str) -> str:
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
_REMOVE_RETRY_S = 2.0
_REMOVE_RETRY_STEP_S = 0.025


def remove_with_retry(path: str) -> None:
    """Remove ``path``; a missing file is fine. Retries transient sharing
    violations for a bounded time, then re-raises."""
    deadline = time.monotonic() + _REMOVE_RETRY_S
    while True:
        try:
            os.remove(path)
            return
        except FileNotFoundError:
            return
        except PermissionError:
            if time.monotonic() >= deadline:
                raise
            time.sleep(_REMOVE_RETRY_STEP_S)


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


def _read_owner(path: str) -> tuple[bool, Optional[dict], float]:
    """Return (exists, owner record or None, age in ms)."""
    try:
        with open(path, encoding="utf-8", errors="replace") as handle:
            raw = handle.read()
        age_ms = (time.time() - os.stat(path).st_mtime) * 1000.0
        return True, _parse_owner(raw), age_ms
    except FileNotFoundError:
        return False, None, 0.0
    except OSError:
        # Present but unreadable (for example a transient sharing violation
        # while the owner is still writing its record): a fresh live lock.
        return True, None, 0.0


def _assess(read: tuple[bool, Optional[dict], float], grace_ms: float) -> str:
    exists, owner, age_ms = read
    if not exists:
        return "gone"
    if owner is None:
        return "unknown" if age_ms > grace_ms else "live"
    if owner["host"].lower() != _host().lower():
        return "live"
    return "dead" if pid_alive(owner["pid"]) is False else "live"


def _try_create(lock_path: str, owner: dict) -> bool:
    try:
        fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        return False
    try:
        os.write(fd, json.dumps(owner).encode("utf-8"))
    except OSError as exc:
        os.close(fd)
        try:
            os.remove(lock_path)
        except OSError:
            pass
        raise FileLockError(
            "LOCK_RECORD_FAILED", f"Could not record ownership of {lock_path}: {exc}", lock_path, None
        ) from exc
    os.close(fd)
    return True


def _reclaim(lock_path: str, expected: Optional[dict], owner: dict) -> bool:
    """Remove a lock judged stale, only after re-reading it under the reclaim
    mutex and confirming it is still the same stale record."""
    mutex_path = _reclaim_path_for(lock_path)
    if not _try_create(mutex_path, owner):
        if _assess(_read_owner(mutex_path), _RECLAIM_MUTEX_GRACE_MS) == "live":
            return False
        aside = f"{mutex_path}.{uuid.uuid4().hex[:8]}"
        try:
            os.replace(mutex_path, aside)
            remove_with_retry(aside)
        except OSError:
            return False
        if not _try_create(mutex_path, owner):
            return False
    try:
        exists, current, age_ms = _read_owner(lock_path)
        if not exists:
            return True
        if expected is not None:
            same_record = current is not None and current["token"] == expected["token"]
        else:
            same_record = current is None and age_ms > UNKNOWN_OWNER_GRACE_MS
        if not same_record:
            return False
        remove_with_retry(lock_path)
        return True
    except OSError:
        return False
    finally:
        try:
            remove_with_retry(mutex_path)
        except OSError:
            pass


def _describe(owner: Optional[dict], lock_path: str) -> str:
    if owner is None:
        return (
            f"The lock file {lock_path} has no readable owner record. If no Clipperz "
            "Studio or CLI process is running, delete that file and retry."
        )
    since = f" since {owner['created_at']}" if owner.get("created_at") else ""
    return (
        f"History is locked by {owner['tool']} process {owner['pid']} on {owner['host']}{since}. "
        f"If that process is no longer running, delete {lock_path} and retry."
    )


def _release_own(lock_path: str, token: str) -> None:
    """Unlink the lock only when it still carries our token. A removal that
    keeps failing is reported on stderr rather than raised, so the caller's
    completed mutation is not misreported; the next acquisition would then
    time out naming this process and the lock path."""
    exists, current, _ = _read_owner(lock_path)
    if not exists or current is None or current["token"] != token:
        return
    try:
        remove_with_retry(lock_path)
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
    last_seen: Optional[dict] = None

    while True:
        if _try_create(lock_path, owner):
            break
        read = _read_owner(lock_path)
        last_seen = read[1]
        state = _assess(read, UNKNOWN_OWNER_GRACE_MS)
        if state == "gone":
            continue
        if state in ("dead", "unknown") and _reclaim(lock_path, read[1], owner):
            continue
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise FileLockError(
                "LOCK_TIMEOUT",
                f"Timed out after {timeout} ms waiting to update {target_path}. {_describe(last_seen, lock_path)}",
                lock_path,
                last_seen,
            )
        time.sleep(min(delay, max(0.0, remaining)))
        delay = min(_POLL_MAX_S, delay * 1.5)

    try:
        yield owner
    finally:
        _release_own(lock_path, owner["token"])
