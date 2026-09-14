# Slice 1B: reliable saved clip and internal handoff

Coordinating Project Lead refresh, 2026-09-12; spec lead-4. Authoritative Status
remains in spec.md. Isaac requested continuation with 1B; Worker relays remain
manual. No application implementation was performed during this refresh.

## Refreshed inputs and scope

Accepted predecessor: 1A, including both repairs and fresh independent reviews.
Base HEAD is 8cf6b82 plus the accepted repair-2 patch/manifest. Its implementation
hashes still match; only lead bookkeeping differs. The original 710b4d4 renderer,
server and UI behavior remains unchanged by 1A. `baseline-1b.json` records relevant
current hashes and the accepted predecessor. Existing uncommitted work must travel
with the checkout; HEAD alone does not contain accepted 1A fixes.

Selected references remain the generic media-application context; no additional
domain reference applies. Existing ignored snapshot/review evidence is used for
freshness. No actual Library, private runtime values, browser drafts or user media
were read. There is no new material product decision to ask Isaac.

Current code makes one full 1B assignment too broad:

- `backend/services/clip_generator.py:944-1034` sorts explicit kept segments,
  extends ends to sentence boundaries, can derive new filler/pause cuts and revert
  short selections. `preserve_timing` only disables transition autofix later.
  `out` at line 1364 has no effective-segment map; its duration is content duration.
- Word remapping at lines 1072-1098 handles multiple segments but single-segment
  words retain source offsets. A future revision needs one explicit time-domain
  contract, preserving source words separately from derived caption payloads.
- `backend/services/video_cut.py` already cuts and concatenates in supplied order;
  reuse it. `video_processor.concat_outro` can clamp crossfade length or fall back
  to hard cut. The requested fade is not evidence of actual output timing. Its
  video-crossfade/audio-concat fallback also needs scrutiny for exact-mode sync.
- `src/ui/web-server.ts` rerender persists reframe before success, omits kept
  segments on trim-only, and commits before any unified revision protocol. Logo
  and thumbnail routes mutate existing media; Python CLI deletion unlinks outputs.
- `ClipResult` currently contains paths/duration/size but no timed render receipt.
  `PythonExecutor.execute` accepts generic params, so an additive internal request
  can be exercised before exposing revisions through production UI/legacy routes.
- Cleanup still recursively protects history references and excludes exports.
  Exposing revision reclamation or migrated clips requires explicit integration,
  not simply adding new JSON sidecars and deferring safety until slice 5.

## Bounded sequence

### 1B.1 — exact render result (current Worker assignment)

Add and verify an opt-in exact-edit renderer mode through the internal Python
`create_clip` bridge. A supplied sequence must be the sequence rendered, with
truthful timing and transcript data in the result. Keep all existing callers on
their existing behavior. No history migration, revision pointer or UI change yet.
Detailed requirements and checks: `handoff-1b-1.md`.

This closes the timing prerequisite of WS-03/WS-06; it does not close the current
Library rerender defects or satisfy AC-2 by itself. Its completion is a real
disposable render whose cuts, words, keyframes, audio and bookends match the result.

### 1B.2 — transactional saved revisions (provisional)

Refresh after 1B.1 acceptance. Reuse 1A mutation locks, not a replacement locking
system. Publish a fully written immutable render receipt and artifacts before a
single history-pointer update guarded by expected versions. Persist drafts and
operation identity/result for retry, cancellation, conflicts and restart recovery.
Render outside the metadata lock. The committed file stays playable after failure.

Legacy adoption must preserve bytes and unknown fields, with capabilities based
on evidence rather than guessed timing. Recipes predating effective timing may
support playback but not a faithful new edit. Do not recover cut order from only
bounding times or use an unrelated episode transcript. No automatic retranscription.

Before migrated/versioned clips are writable, every current mutating route must
join the protocol or safely retain the clip on the unmigrated path. Keep existing
capabilities available: do not silently disable logo, thumbnail or CLI actions to
claim a completed migration. Cancel/invalidate jobs before deletion, preserve
source/shared artifacts, and prevent late publication from reviving a deleted clip.
Metadata-only edits must not conflict unnecessarily with unrelated render state.

Plan the active-reference contract with Cleanup before introducing collectible
artifacts: current/previous/active roots protected, retired outputs limited to a
server-owned revision namespace, explicit user selection, corrupt/unknown state
fail-safe, cross-process reference publication versus deletion exclusion. Original
exports never become candidates merely because a manifest references them. The
UI for reclaiming retired revisions may remain later scope, but safety cannot.

### 1B.3 — visible save and handoff (provisional)

Refresh after 1B.2 acceptance. Library Save draft persists choices; Save & open
Writing Studio commits pending media changes and opens the exact committed clip.
A minimal `/writing/clip/:id` saved preview with audio, thumbnail, download and
return-to-Library link proves internal transfer without upload. Unchanged saved
clips need no render. Draft and committed states are explicit; missing media has
a recoverable state and cannot be falsely marked render-ready.

Retain Content and existing Library panels until later replacements have feature
coverage. No navigation rename, writing document migration, AI package rewrite or
advanced timeline in this substep. Final 1B acceptance requires disposable browser
proof, same preview/download bytes, successful restart/retry and failed-render
preservation. A route or mock alone is insufficient.

## Common verification and ownership

Each substep is independently accepted, then the next detailed assignment is
refreshed against its actual result. Later boundaries may be resized based on
evidence; no automatic Worker loop or preapproval of stale dependent design.
Use existing configured runtime, synthetic media/disposable storage and meaningful
failure fixtures. Build is not media correctness proof. Before implementation,
Worker records planned checks against its assigned criteria; each handback needs
an actual receipt and reproducible patch/content-hash snapshot.

One fresh review-only assessment per substantial substep, without inherited
implementation/planning conversation. The lead owns disposition/Status/ledger.
Budget per issue: two unsuccessful review/repair rounds before reassessment and
three identical failed attempts before changing approach. No commit/push/release
or real-user-data migration is included in these manual assignments.
