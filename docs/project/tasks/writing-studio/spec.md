---
record: "spec"
task: "writing-studio"
spec_revision: "lead-12"
snapshot: "_local/project/evidence/writing-studio/1b-2a-repair-2/snapshot/manifest.json"
author: "coordinating-lead"
date: "2026-09-14"
state: "active"
summary: "Repair-2 closes WS-12; WS-16 survives two rounds. Lead-12 reassesses missing join provenance and authorizes a bounded contract correction by manual Worker relay."
read_when: "Implementing or reviewing the reassessed join-provenance correction, or checking retained closures."
---

# Implementation plan: Writing Studio and Library editing

This living head retains all current feature requirements and acceptance criteria.
Size exception: it exceeds 1,500 words to preserve the multi-slice data, media,
compatibility and safety contracts while the next bounded save slice is introduced. Historical
baselines, status and decision rationale moved losslessly to append-only spec-log.md;
later slices remain provisional. No criterion is removed to meet the soft cap.

## Status

- Objective: Writing Studio and Library editing with safe saved media and writing.
- Task: writing-studio; revision: lead-12 (2026-09-14, post-budget reassessment).
- Current snapshot: HEAD `8cf6b82039381e62b0f1dac1953c0c8c279e86f1` plus
  `_local/project/evidence/writing-studio/1b-2a-repair-2/snapshot/manifest.json`.
- Implementation: repair-2 implemented and handed back; broader task partial.
- Verification: fail for acceptance: independent 38/38 pass, but wrong-overlap
  reproduction commits. Historical Python evidence excludes the separate AI change.
- Review: R1/WS-12 closed; R2/R3/R4 retained. R5/WS-16 changes-requested.
- Integration/release: not authorized.
- Current slice: reassessed 1B.2a contract correction (repair-3), WS-16 / B2A-4/6.
- Coordinating lead: existing Writing Studio coordinating Codex session, resumed
  under explicitly reread 4.1.0 instructions; maintenance ownership was separate.
- Implementation owner: Worker on manual relay of lead-12; none active here.
- Completed: 1A/1B.1; 1B.2a WS-12/13/14/15 corrections, not full slice acceptance.
- Unresolved: WS-16; WS-03/04/05 and legacy WS-06/09 remain open.
- Last failed approach: overlap bounds cannot prove deterministic clamp; receipt
  drops raw join inputs and fake-only validation misses coherent wrong-overlap cases.
- Pending Isaac decision: none.
- Next action/owner: Worker implements bounded join-provenance direction below,
  returns repair-3 report; fresh independent review then lead disposition/reassessment.
- Resume comparison: 78 files, 46 local evidence, five contract and 16 workflow
  entries matched before bookkeeping; only excluded Worker report outside inventory.
- Open: this spec's 1B.2a section, requirements/map/baseline/exceptions;
  lead-12 direction below; `reports/1b-2a-repair-2-review.md` finding/reassessment
  and `reports/1b-2a-repair-2-worker.md` receipt/Handoff;
  accepted predecessor evidence remains applicable within its recorded limits.
- Evidence: new `_local/project/evidence/writing-studio/1b-2a/`; prior
  `_local/project/writing-studio/` remains in place. Installed inventory:
  `docs/workflow/inventories/4.1.0-local-1.md`.

## Current baseline and assumptions

Accepted repair-3 is the current application baseline: HEAD
`8cf6b82039381e62b0f1dac1953c0c8c279e86f1`, patch
`_local/project/writing-studio/1b-1-repair-3-snapshot/1b-1-repair-3-tracked.patch`
SHA-256 `e79ad677ca6012c09ffc24892a0b93f59e9bb676642fd7d7f33426b2ba5002e0`.
The accompanying manifest binds code, checks and relevant ignored inputs. All 87
entries matched at handback before lead bookkeeping. Only the renderer group-setup
helper and its tests changed from repair-2 application inputs. Prior baseline and
workflow reconciliation are preserved in spec-log.md and the identity mapping.
The refresh snapshot at `_local/generate-init-refresh/20260913/snapshot/manifest.json`
preserves base/patch/content for this maintenance result; it is not repair-3 evidence.

The latest repair-3 report Handoff returns implementation ownership; its fresh
review/disposition closes WS-11 and accepts 1B.1. `baseline-1b2.json` records the
refreshed planning inputs, including interfaces, accepted evidence and instructions.
It is a planning manifest, not an implementation verification receipt.
Reconcile any later report/evidence with the actual tree rather than relying on
metadata alone. Concurrent input changes require affected freshness/evidence,
not an automatic reset. The earlier no-repair-3 observations refer to refresh entry.

Accepted 1A evidence remains `reports/1a-repair-2-review.md` and its bound snapshot;
exact R1/R2 and R3a/R3b closures remain in `reports/1b-1-repair-2-review.md`.
Legacy parity/Node/build/type evidence may be reused only with unchanged covered
inputs and dependency justification. No historical execution claim is rebound to
4.1.0; six repair-2 workflow hashes match the preserved pre-refresh inventory subset.
Other historical provenance remains as recorded or unknown.

Read `CLAUDE.md` and `docs/local-setup.md` for the configured runtime, storage,
secret/media protections and actual commands; those files are unchanged. Generic
media-app references remain appropriate; PodStack stays explicit-task-only.

## Current exact publication and successor constraints

Current publication requirement: exact outputs use an exclusively owned new
directory per operation. Stage the entire requested artifact group on the output
volume, prepare/validate the receipt, and publish with one directory rename into
an absent operation-owned destination. Never move/replace previous successful
files or their sidecars; same-title operations across processes receive distinct
paths. This removes compensating rollback from failure preservation. Legacy
output naming/replacement stays unchanged. No revision metadata, journal or
migration is introduced here. 1B.2 must refresh against the accepted artifact
layout. Optional completion reporting and its diagnostics are best-effort after
publication; rendering errors remain visible. Interrupted staging may remain
unreferenced, but previous paths stay available and no partial group is published.
Evidence and rationale: reports/1b-1-repair-1-review.md; bounded implementation
and verification: handoff-1b-1-repair-2.md. No new product decision is required.

Accepted repair-3 requirement: retain the group publication design. Independent
evidence closes R3a/R3b, including persistent rename faults, failing reporting,
same-title processes and interruption. R4 occurs before the caller receives its
group: exclusive parent acquisition succeeds but staging creation fails outside
cleanup protection. Extend cleanup ownership from that first successful mkdir;
preserve the original setup error, delete only that owned parent or identify its
residual if cleanup is denied. No restoration/retry redesign, new protocol or
product choice is warranted. This condition is accepted through the repair-3
review/disposition; the original assignment and earlier review remain historical evidence.

1B.2 refresh inputs retained: returned files live under
<title>_short-<op_id>/final/; the group parent is inferred, not a result field.
Staging from process death is intentionally uncollected here; empty parents can
also be interrupted setup. Directory shape alone is not proof of an abandoned
operation: later recovery/Cleanup must account for active owners and references
before deletion. Full source transcript recovery input and the narrower exact
bookend consumer type remain required refresh topics. The bounded 1B.2a assignment
below consumes these constraints; it does not mark the full feature-map boxes complete.

R1 retains omitted/null versus explicitly empty transcript input through the bridge.
R2 rejects incompatible audio/video transition semantics even within codec tolerance.
R3 preservation covers the whole requested artifact group, including sidecars.
These remain B1-2/B1-3/B1-4 requirements; their history is in spec-log.md.

## 1B.1 current renderer requirements

