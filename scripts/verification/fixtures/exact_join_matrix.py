"""Test-only producer fixture: exact-v1 bookend join provenance (Writing Studio 1B.2a repair-3).

Runs the real exact create_clip path: backend/main.py handle_create_clip,
clip_generator.generate_clip, video_processor.concat_outro (its clamp,
crossfade eligibility and fallback order), exact_render.verify_bookend_transition,
bookend_region, clip_generator._exact_render_timeline and the output group
publication. Only media I/O is controlled. Cut, crop, caption and loudness
stages write marker files whose first line is a JSON header carrying a
duration; concat_outro's probes read that header and its FFmpeg calls write
markers: a crossfade lasts main + appended minus the xfade duration parsed
from the real filter, a hard cut main + appended. `media` chooses the input
durations and whether the crossfade and the softened hard cut succeed. No
FFmpeg runs and nothing is encoded.

CASES is the one case table for the Python and Node matrix suites.

`mutate` alters one join after concat_outro returns: its applied_overlap (and
branch, when named) and that join's output duration, so the next join, the
regions, the producer's own output proof and the final probe all follow the
altered overlap. Only its relationship to the fade and join inputs is wrong.

Never imported by production code. Run from the repository root with an
isolated PODCLI_HOME:
  python scripts/verification/fixtures/exact_join_matrix.py cases <out.json>
  python scripts/verification/fixtures/exact_join_matrix.py render <request.json> <response.json>
A request is {"params": create_clip params, "media": {...}, "mutate": {...} or null};
the response is {"result": create_clip data, "joins": [{"kind", "report", "mutated"}]}.
Exit codes: 0 ok, 1 the render raised (traceback on stderr), 3 usage.
"""

import contextlib
import copy
import json
import os
import re
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend"))

import main as bridge  # noqa: E402
from services import audiogram  # noqa: E402
from services import clip_generator as cg  # noqa: E402
from services import exact_render as er  # noqa: E402
from services import video_processor as vp  # noqa: E402
from services.formats import get_format  # noqa: E402

SOURCE_SECONDS = 8.0
XF, SOFT, CUT = "xfade_acrossfade", "hardcut_soft_audio", "hardcut"


def _case(label, *, fade, segment, content, intro=None, outro=None, xfade="ok", soft_audio="ok",
          expect, wrong=()):
    return {
        "label": label,
        "bookend_fade": fade,
        "keep_segments": [{"start": 1.0, "end": 1.0 + segment}],
        "media": {"content": content, "intro": intro, "outro": outro, "xfade": xfade, "soft_audio": soft_audio},
        # Producer outcome per join: [branch, applied_overlap as the receipt rounds it].
        "expect": expect,
        # Coherent mutations the repair-2 bounds accepted; `refusal` names the relationship they break.
        "wrong": list(wrong),
    }


CASES = [
    _case("fade-limited", fade=0.5, segment=2, content=2.0, intro=2.0, outro=2.0,
          expect={"intro": [XF, 0.5], "outro": [XF, 0.5]},
          wrong=[{"kind": "intro", "applied_overlap": 0.1, "refusal": "clamp"},
                 {"kind": "outro", "applied_overlap": 0.3, "refusal": "clamp"}]),
    # 0.6 - 0.55 is 0.050000000000000044 in IEEE arithmetic: the crossfade is eligible.
    _case("main-limited, eligible", fade=0.9, segment=2, content=2.0, intro=0.6,
          expect={"intro": [XF, 0.55]},
          wrong=[{"kind": "intro", "applied_overlap": 0.3, "refusal": "clamp"}]),
    # 0.4 - 0.35 is 0.04999999999999999: concat_outro hard-cuts.
    _case("main-limited, ineligible", fade=0.5, segment=2, content=2.0, intro=0.4,
          expect={"intro": [SOFT, 0.0]},
          wrong=[{"kind": "intro", "applied_overlap": 0.35, "branch": XF, "refusal": "eligibility"}]),
    _case("appended-limited intro", fade=0.5, segment=0.3, content=0.3, intro=2.0,
          expect={"intro": [XF, 0.25]},
          wrong=[{"kind": "intro", "applied_overlap": 0.45, "refusal": "clamp"}]),
    # The outro's first input is intro + content - 0.25 = 2.05 s, not the 0.3 s content.
    _case("outro main includes the intro", fade=0.5, segment=0.3, content=0.3, intro=2.0, outro=2.0,
          expect={"intro": [XF, 0.25], "outro": [XF, 0.5]},
          wrong=[{"kind": "outro", "applied_overlap": 0.25, "refusal": "clamp"}]),
    _case("appended-limited outro", fade=0.5, segment=2, content=2.0, outro=0.3,
          expect={"outro": [XF, 0.25]},
          wrong=[{"kind": "outro", "applied_overlap": 0.2, "refusal": "clamp"}]),
    _case("main-limited outro", fade=0.9, segment=0.6, content=0.6, outro=2.0,
          expect={"outro": [XF, 0.55]},
          wrong=[{"kind": "outro", "applied_overlap": 0.5, "refusal": "clamp"}]),
    _case("no fade", fade=0.0, segment=2, content=2.0, intro=2.0, outro=2.0,
          expect={"intro": [SOFT, 0.0], "outro": [SOFT, 0.0]},
          wrong=[{"kind": "intro", "applied_overlap": 0.25, "branch": XF, "refusal": "eligibility"}]),
    _case("short input, eligible", fade=0.5, segment=2, content=2.0, intro=0.1,
          expect={"intro": [XF, 0.05]}),
    _case("short input, ineligible", fade=0.5, segment=2, content=2.0, intro=0.08,
          expect={"intro": [SOFT, 0.0]},
          wrong=[{"kind": "intro", "applied_overlap": 0.05, "branch": XF, "refusal": "eligibility"}]),
    # Both assets round to 0.1 s; only the unrounded input decides the branch.
    _case("rounded asset 0.1, crossfades", fade=0.05, segment=2, content=2.0, intro=0.1004,
          expect={"intro": [XF, 0.05]}),
    _case("rounded asset 0.1, hard cut", fade=0.05, segment=2, content=2.0, intro=0.0996,
          expect={"intro": [SOFT, 0.0]},
          wrong=[{"kind": "intro", "applied_overlap": 0.05, "branch": XF, "refusal": "eligibility"}]),
    _case("full precision and rounding", fade=0.3333333, segment=2, content=2.0004, intro=1.23456789,
          outro=1.7654321,
          expect={"intro": [XF, 0.333], "outro": [XF, 0.333]},
          wrong=[{"kind": "intro", "applied_overlap": 0.3, "refusal": "clamp"}]),
    _case("crossfade fails after eligibility", fade=0.5, segment=2, content=2.0, intro=2.0, outro=2.0,
          xfade="fail",
          expect={"intro": [SOFT, 0.0], "outro": [SOFT, 0.0]},
          wrong=[{"kind": "intro", "applied_overlap": 0.5, "refusal": "hard-cut"}]),
    _case("pure hard cut", fade=0.5, segment=2, content=2.0, intro=2.0, outro=2.0, xfade="fail",
          soft_audio="fail",
          expect={"intro": [CUT, 0.0], "outro": [CUT, 0.0]}),
]

