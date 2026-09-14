"""Attribution (clip ↔ uploaded video) and metric sync.

Clipperz renders but never publishes, so performance is reconstructed after the
fact: match each rendered clip to its uploaded video, then pull metrics onto
the clip. Matching is proposed, never silent — a wrong link poisons the signal.

Network fetches happen against a read snapshot outside the history lock. The
results are then published through one locked read-modify-write cycle that
reconciles each fetched result against the current entry with an expected-state
rule: the clip must still exist, still carry the attribution the fetch was made
for, and its current ``metrics`` value must equal the value captured in the
snapshot. Any intervening change to ``metrics`` (a different value, a value
added, or a value cleared) is a conflict: the fetched result is skipped and the
current value is kept, whatever ``fetched_at`` either side carries. Timestamps
are optional on history records and are not used to rank results; an absent,
malformed, equal, earlier or later ``fetched_at`` never overrides the rule.
A clip deleted or re-linked in the meantime is skipped rather than resurrected
or overwritten, and fields other than ``metrics`` are never touched. An
unchanged record, legacy or not, refreshes normally; a skipped clip is picked
up by the next run.
"""
from __future__ import annotations

from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import Any, NamedTuple

import sys

from services.clips_history import load_clips_history, mutate_clips_history, update_clip
from . import client


def _ratio(a: str, b: str) -> float:
    return SequenceMatcher(None, (a or "").lower(), (b or "").lower()).ratio()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def propose_links(limit: int = 50) -> list[dict[str, Any]]:
    """Best upload match per unlinked clip: duration proximity + title + recency."""
    uploads = client.list_uploads(limit=limit)
    proposals = []
    for clip in load_clips_history():
        if clip.get("youtube_video_id"):
            continue
        best, best_score = None, 0.0
        for up in uploads:
            dur_gap = abs((up.get("duration") or 0) - (clip.get("duration") or 0))
            dur_score = max(0.0, 1.0 - dur_gap / 5.0)  # within ~5s
            score = 0.6 * _ratio(clip.get("title", ""), up["title"]) + 0.4 * dur_score
            if score > best_score:
                best, best_score = up, score
        if best and best_score >= 0.4:
            proposals.append({
                "clip_id": clip["id"], "clip_title": clip.get("title"),
                "video_id": best["video_id"], "video_title": best["title"],
                "score": round(best_score, 2),
            })
    return proposals


def set_link(clip_id: str, video_id: str) -> bool:
    return update_clip(clip_id, youtube_video_id=video_id) is not None


class FetchedMetrics(NamedTuple):
    """One fetched result plus the state it was fetched against."""

    field: str                 # attribution field checked under the lock
    expected: str | None       # attribution value the fetch was made for
    snapshot_metrics: Any      # entry["metrics"] at snapshot time (None if absent)
    metrics: dict              # the new metrics, including fetched_at


def _publish_metrics(fetched: dict[str, FetchedMetrics]) -> int:
    """Apply fetched metrics under the lock. A clip is updated only if it
    still exists, its attribution field still holds the value the fetch was
    made for, and its current ``metrics`` value equals the snapshot value the
    fetch was made against. A clip whose metrics changed meanwhile is a
    conflict: it is left as is and counted on stderr so a rerun picks it up.
    ``fetched_at`` is not consulted; see the module docstring."""

    def apply(entries: list[dict]) -> tuple[int, int]:
        applied = conflicts = 0
        for entry in entries:
            item = fetched.get(entry.get("id"))
            if item is None:
                continue
            if entry.get(item.field) != item.expected:
                continue
            if entry.get("metrics") != item.snapshot_metrics:
                conflicts += 1
                continue
            entry["metrics"] = item.metrics
            applied += 1
        return applied, conflicts

    applied, conflicts = mutate_clips_history(apply)
    if conflicts:
        print(
            f"  ! {conflicts} clip(s) skipped: metrics changed since this sync read them; "
            "the current value was kept, rerun to refresh",
            file=sys.stderr,
        )
    return applied


def sync_metrics() -> int:
    """Pull live metrics onto every linked clip. Returns the number updated.

    Fetches against a snapshot, then publishes once under the history lock so a
    concurrent writer cannot be clobbered: a clip whose metrics changed since
    the snapshot is skipped, not overwritten. A single clip's fetch failure is
    isolated so it can't abort the whole sync.
    """
    fetched: dict[str, FetchedMetrics] = {}
    failed = 0
    for clip in load_clips_history():
        vid = clip.get("youtube_video_id")
        if not vid:
            continue
        try:
            metrics = client.fetch_metrics(vid)
        except Exception as e:
            failed += 1
            print(f"  ! metrics fetch failed for {vid}: {e}", file=sys.stderr)
            continue
        metrics["fetched_at"] = _now()
        fetched[clip["id"]] = FetchedMetrics("youtube_video_id", vid, clip.get("metrics"), metrics)
    count = _publish_metrics(fetched) if fetched else 0
    if failed:
        print(f"  ! {failed} clip(s) skipped due to fetch errors", file=sys.stderr)
    _refresh_learnings()
    return count


def _refresh_learnings() -> None:
    """Regenerate the learnings digest; isolated so its failure can't discard saved metrics."""
    try:
        from . import learnings
        learnings.write_learnings()
    except Exception as e:
        print(f"  ! learnings refresh skipped: {e}", file=sys.stderr)


def sync_from_csv(path: str, threshold: float = 0.6) -> dict[str, Any]:
    """Match a YouTube Studio CSV to clips by title and write metrics. No auth."""
    rows = client.parse_analytics_csv(path)
    fetched: dict[str, FetchedMetrics] = {}
    links: list[dict[str, Any]] = []
    unmatched = []
    for clip in load_clips_history():
        best, best_score = None, 0.0
        for row in rows:
            r = _ratio(clip.get("title", ""), row["title"])
            if r > best_score:
                best, best_score = row, r
        if best and best_score >= threshold:
            metrics = {k: best[k] for k in ("views", "retention", "ctr", "impressions") if k in best}
            metrics["fetched_at"] = _now()
            # Attribution is by title, so the metrics are published only while
            # the clip still carries the title that was matched.
            fetched[clip["id"]] = FetchedMetrics("title", clip.get("title"), clip.get("metrics"), metrics)
            # Title-only attribution is fuzzy; surface every pairing + score so a
            # wrong match is visible rather than silently poisoning the signal.
            links.append({
                "clip_title": clip.get("title"), "row_title": best["title"],
                "score": round(best_score, 2),
            })
        else:
            unmatched.append(clip.get("title"))
    if fetched:
        _publish_metrics(fetched)
    _refresh_learnings()
    return {"matched": len(links), "links": links, "unmatched": unmatched, "rows": len(rows)}
