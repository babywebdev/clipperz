"""Opening thumbnail card composer (Writing Studio 1B.2b.1).

- Request validation and frame arithmetic, without media.
- Real compositions of synthetic raw renders (skipped without ffmpeg): every
  raw second has its own colour and tone, the card image is orange with a
  blue centre, so decoded frames and audio show where the card ends and the
  raw render begins, and a cross-correlation measures the audio offset.
- Faults at the raw and image checks, group and staging creation, image copy,
  composition, measurement and publication, with earlier groups kept intact.
"""

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from fractions import Fraction
from unittest import mock

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_ROOT = os.path.join(ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from services import clip_generator as cg
from services import opening_card as oc
from services.exact_render import ExactRenderError, ExactRenderVerificationError

HAVE_FFMPEG = bool(shutil.which("ffmpeg") and shutil.which("ffprobe"))
STEM = "Card_clip_short_card-test"


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def _tree(root):
    """{relative path: bytes} for every file beneath root."""
    files = {}
    for dirpath, _dirs, names in os.walk(root):
        for name in names:
            path = os.path.join(dirpath, name)
            with open(path, "rb") as f:
                files[os.path.relpath(path, root)] = f.read()
    return files


def _run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)


class RequestValidationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="podcli-card-validate-")
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.out = os.path.join(self.tmp, "namespace")
        os.makedirs(os.path.join(self.out, "raw-group", "final"))
        self.raw = os.path.join(self.out, "raw-group", "final", "clip.mp4")
        self.image = os.path.join(self.tmp, "card.png")
        for path in (self.raw, self.image):
            with open(path, "wb") as f:
                f.write(b"bytes")
        self.good = dict(raw_video_path=self.raw, raw_sha256="a" * 64, image_path=self.image, image_sha256="b" * 64,
                         output_dir=self.out, group_stem=STEM, placement="opening", duration=1.5)

    def test_the_supported_card_passes(self):
        oc.validate_card_request(**self.good)

    def test_other_placements_durations_and_malformed_fields_are_refused_without_coercion(self):
        outside = os.path.join(self.tmp, "outside.mp4")
        with open(outside, "wb") as f:
            f.write(b"x")
        gif = os.path.join(self.tmp, "card.gif")
        with open(gif, "wb") as f:
            f.write(b"x")
        cases = {
            "closing placement": dict(placement="closing"),
            "missing placement": dict(placement=None),
            "longer card": dict(duration=2.0),
            "string duration": dict(duration="1.5"),
            "bool duration": dict(duration=True),
            "upper-case hash": dict(image_sha256="B" * 64),
            "short hash": dict(raw_sha256="a" * 63),
            "stem with separator": dict(group_stem="../escape"),
            "stem with dots": dict(group_stem="a..b"),
            "relative raw": dict(raw_video_path="clip.mp4"),
            "missing image": dict(image_path=os.path.join(self.tmp, "gone.png")),
            "unsupported image type": dict(image_path=gif),
            "relative output_dir": dict(output_dir="namespace"),
            "raw outside output_dir": dict(raw_video_path=outside),
        }
        before = _tree(self.tmp)
        for label, change in cases.items():
            with self.subTest(label), self.assertRaises(ExactRenderError):
                oc.validate_card_request(**{**self.good, **change})
        self.assertEqual(_tree(self.tmp), before)

    def test_card_frames_are_the_whole_frames_nearest_one_and_a_half_seconds(self):
        cases = {
            Fraction(1, 25): 38,          # 37.5 frames: ties round up
            Fraction(1, 30): 45,
            Fraction(1001, 30000): 45,    # 44.955
            Fraction(1001, 24000): 36,    # 35.964
            Fraction(1, 24): 36,
            Fraction(1, 50): 75,
            Fraction(1001, 60000): 90,    # 89.91
            Fraction(1, 15): 23,          # 22.5
        }
        for frame, frames in cases.items():
            with self.subTest(frame=str(frame)):
                self.assertEqual(oc.card_frame_count(frame), frames)
                self.assertLessEqual(abs(frames * frame - Fraction(3, 2)), frame / 2)

    def test_the_leading_frame_duration_ignores_a_later_join_gap(self):
        packets = [(806 + 512 * i, 512) for i in range(48)] + [(25382, 1152)] + [(26534 + 512 * i, 512) for i in range(26)]
        self.assertEqual(oc.leading_frame_ticks(packets), 512)
        # Without packet durations the timestamp spacing decides.
        self.assertEqual(oc.leading_frame_ticks([(1001 * i, 0) for i in range(10)]), 1001)
        with self.assertRaises(ExactRenderVerificationError):
            oc.leading_frame_ticks([(0, 0)])