The renderer contract below is carried forward verbatim from the original 1B.1
assignment. Current publication, transcript/transition clarifications and repair-3
requirements above also apply. Its single check map is in Acceptance criteria and
verification below; earlier handoffs are preserved history.

**B1-1 — explicit exact-edit mode.** Add an opt-in `timing_mode: "exact"` parameter
to the internal create_clip request and renderer. Absence retains legacy behavior;
do not repurpose `preserve_timing`. Exact mode takes a nonempty ordered
`keep_segments` list of source-absolute `{start,end}` intervals as authoritative.
Validate finite numeric values, positive durations and probed source bounds before
rendering; reject malformed/unsupported inputs clearly. Do not silently sort,
merge, widen, clamp or discard requests. Preserve supplied order, including when
source times run backward between intervals. Never mutate the caller's arrays.
Legacy bounding fields may remain compatibility summaries; they are not a way to
replace the ordered sequence. Document their exact-mode meaning without changing
default callers. All invalid requests must leave source/previous outputs untouched.

Exact mode disables all editorial heuristics: weak-opening trim, sentence-end
extension, automatic silence/filler interval construction, boundary reversion and
transition autofix that changes content. Caption-only filler cleaning may still
change displayed caption words when explicitly requested; it cannot cut speech.
No omitted interval returns merely because a later caller supplies wider bounds.

**B1-2 — explicit timing result.** Add optional `render_timeline` version 1 to the
result/types for exact mode. It must identify source-absolute intervals in output
order and their edited-content offsets, content duration, actual rendered-output
duration, content-to-output offset and bookend transition regions/actual overlap.
Keep existing top-level `duration` semantics compatible; future revision code uses
the explicit output duration. Return immutable-by-convention JSON data, no paths
chosen by clients and no success receipt for a failed/incomplete render.

Use one consistent mapping for single and multi-segment content. Preserve the
source timed-word input; derive ordered, boundary-clipped content-relative words
and full content text without excluded intervals. Keep editorial transcript words
distinct from caption-only cleaned words. Preserve word metadata such as speakers.
Clearly distinguish an explicitly supplied empty words array from unavailable
transcript input; do not silently claim a full transcript when none was supplied.
No fallback to current episode/cache belongs in this renderer contract. Reject an
exact request whose requested caption result cannot be produced from its inputs,
or explicitly represent the unavailable capability; never claim captions exist.

For exact mode, `crop_keyframes[].t` uses edited-content-relative seconds, matching
the already-cut video passed to the cropper. Validate its time/position domain and
report that convention. Preserve supplied keyframes/framing settings without
applying a source-bound subtraction a second time. Future Library draft conversion
from `tAbs` is 1B.2 scope, not permission to change today's editor payload now.

**B1-3 — actual composition and media proof.** Probe completed video/audio and
duration/size after all renderer-owned processing. Distinguish intended segment
boundaries from codec/frame quantization; choose and document a measured tolerance
based on the fixture's frame/sample timing. Do not claim sample-perfect cuts from
rounded duration metadata alone. Missing/unreadable/invalid output is a failure.

Preserve captions, logo, existing format/framing, intro/outro and requested bookend
fade. If a composition helper clamps a fade or falls back to hard cut, report the
actual branch/overlap, not the requested one. Do not report a valid exact result
when video/audio transitions disagree or media sync falls outside the justified
tolerance. Keep helper compatibility for legacy callers; additive result/telemetry
is preferable to changing their return type blindly. The Library's 1.5s thumbnail
card is applied later by the server: explicitly report that it is absent from this
renderer result, not an implicit offset or a second baked card. 1B.2 must compose
it once and probe again before committing.

The supported scope here is video sources (with or without an audio track). Keep
the existing audio-only/audiogram branch unchanged for legacy calls. If exact mode
cannot support that separate renderer faithfully, return an explicit unsupported
exact-mode error rather than falling through and claiming the requested segments
were honored. That does not remove its existing render/playback capability.

**B1-4 — safe integration and compatibility.** Carry exact-mode inputs and the
result through `backend/main.py` / PythonExecutor create_clip JSON without dropping
fields. It must be reachable through the internal bridge in the disposable check;
do not add a public endpoint or enable it in existing UI/CLI/batch paths yet.
Keep default New Episode, preview, batch and existing render behavior unchanged.
Failures clean only operation-owned temporary artifacts; no mutation of source,
history or a previously successful output. Rendering remains outside history locks.

## Product outcome and proposed defaults

Writing Studio is the publishing-preparation workspace for a saved clip or a
standalone transcript. Library is its video-editing workspace. Both refer to the
same clip ID and the same successfully saved render revision.

The following defaults make the plan concrete without adding another kickoff:

1. Move title editing, publishing copy, transcript display, caption style, and logo
   controls to Writing Studio. Keep trim, reframe, and all thumbnail editing in
   Library. Saving, downloading, deleting, and reopening in New Episode remain
   management actions, placed in the header/overflow rather than extra edit panels.
2. Writing Studio shows the real thumbnail and has an Edit thumbnail link back to
   Library. It does not duplicate thumbnail editing. Retain Content's title mockup
   as a clearly labeled optional text-layout preview for standalone writing.
3. Save draft persists choices. Save & open Writing Studio commits pending render
   changes and marks that successful version ready for writing. Merely downloading
   a file never changes readiness. Ready for writing does not mean published.
4. Existing saved clips are selectable immediately and need no upload or redundant
   render. Opening a saved clip for writing marks its current usable version ready
   only through the explicit open/handoff action. Show pending edits separately.
5. First release is a single-video timeline with trimming, waveform, thumbnails,
   scrubbing, exact times, and undo/redo, preserving existing crop keyframes and
   camera-cut navigation. Arbitrary multitrack editing and new split/reorder tools
   are outside this task. Existing edited segment order must still be preserved.
6. Caption/logo changes in Writing Studio require Apply & save video. Publishing
   text saves separately and never triggers a render. The video remains visible
   so the user can check these finishing changes.

The Project Lead may resolve equivalent technical choices within approved intent.
Return a material scope change (such as a multitrack editor or automatic social
publishing) to Isaac rather than silently expanding this task.

## Current implementation and implications

| Area | Observed behavior | Consequence for this task |
|---|---|---|
| `src/ui/client/ContentStudio.tsx` | Transcript-first generation, episode/Shorts modes, guided per-field regeneration, custom requests; `podcli.content-studio` stores title/mode/main result only | Preserve all writing actions and migrate recoverable browser data; do not claim old unsaved transcripts/custom answers can be recovered |
| `src/ui/client/ClipDetail.tsx` | Editing, thumbnail, logo, saved publishing metadata, transcript, and management actions share one page | Extract reusable sections and move them only when the replacement works; use `feature-map.md` to verify coverage |
| `src/ui/client/ReframeEditor.tsx` | Existing scrub/trim handles, +/- frame buttons using fixed 1/30 steps, crop keyframes and camera-cut markers; source-absolute timing | Extend it or its shared model; preserve keyframes/cut navigation and remove assumptions about fixed FPS and 9:16 geometry |
| `src/ui/web-server.ts` clip PATCH + `backend/cli.py` clips edit | Caption-style save currently updates metadata through the CLI; it does not render the new style | Writing Studio must visibly apply caption changes through a render, not repeat a metadata-only save |
| Same server, `/clips/:id/rerender` | Writes reframe state before render; trim-only path omits `keep_segments`; success updates some history fields | Draft state must not masquerade as committed state; maintain segment/word mapping and synchronize all committed metadata |
| Same server, thumbnail/logo routes | Thumbnail prepends a 1.5s card; logo uses a pre-logo backup and replaces the output | Work on staged render copies; replacing a logo/card must not restore outdated trims or accumulate layers |
| TS and Python clip-history services | Accepted 1A now shares strict mutation reads and cross-process lock; metrics publication checks expected state | Reuse this accepted protocol for revisions; do not reimplement the solved locking work |
| Word/recipe/reframe sidecars | Separate files support faithful re-rendering | Version the recipe and timed transcript together with the rendered artifact; retain legacy readers/migration |
| `src/services/storage-cleanup.ts` | Discovers references under history/assets/reels and rechecks before deletion | New revision/writing references must participate; historical references cannot pin unlimited retired media |

