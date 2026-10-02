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
- Write fence (Writing Studio 1B.2b.3): an entry whose ``revisions`` value is
  present and not None is tracked. ``update_clip`` refuses any revision-owned
  field on it and ``delete_clip`` refuses to remove it, under the lock, writing
  nothing; no legacy writer adds ``revisions``, and no legacy removal or
  path-based command touches the revision export namespace or sidecar tree.
  Mirrors src/services/clip-write-fence.ts; a Node test proves the field sets
  agree. ``mutate_clips_history`` stays the unfenced protocol seam.
"""

import errno
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
    HISTORY_UNREADABLE, HISTORY_INVALID_ENCODING, HISTORY_INVALID_JSON,
    HISTORY_INVALID_SHAPE."""

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


# Fields a legacy writer may not change on a tracked clip: identity and
# provenance, and every field the revision commit projects.
REVISION_OWNED_FIELDS = (
    "revisions",
    "id",
    "created_at",
    "source_video",
    "logo_backup_path",
    "output_path",
    "duration",
    "file_size_mb",
    "start_second",
    "end_second",
    "caption_style",
    "crop_strategy",
    "format",
    "keep_segments",
    "logo_path",
    "intro_path",
    "outro_path",
    "logo_position",
    "transcript_slice",
    "thumbnail_config",
)
# The save service's directory names: <export root>/writing-studio/ and <history>/revisions/.
REVISION_NAMESPACE_DIR = "writing-studio"
REVISION_SIDECAR_DIR = "revisions"

CLIP_REVISION_TRACKED = "CLIP_REVISION_TRACKED"
REVISION_PATH_PROTECTED = "REVISION_PATH_PROTECTED"
# The same strings as FENCE_MESSAGES in src/services/clip-write-fence.ts (a Node
# test proves they agree); the web server recognises the unresolvable one in CLI output.
FENCE_MESSAGES = {
    "tracked": (
        "This clip is saved with Writing Studio revisions, so this legacy action cannot change it. "
        "Rerender, delete, thumbnail settings and command-line caption or thumbnail edits are not available "
        "for it; its title and other details can still be edited."
    ),
    "owned": (
        "This action would change a file in the Writing Studio revision folders, which legacy tools "
        "cannot modify. Use a clip file outside those folders."
    ),
    "unresolvable": (
        "Clipperz could not confirm that this file is outside the Writing Studio revision folders, so the "
        "action was stopped and nothing was changed. Check that the file, its drive and any link to it are "
        "available, then try again."
    ),
    "start": "Revision tracking can only be started by Writing Studio, not by a legacy edit.",
}


class ClipRevisionFenceError(ClipsHistoryError):
    """A refused legacy write. ``str()`` is ``"<code>: <message>"``, the stable
    form the CLI prints and the web server maps to HTTP 409. No path in it.
    For a path refusal, ``reason`` is ``owned`` or ``unresolvable`` and
    ``error_code`` names the failed lookup (path-free diagnostics)."""

    def __init__(self, code: str, message: Optional[str] = None, reason: Optional[str] = None,
                 error_code: Optional[str] = None):
        self.code = code
        self.reason = (reason or "owned") if code == REVISION_PATH_PROTECTED else None
        self.error_code = error_code
        if code == CLIP_REVISION_TRACKED:
            fallback = FENCE_MESSAGES["tracked"]
        else:
            fallback = FENCE_MESSAGES["unresolvable" if self.reason == "unresolvable" else "owned"]
        self.message = message or fallback
        super().__init__(f"{code}: {self.message}")


def is_revision_tracked(entry: dict) -> bool:
    """Present and not None. A malformed value counts as tracked (fail safe)."""
    return entry.get("revisions") is not None


def _assert_patch_allowed(entry: dict, keys: list[str]) -> None:
    if is_revision_tracked(entry):
        if any(key in REVISION_OWNED_FIELDS for key in keys):
            raise ClipRevisionFenceError(CLIP_REVISION_TRACKED)
    elif "revisions" in keys:
        raise ClipRevisionFenceError(CLIP_REVISION_TRACKED, FENCE_MESSAGES["start"])


class _Unresolvable(Exception):
    """A component exists but could not be resolved; ``error_code`` names the failure."""

    def __init__(self, cause: Optional[OSError] = None):
        super().__init__()
        number = getattr(cause, "errno", None)
        self.error_code = errno.errorcode.get(number) if number else None
        if not self.error_code:
            self.error_code = type(cause).__name__ if cause is not None else "UNKNOWN"


def _within(child: str, root: str) -> bool:
    child, root = os.path.normcase(child), os.path.normcase(root)
    return child == root or child.startswith(root.rstrip(os.sep) + os.sep)


def _resolve_through_links(target: str) -> str:
    """Resolve every link and junction along ``target``; a missing tail stays
    beneath its deepest existing ancestor. A component that exists but cannot
    be resolved (a dangling link, a denied lookup) raises, so callers fail closed."""
    current = os.path.abspath(target)
    tail: list[str] = []
    while True:
        try:
            real = os.path.realpath(current, strict=True)
            return os.path.join(real, *reversed(tail))
        except (FileNotFoundError, NotADirectoryError) as exc:
            missing = exc
        except OSError as exc:
            raise _Unresolvable(exc) from exc
        try:
            os.lstat(current)
        except (FileNotFoundError, NotADirectoryError):
            parent = os.path.dirname(current)
            if parent == current:
                return os.path.join(current, *reversed(tail))
            tail.append(os.path.basename(current))
            current = parent
            continue
        except OSError as exc:
            raise _Unresolvable(exc) from exc
        # It exists, yet resolving it failed as if missing: a dangling link.
        raise _Unresolvable(missing)


