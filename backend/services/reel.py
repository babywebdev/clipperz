"""Editable highlight-reel sessions — the shared core behind the CLI, MCP, and UI.

Detection (the slow signal analysis) runs once into a persisted session of moments.
Every later edit — longer, shorter, shift, drop, reorder — mutates that session and
re-cuts only the changed moment straight from the source (~seconds), then rebuilds the
reel. No re-detection, no heavy render. All three surfaces operate on the same session
so an edit made in one shows up in the others.
"""

import json
import hashlib
import os
import copy
import shutil
import subprocess
import tempfile
import uuid
from dataclasses import dataclass, field, asdict
from typing import Optional, Callable

from utils.proc import run as proc_run
from config.paths import paths
from services.formats import get_format


def _sessions_dir() -> str:
    # paths["packed"] is .podcli/packed; its parent is the .podcli root.
    d = os.path.join(os.path.dirname(paths["packed"]), "reels")
    os.makedirs(d, exist_ok=True)
    return d


def session_path(session_id: str) -> str:
    return os.path.join(_sessions_dir(), f"{session_id}.json")


@dataclass
class Moment:
    start: float
    end: float
    why: str = "energy_peak"
    text: str = ""
    source: str = ""  # empty falls back to the session source (single-video reels)
    enabled: bool = True
    dirty: bool = True  # needs a re-cut before the next build
    moment_id: str = field(default_factory=lambda: uuid.uuid4().hex)

    @property
    def duration(self) -> float:
        return round(self.end - self.start, 1)


@dataclass
class ReelSession:
    session_id: str
    source: str
    profile: str
    out_dir: str
    format: str = "horizontal"
    logo: str = ""
    moments: list[Moment] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)
    selection_settings: dict = field(default_factory=dict)
    seen_ranges: list[dict] = field(default_factory=list)
    family_id: str = ""
    batch_number: int = 1

    def save(self) -> str:
        path = session_path(self.session_id)
        fd, temporary = tempfile.mkstemp(prefix=".reel-", suffix=".tmp", dir=_sessions_dir())
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(asdict(self), f, indent=2)
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.remove(temporary)
        return path

    @property
    def revision(self) -> str:
        return hashlib.sha256(json.dumps(asdict(self), sort_keys=True).encode()).hexdigest()

    @classmethod
    def load(cls, session_id: str) -> "ReelSession":
        with open(session_path(session_id), encoding="utf-8") as f:
            data = json.load(f)
        # Old saved batches gain repeatable identities without a read changing the file.
        data["moments"] = [Moment(**{**m, "moment_id": m.get("moment_id") or
            uuid.uuid5(uuid.NAMESPACE_URL, f"reel:{session_id}:{i}").hex})
            for i, m in enumerate(data.get("moments", []))]
        return cls(**data)


def _clip_text(words: list[dict], a: float, b: float) -> str:
    return " ".join(
        str(w.get("word", "")).strip()
        for w in words
        if w.get("start", 0) >= a - 0.05 and w.get("end", 0) <= b + 0.05
    )


def remember_moments(session: ReelSession) -> None:
    """Keep proposed and edited ranges, including moments later dropped by the user."""
    for m in session.moments:
        r = {"source": m.source or session.source, "start": m.start, "end": m.end}
        if r not in session.seen_ranges:
            session.seen_ranges.append(r)


def selection_settings(params: dict) -> dict:
    from services.saliency import validate_limits
    auto = bool(params.get("auto", False))
    settings = {
        "auto": auto,
        "top_n": 50 if auto else params.get("top_n", 10),
        "min_dur": 5.0 if auto else params.get("min_dur", 15.0),
        "max_dur": 120.0 if auto else params.get("max_dur", 60.0),
    }
    validate_limits(settings["top_n"], settings["min_dur"], settings["max_dur"])
    return settings