_XFADE_DURATION = re.compile(r"xfade=transition=[^:]+:duration=([^:]+):offset=")


def _write_marker(path, seconds):
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps({"fake": True, "duration": seconds, "has_audio": True}) + "\nexact join matrix marker\n")
    return path


def _marker_seconds(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return float(json.loads(f.readline())["duration"])
    except (OSError, ValueError, KeyError, TypeError):
        return None


def _inputs(parts):
    return [parts[i + 1] for i, part in enumerate(parts) if part == "-i"]


def render(params, media, mutate=None):
    """Run one exact create_clip request through the real producer; return its data and join reports."""
    source = os.path.abspath(params["video_path"])
    assets = {"intro": params.get("intro_path"), "outro": params.get("outro_path")}
    width, height = get_format(params.get("format")).dims
    content = float(media["content"])
    joins = []
    emitted = {}

    def asset_seconds(path):
        # A marker carries its own duration; a raw bookend asset lasts what `media` says.
        seconds = _marker_seconds(path)
        if seconds is not None:
            return seconds
        for kind, asset in assets.items():
            if asset and os.path.abspath(path) == os.path.abspath(asset):
                return float(media[kind])
        raise AssertionError(f"join matrix fixture: no duration for {path}")

    def probe(path):
        if os.path.abspath(path) == source:
            seconds, size = SOURCE_SECONDS, os.path.getsize(path)
        else:
            seconds = _marker_seconds(path)
            if seconds is None:
                raise er.ExactRenderVerificationError(f"output is missing: {path}")
            size = os.path.getsize(path)
        return {
            "path": path, "file_size_bytes": size, "duration": seconds, "has_video": True, "has_audio": True,
            "width": 1920 if path == source else width, "height": 1080 if path == source else height,
            "fps": 25.0, "frame_rate_variable": False, "video_start": 0.0, "video_duration": seconds,
            "video_end": seconds, "audio_start": 0.0, "audio_duration": seconds, "audio_end": seconds,
        }

    def ffmpeg(cmd_parts_before_enc, cmd_parts_after_enc=None, output_path=None, label="", **_):
        inputs = _inputs([str(p) for p in cmd_parts_before_enc])
        if label in ("outro_scale", "main_reenc"):
            seconds = asset_seconds(inputs[0])
        elif label == "outro_hardcut_soft_audio":
            if media.get("soft_audio") == "fail":
                raise RuntimeError("softened hard cut unavailable (fixture)")
            seconds = asset_seconds(inputs[0]) + asset_seconds(inputs[1])
        else:
            raise AssertionError(f"join matrix fixture: unexpected FFmpeg stage {label}")
        return _write_marker(output_path, seconds)

    def run(cmd, **_):
        parts = [str(p) for p in cmd]
        inputs = _inputs(parts)
        if "-filter_complex" in parts and "xfade=" in parts[parts.index("-filter_complex") + 1]:
            if media.get("xfade") == "fail":
                return SimpleNamespace(returncode=1, stdout="", stderr="xfade unavailable (fixture)")
            duration = float(_XFADE_DURATION.search(parts[parts.index("-filter_complex") + 1]).group(1))
            _write_marker(parts[-1], asset_seconds(inputs[0]) + asset_seconds(inputs[1]) - duration)
            return SimpleNamespace(returncode=0, stdout="", stderr="")
        if "-f" in parts and parts[parts.index("-f") + 1] == "concat":
            with open(inputs[0], "r", encoding="utf-8") as f:
                listed = [line.strip()[len("file '"):-1] for line in f if line.strip()]
            _write_marker(parts[-1], sum(asset_seconds(p) for p in listed))
            return SimpleNamespace(returncode=0, stdout="", stderr="")
        raise AssertionError(f"join matrix fixture: unexpected command {parts[:6]}")

    real_concat = vp.concat_outro

    def concat(first, second, output, crossfade_duration=0.8, report=None, **kw):
        kind = "intro" if os.path.basename(first) == "intro_scaled.mp4" else "outro"
        path = real_concat(first, second, output, crossfade_duration=crossfade_duration, report=report, **kw)
        entry = {"kind": kind, "report": copy.deepcopy(report), "mutated": False}
        if mutate and mutate["kind"] == kind and report is not None:
            overlap = float(mutate["applied_overlap"])
            report["applied_overlap"] = overlap
            if mutate.get("branch"):
                report["branch"] = mutate["branch"]
            report["output_duration"] = report["main_duration"] + report["appended_duration"] - overlap
            _write_marker(output, report["output_duration"])
            entry["mutated"] = True
        joins.append(entry)
        return path

    def emit_result(task_id, status, data=None, error=None):
        emitted.update(status=status, data=data, error=error)

    def stage(out):
        return _write_marker(out, content)

    patches = [
        mock.patch.object(bridge, "emit_result", side_effect=emit_result),
        mock.patch.object(bridge, "emit_progress"),
        mock.patch.object(cg, "cut_multi_segment", side_effect=lambda video, out, segments: stage(out)),
        mock.patch.object(cg, "cut_segment", side_effect=lambda video, out, start, end: stage(out)),
        mock.patch.object(cg, "crop_to_vertical", side_effect=lambda inp, out, **kw: stage(out)),
        mock.patch.object(cg, "fit_to_frame", side_effect=lambda inp, out, **kw: stage(out)),
        mock.patch.object(cg, "normalize_audio", side_effect=lambda inp, out, *a, **kw: stage(out)),
        mock.patch.object(cg, "_render_with_remotion", side_effect=lambda **kw: (stage(kw["output_path"]), (True, None))[1]),
        mock.patch.object(cg, "render_captions", side_effect=lambda **kw: stage(kw["output_path"])),
        mock.patch.object(cg, "burn_captions", side_effect=lambda **kw: stage(kw["output_path"])),
        mock.patch.object(cg, "concat_outro", side_effect=concat),
        mock.patch.object(er, "probe_media", side_effect=probe),
        mock.patch.object(audiogram, "is_audio_only", return_value=False),
        mock.patch.object(vp, "get_dimensions", return_value=(width, height)),
        mock.patch.object(vp, "scale_to_frame", side_effect=lambda inp, out, w, h: _write_marker(out, asset_seconds(inp))),
        mock.patch.object(vp, "_get_media_duration_seconds",
                          side_effect=lambda path, default=0.0: _marker_seconds(path) if _marker_seconds(path) is not None else default),
        mock.patch.object(vp, "_has_audio_stream", return_value=True),
        mock.patch.object(vp, "get_video_encode_flags", return_value=list(vp.CPU_FLAGS)),
        mock.patch.object(vp, "_run_ffmpeg_with_fallback", side_effect=ffmpeg),
        mock.patch.object(vp, "proc_run", side_effect=run),
    ]
    cg._reserved_output_paths.clear()
    with contextlib.ExitStack() as stack:
        for patch in patches:
            stack.enter_context(patch)
        bridge.handle_create_clip("exact-join-matrix", dict(params))
    if emitted.get("status") != "success":
        raise AssertionError(f"join matrix fixture: create_clip emitted {emitted}")
    # The bridge serializes its result as JSON; so does the response.
    return {"result": json.loads(json.dumps(emitted["data"])), "joins": joins}


def main(argv):
    if len(argv) == 3 and argv[1] == "cases":
        Path(argv[2]).write_text(json.dumps(CASES), encoding="utf-8")
        return 0
    if len(argv) == 4 and argv[1] == "render":
        request = json.loads(Path(argv[2]).read_text(encoding="utf-8"))
        response = render(request["params"], request["media"], request.get("mutate"))
        Path(argv[3]).write_text(json.dumps(response), encoding="utf-8")
        return 0
    print(__doc__, file=sys.stderr)
    return 3


if __name__ == "__main__":
    sys.exit(main(sys.argv))
