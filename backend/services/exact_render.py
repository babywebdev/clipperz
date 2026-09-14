"""Exact-edit render contract: validation, time mapping and output proof.

Writing Studio slice 1B.1. `generate_clip(timing_mode="exact")` renders the
supplied ordered `keep_segments` exactly as given and returns a versioned
`render_timeline` describing what was actually produced. The helpers here are
pure planning/validation/mapping plus ffprobe-based measurement; they never
run FFmpeg encodes themselves.

Time domains used throughout:

- source-absolute: seconds in the original source file (what callers supply
  in `keep_segments`, `transcript_words`, and the legacy bounds).
- content-relative: seconds in the edited content, i.e. the kept intervals
  concatenated in supplied order, starting at 0. Crop keyframes and caption
  words use this domain in exact mode.
- output: seconds in the final rendered file, which additionally contains
  any intro/outro bookends. `content_to_output_offset` maps content time
  to output time.

Legacy mode (the default) is untouched by this module.
"""

from __future__ import annotations

import copy
import math
import os
from typing import Any, Optional

from services.media_probe import get_video_info, parse_duration_seconds

RENDER_TIMELINE_VERSION = 1
TIMING_MODES = ("legacy", "exact")

# One AAC frame at the pipeline's 44.1 kHz output rate. Every AAC encode can
# pad up to one frame, so each cut/concat stage contributes this much slack.
AAC_FRAME_SECONDS = 1024 / 44100

# Probed durations are float strings; allow a hair of slack against the
# probed source bound so an interval ending exactly at the file end passes.
_BOUNDS_EPSILON = 0.001


class ExactRenderError(ValueError):
    """The exact-mode request is malformed or unsupported. Nothing was rendered."""


class ExactRenderVerificationError(RuntimeError):
    """The render completed but the output could not be proven to match the request."""


# ---------------------------------------------------------------------------
# Request validation
# ---------------------------------------------------------------------------

def normalize_timing_mode(value: Any) -> str:
    """Return "legacy" or "exact"; anything else is rejected."""
    if value is None or value == "":
        return "legacy"
    if isinstance(value, str) and value in TIMING_MODES:
        return value
    raise ExactRenderError(
        f"timing_mode must be one of {list(TIMING_MODES)}, got {value!r}"
    )


