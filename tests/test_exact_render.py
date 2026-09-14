"""Exact-edit render contract (Writing Studio 1B.1).

Three layers:

- Planning/mapping helpers in services.exact_render, pure and fast.
- generate_clip(timing_mode="exact") against a stubbed FFmpeg pipeline:
  ordering, heuristics bypass, validation, verification failures, caption
  and bookend reporting, and the create_clip bridge. No media is encoded.
- Real renders of synthetic media (skipped without ffmpeg/ffprobe): every
  source second has its own colour, tone and word, so the decoded output
  proves which seconds were rendered, in what order, with which words.
"""

import copy
import hashlib
import io
import json
import math
import os
import shutil
import statistics
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_ROOT = os.path.join(ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from services import audiogram
from services import clip_generator as cg
from services import exact_render as er
from services import video_processor as vp

HAVE_FFMPEG = bool(shutil.which("ffmpeg") and shutil.which("ffprobe"))


def _words(count=8, speaker=True):
    return [
        {
            "word": f"w{i}",
            "start": i + 0.2,
            "end": i + 0.6,
            "confidence": 0.9,
            **({"speaker": f"S{i % 2}"} if speaker else {}),
        }
        for i in range(count)
    ]


def _exact_groups(output_dir, stem):
    """Exact output group directories for `stem` under `output_dir`, sorted."""
    return sorted(
        os.path.join(output_dir, name) for name in os.listdir(output_dir)
        if name.startswith(f"{stem}-") and os.path.isdir(os.path.join(output_dir, name))
    )


def _group_files(group):
    """{child: {name: bytes}} for a group directory; a complete group has only `final`."""
    return {
        child: {
            name: open(os.path.join(group, child, name), "rb").read()
            for name in sorted(os.listdir(os.path.join(group, child)))
        }
        for child in sorted(os.listdir(group))
    }


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------

class TimingModeTests(unittest.TestCase):
    def test_absent_and_legacy_mean_legacy(self):
        self.assertEqual(er.normalize_timing_mode(None), "legacy")
        self.assertEqual(er.normalize_timing_mode(""), "legacy")
        self.assertEqual(er.normalize_timing_mode("legacy"), "legacy")
        self.assertEqual(er.normalize_timing_mode("exact"), "exact")

    def test_unknown_modes_are_rejected(self):
        for value in ("EXACT", "precise", 1, True, ["exact"]):
            with self.subTest(value=value):
                with self.assertRaises(er.ExactRenderError):
                    er.normalize_timing_mode(value)


class SegmentValidationTests(unittest.TestCase):
    def test_supplied_order_is_kept_and_input_untouched(self):
        supplied = [{"start": 6, "end": 7, "note": "kept"}, {"start": 2, "end": 3}, {"start": 4, "end": 5}]
        snapshot = copy.deepcopy(supplied)
        out = er.validate_exact_segments(supplied, 8.0)
        self.assertEqual([(s["start"], s["end"]) for s in out], [(6.0, 7.0), (2.0, 3.0), (4.0, 5.0)])
        self.assertEqual(supplied, snapshot)
        for original, validated in zip(supplied, out):
            self.assertIsNot(original, validated)

    def test_interval_ending_at_the_probed_end_is_allowed(self):
        out = er.validate_exact_segments([{"start": 7.5, "end": 8.0}], 8.0)
        self.assertEqual(out, [{"start": 7.5, "end": 8.0}])

    def test_malformed_requests_are_rejected(self):
        bad = [
            None, [], "0-1", {"start": 0, "end": 1},
            [{"start": "1", "end": 2}], [{"start": 1}], [1, 2],
            [{"start": 1, "end": 1}], [{"start": 2, "end": 1}],
            [{"start": -0.5, "end": 1}], [{"start": 0, "end": 8.5}],
            [{"start": float("nan"), "end": 1}], [{"start": 0, "end": float("inf")}],
            [{"start": True, "end": 1}],
            [{"start": 0, "end": 1}, {"start": 3, "end": 2}],
        ]
        for value in bad:
            with self.subTest(value=value):
                with self.assertRaises(er.ExactRenderError):
                    er.validate_exact_segments(value, 8.0)

    def test_unprobed_source_duration_is_rejected(self):
        for duration in (0, 0.0, -1, float("nan"), None):
            with self.subTest(duration=duration):
                with self.assertRaises(er.ExactRenderError):
                    er.validate_exact_segments([{"start": 0, "end": 1}], duration)


class WordMappingTests(unittest.TestCase):
    def test_unavailable_is_distinct_from_empty(self):
        self.assertEqual(er.validate_exact_words(None), ("unavailable", None))
        self.assertEqual(er.validate_exact_words([]), ("supplied", []))

    def test_malformed_words_are_rejected(self):
        for value in ("words", [1], [{"word": "a"}], [{"word": "a", "start": 1, "end": 0.5}],
                      [{"word": "a", "start": float("nan"), "end": 1}]):
            with self.subTest(value=value):
                with self.assertRaises(er.ExactRenderError):
                    er.validate_exact_words(value)

    def test_words_follow_interval_order_and_are_clipped(self):
        words = _words() + [{"word": "straddle", "start": 2.9, "end": 3.3, "speaker": "S1"}]
        snapshot = copy.deepcopy(words)
        segments = [{"start": 6, "end": 7}, {"start": 2, "end": 3}, {"start": 4, "end": 5}]
        mapped = er.map_words_to_content(words, segments)
        self.assertEqual(
            [(w["word"], w["start"], w["end"]) for w in mapped],
            [("w6", 0.2, 0.6), ("w2", 1.2, 1.6), ("straddle", 1.9, 2.0), ("w4", 2.2, 2.6)],
        )
        self.assertEqual(mapped[0]["speaker"], "S0")
        self.assertEqual(mapped[1]["confidence"], 0.9)
        self.assertEqual(words, snapshot)
        self.assertEqual(er.content_text(mapped), "w6 w2 straddle w4")

    def test_one_interval_uses_the_same_mapping(self):
        mapped = er.map_words_to_content(_words(), [{"start": 3.5, "end": 5.5}])
        self.assertEqual(
            [(w["word"], w["start"], w["end"]) for w in mapped],
            [("w3", 0.0, 0.1), ("w4", 0.7, 1.1), ("w5", 1.7, 2.0)],
        )

    def test_excluded_words_never_return(self):
        mapped = er.map_words_to_content(_words(), [{"start": 2, "end": 3}])
        self.assertEqual([w["word"] for w in mapped], ["w2"])
        wider = er.map_words_to_content(_words(), [{"start": 1, "end": 4}])
        self.assertEqual([w["word"] for w in wider], ["w1", "w2", "w3"])

    def test_source_words_in_intervals_are_the_originals_once(self):
        words = _words()
        kept = er.words_in_intervals(words, [{"start": 2, "end": 3}, {"start": 2.5, "end": 3.5}])
        self.assertEqual([w["word"] for w in kept], ["w2", "w3"])
        self.assertEqual(kept[0], words[2])
        self.assertIsNot(kept[0], words[2])

    def test_content_intervals_are_cumulative(self):
        out = er.content_intervals([{"start": 6, "end": 7}, {"start": 2, "end": 3.5}])
        self.assertEqual(out[0]["content_start"], 0.0)
        self.assertEqual(out[0]["content_end"], 1.0)
        self.assertEqual(out[1]["content_start"], 1.0)
        self.assertEqual(out[1]["content_end"], 2.5)
        self.assertEqual(out[1]["source_start"], 2)


class KeyframeAndAssetTests(unittest.TestCase):
    def test_keyframes_are_content_relative_copies(self):
        supplied = [{"t": 0, "x_pct": 25}, {"t": 1.0, "x_pct": 75}]
        snapshot = copy.deepcopy(supplied)
        out = er.validate_exact_keyframes(supplied, 2.0)
        self.assertEqual(out, [{"t": 0.0, "x_pct": 25.0}, {"t": 1.0, "x_pct": 75.0}])
        self.assertEqual(supplied, snapshot)
        self.assertIsNone(er.validate_exact_keyframes(None, 2.0))

    def test_keyframes_outside_the_content_domain_are_rejected(self):
        for value in ([{"t": 2.5, "x_pct": 50}], [{"t": -0.1, "x_pct": 50}],
                      [{"t": 0, "x_pct": 120}], [{"t": "0", "x_pct": 50}], [{"x_pct": 50}], "kf"):
            with self.subTest(value=value):
                with self.assertRaises(er.ExactRenderError):
                    er.validate_exact_keyframes(value, 2.0)

    def test_assets_named_must_exist(self):
        self.assertIsNone(er.require_existing_asset(None, "logo_path"))
        self.assertIsNone(er.require_existing_asset("", "logo_path"))
        with self.assertRaises(er.ExactRenderError):
            er.require_existing_asset(os.path.join(tempfile.gettempdir(), "no-such-asset.png"), "logo_path")
        self.assertEqual(er.require_existing_asset(__file__, "logo_path"), __file__)


class MeasurementTests(unittest.TestCase):
    def _probe(self, **over):
        base = {
            "has_video": True, "has_audio": True, "width": 1080, "height": 1920, "fps": 25.0,
            "video_end": 3.0, "audio_end": 3.01, "duration": 3.01, "file_size_bytes": 10,
        }
        base.update(over)
        return base

    def test_tolerance_scales_with_cuts_and_joins(self):
        one = er.timing_tolerance(segment_count=1, source_fps=25.0, output_fps=25.0, bookend_count=0)
        three = er.timing_tolerance(segment_count=3, source_fps=25.0, output_fps=25.0, bookend_count=2)
        self.assertGreater(three["content_seconds"], one["content_seconds"])
        self.assertGreater(three["composition_seconds"], one["composition_seconds"])
        self.assertIn("25.0", one["basis"])

    def test_content_measurement_rejects_wrong_duration_lost_audio_and_desync(self):
        tol = er.timing_tolerance(segment_count=1, source_fps=25.0, output_fps=25.0, bookend_count=0)
        er.verify_content_measurement(requested=3.0, measured=self._probe(), tolerance=tol, source_has_audio=True)
        with self.assertRaises(er.ExactRenderVerificationError):
            er.verify_content_measurement(requested=2.0, measured=self._probe(), tolerance=tol, source_has_audio=True)
        with self.assertRaises(er.ExactRenderVerificationError):
            er.verify_content_measurement(
                requested=3.0, measured=self._probe(has_audio=False, audio_end=None), tolerance=tol,
                source_has_audio=True,
            )
        with self.assertRaises(er.ExactRenderVerificationError):
            er.verify_content_measurement(
                requested=3.0, measured=self._probe(audio_end=3.6), tolerance=tol, source_has_audio=True,
            )
        # A silent source is allowed to stay silent.
        er.verify_content_measurement(
            requested=3.0, measured=self._probe(has_audio=False, audio_end=None), tolerance=tol,
            source_has_audio=False,
        )

    def test_output_measurement_rejects_dims_duration_and_missing_video(self):
        tol = er.timing_tolerance(segment_count=1, source_fps=25.0, output_fps=25.0, bookend_count=0)
        er.verify_output_measurement(
            expected_duration=3.0, measured=self._probe(), tolerance=tol,
            source_has_audio=True, expected_dims=(1080, 1920),
        )
        with self.assertRaises(er.ExactRenderVerificationError):
            er.verify_output_measurement(
                expected_duration=3.0, measured=self._probe(width=1920, height=1080), tolerance=tol,
                source_has_audio=True, expected_dims=(1080, 1920),
            )
        with self.assertRaises(er.ExactRenderVerificationError):
            er.verify_output_measurement(
                expected_duration=4.0, measured=self._probe(), tolerance=tol,
                source_has_audio=True, expected_dims=(1080, 1920),
            )
        with self.assertRaises(er.ExactRenderVerificationError):
            er.verify_output_measurement(
                expected_duration=3.0, measured=self._probe(has_video=False), tolerance=tol,
                source_has_audio=True, expected_dims=(1080, 1920),
            )

    def test_probe_refuses_missing_and_empty_files(self):
        with self.assertRaises(er.ExactRenderVerificationError):
            er.probe_media(os.path.join(tempfile.gettempdir(), "no-such-render.mp4"))
        with tempfile.TemporaryDirectory() as td:
            empty = os.path.join(td, "empty.mp4")
            open(empty, "wb").close()
            with self.assertRaises(er.ExactRenderVerificationError):
                er.probe_media(empty)

    def test_probe_reads_streams_from_ffprobe_json(self):
        info = {
            "format": {"duration": "3.010000"},
            "streams": [
                {"codec_type": "video", "width": 1080, "height": 1920, "avg_frame_rate": "25/1",
                 "r_frame_rate": "25/1", "start_time": "0.040000", "duration": "2.960000"},
                {"codec_type": "audio", "start_time": "0.000000", "duration": "3.010000"},
            ],
        }
        with mock.patch.object(er, "get_video_info", return_value=info), \
             mock.patch.object(er.os.path, "isfile", return_value=True), \
             mock.patch.object(er.os.path, "getsize", return_value=42):
            probe = er.probe_media("x.mp4")
        self.assertEqual(probe["fps"], 25.0)
        self.assertAlmostEqual(probe["video_end"], 3.0)
        self.assertAlmostEqual(probe["audio_end"], 3.01)
        self.assertEqual(probe["duration"], 3.01)
        self.assertFalse(probe["frame_rate_variable"])

    def test_bookend_regions_describe_the_join(self):
        intro = er.bookend_region(
            kind="intro", output_start=0.0,
            report={"branch": "xfade_acrossfade", "requested_fade": 0.3, "applied_overlap": 0.3,
                    "main_duration": 1.0, "appended_duration": 3.0, "output_duration": 3.7},
        )
        self.assertEqual((intro["output_start"], intro["output_end"]), (0.0, 0.7))
        self.assertEqual(intro["transition"], {"output_start": 0.7, "output_end": 1.0})
        outro = er.bookend_region(
            kind="outro", output_start=3.7,
            report={"branch": "hardcut", "requested_fade": 0.3, "applied_overlap": 0.0,
                    "main_duration": 3.7, "appended_duration": 1.0, "output_duration": 4.7},
        )
        self.assertEqual((outro["output_start"], outro["output_end"]), (3.7, 4.7))
        self.assertEqual(outro["applied_overlap"], 0.0)


# ---------------------------------------------------------------------------
# generate_clip against a stubbed pipeline
# ---------------------------------------------------------------------------

class _StubPipeline:
    """Replace every FFmpeg-backed stage with a stub that writes a marker file.

    Probes answer from `probes`: the source, the normalized content, and the
    final composed file. Tests override entries to inject failures.
    """

    def __init__(self, tmp, *, content_seconds=3.0, source_seconds=8.0, source_audio=True,
                 out_dims=(1080, 1920), final_duration=None, content_probe=None, final_probe=None,
                 concat_report=None):
        self.tmp = tmp
        self.source = os.path.join(tmp, "source.mp4")
        with open(self.source, "wb") as f:
            f.write(b"source")
        self.calls = {"cut": [], "cut_single": [], "crop": [], "fit": [], "concat": [], "remotion": [],
                      "synchronized_only": []}
        self.probes = {
            "source": {
                "path": self.source, "file_size_bytes": 6, "duration": source_seconds,
                "has_video": True, "has_audio": source_audio, "width": 1920, "height": 1080,
                "fps": 25.0, "frame_rate_variable": False, "video_start": 0.0,
                "video_duration": source_seconds, "video_end": source_seconds,
                "audio_start": 0.0 if source_audio else None,
                "audio_duration": source_seconds if source_audio else None,
                "audio_end": source_seconds if source_audio else None,
            },
            "content": content_probe or {
                "path": "normalized.mp4", "file_size_bytes": 9, "duration": content_seconds,
                "has_video": True, "has_audio": source_audio, "width": out_dims[0], "height": out_dims[1],
                "fps": 25.0, "frame_rate_variable": False, "video_start": 0.0,
                "video_duration": content_seconds, "video_end": content_seconds,
                "audio_start": 0.0 if source_audio else None,
                "audio_duration": content_seconds if source_audio else None,
                "audio_end": content_seconds if source_audio else None,
            },
        }
        final_duration = content_seconds if final_duration is None else final_duration
        self.probes["final"] = final_probe or {
            **self.probes["content"], "path": "final.mp4", "duration": final_duration,
            "video_duration": final_duration, "video_end": final_duration,
            "audio_duration": final_duration if source_audio else None,
            "audio_end": final_duration if source_audio else None,
        }
        self.concat_report = concat_report or {
            "branch": "xfade_acrossfade", "applied_overlap": 0.3, "main_duration": 1.0,
            "appended_duration": content_seconds, "output_duration": content_seconds + 0.7,
        }
        self.patches = []

    def _touch(self, path):
        with open(path, "wb") as f:
            f.write(b"stub")
        return path

    def _probe(self, path):
        name = os.path.basename(path)
        if path == self.source:
            return dict(self.probes["source"])
        if name == "normalized.mp4":
            return dict(self.probes["content"])
        return {**self.probes["final"], "path": path}

    def __enter__(self):
        def cut_multi(video, out, segments):
            self.calls["cut"].append(copy.deepcopy(segments))
            return self._touch(out)

        def cut_single(video, out, start, end):
            self.calls["cut_single"].append((start, end))
            return self._touch(out)

        def crop(inp, out, **kw):
            self.calls["crop"].append(copy.deepcopy(kw))
            return self._touch(out)

        def fit(inp, out, **kw):
            self.calls["fit"].append(kw)
            return self._touch(out)

        def remotion(**kw):
            self.calls["remotion"].append(copy.deepcopy(kw.get("words")))
            self._touch(kw["output_path"])
            return True, None

        def concat(a, b, out, crossfade_duration=0.8, report=None, **kw):
            self.calls["concat"].append((os.path.basename(a), os.path.basename(b), crossfade_duration))
            self.calls["synchronized_only"].append(kw.get("synchronized_transitions_only", False))
            if report is not None:
                report.update({**self.concat_report, "requested_fade": crossfade_duration})
            return self._touch(out)

        self.patches = [
            mock.patch.object(cg, "cut_multi_segment", side_effect=cut_multi),
            mock.patch.object(cg, "cut_segment", side_effect=cut_single),
            mock.patch.object(cg, "crop_to_vertical", side_effect=crop),
            mock.patch.object(cg, "fit_to_frame", side_effect=fit),
            mock.patch.object(cg, "normalize_audio", side_effect=lambda i, o: shutil.copy(i, o)),
            mock.patch.object(cg, "concat_outro", side_effect=concat),
            mock.patch.object(cg, "_render_with_remotion", side_effect=remotion),
            mock.patch.object(cg, "render_captions", side_effect=lambda **kw: self._touch(kw["output_path"])),
            mock.patch.object(cg, "burn_captions", side_effect=lambda **kw: self._touch(kw["output_path"])),
            mock.patch.object(er, "probe_media", side_effect=self._probe),
            mock.patch.object(audiogram, "is_audio_only", return_value=False),
            mock.patch.object(vp, "get_dimensions", return_value=(1080, 1920)),
            mock.patch.object(vp, "scale_to_frame", side_effect=lambda i, o, w, h: self._touch(o)),
            mock.patch.object(cg, "_trim_weak_opening", wraps=cg._trim_weak_opening),
            mock.patch.object(cg, "_snap_to_sentence_end", wraps=cg._snap_to_sentence_end),
            mock.patch.object(cg, "_build_tight_segments", wraps=cg._build_tight_segments),
            mock.patch.object(cg, "_auto_fix_transition_jumps", return_value=False),
        ]
        self.mocks = [p.start() for p in self.patches]
        (self.trim, self.snap, self.tight, self.autofix) = self.mocks[-4:]
        return self

    def __exit__(self, *exc):
        for p in reversed(self.patches):
            p.stop()
        return False


class StubbedPipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="podcli-exact-stub-")
        self.out = os.path.join(self.tmp, "out")
        os.makedirs(self.out)
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        cg._reserved_output_paths.clear()
        self.addCleanup(cg._reserved_output_paths.clear)
        self._orig_remotion = cg._remotion_available
        cg._remotion_available = None
        self.addCleanup(setattr, cg, "_remotion_available", self._orig_remotion)

    def _render(self, pipe, **kw):
        params = dict(
            video_path=pipe.source, start_second=0, end_second=0, caption_style="hormozi",
            crop_strategy="center", format="vertical", title="exact stub", output_dir=self.out,
            timing_mode="exact", clean_fillers=False,
        )
        params.update(kw)
        return cg.generate_clip(**params)

    def _outputs(self):
        return sorted(os.listdir(self.out))

    def test_supplied_order_is_cut_and_no_heuristic_runs(self):
        segments = [{"start": 6, "end": 7}, {"start": 2, "end": 3}, {"start": 4, "end": 5}]
        words = _words()
        seg_snapshot, word_snapshot = copy.deepcopy(segments), copy.deepcopy(words)
        with _StubPipeline(self.tmp, content_seconds=3.0) as pipe:
            out = self._render(pipe, keep_segments=segments, transcript_words=words,
                               trim_opening=True, preserve_timing=False)
            self.assertEqual(pipe.calls["cut"], [[{"start": 6.0, "end": 7.0}, {"start": 2.0, "end": 3.0},
                                                  {"start": 4.0, "end": 5.0}]])
            self.assertEqual(pipe.calls["cut_single"], [])
            pipe.trim.assert_not_called()
            pipe.snap.assert_not_called()
            pipe.tight.assert_not_called()
            pipe.autofix.assert_not_called()
            # The cropper sees content-relative words from t=0.
            self.assertEqual(pipe.calls["crop"][0]["clip_start"], 0)
            self.assertEqual([w["word"] for w in pipe.calls["crop"][0]["transcript_words"]], ["w6", "w2", "w4"])
            self.assertEqual([w["start"] for w in pipe.calls["remotion"][0]], [0.2, 1.2, 2.2])
        self.assertEqual(segments, seg_snapshot)
        self.assertEqual(words, word_snapshot)
        self.assertEqual(out["timing_mode"], "exact")
        self.assertEqual(out["duration"], 3.0)
        self.assertEqual((out["start_second"], out["end_second"]), (2.0, 7.0))
        tl = out["render_timeline"]
        self.assertEqual(tl["version"], 1)
        self.assertEqual([(s["source_start"], s["content_start"]) for s in tl["segments"]],
                         [(6.0, 0.0), (2.0, 1.0), (4.0, 2.0)])
        self.assertEqual(tl["words"]["content_text"], "w6 w2 w4")
        self.assertEqual(tl["words"]["input"], "supplied")
        self.assertEqual([w["word"] for w in tl["words"]["source"]], ["w2", "w4", "w6"])
        self.assertEqual(tl["captions"]["rendered"], True)
        self.assertEqual(tl["captions"]["renderer"], "remotion")
        self.assertFalse(tl["thumbnail_card"]["applied"])
        self.assertEqual(tl["framing"]["crop_keyframes"]["time_domain"], "content")
        self.assertIn("transition_autofix", tl["heuristics_disabled"])
        self.assertTrue(os.path.isfile(out["output_path"]))
        self.assertEqual(tl["output"]["path"], out["output_path"])

    def test_legacy_default_still_sorts_snaps_and_omits_the_timeline(self):
        segments = [{"start": 6, "end": 7}, {"start": 2, "end": 3}]
        with _StubPipeline(self.tmp) as pipe:
            out = self._render(pipe, timing_mode=None, keep_segments=segments,
                               transcript_words=_words(), start_second=2, end_second=7)
            self.assertEqual(pipe.calls["cut"], [[{"start": 2, "end": 3}, {"start": 6, "end": 7}]])
            pipe.snap.assert_called()
        self.assertNotIn("render_timeline", out)
        self.assertNotIn("timing_mode", out)
        # Legacy mutates its own copy of the list order; the caller's list is
        # sorted in place today and that behaviour is deliberately untouched.
        self.assertEqual(out["duration"], 2.0)

    def test_single_interval_takes_the_same_road(self):
        with _StubPipeline(self.tmp, content_seconds=2.0) as pipe:
            out = self._render(pipe, keep_segments=[{"start": 3.5, "end": 5.5}], transcript_words=_words())
            self.assertEqual(pipe.calls["cut"], [[{"start": 3.5, "end": 5.5}]])
            self.assertEqual(pipe.calls["cut_single"], [])
        self.assertEqual([(w["word"], w["start"], w["end"]) for w in out["render_timeline"]["words"]["content"]],
                         [("w3", 0.0, 0.1), ("w4", 0.7, 1.1), ("w5", 1.7, 2.0)])

    def test_invalid_request_is_rejected_before_any_stage_runs(self):
        cases = [
            dict(keep_segments=[]),
            dict(keep_segments=None),
            dict(keep_segments=[{"start": 7.5, "end": 9.0}]),
            dict(keep_segments=[{"start": 1, "end": 2}], crop_keyframes=[{"t": 1.5, "x_pct": 50}]),
            dict(keep_segments=[{"start": 1, "end": 2}], transcript_words="nope"),
            dict(keep_segments=[{"start": 1, "end": 2}], intro_path=os.path.join(self.tmp, "missing-intro.mp4")),
            dict(keep_segments=[{"start": 1, "end": 2}], logo_path=os.path.join(self.tmp, "missing-logo.png")),
            dict(keep_segments=[{"start": 1, "end": 2}], bookend_fade=-1),
            dict(keep_segments=[{"start": 1, "end": 2}], timing_mode="precise"),
        ]
        for case in cases:
            with self.subTest(case=case):
                with _StubPipeline(self.tmp) as pipe:
                    with self.assertRaises(ValueError):
                        self._render(pipe, **case)
                    self.assertEqual(pipe.calls["cut"], [])
                    self.assertEqual(pipe.calls["cut_single"], [])
                self.assertEqual(self._outputs(), [])

    def test_audio_only_source_is_refused_in_exact_mode(self):
        with _StubPipeline(self.tmp) as pipe:
            with mock.patch.object(audiogram, "is_audio_only", return_value=True), \
                 mock.patch.object(audiogram, "render_audiogram") as render:
                with self.assertRaises(er.ExactRenderError):
                    self._render(pipe, keep_segments=[{"start": 1, "end": 2}])
                render.assert_not_called()
                # The legacy road is still open for the same file.
                render.return_value = {"output_path": "x"}
                cg.generate_clip(video_path=pipe.source, start_second=0, end_second=3)
                render.assert_called_once()

    def test_verification_failure_returns_no_receipt_and_no_output(self):
        # Without bookends the composed file is the normalized file itself,
        # so the wrong dimensions are injected into that probe.
        with _StubPipeline(self.tmp, content_seconds=3.0) as pipe:
            pipe.probes["content"].update(width=1920, height=1080)
            with self.assertRaises(er.ExactRenderVerificationError):
                self._render(pipe, keep_segments=[{"start": 1, "end": 4}])
        self.assertEqual(self._outputs(), [])
        intro = os.path.join(self.tmp, "intro.mp4")
        with open(intro, "wb") as f:
            f.write(b"bookend")
        no_video = dict(has_video=False, has_audio=True, width=None, height=None, fps=None,
                        frame_rate_variable=False, duration=3.7, video_end=None, audio_end=3.7,
                        video_start=None, audio_start=0.0, video_duration=None, audio_duration=3.7,
                        file_size_bytes=9, path="final.mp4")
        with _StubPipeline(self.tmp, content_seconds=3.0, final_probe=no_video) as pipe:
            with self.assertRaises(er.ExactRenderVerificationError):
                self._render(pipe, keep_segments=[{"start": 1, "end": 4}], intro_path=intro, bookend_fade=0.3)
        self.assertEqual(self._outputs(), [])

    def test_content_that_does_not_match_the_request_is_a_failure(self):
        with _StubPipeline(self.tmp, content_seconds=3.0) as pipe:
            with self.assertRaises(er.ExactRenderVerificationError):
                self._render(pipe, keep_segments=[{"start": 1, "end": 2}])
        self.assertEqual(self._outputs(), [])

    def test_audio_video_disagreement_is_a_failure(self):
        with _StubPipeline(self.tmp, content_seconds=3.0) as pipe:
            pipe.probes["content"]["audio_end"] = 3.9
            with self.assertRaises(er.ExactRenderVerificationError):
                self._render(pipe, keep_segments=[{"start": 1, "end": 4}])
        self.assertEqual(self._outputs(), [])

    def test_lost_audio_is_a_failure_but_a_silent_source_is_reported(self):
        with _StubPipeline(self.tmp, content_seconds=1.0) as pipe:
            pipe.probes["content"].update(has_audio=False, audio_end=None)
            with self.assertRaises(er.ExactRenderVerificationError):
                self._render(pipe, keep_segments=[{"start": 1, "end": 2}])
        with _StubPipeline(self.tmp, content_seconds=1.0, source_audio=False) as pipe:
            out = self._render(pipe, keep_segments=[{"start": 1, "end": 2}])
        self.assertFalse(out["render_timeline"]["output"]["has_audio"])
        self.assertIsNone(out["render_timeline"]["output"]["audio_duration"])
        self.assertFalse(out["render_timeline"]["source"]["has_audio"])

    def test_caption_state_is_reported_truthfully(self):
        with _StubPipeline(self.tmp, content_seconds=1.0) as pipe:
            unavailable = self._render(pipe, keep_segments=[{"start": 1, "end": 2}], transcript_words=None)
            empty = self._render(pipe, keep_segments=[{"start": 1, "end": 2}], transcript_words=[])
            words = _words() + [{"word": "um", "start": 1.65, "end": 1.7}]
            drawn = self._render(pipe, keep_segments=[{"start": 1, "end": 2}], transcript_words=words,
                                 clean_fillers=True)
            off = self._render(pipe, keep_segments=[{"start": 1, "end": 2}], transcript_words=_words(),
                               captions=False)
        for out, expected_input in ((unavailable, "unavailable"), (empty, "supplied")):
            tl = out["render_timeline"]
            self.assertEqual(tl["words"]["input"], expected_input)
            self.assertFalse(tl["captions"]["rendered"])
            self.assertIsNone(tl["captions"]["renderer"])
            self.assertTrue(tl["captions"]["unavailable_reason"])
            self.assertEqual(tl["captions"]["words"], [])
        self.assertIsNone(unavailable["render_timeline"]["words"]["source"])
        self.assertEqual(empty["render_timeline"]["words"]["source"], [])
        tl = drawn["render_timeline"]
        self.assertTrue(tl["captions"]["rendered"])
        self.assertEqual(tl["captions"]["renderer"], "remotion")
        self.assertEqual([w["word"] for w in tl["words"]["content"]], ["w1", "um"])
        self.assertEqual([w["word"] for w in tl["captions"]["words"]], ["w1"])
        self.assertEqual(tl["words"]["content_text"], "w1 um")
        self.assertTrue(tl["captions"]["filler_cleaning"])
        self.assertFalse(off["render_timeline"]["captions"]["rendered"])
        self.assertFalse(off["render_timeline"]["captions"]["requested"])

    def test_keyframes_and_framing_reach_the_cropper_in_content_time(self):
        keyframes = [{"t": 0, "x_pct": 25}, {"t": 1.0, "x_pct": 75}]
        snapshot = copy.deepcopy(keyframes)
        with _StubPipeline(self.tmp, content_seconds=2.0) as pipe:
            out = self._render(pipe, keep_segments=[{"start": 3, "end": 5}], crop_strategy="manual",
                               crop_keyframes=keyframes)
            self.assertEqual(pipe.calls["crop"][0]["crop_keyframes"], [{"t": 0.0, "x_pct": 25.0}, {"t": 1.0, "x_pct": 75.0}])
            self.assertEqual(pipe.calls["crop"][0]["strategy"], "manual")
        self.assertEqual(keyframes, snapshot)
        self.assertEqual(out["render_timeline"]["framing"]["crop_keyframes"]["keyframes"],
                         [{"t": 0.0, "x_pct": 25.0}, {"t": 1.0, "x_pct": 75.0}])

    def test_bookends_report_the_helper_branch_not_the_request(self):
        intro = os.path.join(self.tmp, "intro.mp4")
        outro = os.path.join(self.tmp, "outro.mp4")
        for p in (intro, outro):
            with open(p, "wb") as f:
                f.write(b"bookend")
        report = {"branch": "hardcut_soft_audio", "applied_overlap": 0.0, "main_duration": 1.0,
                  "appended_duration": 1.0, "output_duration": 5.0}
        with _StubPipeline(self.tmp, content_seconds=3.0, final_duration=5.0, concat_report=report) as pipe:
            out = self._render(pipe, keep_segments=[{"start": 1, "end": 4}], intro_path=intro, outro_path=outro,
                               bookend_fade=0.3)
            self.assertEqual([c[2] for c in pipe.calls["concat"]], [0.3, 0.3])
        tl = out["render_timeline"]
        self.assertEqual(tl["bookends"]["requested_fade"], 0.3)
        self.assertEqual(tl["bookends"]["intro"]["branch"], "hardcut_soft_audio")
        self.assertEqual(tl["bookends"]["intro"]["applied_overlap"], 0.0)
        self.assertEqual(tl["bookends"]["intro"]["requested_fade"], 0.3)
        self.assertEqual(tl["content_to_output_offset"], 1.0)
        self.assertEqual(tl["bookends"]["outro"]["output_start"], 4.0)
        self.assertEqual(tl["output_duration"], 5.0)

    def test_output_that_does_not_add_up_with_bookends_is_a_failure(self):
        intro = os.path.join(self.tmp, "intro.mp4")
        with open(intro, "wb") as f:
            f.write(b"bookend")
        report = {"branch": "xfade_acrossfade", "applied_overlap": 0.3, "main_duration": 1.0,
                  "appended_duration": 3.0, "output_duration": 3.7}
        # Final probe says 5.0 s where the helper's own report adds up to 3.7 s.
        with _StubPipeline(self.tmp, content_seconds=3.0, final_duration=5.0, concat_report=report) as pipe:
            with self.assertRaises(er.ExactRenderVerificationError):
                self._render(pipe, keep_segments=[{"start": 1, "end": 4}], intro_path=intro, bookend_fade=0.3)
        self.assertEqual(self._outputs(), [])

    def test_mismatched_transition_branch_is_refused_inside_tolerance(self):
        # The helper's xfade_audio_concat branch overlaps the video by the
        # fade but joins the audio end to end. With a 0.1 s fade the two
        # streams disagree by 0.1 s, inside the 0.1264 s numeric tolerance,
        # so only a semantic check can refuse it. Intro and outro are each
        # checked on their own.
        intro = os.path.join(self.tmp, "intro.mp4")
        outro = os.path.join(self.tmp, "outro.mp4")
        for p in (intro, outro):
            with open(p, "wb") as f:
                f.write(b"bookend")
        mismatched = {"branch": "xfade_audio_concat", "applied_overlap": 0.1, "main_duration": 1.0,
                      "appended_duration": 3.0, "output_duration": 4.0}
        for label, bookend in (("intro", {"intro_path": intro}), ("outro", {"outro_path": outro})):
            with self.subTest(bookend=label):
                report = dict(mismatched)
                if label == "outro":
                    report.update(main_duration=3.0, appended_duration=1.0)
                with _StubPipeline(self.tmp, content_seconds=3.0, final_duration=4.0, concat_report=report) as pipe:
                    pipe.probes["final"].update(video_duration=3.9, video_end=3.9, audio_duration=4.0, audio_end=4.0)
                    with self.assertRaises(er.ExactRenderVerificationError) as ctx:
                        self._render(pipe, keep_segments=[{"start": 1, "end": 4}], bookend_fade=0.1, **bookend)
                    self.assertEqual(pipe.calls["synchronized_only"], [True])
                self.assertIn("xfade_audio_concat", str(ctx.exception))
                self.assertIn(label, str(ctx.exception))
                self.assertEqual(self._outputs(), [])
        # Control: the same numbers with both streams crossfaded are a valid
        # receipt, so the refusal above is about the branch, not the durations.
        synchronized = {**mismatched, "branch": "xfade_acrossfade", "output_duration": 3.9}
        with _StubPipeline(self.tmp, content_seconds=3.0, final_duration=3.9, concat_report=synchronized) as pipe:
            out = self._render(pipe, keep_segments=[{"start": 1, "end": 4}], intro_path=intro, bookend_fade=0.1)
        self.assertEqual(out["render_timeline"]["bookends"]["intro"]["branch"], "xfade_acrossfade")
        self.assertEqual(out["render_timeline"]["content_to_output_offset"], 0.9)
        groups = _exact_groups(self.out, "exact_stub_short")
        self.assertEqual(self._outputs(), [os.path.basename(g) for g in groups])
        self.assertEqual(_group_files(groups[0]), {"final": {"exact_stub_short.mp4": b"stub"}})
        self.assertEqual(out["output_path"], os.path.join(groups[0], "final", "exact_stub_short.mp4"))

    def test_legacy_mode_keeps_the_helper_fallback_order(self):
        outro = os.path.join(self.tmp, "outro.mp4")
        with open(outro, "wb") as f:
            f.write(b"bookend")
        with _StubPipeline(self.tmp) as pipe:
            cg.generate_clip(video_path=pipe.source, start_second=2, end_second=3, caption_style="hormozi",
                             crop_strategy="center", format="vertical", title="legacy stub", output_dir=self.out,
                             outro_path=outro, bookend_fade=0.3)
            self.assertEqual(pipe.calls["synchronized_only"], [False])

    def test_staging_is_size_checked_and_removes_its_partial_copy(self):
        verified = os.path.join(self.tmp, "verified.mp4")
        staged = os.path.join(self.out, "staged.mp4")
        with open(verified, "wb") as f:
            f.write(b"x" * 100)
        with mock.patch.object(cg.os.path, "getsize", side_effect=lambda p: 100 if p == verified else 50):
            with self.assertRaises(er.ExactRenderVerificationError):
                cg._stage_verified_copy(verified, staged)
        self.assertEqual(self._outputs(), [])
        self.assertEqual(cg._stage_verified_copy(verified, staged), 100)
        with open(staged, "rb") as f:
            self.assertEqual(f.read(), b"x" * 100)

    def test_output_groups_are_exclusive_and_publish_by_one_rename(self):
        first = cg._ExactOutputGroup.create(self.out, "clip_short")
        second = cg._ExactOutputGroup.create(self.out, "clip_short")
        self.assertNotEqual(first.parent, second.parent)
        for group in (first, second):
            self.assertTrue(os.path.isdir(group.staging_dir))
            self.assertFalse(os.path.exists(group.final_dir))
            self.assertEqual(os.path.dirname(group.parent), self.out)
            self.assertTrue(os.path.basename(group.parent).startswith("clip_short-"))
        with open(first.staged_path("clip_short.mp4"), "wb") as f:
            f.write(b"main")
        first.publish()
        self.assertEqual(_group_files(first.parent), {"final": {"clip_short.mp4": b"main"}})
        self.assertEqual(first.final_path("clip_short.mp4"), os.path.join(first.parent, "final", "clip_short.mp4"))
        # A second publication of the same group cannot replace what it published.
        os.mkdir(first.staging_dir)
        with self.assertRaises(FileExistsError):
            first.publish()
        self.assertEqual(_group_files(first.parent)["final"], {"clip_short.mp4": b"main"})
        # Discarding an unpublished group removes only that group and reports a
        # denied removal instead of claiming it clean.
        error = OSError("publication failed")
        self.assertEqual(second.discard(error), [])
        self.assertFalse(os.path.exists(second.parent))
        self.assertTrue(os.path.isdir(first.parent))
        third = cg._ExactOutputGroup.create(self.out, "clip_short")
        with open(third.staged_path("clip_short.mp4"), "wb") as f:
            f.write(b"stuck")
        with mock.patch.object(cg.shutil, "rmtree", side_effect=lambda path, **kw: None):
            residual = third.discard(error)
        self.assertEqual(residual, [third.parent, third.staged_path("clip_short.mp4")])
        self.assertTrue(any("Residual" in note and third.parent in note for note in error.__notes__))
        self.assertTrue(os.path.isfile(third.staged_path("clip_short.mp4")))

    def test_exclusive_creation_retries_a_taken_name_and_then_gives_up(self):
        taken = []
        real_mkdir = os.mkdir

        def mkdir(path, *a, **kw):
            if os.path.dirname(path) == self.out:
                taken.append(path)
                raise FileExistsError(path)
            return real_mkdir(path, *a, **kw)

        with mock.patch.object(cg.os, "mkdir", side_effect=mkdir):
            with self.assertRaises(er.ExactRenderVerificationError):
                cg._ExactOutputGroup.create(self.out, "clip_short", attempts=3)
        self.assertEqual(len(taken), 3)
        self.assertEqual(len(set(taken)), 3)
        self.assertEqual(self._outputs(), [])

    def test_setup_failure_after_exclusive_creation_cleans_only_the_acquired_parent(self):
        # R4 / WS-11: the parent is acquired, then staging cannot be created.
        # The earlier same-title group was not acquired by this operation and
        # must never be handed to cleanup.
        earlier = cg._ExactOutputGroup.create(self.out, "clip_short")
        with open(earlier.staged_path("clip_short.mp4"), "wb") as f:
            f.write(b"main")
        earlier.publish()
        real_mkdir = os.mkdir
        real_rmtree = shutil.rmtree
        acquired, removed = [], []

        def mkdir(path, *a, **kw):
            if os.path.basename(path) == cg._ExactOutputGroup.STAGING:
                raise PermissionError("injected: staging directory cannot be created")
            real_mkdir(path, *a, **kw)
            if os.path.dirname(path) == self.out:
                acquired.append(path)

        def rmtree(path, *a, **kw):
            removed.append(path)
            return real_rmtree(path, *a, **kw)

        # Cleanup allowed: the original error surfaces without a residual note,
        # exactly the acquired parent is removed, the earlier group is intact.
        with mock.patch.object(cg.os, "mkdir", side_effect=mkdir), \
             mock.patch.object(cg.shutil, "rmtree", side_effect=rmtree):
            with self.assertRaises(PermissionError) as ctx:
                cg._ExactOutputGroup.create(self.out, "clip_short")
        self.assertIn("injected", str(ctx.exception))
        self.assertFalse(getattr(ctx.exception, "__notes__", None))
        self.assertEqual(len(acquired), 1)
        self.assertEqual(removed, acquired)
        self.assertEqual(self._outputs(), [os.path.basename(earlier.parent)])
        self.assertEqual(_group_files(earlier.parent), {"final": {"clip_short.mp4": b"main"}})

        # Cleanup denied: the same error carries the residual, which is the
        # empty owned parent; nothing else is touched or claimed clean.
        acquired.clear()
        removed.clear()
        with mock.patch.object(cg.os, "mkdir", side_effect=mkdir), \
             mock.patch.object(cg.shutil, "rmtree", side_effect=lambda path, **kw: removed.append(path)):
            with self.assertRaises(PermissionError) as ctx:
                cg._ExactOutputGroup.create(self.out, "clip_short")
        self.assertIn("injected", str(ctx.exception))
        (residual,) = acquired
        self.assertEqual(removed, [residual])
        (note,) = ctx.exception.__notes__
        self.assertIn("could not remove", note)
        self.assertIn(residual, note)
        self.assertEqual(os.listdir(residual), [])
        self.assertEqual(self._outputs(), sorted([os.path.basename(earlier.parent), os.path.basename(residual)]))
        self.assertEqual(_group_files(earlier.parent), {"final": {"clip_short.mp4": b"main"}})

    def test_a_parent_that_was_not_acquired_is_never_cleaned(self):
        # Parent creation fails for a reason other than a taken name: nothing
        # was acquired, so nothing is removed and no residual is reported.
        earlier = cg._ExactOutputGroup.create(self.out, "clip_short")
        earlier.publish()
        real_mkdir = os.mkdir
        removed = []

        def mkdir(path, *a, **kw):
            if os.path.dirname(path) == self.out:
                raise PermissionError("injected: output root is read-only")
            return real_mkdir(path, *a, **kw)

        with mock.patch.object(cg.os, "mkdir", side_effect=mkdir), \
             mock.patch.object(cg.shutil, "rmtree", side_effect=lambda path, **kw: removed.append(path)):
            with self.assertRaises(PermissionError) as ctx:
                cg._ExactOutputGroup.create(self.out, "clip_short")
        self.assertIn("injected", str(ctx.exception))
        self.assertFalse(getattr(ctx.exception, "__notes__", None))
        self.assertEqual(removed, [])
        self.assertEqual(self._outputs(), [os.path.basename(earlier.parent)])
        self.assertEqual(_group_files(earlier.parent), {"final": {}})


