"""Tests for backend.services.saliency pure signal functions."""

import os
import sys
import unittest
from unittest import mock

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_ROOT = os.path.join(ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

import numpy as np

from services import saliency as sal
from services.profiles import get_profile


class PickPeaksTests(unittest.TestCase):
    def test_finds_local_maxima_above_height(self):
        curve = np.array([0, 1, 5, 1, 0, 0, 4, 0, 0, 9, 0.0])
        self.assertEqual(sal.pick_peaks(curve, 2.0, 2), [2, 6, 9])

    def test_height_filters_small_peaks(self):
        curve = np.array([0, 3, 0, 0, 9, 0.0])
        self.assertEqual(sal.pick_peaks(curve, 5.0, 1), [4])

    def test_min_gap_suppresses_nearby_lower_peak(self):
        # two peaks 2 bins apart; min_gap 3 keeps only the taller
        curve = np.array([0, 8, 0, 6, 0.0])
        self.assertEqual(sal.pick_peaks(curve, 1.0, 3), [1])

    def test_empty_curve(self):
        self.assertEqual(sal.pick_peaks(np.array([]), 1.0, 2), [])


class DilateTests(unittest.TestCase):
    def test_spike_spreads_to_neighbors(self):
        curve = np.zeros(9)
        curve[4] = 1.0
        out = sal._dilate(curve, 2)
        self.assertTrue(np.all(out[2:7] == 1.0))
        self.assertEqual(out[1], 0.0)
        self.assertEqual(out[7], 0.0)

    def test_zero_radius_is_identity(self):
        curve = np.array([0.0, 1.0, 0.0])
        self.assertTrue(np.array_equal(sal._dilate(curve, 0), curve))


class RobustZTests(unittest.TestCase):
    def test_constant_array_is_zero(self):
        out = sal._robust_z(np.array([5.0, 5.0, 5.0]))
        self.assertTrue(np.allclose(out, 0.0))

    def test_outlier_gets_high_z(self):
        out = sal._robust_z(np.array([1.0, 1.0, 1.0, 1.0, 10.0]))
        self.assertEqual(int(np.argmax(out)), 4)
        self.assertGreater(out[4], 1.0)


class FuseChannelsTests(unittest.TestCase):
    def test_renormalizes_over_present_channels(self):
        # party weights audio_event=0.4, energy=0.2; both present -> peak follows audio_event
        channels = {
            "energy": np.array([3.0, 2.0, 1.0]),
            "audio_event": np.array([0.0, 0.0, 1.0]),
        }
        fused = sal.fuse_channels(channels, get_profile("party"))
        self.assertEqual(int(np.argmax(fused)), 2)

    def test_zero_weight_channel_ignored(self):
        # podcast gives motion weight 0, so a motion-only signal must not drive the curve
        channels = {"motion": np.array([0.0, 9.0, 0.0])}
        fused = sal.fuse_channels(channels, get_profile("podcast"))
        self.assertTrue(np.allclose(fused, 0.0))


class ProfileTests(unittest.TestCase):
    def test_auto_is_a_saliency_profile(self):
        p = get_profile("auto")
        self.assertEqual(p.name, "auto")
        self.assertEqual(p.candidate_source, "saliency")

    def test_auto_fuses_multiple_channels(self):
        # auto blends audio_event, energy and motion, so any one can drive a peak
        channels = {"motion": np.array([0.0, 0.0, 5.0]), "energy": np.array([1.0, 1.0, 1.0])}
        fused = sal.fuse_channels(channels, get_profile("auto"))
        self.assertEqual(int(np.argmax(fused)), 2)

    def test_unknown_profile_falls_back(self):
        self.assertEqual(get_profile("nonsense").name, "podcast")


class WindowForPeakTests(unittest.TestCase):
    def setUp(self):
        self.energy_flat = np.zeros(200)
        self.party = get_profile("party")

    def test_reaction_expands_backwards_from_onset(self):
        start, end, is_reaction = sal._window_for_peak(
            100.0, 0.5, self.party, 200.0, self.energy_flat, min_dur=8, max_dur=40
        )
        self.assertTrue(is_reaction)
        # lookback 8s before, payoff 2s after
        self.assertLess(start, 100.0)
        self.assertGreaterEqual(100.0 - start, self.party.reaction_lookback_sec - 0.1)
        self.assertLessEqual(end, 100.0 + self.party.reaction_payoff_sec + 0.1)

    def test_non_reaction_is_symmetric(self):
        start, end, is_reaction = sal._window_for_peak(
            100.0, 0.0, self.party, 200.0, self.energy_flat, min_dur=8, max_dur=40
        )
        self.assertFalse(is_reaction)
        self.assertAlmostEqual((start + end) / 2, 100.0, delta=1.0)

    def test_respects_min_duration(self):
        start, end, _ = sal._window_for_peak(
            100.0, 0.5, self.party, 200.0, self.energy_flat, min_dur=12, max_dur=40
        )
        self.assertGreaterEqual(round(end - start, 1), 12.0)

    def test_clamps_to_video_bounds(self):
        start, end, _ = sal._window_for_peak(
            2.0, 0.5, self.party, 200.0, self.energy_flat, min_dur=8, max_dur=40
        )
        self.assertGreaterEqual(start, 0.0)


class PooledTests(unittest.TestCase):
    def test_pools_across_files_reaction_first_with_source(self):
        fake = {
            "a.mp4": [
                {"start_second": 10, "end_second": 18, "score": 30.0, "reasons": ["energy_peak"]},
            ],
            "b.mp4": [
                {"start_second": 5, "end_second": 15, "score": 12.0, "reasons": ["reaction"]},
            ],
        }
        orig = sal.detect_highlights
        sal.detect_highlights = lambda path, **kw: [dict(c) for c in fake[path]]
        try:
            pooled = sal.detect_highlights_pooled(["a.mp4", "b.mp4"], top_n=5)
        finally:
            sal.detect_highlights = orig
        self.assertEqual(len(pooled), 2)
        # reaction outranks the higher-scored energy peak across files
        self.assertEqual(pooled[0]["reasons"], ["reaction"])
        self.assertEqual(pooled[0]["source_file"], "b.mp4")
        self.assertTrue(all("source_file" in c for c in pooled))

    def test_top_n_caps_pool(self):
        fake = [{"start_second": i, "end_second": i + 8, "score": float(i), "reasons": ["energy_peak"]} for i in range(10)]
        orig = sal.detect_highlights
        sal.detect_highlights = lambda path, **kw: [dict(c) for c in fake]
        try:
            pooled = sal.detect_highlights_pooled(["a.mp4"], top_n=3)
        finally:
            sal.detect_highlights = orig
        self.assertEqual(len(pooled), 3)



class PrecomputedProfilesTests(unittest.TestCase):
    def test_precomputed_energy_and_events_skip_extraction(self):
        energy = [
            {"time": float(t), "rms_db": -5.0 if 28 <= t <= 32 else -30.0}
            for t in range(120)
        ]
        events = [{"time": 30.0, "laughter": 0.5, "cheering": 0.0, "screaming": 0.0, "speech": 0.0}]

        def _boom(*args, **kwargs):
            raise AssertionError("source audio must not be re-extracted")

        orig_energy, orig_events = sal.extract_audio_energy, sal.extract_audio_events
        sal.extract_audio_energy, sal.extract_audio_events = _boom, _boom
        try:
            clips = sal.detect_highlights(
                "/nonexistent.mp4",
                profile_name="party",
                energy_data=energy,
                events_data=events,
                min_dur=8.0,
                max_dur=30.0,
            )
        finally:
            sal.extract_audio_energy, sal.extract_audio_events = orig_energy, orig_events

        self.assertTrue(clips)
        self.assertTrue(any("reaction" in c["reasons"] for c in clips))

    def test_empty_events_list_counts_as_precomputed(self):
        energy = [{"time": float(t), "rms_db": -30.0} for t in range(60)]

        def _boom(*args, **kwargs):
            raise AssertionError("events must not be re-extracted")

        orig_events = sal.extract_audio_events
        sal.extract_audio_events = _boom
        try:
            clips = sal.detect_highlights(
                "/nonexistent.mp4",
                profile_name="party",
                energy_data=energy,
                events_data=[],
            )
        finally:
            sal.extract_audio_events = orig_events
        self.assertIsInstance(clips, list)


class DifferentMomentsTests(unittest.TestCase):
    @staticmethod
    def detect(**kwargs):
        energy = [{"time": float(t), "rms_db": -30 + ({10: 30, 35: 25, 60: 20, 85: 15}.get(t, 0))}
                  for t in range(100)]
        return sal.detect_highlights('/nonexistent.mp4', profile_name='auto',
            energy_data=energy, events_data=[], **kwargs)

    def test_exclusions_are_applied_before_count_cap(self):
        first = self.detect(top_n=2, min_dur=5, max_dur=10)
        ranges = [{"start": c['start_second'], "end": c['end_second']} for c in first]
        second = self.detect(top_n=2, min_dur=5, max_dur=10, excluded_ranges=ranges)
        self.assertEqual(len(first), 2)
        self.assertEqual(len(second), 2)
        for c in second:
            self.assertFalse(sal.overlaps(c['start_second'], c['end_second'], ranges))
        ranges += [{"start": c['start_second'], "end": c['end_second']} for c in second]
        self.assertEqual(self.detect(top_n=2, min_dur=5, max_dur=10, excluded_ranges=ranges), [])

    def test_one_batch_has_no_overlapping_windows(self):
        clips = self.detect(top_n=10, min_dur=30, max_dur=35)
        self.assertGreater(len(clips), 1)
        for a, b in zip(clips, clips[1:]):
            self.assertLessEqual(a['end_second'], b['start_second'])

    def test_sentence_and_source_edges_obey_hard_limits(self):
        for segments in (None, [{"start": 0, "end": 200}], [{"start": 3, "end": 3.2}]):
            for peak in (0, .1, 3, 50, 99.9, 100):
                for minimum, maximum in ((1, 1), (7.2, 8.3), (20, 20), (1.04, 1.19)):
                    with self.subTest(segments=segments, peak=peak, limits=(minimum, maximum)):
                        a, b, _ = sal._window_for_peak(peak, .5, get_profile('auto'), 100.04,
                            np.zeros(101), minimum, maximum, segments)
                        self.assertGreaterEqual(a, 0)
                        self.assertLessEqual(b, 100.04)
                        self.assertGreaterEqual(round(b - a, 4), minimum)
                        self.assertLessEqual(round(b - a, 4), maximum)
                        self.assertLessEqual(a, peak)
                        self.assertGreaterEqual(b, peak)

    def test_partial_last_second_cannot_extend_past_source(self):
        with mock.patch.object(sal.os.path, 'isfile', return_value=True), \
             mock.patch('services.media_probe.get_media_duration_seconds', return_value=60.25):
            clips = self.detect(top_n=10, min_dur=8, max_dur=12)
        self.assertTrue(clips)
        self.assertTrue(all(c['end_second'] <= 60.25 for c in clips))

    def test_invalid_limits_rejected_before_analysis(self):
        for n, a, b in ((0, 5, 10), (1.5, 5, 10), (2, 10, 5), (2, float('nan'), 10),
                        (2, 1, float('inf')), (2, 0, 5), (2, 1.01, 1.09)):
            with self.subTest(n=n, a=a, b=b), self.assertRaises(ValueError):
                sal.detect_highlights('missing.mp4', top_n=n, min_dur=a, max_dur=b)

    def test_pooled_exclusions_belong_to_their_source(self):
        excluded = [{"source": 'a.mp4', "start": 10, "end": 20}]
        with mock.patch.object(sal, 'detect_highlights', return_value=[]) as detect:
            sal.detect_highlights_pooled(['a.mp4', 'b.mp4'], excluded_ranges=excluded)
        self.assertEqual(detect.call_args_list[0].kwargs['excluded_ranges'], excluded)
        self.assertEqual(detect.call_args_list[1].kwargs['excluded_ranges'], [])


if __name__ == "__main__":
    unittest.main()