## Scope and preservation

Expected areas: client routing/navigation, ClipDetail, ContentStudio replacement,
ReframeEditor/player/shared sections; server clip/content routes and job status;
models and TS/Python history writers; render recipe/timing helpers; cleanup; targeted
tests, disposable integration scripts, and user documentation.

Keep New Episode, Highlights, transcription, presets, exports, and existing Library
listing behavior intact. Relevant shared paths may change to support the new save
contract, but do not redesign these other tabs. Preserve Clipperz branding, legacy
settings/storage keys, pinned executables, local-only restrictions and strict AI
routing. Do not activate blocked integrations or add automatic publishing, accounts,
schedulers, a new editor framework, database, or cloud service without justification
and any required scope decision. Source media is never modified.

## Proposed state and persistence design

Reuse stable clip IDs and the existing JSON/sidecar architecture. Avoid a second
copy of the clip collection. Extract focused services from the large web server
where they make revision commits and writing persistence testable.

### Clip drafts and saved render revisions

- Extend the clip record with an optional revision ID/version and ready-revision
  marker. Older records remain valid. Separate draft edit state from the committed
  recipe; provide a monotonically increasing draft version for stale-edit checks.
- A render revision references its actual video, thumbnail/card settings, complete
  recipe, source segments in output order, reframe keyframes, and timed transcript.
  Store immutable revision sidecars beneath history and generated artifacts beneath
  the configured output root, with server-generated identifiers/paths.
- Keep the current revision pointer and legacy summary fields (`output_path`,
  `caption_style`, bounds, duration, thumbnail config, transcript slice, etc.) in
  the same atomic history commit. Readers use the pointed revision's recipe/words;
  legacy sidecars are fallback inputs for unversioned clips, not competing owners.
- Use a shared cross-process history mutation lock/protocol for all TS and Python
  read-modify-write paths, not just the new endpoint. Hold it only for metadata
  mutation; never for FFmpeg/AI work. Specify bounded acquisition, stale-owner
  recovery, and conflict/error responses; exercise two real processes in tests.
- Saving a draft must not change the file served by download/preview. Every commit
  uses expected versions and an operation ID. Duplicate retries return the same
  operation; a stale draft returns a conflict with reload/reconcile options.
- Snapshot render inputs, render to a new operation-owned staging directory, apply
  logo and one thumbnail card, probe video/audio/duration, then commit the pointer
  only if the clip still exists and expected versions still match. Failed, cancelled,
  superseded, or interrupted work never replaces the last successful output.
- Persist enough operation status to recover after restart. Cancellation must stop
  or invalidate work, not merely hide a spinner. A late process exit cannot revive
  a deleted clip or overwrite a later save. Windows file-in-use errors must leave
  the old revision playable and yield a useful retry state.
- A normalized render-input signature prevents unnecessary rendering. Thumbnail,
  caption, and logo actions must use this same path, even if their legacy endpoint
  adapters retain the current response format for existing callers.

### Writing documents

- Store one durable current writing document per selected clip, plus independent
  standalone documents, under the existing home/history tree so cleanup can find
  their references. Exact filenames/types are delegated after lead review.
- Fields cover title/selected title, mode, source transcript snapshot, all main
  generated fields, top pick/engine when supplied, user edits, regeneration guidance,
  and custom request/result entries. Associate clip documents with clip ID, source
  revision, content fingerprint, document version, and generation operation ID.
- Main generated fields are projected to the existing clip metadata for compatible
  Library/CLI readers. Write through one coordinated service; do not maintain two
  independently editable copies. Clip title updates do not rename/re-render media.
- Distinguish transcript/editorial changes from purely visual revisions. A new trim
  or transcript marks affected writing as based on older content; a logo change
  updates the preview without declaring the writing invalid. Never auto-regenerate
  or discard the user's chosen copy.
- Associate every AI request, partial SSE event, final result, and save with its
  document ID, request ID, and expected document/content version. Switching clips,
  concurrent browser tabs, or late responses cannot replace another document or
  newer user edits. Failed regeneration leaves the prior saved copy available.
- Retain the existing long-form versus Shorts prompts and transcript sampling
  behavior. Make full-transcript preview distinct from sampled AI input. Missing
  clip text must not fall back silently to an unrelated New Episode transcript.
- Generated titles/description/tags/hashtags should be editable and copyable; saving
  manual edits, custom results, and regeneration guidance must survive navigation
  and server restart. The standalone editor still accepts pasted text without video.

### Migration, missing assets, retention and deletion

- Lazy/import-on-open migration reads existing clip metadata, recipes/words/reframe
  files and chosen thumbnail without rendering or changing media bytes. Preserve
  unknown fields. Version zero references the existing output until a new render.
- Import `podcli.content-studio` into a standalone document once per payload/browser
  with an idempotent import token; retain the old key until the server acknowledges
  the save. Validate shape and keep the original on failure. Never attach it to an
  arbitrary clip. Fields never persisted by the old UI are unavailable, not blank
  replacements for better stored data. Duplicate tabs must not create duplicate imports.
- Missing original source: keep the last rendered preview/download and writing
  usable; offer source relinking or a clear unavailable-edit state. Do not pretend
  baked-in captions can be cleanly changed from the finished MP4. Missing output:
  retain writing, show media unavailable, and re-render only from sufficient inputs.
- Proposed retention: retain the current and one previous successful render,
  active staged work, and all actual source dependencies. Older app-created
  revisions become reviewable Cleanup candidates; never automatically delete user
  source files or force a full video copy for a writing-only save. Use cached,
  bounded thumbnail/waveform data rather than full decoded-media copies.
- Store old writing's text/transcript fingerprint without permanently pinning each
  old video. Cleanup should protect current/previous/active references and fail safe
  on unreadable state; it should not treat retired manifest paths as active forever.
- Preserve writing by detaching it into a standalone document when deleting a clip;
  explain this in the deletion dialog. Remove clip-owned media only after active
  operations are cancelled/invalidated and all references are checked. Offer separate
  explicit writing deletion. Apply the same semantics through UI/CLI/MCP deletion paths.
- Back up migrated metadata, not original video libraries. Interrupted migrations
  are resumable and idempotent. A rollback must not silently discard post-migration
  documents; the lead should settle its compatibility boundaries before slice 1.

## Screen behavior and interface contracts

Proposed routes: `/writing` for selection/standalone drafts and `/writing/clip/:id`
for a saved clip. Keep `/clip/:id` for Library editing; redirect old `/content` links
without losing the browser import opportunity. Unknown/deleted IDs show a recoverable
empty state rather than selecting a different clip. Navigation and search labels agree.