_CHILD_RENDER_SCRIPT = r'''
"""Child process for the cross-process and interruption publication tests.

argv: repo root, tests dir, output root, private tmp dir, mode ("publish" or
"interrupt"). Renders one stubbed exact operation titled "overlay" with the
caption overlay kept. In "interrupt" mode the process dies with os._exit(7)
the instant the publication rename is requested, i.e. immediately before the
boundary, so the parent can inspect what such a death leaves behind.
"""
import json
import os
import sys
from unittest import mock

root, tests_dir, out_dir, tmp_dir, mode = sys.argv[1:6]
sys.path[:0] = [os.path.join(root, "backend"), tests_dir]
from test_exact_render import _StubPipeline, cg


def render_overlay(**kw):
    with open(kw["output_path"], "wb") as f:
        f.write(b"video")
    overlay = kw["output_path"] + ".mov"
    with open(overlay, "wb") as f:
        f.write(b"overlay")
    return True, overlay


patches = [mock.patch.object(cg, "_render_with_remotion", side_effect=render_overlay)]
if mode == "interrupt":
    real_rename = os.rename

    def rename(src, dst):
        if os.path.basename(dst) == cg._ExactOutputGroup.FINAL:
            os._exit(7)
        return real_rename(src, dst)

    patches.append(mock.patch.object(cg.os, "rename", side_effect=rename))
cg._remotion_available = None
with _StubPipeline(tmp_dir, content_seconds=3.0) as pipe:
    for patch in patches:
        patch.start()
    try:
        out = cg.generate_clip(
            video_path=pipe.source, start_second=0, end_second=0, timing_mode="exact",
            keep_segments=[{"start": 1, "end": 4}], transcript_words=[{"word": "yes", "start": 2.0, "end": 2.5}],
            keep_caption_overlay=True, crop_strategy="center", format="vertical", clean_fillers=False,
            output_dir=out_dir, title="overlay",
        )
    finally:
        for patch in patches:
            patch.stop()
print(json.dumps({key: out[key] for key in ("output_path", "caption_overlay_path", "cropped_source_path")}))
'''


