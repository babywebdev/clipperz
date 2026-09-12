"""Tests for the Python clip-history writer: failure-safe reads and locked mutation."""

import io
import json
import os
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

from config.paths import reload_paths  # noqa: E402
from services import clips_history as ch  # noqa: E402
from services.mutation_lock import file_lock, lock_path_for  # noqa: E402

WORKER = os.path.join(ROOT, "scripts", "verification", "fixtures", "history_worker.py")

SEED = [
    {"id": "one", "title": "first", "source_video": "/videos/a.mp4", "extra": {"keep": [1, 2, {"deep": True}]}},
    {"id": "two", "title": "second", "source_video": "/videos/a.mp4", "legacy_flag": "yes"},
    {"id": "three", "title": "third", "source_video": "/videos/b.mp4"},
]


class IsolatedHistory(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="podcli-history-")
        self.env_patch = mock.patch.dict(os.environ, {"PODCLI_HOME": self.tmp, "PODCLI_DATA": self.tmp})
        self.env_patch.start()
        reload_paths()
        self.history_dir = os.path.join(self.tmp, "history")
        os.makedirs(self.history_dir, exist_ok=True)
        self.path = ch._history_path()
        self.assertEqual(os.path.dirname(self.path), self.history_dir)
        self.lock_path = lock_path_for(self.path)

    def tearDown(self):
        self.env_patch.stop()
        reload_paths()

    def seed(self, data=SEED, text=None):
        with open(self.path, "w", encoding="utf-8") as f:
            f.write(text if text is not None else json.dumps(data, indent=2))

    def raw(self) -> bytes:
        with open(self.path, "rb") as f:
            return f.read()

    def entries(self):
        with open(self.path, encoding="utf-8") as f:
            return json.load(f)

    def leftovers(self):
        return [n for n in os.listdir(self.history_dir) if n != "clips.json"]

    def child_env(self, **extra):
        env = dict(os.environ)
        env.update({"PODCLI_HOME": self.tmp, "PODCLI_DATA": self.tmp, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"})
        env.update(extra)
        return env

    def worker(self, *args, **extra):
        return subprocess.Popen(
            [sys.executable, WORKER, *args], env=self.child_env(**extra),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8",
        )

    @staticmethod
    def wait_for(path, timeout=20.0):
        deadline = time.monotonic() + timeout
        while not os.path.exists(path):
            if time.monotonic() > deadline:
                raise AssertionError(f"timed out waiting for {path}")
            time.sleep(0.01)


class ReadAndMutateTests(IsolatedHistory):
    def test_missing_file_initializes_empty(self):
        self.assertFalse(os.path.exists(self.path))
        ch.mutate_clips_history(lambda entries: entries.append({"id": "n1", "title": "new"}))
        self.assertEqual(self.entries(), [{"id": "n1", "title": "new"}])
        self.assertEqual(self.leftovers(), [])

    def test_update_preserves_unknown_fields_and_order(self):
        self.seed()
        updated = ch.update_clip("two", title="renamed", caption_style=None, description="d")
        self.assertEqual(updated["title"], "renamed")
        after = self.entries()
        self.assertEqual([e["id"] for e in after], ["one", "two", "three"])
        self.assertEqual(after[0], SEED[0])
        self.assertEqual(after[2], SEED[2])
        self.assertEqual(after[1], {**SEED[1], "title": "renamed", "description": "d"})

    def test_update_missing_id_is_a_no_op(self):
        self.seed()
        before = self.raw()
        self.assertIsNone(ch.update_clip("missing", title="x"))
        self.assertEqual(self.raw(), before)
        self.assertFalse(os.path.exists(self.path + ".lock"))

    def test_update_missing_file_does_not_create_it(self):
        self.assertIsNone(ch.update_clip("missing", title="x"))
        self.assertFalse(os.path.exists(self.path))

    def test_delete_resolves_prefix_inside_lock(self):
        self.seed()
        self.assertIsNone(ch.delete_clip("t"))  # ambiguous: two, three
        self.assertEqual(len(self.entries()), 3)
        removed = ch.delete_clip("tw")
        self.assertEqual(removed["id"], "two")
        self.assertEqual([e["id"] for e in self.entries()], ["one", "three"])

    def _assert_mutations_abort(self, code):
        before = self.raw()
        attempts = [
            lambda: ch.update_clip("one", title="changed"),
            lambda: ch.delete_clip("one"),
            lambda: ch.mutate_clips_history(lambda entries: entries.append({"id": "n", "title": "x"})),
        ]
        for attempt in attempts:
            with self.assertRaises(ch.HistoryReadError) as ctx:
                attempt()
            self.assertEqual(ctx.exception.code, code)
            self.assertIn("No changes were written", str(ctx.exception))
            self.assertEqual(self.raw(), before)
        self.assertEqual(self.leftovers(), [])

    def test_invalid_json_aborts_mutation(self):
        self.seed(text='[{"id": "one", "title": "first"')
        self._assert_mutations_abort("HISTORY_INVALID_JSON")

    def test_non_list_top_level_aborts_mutation(self):
        self.seed(text=json.dumps({"clips": SEED}))
        self._assert_mutations_abort("HISTORY_INVALID_SHAPE")

    def test_entry_without_id_aborts_mutation(self):
        self.seed(text=json.dumps([SEED[0], {"title": "no id"}]))
        self._assert_mutations_abort("HISTORY_INVALID_SHAPE")
        with self.assertRaises(ch.HistoryReadError) as ctx:
            ch.update_clip("one", title="x")
        self.assertIn("entry 1", str(ctx.exception))

    def test_unreadable_path_aborts_mutation(self):
        os.makedirs(self.path)  # a directory where the file should be
        with self.assertRaises(ch.HistoryReadError) as ctx:
            ch.update_clip("one", title="x")
        self.assertEqual(ctx.exception.code, "HISTORY_UNREADABLE")
        self.assertTrue(os.path.isdir(self.path))
        self.assertEqual(self.leftovers(), [])

    def test_bom_prefixed_file_is_accepted(self):
        self.seed(text="﻿" + json.dumps(SEED))
        self.assertEqual(ch.update_clip("two", title="edited")["title"], "edited")
        self.assertEqual(self.entries()[1]["title"], "edited")

    def test_readers_stay_lenient_and_warn(self):
        self.seed(text="{not json")
        with mock.patch("sys.stderr", new_callable=io.StringIO) as err:
            self.assertEqual(ch.load_clips_history(), [])
            self.assertEqual(ch.list_clips(), [])
            self.assertIsNone(ch.find_clip("one"))
        self.assertIn("clip history unavailable", err.getvalue())
        self.assertEqual(self.raw(), b"{not json")

    def test_failed_replace_keeps_bytes_and_releases_lock(self):
        self.seed()
        before = self.raw()
        with mock.patch("services.clips_history.os.replace", side_effect=OSError("disk full (injected)")):
            with self.assertRaises(OSError):
                ch.update_clip("one", title="lost")
        self.assertEqual(self.raw(), before)
        self.assertEqual(self.leftovers(), [])
        self.assertEqual(ch.update_clip("one", title="kept")["title"], "kept")
        self.assertEqual(self.entries()[0]["title"], "kept")

    def test_lock_timeout_surfaces_history_lock_error(self):
        self.seed()
        before = self.raw()
        with file_lock(self.path, tool="clipperz-studio"):
            with mock.patch.dict(os.environ, {"PODCLI_HISTORY_LOCK_TIMEOUT_MS": "150"}):
                with self.assertRaises(ch.HistoryLockError) as ctx:
                    ch.update_clip("one", title="blocked")
        self.assertEqual(ctx.exception.code, "LOCK_TIMEOUT")
        self.assertEqual(ctx.exception.owner["pid"], os.getpid())
        self.assertIn("clipperz-studio", str(ctx.exception))
        self.assertEqual(self.raw(), before)
        self.assertFalse(os.path.exists(self.lock_path))


class CrossProcessTests(IsolatedHistory):
    def test_two_python_processes_lose_no_updates(self):
        self.seed()
        count = 25
        procs = [self.worker("stress", "py-a", str(count)), self.worker("stress", "py-b", str(count))]
        outputs = [p.communicate(timeout=120) for p in procs]
        for p, (out, err) in zip(procs, outputs):
            self.assertEqual(p.returncode, 0, err)
        by_id = {e["id"]: e for e in self.entries()}
        titles = {e.get("title") for e in self.entries()}
        for name in ("py-a", "py-b"):
            for i in range(count):
                if i % 5 == 0:
                    self.assertIn(f"{name} {i}", titles)
                else:
                    target = SEED[i % len(SEED)]["id"]
                    self.assertEqual(by_id[target].get(f"{name}_{i}"), i, f"{name}_{i} on {target}")
        self.assertEqual(by_id["one"]["extra"], SEED[0]["extra"])
        self.assertEqual([e["id"] for e in self.entries()][:3], ["one", "two", "three"])
        self.assertEqual(self.leftovers(), [])

    def test_blocked_by_another_python_process_then_succeeds(self):
        self.seed()
        held = os.path.join(self.tmp, "held")
        release = os.path.join(self.tmp, "release")
        holder = self.worker("hold", held, release)
        try:
            self.wait_for(held)
            # The venv python.exe is a launcher on Windows: the interpreter that
            # holds the lock reports its own pid in the marker.
            with open(held, encoding="utf-8") as f:
                holder_owner = json.load(f)
            self.assertNotEqual(holder_owner["pid"], os.getpid())
            before = self.raw()
            with mock.patch.dict(os.environ, {"PODCLI_HISTORY_LOCK_TIMEOUT_MS": "300"}):
                with self.assertRaises(ch.HistoryLockError) as ctx:
                    ch.update_clip("one", title="blocked")
            self.assertEqual(ctx.exception.owner["pid"], holder_owner["pid"])
            self.assertIn(str(holder_owner["pid"]), str(ctx.exception))
            self.assertEqual(self.raw(), before)
            with open(self.lock_path, encoding="utf-8") as f:
                self.assertEqual(json.load(f)["token"], holder_owner["token"])
        finally:
            with open(release, "w") as f:
                f.write("go")
            out, err = holder.communicate(timeout=60)
        self.assertEqual(holder.returncode, 0, err)
        self.assertEqual(json.loads(out), {"held": True, "released": "ok"})
        self.assertFalse(os.path.exists(self.lock_path))
        self.assertEqual(ch.update_clip("one", title="after")["title"], "after")

    def test_crashed_holder_is_recovered(self):
        self.seed()
        held = os.path.join(self.tmp, "crash-held")
        holder = self.worker("hold", held, os.path.join(self.tmp, "never"))
        self.wait_for(held)
        holder.kill()
        holder.communicate(timeout=60)
        self.assertTrue(os.path.exists(self.lock_path))
        self.assertEqual(ch.update_clip("three", title="recovered")["title"], "recovered")
        self.assertFalse(os.path.exists(self.lock_path))
        self.assertEqual(self.leftovers(), [])

    def test_delete_and_update_race_cannot_resurrect(self):
        self.seed()
        procs = [self.worker("delete", "two"), self.worker("update", "two", "title", "zombie")]
        outputs = [p.communicate(timeout=60) for p in procs]
        for p, (out, err) in zip(procs, outputs):
            self.assertEqual(p.returncode, 0, err)
        self.assertEqual(json.loads(outputs[0][0])["id"], "two")
        self.assertEqual([e["id"] for e in self.entries()], ["one", "three"])


if __name__ == "__main__":
    unittest.main()