def find_different_session(previous: ReelSession, settings: dict,
                           progress_callback: Optional[Callable] = None,
                           mode: str = "append") -> ReelSession:
    """Append unused moments to this reel, or explicitly start a separate batch."""
    from services.saliency import detect_highlights, detect_highlights_pooled
    from services.transcript_packer import load_cached_transcript_for_video

    if mode not in {"append", "new"}:
        raise ValueError("Choose append or new for different moments.")
    settings = selection_settings(settings)
    family_id = previous.family_id or previous.session_id
    related = [previous]
    for filename in os.listdir(_sessions_dir()):
        if not filename.endswith(".json") or filename == previous.session_id + ".json":
            continue
        try:
            other = ReelSession.load(filename[:-5])
        except (OSError, ValueError, TypeError):
            continue
        if (other.family_id or other.session_id) == family_id:
            related.append(other)
    seen = []
    for sibling in related:
        # Work on the loaded copies; the previous saved session stays intact.
        current = [{"source": m.source or sibling.source, "start": m.start, "end": m.end}
                   for m in sibling.moments]
        for r in sibling.seen_ranges + current:
            if r not in seen:
                seen.append(dict(r))
    sources = previous.sources or list(dict.fromkeys(
        [previous.source] + [m.source for m in previous.moments if m.source]))
    common = dict(profile_name=previous.profile, top_n=settings["top_n"],
                  min_dur=settings["min_dur"], max_dur=settings["max_dur"],
                  # Broaden to quieter positive peaks after the strongest were used.
                  height_z=0.25, progress_callback=progress_callback)
    words = None
    if len(sources) > 1:
        clips = detect_highlights_pooled(sources, excluded_ranges=seen, **common)
    else:
        cached = load_cached_transcript_for_video(sources[0])
        words = cached.get("words") if cached else None
        clips = detect_highlights(sources[0], words=words, excluded_ranges=seen, **common)
    if not clips:
        raise ValueError("No unused highlights fit these lengths. Your saved reels are unchanged. "
                         "Try shorter Custom lengths or start with another video.")
    new_moments = [Moment(start=c["start_second"], end=c["end_second"],
                         why=c.get("reasons", ["energy_peak"])[0], source=c.get("source_file", ""),
                         text=_clip_text(words, c["start_second"], c["end_second"]) if words else "")
                   for c in clips]
    if mode == "append":
        session = copy.deepcopy(previous)
        session.sources, session.family_id = sources, family_id
        session.selection_settings, session.seen_ranges = settings, seen
        session.moments.extend(new_moments)
        remember_moments(session)
        return _publish_revision(previous, session, progress_callback)
    sid = family_id[:24] + "_" + uuid.uuid4().hex[:12]
    session = ReelSession(
        session_id=sid, source=sources[0], profile=previous.profile,
        out_dir=os.path.join(os.path.dirname(os.path.abspath(previous.out_dir)), "reel_" + sid),
        format=previous.format, logo=previous.logo, sources=sources,
        family_id=family_id, batch_number=max(s.batch_number for s in related) + 1,
        selection_settings=settings, seen_ranges=seen,
        moments=new_moments,
    )
    remember_moments(session)
    # Render before publishing the new session. Failed builds must not consume picks.
    build_reel(session, progress_callback=progress_callback, save_session=False)
    session.save()
    return session


def check_revision(session: ReelSession, expected: Optional[str]) -> None:
    if expected is not None and session.revision != expected:
        raise ValueError("This reel changed in another window. Reopen it from All highlights and try again.")


def _publish_revision(previous: ReelSession, updated: ReelSession,
                      progress_callback: Optional[Callable] = None) -> ReelSession:
    """Build in a fresh folder; keep the saved cut intact if rendering fails.

    Relink cached clips by identity, not list position. This avoids re-encoding on
    reorder and preserves excluded clips for individual downloads and re-inclusion.
    """
    parent = os.path.dirname(os.path.abspath(previous.out_dir))
    os.makedirs(parent, exist_ok=True)
    updated.out_dir = tempfile.mkdtemp(prefix=f"reel_{previous.session_id}_edit_", dir=parent)
    try:
        clips_dir = os.path.join(updated.out_dir, "clips")
        os.makedirs(clips_dir)
        old = {m.moment_id: (i, m) for i, m in enumerate(previous.moments, 1)}
        for i, m in enumerate(updated.moments, 1):
            cached = old.get(m.moment_id)
            if not cached or m.dirty:
                continue
            old_index, old_moment = cached
            if (m.start, m.end, m.source) != (old_moment.start, old_moment.end, old_moment.source):
                m.dirty = True
                continue
            source = os.path.join(previous.out_dir, "clips", f"clip_{old_index:02d}.mp4")
            if os.path.isfile(source):
                target = os.path.join(clips_dir, f"clip_{i:02d}.mp4")
                try:
                    os.link(source, target)
                except OSError:
                    shutil.copy2(source, target)
        if any(m.enabled for m in updated.moments):
            build_reel(updated, progress_callback=progress_callback, save_session=False)
        check_revision(ReelSession.load(previous.session_id), previous.revision)
        updated.save()
        return updated
    except Exception:
        # Only this function's newly allocated staging directory is removed.
        shutil.rmtree(updated.out_dir, ignore_errors=True)
        raise


