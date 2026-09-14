"""Disposable child-process worker for clip-history concurrency tests.

Invoked by the Node and Python test suites with PODCLI_HOME/PODCLI_DATA
pointing at an isolated fixture. Never run against a real installation.

Modes
  stress <name> <count>   alternate appends and field updates, <count> times
  hold <held> <release>   acquire the history lock, create <held>, wait for
                          <release> to exist, then release the lock
  paused-acquire <created> <go> <entered> <release>
                          model a live acquirer paused mid-creation: create the
                          lock file (kept open, no record), create <created>,
                          wait for <go>, write the owner record, create
                          <entered>, wait for <release>, release
  update <id> <key> <value>
  delete <id>
Exit codes: 0 ok, 2 surfaced history error (message on stderr), 3 usage.
"""
import json
import os
import socket
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))

from services import clips_history  # noqa: E402
from services.mutation_lock import file_lock, lock_path_for, remove_owned  # noqa: E402


def _wait_for(path: str) -> bool:
    deadline = time.monotonic() + 30
    while not os.path.exists(path):
        if time.monotonic() > deadline:
            return False
        time.sleep(0.01)
    return True


def stress(name: str, count: int) -> dict:
    appended = updated = 0
    for i in range(count):
        if i % 5 == 0:
            new_id = f"{name}-{i}"

            def append(entries, new_id=new_id, i=i):
                entries.append({"id": new_id, "title": f"{name} {i}", "source_video": "/videos/show.mp4",
                                "nested": {"by": name, "n": i}})

            clips_history.mutate_clips_history(append)
            appended += 1
        else:
            # Seed entries only: everything a worker appends carries "nested".
            existing = [e["id"] for e in clips_history.load_clips_history() if "nested" not in e]
            if not existing:
                continue
            target = existing[i % len(existing)]
            clips_history.update_clip(target, **{f"{name}_{i}": i})
            updated += 1
    return {"appended": appended, "updated": updated}


def hold(held: str, release: str) -> dict:
    with file_lock(clips_history._history_path(), tool="clipperz-test-hold") as owner:
        Path(held).write_text(json.dumps(owner), encoding="utf-8")
        deadline = time.monotonic() + 30
        while not os.path.exists(release):
            if time.monotonic() > deadline:
                return {"held": True, "released": "timeout"}
            time.sleep(0.01)
    return {"held": True, "released": "ok"}


def paused_acquire(created: str, go: str, entered: str, release: str) -> dict:
    """Reproduces the lock's on-disk steps by hand so the pause between
    creating the file and writing the record can be held open for as long as
    the test wants. The record format mirrors mutation_lock.py."""
    lock_path = lock_path_for(clips_history._history_path())
    fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    Path(created).write_text(str(os.getpid()), encoding="utf-8")
    if not _wait_for(go):
        return {"paused": True, "released": "timeout"}
    token = uuid.uuid4().hex
    record = {"pid": os.getpid(), "host": socket.gethostname(), "token": token,
              "created_at": datetime.now(timezone.utc).isoformat(), "tool": "clipperz-test-paused"}
    os.write(fd, json.dumps(record).encode("utf-8"))
    os.close(fd)
    Path(entered).write_text("in", encoding="utf-8")
    released = "ok" if _wait_for(release) else "timeout"
    remove_owned(lock_path, token)  # token-verified, retries transient sharing violations
    return {"paused": True, "released": released}


def main(argv: list[str]) -> int:
    if not argv:
        return 3
    mode, args = argv[0], argv[1:]
    try:
        if mode == "stress":
            result = stress(args[0], int(args[1]))
        elif mode == "hold":
            result = hold(args[0], args[1])
        elif mode == "paused-acquire":
            result = paused_acquire(args[0], args[1], args[2], args[3])
        elif mode == "update":
            result = clips_history.update_clip(args[0], **{args[1]: args[2]})
        elif mode == "delete":
            result = clips_history.delete_clip(args[0])
        else:
            return 3
    except clips_history.ClipsHistoryError as exc:
        print(f"{exc.__class__.__name__}: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