class ExactPublicationTests(unittest.TestCase):
    """The whole exact operation, sidecars included, is published or it is not.

    Every exact operation owns a new group directory; a caller that asked
    for the caption overlay gets the main file, the overlay and the cropped
    source together inside that group's `final` directory. Nothing that
    existed before (a flat legacy output or an earlier group of the same
    title) is ever renamed, replaced or deleted, whatever fails. Render
    bytes are stubbed; the directories, copies, renames and processes are
    real.
    """

    STEM = "overlay_short"
    NAMES = ("overlay_short.mp4", "overlay_short_captions.mov", "overlay_short_source.mp4")
    FLAT_PRIOR = {"overlay_short.mp4": b"prior main", "overlay_short_captions.mov": b"prior overlay",
                  "overlay_short_source.mp4": b"prior source"}
    NEW = {"overlay_short.mp4": b"video", "overlay_short_captions.mov": b"overlay", "overlay_short_source.mp4": b"stub"}

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="podcli-exact-publish-")
        self.out = os.path.join(self.tmp, "out")
        os.makedirs(self.out)
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        cg._reserved_output_paths.clear()
        self.addCleanup(cg._reserved_output_paths.clear)
        self._orig_remotion = cg._remotion_available
        cg._remotion_available = None
        self.addCleanup(setattr, cg, "_remotion_available", self._orig_remotion)
        self.work_dirs = []
        real_mkdtemp = tempfile.mkdtemp
        patcher = mock.patch.object(cg.tempfile, "mkdtemp",
                                    side_effect=lambda **kw: self.work_dirs.append(real_mkdtemp(**kw)) or self.work_dirs[-1])
        patcher.start()
        self.addCleanup(patcher.stop)
        # Exact mode must not lean on the legacy in-process reservation set:
        # any call to it during an exact render is a test failure.
        reserve = mock.patch.object(cg, "_reserve_output_path",
                                    side_effect=AssertionError("exact mode consulted the reservation set"))
        reserve.start()
        self.addCleanup(reserve.stop)
        self.prior_group = None

    # -- helpers -----------------------------------------------------------

    def _path(self, name):
        return os.path.join(self.out, name)

    def _write_prior(self):
        """A flat legacy trio and one earlier exact group of the same title."""
        for name, data in self.FLAT_PRIOR.items():
            with open(self._path(name), "wb") as f:
                f.write(data)
        with _StubPipeline(self.tmp, content_seconds=3.0) as pipe:
            earlier = self._render(pipe)
        (self.prior_group,) = _exact_groups(self.out, self.STEM)
        self.assertEqual(os.path.dirname(earlier["output_path"]), os.path.join(self.prior_group, "final"))
        self.prior_group_files = _group_files(self.prior_group)
        self.assertEqual(self.prior_group_files, {"final": dict(self.NEW)})

    def _render(self, pipe, progress_callback=None, title="overlay"):
        def render_overlay(**kw):
            with open(kw["output_path"], "wb") as f:
                f.write(b"video")
            overlay = kw["output_path"] + ".mov"
            with open(overlay, "wb") as f:
                f.write(b"overlay")
            return True, overlay

        with mock.patch.object(cg, "_render_with_remotion", side_effect=render_overlay):
            return cg.generate_clip(
                video_path=pipe.source, start_second=0, end_second=0, timing_mode="exact",
                keep_segments=[{"start": 1, "end": 4}], transcript_words=[{"word": "yes", "start": 2.0, "end": 2.5}],
                keep_caption_overlay=True, crop_strategy="center", format="vertical", clean_fillers=False,
                output_dir=self.out, title=title, progress_callback=progress_callback,
            )

    def _assert_work_dirs_gone(self):
        for work_dir in self.work_dirs:
            self.assertFalse(os.path.exists(work_dir), work_dir)

    def _assert_prior_intact(self, prior_exists):
        """Earlier flat files and the earlier group are byte-identical at their paths."""
        flat = {name: open(self._path(name), "rb").read() for name in self.NAMES if os.path.exists(self._path(name))}
        if prior_exists:
            self.assertEqual(flat, self.FLAT_PRIOR)
            self.assertEqual(_group_files(self.prior_group), self.prior_group_files)
        else:
            self.assertEqual(flat, {})
            self.assertIsNone(self.prior_group)

    def _assert_complete_group(self, out, group):
        self.assertEqual(_group_files(group), {"final": dict(self.NEW)})
        final = os.path.join(group, "final")
        self.assertEqual(out["output_path"], os.path.join(final, "overlay_short.mp4"))
        self.assertEqual(out["caption_overlay_path"], os.path.join(final, "overlay_short_captions.mov"))
        self.assertEqual(out["cropped_source_path"], os.path.join(final, "overlay_short_source.mp4"))
        self.assertEqual(out["render_timeline"]["output"]["path"], out["output_path"])
        self.assertEqual(out["file_size_mb"], round(len(b"video") / (1024 * 1024), 2))
        for path in (out["output_path"], out["caption_overlay_path"], out["cropped_source_path"]):
            self.assertTrue(os.path.isfile(path), path)

    def _run_child(self, mode, tmp_name):
        script = os.path.join(self.tmp, "child_render.py")
        if not os.path.exists(script):
            with open(script, "w", encoding="utf-8") as f:
                f.write(_CHILD_RENDER_SCRIPT)
        child_tmp = os.path.join(self.tmp, tmp_name)
        os.makedirs(child_tmp)
        return subprocess.Popen(
            [sys.executable, script, ROOT, os.path.dirname(os.path.abspath(__file__)), self.out, child_tmp, mode],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )

    # -- tests -------------------------------------------------------------

    def test_success_publishes_a_new_complete_group_beside_earlier_outputs(self):
        for prior_exists in (True, False):
            with self.subTest(prior_exists=prior_exists):
                shutil.rmtree(self.out)
                os.makedirs(self.out)
                self.prior_group = None
                if prior_exists:
                    self._write_prior()
                with _StubPipeline(self.tmp, content_seconds=3.0) as pipe:
                    out = self._render(pipe)
                groups = _exact_groups(self.out, self.STEM)
                self.assertEqual(len(groups), 2 if prior_exists else 1)
                (new_group,) = [g for g in groups if g != self.prior_group]
                self._assert_complete_group(out, new_group)
                self._assert_prior_intact(prior_exists)
                self._assert_work_dirs_gone()
                expected = set(os.path.basename(g) for g in groups) | (set(self.NAMES) if prior_exists else set())
                self.assertEqual(set(os.listdir(self.out)), expected)

    def test_failures_before_or_at_publication_leave_earlier_outputs_and_no_group(self):
        real_copy2 = shutil.copy2
        real_rename = os.rename

        def copy_failure_for(name):
            def copy2(src, dst, *a, **kw):
                if os.path.basename(str(dst)) == name and os.path.basename(os.path.dirname(str(dst))) == "staging":
                    raise OSError(f"injected copy failure for {name}")
                return real_copy2(src, dst, *a, **kw)
            return copy2

        def persistent_rename_failure(src, dst):
            # The destination stays unavailable for the whole operation: every
            # attempt to publish fails, not just the first.
            if os.path.basename(dst) == cg._ExactOutputGroup.FINAL:
                raise PermissionError("injected: destination remains unavailable")
            return real_rename(src, dst)

        schedules = [
            ("overlay copy", lambda: mock.patch.object(cg.shutil, "copy2", side_effect=copy_failure_for("overlay_short_captions.mov"))),
            ("cropped-source copy", lambda: mock.patch.object(cg.shutil, "copy2", side_effect=copy_failure_for("overlay_short_source.mp4"))),
            ("main staging copy", lambda: mock.patch.object(cg.shutil, "copy2", side_effect=copy_failure_for("overlay_short.mp4"))),
            ("persistent publication rename", lambda: mock.patch.object(cg.os, "rename", side_effect=persistent_rename_failure)),
        ]
        for label, make_patcher in schedules:
            for prior_exists in (True, False):
                with self.subTest(failure=label, prior_exists=prior_exists):
                    shutil.rmtree(self.out)
                    os.makedirs(self.out)
                    self.prior_group = None
                    if prior_exists:
                        self._write_prior()
                    with _StubPipeline(self.tmp, content_seconds=3.0) as pipe, make_patcher():
                        with self.assertRaises(OSError) as ctx:
                            self._render(pipe)
                    self.assertIn("injected", str(ctx.exception))
                    self._assert_prior_intact(prior_exists)
                    # The failed operation's group is gone; the earlier one is the only group.
                    self.assertEqual(_exact_groups(self.out, self.STEM), [self.prior_group] if prior_exists else [])
                    self.assertFalse(getattr(ctx.exception, "__notes__", None))
                    self._assert_work_dirs_gone()

    def test_denied_cleanup_after_a_failed_publication_is_reported_as_a_residual(self):
        self._write_prior()
        real_rename = os.rename
        real_rmtree = shutil.rmtree
        kept = []

        def rename(src, dst):
            if os.path.basename(dst) == cg._ExactOutputGroup.FINAL:
                raise PermissionError("injected: destination remains unavailable")
            return real_rename(src, dst)

        def rmtree(path, *a, **kw):
            # The operation's own group cannot be removed (say, a staged file is
            # held open); everything else, including the work directory, can.
            if os.path.dirname(path) == self.out:
                kept.append(path)
                return None
            return real_rmtree(path, *a, **kw)

        with _StubPipeline(self.tmp, content_seconds=3.0) as pipe, \
             mock.patch.object(cg.os, "rename", side_effect=rename), \
             mock.patch.object(cg.shutil, "rmtree", side_effect=rmtree):
            with self.assertRaises(PermissionError) as ctx:
                self._render(pipe)
        self.assertEqual(len(kept), 1)
        residual_group = kept[0]
        self.assertNotEqual(residual_group, self.prior_group)
        # Reported, not claimed clean: the note names the group and its staged files.
        (note,) = ctx.exception.__notes__
        self.assertIn("could not remove", note)
        self.assertIn(residual_group, note)
        for name in self.NAMES:
            self.assertIn(os.path.join(residual_group, "staging", name), note)
        self.assertEqual(_group_files(residual_group), {"staging": dict(self.NEW)})
        self._assert_prior_intact(True)
        self.assertEqual(_exact_groups(self.out, self.STEM), sorted([self.prior_group, residual_group]))
        self._assert_work_dirs_gone()

    def _deny_staging_creation(self):
        """Every staging mkdir fails after the parent was acquired (R4 / WS-11)."""
        real_mkdir = os.mkdir

        def mkdir(path, *a, **kw):
            if os.path.basename(str(path)) == cg._ExactOutputGroup.STAGING:
                raise PermissionError("injected: staging directory cannot be created")
            return real_mkdir(path, *a, **kw)

        return mock.patch.object(cg.os, "mkdir", side_effect=mkdir)

    def test_staging_creation_failure_after_acquisition_removes_only_the_owned_parent(self):
        for prior_exists in (True, False):
            with self.subTest(prior_exists=prior_exists):
                shutil.rmtree(self.out)
                os.makedirs(self.out)
                self.prior_group = None
                if prior_exists:
                    self._write_prior()
                before = sorted(os.listdir(self.out))
                real_rmtree = shutil.rmtree
                removed = []

                def rmtree(path, *a, **kw):
                    removed.append(path)
                    return real_rmtree(path, *a, **kw)

                with _StubPipeline(self.tmp, content_seconds=3.0) as pipe, self._deny_staging_creation(), \
                     mock.patch.object(cg.shutil, "rmtree", side_effect=rmtree):
                    with self.assertRaises(PermissionError) as ctx:
                        self._render(pipe)
                self.assertIn("injected", str(ctx.exception))
                self.assertFalse(getattr(ctx.exception, "__notes__", None))
                # Exactly the acquired parent was cleaned, never the earlier group,
                # and the output root is exactly as it was before the operation.
                owned = [p for p in removed if os.path.dirname(p) == self.out]
                self.assertEqual(len(owned), 1)
                self.assertNotIn(self.prior_group, removed)
                self.assertEqual(sorted(os.listdir(self.out)), before)
                self.assertEqual(_exact_groups(self.out, self.STEM), [self.prior_group] if prior_exists else [])
                self._assert_prior_intact(prior_exists)
                self._assert_work_dirs_gone()

    def test_denied_cleanup_after_a_staging_creation_failure_is_reported_as_a_residual(self):
        for prior_exists in (True, False):
            with self.subTest(prior_exists=prior_exists):
                shutil.rmtree(self.out)
                os.makedirs(self.out)
                self.prior_group = None
                if prior_exists:
                    self._write_prior()
                real_rmtree = shutil.rmtree
                kept = []

                def rmtree(path, *a, **kw):
                    if os.path.dirname(path) == self.out:
                        kept.append(path)
                        return None
                    return real_rmtree(path, *a, **kw)

                with _StubPipeline(self.tmp, content_seconds=3.0) as pipe, self._deny_staging_creation(), \
                     mock.patch.object(cg.shutil, "rmtree", side_effect=rmtree):
                    with self.assertRaises(PermissionError) as ctx:
                        self._render(pipe)
                self.assertIn("injected", str(ctx.exception))
                (residual_group,) = kept
                self.assertNotEqual(residual_group, self.prior_group)
                (note,) = ctx.exception.__notes__
                self.assertIn("could not remove", note)
                self.assertIn(residual_group, note)
                # The residual is the empty owned parent: no staging, no final.
                self.assertEqual(os.listdir(residual_group), [])
                self.assertEqual(_exact_groups(self.out, self.STEM),
                                 sorted(g for g in (self.prior_group, residual_group) if g))
                self._assert_prior_intact(prior_exists)
                self._assert_work_dirs_gone()

    def test_reporting_failures_after_publication_keep_the_published_result(self):
        self._write_prior()
        events = []

        def progress(pct, msg):
            events.append(pct)
            if pct == 100:
                raise RuntimeError("caller's reporting failed")

        class FailedStderr:
            def write(self, data):
                raise OSError("stderr unavailable")

            def flush(self):
                raise OSError("stderr unavailable")

        # The completion callback raises and the diagnostic channel that would
        # report it raises too. The renderer has published; it must say so.
        with _StubPipeline(self.tmp, content_seconds=3.0) as pipe, \
             mock.patch.object(cg.sys, "stderr", FailedStderr()):
            out = self._render(pipe, progress_callback=progress)
        self.assertEqual(events[-1], 100)
        groups = _exact_groups(self.out, self.STEM)
        (new_group,) = [g for g in groups if g != self.prior_group]
        self._assert_complete_group(out, new_group)
        self._assert_prior_intact(True)
        self._assert_work_dirs_gone()

    def test_a_rendering_error_before_publication_is_still_raised_and_publishes_nothing(self):
        self._write_prior()
        with _StubPipeline(self.tmp, content_seconds=3.0) as pipe:
            pipe.probes["content"]["audio_end"] = 3.9
            with self.assertRaises(er.ExactRenderVerificationError):
                self._render(pipe)
        self._assert_prior_intact(True)
        self.assertEqual(_exact_groups(self.out, self.STEM), [self.prior_group])
        self._assert_work_dirs_gone()

    def test_repeated_same_title_operations_get_distinct_complete_groups(self):
        outs = []
        with _StubPipeline(self.tmp, content_seconds=3.0) as pipe:
            for _ in range(3):
                outs.append(self._render(pipe))
                snapshot = {g: _group_files(g) for g in _exact_groups(self.out, self.STEM)}
        groups = _exact_groups(self.out, self.STEM)
        self.assertEqual(len(groups), 3)
        self.assertEqual(len({os.path.dirname(o["output_path"]) for o in outs}), 3)
        for out in outs:
            group = os.path.dirname(os.path.dirname(out["output_path"]))
            self._assert_complete_group(out, group)
        self.assertEqual(snapshot, {g: {"final": dict(self.NEW)} for g in groups})
        self.assertEqual(cg._reserved_output_paths, set())
        self._assert_work_dirs_gone()

    def test_two_processes_publish_the_same_title_into_distinct_groups(self):
        self._write_prior()
        children = [self._run_child("publish", f"child-{i}") for i in range(2)]
        results = []
        for child in children:
            stdout, stderr = child.communicate(timeout=120)
            self.assertEqual(child.returncode, 0, stderr)
            results.append(json.loads(stdout.strip().splitlines()[-1]))
        groups = _exact_groups(self.out, self.STEM)
        self.assertEqual(len(groups), 3)
        new_groups = sorted(g for g in groups if g != self.prior_group)
        self.assertEqual(sorted(os.path.dirname(os.path.dirname(r["output_path"])) for r in results), new_groups)
        for result in results:
            group = os.path.dirname(os.path.dirname(result["output_path"]))
            self.assertEqual(_group_files(group), {"final": dict(self.NEW)})
            for key, name in zip(("output_path", "caption_overlay_path", "cropped_source_path"), self.NAMES):
                self.assertEqual(result[key], os.path.join(group, "final", name))
                self.assertTrue(os.path.isfile(result[key]), result[key])
        self._assert_prior_intact(True)

    def test_process_death_before_the_boundary_publishes_nothing_and_keeps_earlier_outputs(self):
        self._write_prior()
        child = self._run_child("interrupt", "child-interrupt")
        stdout, stderr = child.communicate(timeout=120)
        self.assertEqual(child.returncode, 7, stderr)
        self.assertEqual(stdout.strip(), "")
        self._assert_prior_intact(True)
        groups = _exact_groups(self.out, self.STEM)
        (orphan,) = [g for g in groups if g != self.prior_group]
        # Only unreferenced staging remains: nothing at `final`, no partial group
        # a reader could mistake for a published one.
        self.assertEqual(_group_files(orphan), {"staging": dict(self.NEW)})
        self.assertFalse(os.path.exists(os.path.join(orphan, "final")))