def reorder_moments(session: ReelSession, order: list[str],
                    progress_callback: Optional[Callable] = None) -> ReelSession:
    ids = [m.moment_id for m in session.moments]
    if (not isinstance(order, list) or not all(isinstance(i, str) for i in order)
            or len(order) != len(ids) or len(set(order)) != len(order) or set(order) != set(ids)):
        raise ValueError("The order must contain every current moment exactly once. Reopen the reel and try again.")
    if order == ids:
        return session
    updated = copy.deepcopy(session)
    by_id = {m.moment_id: m for m in updated.moments}
    updated.moments = [by_id[i] for i in order]
    return _publish_revision(session, updated, progress_callback)


def seed_session(
    session_id: str,
    source: str,
    out_dir: str,
    profile: str = "auto",
    format: str = "horizontal",
    top_n: int = 10,
    min_dur: float = 15.0,
    max_dur: float = 60.0,
    words: Optional[list[dict]] = None,
    logo: str = "",
    progress_callback: Optional[Callable] = None,
) -> ReelSession:
    """Run detection once and persist the moments as an editable session."""
    from services.saliency import detect_highlights

    clips = detect_highlights(
        source, profile_name=profile, top_n=top_n, min_dur=min_dur, max_dur=max_dur,
        words=words, progress_callback=progress_callback,
    )
    moments = [
        Moment(
            start=round(c["start_second"], 1),
            end=round(c["end_second"], 1),
            why=c.get("reasons", ["energy_peak"])[0],
            text=_clip_text(words, c["start_second"], c["end_second"]) if words else "",
        )
        for c in clips
    ]
    session = ReelSession(
        session_id, source, profile, out_dir, format=get_format(format).name, logo=logo, moments=moments,
        sources=[source], family_id=session_id,
        selection_settings={"auto": False, "top_n": top_n, "min_dur": min_dur, "max_dur": max_dur},
    )
    remember_moments(session)
    session.save()
    return session


def seed_session_pooled(
    session_id: str,
    sources: list[str],
    out_dir: str,
    profile: str = "auto",
    format: str = "horizontal",
    top_n: int = 10,
    min_dur: float = 15.0,
    max_dur: float = 60.0,
    logo: str = "",
    progress_callback: Optional[Callable] = None,
) -> ReelSession:
    """Detect across many videos, rank globally, and persist one editable session."""
    from services.saliency import detect_highlights_pooled

    clips = detect_highlights_pooled(
        sources, profile_name=profile, top_n=top_n, min_dur=min_dur, max_dur=max_dur,
        progress_callback=progress_callback,
    )
    moments = [
        Moment(
            start=round(c["start_second"], 1),
            end=round(c["end_second"], 1),
            why=c.get("reasons", ["energy_peak"])[0],
            source=c.get("source_file", ""),
        )
        for c in clips
    ]
    session = ReelSession(
        session_id, sources[0], profile, out_dir, format=get_format(format).name, logo=logo, moments=moments,
        sources=list(sources), family_id=session_id,
        selection_settings={"auto": False, "top_n": top_n, "min_dur": min_dur, "max_dur": max_dur},
    )
    remember_moments(session)
    session.save()
    return session


_EDITS = {
    "longer":  lambda m, s: setattr(m, "end", round(m.end + s, 1)),
    "shorter": lambda m, s: setattr(m, "end", round(max(m.start + 1, m.end - s), 1)),
    "earlier": lambda m, s: setattr(m, "start", round(max(0.0, m.start - s), 1)),
    "later":   lambda m, s: setattr(m, "start", round(min(m.end - 1, m.start + s), 1)),
    "shift":   lambda m, s: (setattr(m, "start", round(max(0.0, m.start + s), 1)),
                             setattr(m, "end", round(m.end + s, 1))),
}


