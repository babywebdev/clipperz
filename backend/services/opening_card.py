"""Opening thumbnail card for saved revisions (Writing Studio 1B.2b.1).

Internal composer behind the bridge task `compose_opening_card`, called only by
the TypeScript revision save service after it has validated an exact render.
It prepends one 1.5-second card, built from a captured image, to that fresh
render and publishes the result in a new operation group of its own. The
exact renderer's receipt and published group are never changed.

Contract
- Inputs: the raw exact render (inside the namespace directory, with the
  SHA-256 the service recorded), the selected image with the SHA-256 the save
  captured, the namespace directory and a group stem. Placement is "opening"
  and the requested duration 1.5 seconds; anything else is refused, never
  coerced.
- The raw file must still hash to its recorded value before anything is
  created. The image is copied into this operation's own staging directory and
  that copy must hash to the captured value before anything is encoded. The
  card is built only from the staged copy and the raw file.
- Frame timing follows the raw render: the card uses its leading frame
  duration and time base, its dimensions and sample aspect ratio, and the whole
  number of frames nearest 1.5 s (ties up). The card's audio is silence at the
  raw sample rate and layout, floored to whole samples so the video card
  decides where the raw render starts. A raw render without audio gets a
  video-only card; no audio track is invented. One hard cut, zero overlap, and
  no logo or captions are drawn on the card.
- One FFmpeg graph concatenates the card with the decoded raw streams and
  encodes once. The encoder and track time base are the raw time base, so every
  raw frame keeps its own timestamp shifted by exactly the card. With FFmpeg's
  default 1/frame-rate encoder time base, a raw render whose video starts after
  its audio (as renders with an outro do) had its frames moved by up to a frame.
- Before publication the staged output must add up exactly: the raw frames
  plus the card frames, card frames at whole frame durations from 0, every raw
  frame at its raw timestamp plus the card length in ticks, unchanged
  dimensions, sample aspect ratio and time base, and the same audio parameters
  with the audio start unchanged and its end moved by the card within one AAC
  frame (encoder end padding). The receipt is prepared from those measurements;
  then one directory rename publishes the group.
- Publication uses the exact renderer's group helper: an exclusively created
  `<stem>-<op_id>/` whose `staging/` is renamed to `final/`, cleanup owned from
  the first parent acquisition, and a denied cleanup reported as a residual on
  the raised error. Nothing outside the new group is written, renamed or removed.
"""

from __future__ import annotations

import hashlib
import math
import os
import re
import statistics
from fractions import Fraction
from typing import Any, Optional

from services.clip_generator import _ExactOutputGroup, _stage_verified_copy
from services.exact_render import ExactRenderError, ExactRenderVerificationError
from services.media_probe import get_video_info
from utils.proc import run as proc_run

COMPOSITION_VERSION = 1
CARD_PLACEMENT = "opening"
CARD_DURATION = 1.5
CARD_IMAGE_STEM = "card-image"
IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")
AAC_FRAME_SAMPLES = 1024
# The card joins the raw render's first frames, so their duration is the one
# the card continues; a later join (an outro) may carry a longer gap.
LEADING_PACKETS = 60
PROBE_TIMEOUT = 300

_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_STEM_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,150}$")

TIME_DOMAINS = {
    "output.*, card.output_start, card.output_end": "seconds in the composed file, the opening card included",
    "raw.*": "seconds in the raw exact render, which has no card; add card.measured_duration to place them in the composed file",
    "*.first_pts, card.frame_ticks, card.measured_ticks": "ticks of the video time base the raw render and the composed file share",
}


# ---------------------------------------------------------------------------
# Request validation and measurement
# ---------------------------------------------------------------------------

def _require_file(path: Any, label: str) -> str:
    if not isinstance(path, str) or not path.strip() or not os.path.isabs(path):
        raise ExactRenderError(f"{label} must be an absolute path")
    if not os.path.isfile(path):
        raise ExactRenderError(f"{label} is not an existing file: {path}")
    return path


