"""Writing Studio 1B.2b.3: the Python side of the tracked-clip write fence.

``update_clip`` and ``delete_clip`` refuse tracked clips under the lock
(B2B3-2), metadata writers keep working on them (B2B3-3), and neither the
removal nor the path-based CLI commands write inside the revision namespace or
sidecar tree (B2B3-4). The real CLI runs as a child process. Since 1B.2b.4a
(WS-23), the legacy renderer's derived output sinks are checked the same way.
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_ROOT = os.path.join(ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from config.paths import reload_paths  # noqa: E402
from services import clip_generator as cg  # noqa: E402
from services import clips_history as ch  # noqa: E402
from services.integrations.youtube import sync as yt_sync  # noqa: E402

# The exact-render suite's stubbed FFmpeg pipeline, reused for the legacy sink checks.
TESTS_ROOT = os.path.dirname(os.path.abspath(__file__))
if TESTS_ROOT not in sys.path:
    sys.path.insert(0, TESTS_ROOT)
import test_exact_render as _exact_stub  # noqa: E402

CLI = os.path.join(BACKEND_ROOT, "cli.py")


def _strip_ansi(text):
    return re.sub(r"\x1b\[[0-9;]*m", "", text or "")

OWNED_VALUES = {
    "revisions": {"schema": 1}, "id": "other-id", "created_at": "2030-01-01T00:00:00Z", "source_video": "/elsewhere.mp4",
    "logo_backup_path": "/backup.mp4", "output_path": "/elsewhere_short.mp4", "duration": 9, "file_size_mb": 9,
    "start_second": 0, "end_second": 9, "caption_style": "hormozi", "crop_strategy": "manual", "format": "square",
    "keep_segments": [{"start": 0, "end": 1}], "logo_path": "", "intro_path": "/intro.mp4", "outro_path": "/outro.mp4",
    "logo_position": "bottom-right", "transcript_slice": "changed", "thumbnail_config": {"text": "changed"},
}
TRACKED_VALUES = [
    {"schema": 1, "incarnation": "inc-1", "draft_version": 0, "revision_version": 0, "current": None},
    "not-a-state", 0, False, [], {},
]


def _junction(target: str, link: str) -> bool:
    if os.name != "nt":
        os.symlink(target, link, target_is_directory=True)
        return True
    import _winapi
    _winapi.CreateJunction(target, link)
    return True


class FenceFixture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="podcli-fence-")
        self.links = tempfile.mkdtemp(prefix="podcli-fence-links-")
        self.exports = os.path.join(self.tmp, "exports")
        self.env = {"PODCLI_HOME": self.tmp, "PODCLI_DATA": os.path.join(self.tmp, "data"), "PODCLI_OUTPUT": self.exports}
        self.env_patch = mock.patch.dict(os.environ, self.env)
        self.env_patch.start()
        reload_paths()
        self.history_dir = os.path.join(self.tmp, "history")
        self.path = ch._history_path()
        self.namespace = os.path.join(self.exports, "writing-studio")
        self.sidecars = os.path.join(self.history_dir, "revisions")
        os.makedirs(self.history_dir, exist_ok=True)
        os.makedirs(self.exports, exist_ok=True)

    def tearDown(self):
        self.env_patch.stop()
        reload_paths()
        shutil.rmtree(self.links, ignore_errors=True)
        shutil.rmtree(self.tmp, ignore_errors=True)

    def clip(self, clip_id, output=None, **over):
        output = output or os.path.join(self.exports, f"{clip_id}_short.mp4")
        entry = {
            "id": clip_id, "source_video": "/videos/a.mp4", "start_second": 1, "end_second": 5, "caption_style": "karaoke",
            "crop_strategy": "center", "format": "vertical", "title": f"Clip {clip_id}", "output_path": output,
            "file_size_mb": 0.01, "duration": 4, "created_at": "2026-09-01T00:00:00Z", "transcript_slice": "green",
            "thumbnail_config": {"card_seconds": 1.5}, "unknown_field": {"kept": [1, {"deep": True}]},
        }
        entry.update(over)
        return entry

    def seed(self, entries):
        for e in entries:
            out = e.get("output_path")
            if isinstance(out, str) and not os.path.exists(out):
                os.makedirs(os.path.dirname(out), exist_ok=True)
                with open(out, "w", encoding="utf-8") as f:
                    f.write(f"media {e['id']}")
            for d in ("words", "recipes", "reframe"):
                os.makedirs(os.path.join(self.history_dir, d), exist_ok=True)
                with open(os.path.join(self.history_dir, d, f"{e['id']}.json"), "w", encoding="utf-8") as f:
                    f.write("{}")
            thumbs = os.path.join(self.exports, "thumbnails", e["id"])
            os.makedirs(thumbs, exist_ok=True)
            with open(os.path.join(thumbs, "t.png"), "w", encoding="utf-8") as f:
                f.write("png")
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(entries, f, indent=2)

    def entries(self):
        with open(self.path, encoding="utf-8") as f:
            return json.load(f)

    def tree(self):
        out = {}
        for base, _dirs, files in os.walk(self.tmp):
            for name in files:
                if name.endswith(".lock"):
                    continue
                p = os.path.join(base, name)
                with open(p, "rb") as f:
                    out[os.path.relpath(p, self.tmp)] = hashlib.sha256(f.read()).hexdigest()
        return out

    def cli(self, *args, stdin=subprocess.DEVNULL):
        env = {**os.environ, **self.env, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"}
        r = subprocess.run([sys.executable, CLI, "--no-banner", *args], cwd=self.tmp, env=env, stdin=stdin,
                           capture_output=True, text=True, encoding="utf-8", timeout=120)
        return r.returncode, _strip_ansi(r.stdout), _strip_ansi(r.stderr)


class LockedWriters(FenceFixture):
    def test_tracked_update_refuses_every_owned_field_and_writes_nothing(self):
        for value in TRACKED_VALUES:
            with self.subTest(revisions=value):
                self.seed([self.clip("t", revisions=value)])
                before = self.tree()
                for field in ch.REVISION_OWNED_FIELDS:
                    with self.assertRaises(ch.ClipRevisionFenceError) as caught:
                        ch.update_clip("t", title="not applied", **{field: OWNED_VALUES[field]})
                    self.assertEqual(caught.exception.code, "CLIP_REVISION_TRACKED")
                    self.assertTrue(str(caught.exception).startswith("CLIP_REVISION_TRACKED: "))
                    self.assertNotIn("\u2014", str(caught.exception))
                with self.assertRaises(ch.ClipRevisionFenceError):
                    ch.delete_clip("t")
                self.assertEqual(self.tree(), before)

    def test_none_valued_fields_are_not_writes(self):
        self.seed([self.clip("t", revisions={"schema": 1})])
        updated = ch.update_clip("t", title="Only title", caption_style=None, thumbnail_config=None)
        self.assertEqual(updated["title"], "Only title")
        self.assertEqual(self.entries()[0]["caption_style"], "karaoke")

    def test_metadata_writers_keep_working_on_tracked_clips(self):
        self.seed([self.clip("t", revisions={"schema": 1})])
        before = self.entries()[0]
        meta = {"title": "New", "generated_titles": ["a"], "description": "d", "tags": ["x"], "hashtags": "#y",
                "cloud_id": "cloud-1", "cloud_synced": True, "future_field": {"k": 1}}
        self.assertIsNotNone(ch.update_clip("t", **meta))
        # YouTube link and metrics publication (the unfenced mutate seam).
        self.assertTrue(yt_sync.set_link("t", "yt-123"))
        fetched = {"t": yt_sync.FetchedMetrics("youtube_video_id", "yt-123", None, {"views": 7, "fetched_at": "now"})}
        self.assertEqual(yt_sync._publish_metrics(fetched), 1)
        after = self.entries()[0]
        for field in ch.REVISION_OWNED_FIELDS:
            self.assertEqual(after.get(field), before.get(field), field)
        for key, value in meta.items():
            self.assertEqual(after[key], value, key)
        self.assertEqual((after["youtube_video_id"], after["metrics"]["views"]), ("yt-123", 7))
        self.assertEqual(after["unknown_field"], before["unknown_field"])

    def test_untracked_clips_behave_as_before_but_are_never_tracked_by_a_legacy_edit(self):
        self.seed([self.clip("u")])
        patch = {k: v for k, v in OWNED_VALUES.items() if k not in ("revisions", "id")}
        updated = ch.update_clip("u", **patch)
        for key, value in patch.items():
            self.assertEqual(updated[key], value, key)
        before = self.tree()
        with self.assertRaises(ch.ClipRevisionFenceError):
            ch.update_clip("u", revisions={"schema": 1})
        self.assertEqual(self.tree(), before)
        self.assertNotIn("revisions", self.entries()[0])

        self.seed([self.clip("u2")])
        removed = ch.delete_clip("u2")
        self.assertEqual(removed["id"], "u2")
        self.assertFalse(os.path.exists(os.path.join(self.exports, "u2_short.mp4")))
        self.assertFalse(os.path.exists(os.path.join(self.exports, "thumbnails", "u2")))


class PathFence(FenceFixture):
    def test_resolution_cases(self):
        main = os.path.join(self.namespace, "clip-x", "main.mp4")
        os.makedirs(os.path.dirname(main))
        with open(main, "w") as f:
            f.write("owned")
        cases = [
            ("namespace root", self.namespace, True),
            ("namespace file", main, True),
            ("missing file in the namespace", os.path.join(self.namespace, "y", "z.mp4"), True),
            ("sidecar tree", os.path.join(self.sidecars, "clip-x", "doc.json"), True),
            ("same-prefix sibling", os.path.join(self.exports, "writing-studio-other", "a.mp4"), False),
            ("ordinary export", os.path.join(self.exports, "a_short.mp4"), False),
            ("history file", self.path, False),
        ]
        if os.name == "nt":
            cases.append(("case variant", os.path.join(self.exports, "WRITING-STUDIO", "clip-x", "MAIN.mp4"), True))
        for label, target, expected in cases:
            self.assertEqual(ch.is_revision_owned_path(target), expected, label)

        alias = os.path.join(self.links, "alias")
        _junction(os.path.join(self.namespace, "clip-x"), alias)
        self.assertTrue(ch.is_revision_owned_path(os.path.join(alias, "main.mp4")), "junction alias")
        benign_target = os.path.join(self.links, "benign-target")
        os.makedirs(benign_target)
        _junction(benign_target, os.path.join(self.links, "benign"))
        self.assertFalse(ch.is_revision_owned_path(os.path.join(self.links, "benign", "a.mp4")), "benign junction")
        doomed = os.path.join(self.links, "doomed")
        os.makedirs(doomed)
        _junction(doomed, os.path.join(self.links, "dangling"))
        os.rmdir(doomed)
        self.assertTrue(ch.is_revision_owned_path(os.path.join(self.links, "dangling", "a.mp4")), "dangling junction fails closed")
        # lead-24 F-2: refused as unresolvable, with a path-free error code name.
        reason, error_code = ch.revision_path_verdict(os.path.join(self.links, "dangling", "a.mp4"))
        self.assertEqual(reason, "unresolvable")
        self.assertRegex(error_code, r"^[A-Za-z][A-Za-z0-9_]+$")
        self.assertEqual(ch.revision_path_verdict(main), ("owned", None))
        self.assertIsNone(ch.revision_path_verdict(os.path.join(self.exports, "a_short.mp4")))

        shutil.rmtree(self.namespace)
        self.assertTrue(ch.is_revision_owned_path(main), "missing namespace root")
        self.assertEqual(ch.revision_path_verdict(main), ("owned", None), "a missing root is owned, not unresolvable")

    def test_unresolvable_message_is_distinct_and_says_what_to_check(self):
        message = ch.FENCE_MESSAGES["unresolvable"]
        self.assertRegex(message, r"(?i)could not confirm")
        self.assertIn("outside the Writing Studio revision folders", message)
        self.assertRegex(message, r"(?i)nothing was changed")
        for word in ("file", "drive", "link"):
            self.assertIn(word, message)
        self.assertNotEqual(message, ch.FENCE_MESSAGES["owned"])
        self.assertNotRegex(message, r"[\\/]|\u2014")

        doomed = os.path.join(self.links, "doomed-delete")
        os.makedirs(doomed)
        _junction(doomed, os.path.join(self.links, "dangling-delete"))
        os.rmdir(doomed)
        main = os.path.join(self.namespace, "clip-x", "main.mp4")
        self.seed([self.clip("ptr-owned", main), self.clip("ok")])
        listed = self.entries() + [self.clip("ptr-dangling", os.path.join(self.links, "dangling-delete", "x_short.mp4"))]
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(listed, f, indent=2)
        before = self.tree()
        with self.assertRaises(ch.ClipRevisionFenceError) as caught:
            ch.delete_clip("ptr-dangling")
        err = caught.exception
        self.assertEqual((err.code, err.reason, err.message), ("REVISION_PATH_PROTECTED", "unresolvable", message))
        self.assertEqual(str(err), f"REVISION_PATH_PROTECTED: {message}")
        self.assertTrue(err.error_code)
        with self.assertRaises(ch.ClipRevisionFenceError) as caught:
            ch.delete_clip("ptr-owned")
        self.assertEqual((caught.exception.reason, caught.exception.message), ("owned", ch.FENCE_MESSAGES["owned"]))
        self.assertEqual(self.tree(), before)

    def test_removal_of_an_untracked_entry_pointing_into_either_tree_is_refused(self):
        main = os.path.join(self.namespace, "clip-x", "main.mp4")
        doc = os.path.join(self.sidecars, "clip-x", "rev.json")
        entries = [self.clip("ptr-ns", main), self.clip("ptr-doc", doc), self.clip("ok")]
        if os.name == "nt":
            entries.append(self.clip("ptr-case", os.path.join(self.exports, "Writing-Studio", "clip-x", "main.mp4")))
        self.seed(entries)
        alias = os.path.join(self.links, "alias")
        _junction(os.path.join(self.namespace, "clip-x"), alias)
        listed = self.entries() + [self.clip("ptr-alias", os.path.join(alias, "main.mp4"))]
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(listed, f, indent=2)
        before = self.tree()
        for e in listed:
            if e["id"] == "ok":
                continue
            with self.subTest(e["id"]):
                with self.assertRaises(ch.ClipRevisionFenceError) as caught:
                    ch.delete_clip(e["id"])
                self.assertEqual(caught.exception.code, "REVISION_PATH_PROTECTED")
        self.assertEqual(self.tree(), before)
        self.assertEqual(ch.delete_clip("ok")["id"], "ok")


class Cli(FenceFixture):
    def test_explicit_null_and_empty_options_refuse_tracked_and_preserve_untracked_contract(self):
        for tracked in (True, False):
            for option, value in (("--thumbnail-config", "null"), ("--thumbnail-config", ""), ("--caption-style", "")):
                for with_title in (True, False):
                    with self.subTest(tracked=tracked, option=option, value=value, with_title=with_title):
                        self.seed([self.clip("clip", **({"revisions": {"schema": 1}} if tracked else {}))])
                        before = self.tree()
                        original = self.entries()[0]
                        args = ["clips", "edit", "clip", option, value]
                        if with_title:
                            args.append("--title=Changed")
                        code, _out, err = self.cli(*args)
                        if tracked:
                            self.assertNotEqual(code, 0, err)
                            self.assertIn("CLIP_REVISION_TRACKED", err)
                            self.assertEqual(self.tree(), before)
                        elif option == "--caption-style":
                            # fed8ed1 argparse choices reject empty captions, even with title.
                            self.assertEqual(code, 2, err)
                            self.assertIn("invalid choice: ''", err)
                            self.assertEqual(self.tree(), before)
                        elif with_title:
                            self.assertEqual(code, 0, err)
                            self.assertEqual(self.entries()[0], {**original, "title": "Changed"})
                        else:
                            self.assertEqual(code, 1, err)
                            self.assertIn("Nothing to change", err)
                            self.assertEqual(self.tree(), before)

    def test_clips_edit_and_delete_refuse_a_tracked_clip_with_the_code(self):
        self.seed([self.clip("tracked-clip", revisions={"schema": 1})])
        before = self.tree()
        for args in (["clips", "edit", "tracked-clip", "--caption-style", "hormozi"],
                     ["clips", "edit", "tracked-clip", "--thumbnail-config", '{"text":"x"}'],
                     ["clips", "delete", "tracked-clip", "--yes"],
                     ["clips", "delete", "tracked-clip"]):
            with self.subTest(args=args):
                code, out, err = self.cli(*args)
                self.assertEqual(code, 1, err)
                self.assertRegex(err, r"(?m)^\s*✗ CLIP_REVISION_TRACKED: ")
                self.assertNotIn("[y/N]", out)
                self.assertNotIn(self.tmp, err)
        self.assertEqual(self.tree(), before)
        code, _out, err = self.cli("clips", "edit", "tracked-clip", "--title=Metadata still works")
        self.assertEqual(code, 0, err)
        self.assertEqual(self.entries()[0]["title"], "Metadata still works")

    def test_path_based_commands_refuse_owned_targets_before_any_work(self):
        main = os.path.join(self.namespace, "clip-x", "main.mp4")
        os.makedirs(os.path.dirname(main))
        with open(main, "w") as f:
            f.write("owned")
        image = os.path.join(self.tmp, "card.png")
        with open(image, "w") as f:
            f.write("png")
        targets = [main, os.path.join(self.namespace, "missing", "main.mp4"), os.path.join(self.sidecars, "c", "d.json")]
        if os.name == "nt":
            targets.append(os.path.join(self.exports, "Writing-Studio", "clip-x", "main.mp4"))
        before = self.tree()
        for target in targets:
            for args in (["bake-thumbnail", target, image], ["swap-thumbnail", target, "--source-video", image, "--image", image]):
                with self.subTest(args=args):
                    code, _out, err = self.cli(*args)
                    self.assertEqual(code, 1, err)
                    self.assertRegex(err, r"(?m)^\s*✗ REVISION_PATH_PROTECTED: ")
        self.assertEqual(self.tree(), before)
        self.assertFalse(os.path.exists(os.path.join(self.namespace, "missing")))
        # lead-24 F-2: owned targets print the owned wording; an unresolvable one, the could-not-confirm wording.
        code, _out, err = self.cli("bake-thumbnail", main, image)
        self.assertIn(f"REVISION_PATH_PROTECTED: {ch.FENCE_MESSAGES['owned']}", err)
        doomed = os.path.join(self.links, "doomed-cli")
        os.makedirs(doomed)
        _junction(doomed, os.path.join(self.links, "dangling-cli"))
        os.rmdir(doomed)
        dangling_target = os.path.join(self.links, "dangling-cli", "x_short.mp4")
        for args in (["bake-thumbnail", dangling_target, image], ["swap-thumbnail", dangling_target, "--source-video", image, "--image", image]):
            with self.subTest(args=args):
                code, _out, err = self.cli(*args)
                self.assertEqual(code, 1, err)
                self.assertRegex(err, r"(?m)^\s*✗ REVISION_PATH_PROTECTED: ")
                self.assertIn(ch.FENCE_MESSAGES["unresolvable"], err)
                self.assertNotIn(self.links, err)
        self.assertEqual(self.tree(), before)
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump([self.clip("ptr-dangling", dangling_target)], f, indent=2)
        code, _out, err = self.cli("clips", "delete", "ptr-dangling", "--yes")
        self.assertEqual(code, 1, err)
        self.assertIn(f"REVISION_PATH_PROTECTED: {ch.FENCE_MESSAGES['unresolvable']}", err)
        self.assertEqual([e["id"] for e in self.entries()], ["ptr-dangling"])
        # Outside both trees the commands proceed to their own checks.
        code, _out, err = self.cli("bake-thumbnail", os.path.join(self.exports, "nope.mp4"), image)
        self.assertEqual(code, 1)
        self.assertIn("Clip not found", err)
        self.assertNotIn("REVISION_PATH_PROTECTED", err)


class LegacySinks(FenceFixture):
    """WS-23 (1B.2b.4a): generate_clip's legacy branch checks every sink it will write
    (the title-derived file whatever its suffix, the kept caption-overlay and source
    copies, the autofix temporaries) before the first write, and refuses one that
    resolves into the revision trees with REVISION_PATH_PROTECTED, writing nothing
    there. The FFmpeg stages are the exact-render suite's stubs; exact mode is unchanged."""

    def setUp(self):
        super().setUp()
        cg._reserved_output_paths.clear()
        self.addCleanup(cg._reserved_output_paths.clear)
        remotion = cg._remotion_available
        cg._remotion_available = None
        self.addCleanup(setattr, cg, "_remotion_available", remotion)
        self.owned_dir = os.path.join(self.namespace, "clip-x", "g1-op", "final")
        os.makedirs(self.owned_dir)
        self.owned_file = os.path.join(self.owned_dir, "main_short.mp4")
        with open(self.owned_file, "wb") as f:
            f.write(b"owned revision bytes")
        self.dangling_target = os.path.join(self.owned_dir, "created_short.mp4")

    def owned(self):
        out = {}
        for base, _dirs, files in os.walk(self.namespace):
            for name in files:
                with open(os.path.join(base, name), "rb") as f:
                    out[os.path.join(base, name)] = hashlib.sha256(f.read()).hexdigest()
        return out

    def out_dir(self, name):
        path = os.path.join(self.links, name)  # outside both trees
        os.makedirs(path)
        return path

    def link(self, kind, at):
        if kind == "junction":
            _junction(self.owned_dir, at)
            return
        try:
            os.symlink(self.owned_file if kind == "symlink" else self.dangling_target, at)
        except OSError as exc:
            self.skipTest(f"file symlinks are unavailable here: {exc}")

    def render(self, pipe, output_dir, **kw):
        params = dict(video_path=pipe.source, start_second=2, end_second=3, caption_style="hormozi", crop_strategy="center",
                      format="vertical", title="legacy stub", output_dir=output_dir, transcript_words=_exact_stub._words())
        params.update(kw)
        return cg.generate_clip(**params)

    def assert_refused(self, pipe, output_dir, reason="owned", **kw):
        before = self.owned()
        listing = sorted(os.listdir(output_dir)) if os.path.isdir(output_dir) else None
        with self.assertRaises(ch.ClipRevisionFenceError) as caught:
            self.render(pipe, output_dir, **kw)
        err = caught.exception
        self.assertEqual((err.code, err.reason), ("REVISION_PATH_PROTECTED", reason))
        self.assertEqual(str(err), f"REVISION_PATH_PROTECTED: {ch.FENCE_MESSAGES[reason]}")
        self.assertEqual(self.owned(), before)
        self.assertFalse(os.path.exists(self.dangling_target))
        self.assertEqual(sorted(os.listdir(output_dir)) if os.path.isdir(output_dir) else None, listing)

    def test_a_link_at_the_title_derived_name_is_refused(self):
        for kind, reason in (("symlink", "owned"), ("junction", "owned"), ("dangling", "unresolvable")):
            with self.subTest(kind=kind), _exact_stub._StubPipeline(self.tmp) as pipe:
                out = self.out_dir(f"out-{kind}")
                self.link(kind, os.path.join(out, "legacy_stub_short.mp4"))
                self.assert_refused(pipe, out, reason)

    def test_a_link_at_a_suffixed_name_is_refused(self):
        out = self.out_dir("out-suffix")
        # An earlier clip in this run holds the plain name, so this one takes "-2".
        self.assertEqual(cg._reserve_output_path(out, "legacy_stub_short", ".mp4"), os.path.join(out, "legacy_stub_short.mp4"))
        for kind, reason in (("symlink", "owned"), ("dangling", "unresolvable")):
            with self.subTest(kind=kind), _exact_stub._StubPipeline(self.tmp) as pipe:
                at = os.path.join(out, "legacy_stub_short-2.mp4")
                self.link(kind, at)
                self.assert_refused(pipe, out, reason)
                os.remove(at)
                cg._reserved_output_paths.discard(at)

    def test_kept_overlay_and_source_copies_and_autofix_temporaries_are_checked(self):
        def remotion(**kw):
            for path in (kw["output_path"], kw["output_path"] + ".overlay.mov"):
                with open(path, "wb") as f:
                    f.write(b"stub")
            return True, kw["output_path"] + ".overlay.mov"

        with _exact_stub._StubPipeline(self.tmp) as pipe, mock.patch.object(cg, "_render_with_remotion", side_effect=remotion):
            control = self.render(pipe, self.out_dir("out-control"), keep_caption_overlay=True)
            self.assertTrue(control.get("caption_overlay_path") and control.get("cropped_source_path"), control)
            for suffix in ("_captions.mov", "_source.mp4"):
                with self.subTest(sink=suffix):
                    cg._reserved_output_paths.clear()
                    out = self.out_dir(f"out{suffix.replace('.', '-')}")
                    self.link("symlink", os.path.join(out, f"legacy_stub_short{suffix}"))
                    self.assert_refused(pipe, out, keep_caption_overlay=True)
        with mock.patch.dict(os.environ, {"PODCLI_TRANSITION_AUTOFIX_PASSES": "2"}):
            for n in (1, 2):
                with self.subTest(autofix=n), _exact_stub._StubPipeline(self.tmp) as pipe:
                    cg._reserved_output_paths.clear()
                    out = self.out_dir(f"out-autofix{n}")
                    self.link("junction", os.path.join(out, f"legacy_stub_short.mp4.autofix{n}.mp4"))
                    self.assert_refused(pipe, out)

    def test_an_output_folder_inside_the_namespace_is_refused_without_creating_it(self):
        with _exact_stub._StubPipeline(self.tmp) as pipe:
            if os.name == "nt":
                self.assert_refused(pipe, os.path.join(self.exports, "WRITING-STUDIO", "clip-x", "new"))
            self.assert_refused(pipe, os.path.join(self.namespace, "clip-y"))
            self.assertFalse(os.path.exists(os.path.join(self.namespace, "clip-y")))
            shutil.rmtree(self.namespace)
            self.assert_refused(pipe, os.path.join(self.namespace, "clip-z"))
            self.assertFalse(os.path.exists(self.namespace), "the missing namespace root was created")

    def test_outside_the_trees_and_in_exact_mode_rendering_is_unchanged(self):
        with _exact_stub._StubPipeline(self.tmp) as pipe:
            out = self.out_dir("out-plain")
            result = self.render(pipe, out)
            self.assertEqual(result["output_path"], os.path.join(out, "legacy_stub_short.mp4"))
            self.assertTrue(os.path.isfile(result["output_path"]))
            # Exact mode publishes its own group inside the namespace, as the save service asks.
            exact = self.render(pipe, os.path.join(self.namespace, "clip-x"), timing_mode="exact",
                                keep_segments=[{"start": 1, "end": 4}], title="exact stub")
            self.assertTrue(exact["output_path"].startswith(os.path.join(self.namespace, "clip-x")))
            self.assertTrue(os.path.isfile(exact["output_path"]))

    # Audio-only road (lead-27, review F-1): generate_clip hands an audio-only source to
    # render_audiogram, which names its own output `<output folder>/<safe title>.mp4`
    # (alphanumerics, "-" and "_" kept, everything else "_"). The waveform read and the
    # Remotion call are stubbed; a refusal must come before either and before the
    # output folder exists.

    def render_audio(self, output_dir, title="audio stub"):
        from services import audiogram

        self.audio_calls = []

        def remotion(cmd, **_kw):
            self.audio_calls.append("remotion")
            with open(cmd[cmd.index("--output") + 1], "wb") as f:
                f.write(b"audiogram")
            return mock.Mock(returncode=0, stderr="")

        def envelope(*_a, **_kw):
            self.audio_calls.append("envelope")
            return [[0.5]]

        with mock.patch.object(audiogram, "is_audio_only", return_value=True), \
             mock.patch.object(audiogram, "envelope", side_effect=envelope), \
             mock.patch.object(audiogram, "extract_cover", return_value=None), \
             mock.patch.object(audiogram, "proc_run", side_effect=remotion):
            return cg.generate_clip(video_path=__file__, start_second=1, end_second=3, caption_style="hormozi",
                                    format="vertical", title=title, output_dir=output_dir, transcript_words=[])

    def assert_audio_refused(self, output_dir, reason="owned", title="audio stub", created=None):
        before = self.owned()
        listing = sorted(os.listdir(output_dir)) if output_dir and os.path.isdir(output_dir) else None
        with self.assertRaises(ch.ClipRevisionFenceError) as caught:
            self.render_audio(output_dir, title)
        err = caught.exception
        self.assertEqual((err.code, err.reason), ("REVISION_PATH_PROTECTED", reason))
        self.assertEqual(str(err), f"REVISION_PATH_PROTECTED: {ch.FENCE_MESSAGES[reason]}")
        self.assertEqual(self.audio_calls, [], "the audiogram started before the refusal")
        self.assertEqual(self.owned(), before)
        self.assertFalse(os.path.exists(self.dangling_target))
        self.assertEqual(sorted(os.listdir(output_dir)) if output_dir and os.path.isdir(output_dir) else None, listing)
        if created:
            self.assertFalse(os.path.exists(created), f"{created} was created")

    def test_audio_only_a_link_at_the_title_derived_name_is_refused(self):
        for kind, reason in (("symlink", "owned"), ("junction", "owned"), ("dangling", "unresolvable")):
            with self.subTest(kind=kind):
                out = self.out_dir(f"audio-{kind}")
                self.link(kind, os.path.join(out, "audio_stub.mp4"))
                self.assert_audio_refused(out, reason)
        # A renamed clip keeps its old output file; the check follows the new title's name.
        out = self.out_dir("audio-renamed")
        self.link("symlink", os.path.join(out, "Ep__1__What_s_next_.mp4"))
        self.assert_audio_refused(out, title="Ep. 1: What's next?")

    def test_audio_only_an_output_folder_in_the_trees_is_refused_without_creating_it(self):
        junction = os.path.join(self.links, "audio-junction-folder")
        _junction(self.owned_dir, junction)
        self.assert_audio_refused(junction)
        if os.name == "nt":
            self.assert_audio_refused(os.path.join(self.exports, "WRITING-STUDIO", "clip-x", "case"),
                                      created=os.path.join(self.namespace, "clip-x", "case"))
        self.assert_audio_refused(os.path.join(self.namespace, "clip-y"), created=os.path.join(self.namespace, "clip-y"))
        shutil.rmtree(self.namespace)
        self.assert_audio_refused(os.path.join(self.namespace, "clip-z"), created=self.namespace)

    def test_audio_only_default_output_folder_and_shared_temp_folder_are_checked(self):
        cwd = os.path.join(self.namespace, "clip-x")
        self.addCleanup(os.chdir, os.getcwd())
        os.chdir(cwd)
        self.assert_audio_refused(None, created=os.path.join(cwd, "output"))
        os.chdir(self.links)
        with mock.patch.object(tempfile, "tempdir", os.path.join(self.namespace, "tmp")):
            self.assert_audio_refused(self.out_dir("audio-temp"))

    def test_audio_only_outside_the_trees_renders_as_before(self):
        out = os.path.join(self.links, "audio-plain", "new")
        result = self.render_audio(out)
        self.assertEqual(result["output_path"], os.path.join(out, "audio_stub.mp4"))
        self.assertEqual(result["crop_strategy"], "audiogram")
        self.assertEqual(self.audio_calls, ["envelope", "remotion"])
        with open(result["output_path"], "rb") as f:
            self.assertEqual(f.read(), b"audiogram")


if __name__ == "__main__":
    unittest.main()
