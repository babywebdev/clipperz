"""
Clip history — read/write .podcli/history/clips.json.

Shared on-disk contract with the TypeScript ClipsHistory service
(src/services/clips-history.ts). Both languages read and write the same
file; this module is the Python writer used by the CLI.

Entry shape (all fields beyond the core render record are optional):
  id, source_video, start_second, end_second, caption_style, crop_strategy,
  logo_path?, title, output_path, file_size_mb, duration, created_at,
  content_type?, transcript_slice?, youtube_video_id?, metrics?,
  generated_titles?, description?, tags?, hashtags?

metrics? = {views?, retention?, ctr?, impressions?, fetched_at?}  (Phase 2)

Rules
- Writes are read-modify-write and MUST preserve unknown keys, so fields
  written by the other language (e.g. Phase 2 metrics) are never clobbered.
- Every mutation goes through ``mutate_clips_history``: it holds the shared
  cross-process lock (services/mutation_lock.py, same protocol as the TS side)
  from the fresh read and id resolution through the atomic replacement.
- A missing file initializes to an empty list. Invalid JSON, an invalid shape,
  or an unreadable file aborts the mutation without changing a byte.
"""

import json
import os
import shutil
import sys
import time
import uuid
from typing import Callable, Optional, TypeVar

from config.paths import paths
from services.mutation_lock import FileLockError, file_lock

T = TypeVar("T")


class ClipsHistoryError(RuntimeError):
    """Base class for surfaced history failures (lock or read)."""


class HistoryReadError(ClipsHistoryError):
    """The history file exists but cannot be used. ``code`` is one of
    HISTORY_UNREADABLE, HISTORY_INVALID_JSON, HISTORY_INVALID_SHAPE."""

    def __init__(self, code: str, message: str, path: str):
        super().__init__(message)
        self.code = code
        self.path = path


class HistoryLockError(ClipsHistoryError):
    def __init__(self, cause: FileLockError):
        super().__init__(str(cause))
        self.code = cause.code
        self.lock_path = cause.lock_path
        self.owner = cause.owner


def _history_path() -> str:
    return paths["clipsHistory"]


def _validate_shape(data: object, path: str) -> list[dict]:
    """Minimum compatible structure: a list of objects, each with a non-empty
    string ``id``. Every existing reader and writer already depends on ``id``;
    no other field is required so legacy entries keep working."""
    if not isinstance(data, list):
        raise HistoryReadError(
            "HISTORY_INVALID_SHAPE",
            f"History file {path} must contain a JSON array of clip entries. No changes were written.",
            path,
        )
    for index, entry in enumerate(data):
        if not isinstance(entry, dict) or not isinstance(entry.get("id"), str) or not entry["id"]:
            raise HistoryReadError(
                "HISTORY_INVALID_SHAPE",
                f"History file {path} entry {index} is not a clip record with a string id. No changes were written.",
                path,
            )
    return data


def read_clips_history_strict(path: Optional[str] = None) -> tuple[list[dict], Optional[str]]:
    """Return (entries, raw text). A missing file yields ([], None). Any other
    failure raises HistoryReadError so a mutation cannot overwrite it."""
    path = path or _history_path()
    try:
        with open(path, encoding="utf-8") as f:
            raw = f.read()
    except FileNotFoundError:
        return [], None
    except OSError as exc:
        raise HistoryReadError(
            "HISTORY_UNREADABLE", f"History file {path} could not be read ({exc}). No changes were written.", path
        ) from exc
    text = raw.lstrip("﻿")
    try:
        data = json.loads(text)
    except ValueError as exc:
        raise HistoryReadError(
            "HISTORY_INVALID_JSON",
            f"History file {path} is not valid JSON ({exc}). No changes were written. "
            "Restore it from a backup or repair the file, then retry.",
            path,
        ) from exc
    return _validate_shape(data, path), text


def load_clips_history() -> list[dict]:
    """Load all clip entries for reading. Returns [] if the file is missing;
    also [] (with a warning on stderr) if it is unreadable or invalid, so
    listing keeps working. Mutations never use this lenient path."""
    try:
        entries, _ = read_clips_history_strict()
        return entries
    except HistoryReadError as exc:
        print(f"  ! clip history unavailable: {exc}", file=sys.stderr)
        return []


def _serialize(entries: list[dict]) -> str:
    return json.dumps(entries, indent=2, ensure_ascii=False)


_REPLACE_RETRY_S = 1.0
_REPLACE_RETRY_STEP_S = 0.025