class BridgeTests(unittest.TestCase):
    def test_compose_opening_card_passes_its_fields_through_and_emits_the_receipt(self):
        import main as backend_main
        captured, emitted = {}, []
        params = {"raw_video_path": "r", "raw_sha256": "s", "image_path": "i", "image_sha256": "h",
                  "output_dir": "o", "group_stem": "g", "placement": "opening", "duration": 1.5, "ignored": 1}
        with mock.patch("services.opening_card.compose_opening_card",
                        side_effect=lambda **kw: captured.update(kw) or {"version": 1}), \
             mock.patch.object(backend_main, "emit_result", side_effect=lambda *a, **k: emitted.append((a, k))), \
             mock.patch.object(backend_main, "emit_progress"):
            backend_main.handle_compose_opening_card("t1", params)
        self.assertEqual(captured, {k: v for k, v in params.items() if k != "ignored"})
        self.assertEqual(emitted[0][1]["data"], {"version": 1})
        self.assertIs(backend_main.TASK_HANDLERS["compose_opening_card"], backend_main.handle_compose_opening_card)


@unittest.skipUnless(HAVE_FFMPEG, "ffmpeg/ffprobe not installed")
class CardMediaTests(unittest.TestCase):
    COLORS = ["red", "green", "cyan", "yellow"]
    RGB = {"red": (255, 0, 0), "green": (0, 128, 0), "cyan": (0, 255, 255), "yellow": (255, 255, 0),
           "orange": (255, 165, 0), "blue": (0, 0, 255), "black": (0, 0, 0)}
    TONES = [500, 1300, 700, 1900]

    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.mkdtemp(prefix="podcli-card-media-")
        cls.image = os.path.join(cls.tmpdir, "card.png")
        _run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=orange:s=320x180:d=1",
              "-vf", "drawbox=x=130:y=60:w=60:h=60:color=blue:t=fill", "-frames:v", "1", cls.image])
        cls.other_image = os.path.join(cls.tmpdir, "other.jpg")
        _run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=blue:s=180x320:d=1",
              "-frames:v", "1", cls.other_image])
        cls.fixtures = {}

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmpdir, ignore_errors=True)

    def setUp(self):
        self.out = tempfile.mkdtemp(prefix="podcli-card-ns-", dir=self.tmpdir)
        self.addCleanup(shutil.rmtree, self.out, ignore_errors=True)

    # -- fixtures ------------------------------------------------------------

    @classmethod
    def _raw(cls, name, *, size="216x384", rate="25", sample_rate=44100, channels=1, audio=True,
             video_delay=None, gap_after=None):
        """A synthetic raw render: one colour and tone per second, optionally with
        video starting after audio and a timestamp gap, as renders with an outro have."""
        key = (name, size, rate, sample_rate, channels, audio, video_delay, gap_after)
        if key in cls.fixtures:
            return cls.fixtures[key]
        work = tempfile.mkdtemp(prefix=f"raw-{name}-", dir=cls.tmpdir)
        video = os.path.join(work, "video.mp4")
        cmd = ["ffmpeg", "-y", "-loglevel", "error"]
        for color in cls.COLORS:
            cmd += ["-f", "lavfi", "-i", f"color=c={color}:s={size}:r={rate}:d=1"]
        chain = "".join(f"[{i}:v]" for i in range(len(cls.COLORS)))
        graph = f"{chain}concat=n={len(cls.COLORS)}:v=1:a=0[c]"
        if gap_after is not None:
            graph += f";[c]setpts='PTS+if(gte(N,{gap_after}),0.045/TB,0)'[v]"
        else:
            graph += ";[c]null[v]"
        cmd += ["-filter_complex", graph, "-map", "[v]", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
                "-fps_mode", "passthrough", video]
        _run(cmd)
        raw = os.path.join(work, "raw.mp4")
        if not audio:
            shutil.copy2(video, raw)
        else:
            sound = os.path.join(work, "audio.m4a")
            cmd = ["ffmpeg", "-y", "-loglevel", "error"]
            for tone in cls.TONES:
                cmd += ["-f", "lavfi", "-i", f"sine=frequency={tone}:sample_rate={sample_rate}:duration=1"]
            chain = "".join(f"[{i}:a]" for i in range(len(cls.TONES)))
            cmd += ["-filter_complex", f"{chain}concat=n={len(cls.TONES)}:v=0:a=1[a]", "-map", "[a]",
                    "-ac", str(channels), "-c:a", "aac", "-b:a", "128k", sound]
            _run(cmd)
            cmd = ["ffmpeg", "-y", "-loglevel", "error"]
            if video_delay is not None:
                cmd += ["-itsoffset", str(video_delay)]
            cmd += ["-i", video, "-i", sound, "-map", "0:v", "-map", "1:a", "-c", "copy", raw]
            _run(cmd)
        cls.fixtures[key] = raw
        return raw

    def _place_raw(self, raw):
        """Copy a raw fixture into a renderer-like group under this test's namespace."""
        final = os.path.join(self.out, "Card_clip_short-raw", "final")
        os.makedirs(final, exist_ok=True)
        path = os.path.join(final, "Card_clip_short.mp4")
        shutil.copy2(raw, path)
        return path

    def _compose(self, raw_path, image=None, **kw):
        image = image or self.image
        params = dict(raw_video_path=raw_path, raw_sha256=_sha256(raw_path), image_path=image,
                      image_sha256=_sha256(image), output_dir=self.out, group_stem=STEM)
        params.update(kw)
        return oc.compose_opening_card(**params)

    def _groups(self):
        return sorted(n for n in os.listdir(self.out) if n.startswith(f"{STEM}-"))

    # -- decoding ------------------------------------------------------------

    def _probe(self, path):
        return json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path],
                                         check=True, capture_output=True).stdout)

    def _rgb(self, path, t, x="(iw-8)/2", y="(ih-8)/2"):
        raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1",
                              "-vf", f"crop=8:8:{x}:{y}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                             check=True, capture_output=True).stdout
        n = len(raw) // 3
        return tuple(round(sum(raw[c::3]) / n) for c in range(3))

    def _assert_rgb(self, path, t, color, **kw):
        got, want = self._rgb(path, t, **kw), self.RGB[color]
        for g, w in zip(got, want):
            self.assertLessEqual(abs(g - w), 30, f"frame at {t:.3f}s is {got}, not {color} {want}")

    def _pcm(self, path, rate):
        import numpy as np
        raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-vn", "-f", "f32le", "-ac", "1", "-ar", str(rate), "-"],
                             check=True, capture_output=True).stdout
        return np.frombuffer(raw, dtype=np.float32)

    def _audio_lag(self, raw_path, out_path, rate, card_seconds):
        """Samples by which the raw audio sits later than the card offset in the composed
        file, measured by cross-correlation over the raw tone change at 1.0 s."""
        import numpy as np
        raw, out = self._pcm(raw_path, rate), self._pcm(out_path, rate)
        offset = round(card_seconds * rate)
        s0, s1 = int(0.6 * rate), int(1.4 * rate)
        ref = raw[s0:s1]
        best, best_lag = None, None
        for lag in range(-1024, 1025):
            seg = out[offset + s0 + lag:offset + s1 + lag]
            score = float(np.dot(seg, ref))
            if best is None or score > best:
                best, best_lag = score, lag
        silence = float(np.max(np.abs(out[:max(1, offset - 2048)])))
        return best_lag, silence

    # -- composition ---------------------------------------------------------

    def _assert_composed(self, receipt, raw_path, *, frames, frame_ticks, time_base, sample_rate=44100, audio=True):
        raw_bytes = _sha256(raw_path)
        out = receipt["output"]["path"]
        group = os.path.dirname(os.path.dirname(out))
        self.assertEqual(os.path.dirname(group), self.out)
        self.assertTrue(os.path.basename(group).startswith(f"{STEM}-"))
        self.assertEqual(sorted(os.listdir(group)), ["final"])
        self.assertEqual(sorted(os.listdir(os.path.join(group, "final"))), sorted([os.path.basename(out), os.path.basename(receipt["card"]["image_path"])]))
        self.assertEqual(_sha256(receipt["card"]["image_path"]), receipt["card"]["image_sha256"])
        self.assertEqual(receipt["raw"]["sha256"], raw_bytes)
        card = receipt["card"]
        self.assertEqual((card["frames"], card["frame_ticks"]), (frames, frame_ticks))
        self.assertEqual(card["measured_ticks"], frames * frame_ticks)
        self.assertAlmostEqual(card["measured_duration"], float(frames * frame_ticks * time_base), places=9)
        self.assertLessEqual(abs(card["measured_duration"] - 1.5), float(frame_ticks * time_base) / 2 + 1e-9)
        self.assertEqual((receipt["transition"], receipt["overlap"], receipt["placement"]), ("hardcut", 0, "opening"))
        self.assertEqual(receipt["output"]["video"]["packets"], receipt["raw"]["video"]["packets"] + frames)
        for key in ("width", "height", "sample_aspect_ratio", "time_base"):
            self.assertEqual(receipt["output"]["video"][key], receipt["raw"]["video"][key], key)
        self.assertEqual(os.path.getsize(out), receipt["output"]["file_size_bytes"])
        if audio:
            lag, silence = self._audio_lag(raw_path, out, sample_rate, card["measured_duration"])
            self.assertEqual(lag, 0, "raw audio is not at the card offset")
            self.assertLess(silence, 0.01, "the card is not silent")
            self.assertEqual(card["audio_samples"], int(Fraction(frames * frame_ticks) * time_base * sample_rate))
        else:
            self.assertIsNone(receipt["output"]["audio"])
            self.assertIsNone(card["audio_samples"])
            self.assertIn("no audio", card["audio_note"])
        return out

    def test_the_card_is_prepended_once_for_every_format_with_the_raw_render_shifted_exactly(self):
        # The 16:9 image is letterboxed in vertical and square frames and fills a horizontal one.
        for size, pad in (("216x384", True), ("384x216", False), ("256x256", True)):
            with self.subTest(size=size):
                shutil.rmtree(self.out)
                os.makedirs(self.out)
                raw = self._place_raw(self._raw("fmt", size=size))
                before = _sha256(raw)
                receipt = self._compose(raw)
                out = self._assert_composed(receipt, raw, frames=38, frame_ticks=512, time_base=Fraction(1, 12800))
                self.assertEqual(_sha256(raw), before)
                w, h = (int(v) for v in size.split("x"))
                probe = self._probe(out)
                video = next(s for s in probe["streams"] if s["codec_type"] == "video")
                self.assertEqual((video["width"], video["height"]), (w, h))
                # The card: the image centre (blue), its orange body, black padding, silence.
                self._assert_rgb(out, 0.2, "blue")
                self._assert_rgb(out, 1.3, "blue")
                self._assert_rgb(out, 0.7, "orange", x="4", y="(ih-8)/2")
                self._assert_rgb(out, 0.7, "black" if pad else "orange", x="(iw-8)/2", y="2")
                # The raw render follows at 1.52 s, second by second, with no card frame after it.
                self._assert_rgb(out, 1.52 + 0.02, "red")
                self._assert_rgb(out, 1.52 + 0.5, "red")
                self._assert_rgb(out, 1.52 + 1.5, "green")
                self._assert_rgb(out, 1.52 + 3.5, "yellow")

    def test_ntsc_rate_and_stereo_48k_keep_the_raw_frame_timing(self):
        raw = self._place_raw(self._raw("ntsc", rate="30000/1001", sample_rate=48000, channels=2))
        receipt = self._compose(raw)
        tb = Fraction(receipt["raw"]["video"]["time_base"])
        ticks = receipt["card"]["frame_ticks"]
        self.assertEqual(ticks * tb, Fraction(1001, 30000))
        self._assert_composed(receipt, raw, frames=45, frame_ticks=ticks, time_base=tb, sample_rate=48000)
        self.assertAlmostEqual(receipt["card"]["measured_duration"], 1.5015, places=6)
        self.assertEqual((receipt["output"]["audio"]["sample_rate"], receipt["output"]["audio"]["channels"]), (48000, 2))

    def test_a_late_video_start_and_a_join_gap_survive_the_shift(self):
        raw = self._place_raw(self._raw("gap", video_delay=0.0625, gap_after=60))
        raw_probe = self._probe(raw)
        raw_video = next(s for s in raw_probe["streams"] if s["codec_type"] == "video")
        self.assertGreater(float(raw_video["start_time"]), 0.05)
        receipt = self._compose(raw)
        tb = Fraction(receipt["raw"]["video"]["time_base"])
        out = self._assert_composed(receipt, raw, frames=38, frame_ticks=receipt["card"]["frame_ticks"], time_base=tb)
        # The raw video still starts one late start after its audio, now after the card.
        self.assertEqual(receipt["output"]["video"]["first_pts"], 0)
        self._assert_rgb(out, 1.52 + 0.0625 + 0.1, "red")

    def test_a_silent_raw_render_gets_a_video_only_card_and_says_so(self):
        raw = self._place_raw(self._raw("silent", audio=False))
        receipt = self._compose(raw, image=self.other_image)
        out = self._assert_composed(receipt, raw, frames=38, frame_ticks=512, time_base=Fraction(1, 12800), audio=False)
        self.assertEqual([s["codec_type"] for s in self._probe(out)["streams"]], ["video"])
        self.assertTrue(receipt["card"]["image_path"].endswith("card-image.jpg"))
        self._assert_rgb(out, 0.7, "blue")

    def test_each_composition_is_a_new_group_and_earlier_groups_stay_byte_identical(self):
        raw = self._place_raw(self._raw("repeat"))
        first = self._compose(raw)
        first_group = os.path.dirname(os.path.dirname(first["output"]["path"]))
        first_files = _tree(first_group)
        second = self._compose(raw, image=self.other_image)
        self.assertNotEqual(os.path.dirname(os.path.dirname(second["output"]["path"])), first_group)
        self.assertEqual(len(self._groups()), 2)
        self.assertEqual(_tree(first_group), first_files)
        self._assert_rgb(first["output"]["path"], 0.2, "blue")

    # -- faults --------------------------------------------------------------

    def _prepare_prior(self):
        self.raw = self._place_raw(self._raw("faults"))
        self.prior = os.path.dirname(os.path.dirname(self._compose(self.raw)["output"]["path"]))
        self.prior_files = _tree(self.prior)
        self.raw_hash = _sha256(self.raw)
        self.listing = sorted(os.listdir(self.out))

    def _assert_untouched(self, extra_groups=()):
        self.assertEqual(sorted(os.listdir(self.out)), sorted(self.listing + list(extra_groups)))
        self.assertEqual(_tree(self.prior), self.prior_files)
        self.assertEqual(_sha256(self.raw), self.raw_hash)

    def _counting_proc(self):
        calls = []
        real = oc.proc_run

        def run(cmd, **kw):
            calls.append(list(cmd))
            return real(cmd, **kw)

        return calls, mock.patch.object(oc, "proc_run", side_effect=run)

    def _encodes(self, calls):
        return [c for c in calls if c and c[0] == "ffmpeg"]

    def test_a_changed_raw_render_or_image_is_refused_before_anything_is_encoded(self):
        self._prepare_prior()
        calls, patch = self._counting_proc()
        with patch:
            with self.assertRaisesRegex(ExactRenderVerificationError, "raw render changed"):
                self._compose(self.raw, raw_sha256="0" * 64)
            with self.assertRaisesRegex(ExactRenderVerificationError, "not the one the save captured"):
                self._compose(self.raw, image_sha256="0" * 64)
        self.assertEqual(self._encodes(calls), [])
        self._assert_untouched()

    def test_an_image_replaced_between_copy_and_check_is_refused_and_the_group_removed(self):
        self._prepare_prior()
        real_copy = cg.shutil.copy2

        def swap(src, dst, *a, **kw):
            # Same size, different bytes: the copy's size check passes, its hash cannot.
            real_copy(src, dst, *a, **kw)
            if src == self.image:
                with open(dst, "r+b") as f:
                    f.seek(-1, os.SEEK_END)
                    last = f.read(1)
                    f.seek(-1, os.SEEK_END)
                    f.write(bytes([last[0] ^ 0xFF]))
            return dst

        calls, patch = self._counting_proc()
        with patch, mock.patch.object(cg.shutil, "copy2", side_effect=swap):
            with self.assertRaisesRegex(ExactRenderVerificationError, "not the one the save captured"):
                self._compose(self.raw)
        self.assertEqual(self._encodes(calls), [])
        self._assert_untouched()

    def test_failures_after_the_group_is_acquired_remove_only_that_group(self):
        self._prepare_prior()
        real_mkdir, real_rename = os.mkdir, os.rename
        real_probe = oc.probe_streams

        def deny_staging(path, *a, **kw):
            if os.path.basename(str(path)) == cg._ExactOutputGroup.STAGING:
                raise PermissionError("injected: staging")
            return real_mkdir(path, *a, **kw)

        def deny_parent(path, *a, **kw):
            if os.path.basename(str(path)).startswith(f"{STEM}-"):
                raise PermissionError("injected: parent")
            return real_mkdir(path, *a, **kw)

        def fail_copy(src, dst, *a, **kw):
            raise OSError("injected: copy")

        def fail_encode(cmd, **kw):
            if cmd[0] == "ffmpeg":
                return subprocess.CompletedProcess(cmd, 1, "", "injected: encoder exploded")
            return oc_real_run(cmd, **kw)

        def shifted_probe(path):
            measured = real_probe(path)
            if os.sep + "staging" + os.sep in path:
                packets = measured["video"]["packets"]
                # The card and the first raw frame in place; every later raw frame one tick late.
                measured["video"]["packets"] = packets[:39] + [(pts + 1, d) for pts, d in packets[39:]]
            return measured

        def silent_probe(path):
            measured = real_probe(path)
            if os.sep + "staging" + os.sep in path:
                measured["audio"] = None
            return measured

        def deny_rename(src, dst):
            if os.path.basename(dst) == cg._ExactOutputGroup.FINAL:
                raise PermissionError("injected: rename")
            return real_rename(src, dst)

        oc_real_run = oc.proc_run
        cases = [
            ("parent creation", mock.patch.object(cg.os, "mkdir", side_effect=deny_parent), PermissionError, "injected: parent"),
            ("staging creation", mock.patch.object(cg.os, "mkdir", side_effect=deny_staging), PermissionError, "injected: staging"),
            ("image copy", mock.patch.object(cg.shutil, "copy2", side_effect=fail_copy), OSError, "injected: copy"),
            ("composition", mock.patch.object(oc, "proc_run", side_effect=fail_encode), ExactRenderVerificationError, "encoder exploded"),
            ("placement measurement", mock.patch.object(oc, "probe_streams", side_effect=shifted_probe), ExactRenderVerificationError, "raw frame 1 is at"),
            ("lost audio", mock.patch.object(oc, "probe_streams", side_effect=silent_probe), ExactRenderVerificationError, "audio presence"),
            ("publication rename", mock.patch.object(cg.os, "rename", side_effect=deny_rename), PermissionError, "injected: rename"),
        ]
        for label, patch, error, message in cases:
            with self.subTest(label):
                with patch:
                    with self.assertRaisesRegex(error, message) as ctx:
                        self._compose(self.raw)
                self.assertFalse(getattr(ctx.exception, "__notes__", None))
                self._assert_untouched()

    def test_denied_cleanup_after_a_failed_publication_names_the_residual_group(self):
        self._prepare_prior()
        real_rename, real_rmtree = os.rename, shutil.rmtree
        kept = []

        def deny_rename(src, dst):
            if os.path.basename(dst) == cg._ExactOutputGroup.FINAL:
                raise PermissionError("injected: rename")
            return real_rename(src, dst)

        def keep(path, *a, **kw):
            if os.path.dirname(path) == self.out:
                kept.append(path)
                return None
            return real_rmtree(path, *a, **kw)

        with mock.patch.object(cg.os, "rename", side_effect=deny_rename), mock.patch.object(cg.shutil, "rmtree", side_effect=keep):
            with self.assertRaises(PermissionError) as ctx:
                self._compose(self.raw)
        (residual,) = kept
        (note,) = ctx.exception.__notes__
        self.assertIn("could not remove", note)
        self.assertIn(residual, note)
        self.assertEqual(sorted(os.listdir(os.path.join(residual, "staging"))), ["Card_clip_short.mp4", "card-image.png"])
        self._assert_untouched(extra_groups=[os.path.basename(residual)])


if __name__ == "__main__":
    unittest.main()