def validate_card_request(
    *, raw_video_path: Any, raw_sha256: Any, image_path: Any, image_sha256: Any,
    output_dir: Any, group_stem: Any, placement: Any, duration: Any,
) -> None:
    """Refuse anything but the one supported card. Creates and reads nothing."""
    if placement != CARD_PLACEMENT:
        raise ExactRenderError(f"card placement must be {CARD_PLACEMENT!r}, got {placement!r}")
    if isinstance(duration, bool) or not isinstance(duration, (int, float)) or duration != CARD_DURATION:
        raise ExactRenderError(f"card duration must be {CARD_DURATION} seconds, got {duration!r}")
    for value, label in ((raw_sha256, "raw_sha256"), (image_sha256, "image_sha256")):
        if not isinstance(value, str) or not _SHA256_RE.match(value):
            raise ExactRenderError(f"{label} must be a lowercase hexadecimal SHA-256")
    if not isinstance(group_stem, str) or not _STEM_RE.match(group_stem) or ".." in group_stem:
        raise ExactRenderError(f"group_stem must be a short file name component: {group_stem!r}")
    raw = _require_file(raw_video_path, "raw_video_path")
    image = _require_file(image_path, "image_path")
    if os.path.splitext(image)[1].lower() not in IMAGE_EXTENSIONS:
        raise ExactRenderError(f"image_path must be one of {', '.join(IMAGE_EXTENSIONS)}: {image}")
    if not isinstance(output_dir, str) or not os.path.isabs(output_dir) or not os.path.isdir(output_dir):
        raise ExactRenderError("output_dir must be an existing absolute directory")
    root = os.path.normcase(os.path.abspath(output_dir))
    if os.path.commonpath([root, os.path.normcase(os.path.abspath(raw))]) != root:
        raise ExactRenderError(f"raw_video_path must be inside output_dir: {raw}")


def _sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _ratio(value: Any, sep: str) -> Optional[Fraction]:
    if not isinstance(value, str) or sep not in value:
        return None
    num, _, den = value.partition(sep)
    try:
        n, d = int(num), int(den)
    except ValueError:
        return None
    return Fraction(n, d) if n > 0 and d > 0 else None


def _seconds(value: Any) -> Optional[float]:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def _video_packets(path: str) -> list[tuple[int, int]]:
    """(pts, duration) of every video packet in presentation order, in time-base ticks."""
    result = proc_run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts,duration",
         "-of", "csv=p=0", path],
        timeout=PROBE_TIMEOUT, check=False,
    )
    if result.returncode != 0:
        raise ExactRenderVerificationError(f"ffprobe could not list the video packets of {path}: {result.stderr.strip()[:300]}")
    packets = []
    for line in result.stdout.splitlines():
        fields = line.strip().split(",")
        if not fields[0]:
            continue
        try:
            pts = int(fields[0])
        except ValueError:
            raise ExactRenderVerificationError(f"{path}: a video packet has no usable timestamp ({line.strip()!r})") from None
        try:
            duration = int(fields[1]) if len(fields) > 1 and fields[1] else 0
        except ValueError:
            duration = 0
        packets.append((pts, duration))
    if not packets:
        raise ExactRenderVerificationError(f"{path}: no video packets")
    packets.sort()
    return packets


def probe_streams(path: str) -> dict:
    """What composition depends on: stream parameters and every video packet timestamp."""
    if not os.path.isfile(path) or os.path.getsize(path) <= 0:
        raise ExactRenderVerificationError(f"media is missing or empty: {path}")
    try:
        info = get_video_info(path)
    except Exception as exc:
        raise ExactRenderVerificationError(f"ffprobe could not read {path}: {exc}") from exc
    streams = info.get("streams") or []
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    measured = {
        "path": path,
        "file_size_bytes": os.path.getsize(path),
        "duration": _seconds((info.get("format") or {}).get("duration")),
        "video": None,
        "audio": None,
    }
    if video is not None:
        time_base = _ratio(video.get("time_base"), "/")
        if time_base is None:
            raise ExactRenderVerificationError(f"{path}: the video time base is unreadable")
        measured["video"] = {
            "width": int(video.get("width") or 0),
            "height": int(video.get("height") or 0),
            # An unset (N/A or 0:1) sample aspect ratio means square pixels.
            "sar": _ratio(video.get("sample_aspect_ratio"), ":") or Fraction(1),
            "time_base": time_base,
            "frame_rate": video.get("avg_frame_rate"),
            "start": _seconds(video.get("start_time")),
            "duration": _seconds(video.get("duration")),
            "packets": _video_packets(path),
        }
    if audio is not None:
        measured["audio"] = {
            "sample_rate": int(audio.get("sample_rate") or 0),
            "channels": int(audio.get("channels") or 0),
            "channel_layout": audio.get("channel_layout") or None,
            "start": _seconds(audio.get("start_time")),
            "duration": _seconds(audio.get("duration")),
        }
    return measured


