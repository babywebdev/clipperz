"""Tests for backend.services.video_cut.

Command shapes, the single-segment shortcut path and concat cleanup are
checked against a mocked proc_run. Cut accuracy is checked against real
ffmpeg on a synthetic clip with a known GOP structure.
"""

import os
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_ROOT = os.path.join(ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from services import video_cut


def _ok() -> mock.Mock:
    return mock.Mock(returncode=0, stdout="", stderr="")


def _fail() -> mock.Mock:
    return mock.Mock(returncode=1, stdout="", stderr="ffmpeg error")


class CutSegmentTests(unittest.TestCase):
    def setUp(self):
        self.log_dir = tempfile.TemporaryDirectory(prefix="podcli-cut-logs-")
        self.addCleanup(self.log_dir.cleanup)
        patcher = mock.patch.dict(video_cut.paths, {"logs": self.log_dir.name})
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_runs_ffmpeg_with_expected_flags(self):
        with mock.patch.object(video_cut, "proc_run", return_value=_ok()) as mocked:
            out = video_cut.cut_segment("/in.mp4", "/out.mp4", 10.5, 20.25)
            self.assertEqual(out, "/out.mp4")

        cmd = mocked.call_args.args[0]
        joined = " ".join(cmd)
        self.assertIn("-ss 10.5", joined)
        self.assertIn("-t 9.75", joined)  # end - start
        self.assertIn("-i /in.mp4", joined)
        self.assertTrue(cmd[-1] == "/out.mp4")

    def test_raises_on_failure(self):
        with mock.patch.object(video_cut, "proc_run", return_value=_fail()):
            with self.assertRaises(RuntimeError) as ctx:
                video_cut.cut_segment("/in.mp4", "/out.mp4", 0, 5)
            self.assertIn("FFmpeg cut failed", str(ctx.exception))

    def test_native_crash_keeps_exit_code_and_full_log_outside_render_directory(self):
        stderr = "Important diagnostic at the beginning\n" + "metadata\n" * 1000
        failed = mock.Mock(returncode=3221225477, stderr=stderr)
        with tempfile.TemporaryDirectory() as render_dir:
            output = str(Path(render_dir) / "cut.mp4")
            with mock.patch.object(video_cut, "proc_run", return_value=failed):
                with self.assertRaises(RuntimeError) as ctx:
                    video_cut.cut_segment("/in.mp4", output, 23.3, 60.8)
        self.assertIn("0xC0000005", str(ctx.exception))
        saved_logs = list(Path(self.log_dir.name).rglob("*.json"))
        self.assertEqual(len(saved_logs), 1)
        saved = json.loads(saved_logs[0].read_text(encoding="utf-8"))
        self.assertEqual(saved["stderr"], stderr)
        self.assertEqual(saved["returncode"], 3221225477)
        self.assertIn("23.3", saved["command"])
        self.assertIn(str(saved_logs[0]), str(ctx.exception))

    def test_timeout_is_reported_and_preserved(self):
        failure = video_cut.ProcError(["ffmpeg"], -1, "timeout after 300s: partial output", 300)
        with mock.patch.object(video_cut, "proc_run", side_effect=failure):
            with self.assertRaises(RuntimeError) as ctx:
                video_cut.cut_segment("/in.mp4", "/out.mp4", 0, 5)
        self.assertIn("timed out after 300s", str(ctx.exception))
        saved = json.loads(next(Path(self.log_dir.name).rglob("*.json")).read_text(encoding="utf-8"))
        self.assertTrue(saved["timed_out"])
        self.assertIn("partial output", saved["stderr"])

    def test_log_write_failure_preserves_original_ffmpeg_failure(self):
        with mock.patch.object(video_cut, "proc_run", return_value=_fail()), \
             mock.patch.object(Path, "write_text", side_effect=OSError("disk full")), \
             self.assertLogs(video_cut.__name__, level="ERROR"):
            with self.assertRaises(RuntimeError) as ctx:
                video_cut.cut_segment("/in.mp4", "/out.mp4", 0, 5)
        self.assertIn("exit 1", str(ctx.exception))
        self.assertIn("ffmpeg error", str(ctx.exception))


class CutMultiSegmentTests(unittest.TestCase):
    def test_single_segment_delegates_to_cut_segment(self):
        with mock.patch.object(video_cut, "cut_segment", return_value="/out.mp4") as cs:
            out = video_cut.cut_multi_segment(
                "/in.mp4", "/out.mp4", [{"start": 0, "end": 5}]
            )
            self.assertEqual(out, "/out.mp4")
            cs.assert_called_once_with("/in.mp4", "/out.mp4", 0, 5)

    def test_multi_segment_invokes_cut_then_concat(self):
        # Two-segment flow: two cut_segment calls + one proc_run for concat
        tmpdir = tempfile.mkdtemp(prefix="podcli-cut-test-")
        out_path = os.path.join(tmpdir, "out.mp4")

        def fake_cut(input_path, out_path, start, end):
            # Create a stub file so cleanup works
            with open(out_path, "w") as f:
                f.write("stub")
            return out_path

        try:
            with mock.patch.object(
                video_cut, "cut_segment", side_effect=fake_cut
            ) as cs, mock.patch.object(
                video_cut, "proc_run", return_value=_ok()
            ) as mocked:
                out = video_cut.cut_multi_segment(
                    "/in.mp4",
                    out_path,
                    [
                        {"start": 0, "end": 5},
                        {"start": 10, "end": 15},
                    ],
                )
                self.assertEqual(out, out_path)
                self.assertEqual(cs.call_count, 2)
                # concat call
                cmd = mocked.call_args.args[0]
                self.assertIn("concat", cmd)
                self.assertIn("-c", cmd)
                self.assertIn("copy", cmd)

            # Temp parts should be cleaned up
            for i in range(2):
                self.assertFalse(os.path.exists(os.path.join(tmpdir, f"_part_{i}.mp4")))
            self.assertFalse(os.path.exists(os.path.join(tmpdir, "_concat_parts.txt")))
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    def test_multi_segment_cleans_up_on_failure(self):
        tmpdir = tempfile.mkdtemp(prefix="podcli-cut-test-")
        out_path = os.path.join(tmpdir, "out.mp4")

        def fake_cut(input_path, out_path, start, end):
            with open(out_path, "w") as f:
                f.write("stub")
            return out_path

        try:
            with mock.patch.object(video_cut, "cut_segment", side_effect=fake_cut), \
                 mock.patch.object(video_cut, "proc_run", return_value=_fail()):
                with self.assertRaises(RuntimeError):
                    video_cut.cut_multi_segment(
                        "/in.mp4", out_path,
                        [{"start": 0, "end": 5}, {"start": 10, "end": 15}],
                    )
            # Even on failure, temp parts are cleaned up
            for i in range(2):
                self.assertFalse(os.path.exists(os.path.join(tmpdir, f"_part_{i}.mp4")))
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)


