"""Tests for the shared cross-process history mutation lock (Python side)."""

import io
import json
import os
import socket
import subprocess
import sys
import tempfile
import threading
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

    def test_record_less_lock_is_never_removed_however_old(self):
        # Empty, truncated, and non-JSON records: a live acquirer paused
        # between creating the file and writing its record looks exactly like
        # this, and elapsed time cannot tell it apart from a crash.
        for content in ("", '{"pid": 12', "not json"):
            self._foreign(content)
            old = time.time() - 86_400
            os.utime(self.lock_path, (old, old))
            ran = False
            with self.assertRaises(ml.FileLockError) as ctx:
                with ml.file_lock(self.target, timeout_ms=300):
                    ran = True
            self.assertFalse(ran)
            self.assertEqual(ctx.exception.code, "LOCK_TIMEOUT")
            self.assertIsNone(ctx.exception.owner)
            self.assertIn("no readable owner record", str(ctx.exception))
            self.assertIn("never removed automatically", str(ctx.exception))
            self.assertIn(self.lock_path, str(ctx.exception))
            self.assertEqual(self._read_lock(), content)
            self.assertFalse(os.path.exists(ml.reclaim_path_for(self.lock_path)))
        # Manual removal is the documented recovery.
        os.remove(self.lock_path)
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


class Actor:
    """Thread-name-tagged actor whose reads of a path can be paused at a
    chosen occurrence, so an interleaving is driven by barriers, not timing."""

    def __init__(self, name):
        self.name = name
        self.result = self.error = None
        self.thread = None

    def start(self, fn):
        def run():
            try:
                self.result = fn()
            except BaseException as exc:  # noqa: BLE001 - surfaced by the test
                self.error = exc
        self.thread = threading.Thread(target=run, name=self.name, daemon=True)
        self.thread.start()
        return self

    def join(self, timeout=10):
        self.thread.join(timeout)
        if self.thread.is_alive():
            raise AssertionError(f"actor {self.name} did not finish")
        return self


class Harness:
    def __init__(self):
        self.real_read = ml._read_owner
        self.real_remove = os.remove
        self.counts = {}
        self.pauses = []
        self.removals = []
        self.lock = threading.Lock()

    def pause_at(self, actor, path, nth):
        entry = {"actor": actor, "path": path, "nth": nth, "reached": threading.Event(), "resume": threading.Event()}
        self.pauses.append(entry)
        return entry

    def read(self, path):
        result = self.real_read(path)
        actor = threading.current_thread().name
        with self.lock:
            key = (actor, path)
            self.counts[key] = n = self.counts.get(key, 0) + 1
            hits = [p for p in self.pauses if p["actor"] == actor and p["path"] == path and p["nth"] == n]
        for p in hits:
            p["reached"].set()
            assert p["resume"].wait(10), f"{actor} was never resumed"
        return result

    def remove(self, path):
        self.removals.append((threading.current_thread().name, path))
        return self.real_remove(path)

    def removals_by(self, actor):
        return [path for name, path in self.removals if name == actor]

    def release_all(self):
        for p in self.pauses:
            p["resume"].set()


def reached(pause, timeout=10):
    assert pause["reached"].wait(timeout), f"{pause['actor']} never reached read {pause['nth']} of {pause['path']}"