def _revision_roots() -> list[str]:
    lexical = [
        os.path.abspath(os.path.join(paths["output"], REVISION_NAMESPACE_DIR)),
        os.path.abspath(os.path.join(paths["history"], REVISION_SIDECAR_DIR)),
    ]
    roots = list(lexical)
    for root in lexical:
        try:
            roots.append(_resolve_through_links(root))
        except _Unresolvable:
            pass  # the lexical form still guards it
    return roots


def revision_path_verdict(target: str) -> Optional[tuple[str, Optional[str]]]:
    """Whether writing, replacing or deleting ``target`` touches a revision-owned
    tree, compared after resolving links and junctions, case-insensitively on
    Windows: ``("owned", None)`` when it resolves inside one, ``("unresolvable",
    <error code name>)`` when it exists but cannot be resolved (fail closed),
    None when it is outside both."""
    roots = _revision_roots()
    if any(_within(os.path.abspath(target), root) for root in roots):
        return ("owned", None)
    try:
        real = _resolve_through_links(target)
    except _Unresolvable as exc:
        return ("unresolvable", exc.error_code)
    return ("owned", None) if any(_within(real, root) for root in roots) else None


def is_revision_owned_path(target: str) -> bool:
    return revision_path_verdict(target) is not None


def assert_outside_revision_trees(targets: list) -> None:
    """Refuse, before any work, when a legacy operation would write inside either tree."""
    for target in targets:
        if not isinstance(target, str) or not target:
            continue
        verdict = revision_path_verdict(target)
        if verdict:
            raise ClipRevisionFenceError(REVISION_PATH_PROTECTED, reason=verdict[0], error_code=verdict[1])


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
        with open(path, "rb") as f:
            data_bytes = f.read()
    except FileNotFoundError:
        return [], None
    except OSError as exc:
        raise HistoryReadError(
            "HISTORY_UNREADABLE", f"History file {path} could not be read ({exc}). No changes were written.", path
        ) from exc
    # Strict decoding: bytes that are not valid UTF-8 mean a corrupt file, and
    # a mutation must not rewrite it. The error is typed like every other read
    # failure so callers and the CLI surface it the same way.
    try:
        raw = data_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HistoryReadError(
            "HISTORY_INVALID_ENCODING",
            f"History file {path} is not valid UTF-8 ({exc}). No changes were written. "
            "Restore it from a backup or repair the file, then retry.",
            path,
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


def _clip_artifact_paths(entry: dict) -> list[str]:
    """Every file ``delete_clip`` removes for a clip (sidecars, then the output)."""
    artifacts = list(_clip_sidecar_paths(str(entry.get("id"))))
    output_path = entry.get("output_path")
    if output_path:
        artifacts.append(output_path)
    return artifacts


def _thumbnail_dir(clip_id: str) -> str:
    return os.path.join(paths["output"], "thumbnails", clip_id)


def assert_legacy_removal_allowed(entry: dict) -> None:
    """A tracked clip, or one whose files lie in a revision-owned tree, is not removed."""
    if is_revision_tracked(entry):
        raise ClipRevisionFenceError(CLIP_REVISION_TRACKED)
    assert_outside_revision_trees(_clip_artifact_paths(entry) + [_thumbnail_dir(str(entry.get("id")))])


def delete_clip(clip_id: str) -> Optional[dict]:
    """Remove a clip from history along with its rendered output and sidecars.

    Returns the removed entry, or None if no clip matched. The source video is
    never touched, only artifacts Clipperz rendered for this clip. The id is
    resolved inside the lock so a concurrent edit cannot target a stale list.
    A tracked clip, or one whose files lie in a revision-owned tree, raises
    ClipRevisionFenceError under the lock with nothing removed.
    """
    if not clip_id:
        return None

    def remove(entries: list[dict]) -> Optional[dict]:
        target = _find_in(entries, clip_id)
        if target is None:
            return None
        assert_legacy_removal_allowed(target)
        entries.remove(target)
        return target

    target = mutate_clips_history(remove)
    if target is None:
        return None
    full_id = str(target.get("id"))

    for path in _clip_artifact_paths(target):
        try:
            if path and os.path.isfile(path):
                os.remove(path)
        except OSError:
            pass

    thumb_dir = _thumbnail_dir(full_id)
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
    inside the lock; a clip deleted meanwhile is not resurrected. On a tracked
    clip any non-None revision-owned field raises ClipRevisionFenceError and
    nothing is written; ``revisions`` is never applied by this writer.
    """
    if not clip_id:
        return None

    def apply(entries: list[dict]) -> Optional[dict]:
        target = _find_in(entries, clip_id)
        if target is None:
            return None
        _assert_patch_allowed(target, [key for key, value in fields.items() if value is not None])
        for key, value in fields.items():
            if value is not None:
                target[key] = value
        return target

    return mutate_clips_history(apply)