def edit_moment(
    session: ReelSession,
    index: int,
    op: str,
    seconds: float = 0.0,
    start: Optional[float] = None,
    end: Optional[float] = None,
) -> ReelSession:
    """Apply an edit to one moment (1-based index) and mark it for re-cut."""
    if not (1 <= index <= len(session.moments)):
        raise IndexError(f"no moment {index} (have {len(session.moments)})")
    m = session.moments[index - 1]
    remember_moments(session)
    if op == "drop":
        session.moments.pop(index - 1)
        # Clip files are keyed by position, so everything after the hole now maps
        # to a stale neighbour's cut. Force those to re-cut on the next build.
        for shifted in session.moments[index - 1:]:
            shifted.dirty = True
    elif op == "toggle":
        m.enabled = not m.enabled
    elif op == "set":
        if start is not None:
            m.start = round(max(0.0, float(start)), 1)
        if end is not None:
            m.end = round(float(end), 1)
        if m.end <= m.start:
            m.end = round(m.start + 1.0, 1)
        m.dirty = True
    elif op in _EDITS:
        _EDITS[op](m, seconds)
        m.dirty = True
    else:
        raise ValueError(f"unknown op {op!r}")
    remember_moments(session)
    session.save()
    return session


def _scale_filter(format: str) -> str:
    spec = get_format(format)
    w, h = spec.width, spec.height
    if spec.reframe:
        # Vertical/square from a wider source: cover the frame, then centre-crop.
        return f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"
    return (f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
            f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2")


def _encode_flags() -> list[str]:
    from services.encoder import get_video_encode_flags
    return [*get_video_encode_flags(), "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart"]


def _cut(source: str, out_dir: str, idx: int, m: Moment, format: str, logo: str = "") -> str:
    clips_dir = os.path.join(out_dir, "clips")
    os.makedirs(clips_dir, exist_ok=True)
    out = os.path.join(clips_dir, f"clip_{idx:02d}.mp4")
    # A previous revision may share this cached file through a hard link.
    if os.path.exists(out):
        os.remove(out)
    cmd = ["ffmpeg", "-y", "-ss", str(m.start), "-i", source, "-t", str(m.duration)]
    if logo and os.path.exists(logo):
        spec = get_format(format)
        logo_h = max(1, round(spec.height * 0.08))
        margin = max(1, round(spec.height * 0.04))
        cmd += [
            "-i", logo, "-filter_complex",
            f"[0:v]{_scale_filter(format)}[base];[1:v]scale=-1:{logo_h}[lg];"
            f"[base][lg]overlay=W-w-{margin}:{margin}[v]",
            "-map", "[v]", "-map", "0:a?",
        ]
    else:
        cmd += ["-vf", _scale_filter(format)]
    cmd += [*_encode_flags(), out, "-loglevel", "error"]
    proc_run(cmd, timeout=300, check=True)
    return out


def build_reel(session: ReelSession, progress_callback: Optional[Callable] = None,
               save_session: bool = True) -> Optional[str]:
    """Re-cut only dirty moments, then concatenate all enabled moments into the reel."""
    os.makedirs(session.out_dir, exist_ok=True)
    files = []
    active = [(i, m) for i, m in enumerate(session.moments, 1) if m.enabled]
    reel = os.path.join(session.out_dir, "highlights_reel.mp4")
    if not active:
        if os.path.exists(reel):
            os.remove(reel)
        if save_session:
            session.save()
        return None
    for n, (i, m) in enumerate(active, 1):
        clip = os.path.join(session.out_dir, "clips", f"clip_{i:02d}.mp4")
        if m.dirty or not os.path.exists(clip):
            if progress_callback:
                progress_callback(int(n / len(active) * 90), f"cutting moment {i}")
            clip = _cut(m.source or session.source, session.out_dir, i, m, session.format, session.logo)
            m.dirty = False
        files.append(clip)
    _concat_clips(files, reel, session.out_dir)
    if save_session:
        session.save()
    if progress_callback:
        progress_callback(100, f"built reel with {len(files)} moments")
    return reel


def _concat_clips(files: list[str], reel: str, work_dir: str) -> None:
    if not files:
        raise ValueError("Include at least one moment before downloading the reel.")
    lst = os.path.join(work_dir, "_concat.txt")
    with open(lst, "w", encoding="utf-8") as f:
        for x in files:
            p = os.path.abspath(x).replace("\\", "/")
            f.write(f"file '{p}'\n")
    r = proc_run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                  "-c", "copy", reel, "-loglevel", "error"], timeout=300, check=False)
    if r.returncode != 0:
        proc_run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                  *_encode_flags(), reel, "-loglevel", "error"],
                 timeout=900, check=True)