def leading_frame_ticks(packets: list[tuple[int, int]]) -> int:
    """The raw render's frame duration where the card joins it, in ticks."""
    lead = packets[: LEADING_PACKETS + 1]
    durations = [d for _, d in lead[:LEADING_PACKETS] if d > 0]
    if not durations:
        durations = [b[0] - a[0] for a, b in zip(lead, lead[1:]) if b[0] > a[0]]
    if not durations:
        raise ExactRenderVerificationError("the raw render's frame duration could not be measured from its leading packets")
    return int(statistics.median_low(durations))


def card_frame_count(frame_seconds: Fraction, duration: float = CARD_DURATION) -> int:
    """Whole frames nearest `duration` at this frame duration, ties rounding up."""
    return max(1, math.floor(Fraction(duration) / frame_seconds + Fraction(1, 2)))


def _channel_layout(audio: dict) -> str:
    if audio["channel_layout"]:
        return audio["channel_layout"]
    layout = {1: "mono", 2: "stereo"}.get(audio["channels"])
    if not layout:
        raise ExactRenderError(f"the raw render's {audio['channels']}-channel audio has no channel layout to match")
    return layout


# ---------------------------------------------------------------------------
# Composition
# ---------------------------------------------------------------------------

def _compose_command(raw: dict, raw_path: str, image_path: str, output_path: str, *, frames: int,
                     frame_seconds: Fraction, audio_samples: Optional[int]) -> list[str]:
    video = raw["video"]
    width, height, sar, time_base = video["width"], video["height"], video["sar"], video["time_base"]
    rate = 1 / frame_seconds
    graph = (
        f"[1:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black,"
        # setsar reduces to max-limited ratios (100 by default), which turns 5120:5121 into 1:1.
        f"setsar=r={sar.numerator}/{sar.denominator}:max={max(sar.numerator, sar.denominator)},"
        f"format=yuv420p,trim=end_frame={frames},setpts=PTS-STARTPTS[card_v]"
    )
    cmd = [
        "ffmpeg", "-y", "-v", "error", "-nostdin",
        "-i", raw_path,
        "-loop", "1", "-framerate", f"{rate.numerator}/{rate.denominator}",
        "-t", f"{float((frames + 2) * frame_seconds):.6f}", "-i", image_path,
    ]
    if audio_samples is not None:
        audio = raw["audio"]
        cmd += ["-f", "lavfi", "-i", f"anullsrc=r={audio['sample_rate']}:cl={_channel_layout(audio)}"]
        graph += (
            f";[2:a]atrim=end_sample={audio_samples},asetpts=PTS-STARTPTS[card_a]"
            ";[card_v][card_a][0:v:0][0:a:0]concat=n=2:v=1:a=1[v][a]"
        )
        maps = ["-map", "[v]", "-map", "[a]"]
    else:
        graph += ";[card_v][0:v:0]concat=n=2:v=1:a=0[v]"
        maps = ["-map", "[v]"]
    cmd += [
        "-filter_complex", graph, *maps,
        "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
        "-fps_mode", "passthrough",
        "-enc_time_base:v", f"{time_base.numerator}/{time_base.denominator}",
    ]
    if time_base.numerator == 1:
        cmd += ["-video_track_timescale", str(time_base.denominator)]
    if audio_samples is not None:
        cmd += ["-c:a", "aac", "-b:a", "192k", "-ar", str(raw["audio"]["sample_rate"]), "-ac", str(raw["audio"]["channels"])]
    cmd += ["-movflags", "+faststart", output_path]
    return cmd


