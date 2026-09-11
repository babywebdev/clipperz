"""Video cutting helpers — extract time ranges and stitch them together.

Extracted from video_processor.py. These are the two entry points used
by the clip generator to slice the source video before any cropping or
caption rendering.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from uuid import uuid4

from config.paths import paths
from services.media_probe import FFMPEG_TIMEOUT
from utils.proc import ProcError, run as proc_run


def _run_cut_command(cmd: list[str], stage: str) -> None:
    """Keep failures outside the render temp directory, which is always deleted."""
    try:
        result = proc_run(cmd, timeout=FFMPEG_TIMEOUT, check=False)
        if result.returncode == 0:
            return
        returncode, stderr = result.returncode, result.stderr or ""
        timed_out = False
    except ProcError as exc:
        returncode, stderr = exc.returncode, exc.stderr
        timed_out = returncode == -1 and stderr.startswith("timeout after ")

    exit_label = f"exit {returncode}"
    # Windows native exceptions may arrive as either signed or unsigned codes.
    if returncode > 0x7FFFFFFF or returncode < -128:
        exit_label += f", 0x{returncode & 0xFFFFFFFF:08X}"
    if timed_out:
        exit_label = f"timed out after {FFMPEG_TIMEOUT}s"
    message = f"FFmpeg {stage} failed ({exit_label})."
    try:
        log_dir = Path(paths["logs"]) / "ffmpeg"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / f"{stage}-{uuid4().hex}.json"
        log_path.write_text(json.dumps({
            "stage": stage, "command": cmd, "returncode": returncode,
            "timed_out": timed_out, "stderr": stderr,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        message += f"\nDiagnostic log: {log_path}"
    except OSError:
        # A full disk/permissions error must not replace the actual FFmpeg error.
        logging.getLogger(__name__).exception("Could not save FFmpeg diagnostics")
    message += f"\nFFmpeg output:\n{stderr.strip()[-4000:] or '(no error output)'}"
    raise RuntimeError(message)


def cut_segment(
    input_path: str,
    output_path: str,
    start_second: float,
    end_second: float,
) -> str:
    """Extract a single time segment from a video file.

    Always re-encodes with `-ss` before `-i` for frame-accurate timestamps.
    Stream copy is not an option here: with `-c copy` ffmpeg can only start at
    the keyframe at-or-before the cut point, so any boundary off the GOP grid
    silently emits up to a full GOP of earlier content while the duration still
    checks out, which offsets every burned-in caption. CRF 16 keeps this
    intermediate visually lossless through the later crop/caption/audio
    re-encodes; the fast preset holds the speed cost to a few percent
    over the old CRF 18 pass.
    """
    duration = end_second - start_second

    cmd = [
        "ffmpeg", "-hide_banner", "-nostats", "-y",
        "-ss", str(start_second),
        "-i", input_path,
        "-t", str(duration),
        "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-profile:v", "high",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        # MP4 edit lists preserve encoder delay. Shifting negative decode times
        # to zero exposes AAC priming samples and delays speech/captions.
        output_path,
    ]
    _run_cut_command(cmd, "cut")
    return output_path


def cut_multi_segment(
    input_path: str,
    output_path: str,
    segments: list[dict],
) -> str:
    """Cut multiple time ranges and concatenate them seamlessly.

    segments: [{"start": 10.5, "end": 25.0}, {"start": 30.2, "end": 45.0}]

    Each segment is cut individually with frame-accurate encoding,
    then concatenated with stream copy (matching codecs means no
    re-encode needed).
    """
    if len(segments) == 1:
        return cut_segment(
            input_path, output_path, segments[0]["start"], segments[0]["end"]
        )

    work_dir = os.path.dirname(output_path) or "."
    part_paths: list[str] = []
    concat_file = os.path.join(work_dir, "_concat_parts.txt")

    try:
        for i, seg in enumerate(segments):
            part_path = os.path.join(work_dir, f"_part_{i}.mp4")
            cut_segment(input_path, part_path, seg["start"], seg["end"])
            part_paths.append(part_path)

        with open(concat_file, "w", encoding="utf-8") as f:
            for p in part_paths:
                f.write(f"file '{os.path.abspath(p)}'\n")

        cmd = [
            "ffmpeg", "-hide_banner", "-nostats", "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_file,
            "-c", "copy",
            "-movflags", "+faststart",
            output_path,
        ]
        _run_cut_command(cmd, "concat")

        return output_path

    finally:
        for p in part_paths:
            if os.path.exists(p):
                os.remove(p)
        if os.path.exists(concat_file):
            os.remove(concat_file)