def _write_entries_locked(path: str, text: str) -> None:
    """Atomic replacement: temp file then os.replace. On failure the original
    file is untouched and the temp file is removed.

    Windows refuses to replace a file another process has open without
    FILE_SHARE_DELETE (a lenient reader in either language can hold it for
    milliseconds), so the replace retries briefly before the error surfaces.
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f"{path}.{os.getpid()}.{uuid.uuid4().hex[:8]}.tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(text)
        deadline = time.monotonic() + _REPLACE_RETRY_S
        while True:
            try:
                os.replace(tmp, path)
                break
            except PermissionError:
                if time.monotonic() >= deadline:
                    raise
                time.sleep(_REPLACE_RETRY_STEP_S)
    except BaseException:
        try:
            os.remove(tmp)
        except OSError:
            pass
        raise


def mutate_clips_history(fn: Callable[[list[dict]], T], timeout_ms: Optional[int] = None) -> T:
    """Run ``fn(entries)`` as one locked read-modify-write cycle.

    ``fn`` mutates the list in place and returns whatever the caller needs.
    The file is rewritten only when the content changed, so a no-op mutation
    leaves the bytes alone.
    """
    path = _history_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    try:
        with file_lock(path, timeout_ms=timeout_ms, tool="clipperz-cli"):
            entries, _raw = read_clips_history_strict(path)
            before = json.dumps(entries, ensure_ascii=False)
            result = fn(entries)
            # Rewrite only when the content changed: a lookup that finds nothing
            # must not touch the file, and a missing file stays missing.
            if json.dumps(entries, ensure_ascii=False) != before:
                _write_entries_locked(path, _serialize(entries))
            return result
    except FileLockError as exc:
        raise HistoryLockError(exc) from exc


def list_clips(limit: int = 50) -> list[dict]:
    """Most recent clips first."""
    entries = load_clips_history()
    return entries[-limit:][::-1]


def get_clips_by_source(video_path: str) -> list[dict]:
    """All clips from a source video (basename match), newest first."""
    target = os.path.basename(video_path)
    entries = load_clips_history()
    return [e for e in entries if os.path.basename(e.get("source_video", "")) == target][::-1]


def _find_in(entries: list[dict], clip_id: str) -> Optional[dict]:
    """Exact id match, falling back to an unambiguous prefix match."""
    if not clip_id:
        return None
    for e in entries:
        if e.get("id") == clip_id:
            return e
    prefix_matches = [e for e in entries if str(e.get("id", "")).startswith(clip_id)]
    return prefix_matches[0] if len(prefix_matches) == 1 else None


def find_clip(clip_id: str) -> Optional[dict]:
    """Find by exact id, falling back to an unambiguous prefix match."""
    return _find_in(load_clips_history(), clip_id)


def _clip_sidecar_paths(clip_id: str) -> list[str]:
    """Per-clip sidecar files (words/recipe/reframe) and the thumbnail dir."""
    history_dir = os.path.dirname(_history_path())
    return [
        os.path.join(history_dir, "words", f"{clip_id}.json"),
        os.path.join(history_dir, "recipes", f"{clip_id}.json"),
        os.path.join(history_dir, "reframe", f"{clip_id}.json"),
    ]


def delete_clip(clip_id: str) -> Optional[dict]:
    """Remove a clip from history along with its rendered output and sidecars.

    Returns the removed entry, or None if no clip matched. The source video is
    never touched, only artifacts Clipperz rendered for this clip. The id is
    resolved inside the lock so a concurrent edit cannot target a stale list.
    """
    if not clip_id:
        return None

    def remove(entries: list[dict]) -> Optional[dict]:
        target = _find_in(entries, clip_id)
        if target is None:
            return None
        entries.remove(target)
        return target

    target = mutate_clips_history(remove)
    if target is None:
        return None
    full_id = str(target.get("id"))

    artifacts = list(_clip_sidecar_paths(full_id))
    output_path = target.get("output_path")
    if output_path:
        artifacts.append(output_path)
    for path in artifacts:
        try:
            if path and os.path.isfile(path):
                os.remove(path)
        except OSError:
            pass

    thumb_dir = os.path.join(paths["output"], "thumbnails", full_id)
    try:
        if os.path.isdir(thumb_dir):
            shutil.rmtree(thumb_dir)
    except OSError:
        pass
    return target


def update_clip(clip_id: str, **fields) -> Optional[dict]:
    """Update a clip in place, preserving all unknown keys. Returns the updated entry or None.

    Only keys with non-None values are applied, so callers can pass optional
    edits without overwriting existing data with None. The id is resolved
    inside the lock; a clip deleted meanwhile is not resurrected.
    """
    if not clip_id:
        return None

    def apply(entries: list[dict]) -> Optional[dict]:
        target = _find_in(entries, clip_id)
        if target is None:
            return None
        for key, value in fields.items():
            if value is not None:
                target[key] = value
        return target

    return mutate_clips_history(apply)