def verify_composition(raw: dict, out: dict, *, frames: int, frame_ticks: int) -> int:
    """The staged output must be exactly the card followed by the raw render.

    Returns the measured card length in ticks: how much later the raw render's
    first frame is in the composed file. Video placement is compared in whole
    ticks with no slack; audio end within one AAC frame of encoder padding.
    """
    raw_video, out_video = raw["video"], out["video"]
    if out_video is None:
        raise ExactRenderVerificationError("the composed output has no video stream")
    if (out_video["width"], out_video["height"]) != (raw_video["width"], raw_video["height"]):
        raise ExactRenderVerificationError(
            f"the composed output is {out_video['width']}x{out_video['height']}, "
            f"the raw render {raw_video['width']}x{raw_video['height']}"
        )
    if out_video["sar"] != raw_video["sar"]:
        raise ExactRenderVerificationError(f"the composed output's sample aspect ratio {out_video['sar']} is not the raw render's {raw_video['sar']}")
    if out_video["time_base"] != raw_video["time_base"]:
        raise ExactRenderVerificationError(f"the composed output's time base {out_video['time_base']} is not the raw render's {raw_video['time_base']}")
    raw_packets, out_packets = raw_video["packets"], out_video["packets"]
    if len(out_packets) != len(raw_packets) + frames:
        raise ExactRenderVerificationError(
            f"the composed output has {len(out_packets)} video frames; the raw render's "
            f"{len(raw_packets)} plus {frames} card frames were expected"
        )
    for i in range(frames):
        if out_packets[i][0] != i * frame_ticks:
            raise ExactRenderVerificationError(f"card frame {i} is at {out_packets[i][0]} ticks, not {i * frame_ticks}")
    shift = out_packets[frames][0] - raw_packets[0][0]
    if shift != frames * frame_ticks:
        raise ExactRenderVerificationError(
            f"the raw render starts {shift} ticks later in the composed output; the card is {frames * frame_ticks} ticks"
        )
    for i, (pts, _) in enumerate(raw_packets):
        if out_packets[frames + i][0] != pts + shift:
            raise ExactRenderVerificationError(
                f"raw frame {i} is at {out_packets[frames + i][0] - shift} ticks after the card, not at its raw {pts}"
            )

    raw_audio, out_audio = raw["audio"], out["audio"]
    if (raw_audio is None) != (out_audio is None):
        raise ExactRenderVerificationError("the composed output's audio presence differs from the raw render's")
    if raw_audio is not None:
        if (out_audio["sample_rate"], out_audio["channels"]) != (raw_audio["sample_rate"], raw_audio["channels"]):
            raise ExactRenderVerificationError(
                f"the composed audio is {out_audio['sample_rate']} Hz x{out_audio['channels']}, "
                f"the raw render's {raw_audio['sample_rate']} Hz x{raw_audio['channels']}"
            )
        rate = raw_audio["sample_rate"]
        values = [raw_audio["start"], raw_audio["duration"], out_audio["start"], out_audio["duration"]]
        if any(v is None for v in values):
            raise ExactRenderVerificationError("the audio start or duration could not be measured")
        if abs(out_audio["start"] - raw_audio["start"]) > 1 / rate:
            raise ExactRenderVerificationError(f"the audio starts at {out_audio['start']}s in the composed output, {raw_audio['start']}s in the raw render")
        card_seconds = float(shift * raw_video["time_base"])
        expected_end = raw_audio["start"] + raw_audio["duration"] + card_seconds
        actual_end = out_audio["start"] + out_audio["duration"]
        if abs(actual_end - expected_end) > (AAC_FRAME_SAMPLES + 1) / rate:
            raise ExactRenderVerificationError(
                f"the composed audio ends at {actual_end:.6f}s; the raw audio moved by the {card_seconds:.6f}s card ends at "
                f"{expected_end:.6f}s (one AAC frame allowed)"
            )
    return shift


def _video_summary(video: dict) -> dict:
    sar, time_base = video["sar"], video["time_base"]
    return {
        "width": video["width"],
        "height": video["height"],
        "sample_aspect_ratio": f"{sar.numerator}:{sar.denominator}",
        "time_base": f"{time_base.numerator}/{time_base.denominator}",
        "frame_rate": video["frame_rate"],
        "packets": len(video["packets"]),
        "first_pts": video["packets"][0][0],
        "start": video["start"],
        "duration": video["duration"],
    }


def _audio_summary(audio: Optional[dict]) -> Optional[dict]:
    if audio is None:
        return None
    return {key: audio[key] for key in ("sample_rate", "channels", "channel_layout", "start", "duration")}