Writing Studio has a source selector, finished-video preview with audio/scrubbing,
full transcript, main publishing package, guided per-field regeneration, custom
writing, and a collapsed video-finishing section for caption style/logo. Show
saved/unsaved/rendering/failed states and stale-content notices in plain language.
Autosaving text may be debounced; flush or warn on navigation. A render is explicit.
Clear the distinction between Save writing, Apply & save video, and Download.

Library contains its player/timeline, Reframe, Thumbnail, Save draft and the handoff
button. Selecting an existing saved clip in Writing Studio reads its saved revision;
if a Library draft exists, show that it has not been applied. Thumbnail generation
can prepare a draft image, with the opening card committed via Save; label pending
state rather than claiming the finished file already changed.

Suggested new service operations (exact route spellings are delegated):

| Operation | Contract |
|---|---|
| Read editor/draft | Clip ID → committed revision, draft version, edit capability, media/timing metadata |
| Save draft | Clip ID + expected draft/base versions + validated edit decisions → persisted draft/version |
| Commit/handoff | Clip ID + expected versions + operation ID → existing or queued render job; ready marker only on success |
| Read operation/cancel | Operation ID scoped to its clip → progress/result/recoverable error; safe retry/cancel |
| Read/write writing | Clip/document ID + expected version → persistent document; reject conflicting updates |
| Generate all/section/custom | Bound document and content version + mode/instruction → correlated stream and saved result |
| Timeline assets | Clip/revision ID → bounded sprite/waveform/source timing data, cached and locally generated |

Validate IDs, finite timestamps, ordered ranges, media duration, segments, keyframes,
formats, caption styles, logo positions, text sizes, and expected versions on the
server. Resolve media/assets from authorized stored records and real paths; never
accept arbitrary output paths from clients. Preserve existing host/origin/local
policy checks; new routes must not become a bypass to blocked services. AI remains
text-only through the configured provider chain; no provider calls on page load.

## Timeline and render correctness

- Reuse the current controls but present a readable, expandable timeline with
  thumbnail strip, waveform, keyboard/pointer scrub, separate trim handles, exact
  in/out entry, zoom-to-selection, and draft undo/redo. Preserve cut markers, next/
  previous cut, crop-keyframe add/delete/selection, and current audio playback.
- Use probed timing instead of `1/30` for all videos. Define the honest stepping
  behavior for variable-frame-rate media; exact frame stepping must use actual
  timestamps or be labeled as approximate rather than advertised as exact.
- Distinguish source-absolute, edited-content-relative, and rendered-output time.
  Represent content as ordered kept segments; map trim/seek/words/keyframes through
  that list. Trimming a multi-moment clip must not reintroduce previously excluded
  gaps. Show existing internal cuts without silently flattening their semantics.
- The 1.5s thumbnail card and any intro/outro are separately identified regions.
  A content trim does not accidentally trim or duplicate the card. Preserve intro/
  outro settings, clipped words, and output offsets in the final manifest. For
  legacy recipes without enough timing information, report the capability limit
  and recovery path rather than invent a mapping.
- Live trim/static-framing previews respond without rendering per drag event.
  Debounce/cancel stale seeks and waveform requests; avoid decoding an entire long
  source into browser memory. Initial asset generation has progress/failure states
  and cannot block basic playback. No-audio clips have an explicit waveform state.
- Match portrait/horizontal/square and existing foreground-framing settings. Do
  not force all clips through the current hardcoded portrait crop box. Preserve
  existing face tracking/manual keyframes and recipe options across trim-only saves.
- Final saved preview and download use the identical committed file. Caption
  typography, tracking, and other effects needing rendering are verified in that
  preview. Live preview limitations should be visible and specific.

## Behavioral slices

These are implementation boundaries, not permission for automatic worker dispatch.
The coordinating lead refreshes later slices after accepted predecessor results.

**Slice 1A — safe shared history mutation** is accepted predecessor work.
Its completed contract and checks remain in `handoff-1a.md`. It closes concurrent
lost updates and mutation after unreadable history across current TS/Python writers.
It introduces no revision schema, migration, new UI, rendering, or deletion policy.
This is a prerequisite to the original slice 1, now **1B**, below. Acceptance of
1A does not authorize 1B automatically.

1. **1B: Reliable saved clip and handoff.** Current sequence replaces the provisional
   partition in preserved `plan-1b.md`: **1B.1 exact render result** (accepted),
   **1B.2a revision commit core** (bounded below), then **1B.2b production adapters,
   composition and migration** and **1B.3 visible save and handoff** (both provisional).
   Reuse accepted 1A locking. Refresh and resize each successor
   from accepted predecessor evidence. Final 1B proves a disposable clip saves,
   reopens without upload and survives failure; 1B.1 alone does not claim that UI
   outcome. Keep Content and Library capabilities during the transition.
2. **Connected writing workspace.** Add clip/standalone document persistence,
   legacy metadata/browser migration, all main generation/copy/manual-edit actions,
   guided section regeneration, custom writing and explicit source modes. Wire
   saved-revision previews and stale-content handling. Switch navigation with old
   route compatibility once feature coverage is demonstrated.
3. **Finishing controls and thumbnail integration.** Move caption/logo controls
   into Writing Studio with actual revision renders; adapt all Library thumbnail
   actions to draft/commit semantics; preserve chosen cards through later saves.
   Verify logo removal/replacement cannot restore an old clip. Retire duplicated
   Library writing/transcript panels only once their replacements work.
4. **Complete Library timeline.** Build the waveform/thumbnail timeline and reuse
   crop-keyframe/cut controls on the revision model. Add exact trim input and undo/
   redo. Prove correct noncontiguous timing, asset offsets, aspect ratios, captions,
   and audio sync using known-content fixtures. Preserve New Episode reopen.
5. **Lifecycle and acceptance.** Complete deletion/detachment, bounded retention,
   Cleanup reference handling, interrupted-job/migration recovery, compatibility,
   keyboard/responsive UI and docs. These safeguards must be integrated as their
   storage paths appear; slice 5 is end-to-end closure, not permission to defer data
   safety until after use. Independently review the complete migrated workflow.

## 1B.2a bounded assignment: revision commit core

Implement an internal TypeScript save service and prove a disposable clip can save
a draft, commit a real exact render, and reopen the same immutable saved files after
restart. This is an AC-3/9/11 foundation, not AC-2 browser handoff or full migration.
No production route, CLI, MCP or UI opts into revision-backed writes in this slice.
Existing production callers and data remain unversioned. Tests and the disposable
check invoke the service explicitly with isolated history/output roots. No automatic
startup migration or new public endpoint. This boundary prevents the current
rerender, thumbnail, logo and deletion routes from bypassing the new protocol.

**Transaction and persistence.** Reuse the accepted strict history read, shared
TS/Python mutation lock and atomic replacement. Extend the history service with a
focused transaction interface as needed; do not add a parallel history collection,
lock protocol or unlocked whole-list writer. Render, probe and stage substantial
dependencies outside that lock. Immutable draft/revision sidecars live beneath
history; authoritative draft/current/previous and operation state live on the clip
entry and change through the same atomic `clips.json` commit. Preserve unknown
fields and concurrent unrelated metadata changes.

Use a record incarnation, monotonic draft/revision versions, and stable operation
IDs bound to the captured recipe and expected versions. All service mutations
require expected state. One active save per clip is sufficient; another operation
returns a surfaced conflict/busy result. Replaying an operation with the same
request returns its durable state/result without another render; reusing its ID
for different input conflicts. A draft save leaves committed paths and summaries
unchanged. A render may commit only if the same clip incarnation, draft, current
revision and active operation still match. Missing/deleted/recreated clips, changed
drafts, cancellation and superseded work cannot publish a late pointer.

