# Implementation plan: Writing Studio and Library editing

Originally prepared by a planning-only author. The coordinating Project Lead has
reviewed and refined it against current code in revision lead-2. The roadmap remains
provisional; only the bounded slice 1A below is technically ready for an implementation
assignment, subject to Isaac's approval/relay. No implementation is authorized yet.

## Status

- Task ID: writing-studio
- Spec revision: lead-2, 2026-09-11
- Implementation: slice 1A implemented and handed back by Worker; later slices not started.
- Verification: Worker reports pass on the bound 1A snapshot; lead confirmed all 24
  manifest hashes and patch hash match. Review of evidence/coverage in progress.
- Review: fresh independent review of slice 1A in progress; acceptance pending.
- Current slice: 1A review cycle 1.
- Coordinating lead: Codex, this coordinating Project Lead session, 2026-09-11.
- Implementation owner: coordinating Project Lead after Worker handback; writes
  frozen for independent review, no repairs authorized by this status update.
- Conditional ownership handoff recorded by lead: upon Isaac's explicit approval
  and relay of handoff-1a.md, the receiving Worker is the sole implementation
  owner for slice 1A until it hands writes back. No ownership is active at kickoff.
- Completed slices: none accepted yet. Worker report: reports/1a-worker.md.
- Pending independent report: reports/1a-review.md (fresh review-only subagent).
- Review snapshot: 710b4d4 plus _local/project/writing-studio/1a-snapshot patch and
  24-file manifest. Matched before this bookkeeping update; spec behavior unchanged.
- Next action: independent review, then lead disposition and manual next handoff.
- Pending Isaac decisions: none for review. D1/D2 resolved by Isaac:
  move captions/logos to Writing Studio; preserve detached writing and offer older
  revisions in explicit Cleanup (reports/kickoff-assessment.md).
- Integration/release: not authorized by this planning request.
- Installed workflow: 4.0.6; local adaptations recorded in `docs/workflow/README.md`.

## Planning baseline and freshness

- Inspected checkout: `C:/Users/Isaac/Desktop/BabyWebDev/Code and Websites/video-clipperz`.
- HEAD: `710b4d4eaf598e1a3a75a48e57b17b1b25f30e0e`.
- That commit is titled `Updates pre-Writing Studio`. The 46 application/workflow
  inputs captured in `planning-baseline.json` have no working changes at the final
  planning check. This task's new plan files and the historical-draft pointer are
  uncommitted. The manifest records hashes and Git status for drift detection;
  it is not an implementation review or acceptance snapshot.
- Product input: Isaac's request to combine Content and Library's publishing work,
  preserve all capabilities, retain trim/reframe/thumbnail editing in Library,
  add an easier live timeline, and hand off saved clips without export/reupload.
- Earlier discussion: `docs/writing-studio-plan.md`; it is historical context,
  not another task-status owner. Workflow installation is complete; its earlier
  unresolved workflow-location question is obsolete.
- Relevant ignored context: the configured runtime is described by
  `docs/local-setup.md` and loaded by `scripts/local/runtime.mjs`. No credentials,
  actual environment values, media, or user's history were copied into this plan.
  Runtime availability, source files, and browser draft contents were not tested
  in this planning turn. Validate them in disposable fixtures when needed.
- Source-inspection observations below are not runtime bug reproductions. Earlier
  thumbnail/build successes do not prove this proposed workflow works.
- Before implementation and each resumed slice, compare relevant hashes, callers,
  migration shape, and predecessor results; update affected design and checks.
  Do not reset working changes; another checkout needs these plan documents as
  well as the recorded application baseline before it can resume the task.
- Before independent implementation review, capture the stronger patch/content
  snapshot required by the workflow contract. No worker should infer review
  approval or ownership from the existence of this file.

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
| TS and Python clip-history services | Share `clips.json`; TS queues only its own writes; Python uses atomic replacement | Atomic replacement avoids partial files but does not prevent cross-process lost updates; make commit coordination explicit |
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

**Slice 1A — safe shared history mutation** is the first bounded assignment.
Implement the contract and checks in `handoff-1a.md` only. It closes concurrent
lost updates and mutation after unreadable history across current TS/Python writers.
It introduces no revision schema, migration, new UI, rendering, or deletion policy.
This is a prerequisite to the original slice 1, now **1B**, below. Acceptance of
1A does not authorize 1B automatically.

1. **1B: Reliable saved clip and handoff (provisional).** Define/test legacy adapters, draft/revision
   types, cross-process mutation protocol, commit/cancel/recovery, and operation
   status. Add a minimal Library handoff and Writing Studio saved-preview route.
   Prove one disposable clip saves, reopens without upload, and survives a failed
   render. Keep old Content and Library panels working during this transition.
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
| AC-12 | Worker evidence is bound to current code/spec and independent review is complete before task acceptance | 4.0.6 worker/review reports and incoming lead's disposition |

Use existing `src/services/clips-history.test.ts`, `storage-cleanup.test.ts`,
`src/config/policy.test.ts`, `src/server-policy.test.ts`, Python history/render/
strict-AI tests, and existing disposable verification scripts where they cover
behavior. `tests/test_local_reframe.py` covers scene detection, not the full editor;
additional time mapping and browser evidence are needed. Add tests for the gaps
above, not cosmetic changes or tests that only repeat implementation details.

Candidate commands, to be selected and recorded by the implementation owner:

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

## Workflow and handoff

The coordinating Project Lead owns this task's Status. Lead-Worker relays remain
manual through Isaac. No Worker was dispatched and no application implementation,
commit, server launch, or independent implementation review occurred at kickoff.
Each substantial slice gets a fresh review-only assessment after Worker handoff,
then lead disposition. Budget: two unsuccessful repair/review rounds on the same
issue before reassessment; never a fourth identical failed approach.

Use one task directory and per-cycle reports. Worker reports use the installed
report template and identify checks before substantial implementation. A fresh
independent reviewer uses the lead role in review-only mode, without inheriting
the planning/implementation conversation. If subagents are unavailable, use a
fresh separate session. The coordinating lead owns acceptance and any findings
ledger updates; a Worker does not self-approve. Apply the installed two-round
review reassessment and three-identical-attempt circuit breaker.

The Project Lead should assess the proposed render-commit protocol, TS/Python
locking coverage, legacy timing recovery, deletion retention policy, and timeline
scope before slice 1. Routine internal choices remain delegated. No mandatory new
user approval is introduced for naming/components or already-authorized planning.
Implementation authorization and any unresolved material product choices must be
recorded honestly before Worker dispatch.

## Decisions and durable records

Isaac confirmed captions/logos in Writing Studio, detached writing after clip
deletion, and Cleanup eligibility beyond current-plus-previous renders on
2026-09-11. Single-video timeline and explicit ready handoff remain scoped as above.
The lead selects shared JSON locking for slice 1A rather than a new database.
Later interfaces remain provisional and require freshness checks, verification
and independent review; these decisions do not authorize implementation.

Companion files: `feature-map.md`, `planning-baseline.json`, and
`project-lead-prompt.md`. The latter is a fresh-session prompt, not an executed task.

## Lead-2 technical refinements

These constraints refine the draft's design; they do not authorize later slices.
Evidence and product decisions are in `reports/kickoff-assessment.md`.

- Freshness: all 46 original hashes match 710b4d4 on 2026-09-11. No application
  changes found. Planning files remain uncommitted. Generic media-app references
  still apply; no added domain reference is needed. Relevant ignored project
  inventory contains reference-study materials, not accepted task outcomes.
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
- The renderer currently sorts segments, snaps ends, can remove pauses/fillers,
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