def _finite_number(value: Any, label: str) -> float:
    """A finite float from a JSON number. bool, str, NaN and inf are rejected."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ExactRenderError(f"{label} must be a finite number, got {value!r}")
    number = float(value)
    if not math.isfinite(number):
        raise ExactRenderError(f"{label} must be a finite number, got {value!r}")
    return number


def validate_exact_segments(keep_segments: Any, source_duration: float) -> list[dict]:
    """Validate the ordered kept intervals against the probed source.

    Returns fresh dicts so the caller's list and its members are never
    mutated. Order is preserved exactly; nothing is sorted, merged, clamped
    or dropped. Any defect rejects the whole request.
    """
    if not isinstance(keep_segments, list) or not keep_segments:
        raise ExactRenderError(
            "exact timing_mode requires a nonempty ordered keep_segments list"
        )
    if not isinstance(source_duration, (int, float)) or not math.isfinite(source_duration) or source_duration <= 0:
        raise ExactRenderError("source duration could not be probed; refusing to cut blind")

    validated: list[dict] = []
    for index, item in enumerate(keep_segments):
        label = f"keep_segments[{index}]"
        if not isinstance(item, dict):
            raise ExactRenderError(f"{label} must be an object with start and end")
        start = _finite_number(item.get("start"), f"{label}.start")
        end = _finite_number(item.get("end"), f"{label}.end")
        if end <= start:
            raise ExactRenderError(
                f"{label} must have a positive duration (start={start}, end={end})"
            )
        if start < 0:
            raise ExactRenderError(f"{label}.start must not be negative (got {start})")
        if end > source_duration + _BOUNDS_EPSILON:
            raise ExactRenderError(
                f"{label}.end {end} exceeds the probed source duration {source_duration:.3f}s"
            )
        validated.append({"start": start, "end": end})
    return validated


def validate_exact_words(transcript_words: Any) -> tuple[str, Optional[list[dict]]]:
    """Distinguish an explicitly supplied words list from an unavailable one.

    Returns ("unavailable", None) when no list was supplied, or
    ("supplied", copy) for a list (an empty list is a valid, supplied,
    empty transcript). Each word must carry finite start/end seconds.
    """
    if transcript_words is None:
        return "unavailable", None
    if not isinstance(transcript_words, list):
        raise ExactRenderError("transcript_words must be a list of timed words or omitted")
    validated: list[dict] = []
    for index, word in enumerate(transcript_words):
        label = f"transcript_words[{index}]"
        if not isinstance(word, dict):
            raise ExactRenderError(f"{label} must be an object")
        start = _finite_number(word.get("start"), f"{label}.start")
        end = _finite_number(word.get("end"), f"{label}.end")
        if end < start:
            raise ExactRenderError(f"{label} ends before it starts ({start} > {end})")
        validated.append(copy.deepcopy(word))
    return "supplied", validated


def validate_exact_keyframes(crop_keyframes: Any, content_duration: float) -> Optional[list[dict]]:
    """Validate manual crop keyframes in the content-relative domain.

    `t` must be finite seconds within [0, content_duration]; `x_pct` a finite
    percentage within [0, 100]. Returns copies (order preserved) or None.
    """
    if crop_keyframes is None:
        return None
    if not isinstance(crop_keyframes, list):
        raise ExactRenderError("crop_keyframes must be a list or omitted")
    validated: list[dict] = []
    for index, keyframe in enumerate(crop_keyframes):
        label = f"crop_keyframes[{index}]"
        if not isinstance(keyframe, dict):
            raise ExactRenderError(f"{label} must be an object")
        t = _finite_number(keyframe.get("t"), f"{label}.t")
        x_pct = _finite_number(keyframe.get("x_pct"), f"{label}.x_pct")
        if t < 0 or t > content_duration + _BOUNDS_EPSILON:
            raise ExactRenderError(
                f"{label}.t {t} is outside the edited content (0 to {content_duration:.3f}s, "
                "content-relative seconds)"
            )
        if x_pct < 0 or x_pct > 100:
            raise ExactRenderError(f"{label}.x_pct {x_pct} must be between 0 and 100")
        validated.append({**copy.deepcopy(keyframe), "t": t, "x_pct": x_pct})
    return validated


def require_existing_asset(path: Any, label: str) -> Optional[str]:
    """An asset that was asked for must exist; an omitted one is simply absent."""
    if path is None or path == "":
        return None
    if not isinstance(path, str):
        raise ExactRenderError(f"{label} must be a filesystem path")
    if not os.path.isfile(path):
        raise ExactRenderError(f"{label} does not exist: {path}")
    return path


# ---------------------------------------------------------------------------
# Time mapping
# ---------------------------------------------------------------------------

def content_duration(segments: list[dict]) -> float:
    return sum(seg["end"] - seg["start"] for seg in segments)


def content_intervals(segments: list[dict]) -> list[dict]:
    """Each kept interval with its content-relative placement, in output order."""
    intervals: list[dict] = []
    cursor = 0.0
    for index, seg in enumerate(segments):
        length = seg["end"] - seg["start"]
        intervals.append({
            "index": index,
            "source_start": seg["start"],
            "source_end": seg["end"],
            "content_start": round(cursor, 3),
            "content_end": round(cursor + length, 3),
            "duration": round(length, 3),
        })
        cursor += length
    return intervals


def map_words_to_content(words: list[dict], segments: list[dict]) -> list[dict]:
    """Project source-absolute words onto the edited content.

    One mapping for one or many intervals: words are collected per interval
    in supplied interval order, clipped to the interval's boundaries, and
    shifted to content-relative seconds. A word outside every interval is
    absent. A word straddling a boundary keeps only its inside part. Word
    metadata (speaker, confidence, anything else) is carried through
    untouched. The input list and its dicts are not modified.
    """
    mapped: list[dict] = []
    cursor = 0.0
    for seg in segments:
        seg_start, seg_end = seg["start"], seg["end"]
        seg_length = seg_end - seg_start
        for word in words:
            if word["end"] <= seg_start or word["start"] >= seg_end:
                continue
            clipped_start = max(word["start"], seg_start)
            clipped_end = min(word["end"], seg_end)
            if clipped_end <= clipped_start:
                continue
            mapped.append({
                **copy.deepcopy(word),
                "start": round(cursor + (clipped_start - seg_start), 3),
                "end": round(cursor + (clipped_end - seg_start), 3),
            })
        cursor += seg_length
    return mapped


def words_in_intervals(words: list[dict], segments: list[dict]) -> list[dict]:
    """The supplied source-absolute words that touch any kept interval, unmodified.

    Retained in the result as the recovery input for a later widening edit;
    ordered as supplied, each word listed once.
    """
    kept: list[dict] = []
    for word in words:
        for seg in segments:
            if word["end"] > seg["start"] and word["start"] < seg["end"]:
                kept.append(copy.deepcopy(word))
                break
    return kept


def content_text(words: list[dict]) -> str:
    return " ".join(
        str(word.get("word", "")).strip() for word in words if str(word.get("word", "")).strip()
    )


# ---------------------------------------------------------------------------
# Measurement
# ---------------------------------------------------------------------------

def _parse_rate(value: Any) -> Optional[float]:
    if not value or not isinstance(value, str):
        return None
    if "/" in value:
        numerator, _, denominator = value.partition("/")
        try:
            num, den = float(numerator), float(denominator)
        except ValueError:
            return None
        if den <= 0 or not math.isfinite(num / den) or num <= 0:
            return None
        return num / den
    parsed = parse_duration_seconds(value)
    return parsed


def probe_media(path: str) -> dict:
    """Measure a media file: stream presence, per-stream timing, size, fps.

    `video_end`/`audio_end` are start_time plus duration, i.e. where the last
    sample lands, because a concatenated file can carry a nonzero start.
    Raises ExactRenderVerificationError when the file is missing, empty or
    unreadable; a probe that fails is not a passing measurement.
    """
    if not path or not os.path.isfile(path):
        raise ExactRenderVerificationError(f"output is missing: {path}")
    size = os.path.getsize(path)
    if size <= 0:
        raise ExactRenderVerificationError(f"output is empty: {path}")
    try:
        info = get_video_info(path)
    except Exception as exc:
        raise ExactRenderVerificationError(f"ffprobe could not read {path}: {exc}") from exc

    result = {
        "path": path,
        "file_size_bytes": size,
        "duration": parse_duration_seconds((info.get("format") or {}).get("duration")),
        "has_video": False,
        "has_audio": False,
        "width": None,
        "height": None,
        "fps": None,
        "frame_rate_variable": False,
        "video_start": None,
        "video_duration": None,
        "video_end": None,
        "audio_start": None,
        "audio_duration": None,
        "audio_end": None,
    }
    for stream in info.get("streams") or []:
        codec_type = stream.get("codec_type")
        start = parse_duration_seconds(stream.get("start_time"))
        if start is None:
            # parse_duration_seconds rejects 0 as "not positive"; a zero start is normal.
            try:
                raw = float(str(stream.get("start_time", "0")).strip() or 0.0)
                start = raw if math.isfinite(raw) else None
            except ValueError:
                start = None
        duration = parse_duration_seconds(stream.get("duration"))
        end = None if duration is None else (duration + (start or 0.0))
        if codec_type == "video" and not result["has_video"]:
            result["has_video"] = True
            result["width"] = int(stream.get("width") or 0) or None
            result["height"] = int(stream.get("height") or 0) or None
            avg = _parse_rate(stream.get("avg_frame_rate"))
            real = _parse_rate(stream.get("r_frame_rate"))
            result["fps"] = avg or real
            result["frame_rate_variable"] = bool(avg and real and abs(avg - real) > 0.01)
            result["video_start"] = start
            result["video_duration"] = duration
            result["video_end"] = end
        elif codec_type == "audio" and not result["has_audio"]:
            result["has_audio"] = True
            result["audio_start"] = start
            result["audio_duration"] = duration
            result["audio_end"] = end
    if result["duration"] is None:
        candidates = [v for v in (result["video_end"], result["audio_end"]) if v is not None]
        result["duration"] = max(candidates) if candidates else None
    return result


def timing_tolerance(
    *,
    segment_count: int,
    source_fps: Optional[float],
    output_fps: Optional[float],
    bookend_count: int,
) -> dict:
    """Measured slack for the fixture's frame and sample timing.

    Each cut re-encode can land its first frame up to one source frame late
    and pad one AAC frame; each composition stage (concat, bookend) can add
    one output frame and one AAC frame; the final encode rounds to whole
    frames. This is documented tolerance for codec quantization, not a claim
    of sample-accurate cuts.
    """
    src_frame = (1.0 / source_fps) if source_fps else 1.0 / 24.0
    out_frame = (1.0 / output_fps) if output_fps else src_frame
    content = segment_count * (src_frame + AAC_FRAME_SECONDS) + out_frame
    composition = (bookend_count + 1) * (out_frame + AAC_FRAME_SECONDS)
    av_sync = out_frame + 2 * AAC_FRAME_SECONDS + segment_count * src_frame
    return {
        "content_seconds": round(content, 4),
        "composition_seconds": round(composition, 4),
        "av_sync_seconds": round(av_sync, 4),
        "basis": (
            f"{segment_count} cut(s) x (1 source frame @ {source_fps or 'unknown'} fps + 1 AAC frame "
            f"{AAC_FRAME_SECONDS:.4f}s) + 1 output frame @ {output_fps or 'unknown'} fps; "
            f"{bookend_count} bookend join(s); A/V: 1 output frame + 2 AAC frames + per-cut frame slack"
        ),
    }


def verify_content_measurement(
    *, requested: float, measured: dict, tolerance: dict, source_has_audio: bool,
) -> None:
    """The cut content must be what was asked for, within the documented slack."""
    if not measured["has_video"]:
        raise ExactRenderVerificationError("cut content has no video stream")
    video_end = measured["video_end"]
    if video_end is None:
        raise ExactRenderVerificationError("cut content video duration could not be measured")
    if abs(video_end - requested) > tolerance["content_seconds"]:
        raise ExactRenderVerificationError(
            f"cut content runs {video_end:.3f}s but {requested:.3f}s was requested "
            f"(tolerance {tolerance['content_seconds']:.3f}s)"
        )
    if source_has_audio and not measured["has_audio"]:
        raise ExactRenderVerificationError("the source has audio but the cut content lost it")
    if measured["has_audio"] and measured["audio_end"] is not None:
        if abs(measured["audio_end"] - video_end) > tolerance["av_sync_seconds"]:
            raise ExactRenderVerificationError(
                f"cut content audio ({measured['audio_end']:.3f}s) and video ({video_end:.3f}s) "
                f"disagree beyond {tolerance['av_sync_seconds']:.3f}s"
            )


def verify_output_measurement(
    *, expected_duration: float, measured: dict, tolerance: dict,
    source_has_audio: bool, expected_dims: tuple[int, int],
) -> None:
    """The final file must exist, decode, match the format, and add up."""
    if not measured["has_video"]:
        raise ExactRenderVerificationError("final output has no video stream")
    if (measured["width"], measured["height"]) != tuple(expected_dims):
        raise ExactRenderVerificationError(
            f"final output is {measured['width']}x{measured['height']}, "
            f"expected {expected_dims[0]}x{expected_dims[1]}"
        )
    if source_has_audio and not measured["has_audio"]:
        raise ExactRenderVerificationError("the source has audio but the final output has none")
    duration = measured["duration"]
    if duration is None:
        raise ExactRenderVerificationError("final output duration could not be measured")
    if abs(duration - expected_duration) > tolerance["composition_seconds"]:
        raise ExactRenderVerificationError(
            f"final output runs {duration:.3f}s but content plus bookends add up to "
            f"{expected_duration:.3f}s (tolerance {tolerance['composition_seconds']:.3f}s)"
        )
    if measured["has_audio"] and measured["audio_end"] is not None and measured["video_end"] is not None:
        if abs(measured["audio_end"] - measured["video_end"]) > tolerance["av_sync_seconds"]:
            raise ExactRenderVerificationError(
                f"final output audio ({measured['audio_end']:.3f}s) and video "
                f"({measured['video_end']:.3f}s) disagree beyond {tolerance['av_sync_seconds']:.3f}s"
            )


# Composition branches whose video and audio streams are joined differently.
# `xfade_audio_concat` overlaps the video by the fade but concatenates the
# audio end to end, so the streams disagree by the fade from the join onward
# and the audio content starts one fade later than the video content. That is
# a known semantic disagreement, not codec quantization; the numeric
# tolerance cannot vouch for it.
MISMATCHED_TRANSITION_BRANCHES = ("xfade_audio_concat",)


def verify_bookend_transition(*, kind: str, report: dict) -> None:
    """A bookend join must transition its audio and video the same way.

    Crossfading both streams (`xfade_acrossfade`) or hard-cutting both
    (`hardcut_soft_audio`, `hardcut`) keeps them in step. A branch that
    treats them differently cannot describe a single content offset, so it
    is refused before any receipt exists, whatever the measured durations.
    """
    branch = report.get("branch")
    if not branch:
        raise ExactRenderVerificationError(
            f"{kind} was requested but no composition branch was recorded"
        )
    if branch in MISMATCHED_TRANSITION_BRANCHES:
        overlap = float(report.get("applied_overlap") or 0.0)
        raise ExactRenderVerificationError(
            f"{kind} composition took the {branch} branch: its video crossfades over "
            f"{overlap:.3f}s while its audio is joined end to end, so the two streams "
            "disagree from the join onward and no single content offset describes the output"
        )


def bookend_region(
    *, kind: str, report: dict, output_start: float,
) -> dict:
    """Describe one bookend join in output seconds from the concat helper's report."""
    overlap = float(report.get("applied_overlap") or 0.0)
    main = float(report.get("main_duration") or 0.0)
    appended = float(report.get("appended_duration") or 0.0)
    if kind == "intro":
        # The intro was the "main" input and the content was appended to it.
        region_start = 0.0
        region_end = max(0.0, main - overlap)
        transition = {"output_start": round(region_end, 3), "output_end": round(main, 3)}
    else:
        region_start = max(0.0, output_start - overlap)
        region_end = output_start - overlap + appended
        transition = {"output_start": round(region_start, 3), "output_end": round(output_start, 3)}
    return {
        "kind": kind,
        "output_start": round(region_start, 3),
        "output_end": round(region_end, 3),
        "asset_duration": round(appended if kind == "outro" else main, 3),
        "requested_fade": report.get("requested_fade"),
        "applied_overlap": round(overlap, 3),
        "branch": report.get("branch"),
        "transition": transition,
        "measured_output_duration": report.get("output_duration"),
    }