Publish complete immutable dependencies first, then atomically update current and
previous revision pointers, legacy summary fields and the operation's success
receipt together. Failure before that history replacement leaves the last save
unchanged; loss of acknowledgement after it is resolved by reading the operation
receipt. Cancellation/recovery explicitly invalidates the operation under the lock
before any replacement work. After restart a pending operation remains pending
until it completes or is explicitly invalidated; do not guess death from elapsed
time or directory shape, automatically resume it, or start a second renderer for
the same ID. Invalidating a live operation is safe because its eventual commit
must fail the same expected-state check. Surface actionable states/errors.

**Media and transcript.** Use the accepted `create_clip` exact bridge. Place each
operation beneath a dedicated app-owned namespace under the configured export
root, containing the renderer's exclusively created group and returned `final/`
files. Do not rename, overwrite or delete previous flat/grouped outputs. Validate
identifiers, recipe shape, source/assets and returned file containment; client-like
IDs or returned paths cannot escape configured roots or cross clip ownership.
Consume only an exact v1 receipt with supported branches and existing complete
artifacts; probe/validate final media outside the history lock before commit.
Narrow the exact bookend consumer type to exclude the refused branch.

Retain the full caller-supplied source-absolute words separately from the receipt's
content-relative words, including null/unavailable versus supplied-empty. Retain
ordered segments and content-domain keyframes without inventing source timing from
legacy bounds or caches. The isolated initial fixture may reference an existing
legacy output as version zero, labelled without exact provenance, then explicitly
supply trustworthy render inputs. This is not a general legacy importer.

This first service supports exact renderer composition only: opening Library
thumbnail cards are unsupported and must be rejected when requested, never silently
dropped or reported as applied. Persist the truthful card-absent receipt. Existing
caption/logo/bookend parameters used by a supported request must be retained; no
new compositor or restoration from legacy logo backups. Full card composition,
general unchanged-input render avoidance, legacy recovery/import and all mutator
adapters remain successor work before production exposure. Durable retry behavior
and draft-only saves are required now.

**Retention and write area.** Record current/previous/active roots for future
reference traversal. Introduce no new Cleanup eligibility or automatic orphan
collection; keep the new export namespace protected by current Cleanup behavior.
Prove that protection with the real scanner against disposable roots. Failed or
interrupted media may remain unreferenced; report residuals truthfully and never
infer permission to delete from shape alone. No changes to user media or writing.

Expected edits: focused revision service/types, the minimum history integration,
meaningful tests/fixtures and a disposable verification script. Internal filenames,
typed errors, serialization details and test seams are delegated within these
contracts. No renderer algorithm/publication redesign, lock redesign, production
adapters, UI/navigation, writing generation, timeline, general migration, Cleanup
collector, cloud/provider calls, dependency changes or incidental legacy fixes.
Report a demonstrated prerequisite conflict to the lead without expanding scope.
Worker writes its own `reports/1b-2a-worker.md` and new evidence under
`_local/project/evidence/writing-studio/1b-2a/`; lead-owned records stay untouched.
No agent dispatch. Stop implementation writes after bound verification/handback;
fresh independent review and lead disposition precede acceptance or the next slice.

## 1B.2a repair-1 contracts retained (lead-10; partial closure below)

The initial independent review `reports/1b-2a-review.md` confirmed R1..R5 on the
submitted 1B.2a snapshot. All five blocked that snapshot; current partial closure
and the next assignment are in the repair-2 section below. The service remains internal and no
production integration is authorized. Repair the existing service/types and its
tests/fixtures/check within the original write area. This direction clarifies
existing B2A contracts, not new product scope. Baseline is the submitted snapshot
above plus lead-only coordination records; retain original lead-9 evidence.

- R1 / WS-12: establish physical containment of owned history/export roots and
  descendants, rejecting linked ownership ancestors before writes. Cover draft
  sidecars, revision documents, namespace creation and returned artifacts, not just
  regular leaf files. Test real Windows junctions at the root and intermediate
  directories; refusal must write nothing through them. Do not claim protection
  against every adversarial concurrent filesystem replacement from static checks.
- R2 / WS-13: bind every operation mutation to its captured incarnation and operation
  request identity before changing even failure, cancellation, supersession or
  residual fields. Extend the internal invalidation request with expected ownership.
  An old failed or successful completion or stale cancellation must not touch a new
  incarnation's same-ID operation. Preserve legitimate cancellation and late-residual
  reporting for the operation actually owned; no new lock/recovery protocol.
- R3 / WS-14: detach the complete request synchronously before the first asynchronous
  boundary. Validate, hash, render and persist that captured value consistently,
  including nested source words, ordered segments, framing and expected state.
  Apply this to draft saves and invalidation inputs as applicable. Caller mutation
  during any await must not change the captured request or its result.
- R4 / WS-15: remove silent operation expiry. For this bounded repair, retain
  operation identity, request hash and complete terminal result for the record
  incarnation's lifetime; do not add pruning or a new archival subsystem. The small
  operation metadata cost is preferable to another retention protocol here. Replay
  precedes source/asset existence checks needed only for new rendering and returns
  the original complete result, including revisions older than current/previous.
  A missing source never triggers another render or destroys a saved retry result.
  An ID with a different captured request still conflicts. This retention does not
  authorize deleting media or permanently pin every old video's path for future
  Cleanup; successor reference traversal must distinguish receipts from live roots.
- R5 / WS-16: explicitly validate the required exact-v1 receipt shape, enums, finite
  numeric fields and relationships before arithmetic or persistence. Check ordered
  source/content placement, durations/offsets, composition, word availability and
  artifact requirements against the captured request and accepted renderer contract.
  Missing values and NaN must refuse rather than pass comparisons. Keep the accepted
  renderer tolerance and unavailable/supplied-empty semantics; reject malformed
  receipts without moving committed pointers.

Use the review's preserved `review/repro.mjs` and `repro-result.json` as the before
evidence. Run the unchanged reproduction before edits when feasible; after repair,
obsolete defect assertions may fail and are not the corrected success criterion.
Preserve that result and add a separate demonstration/regressions for all five
required outcomes, including older failed-ID replay, source removal, both late
completion paths, stale cancellation and nested mutation during awaits. Replace
the incompatible test asserting a 32-record cap with durable-replay coverage.

The acceptance table remains the single map: R1 maps B2A-5, R2/R4 B2A-2,
R3 B2A-1/2/4, R5 B2A-4, and fresh evidence/review B2A-6. Record exact commands and
expected results before edits. Rerun focused revision/process suites, full Node,
build, client types and `node scripts/verification/check-saved-revision.mjs` on the
repaired snapshot. Retained Python evidence still requires unchanged covered-input
hashes and dependency justification; refresh affected checks if inputs change.

Worker report: `reports/1b-2a-repair-1-worker.md`. New evidence/snapshot:
`_local/project/evidence/writing-studio/1b-2a-repair-1/`. Preserve all earlier records
and evidence. Do not edit lead-owned records, instructions/inventories, Python,
production adapters or incidental caption/deletion issues. No agent dispatch,
commit, push, release or 1B.2b. Hand back after verification with implementation
writes stopped. Fresh independent follow-up is required before disposition; this
is repair round one, with reassessment after two unsuccessful rounds on an issue.

## 1B.2a repair-2 direction (lead-11)