class ReExportTests(unittest.TestCase):
    def test_video_processor_reexports_cut_helpers(self):
        from services import video_processor as vp
        self.assertIs(vp.cut_segment, video_cut.cut_segment)
        self.assertIs(vp.cut_multi_segment, video_cut.cut_multi_segment)



class NoStreamCopyTests(unittest.TestCase):
    def test_cut_always_re_encodes(self):
        with mock.patch.object(video_cut, "proc_run", return_value=_ok()) as mocked:
            video_cut.cut_segment("/in.mp4", "/out.mp4", 3.98, 6.0)

        self.assertEqual(mocked.call_count, 1)
        joined = " ".join(mocked.call_args.args[0])
        self.assertIn("libx264", joined)
        self.assertNotIn("-c copy", joined)
        self.assertNotIn("ffprobe", joined)


@unittest.skipUnless(
    shutil.which("ffmpeg") and shutil.which("ffprobe"), "ffmpeg/ffprobe not installed"
)
class CutContentAccuracyTests(unittest.TestCase):
    """Cut off the keyframe grid of a known 2s GOP and check the content that
    lands at t=0, not just the clip's duration."""

    COLORS = ["red", "green", "blue", "yellow", "cyan", "magenta", "white", "gray"]
    RGB = {
        "red": (255, 0, 0), "green": (0, 128, 0), "blue": (0, 0, 255),
        "yellow": (255, 255, 0), "cyan": (0, 255, 255), "magenta": (255, 0, 255),
        "white": (255, 255, 255), "gray": (128, 128, 128),
    }

    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.mkdtemp(prefix="podcli-gop-test-")
        cls.src = os.path.join(cls.tmpdir, "src.mp4")
        cmd = ["ffmpeg", "-y", "-loglevel", "error"]
        for color in cls.COLORS:
            cmd += ["-f", "lavfi", "-i", f"color=c={color}:s=64x64:r=25:d=1"]
        cmd += [
            "-filter_complex", f"concat=n={len(cls.COLORS)}:v=1:a=0",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-g", "50", "-keyint_min", "50", "-sc_threshold", "0",
            cls.src,
        ]
        subprocess.run(cmd, check=True, capture_output=True)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmpdir, ignore_errors=True)

    def _first_frame_rgb(self, path):
        raw = subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-i", path, "-frames:v", "1",
             "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
            check=True, capture_output=True,
        ).stdout
        px = list(raw)
        n = len(px) // 3
        return tuple(round(sum(px[c::3]) / n) for c in range(3))

    def _assert_frame_is(self, path, color):
        got = self._first_frame_rgb(path)
        want = self.RGB[color]
        for got_c, want_c in zip(got, want):
            self.assertLessEqual(
                abs(got_c - want_c), 24,
                f"first frame {got} is not {color} {want}",
            )

    def test_cut_just_before_a_keyframe_starts_at_the_requested_second(self):
        # Keyframes land on 0/2/4/6. A cut at 3.9 must open on second 3
        # (yellow), never on the keyframe-2 content (blue) that a stream copy
        # would seek back to.
        out = os.path.join(self.tmpdir, "cut_off_grid.mp4")
        video_cut.cut_segment(self.src, out, 3.9, 6.0)
        self._assert_frame_is(out, "yellow")

    def test_cut_mid_gop_starts_at_the_requested_second(self):
        out = os.path.join(self.tmpdir, "cut_mid_gop.mp4")
        video_cut.cut_segment(self.src, out, 5.5, 7.0)
        self._assert_frame_is(out, "magenta")

    def test_cut_on_a_keyframe_starts_at_the_requested_second(self):
        out = os.path.join(self.tmpdir, "cut_on_kf.mp4")
        video_cut.cut_segment(self.src, out, 4.0, 5.0)
        self._assert_frame_is(out, "cyan")

    def test_cut_preserves_zero_presentation_start_with_aac_audio(self):
        source = os.path.join(self.tmpdir, "with_audio.mp4")
        output = os.path.join(self.tmpdir, "audio_cut.mp4")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=s=64x64:r=30:d=1",
                        "-f", "lavfi", "-i", "sine=frequency=500:sample_rate=22050:duration=1",
                        "-c:v", "libx264", "-c:a", "aac", source], capture_output=True, check=True)
        video_cut.cut_segment(source, output, 0, 1)
        streams = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-of", "json", output],
                                           capture_output=True, check=True).stdout)["streams"]
        self.assertEqual({s["codec_type"] for s in streams}, {"audio", "video"})
        for stream in streams:
            self.assertLess(abs(float(stream["start_time"])), .005, "AAC encoder padding must not shift presentation timestamps")


if __name__ == "__main__":
    unittest.main()
