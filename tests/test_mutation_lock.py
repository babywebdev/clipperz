"""Tests for the shared cross-process history mutation lock (Python side)."""

import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_ROOT = os.path.join(ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from services import mutation_lock as ml  # noqa: E402


def dead_pid() -> int:
    """A pid that provably no longer exists: a child that already exited."""
    proc = subprocess.Popen([sys.executable, "-c", "pass"])
    proc.wait()
    return proc.pid


class MutationLockTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="podcli-lock-")
        self.target = os.path.join(self.dir, "clips.json")
        self.lock_path = ml.lock_path_for(self.target)

    def _foreign(self, owner):
        with open(self.lock_path, "w", encoding="utf-8") as f:
            f.write(owner if isinstance(owner, str) else json.dumps(owner))

    def _read_lock(self):
        with open(self.lock_path, encoding="utf-8") as f:
            return f.read()

    def test_holds_owner_record_then_releases(self):
        with ml.file_lock(self.target, tool="t") as owner:
            on_disk = json.loads(self._read_lock())
            self.assertEqual(on_disk["pid"], os.getpid())
            self.assertEqual(on_disk["host"], socket.gethostname())
            self.assertEqual(on_disk["tool"], "t")
            self.assertEqual(on_disk["token"], owner["token"])
        self.assertFalse(os.path.exists(self.lock_path))

    def test_release_never_removes_another_token(self):
        foreign = {"pid": 1, "host": "elsewhere", "token": "foreign", "created_at": "", "tool": "x"}
        with ml.file_lock(self.target):
            self._foreign(foreign)
        self.assertEqual(json.loads(self._read_lock())["token"], "foreign")

    def test_live_owner_times_out_without_stealing(self):
        owner = {"pid": os.getpid(), "host": socket.gethostname(), "token": "live",
                 "created_at": "2026-01-01T00:00:00Z", "tool": "clipperz-studio"}
        self._foreign(owner)
        ran = False
        with self.assertRaises(ml.FileLockError) as ctx:
            with ml.file_lock(self.target, timeout_ms=150):
                ran = True
        self.assertFalse(ran)
        self.assertEqual(ctx.exception.code, "LOCK_TIMEOUT")
        self.assertEqual(ctx.exception.owner["pid"], os.getpid())
        self.assertIn(str(os.getpid()), str(ctx.exception))
        self.assertIn(self.lock_path, str(ctx.exception))
        self.assertEqual(json.loads(self._read_lock()), owner)

    def test_foreign_host_is_never_reclaimed(self):
        owner = {"pid": dead_pid(), "host": socket.gethostname() + "-other", "token": "remote",
                 "created_at": "", "tool": "x"}
        self._foreign(owner)
        with self.assertRaises(ml.FileLockError):
            with ml.file_lock(self.target, timeout_ms=150):
                pass
        self.assertEqual(json.loads(self._read_lock()), owner)

    def test_dead_owner_on_this_host_is_reclaimed(self):
        self._foreign({"pid": dead_pid(), "host": socket.gethostname(), "token": "dead", "created_at": "", "tool": "x"})
        with ml.file_lock(self.target, timeout_ms=2000) as owner:
            self.assertEqual(json.loads(self._read_lock())["token"], owner["token"])
        self.assertFalse(os.path.exists(self.lock_path))
        self.assertFalse(os.path.exists(self.lock_path + ".reclaim"))

    def test_unknown_owner_is_live_until_grace_period_passes(self):
        self._foreign("")
        with self.assertRaises(ml.FileLockError) as ctx:
            with ml.file_lock(self.target, timeout_ms=150):
                pass
        self.assertIsNone(ctx.exception.owner)
        self.assertTrue(os.path.exists(self.lock_path))

        old = time.time() - ml.UNKNOWN_OWNER_GRACE_MS / 1000 - 5
        os.utime(self.lock_path, (old, old))
        with ml.file_lock(self.target, timeout_ms=2000):
            pass
        self.assertFalse(os.path.exists(self.lock_path))

    def test_pid_alive_distinguishes_states(self):
        self.assertTrue(ml.pid_alive(os.getpid()))
        self.assertFalse(ml.pid_alive(dead_pid()))
        self.assertIsNone(ml.pid_alive(0))
        self.assertIsNone(ml.pid_alive(-5))

    @unittest.skipUnless(os.name == "nt", "Windows-only guard")
    def test_pid_alive_never_calls_os_kill_on_windows(self):
        # os.kill(pid, 0) terminates the target on Windows; liveness must go through OpenProcess.
        with mock.patch("os.kill") as kill:
            ml.pid_alive(os.getpid())
            ml.pid_alive(dead_pid())
        kill.assert_not_called()

    def test_timeout_env_override_is_bounded(self):
        with mock.patch.dict(os.environ, {"PODCLI_HISTORY_LOCK_TIMEOUT_MS": "120"}):
            self._foreign({"pid": os.getpid(), "host": socket.gethostname(), "token": "live", "created_at": "", "tool": "x"})
            started = time.monotonic()
            with self.assertRaises(ml.FileLockError):
                with ml.file_lock(self.target):
                    pass
            self.assertLess(time.monotonic() - started, 5.0)


if __name__ == "__main__":
    unittest.main()