class ConcatReportTests(unittest.TestCase):
    """concat_outro tells an interested caller what it actually did."""

    def _run(self, xfade_ok, soft_ok, report):
        def proc(cmd, **kw):
            is_xfade = any("xfade" in str(part) for part in cmd)
            ok = xfade_ok if is_xfade else True
            return mock.Mock(returncode=0 if ok else 1, stdout="", stderr="xfade unavailable")

        with mock.patch.object(vp, "get_dimensions", return_value=(1080, 1920)), \
             mock.patch.object(vp, "_get_media_duration_seconds", side_effect=[20.0, 5.0, 24.5, 24.5, 25.0, 25.0]), \
             mock.patch.object(vp, "_has_audio_stream", return_value=True), \
             mock.patch.object(vp, "get_video_encode_flags", return_value=vp.CPU_FLAGS), \
             mock.patch.object(vp.os.path, "exists", return_value=False), \
             mock.patch.object(vp, "_run_ffmpeg_with_fallback") as run_ffmpeg, \
             mock.patch.object(vp, "proc_run", side_effect=proc):
            effects = ["/tmp/outro_scaled.mp4"]
            effects.append("/tmp/out.mp4" if soft_ok else RuntimeError("soft failed"))
            effects.append("/tmp/main_reenc.mp4")
            run_ffmpeg.side_effect = effects
            return vp.concat_outro("/tmp/in.mp4", "/tmp/outro.mp4", "/tmp/out.mp4",
                                   crossfade_duration=0.8, report=report)

    def test_xfade_branch_reports_the_clamped_overlap(self):
        report = {}
        self.assertEqual(self._run(True, True, report), "/tmp/out.mp4")
        self.assertEqual(report["branch"], "xfade_acrossfade")
        self.assertEqual(report["applied_overlap"], 0.8)
        self.assertEqual(report["requested_fade"], 0.8)
        self.assertEqual((report["main_duration"], report["appended_duration"]), (20.0, 5.0))

    def test_soft_audio_fallback_reports_zero_overlap(self):
        report = {}
        self._run(False, True, report)
        self.assertEqual(report["branch"], "hardcut_soft_audio")
        self.assertEqual(report["applied_overlap"], 0.0)

    def test_hard_cut_fallback_reports_zero_overlap(self):
        report = {}
        with mock.patch("builtins.open", mock.mock_open()):
            self._run(False, False, report)
        self.assertEqual(report["branch"], "hardcut")
        self.assertEqual(report["applied_overlap"], 0.0)

    def test_legacy_callers_get_the_same_return_and_no_report(self):
        self.assertEqual(self._run(True, True, None), "/tmp/out.mp4")

    def _run_with_acrossfade_failing(self, **kw):
        """Only the audio crossfade fails; what the helper tries next is recorded."""
        attempted = []

        def proc(cmd, **_):
            attempted.append(" ".join(str(part) for part in cmd))
            if "acrossfade" in attempted[-1]:
                return mock.Mock(returncode=1, stdout="", stderr="acrossfade unavailable")
            return mock.Mock(returncode=0, stdout="", stderr="")

        report = {}
        with mock.patch.object(vp, "get_dimensions", return_value=(1080, 1920)), \
             mock.patch.object(vp, "_get_media_duration_seconds", side_effect=[20.0, 5.0, 24.5, 24.5, 25.0, 25.0]), \
             mock.patch.object(vp, "_has_audio_stream", return_value=True), \
             mock.patch.object(vp, "get_video_encode_flags", return_value=vp.CPU_FLAGS), \
             mock.patch.object(vp.os.path, "exists", return_value=False), \
             mock.patch.object(vp, "_run_ffmpeg_with_fallback", side_effect=["/tmp/outro_scaled.mp4", "/tmp/out.mp4"]), \
             mock.patch.object(vp, "proc_run", side_effect=proc):
            vp.concat_outro("/tmp/in.mp4", "/tmp/outro.mp4", "/tmp/out.mp4", crossfade_duration=0.8,
                            report=report, **kw)
        return report, attempted

    def test_synchronized_only_skips_the_audio_concat_option(self):
        report, attempted = self._run_with_acrossfade_failing(synchronized_transitions_only=True)
        self.assertEqual(len(attempted), 1)
        self.assertIn("acrossfade", attempted[0])
        self.assertFalse(any("concat=n=2:v=0:a=1" in cmd and "xfade" in cmd for cmd in attempted))
        self.assertEqual(report["branch"], "hardcut_soft_audio")
        self.assertEqual(report["applied_overlap"], 0.0)

    def test_legacy_default_still_tries_the_audio_concat_option(self):
        report, attempted = self._run_with_acrossfade_failing()
        self.assertEqual(len(attempted), 2)
        self.assertTrue("concat=n=2:v=0:a=1" in attempted[1] and "xfade" in attempted[1])
        self.assertEqual(report["branch"], "xfade_audio_concat")
        self.assertEqual(report["applied_overlap"], 0.8)


