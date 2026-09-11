"""Tests for backend.services.reel session + edit logic (no video/render)."""

import os
from pathlib import Path
from dataclasses import asdict
import shutil
import sys
import tempfile
import unittest
from unittest import mock

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_ROOT = os.path.join(ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from services import reel as R


def _session(**kw):
    return R.ReelSession(
        session_id=kw.get("sid", "unittest_reel"),
        source="/tmp/fake.mp4",
        profile="party",
        out_dir="/tmp/fake_out",
        moments=[R.Moment(100.0, 120.0, "energy_peak", "one"),
                 R.Moment(200.0, 215.0, "reaction", "two")],
    )


class MomentTests(unittest.TestCase):
    def test_duration(self):
        self.assertEqual(R.Moment(10.0, 25.0).duration, 15.0)


class EditTests(unittest.TestCase):
    def setUp(self):
        self.s = _session()

    def tearDown(self):
        p = R.session_path(self.s.session_id)
        if os.path.exists(p):
            os.remove(p)

    def test_longer_extends_end_and_marks_dirty(self):
        R.edit_moment(self.s, 1, "longer", 10)
        self.assertEqual(self.s.moments[0].end, 130.0)
        self.assertTrue(self.s.moments[0].dirty)

    def test_shorter_pulls_end_in(self):
        R.edit_moment(self.s, 1, "shorter", 5)
        self.assertEqual(self.s.moments[0].end, 115.0)

    def test_earlier_moves_start_back(self):
        R.edit_moment(self.s, 1, "earlier", 8)
        self.assertEqual(self.s.moments[0].start, 92.0)

    def test_shift_moves_both_bounds(self):
        R.edit_moment(self.s, 2, "shift", -20)
        self.assertEqual(self.s.moments[1].start, 180.0)
        self.assertEqual(self.s.moments[1].end, 195.0)

    def test_drop_removes_moment(self):
        R.edit_moment(self.s, 1, "drop")
        self.assertEqual(len(self.s.moments), 1)
        self.assertEqual(self.s.moments[0].text, "two")

    def test_drop_marks_shifted_moments_dirty(self):
        for m in self.s.moments:
            m.dirty = False
        R.edit_moment(self.s, 1, "drop")
        # The moment that slid into position 1 must re-cut, else it reuses the
        # dropped moment's clip file.
        self.assertTrue(self.s.moments[0].dirty)

    def test_toggle_disables_without_removing(self):
        R.edit_moment(self.s, 1, "toggle")
        self.assertFalse(self.s.moments[0].enabled)
        self.assertEqual(len(self.s.moments), 2)

    def test_set_absolute_bounds(self):
        R.edit_moment(self.s, 1, "set", start=90.5, end=110.4)
        m = self.s.moments[0]
        self.assertEqual((m.start, m.end), (90.5, 110.4))
        self.assertTrue(m.dirty)

    def test_set_start_only_keeps_end(self):
        R.edit_moment(self.s, 1, "set", start=95.0)
        self.assertEqual((self.s.moments[0].start, self.s.moments[0].end), (95.0, 120.0))

    def test_set_end_only_keeps_start(self):
        R.edit_moment(self.s, 1, "set", end=140.0)
        self.assertEqual((self.s.moments[0].start, self.s.moments[0].end), (100.0, 140.0))

    def test_set_clamps_negative_start(self):
        R.edit_moment(self.s, 1, "set", start=-5.0)
        self.assertEqual(self.s.moments[0].start, 0.0)

    def test_set_keeps_end_above_start(self):
        R.edit_moment(self.s, 1, "set", start=118.0, end=100.0)
        self.assertGreater(self.s.moments[0].end, self.s.moments[0].start)

    def test_bad_index_raises(self):
        with self.assertRaises(IndexError):
            R.edit_moment(self.s, 99, "longer", 5)

    def test_unknown_op_raises(self):
        with self.assertRaises(ValueError):
            R.edit_moment(self.s, 1, "flip", 5)


class PersistenceTests(unittest.TestCase):
    def tearDown(self):
        p = R.session_path("roundtrip_reel")
        if os.path.exists(p):
            os.remove(p)

    def test_save_and_load_roundtrip(self):
        s = _session(sid="roundtrip_reel")
        s.save()
        loaded = R.ReelSession.load("roundtrip_reel")
        self.assertEqual(loaded.session_id, "roundtrip_reel")
        self.assertEqual(len(loaded.moments), 2)
        self.assertEqual(loaded.moments[1].why, "reaction")
        self.assertIsInstance(loaded.moments[0], R.Moment)

    def test_format_defaults_to_horizontal(self):
        s = _session(sid="roundtrip_reel")
        s.save()
        self.assertEqual(R.ReelSession.load("roundtrip_reel").format, "horizontal")


class FormatTests(unittest.TestCase):
    def test_horizontal_pads_to_1920x1080(self):
        vf = R._scale_filter("horizontal")
        self.assertIn("1920:1080", vf)
        self.assertIn("pad=", vf)

    def test_vertical_crops_to_fill(self):
        vf = R._scale_filter("vertical")
        self.assertIn("1080:1920", vf)
        self.assertIn("crop=1080:1920", vf)

    def test_square_crops_to_fill(self):
        vf = R._scale_filter("square")
        self.assertIn("crop=1080:1080", vf)

    def test_unknown_format_falls_back(self):
        self.assertIn("1080:1920", R._scale_filter("bogus"))


class SeedSessionTests(unittest.TestCase):
    def tearDown(self):
        p = R.session_path("seed_test")
        if os.path.exists(p):
            os.remove(p)

    def test_builds_moments_and_stores_format(self):
        clips = [{"start_second": 10.24, "end_second": 25.71, "reasons": ["laughter"]}]
        with mock.patch("services.saliency.detect_highlights", return_value=clips):
            s = R.seed_session("seed_test", "/tmp/v.mp4", "/tmp/o", format="vertical", top_n=5)
        self.assertEqual(s.format, "vertical")
        self.assertEqual(len(s.moments), 1)
        self.assertEqual((s.moments[0].start, s.moments[0].end), (10.2, 25.7))
        self.assertEqual(s.moments[0].why, "laughter")

    def test_unknown_format_normalized_on_seed(self):
        with mock.patch("services.saliency.detect_highlights", return_value=[]):
            s = R.seed_session("seed_test", "/tmp/v.mp4", "/tmp/o", format="bogus")
        self.assertEqual(s.format, "vertical")


class BuildReelTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.s = R.ReelSession(
            "build_test", "/tmp/src.mp4", "auto", self.dir, format="vertical",
            moments=[R.Moment(10.0, 20.0, "x", "a"), R.Moment(30.0, 45.0, "y", "b")],
        )

    def tearDown(self):
        shutil.rmtree(self.dir, ignore_errors=True)
        p = R.session_path("build_test")
        if os.path.exists(p):
            os.remove(p)

    def _build(self):
        with mock.patch.object(R, "proc_run", return_value=mock.Mock(returncode=0)) as pr:
            R.build_reel(self.s)
        return pr

    @staticmethod
    def _cut_calls(pr):
        return [c for c in pr.call_args_list if "-vf" in c.args[0]]

    def test_cut_uses_session_format_dimensions(self):
        pr = self._build()
        cuts = self._cut_calls(pr)
        self.assertEqual(len(cuts), 2)
        for c in cuts:
            argv = c.args[0]
            vf = argv[argv.index("-vf") + 1]
            self.assertIn("1080:1920", vf)

    def test_clean_existing_clips_are_reused(self):
        clips = os.path.join(self.dir, "clips")
        os.makedirs(clips, exist_ok=True)
        for i in (1, 2):
            open(os.path.join(clips, f"clip_{i:02d}.mp4"), "w").close()
        for m in self.s.moments:
            m.dirty = False
        pr = self._build()
        self.assertEqual(self._cut_calls(pr), [])

    def test_only_enabled_moments_reach_the_concat(self):
        self.s.moments[0].enabled = False
        self._build()
        with open(os.path.join(self.dir, "_concat.txt")) as f:
            lines = [ln for ln in f if ln.strip()]
        self.assertEqual(len(lines), 1)

    def test_drop_then_build_recuts_shifted_moment(self):
        clips = os.path.join(self.dir, "clips")
        os.makedirs(clips, exist_ok=True)
        for i in (1, 2):
            open(os.path.join(clips, f"clip_{i:02d}.mp4"), "w").close()
        for m in self.s.moments:
            m.dirty = False
        R.edit_moment(self.s, 1, "drop")
        pr = self._build()
        self.assertEqual(len(self._cut_calls(pr)), 1)


class SessionRegistryTests(unittest.TestCase):
    _ids = ("registry_a", "registry_b")

    def tearDown(self):
        for sid in self._ids:
            p = R.session_path(sid)
            if os.path.exists(p):
                os.remove(p)

    def test_list_and_delete(self):
        for sid in self._ids:
            _session(sid=sid).save()
        listed = {s["session_id"] for s in R.list_sessions()}
        self.assertTrue(set(self._ids) <= listed)
        summary = next(s for s in R.list_sessions() if s["session_id"] == "registry_a")
        self.assertEqual(summary["moment_count"], 2)
        self.assertEqual(summary["enabled_count"], 2)
        self.assertTrue(R.delete_session("registry_a"))
        self.assertFalse(R.delete_session("registry_a"))
        self.assertNotIn("registry_a", {s["session_id"] for s in R.list_sessions()})


class DifferentBatchTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        registry = Path(self.tmp.name) / 'sessions'
        registry.mkdir()
        patcher = mock.patch.object(R, '_sessions_dir', return_value=str(registry))
        patcher.start()
        self.addCleanup(patcher.stop)
        self.first = _session(sid='first')
        self.first.out_dir = str(Path(self.tmp.name) / 'first-reel')
        Path(self.first.out_dir).mkdir()
        (Path(self.first.out_dir) / 'highlights_reel.mp4').write_bytes(b'original reel')
        self.first.save()
        self.settings = {'auto': False, 'top_n': 2, 'min_dur': 5, 'max_dur': 10}
        self.next_clips = [{'start_second': 300, 'end_second': 310, 'reasons': ['energy_peak']}]
        self.detector = mock.patch('services.saliency.detect_highlights', return_value=self.next_clips).start()
        self.addCleanup(mock.patch.stopall)
        mock.patch('services.transcript_packer.load_cached_transcript_for_video', return_value=None).start()
        self.builder = mock.patch.object(R, 'build_reel', return_value='reel.mp4').start()

    def test_batch_is_persistent_and_preserves_original(self):
        original = Path(R.session_path('first')).read_bytes()
        second = R.find_different_session(self.first, self.settings, mode='new')
        self.assertNotEqual(second.session_id, self.first.session_id)
        self.assertNotEqual(second.out_dir, self.first.out_dir)
        self.assertEqual(second.batch_number, 2)
        loaded = R.ReelSession.load(second.session_id)
        self.assertEqual(loaded.selection_settings, self.settings)
        self.assertEqual(loaded.family_id, 'first')
        self.assertEqual(len(loaded.seen_ranges), 3)
        self.assertEqual(Path(R.session_path('first')).read_bytes(), original)
        self.assertEqual((Path(self.first.out_dir) / 'highlights_reel.mp4').read_bytes(), b'original reel')
        self.assertEqual(self.builder.call_args.kwargs['save_session'], False)

    def test_reopening_original_still_excludes_later_batches_and_dropped_ranges(self):
        R.edit_moment(self.first, 1, 'set', start=95, end=125)
        R.edit_moment(self.first, 1, 'drop')
        second = R.find_different_session(self.first, self.settings, mode='new')
        self.next_clips[0] = {'start_second': 400, 'end_second': 410}
        third = R.find_different_session(R.ReelSession.load('first'), self.settings, mode='new')
        self.assertEqual(third.batch_number, 3)
        seen = self.detector.call_args.kwargs['excluded_ranges']
        self.assertTrue(all({'source': self.first.source, 'start': a, 'end': b} in seen
                            for a, b in [(100, 120), (95, 125), (300, 310)]))
        # Descendants carry history even if an earlier batch is deleted.
        R.delete_session(second.session_id)
        self.assertTrue(any(r['start'] == 300 for r in third.seen_ranges))

    def test_no_candidates_or_failed_build_do_not_save_or_consume_picks(self):
        before = Path(R.session_path('first')).read_bytes()
        self.detector.return_value = []
        with self.assertRaisesRegex(ValueError, 'No unused highlights'):
            R.find_different_session(self.first, self.settings)
        self.builder.assert_not_called()
        self.detector.return_value = self.next_clips
        self.builder.side_effect = RuntimeError('render failed')
        with self.assertRaisesRegex(RuntimeError, 'render failed'):
            R.find_different_session(self.first, self.settings)
        self.assertEqual([s['session_id'] for s in R.list_sessions()], ['first'])
        self.assertEqual(Path(R.session_path('first')).read_bytes(), before)

    def test_pooled_sources_with_no_initial_winners_are_kept(self):
        self.first.sources = [self.first.source, '/tmp/another.mp4']
        self.first.save()
        with mock.patch('services.saliency.detect_highlights_pooled', return_value=self.next_clips) as pooled:
            second = R.find_different_session(self.first, self.settings)
        self.assertEqual(pooled.call_args.args[0], self.first.sources)
        self.assertEqual(second.sources, self.first.sources)

    def test_auto_uses_automatic_limits_and_custom_uses_requested_limits(self):
        self.assertEqual(R.selection_settings({'auto': True, 'min_dur': 999}),
                         {'auto': True, 'top_n': 50, 'min_dur': 5.0, 'max_dur': 120.0})
        with self.assertRaises(ValueError):
            R.find_different_session(self.first, {**self.settings, 'max_dur': 1})
        self.detector.assert_not_called()

    def test_default_appends_to_same_batch_preserving_trims_order_and_exclusions(self):
        self.first.moments.reverse()
        self.first.moments[0].enabled = False
        self.first.moments[1].start = 105
        self.first.save()
        before = asdict(self.first)
        updated = R.find_different_session(self.first, self.settings)
        self.assertEqual(updated.session_id, self.first.session_id)
        self.assertEqual(updated.batch_number, 1)
        self.assertEqual(asdict(updated)['moments'][:2], before['moments'])
        self.assertEqual(updated.moments[-1].start, 300)
        self.assertEqual(asdict(self.first), before)
        self.assertEqual(len(R.list_sessions()), 1)
        self.assertEqual(R.ReelSession.load('first').revision, updated.revision)
        self.assertNotEqual(updated.out_dir, self.first.out_dir)

    def test_append_failure_preserves_saved_reel_and_cleans_staging(self):
        before = Path(R.session_path('first')).read_bytes()
        self.builder.side_effect = RuntimeError('render failed')
        with self.assertRaisesRegex(RuntimeError, 'render failed'):
            R.find_different_session(self.first, self.settings)
        self.assertEqual(Path(R.session_path('first')).read_bytes(), before)
        self.assertEqual(list(Path(self.tmp.name).glob('reel_*_edit_*')), [])
        self.assertEqual((Path(self.first.out_dir) / 'highlights_reel.mp4').read_bytes(), b'original reel')


class ReorderTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        registry = Path(self.tmp.name) / 'sessions'
        registry.mkdir()
        patcher = mock.patch.object(R, '_sessions_dir', return_value=str(registry))
        patcher.start()
        self.addCleanup(patcher.stop)
        self.s = _session(sid='ordered')
        self.s.out_dir = str(Path(self.tmp.name) / 'original')
        clips = Path(self.s.out_dir) / 'clips'
        clips.mkdir(parents=True)
        self.s.moments.append(R.Moment(300, 305, enabled=False))
        for i, m in enumerate(self.s.moments, 1):
            m.dirty = False
            (clips / f'clip_{i:02d}.mp4').write_bytes(str(m.start).encode())
        (Path(self.s.out_dir) / 'highlights_reel.mp4').write_bytes(b'original reel')
        self.s.save()

    @staticmethod
    def concat(files, output, work_dir):
        Path(output).write_bytes(b'|'.join(Path(f).read_bytes() for f in files))

    def test_reorder_reuses_correct_cached_clips_and_omits_excluded_from_reel(self):
        ids = [m.moment_id for m in self.s.moments]
        before = asdict(self.s)
        with mock.patch.object(R, '_cut') as cut, mock.patch.object(R, '_concat_clips', side_effect=self.concat):
            result = R.reorder_moments(self.s, [ids[2], ids[1], ids[0]])
        cut.assert_not_called()
        self.assertEqual(Path(result.out_dir, 'highlights_reel.mp4').read_bytes(), b'200.0|100.0')
        self.assertEqual(Path(result.out_dir, 'clips/clip_01.mp4').read_bytes(), b'300')
        self.assertFalse(result.moments[0].enabled)
        self.assertEqual(asdict(self.s), before)
        self.assertEqual(R.ReelSession.load('ordered').moments[-1].moment_id, ids[0])

    def test_invalid_order_rejected_without_changing_files(self):
        ids = [m.moment_id for m in self.s.moments]
        before = Path(R.session_path('ordered')).read_bytes()
        for order in [None, ids[:2], [ids[0]] * 3, [*ids[:2], 'missing'], [0, 1, 2]]:
            with self.subTest(order=order), self.assertRaises(ValueError):
                R.reorder_moments(self.s, order)
        self.assertEqual(Path(R.session_path('ordered')).read_bytes(), before)

    def test_failed_concat_or_stale_revision_does_not_publish_new_order(self):
        before = Path(R.session_path('ordered')).read_bytes()
        order = [m.moment_id for m in reversed(self.s.moments)]
        with mock.patch.object(R, '_concat_clips', side_effect=RuntimeError('concat failed')):
            with self.assertRaisesRegex(RuntimeError, 'concat failed'):
                R.reorder_moments(self.s, order)
        self.assertEqual(Path(R.session_path('ordered')).read_bytes(), before)
        changed = R.ReelSession.load('ordered')
        changed.moments[0].end = 118
        changed.save()
        with mock.patch.object(R, '_concat_clips', side_effect=self.concat):
            with self.assertRaisesRegex(ValueError, 'another window'):
                R.reorder_moments(self.s, order)
        self.assertEqual(R.ReelSession.load('ordered').revision, changed.revision)
        self.assertEqual(list(Path(self.tmp.name).glob('reel_*_edit_*')), [])

    def test_all_excluded_can_be_reordered_without_a_stale_download(self):
        for m in self.s.moments:
            m.enabled = False
        self.s.save()
        result = R.reorder_moments(self.s, [m.moment_id for m in reversed(self.s.moments)])
        self.assertFalse(Path(result.out_dir, 'highlights_reel.mp4').exists())
        self.assertTrue(all(not m.enabled for m in result.moments))

    def test_legacy_ids_are_stable_across_reads_and_saved_after_reorder(self):
        data = asdict(self.s)
        for m in data['moments']:
            del m['moment_id']
        import json
        Path(R.session_path('ordered')).write_text(json.dumps(data), encoding='utf-8')
        first = R.ReelSession.load('ordered')
        second = R.ReelSession.load('ordered')
        self.assertEqual(first.revision, second.revision)
        with mock.patch.object(R, '_concat_clips', side_effect=self.concat):
            result = R.reorder_moments(first, [m.moment_id for m in reversed(first.moments)])
        self.assertEqual(R.ReelSession.load('ordered').revision, result.revision)


class DownloadVariantTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.source = Path(self.tmp.name) / "original.mp4"
        self.source.write_bytes(b"original source")
        self.other = Path(self.tmp.name) / "other.mp4"
        self.other.write_bytes(b"other original")
        self.s = R.ReelSession("variant_test", str(self.source), "auto", self.tmp.name,
            format="vertical", moments=[R.Moment(1, 3), R.Moment(5, 8, source=str(self.other), enabled=False)])
        self.original = Path(self.tmp.name) / "clips/clip_01.mp4"
        self.original.parent.mkdir()
        self.original.write_bytes(b"existing vertical clip")

    def fake_cut(self, source, work_dir, index, moment, format, logo):
        output = Path(work_dir) / f"clip_{index}.mp4"
        output.write_bytes(f"{source}:{moment.start}:{moment.end}:{format}:{logo}".encode())
        return str(output)

    def test_variant_uses_original_source_and_does_not_change_session_or_existing_export(self):
        before = asdict(self.s)
        with mock.patch.object(R, "_cut", side_effect=self.fake_cut) as cut, mock.patch.object(self.s, "save") as save:
            result = R.export_download(self.s, "horizontal", index=1)
        self.assertEqual(cut.call_args.args[0], str(self.source))
        self.assertEqual(cut.call_args.args[4], "horizontal")
        self.assertIn("horizontal", result["file_path"])
        self.assertEqual(asdict(self.s), before)
        save.assert_not_called()
        self.assertEqual(self.original.read_bytes(), b"existing vertical clip")

    def test_cache_is_separate_by_format_and_invalidated_by_trim_source_and_logo(self):
        with mock.patch.object(R, "_cut", side_effect=self.fake_cut) as cut:
            first = R.export_download(self.s, "horizontal", index=1)
            cached = R.export_download(self.s, "horizontal", index=1)
            self.assertEqual(first["file_path"], cached["file_path"])
            self.assertTrue(cached["cached"])
            self.assertEqual(cut.call_count, 1)
            vertical = R.export_download(self.s, "vertical", index=1)
            self.s.moments[0].start = 1.5
            trimmed = R.export_download(self.s, "horizontal", index=1)
            self.source.write_bytes(b"changed original content")
            changed = R.export_download(self.s, "horizontal", index=1)
            logo = Path(self.tmp.name) / "logo.png"
            logo.write_bytes(b"logo")
            self.s.logo = str(logo)
            branded = R.export_download(self.s, "horizontal", index=1)
            self.assertEqual(len({r["file_path"] for r in [first, vertical, trimmed, changed, branded]}), 5)

    def test_reel_includes_only_enabled_moments_but_excluded_clip_can_be_downloaded(self):
        def concat(files, output, work_dir):
            Path(output).write_bytes(b"reel")
        with mock.patch.object(R, "_cut", side_effect=self.fake_cut) as cut, mock.patch.object(R, "_concat_clips", side_effect=concat) as join:
            R.export_download(self.s, "horizontal")
            self.assertEqual(cut.call_count, 1)
            self.assertEqual(len(join.call_args.args[0]), 1)
            R.export_download(self.s, "horizontal", index=2)
            self.assertEqual(cut.call_args.args[0], str(self.other))

    def test_failed_render_never_publishes_a_partial_variant(self):
        def fail(*args):
            self.fake_cut(*args)
            raise RuntimeError("encoder failed")
        with mock.patch.object(R, "_cut", side_effect=fail):
            with self.assertRaisesRegex(RuntimeError, "encoder failed"):
                R.export_download(self.s, "horizontal", index=1)
        self.assertEqual(list((Path(self.tmp.name) / "downloads").rglob("*.mp4")), [])

    def test_invalid_selection_and_missing_source_are_clear_errors(self):
        for format, index in [("bogus", 1), ("horizontal", 0), ("horizontal", 3), ("horizontal", True)]:
            with self.subTest(format=format, index=index), self.assertRaises(ValueError):
                R.export_download(self.s, format, index=index)
        for m in self.s.moments:
            m.enabled = False
        with self.assertRaisesRegex(ValueError, "Include at least one"):
            R.export_download(self.s, "horizontal")
        self.source.unlink()
        with self.assertRaisesRegex(FileNotFoundError, "Original media is unavailable"):
            R.export_download(self.s, "horizontal", index=1)


if __name__ == "__main__":
    unittest.main()