def compose_opening_card(
    *, raw_video_path: Any, raw_sha256: Any, image_path: Any, image_sha256: Any,
    output_dir: Any, group_stem: Any, placement: Any = CARD_PLACEMENT, duration: Any = CARD_DURATION,
) -> dict:
    """Publish `<group_stem>-<op_id>/final/` holding the composed file and the card image; return its receipt."""
    validate_card_request(
        raw_video_path=raw_video_path, raw_sha256=raw_sha256, image_path=image_path, image_sha256=image_sha256,
        output_dir=output_dir, group_stem=group_stem, placement=placement, duration=duration,
    )
    if _sha256(raw_video_path) != raw_sha256:
        raise ExactRenderVerificationError(f"the raw render changed since it was validated: {raw_video_path}")
    raw = probe_streams(raw_video_path)
    if raw["video"] is None:
        raise ExactRenderVerificationError(f"the raw render has no video stream: {raw_video_path}")
    time_base = raw["video"]["time_base"]
    frame_ticks = leading_frame_ticks(raw["video"]["packets"])
    frame_seconds = frame_ticks * time_base
    frames = card_frame_count(frame_seconds)
    audio_samples = None
    if raw["audio"] is not None:
        _channel_layout(raw["audio"])
        audio_samples = math.floor(frames * frame_seconds * raw["audio"]["sample_rate"])
    output_name = os.path.basename(raw_video_path)
    image_name = CARD_IMAGE_STEM + os.path.splitext(image_path)[1].lower()
    timeout = max(PROBE_TIMEOUT, int((raw["duration"] or 0) * 6) + 120)

    group = _ExactOutputGroup.create(output_dir, group_stem)
    try:
        staged_image = group.staged_path(image_name)
        image_bytes = _stage_verified_copy(image_path, staged_image)
        staged_digest = _sha256(staged_image)
        if staged_digest != image_sha256:
            raise ExactRenderVerificationError(
                f"the selected image is not the one the save captured: its copy hashes to {staged_digest}, "
                f"the save captured {image_sha256}"
            )
        staged_output = group.staged_path(output_name)
        result = proc_run(
            _compose_command(raw, raw_video_path, staged_image, staged_output, frames=frames,
                             frame_seconds=frame_seconds, audio_samples=audio_samples),
            timeout=timeout, check=False,
        )
        if result.returncode != 0:
            raise ExactRenderVerificationError(f"opening card composition failed: {result.stderr.strip()[-500:]}")
        out = probe_streams(staged_output)
        measured_ticks = verify_composition(raw, out, frames=frames, frame_ticks=frame_ticks)
        measured = float(measured_ticks * time_base)
        if abs(Fraction(measured_ticks) * time_base - Fraction(CARD_DURATION)) > frame_seconds / 2:
            raise ExactRenderVerificationError(f"the card runs {measured}s, more than half a frame from {CARD_DURATION}s")
        receipt = {
            "version": COMPOSITION_VERSION,
            "kind": "opening_card",
            "placement": CARD_PLACEMENT,
            "transition": "hardcut",
            "overlap": 0,
            "requested_duration": CARD_DURATION,
            "raw": {
                "path": raw_video_path,
                "sha256": raw_sha256,
                "file_size_bytes": raw["file_size_bytes"],
                "duration": raw["duration"],
                "video": _video_summary(raw["video"]),
                "audio": _audio_summary(raw["audio"]),
            },
            "card": {
                "image_path": group.final_path(image_name),
                "image_sha256": staged_digest,
                "image_bytes": image_bytes,
                "frames": frames,
                "frame_ticks": frame_ticks,
                "frame_duration": float(frame_seconds),
                "measured_ticks": measured_ticks,
                "measured_duration": measured,
                "audio_samples": audio_samples,
                "output_start": 0,
                "output_end": measured,
                "audio_note": None if audio_samples is not None else "the raw render has no audio stream; the card adds none",
            },
            "output": {
                "path": group.final_path(output_name),
                "file_size_bytes": out["file_size_bytes"],
                "duration": out["duration"],
                "video": _video_summary(out["video"]),
                "audio": _audio_summary(out["audio"]),
            },
            "time_domains": dict(TIME_DOMAINS),
            "tolerance": {
                "video_ticks": 0,
                "card_seconds": float(frame_seconds / 2),
                "audio_seconds": None if raw["audio"] is None else (AAC_FRAME_SAMPLES + 1) / raw["audio"]["sample_rate"],
                "basis": (
                    f"card and raw frames sit on whole ticks of {time_base} and are compared exactly; the card is "
                    f"{frames} frames of {frame_ticks} ticks, so it may differ from {CARD_DURATION}s by up to half a "
                    "frame; AAC encodes whole 1024-sample frames, so the audio end may move by up to one frame plus "
                    "one sample"
                ),
            },
        }
        group.publish()
    except BaseException as exc:
        group.discard(exc)
        raise
    return receipt