def export_download(
    session: ReelSession,
    format: str,
    index: Optional[int] = None,
    progress_callback: Optional[Callable] = None,
) -> dict:
    """Render a download variant from the sources without changing the session.

    Cache by the actual cut recipe and input versions, so edits never download a
    stale variant. Only complete exports are published outside the staging folder.
    """
    if format not in {"vertical", "horizontal", "square"}:
        raise ValueError("Choose vertical, horizontal, or square for the download format.")
    if index is not None and (type(index) is not int or not 1 <= index <= len(session.moments)):
        raise ValueError("The selected highlight does not exist.")
    active = ([(index, session.moments[index - 1])] if index is not None else
              [(i, m) for i, m in enumerate(session.moments, 1) if m.enabled])
    if not active:
        raise ValueError("Include at least one moment before downloading the reel.")

    def input_version(source: str) -> dict:
        try:
            stat = os.stat(source)
        except OSError as exc:
            raise FileNotFoundError(f"Original media is unavailable: {source}. Restore it to download another format.") from exc
        return {"path": os.path.abspath(source), "size": stat.st_size, "modified": stat.st_mtime_ns}

    recipe = {
        "version": 1, "format": format,
        "logo": input_version(session.logo) if session.logo else None,
        "moments": [{"index": i, "start": m.start, "end": m.end,
                     "source": input_version(m.source or session.source)} for i, m in active],
    }
    key = hashlib.sha256(json.dumps(recipe, sort_keys=True).encode()).hexdigest()[:20]
    name = f"clip_{index:02d}" if index is not None else "highlights_reel"
    variants = os.path.join(session.out_dir, "downloads", format)
    os.makedirs(variants, exist_ok=True)
    output = os.path.join(variants, f"{name}_{format}_{key}.mp4")
    if os.path.isfile(output) and os.path.getsize(output) > 0:
        return {"file_path": output, "format": format, "cached": True}

    with tempfile.TemporaryDirectory(prefix="render-", dir=variants) as work_dir:
        files = []
        for n, (i, m) in enumerate(active):
            if progress_callback:
                progress_callback(int(n / len(active) * 90), f"Rendering {format} moment {i}")
            files.append(_cut(m.source or session.source, work_dir, i, m, format, session.logo))
        if index is not None:
            completed = files[0]
        else:
            completed = os.path.join(work_dir, "reel.mp4")
            if progress_callback:
                progress_callback(95, "Joining the selected moments")
            _concat_clips(files, completed, work_dir)
        os.replace(completed, output)
    if progress_callback:
        progress_callback(100, "Download ready")
    return {"file_path": output, "format": format, "cached": False}


def list_sessions() -> list[dict]:
    """Summaries of every persisted reel session, newest first."""
    out = []
    d = _sessions_dir()
    for name in os.listdir(d):
        if not name.endswith(".json"):
            continue
        path = os.path.join(d, name)
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue
        moments = data.get("moments", [])
        reel = os.path.join(data.get("out_dir", ""), "highlights_reel.mp4")
        out.append({
            "session_id": data.get("session_id", name[:-5]),
            "source": data.get("source", ""),
            "profile": data.get("profile", ""),
            "format": data.get("format", "horizontal"),
            "moment_count": len(moments),
            "enabled_count": sum(1 for m in moments if m.get("enabled", True)),
            "source_count": len(data.get("sources", [])) or len({m.get("source") for m in moments if m.get("source")}) or 1,
            "batch_number": data.get("batch_number", 1),
            "reel_path": reel if os.path.exists(reel) else None,
            "mtime": os.path.getmtime(path),
        })
    out.sort(key=lambda s: s["mtime"], reverse=True)
    return out


def delete_session(session_id: str) -> bool:
    path = session_path(session_id)
    if not os.path.exists(path):
        return False
    os.remove(path)
    return True