Repair-1 independent follow-up closes R2/R3/R4 (WS-13/14/15) on its bound snapshot.
R1/R5 remain open under `reports/1b-2a-repair-1-review.md`; repair only these gaps
and necessary affected tests/fixtures/checks. Baseline is that repair-1 manifest,
tracked patch and seven-file slice patch plus lead bookkeeping. Do not revisit
correct operation ownership, detached capture or durable replay without a demonstrated
dependency. Preserve their regressions and all accepted predecessor behavior.

**R1 / WS-12.** Configured history/export roots are included in ownership validation.
The Worker exemption for linked configured roots is not approved. Check the root
itself before recursive creation or writing through it, along with owned descendants
and applicable ownership ancestry. A pre-existing root junction must be refused;
no automatic realpath substitution that silently changes the owned root. Verify
root and intermediate junction refusal for draft/revision creation and artifact
paths, with outside target bytes unchanged. Preserve ordinary real-directory and
missing-directory behavior. This remains a static ownership check; no new adversarial
filesystem-swap or power-loss guarantee is introduced.

**R5 / WS-16.** Validate semantic relationships as well as scalar shape. Use the
accepted Python receipt construction in clip_generator.py and exact_render.py's
`words_in_intervals`, `map_words_to_content`, `content_text`, `content_intervals`
and `bookend_region` as contract evidence, without editing Python. Required domain
keys/values must match actual exact-v1 domains, not a fake fixture's invented map.
Compare source words to the captured input's retained interval subset and content
words/text to its ordered, boundary-clipped, content-relative projection. Preserve
metadata, repeated/reversed intervals, renderer rounding and unavailable versus
supplied-empty. Validate caption settings against the supported request/bridge
defaults, keeping cleaned caption words distinct from editorial words. Do not
implement a new caption cleaner or silently require those two lists to be identical.

For intro and outro, validate the relationship among asset duration, region endpoints,
applied overlap, requested fade, actual branch and transition endpoints according
to the accepted renderer. An enumerated branch alone is not proof of a valid join.
Hard cuts must not claim video overlap or unrelated transition regions. Keep valid
crossfade/fallback receipts and their documented tolerance; do not widen tolerance
or weaken the schema to accommodate a fake receipt. Update fake fixtures where they
misrepresent the accepted renderer. Invalid provenance must leave current/previous
pointers and prior files unchanged.

Use the preserved repair-1 review `review/repro.mjs` and `repro-result.json` for the
before case. Preserve reviewer artifacts byte-for-byte. Run before edits when feasible;
after edits, record the unchanged script's obsolete-assertion/refusal outcome and
use a separate corrected demonstration. Test the four independent counterexamples
(configured roots, invented words/caption style, impossible composition, empty
domains), plus valid near-boundary/rounding receipts and retained R2/R3/R4 schedules.
The existing single acceptance map applies: R1 B2A-5; R5 B2A-4; B2A-6 requires fresh
focused service/process and full Node suites, build, client types, and the real
`check-saved-revision.mjs`. Retain Python only with unchanged covered-input hashes
and dependency justification. Name exact invocations/expectations before edits.

Scope remains the existing TS revision service/types and necessary tests/fake renderer/
fixtures/check. No production opt-in, Python/renderer/lock redesign, dependency change,
UI, Cleanup eligibility, migration, caption-forwarding fix or instruction edits.
Worker report: `reports/1b-2a-repair-2-worker.md`; evidence/snapshot root:
`_local/project/evidence/writing-studio/1b-2a-repair-2/`. No lead-owned record or older
report edits, agent dispatch, commit, push, release or 1B.2b. Stop writes at handback
for fresh independent follow-up. This is repair round two for WS-12/16; if either
remains unresolved afterward, the lead must reassess before any further repair relay.

## Reassessment and bounded join-provenance correction (lead-12)

WS-16 remains after two unsuccessful repair rounds. The lead has completed the
required reassessment against the repair-2 independent report, concat_outro's
actual clamp/eligibility code, and receipt construction. Do not repeat lead-11's
TS-only repair with another upper-bound check. A valid range is not the actual
overlap selected by the renderer. Further, the receipt drops one of each join's
raw input durations; rounded content video-end timing cannot reconstruct both
probed media durations near thresholds. This is a producer/consumer contract gap.

Technical decision: preserve the two already-recorded join inputs as additive
exact-v1 bookend provenance. Each non-null bookend gains
`join_inputs: { main_duration: number, appended_duration: number }`, copied from
the existing concat report at original numeric precision, not rounded from regions
or inferred from requested content duration. These are the actual values used by
concat_outro, not a new measurement guarantee. Do not change concat's rendering,
clamp, fallback order or file publication. Validate required source fields before
claiming this provenance; never fabricate missing durations as zero or a guessed
content length. The existing producer already records both fields on every branch.

The revision consumer requires this provenance for each bookend in a new save.
For the currently supported numeric fade request/default, reproduce concat_outro's
calculation from the captured fade and raw inputs: begin with fade (zero for a
nonpositive request); clamp to `max(0.05, main_duration - 0.05)` and, when appended
duration is positive, to `max(0.05, appended_duration - 0.05)`. A crossfade additionally
requires `max(0, main_duration - clamped_fade) >= 0.05` and `clamped_fade >= 0.05`.
Its overlap must equal the computed clamp within existing three-decimal receipt
rounding allowance. Keep supported hardcut fallback with zero overlap even when a
crossfade was eligible but failed. Check new fields' finite values and consistency
with their corresponding rounded asset/region provenance. Do not substitute
composition/A/V slack for the clamp or introduce another tolerance.

Compatibility: this is additive to the internal exact-v1 result, not a version bump
or a legacy renderer result change. Type the added fields to represent older v1
records honestly. Existing saved documents remain readable without rewriting or
upgrading their provenance. A newly submitted bookend receipt lacking join_inputs
is refused with an actionable typed receipt error; no guessed values or weaker
validation fallback. Bookend-free exact saves remain supported. No production
migration, new renderer mode or automatic rerender of old records.