class BridgeTests(unittest.TestCase):
    """backend/main.py create_clip carries the mode in and the timeline out."""

    def _handle(self, params, generate_result=None):
        import main as backend_main
        captured = {}

        def fake_generate(**kwargs):
            captured["kwargs"] = kwargs
            return generate_result or {"output_path": "x.mp4", "duration": 1.0}

        emitted = []
        with mock.patch("services.clip_generator.generate_clip", side_effect=fake_generate), \
             mock.patch("services.asset_store.resolve", side_effect=lambda v: v if v and v.startswith("ok:") else None), \
             mock.patch.object(backend_main, "emit_result", side_effect=lambda *a, **k: emitted.append((a, k))), \
             mock.patch.object(backend_main, "emit_progress"):
            backend_main.handle_create_clip("t1", params)
        return captured.get("kwargs"), emitted

    def test_exact_mode_and_timeline_pass_through_unchanged(self):
        timeline = {"version": 1, "segments": [{"source_start": 4.0}]}
        kwargs, emitted = self._handle(
            {"video_path": "v.mp4", "timing_mode": "exact", "keep_segments": [{"start": 4, "end": 5}],
             "transcript_words": [], "intro_path": "ok:intro.mp4"},
            generate_result={"output_path": "x.mp4", "duration": 1.0, "timing_mode": "exact",
                             "render_timeline": timeline},
        )
        self.assertEqual(kwargs["timing_mode"], "exact")
        self.assertEqual(kwargs["keep_segments"], [{"start": 4, "end": 5}])
        self.assertEqual(kwargs["transcript_words"], [])
        self.assertEqual(kwargs["intro_path"], "ok:intro.mp4")
        self.assertEqual((kwargs["start_second"], kwargs["end_second"]), (0, 0))
        data = emitted[0][1]["data"]
        self.assertEqual(data["render_timeline"], timeline)
        self.assertEqual(data["timing_mode"], "exact")

    def test_exact_mode_rejects_an_asset_that_did_not_resolve(self):
        with self.assertRaises(ValueError):
            self._handle({"video_path": "v.mp4", "timing_mode": "exact",
                          "keep_segments": [{"start": 4, "end": 5}], "outro_path": "gone.mp4"})

    def test_legacy_requests_keep_their_shape_and_strictness(self):
        kwargs, emitted = self._handle({"video_path": "v.mp4", "start_second": 1, "end_second": 2,
                                        "outro_path": "gone.mp4"})
        self.assertIsNone(kwargs["timing_mode"])
        self.assertIsNone(kwargs["outro_path"])
        self.assertEqual((kwargs["start_second"], kwargs["end_second"]), (1, 2))
        self.assertNotIn("render_timeline", emitted[0][1]["data"])
        with self.assertRaises(KeyError):
            self._handle({"video_path": "v.mp4", "end_second": 2})

    def test_transcript_availability_reaches_the_renderer_as_sent(self):
        exact = {"video_path": "v.mp4", "timing_mode": "exact", "keep_segments": [{"start": 4, "end": 5}]}
        cases = [
            ("omitted", {}, None),
            ("null", {"transcript_words": None}, None),
            ("empty", {"transcript_words": []}, []),
            ("supplied", {"transcript_words": [{"word": "a", "start": 4.1, "end": 4.2}]},
             [{"word": "a", "start": 4.1, "end": 4.2}]),
        ]
        for label, extra, expected in cases:
            with self.subTest(transcript=label):
                kwargs, _ = self._handle({**exact, **extra})
                self.assertEqual(kwargs["transcript_words"], expected)
        # Legacy requests keep their empty-list default for an omitted transcript.
        kwargs, _ = self._handle({"video_path": "v.mp4", "start_second": 1, "end_second": 2})
        self.assertEqual(kwargs["transcript_words"], [])

    def test_omitted_transcript_is_reported_unavailable_through_the_real_renderer(self):
        import main as backend_main
        tmp = tempfile.mkdtemp(prefix="podcli-exact-bridge-")
        self.addCleanup(shutil.rmtree, tmp, ignore_errors=True)
        cg._reserved_output_paths.clear()
        self.addCleanup(cg._reserved_output_paths.clear)
        out_dir = os.path.join(tmp, "out")
        os.makedirs(out_dir)

        def handle(title, **extra):
            emitted = []
            with mock.patch.object(backend_main, "emit_result", side_effect=lambda *a, **k: emitted.append(k)), \
                 mock.patch.object(backend_main, "emit_progress"):
                backend_main.handle_create_clip("t", {
                    "video_path": pipe.source, "timing_mode": "exact", "keep_segments": [{"start": 1, "end": 2}],
                    "crop_strategy": "center", "output_dir": out_dir, "title": title, **extra,
                })
            return emitted[0]["data"]["render_timeline"]

        with _StubPipeline(tmp, content_seconds=1.0) as pipe:
            omitted = handle("omitted")
            null = handle("null", transcript_words=None)
            empty = handle("empty", transcript_words=[])
            supplied = handle("supplied", transcript_words=[{"word": "w", "start": 1.2, "end": 1.4}])
            self.assertEqual(pipe.calls["remotion"], [[{"word": "w", "start": 0.2, "end": 0.4}]])
        for tl in (omitted, null):
            self.assertEqual(tl["words"]["input"], "unavailable")
            self.assertIsNone(tl["words"]["source"])
            self.assertIsNone(tl["words"]["source_count"])
            self.assertEqual(tl["words"]["content"], [])
            self.assertTrue(tl["captions"]["requested"])
            self.assertFalse(tl["captions"]["rendered"])
            self.assertIn("no transcript words were passed", tl["captions"]["unavailable_reason"])
        self.assertEqual(empty["words"]["input"], "supplied")
        self.assertEqual(empty["words"]["source"], [])
        self.assertEqual(empty["words"]["source_count"], 0)
        self.assertFalse(empty["captions"]["rendered"])
        self.assertEqual(supplied["words"]["input"], "supplied")
        self.assertEqual(supplied["words"]["source_count"], 1)
        self.assertTrue(supplied["captions"]["rendered"])