class RecoveryScheduleTests(unittest.TestCase):
    """R1/R2 regression schedules: recovery is mutually exclusive, a stale
    assessment never removes a live lock, an orphaned recovery file fails
    closed, and a paused live acquirer is never displaced."""

    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="podcli-lock-recovery-")
        self.target = os.path.join(self.dir, "clips.json")
        self.lock_path = ml.lock_path_for(self.target)
        self.recovery_path = ml.reclaim_path_for(self.lock_path)
        self.h = Harness()
        self._patches = [
            mock.patch.object(ml, "_read_owner", side_effect=self.h.read),
            mock.patch.object(ml.os, "remove", side_effect=self.h.remove),
        ]
        for p in self._patches:
            p.start()

    def tearDown(self):
        self.h.release_all()
        for p in self._patches:
            p.stop()

    def record(self, token, pid, host=None, tool="x"):
        return {"pid": pid, "host": host or socket.gethostname(), "token": token,
                "created_at": "2026-01-01T00:00:00Z", "tool": tool}

    def seed(self, path, content):
        with open(path, "w", encoding="utf-8") as f:
            f.write(content if isinstance(content, str) else json.dumps(content))

    def read_json(self, path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def raw(self, path):
        with open(path, "rb") as f:
            return f.read()

    def holder(self, name, order, inside=None, release=None, timeout_ms=5000):
        def run():
            with ml.file_lock(self.target, timeout_ms=timeout_ms):
                order.append(name)
                if inside is not None:
                    inside.set()
                if release is not None:
                    assert release.wait(10)
            return "ran"
        return run

    def test_stale_dead_owner_read_never_removes_a_later_owners_lock(self):
        self.seed(self.lock_path, self.record("dead", dead_pid()))
        order = []
        b_stale = self.h.pause_at("B", self.lock_path, 1)
        b_under_recovery = self.h.pause_at("B", self.lock_path, 2)
        b_after_backoff = self.h.pause_at("B", self.lock_path, 3)
        b = Actor("B").start(self.holder("B", order))
        reached(b_stale)

        a_inside, release_a = threading.Event(), threading.Event()
        a = Actor("A").start(self.holder("A", order, a_inside, release_a, timeout_ms=2000))
        assert a_inside.wait(10)
        a_record = self.read_json(self.lock_path)
        self.assertEqual(a_record["pid"], os.getpid())
        self.assertNotEqual(a_record["token"], "dead")
        self.assertFalse(os.path.exists(self.recovery_path))

        b_stale["resume"].set()
        reached(b_under_recovery)
        self.assertEqual(self.read_json(self.recovery_path)["pid"], os.getpid())
        self.assertEqual(self.read_json(self.lock_path)["token"], a_record["token"])
        b_under_recovery["resume"].set()

        reached(b_after_backoff)
        self.assertEqual(self.read_json(self.lock_path)["token"], a_record["token"])
        self.assertFalse(os.path.exists(self.recovery_path))
        self.assertEqual(self.h.removals_by("B"), [self.recovery_path])
        self.assertEqual(order, ["A"])
        b_after_backoff["resume"].set()

        release_a.set()
        a.join()
        b.join()
        self.assertIsNone(a.error)
        self.assertIsNone(b.error)
        self.assertEqual(order, ["A", "B"])
        self.assertEqual(os.listdir(self.dir), [])

    def test_second_waiter_never_touches_a_recovery_file_in_use(self):
        self.seed(self.lock_path, self.record("dead", dead_pid()))
        before = self.raw(self.lock_path)
        order = []
        a_under_recovery = self.h.pause_at("A", self.lock_path, 2)
        a = Actor("A").start(self.holder("A", order))
        reached(a_under_recovery)
        recovery_record = self.read_json(self.recovery_path)
        self.assertEqual(recovery_record["pid"], os.getpid())

        b = Actor("B").start(self.holder("B", order, timeout_ms=400)).join()
        self.assertIsInstance(b.error, ml.FileLockError)
        self.assertEqual(b.error.code, "LOCK_TIMEOUT")
        self.assertEqual(b.error.owner["token"], "dead")
        self.assertIn(self.recovery_path, str(b.error))
        self.assertIn("recovery in progress", str(b.error))
        self.assertIn(str(os.getpid()), str(b.error))
        self.assertEqual(self.raw(self.lock_path), before)
        self.assertEqual(self.read_json(self.recovery_path)["token"], recovery_record["token"])
        self.assertEqual(self.h.removals_by("B"), [])
        self.assertEqual(sorted(os.listdir(self.dir)), ["clips.json.lock", "clips.json.lock.reclaim"])

        a_under_recovery["resume"].set()
        a.join()
        self.assertIsNone(a.error)
        self.assertEqual(order, ["A"])
        self.assertEqual(os.listdir(self.dir), [])

    def test_orphaned_recovery_file_fails_closed_and_is_never_taken_over(self):
        dead = self.record("dead", dead_pid())
        for orphan in (self.record("crashed-reclaimer", dead_pid(), tool="clipperz-cli"), ""):
            self.seed(self.lock_path, dead)
            self.seed(self.recovery_path, orphan)
            lock_before, recovery_before = self.raw(self.lock_path), self.raw(self.recovery_path)
            ran = False
            with self.assertRaises(ml.FileLockError) as ctx:
                with ml.file_lock(self.target, timeout_ms=400):
                    ran = True
            self.assertFalse(ran)
            self.assertEqual(ctx.exception.code, "LOCK_TIMEOUT")
            self.assertEqual(ctx.exception.owner["token"], "dead")
            message = str(ctx.exception)
            self.assertIn("automatic recovery is blocked", message)
            self.assertIn(f"delete {self.recovery_path} and {self.lock_path}", message)
            self.assertIn("no readable owner record" if orphan == "" else "no longer running", message)
            self.assertEqual(self.raw(self.lock_path), lock_before)
            self.assertEqual(self.raw(self.recovery_path), recovery_before)
            self.assertEqual(self.h.removals, [])

        os.remove(self.recovery_path)
        self.h.removals.clear()
        with ml.file_lock(self.target, timeout_ms=2000):
            pass
        self.assertEqual(os.listdir(self.dir), [])

    def test_live_lock_that_replaced_a_dead_one_is_never_removed(self):
        self.seed(self.lock_path, self.record("dead", dead_pid()))
        a_stale = self.h.pause_at("A", self.lock_path, 1)
        a = Actor("A").start(self.holder("A", [], timeout_ms=600))
        reached(a_stale)
        live = self.record("live", os.getpid(), tool="clipperz-studio")
        os.remove(self.lock_path)
        self.h.removals.clear()
        self.seed(self.lock_path, live)
        a_stale["resume"].set()
        a.join()
        self.assertIsInstance(a.error, ml.FileLockError)
        self.assertEqual(a.error.code, "LOCK_TIMEOUT")
        self.assertEqual(self.read_json(self.lock_path), live)
        self.assertEqual(self.h.removals_by("A"), [self.recovery_path])
        self.assertFalse(os.path.exists(self.recovery_path))

    def test_paused_live_acquirer_is_never_displaced(self):
        # Review R2 schedule: A is paused after creating the lock file and
        # before writing its record, for longer than any grace period would
        # allow. B must time out, and A's critical section must stay exclusive.
        created, go = threading.Event(), threading.Event()
        entered_a, release_a = threading.Event(), threading.Event()
        order = []
        real_write = os.write

        def delayed_write(fd, data):
            if threading.current_thread().name == "A":
                created.set()
                assert go.wait(10)
            return real_write(fd, data)

        with mock.patch.object(ml.os, "write", side_effect=delayed_write):
            a = Actor("A").start(self.holder("A", order, entered_a, release_a))
            assert created.wait(10)
            old = time.time() - 86_400
            os.utime(self.lock_path, (old, old))
            self.assertEqual(self.raw(self.lock_path), b"")

            b = Actor("B").start(self.holder("B", order, timeout_ms=600)).join()
            self.assertIsInstance(b.error, ml.FileLockError)
            self.assertEqual(b.error.code, "LOCK_TIMEOUT")
            self.assertIsNone(b.error.owner)
            self.assertIn("no readable owner record", str(b.error))
            self.assertEqual(self.raw(self.lock_path), b"")
            self.assertEqual(self.h.removals_by("B"), [])

            go.set()
            assert entered_a.wait(10)
            a_record = self.read_json(self.lock_path)
            self.assertEqual(a_record["pid"], os.getpid())

            b2_first_read = self.h.pause_at("B2", self.lock_path, 1)
            b2 = Actor("B2").start(self.holder("B2", order))
            reached(b2_first_read)
            self.assertEqual(order, ["A"])
            self.assertEqual(self.read_json(self.lock_path)["token"], a_record["token"])
            b2_first_read["resume"].set()
            time.sleep(0.2)
            self.assertEqual(order, ["A"])
            release_a.set()
            a.join()
            b2.join()
        self.assertIsNone(a.error)
        self.assertIsNone(b2.error)
        self.assertEqual(order, ["A", "B2"])
        self.assertEqual(os.listdir(self.dir), [])


class RemoveOwnedTests(unittest.TestCase):
    """The bounded Windows retry re-verifies ownership before every attempt."""

    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="podcli-lock-remove-")
        self.target = os.path.join(self.dir, "clips.json")
        self.lock_path = ml.lock_path_for(self.target)

    def record(self, token):
        return {"pid": os.getpid(), "host": socket.gethostname(), "token": token, "created_at": "", "tool": "x"}

    def seed(self, content):
        with open(self.lock_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(content))

    def test_transient_error_then_success_removes_own_lock(self):
        real_remove = os.remove
        calls = []

        def flaky(path):
            calls.append(path)
            if len(calls) <= 2:
                raise PermissionError(32, "sharing violation (injected)")
            return real_remove(path)

        with mock.patch.object(ml.os, "remove", side_effect=flaky):
            with ml.file_lock(self.target):
                pass
        self.assertFalse(os.path.exists(self.lock_path))
        self.assertEqual(len(calls), 3)

    def test_ownership_change_during_retry_leaves_the_file(self):
        self.seed(self.record("mine"))
        other = self.record("other")

        def steal_then_fail(path):
            self.seed(other)
            raise PermissionError(32, "sharing violation (injected)")

        with mock.patch.object(ml.os, "remove", side_effect=steal_then_fail) as remove:
            self.assertFalse(ml.remove_owned(self.lock_path, "mine"))
        self.assertEqual(remove.call_count, 1)
        with open(self.lock_path, encoding="utf-8") as f:
            self.assertEqual(json.load(f), other)

    def test_persistent_failure_surfaces_after_bounded_retry(self):
        self.seed(self.record("mine"))
        with mock.patch.object(ml, "REMOVE_RETRY_S", 0.3), mock.patch.object(
            ml.os, "remove", side_effect=PermissionError(32, "sharing violation (injected)")
        ):
            started = time.monotonic()
            with self.assertRaises(PermissionError):
                ml.remove_owned(self.lock_path, "mine")
            self.assertGreaterEqual(time.monotonic() - started, 0.25)
        self.assertTrue(os.path.exists(self.lock_path))

    def test_failed_release_is_reported_not_raised(self):
        with mock.patch.object(ml, "REMOVE_RETRY_S", 0.2), mock.patch.object(
            ml.os, "remove", side_effect=PermissionError(32, "sharing violation (injected)")
        ), mock.patch("sys.stderr", new_callable=io.StringIO) as err:
            with ml.file_lock(self.target) as owner:
                pass
        self.assertIn(f"could not release {self.lock_path}", err.getvalue())
        self.assertIn(str(os.getpid()), err.getvalue())
        with open(self.lock_path, encoding="utf-8") as f:
            self.assertEqual(json.load(f)["token"], owner["token"])

    def test_absent_file_counts_as_removed(self):
        self.assertTrue(ml.remove_owned(self.lock_path, "anything"))


if __name__ == "__main__":
    unittest.main()