Prevention changes with the reassessment: add a producer-derived contract matrix,
not only another fake scalar test. Exercise actual Python concat_outro report
generation with controlled probe/FFmpeg outcomes, preserving its real clamp and
branch code, and serialize through the real bookend receipt helper. Drive consumer
cases from those outputs. Cover fade-limited, main-limited and appended-limited
joins, intro/outro (including intro already in the outro's main input), no fade,
short-input eligibility, rounding edges and supported fallback. Pair valid cases
with wrong-overlap mutations whose dependent regions/output/probe are changed
coherently; rejection must follow the request/clamp relationship. Keep the existing
real bridge check as actual media coverage, distinguishing synthetic branch tests
from this installation's hardcut execution. Internal fixture layout is delegated.

Expected write area now explicitly includes backend/services/exact_render.py's
receipt serialization, minimum producer plumbing if demonstrated necessary,
src/models/index.ts and revision types/consumer, affected exact Python and Node
tests, test-only producer fixtures and disposable checks. This narrow Python/type
scope expansion supersedes the previous no-Python limit only for this correction.
Do not change rendering algorithms, accepted locks/publication, strict_ai.py,
production routes/UI, dependencies, Cleanup eligibility, migration or instructions.
Preserve the other accepted fixes and existing uncommitted work.

Verification map remains B2A-4/6 and affected B1-2/3 compatibility. Record exact
matrix/reproduction commands and expected outcomes before edits. Preserve the
repair-2 review reproduction, run it before edits when feasible, and separately
demonstrate correction. Required fresh: focused revision/process suites, full Node,
build/client types, focused exact Python, full Python, changed Python syntax,
`check-exact-render.mjs`, and `check-saved-revision.mjs`. The Python change now
invalidates affected retained renderer evidence. Preserve and disclose separate
strict_ai.py work; a failure there is investigated/routed without unauthorized repair
or being relabelled pass. Passing fresh checks is not acceptance without review.

Use cycle name `1b-2a-repair-3` to preserve chronology, not reset the recurrence
count. Report `reports/1b-2a-repair-3-worker.md`; new evidence/snapshot under
`_local/project/evidence/writing-studio/1b-2a-repair-3/`. Budget after reassessment:
one bounded contract implementation and fresh independent follow-up, then explicit
disposition/reassessment if unresolved; no automatic follow-on repair. No agents,
commit, push, release, 1B.2b or lead-record edits. Worker receives this direction
only through Isaac's manual relay and stops implementation writes at handback.

## Acceptance criteria and verification

| ID | Observable acceptance criterion | Evidence required |
|---|---|---|
| AC-1 | Every enabled Library/Content function has a working destination; blocked integrations remain blocked | Completed `feature-map.md`, old/new route checks, browser walkthrough |
| AC-2 | Save/handoff opens the exact saved clip with audio and thumbnail without download/upload; reload keeps it | Disposable browser/API flow; source hash unchanged; same committed preview/download |
| AC-3 | Drafts, failed/cancelled/interrupted renders, duplicate retries and stale tabs cannot corrupt or replace the successful save | Failure injection and cross-process concurrency tests; restart/retry evidence |
| AC-4 | All writing actions persist per clip or standalone document; no cross-clip SSE, transcript, or late-result leakage | Deterministic mocked-provider tests with two documents/tabs and restart |
| AC-5 | Content edits mark older writing clearly; visual-only changes preserve valid writing; regeneration never loses user edits on failure | Version/fingerprint tests and browser inspection |
| AC-6 | Existing clip metadata and recoverable browser drafts migrate once with unknown fields preserved | Legacy fixture matrix, duplicate import, interrupted/corrupt input cases |
| AC-7 | Caption/logo changes appear in final output; applying/removing them preserves trim, framing and one thumbnail card | Rendered frames + ffprobe/audio checks + repeated operation order tests |
| AC-8 | Timeline supports all existing controls plus planned waveform/strip/inputs/undo, with correct aspect ratios and bounded work | Keyboard/pointer walkthrough; long-source/no-audio fixtures; measured interaction behavior |
| AC-9 | Trimming respects kept segments, words, crop keyframes, card and intro/outro timing; no discarded speech returns | Time-mapping unit tests + known visual/audio/word markers in a multi-segment render |
| AC-10 | Missing media leaves writing usable; deletion detaches it; Cleanup preserves active references and can reclaim retired artifacts | Disposable deletion/relink/cleanup tests, source hashes and outside-root protection |
| AC-11 | Existing New Episode, Highlights, history readers and old links still work; local policy is unchanged | Relevant regression suites + cross-language serialization and route tests |
| AC-12 | Worker evidence is bound to current code/spec and independent review is complete before task acceptance | 4.1.0 reports bound to their actual preserved inventory, retained historical evidence with its original provenance, and independent review plus lead disposition |
| B1-1 (AC-9/AC-11 subset) | Explicit opt-in exact mode preserves ordered intervals and legacy defaults; invalid input cannot mutate source or previous outputs | Focused exact tests: noncontiguous/reversed/one-segment, invalid/out-of-bounds inputs, no heuristics, unchanged arrays and legacy defaults; pass with expected errors and no mutation |
| B1-2 (AC-9 subset) | Timing/word/keyframe provenance truthfully describes exact output, distinguishing unavailable/empty transcript | Focused exact tests and real bridge: clipped ordered words, retained source input for widening, unavailable/null/empty, keyframe domain, receipt/offsets; expected truthful JSON and no excluded content |
| B1-3 (AC-9 subset) | Completed media, dimensions, composition and actual transition agree with justified tolerance | Focused media cases and real bridge: decoded frame/audio/word markers, all formats, crop keyframes, silent/non-30fps, intro/outro/fade/fallback refusal; valid media or explicit refusal, unchanged source; retain stated VFR limits |
| B1-4 (AC-3/AC-11 subset; repair-3 WS-11) | Operation-owned group is cleaned from first successful parent acquisition; staging failure preserves original error, removes only owned residue or identifies cleanup denial; existing/colliding/prior flat and grouped outputs stay intact | Before edits record chosen invocations against these IDs in the Worker receipt. Reproduce with the preserved repair-2 reproduction; separate corrected real-directory demonstration injects persistent staging mkdir and cleanup denial, with/without previous outputs. Reuse allocation-exhaustion/collision tests; expected original error, truthful residual, unchanged prior bytes. Run focused exact suite (media/process schedules), full Python, affected syntax and exact bridge as below; all required checks pass. Retain legacy parity/Node/build/types only with unchanged covered-input hashes and dependency justification; refresh affected coverage |
| B2A-1 (AC-3 subset) | Draft and successful save survive service/process restart; pointer, summaries and success receipt commit together; draft does not alter saved media | Service tests and real bridge check in isolated storage: old output unchanged after draft, real exact revision reopens at the returned paths with matching probe/receipt; no partial committed state |
| B2A-2 (AC-3 subset) | Retry is durable and idempotent; stale/cancelled/deleted/recreated or conflicting operations cannot commit; restart never guesses ownership | Deterministic barriers and real child-process interruption before and after history commit, repeated operation IDs, changed request with reused ID, concurrent draft/save, explicit invalidation and late completion; no second render for replay, prior output intact, acknowledged commit recoverable |
| B2A-3 (AC-3/11 subset) | Shared mutation preserves unrelated TS/Python changes; corrupt history cannot be overwritten | Two real processes using production mutation paths, including Python metadata mutation during save; existing cross-process/history regressions plus fault injection at manifest/history publication; unknown fields preserved, failed reads unchanged |
| B2A-4 (AC-9 subset) | Saved recipe retains full source words and exact ordered mapping, truthful transcript availability and card/transition provenance | Narrow/widen/reversed fixtures, supplied-empty/unavailable and caption/editorial distinction; exact bridge decoded markers; unsupported/malformed receipts rejected. Lead-12 adds producer-derived join-input/clamp/eligibility matrix, coherent wrong-overlap mutations, valid fallbacks/rounding, missing-provenance new-save refusal and older-document read compatibility |
| B2A-5 (AC-10/11 subset) | Only operation-owned isolated artifacts are created; current/previous/active outputs remain protected; legacy production callers are unchanged | Real Cleanup scan/execution against isolated current/previous/active/interrupted groups and original outputs; malformed identifiers/path traversal/linked-root cases; no new deletion candidates, no source/prior-output changes; production opt-in/callsite audit |
| B2A-6 (AC-11/12 subset) | Evidence covers the changed service on its bound snapshot, with independent review required | Fresh focused revision tests, full Node suite including cross-process tests, build, client types and disposable saved-revision bridge check; changed Python inputs require affected focused/full Python and exact bridge reruns, otherwise retained Python evidence needs covered-input hashes and dependency justification; fresh non-author review then lead disposition |

Use existing `src/services/clips-history.test.ts`, `storage-cleanup.test.ts`,
`src/config/policy.test.ts`, `src/server-policy.test.ts`, Python history/render/
strict-AI tests, and existing disposable verification scripts where they cover
behavior. `tests/test_local_reframe.py` covers scene detection, not the full editor;
additional time mapping and browser evidence are needed. Add tests for the gaps
above, not cosmetic changes or tests that only repeat implementation details.

The table above is the single acceptance-to-check map. For 1B.2a, record chosen
focused commands and the new disposable check command before execution, mapped to
B2A-1..6 with expected outcomes. Fresh Node/build/client-type commands are listed
below. Run the actual configured Python bridge from the new check, not only a mock.
No general browser flow is claimed by this internal slice. Retain unaffected
predecessor evidence only with explicit covered-input comparison and justification.

Accepted repair-3 invocation history is retained here for reproducibility, not as
an instruction to repeat an old repair or as the active 1B.2a check set:

`node scripts/verification/run-tests.mjs python -k exact_render`;
`node scripts/verification/run-tests.mjs python`;
`node scripts/installation/run.mjs python repair-3-1b-1-py-compile -m py_compile backend/services/clip_generator.py tests/test_exact_render.py`
(include other Python inputs if changed); and
`node scripts/verification/check-exact-render.mjs`.
The defect reproduction is
`node scripts/installation/run.mjs python repair-3-1b-1-before-repro _local/project/writing-studio/1b-1-repair-2-review-repro.py`;
its assertions prove the old defect, so preserve expected obsolete-assertion failures
and use a separate corrected demonstration. Name that demonstration's exact command
in the receipt before running it. No check result is asserted by this refresh.

Candidate commands for broader feature checks, selected as their slices become active:

```powershell
node scripts/verification/run-tests.mjs node
node scripts/verification/run-tests.mjs python
node scripts/installation/run.mjs npm build run build
node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json
node scripts/verification/check-preview-render.mjs
node scripts/verification/check-storage-cleanup.mjs
```

Extend/add a disposable Writing Studio verification script for the new contracts;
existing preview and cleanup scripts are useful precedents, not proof of the new
flow. Use an isolated home/data/output and verified unused loopback port. Use fixed
AI responses for regression tests, plus a deliberately authorized live smoke test
if needed. The earlier live thumbnail test was blocked by automatic approval review
over sending clip details; that permission was not subsequently granted. Do not
reuse real clip text for an external test based on this planning request.

Fixture coverage: legacy single clip; multi-segment clip; vertical/horizontal/square;
card plus intro/outro; logo replacement and removal; missing source/output/words;
no-audio, variable-rate and long-source media; two concurrent editors and simultaneous
TS/Python history updates; failed render/provider/save/restart. Use synthetic media,
not destructive changes to Isaac's Library. Record actual frame/audio observations,
durations, commands and limitations. There is no universal test-runtime promise.

## Current technical constraints

These constraints refine the draft's design; they do not authorize later slices.
Evidence and product decisions are in `reports/kickoff-assessment.md`.

- History mutation must distinguish missing history from corrupt/unreadable or
  invalid-shaped history. Only a missing file initializes empty. Never turn a
  read failure into a successful overwrite. The lock covers fresh read through
  atomic replacement, including prefix resolution; atomic rename alone is not
  concurrency protection. All callers of full-list saves must be reconciled.
- A render commit publishes immutable, fully written dependencies before one
  authoritative pointer update. Use durable operation IDs and compare expected
  versions under the same mutation protocol; a crash before pointer publication
  leaves an orphan, not a committed revision. Recovery reconciles operation state
  with the pointer after a crash between publication and success acknowledgement.
- Do not expose revision-backed clips to legacy mutating routes that can bypass
  this protocol. Adapters must join it as revisions become writable, including
  thumbnail/logo/CLI/MCP operations; moving their UI may wait until slice 3.
- The legacy renderer sorts segments, snaps ends, can remove pauses/fillers,
  and does not return its effective segment map. `preserve_timing` only controls
  transition autofix; it does not freeze editorial boundaries. Before 1B accepts
  a render, establish an explicit exact-edit mode preserving ordered segments and
  return effective timing from the renderer. Preserve old defaults for New Episode.
  Test reordered/noncontiguous segments, end snapping, and widening after narrowing.
- Versioned timing must retain source-absolute words as recovery input and derive
  edited words/text from the actual kept segments. Empty words is valid, distinct
  from unavailable words. Retain enough source transcript for widening; never use
  a bounding-range transcript as proof of what an edited render contains.
- Probe the final card/logo/bookend output for actual size and duration. Model
  intro/outro crossfade overlaps as well as the 1.5s opening card. Persist effective
  content mapping separately from full output duration; do not trust the current
  renderer's content-only duration as final MP4 duration.
- Migration must not claim exact timing from recipes that omit automatic cuts.
  Keep the legacy output and writing available; label insufficient edit capability
  until trustworthy source/timing recovery. Do not silently re-transcribe, flatten
  cuts, or use an unrelated episode cache. Copy legacy unknown fields intact.
- Migration publication must be resumable with deterministic identity and durable
  acknowledgement before clearing browser data. Missing old transcript/custom
  answers remain unavailable. Rollback means restore an isolated pre-migration
  metadata snapshot only before new writes; after new writes, retain new documents
  and use forward recovery. Running baseline code concurrently with migrated data
  is unsupported and must not be represented as a lossless downgrade.
- Cleanup needs an explicit app-owned revision namespace/category beneath exports,
  not a blanket scan of exported media. Traverse live current/previous/operation
  roots rather than every historical absolute path; keep unknown/corrupt metadata
  fail-safe. Coordinate final reference validation and unlink against all processes
  that publish references, not only web-server busy flags. Do this before new
  revisions become eligible for deletion. Never make original exports candidates
  merely because they appear in a legacy manifest.
- Thumbnail replacement, logo removal and caption changes rebuild from the same
  recipe, without using stale pre-logo backups. Preserve the chosen card exactly
  once. The initial composition order remains content finishing, bookends, then
  the opening card; no new logo overlay on the card is introduced implicitly.
- D1/D2 are confirmed by Isaac. Readiness is a saved-revision
  marker, not a gate on editing writing or evidence of publication. A missing-media
  document remains accessible without being falsely marked render-ready.

## Workflow and handoff

Workflow 4.1.0 governs 1B.2a and its review, bound to inventory 4.1.0-local-1.
The earlier repair-3 instruction switch is retained in spec-log.md and its reports.
An active Worker encountering changed instructions explicitly rereads them, records
the actual boundary and continues independently authorized work. Reports use the installed
templates and actual execution receipts; this spec owns the single acceptance map.
Earlier reports, plans and accepted evidence keep their original bodies and provenance.
The coordinating lead owns Status/ledger and acceptance. No implementation, commit,
push, release or automatic Worker dispatch is authorized by workflow maintenance.
1B.2a retains the no-agent-dispatch limit; the lead arranges fresh bounded independent
review after handback (fresh separate-session fallback if necessary). Keep the
two-unsuccessful-round reassessment and three-identical-attempt circuit breaker.

## Approved exceptions currently in force

Existing evidence storage under `_local/project/writing-studio/` is retained,
including the assigned repair-3 snapshot path, under README's storage policy.
No acceptance or review waiver. Isaac's settled product choices remain: captions
and logos in Writing Studio, detached writing after deletion, explicit Cleanup for
eligible older revisions, single-video timeline and explicit saved-revision readiness.
Later slices remain provisional. Missing media never makes writing inaccessible or
falsely render-ready. Routine implementation details remain delegated.

Accepted 1A metrics publication uses the conservative expected-state rule: publish
only while clip, attribution and current metrics equal the captured snapshot. Any
intervening change, even without fetched_at, is a skipped conflict; unchanged legacy
metrics still refresh. This remains the accepted no-lost-update constraint.