# ---------------------------------------------------------------------------
# Real synthetic media
# ---------------------------------------------------------------------------

@unittest.skipUnless(HAVE_FFMPEG, "ffmpeg/ffprobe not installed")
class ExactRenderMediaTests(unittest.TestCase):
    """Each source second has its own colour, tone and word.

    Decoding the output therefore says which seconds were rendered and in
    what order; the timeline must agree with the media, not just with the
    request.
    """

    COLORS = ["red", "green", "blue", "yellow", "cyan", "magenta", "white", "gray"]
    RGB = {
        "red": (255, 0, 0), "green": (0, 128, 0), "blue": (0, 0, 255),
        "yellow": (255, 255, 0), "cyan": (0, 255, 255), "magenta": (255, 0, 255),
        "white": (255, 255, 255), "gray": (128, 128, 128),
        "orange": (255, 165, 0), "purple": (128, 0, 128),
    }
    TONES = [300 + 200 * i for i in range(8)]

    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.mkdtemp(prefix="podcli-exact-media-")
        cls.src = os.path.join(cls.tmpdir, "src.mp4")
        cmd = ["ffmpeg", "-y", "-loglevel", "error"]
        for color in cls.COLORS:
            cmd += ["-f", "lavfi", "-i", f"color=c={color}:s=64x64:r=25:d=1"]
        for tone in cls.TONES:
            cmd += ["-f", "lavfi", "-i", f"sine=frequency={tone}:sample_rate=44100:duration=1"]
        chain = "".join(f"[{i}:v][{8 + i}:a]" for i in range(8))
        cmd += ["-filter_complex", f"{chain}concat=n=8:v=1:a=1[v][a]", "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-g", "50", "-keyint_min", "50", "-sc_threshold", "0",
                "-c:a", "aac", "-b:a", "128k", cls.src]
        subprocess.run(cmd, check=True, capture_output=True)

        cls.lr = os.path.join(cls.tmpdir, "lr.mp4")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                        "-f", "lavfi", "-i", "color=c=red:s=64x64:r=25:d=6",
                        "-f", "lavfi", "-i", "color=c=blue:s=64x64:r=25:d=6",
                        "-f", "lavfi", "-i", "sine=frequency=700:sample_rate=44100:duration=6",
                        "-filter_complex", "[0:v][1:v]hstack=inputs=2[v]", "-map", "[v]", "-map", "2:a",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", cls.lr],
                       check=True, capture_output=True)

        cls.silent = os.path.join(cls.tmpdir, "silent.mp4")
        cmd = ["ffmpeg", "-y", "-loglevel", "error"]
        for color in cls.COLORS[:4]:
            cmd += ["-f", "lavfi", "-i", f"color=c={color}:s=64x64:r=25:d=1"]
        cmd += ["-filter_complex", "concat=n=4:v=1:a=0", "-c:v", "libx264", "-pix_fmt", "yuv420p", cls.silent]
        subprocess.run(cmd, check=True, capture_output=True)

        cls.intro = os.path.join(cls.tmpdir, "intro.mp4")
        cls.outro = os.path.join(cls.tmpdir, "outro.mp4")
        # xfade needs both inputs at one frame rate; a bookend at another
        # rate takes the hard-cut road, which the fallback test forces instead.
        for path, color, tone in ((cls.intro, "orange", 2000), (cls.outro, "purple", 2400)):
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                            "-f", "lavfi", "-i", f"color=c={color}:s=48x48:r=25:d=1",
                            "-f", "lavfi", "-i", f"sine=frequency={tone}:sample_rate=44100:duration=1",
                            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", path],
                           check=True, capture_output=True)
        cls.hashes = {p: cls._sha256(p) for p in (cls.src, cls.lr, cls.silent, cls.intro, cls.outro)}

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmpdir, ignore_errors=True)

    def setUp(self):
        self.out = tempfile.mkdtemp(prefix="podcli-exact-out-", dir=self.tmpdir)
        self.addCleanup(shutil.rmtree, self.out, ignore_errors=True)
        cg._reserved_output_paths.clear()
        self.addCleanup(cg._reserved_output_paths.clear)
        patches = [
            mock.patch.object(cg, "_trim_weak_opening", wraps=cg._trim_weak_opening),
            mock.patch.object(cg, "_snap_to_sentence_end", wraps=cg._snap_to_sentence_end),
            mock.patch.object(cg, "_build_tight_segments", wraps=cg._build_tight_segments),
            mock.patch.object(cg, "_auto_fix_transition_jumps", wraps=cg._auto_fix_transition_jumps),
        ]
        self.heuristics = [p.start() for p in patches]
        for p in patches:
            self.addCleanup(p.stop)

    # -- helpers -----------------------------------------------------------

    @staticmethod
    def _sha256(path):
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 16), b""):
                h.update(chunk)
        return h.hexdigest()

    def _render(self, source=None, **kw):
        params = dict(
            video_path=source or self.src, start_second=0, end_second=0, caption_style="hormozi",
            crop_strategy="center", format="vertical", title="exact media", output_dir=self.out,
            timing_mode="exact", clean_fillers=False, use_ass_captions=True, allow_ass_fallback=True,
            transcript_words=_words(),
        )
        params.update(kw)
        out = cg.generate_clip(**params)
        for heuristic in self.heuristics:
            heuristic.assert_not_called()
        for path, digest in self.hashes.items():
            self.assertEqual(self._sha256(path), digest, f"source bytes changed: {path}")
        self.assertTrue(os.path.isfile(out["output_path"]))
        # Each exact operation publishes into its own group under the output
        # directory: <stem>-<op_id>/final/<stem>.mp4.
        final_dir = os.path.dirname(out["output_path"])
        group = os.path.dirname(final_dir)
        self.assertEqual(os.path.basename(final_dir), "final")
        self.assertEqual(os.path.dirname(group), self.out)
        self.assertTrue(os.path.basename(group).startswith(f"{cg.safe_filename(params['title'])}_short-"))
        self.assertEqual(sorted(os.listdir(group)), ["final"])
        return out

    def _frame_rgb(self, path, t, region="top"):
        """Mean colour of a 32x32 patch at t: top-centre by default, or the
        frame centre for a letterboxed bookend whose top rows are padding."""
        y = "ih/8" if region == "top" else "(ih-32)/2"
        raw = subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1",
             "-vf", f"crop=32:32:(iw-32)/2:{y}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
            check=True, capture_output=True,
        ).stdout
        px = list(raw)
        n = len(px) // 3
        return tuple(round(sum(px[c::3]) / n) for c in range(3))

    def _assert_color(self, path, t, color, region="top"):
        got = self._frame_rgb(path, t, region)
        want = self.RGB[color]
        for got_c, want_c in zip(got, want):
            self.assertLessEqual(abs(got_c - want_c), 28, f"frame at {t:.2f}s is {got}, not {color} {want}")

    def _tone_hz(self, path, t0, t1):
        """Dominant frequency of a pure tone via zero crossings of mono PCM."""
        raw = subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-ss", f"{t0:.3f}", "-t", f"{t1 - t0:.3f}", "-i", path,
             "-vn", "-f", "s16le", "-ac", "1", "-ar", "8000", "-"],
            check=True, capture_output=True,
        ).stdout
        samples = [int.from_bytes(raw[i:i + 2], "little", signed=True) for i in range(0, len(raw) - 1, 2)]
        if not samples:
            return 0.0
        crossings = sum(1 for a, b in zip(samples, samples[1:]) if (a < 0) != (b < 0))
        return crossings / 2 / (len(samples) / 8000)

    def _assert_tone(self, path, t0, t1, hz):
        got = self._tone_hz(path, t0, t1)
        self.assertLessEqual(abs(got - hz), 60, f"audio {t0:.2f}-{t1:.2f}s is ~{got:.0f} Hz, not {hz} Hz")

    def _frame_spread(self, path, t):
        """Pixel spread across the whole frame at t; a uniform colour frame is
        near 0 and drawn caption text raises it."""
        raw = subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1",
             "-vf", "scale=96:96", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
            check=True, capture_output=True,
        ).stdout
        return statistics.pstdev(list(raw))

    def _probe(self, path):
        return json.loads(subprocess.run(
            ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path],
            check=True, capture_output=True,
        ).stdout)

    def _colors_seen(self, path, duration, step=0.25):
        seen = set()
        t = step / 2
        while t < duration:
            rgb = self._frame_rgb(path, t)
            best = min(self.RGB, key=lambda c: sum(abs(a - b) for a, b in zip(rgb, self.RGB[c])))
            seen.add(best)
            t += step
        return seen

    # -- tests -------------------------------------------------------------

    def test_reversed_noncontiguous_sequence_is_rendered_as_supplied(self):
        segments = [{"start": 6, "end": 7}, {"start": 2, "end": 3}, {"start": 4, "end": 5}]
        words = _words()
        seg_snapshot, word_snapshot = copy.deepcopy(segments), copy.deepcopy(words)
        out = self._render(keep_segments=segments, transcript_words=words)
        self.assertEqual(segments, seg_snapshot)
        self.assertEqual(words, word_snapshot)
        path = out["output_path"]
        tl = out["render_timeline"]

        self._assert_color(path, 0.5, "white")
        self._assert_color(path, 1.5, "blue")
        self._assert_color(path, 2.5, "cyan")
        self.assertEqual(self._colors_seen(path, tl["output_duration"]), {"white", "blue", "cyan"})
        self._assert_tone(path, 0.3, 0.7, self.TONES[6])
        self._assert_tone(path, 1.3, 1.7, self.TONES[2])
        self._assert_tone(path, 2.3, 2.7, self.TONES[4])

        self.assertEqual([(s["source_start"], s["source_end"], s["content_start"]) for s in tl["segments"]],
                         [(6.0, 7.0, 0.0), (2.0, 3.0, 1.0), (4.0, 5.0, 2.0)])
        self.assertEqual(tl["words"]["content_text"], "w6 w2 w4")
        self.assertEqual([(w["start"], w["end"], w["speaker"]) for w in tl["words"]["content"]],
                         [(0.2, 0.6, "S0"), (1.2, 1.6, "S0"), (2.2, 2.6, "S0")])
        self.assertEqual([w["word"] for w in tl["words"]["source"]], ["w2", "w4", "w6"])
        self.assertEqual(tl["content_duration"], 3.0)
        self.assertLessEqual(abs(tl["content_duration_measured"] - 3.0), tl["tolerance"]["content_seconds"])
        self.assertLessEqual(abs(tl["output_duration"] - 3.0), tl["tolerance"]["composition_seconds"])
        self.assertEqual(tl["content_to_output_offset"], 0.0)
        self.assertEqual((tl["output"]["width"], tl["output"]["height"]), (1080, 1920))
        self.assertEqual(tl["output"]["fps"], 25.0)
        self.assertTrue(tl["output"]["has_audio"])
        self.assertTrue(tl["captions"]["rendered"])
        self.assertEqual(tl["captions"]["renderer"], "ass")
        self.assertGreater(self._frame_spread(path, 1.4), 8.0, "no caption pixels where w2 is drawn on the blue second")
        self.assertEqual(out["duration"], 3.0)
        self.assertEqual((out["start_second"], out["end_second"]), (2.0, 7.0))
        probe = self._probe(path)
        self.assertEqual({s["codec_type"] for s in probe["streams"]}, {"video", "audio"})

    def test_single_interval_is_clipped_by_the_same_mapping(self):
        out = self._render(keep_segments=[{"start": 3.5, "end": 5.5}])
        path = out["output_path"]
        self._assert_color(path, 0.25, "yellow")
        self._assert_color(path, 1.0, "cyan")
        self._assert_color(path, 1.75, "magenta")
        self._assert_tone(path, 0.1, 0.4, self.TONES[3])
        self._assert_tone(path, 0.6, 1.4, self.TONES[4])
        self._assert_tone(path, 1.6, 1.9, self.TONES[5])
        self.assertEqual([(w["word"], w["start"], w["end"]) for w in out["render_timeline"]["words"]["content"]],
                         [("w3", 0.0, 0.1), ("w4", 0.7, 1.1), ("w5", 1.7, 2.0)])
        self.assertEqual(out["render_timeline"]["segment_count"], 1)

    def test_narrower_then_wider_request_recovers_omitted_words(self):
        words = _words()
        snapshot = copy.deepcopy(words)
        narrow = self._render(keep_segments=[{"start": 2, "end": 3}], transcript_words=words, title="narrow")
        self.assertEqual(words, snapshot)
        wide = self._render(keep_segments=[{"start": 1, "end": 4}], transcript_words=words, title="wide")
        self.assertEqual(words, snapshot)
        self.assertEqual(narrow["render_timeline"]["words"]["content_text"], "w2")
        self.assertEqual(wide["render_timeline"]["words"]["content_text"], "w1 w2 w3")
        self.assertEqual(self._colors_seen(narrow["output_path"], 1.0), {"blue"})
        self.assertEqual(self._colors_seen(wide["output_path"], 3.0), {"green", "blue", "yellow"})
        self._assert_tone(wide["output_path"], 0.3, 0.7, self.TONES[1])
        self._assert_tone(wide["output_path"], 2.3, 2.7, self.TONES[3])

    def test_same_title_renders_keep_the_earlier_output_readable_in_place(self):
        first = self._render(keep_segments=[{"start": 2, "end": 3}], title="same title", captions=False)
        first_hash = self._sha256(first["output_path"])
        second = self._render(keep_segments=[{"start": 5, "end": 6}], title="same title", captions=False)
        self.assertNotEqual(os.path.dirname(first["output_path"]), os.path.dirname(second["output_path"]))
        self.assertEqual(len(_exact_groups(self.out, "same_title_short")), 2)
        # The earlier render is untouched at its original path and still decodes.
        self.assertEqual(self._sha256(first["output_path"]), first_hash)
        self._assert_color(first["output_path"], 0.5, "blue")
        self._assert_tone(first["output_path"], 0.3, 0.7, self.TONES[2])
        self._assert_color(second["output_path"], 0.5, "magenta")
        self._assert_tone(second["output_path"], 0.3, 0.7, self.TONES[5])
        for out in (first, second):
            self.assertEqual({s["codec_type"] for s in self._probe(out["output_path"])["streams"]}, {"video", "audio"})

    def test_horizontal_and_square_keep_their_dimensions_and_content(self):
        for fmt, dims in (("horizontal", (1920, 1080)), ("square", (1080, 1080))):
            with self.subTest(format=fmt):
                out = self._render(keep_segments=[{"start": 5, "end": 6}, {"start": 1, "end": 2}],
                                   format=fmt, captions=False, title=fmt)
                tl = out["render_timeline"]
                self.assertEqual((tl["output"]["width"], tl["output"]["height"]), dims)
                self.assertEqual(tl["framing"]["format"], fmt)
                self._assert_color(out["output_path"], 0.5, "magenta")
                self._assert_color(out["output_path"], 1.5, "green")
                self._assert_tone(out["output_path"], 0.3, 0.7, self.TONES[5])
                self._assert_tone(out["output_path"], 1.3, 1.7, self.TONES[1])
                self.assertFalse(tl["captions"]["rendered"])
                self.assertFalse(tl["captions"]["requested"])

    def test_manual_keyframes_are_content_relative(self):
        keyframes = [{"t": 0, "x_pct": 25}, {"t": 1.0, "x_pct": 75}]
        snapshot = copy.deepcopy(keyframes)
        out = self._render(source=self.lr, keep_segments=[{"start": 3, "end": 5}], crop_strategy="manual",
                           crop_keyframes=keyframes, transcript_words=None, captions=False)
        self.assertEqual(keyframes, snapshot)
        path = out["output_path"]
        # A second subtraction of the 3 s source offset would put both
        # keyframes before t=0 and hold the left (red) crop for the whole clip.
        self._assert_color(path, 0.5, "red")
        self._assert_color(path, 1.5, "blue")
        tl = out["render_timeline"]
        self.assertEqual(tl["framing"]["crop_keyframes"],
                         {"time_domain": "content", "keyframes": [{"t": 0.0, "x_pct": 25.0}, {"t": 1.0, "x_pct": 75.0}]})
        self.assertEqual(tl["framing"]["crop_strategy"], "manual")
        self.assertEqual(tl["words"]["input"], "unavailable")
        self.assertEqual((tl["output"]["width"], tl["output"]["height"]), (1080, 1920))

    def test_keyframe_outside_content_is_rejected_before_rendering(self):
        with self.assertRaises(er.ExactRenderError):
            cg.generate_clip(video_path=self.lr, start_second=0, end_second=0, timing_mode="exact",
                             keep_segments=[{"start": 3, "end": 5}], crop_strategy="manual",
                             crop_keyframes=[{"t": 2.5, "x_pct": 50}], output_dir=self.out, format="vertical")
        with self.assertRaises(er.ExactRenderError):
            cg.generate_clip(video_path=self.src, start_second=0, end_second=0, timing_mode="exact",
                             keep_segments=[{"start": 7.5, "end": 9.0}], output_dir=self.out, format="vertical")
        self.assertEqual(os.listdir(self.out), [])

    def test_source_without_audio_is_reported_not_faked(self):
        out = self._render(source=self.silent, keep_segments=[{"start": 0, "end": 1}, {"start": 2, "end": 3}],
                           transcript_words=[], captions=False)
        tl = out["render_timeline"]
        self.assertFalse(tl["source"]["has_audio"])
        self.assertFalse(tl["output"]["has_audio"])
        self.assertIsNone(tl["output"]["audio_duration"])
        self.assertEqual({s["codec_type"] for s in self._probe(out["output_path"])["streams"]}, {"video"})
        self._assert_color(out["output_path"], 0.5, "red")
        self._assert_color(out["output_path"], 1.5, "blue")
        self.assertEqual(tl["words"]["input"], "supplied")
        self.assertEqual(tl["words"]["content"], [])
        self.assertLessEqual(abs(tl["output_duration"] - 2.0), tl["tolerance"]["composition_seconds"])

    def test_bookends_report_the_real_crossfade_and_offset(self):
        out = self._render(keep_segments=[{"start": 1, "end": 2}, {"start": 5, "end": 6}],
                           intro_path=self.intro, outro_path=self.outro, bookend_fade=0.3, captions=False)
        tl = out["render_timeline"]
        intro, outro = tl["bookends"]["intro"], tl["bookends"]["outro"]
        self.assertTrue(intro["branch"].startswith("xfade"), intro)
        self.assertTrue(outro["branch"].startswith("xfade"), outro)
        self.assertAlmostEqual(intro["applied_overlap"], 0.3, places=3)
        self.assertAlmostEqual(outro["applied_overlap"], 0.3, places=3)
        offset = tl["content_to_output_offset"]
        self.assertLessEqual(abs(offset - 0.7), tl["tolerance"]["composition_seconds"])
        self.assertLessEqual(abs(tl["output_duration"] - 3.4), tl["tolerance"]["composition_seconds"])
        path = out["output_path"]
        self._assert_color(path, 0.3, "orange", region="center")
        self._assert_color(path, offset + 0.5, "green")
        self._assert_color(path, offset + 1.5, "magenta")
        self._assert_color(path, tl["output_duration"] - 0.25, "purple", region="center")
        self._assert_tone(path, offset + 0.35, offset + 0.65, self.TONES[1])
        self._assert_tone(path, offset + 1.35, offset + 1.65, self.TONES[5])
        self.assertEqual(intro["transition"]["output_end"], intro["asset_duration"])
        self.assertLessEqual(abs(outro["transition"]["output_end"] - (offset + 2.0)),
                             tl["tolerance"]["composition_seconds"])

    def test_bookend_fallback_reports_a_hard_cut_not_the_requested_fade(self):
        real_run = vp.proc_run

        def fail_xfade(cmd, **kw):
            if any("xfade" in str(part) for part in cmd):
                return mock.Mock(returncode=1, stdout="", stderr="xfade forced off")
            return real_run(cmd, **kw)

        with mock.patch.object(vp, "proc_run", side_effect=fail_xfade):
            out = self._render(keep_segments=[{"start": 1, "end": 2}, {"start": 5, "end": 6}],
                               intro_path=self.intro, outro_path=self.outro, bookend_fade=0.3, captions=False)
        tl = out["render_timeline"]
        self.assertEqual(tl["bookends"]["intro"]["branch"], "hardcut_soft_audio")
        self.assertEqual(tl["bookends"]["outro"]["branch"], "hardcut_soft_audio")
        self.assertEqual(tl["bookends"]["intro"]["applied_overlap"], 0.0)
        self.assertEqual(tl["bookends"]["requested_fade"], 0.3)
        self.assertLessEqual(abs(tl["content_to_output_offset"] - 1.0), tl["tolerance"]["composition_seconds"])
        self.assertLessEqual(abs(tl["output_duration"] - 4.0), tl["tolerance"]["composition_seconds"])
        path = out["output_path"]
        self._assert_color(path, 0.5, "orange", region="center")
        self._assert_color(path, tl["content_to_output_offset"] + 0.5, "green")
        self._assert_color(path, tl["content_to_output_offset"] + 1.5, "magenta")
        self._assert_color(path, tl["output_duration"] - 0.3, "purple", region="center")


if __name__ == "__main__":
    unittest.main()
