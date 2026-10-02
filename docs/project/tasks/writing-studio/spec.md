---
record: "spec"
task: "writing-studio"
spec_revision: "lead-27"
snapshot: "_local/project/evidence/writing-studio/1b-2b-4a/repair-1/snapshot/manifest.json"
author: "agent"
date: "2026-09-27"
state: "active"
summary: "Lead-27 unchanged: repair-1 handed off with reported passing checks and PASS-WITH-FINDINGS audit (A-1..A-3 nonblocking). Fresh focused assessment and WS-23 disposition pending; 5.2.0 forward lanes apply. No release."
read_when: "Implementing or reviewing 1B.2b.4a repair-1 or adapters, planning 1B.2b.4b or 1B.2b.5, or revisiting the accepted 1B.2b.3 fence."
---

# Implementation plan: Writing Studio and Library editing

This living head retains all current feature requirements and acceptance criteria.
Size exception: it exceeds the workflow 5.0.0 soft caps (1,200 narrative words; Status
300) to preserve the multi-slice data, media, compatibility and safety contracts while
bounded save slices are introduced. Historical baselines, status and decision rationale
moved losslessly to append-only spec-log.md; later slices remain provisional. No
criterion is removed to meet the soft cap. Headings predate the 5.0.0 template
(compatibility item C-1): acceptance lives in `Acceptance criteria and verification`
and scope in `Scope and preservation`; reports cite these names, so they are kept.

## Status

- Objective: Writing Studio and Library editing with safe saved media and writing.
- Task ID: writing-studio; spec revision: lead-27 (requirements unchanged); current snapshot: HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13` plus `_local/project/evidence/writing-studio/1b-2b-4a/repair-1/snapshot/manifest.json` (`84c74067...`).
- Lane: substantial (shared production writers of local saved clips across TS, Python and MCP; recorded 2026-09-22, reaffirmed 2026-09-23 for 1B.2b.4a).
- Review/repair round: 1B.2b.4a repair-1 (round 1 of 2 on WS-23), handed off 2026-09-23; fresh verification pending.
- Implementation: implemented for repair-1 per its report; not accepted.
- Verification: pass reported by repair-1 writer on `84c74067...`; required fresh focused assessment pending. Maintenance did not rerun product checks.
- Review: changes-requested from `reports/1b-2b-4a-review.md` F-1; repair-1 awaits fresh focused non-author assessment and disposition. Self-audit PASS-WITH-FINDINGS (A-1..A-3 nonblocking).
- Integration/release: not authorized; nothing committed or pushed.
- Current slice and acceptance IDs: 1B.2b.4a finishing-action adapters, B2B4A-1..6; 1B.2b.4b provisional.
- Task owner: last recorded owner is the Claude Code desktop session (claude-opus-5-5) assigned by Isaac on 2026-09-23; retained pending forward transfer to a fresh reviewer-owner. No transfer to this maintenance session. Former hub must not resume; the next owner records the actual relay/session/date.
- Writing rights: none (repair-1 writer stopped at its 2026-09-23 handoff).
- Current implementation report: docs/project/tasks/writing-studio/reports/1b-2b-4a-repair-1-implementation.md
- Current repair report: none
- Final repair snapshot: not applicable
- Completed slices: 1A, 1B.1, 1B.2a, 1B.2b.1, 1B.2b.2 (read-only editor context) and 1B.2b.3 (tracked-clip write fence); prior scoped closures retained.
- Unresolved findings: WS-23 (repair-1, before adoption); WS-25 and WS-26 (1B.2b.5; WS-26 before adoption); WS-03, WS-04, WS-05, WS-06, WS-09 (legacy).
- Last failed approach: WS-23 sink check covered only the video road (review F-1).
- Pending Isaac decision: none.
- Next action and owner: Isaac relays to a fresh reviewer-owner for the focused non-author assessment of WS-23/F-1 and B2B4A-4 on repair-1, then disposition. Transfer task ownership only; no product writes. No return to the former hub. The implementation pointer selects the lead-27 repairer report; the repair pointer is reserved for reviewer-authored repairs, of which there are none.
- Records to open for this action: lead-27 repair-1 section; B2B4A-4 row; `reports/1b-2b-4a-review.md` F-1 and disposition; repair-1 snapshot/delta and receipts; `reports/1b-2b-4a-repair-1-implementation.md`; `reports/1b-2b-4a-repair-1-self-audit.md`; ledger WS-23.
- Evidence root: `_local/project/evidence/writing-studio/1b-2b-4a/` (repair-1 under `repair-1/`); review `1b-2b-4a-review/`; owner records `1b-2b-4a-lead/`; earlier roots unchanged.

## Current baseline and assumptions

Lead-26 freshness (2026-09-23; workflow 5.0.0, inventory `5.0.0-local-1`; doctor
identities match): HEAD remains fed8ed1 and the accepted 1B.2b.3 manifest still hashes
`43ffa1eb...`. Its `--check` reports drift only in the eleven task-state records the
acceptance edited, all hash-equal to `records-post-acceptance.sha256`, so nothing was
written after acceptance. All 46 planning inputs equal their manifest entry or HEAD blob,
and the configuration and six current `dist` files match. Inputs are in
`baseline-1b2b4a.json`; audit, doctor, brief and pre-edit copies are in
`_local/project/evidence/writing-studio/1b-2b-4a-plan/`. The lead-23 freshness
paragraph this replaces stays in its spec-log entry. Current code: the fence refuses
every legacy media action on a tracked clip; no production module imports the save
service or calls `ensureTracked`; a commit re-projects the summary but leaves
`logo_backup_path` and `thumbnail_config.preview_path` stale; the save service renders
on every save, from a caller-supplied recipe; version zero has no recipe and
`known_effective_cuts` false; the legacy `generate_clip` branch writes its title-derived
sink without a path check (WS-23). Reference reassessment: `local-app.md` stays selected
for these Studio routes, the Python renderer and local saved data; README unchanged.

Lead-22 accepted repair-4: application manifest
`af85e7ce1548469bc50566be177dc03bb46368a9444466759a7e595fc298f968` under
`1b-2b-2-repair-4/snapshot/`;98 unique source/config/instruction/record entries
match at lead audit before Status edits. Accepted runner4ee3ae7d... and Python
oracle0a03ba7a... unchanged. Fresh independent application review accepted B2B2-1..5.
The only subsequent code-file delta is model documentation, before29576397...
after05dfb65c..., in `1b-2b-2-repair-4/lead/comment-delta.json`, independently
verified with unchanged executable text. Historical snapshot remains intact.

Lead-22 freshness:51 unique non-document repair-3 inputs match; HEAD remains
fed8ed1 and accepted conformance runner remains4ee3ae7d.... Audit:
`_local/project/evidence/writing-studio/1b-2b-2-repair-4-plan/baseline.json`.
Current pure read contract omits source/content word derivation, old raw probe/file
relationships, duplicate bookend/transition/terminal measurement consistency; its
served-kind predicate uses the recorded extension while actual routes use realpath.
Accepted producer/writer code supplies these relationships. No new reference applies.

Lead-21 accepted artifact: runner
`4ee3ae7dfab458037aaf23d7d72faaf900975b1a15a3c75afd44a3e16fb25eee`,
snapshot `1b-2b-2-contract-proof-repair-2/artifact-snapshot.json` SHA256
`6cfeb259a9907e57e0f84a3d673e47ece591baf7bfe139f680d999df596820ed`.
Lead independently matched51 application inputs; reviewer matched15 source/build/
artifact identities and ran five verifier self-checks. Snapshot capture-log entry
is a matching644-byte prefix plus322 diagnostic bytes appended by capture itself;
all21 other entries match. Original evidence preserved, qualified in repair-2
review/disposition and `lead/capture-log-reconciliation.json`. Application remains
repair-3, verification failed; artifact acceptance authorizes no application writes.

Lead-21: repair-1 artifact snapshot SHA256
`7f7febd81ac7fa7b72de9f8919eb91c6f1eb7c88423cb9b664018e7f889166a6`;
runner `dd04e3587010d65f98d2a105cd02ac3469de539fc9f13cb0e457ed3efd0258dd`.
Lead audit matched23 artifact/evidence/report entries and51 unique frozen application
inputs; reviewer independently matched15 source/build/artifact identities. Evidence:
`_local/project/evidence/writing-studio/1b-2b-2-contract-proof-repair-1/lead/handback-audit.json`
and that cycle's `review/result.json`. Application baseline remains repair-3.

Lead-20: artifact snapshot `1b-2b-2-contract-proof/artifact-snapshot.json` SHA-256
`def5cf0a460ee5c1789ebe9b5de1394db221dc5a395d7a7559e01b463d2ec4c8` binds
the two scripts, original21 evidence files and Worker report. Lead verified all24
entries plus51 frozen application inputs without drift before bookkeeping. Fresh
review provides supplemental `review/check.mjs` and `review-result-run3.json` under
that cycle. Application remains repair-3, not the new verification artifact snapshot.

Lead-19: 51 unique non-document inputs still match the repair-3 manifest; HEAD
and manifest hash unchanged. Audit:
`_local/project/evidence/writing-studio/1b-2b-2-contract-proof/lead-baseline.json`.
Only lead records changed since review. The next assignment builds verification
artifacts against this frozen application, not a fourth application repair.

Lead-18 reassessment: 47 unique non-document application/configuration/contract
entries from the repair-2 manifest still match; HEAD is unchanged. Audit:
`_local/project/evidence/writing-studio/1b-2b-2-reassessment/lead-baseline-check.json`.
Four genuine pre-composition current/previous documents in the accepted compatibility
fixtures retain exact-v1 tolerances and lack final composition; paths/hashes in
`historical-profiles.json` beside that audit. This sample establishes those profiles,
not an exhaustive historical survey. Application verification is not rerun for
coordination-only edits, and this comparison does not accept the open R2 findings.

Lead-15 freshness: `baseline-1b2b2.json` records current service/models, history,
web/media-policy interfaces, legacy sidecars, dependencies and ignored config hash.
41 non-document application/contract entries match accepted repair-1 (including
overlapping categories); HEAD remains fed8ed1. Existing sidecar readers collapse
missing/corrupt words to [] and other sidecars to null. They cannot support an honest
editor capability response as-is. Legacy recipes retain requested segments and
bounded words, not proof of effective rendered cuts. Read-only context precedes
adoption so legacy mutators cannot reach newly tracked production clips. Generic
local-media references remain applicable; no new selected domain reference.

Accepted 1B.2b.1 baseline (2026-09-19): HEAD fed8ed1 plus
`_local/project/evidence/writing-studio/1b-2b-1-repair-1/snapshot/manifest.json`
SHA-256 `6daecc8b8e8258c57335440863535ea2a3681817bc62741e158d320001a4fe39`,
tracked patch `52ae6d10c1f3bbc694195e5fd428546f6d931562fda66fd211e0bd5229a9ab5f`
and snapshot untracked copies. Fresh repair-1 review/disposition accepts B2B1-1..5.
Application and covered dependencies/evidence match; later setup/README and lead
bookkeeping are recorded separately in spec-log. Worker used local-1; current review
uses local-2. Historical claims below describe their dated planning/acceptance state.
Production adoption is still absent. Successor plans must account for multiple
dependency groups, owned image identity, final served duration, immutable raw receipt
and separate final composition, strict versioned receipt shape, and retained old
document/replay compatibility. Existing static ownership and audio-proof limits stay.

Lead-13 planning inputs are captured in `baseline-1b2b1.json`; accepted repair-3's
12 application and 11 contract inputs still match (23 checked, zero drift).
HEAD remains fed8ed1. Legacy thumbnail baking overwrites its input and uses a
portrait/default-rate card; it is a behavioral precedent, not a safe revision
composer. The service currently rejects cards, so composition precedes production
adapters. Generic local-media references remain applicable; no new domain selected.

Accepted 1B.2a application baseline: HEAD
`fed8ed13dcb2aade06bee341953d6b10d58bff13`, tree
`b0d7d5c8e62c440fca5d1e4b6dfaa65ebd179f2c`, plus repair-3 snapshot above,
tracked patch SHA-256 `6b5b57bfbed008f8a203a09d53c0f2c98b3b05e1fb39c465253424b75983d407`
and three preserved untracked files. Independent review accepts B2A-1..6 on this
snapshot. Join inputs are producer-recorded values, not independent media attestation;
existing rounding and supported hardcut fallback limits remain. Old-document read/
replay compatibility and new-save missing-provenance refusal are verified. Broader
production integration is not enabled. Commit drift and line-ending qualification
are preserved in spec-log.md; no commit rewrite or new commit by the lead.

Accepted 1B.1 repair-3 remains the prerequisite baseline: HEAD
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
   partition in preserved `plan-1b.md`: **1B.1 exact render result**, **1B.2a revision
   commit core**, **1B.2b.1 immutable opening-card save**, **1B.2b.2 read-only editor
   context** and **1B.2b.3 tracked-clip write fence** are accepted. Lead-26 splits the
   legacy adapters: **1B.2b.4a finishing-action adapters** (caption, logo and card
   actions on exact tracked revisions through the save protocol, keeping legacy
   responses, plus the WS-23 fix) is bounded below. Provisional successors, each
   refreshed after its predecessor's acceptance: **1B.2b.4b timing adapter** (`rerender`
   trim and reframe on exact revisions), **1B.2b.5 adoption and save API** (explicit
   adoption, draft/commit/operation routes, revision-aware deletion, editor capabilities
   and the items lead-26 carries), then **1B.3 visible save and handoff**.
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

## 1B.2b.1 bounded assignment: immutable opening-card save (lead-13)

Deliver one observable internal flow: save a draft selecting a thumbnail, commit a
real exact revision with one 1.5-second opening card, reopen it after restart, then
change/remove the card or change content/logo and save again without altering any
earlier output. This is the next prerequisite for production save adoption, not a
new thumbnail editor. Existing caption/logo recipe behavior is reused.
For this successor only, the new card contract replaces 1B.2a's card refusal and
card-absent revision-manifest restriction. Raw renderer receipts still declare no
card. Earlier bounded repair instructions remain historical scope, not a prohibition
on this explicitly authorized successor; their accepted safety guarantees remain.

Expected areas: revision service/types, a focused internal media composer and bridge
entry if needed, targeted tests/fixtures and disposable verification. Delegate helper
layout and internal signatures. Do not change public routes, CLI/MCP behavior, UI,
Cleanup eligibility, history locking, AI routing, dependencies or legacy renderer
defaults. Do not adopt production clips, repair legacy WS-06/09 incidentally, or
start later adapters/migration. No agent dispatch, commit, push or release.

**Input and retry contract.** Introduce a validated optional card descriptor in
draft/save requests: selected image path plus expected SHA-256 identity, fixed
opening placement and 1.5-second requested duration. Reject other placement/duration
instead of silently coercing it. No arbitrary output destination. Capture requests
before awaits as today. Bind the descriptor into new card request hashes; preserve
the existing no-card hash normalization so old operation replay still works. Replay
must precede filesystem checks, including the image; reused IDs with another card
conflict. For new work, copy the selected image to operation-owned storage and check
that copy against the captured hash before composition. Retain this immutable image
as a revision dependency. A changed/missing image fails without pointer movement.
Draft saves persist the choice without rendering or changing served media.

**Composition boundary.** First obtain and validate the accepted exact render,
including its caption/logo/bookends. Compose the card from that fresh output, never
from a previous finished revision or pre-logo backup. Prepend once, hard cut with
zero overlap; no implicit logo/captions on the image. Match the rendered dimensions,
aspect and frame timing; do not inherit thumbnail_to_video_frame's portrait defaults.
Card audio is silent, existing audio follows at the measured card offset, and silent
source behavior is explicit. Do not accept video/audio drift via a numeric-only
fallback. Reuse rendering primitives only where they meet this contract.

Keep the renderer's published group byte-identical. A composer uses its own exclusive
operation group with staging and one directory rename, owning cleanup from first
parent acquisition. No replace/backup/rollback of prior outputs. Validate all staged
artifacts and prepare the result before publication; post-publication notifications
are best-effort. Cleanup failure names residuals. Record all groups/files this save
depends on and all unreferenced groups from failure/cancellation, including a renderer
group published before composition failed. Do not add collection here. Continue
existing real-directory ownership checks at roots and descendants; static checks
remain the accepted limit, not an adversarial filesystem-swap guarantee.

**Truthful final manifest.** Preserve `render_timeline` as the unmodified raw exact
receipt (its card-absent assertion remains true). Add a versioned final-composition
record with raw-render identity, owned card-image identity, requested/measured card
duration, zero overlap, final video/audio probes and size, final content offset
(measured card duration plus raw offset), and explicit artifact time domains. Raw
content/source words and keyframes remain in their existing domains. Caption overlay
and cropped source may remain raw/content-domain artifacts: retain their paths and
declare their placement in final output, never falsely claim they contain the card.
Final `files.main`, pointer, preview/download path and legacy duration/size projection
refer to the composed output; original content duration remains available separately.
For no-card new saves, final duration also means probed output duration. Do not rewrite
old revision documents or replay results. Old documents without this additive record
remain readable as saved, with no invented composition proof.

Validate composer output against captured inputs and actual probes before one existing
locked history commit of pointers, summaries and receipt. Preserve all B2A ownership,
expected-state, cancellation and lifetime replay guarantees. Derive timing tolerance
from actual frame/sample timing and document its basis before using it; do not choose
a broad slack to hide a wrong offset. Invalid/missing/contradictory composition
receipts and optional artifacts must fail without a successful revision.

Verification uses B2B1-1..5 in the single table. Run focused tests, full Node and Python,
build, client types, affected Python compile, both real bridge checks and relevant
preview/export parity through the configured runtime. Extend the saved-revision check
with actual decoded frames/audio, not only fake receipts. Preserve failed attempts
and distinguish tool limits from product failures. No browser proof is claimed here.
Worker report: `reports/1b-2b-1-worker.md`; evidence/snapshot:
`_local/project/evidence/writing-studio/1b-2b-1/`. Bind lead-13, actual code and inputs,
workflow 4.1.0/inventory 4.1.0-local-1; record meaningful delegated choices. Stop writes
at handback. Lead then arranges fresh independent review of design and implementation;
two unsuccessful rounds on the same issue require reassessment, not automatic repair.
Propose setup documentation through the report; leave preserved instruction inventory
and docs/local-setup.md unchanged in this assignment.

## 1B.2b.1 repair-1: complete composition receipt validation (lead-14)

Fresh review `reports/1b-2b-1-review.md` R1 demonstrates valid media accompanied by
contradictory persisted producer facts. Its real-composer reproduction changes audio
to 1 Hz/99 channels/999-second timing, or removes required duration/card-boundary
fields; all commit. B2B1-2 fails despite the original suites passing. WS-16 recurs
at this new boundary; accepted raw exact validation and its prior closure remain.

Reassessment: the previous WS-16 fix addressed raw exact producer provenance.
This composer already supplies the needed measurements; the consumer validates only
a subset then casts the entire object. Repair the complete supported composition
schema, not just reproduced fields, using existing captured inputs, derived card
timing and independent probes. Keep a field-to-validation/mutation inventory in
Worker evidence so producer-backed coverage includes every retained semantic group.
No new producer attestation or per-save decoded-audio requirement is introduced.

Expected write area: revision composition validator, its types only where needed
to encode the existing contract, focused tests/producer fixtures and disposable
saved-revision check. Preserve Python producer/render behavior and all publication,
timing tolerances, compatibility, operation and ownership guarantees. Surface any
genuine producer-contract contradiction to the lead before changing settled design.
Require the declared shape, enums, finite numeric types/ranges and nullability;
compare all retained measured claims with captured inputs/probes/derived values,
including raw/output container duration, video/audio summaries, card duration and
boundaries, time-domain map and tolerance claims. Human-readable explanatory text
must have its declared type; do not treat arbitrary prose as measurement authority.
Reject missing/contradictory facts before pointer commit with accurate residuals.
Old saved documents/replays remain untouched; valid real receipts still save.

Before edits run the unchanged reviewer reproduction and preserve it byte-identical.
After repair run it unchanged, recording its obsolete assertions honestly, plus a
corrected separate demonstration. Add producer-backed omission/contradiction cases
across the complete supported schema, including no-audio nullability, with successful
real controls. B2B1-2/3/4/5 apply; preserve all other criteria. Run focused revision,
card-producer/process suites, full Node, build/client types, and real saved-revision
bridge fresh. Retain Python/exact bridge/parity only with unchanged covered-input
hashes and dependency justification; rerun affected evidence if their inputs change.

Report `reports/1b-2b-1-repair-1-worker.md`; evidence/snapshot
`_local/project/evidence/writing-studio/1b-2b-1-repair-1/`, bound to lead-14 and current
unrepaired snapshot above plus the repair. No lead-owned record, prior report,
reviewer script, inventory, dependency, route/UI/CLI/Cleanup or successor edits.
No agent dispatch, commit, push or release. Worker stops writes at handback for fresh
independent follow-up. This is repair round one for this composition occurrence;
the prior recurrence history remains, with reassessment after two unsuccessful
rounds and no automatic repair loop.

## 1B.2b.2 bounded assignment: read-only editor context (lead-15)

Deliver `GET /api/clips/:id/editor-context` backed by a focused service that resolves
one saved clip into a versioned, typed editor response. Prove it through real local
HTTP against disposable legacy and revision-backed fixtures. This introduces a
production read route, not revision-backed production writes or a replacement UI.
It supplies the next editor/migration adapter with current saved state and honest
recovery inputs. No Worker app work beyond this bounded slice is authorized.

**Response contract.** Use the full stored clip ID (no prefix/basename matching),
record incarnation/revision/draft versions when available, committed media identity,
draft separately, operation status, transcript availability and provenance, timing
domains, and explicit capability/reason codes. Distinguish media availability,
known edit inputs, and whether a write route is actually available: this slice must
not advertise save/adoption support. Clip text/title/publishing metadata remain
available if source or output is missing. Return only relevant fields through an
explicit serializer; do not expose the whole operations archive or arbitrary stored
objects. Internal filesystem paths are not new client-selected read destinations.
Reuse existing clip-ID preview/download URLs; include the saved revision identity
they describe. URLs are current-by-ID, not a promise to pin playback across a later
save. Do not add an unrestricted file-serving endpoint or change old routes.

**Authoritative revision read.** Read history strictly from one captured snapshot;
corruption/unreadability is an error, not an empty Library/404. A genuinely absent ID
is 404. For tracked records, current immutable revision and draft pointers own their
respective data; validate document identities, versions, required consumed fields
and configured-root ownership before using them. Do not silently fall back to legacy
sidecars if tracked state is corrupt. Respect old accepted v1 documents lacking
final_composition or join_inputs without rewriting or applying new-save validators
retroactively. Expose their recorded provenance/limits. For newer records preserve
raw render_timeline versus final composition offsets, full source words versus
content words, card image identity, optional artifact time domains and dependency
groups. Missing optional media is not a reason to discard usable text/current video.
No hashes or full video decode on every GET; bounded metadata/stat/probe work only
where needed and clearly distinguish existence from verified integrity.

Capture coherent current/draft identities before asynchronous file work. Immutable
documents permit a snapshot response; concurrent pointer advancement must not mix
new and old versions. Document the response's captured identity rather than claiming
it is still latest after return. Keep expensive work outside the history lock. Reuse
the accepted history read/lock facilities with a minimal strict read interface if
needed; no second history collection or lock protocol. A read creates no history,
revision/draft/media or persistent migration records. Ephemeral lock activity and
ordinary server/test logs are not migration writes.

**Legacy recovery description, not adoption.** Untracked clips and version zero keep
their existing media and metadata. Strictly read the ID-associated words, recipe and
reframe sidecars into separate recovery inputs, distinguishing absent, supplied-empty,
malformed and unreadable. Preserve raw stored unknown fields on disk; serialize only
known validated response fields. Requested ranges/keep_segments are labeled requested,
never an exact map of legacy output. Bounded words may be displayed with their recorded
source domain but do not establish full-source coverage for widening; do not invent
coverage from min/max words. Conflicting recipe/history/reframe choices yield explicit
diagnostics, not a guessed faithful recipe. No transcript cache from another source,
automatic transcription, media copying/rendering or source search. Existing thumbnails
may be described as selected legacy assets without proving when/how they were baked.
Missing/insufficient provenance reports a reason and recovery need; do not infer exact
timing even when a legacy keep_segments array is present.

**Trust boundary and compatibility.** Validate identifiers before sidecar path
construction, reject traversal and wrong-clip/revision documents, and constrain
app-owned sidecar/revision paths to their real configured directories without linked
root/intermediate escapes. Media/source paths already stored on legacy entries may
be outside export roots: preserve that established behavior without accepting query
paths or discovering unrelated files. Retain local host/origin policy. Errors use
stable codes and useful messages without returning unrelated file contents or raw
exceptions. Do not change lenient existing listing behavior globally.

Expected areas: new reader/service/types, minimal strict history read support,
web-server GET adapter, targeted tests and disposable HTTP check. No changes to
Python rendering, existing mutating endpoints, CLI/MCP, UI, actual migration,
ensureTracked adoption, writing persistence, Cleanup, AI, dependencies or policy.
Do not close WS-03/04/05/06/09 based on this read-only slice. Future mutating adapters
and migration must be freshly planned before tracked production writes are exposed.
Do not implement speculative migration/locking infrastructure for that later work.

Use B2B2-1..5 below. Run focused reader/HTTP/policy tests, full Node, build and client
types through configured runtime, plus a disposable actual HTTP-server check using
isolated storage and a separate free port (never restart Isaac's active Studio).
Use accepted real revision fixtures or generate isolated ones with accepted bridges;
prove endpoint behavior before/after server restart. Record commands and expected
results before implementation. Retain Python/media evidence only with unchanged
covered-input hashes and dependency rationale; rerun any affected checks if scope
changes. Necessary tests/evidence are in scope; browser UI checks are not claimed.

Worker report: `reports/1b-2b-2-worker.md`; evidence/snapshot:
`_local/project/evidence/writing-studio/1b-2b-2/`. Bind lead-15, current reproducible
inputs, workflow 4.1.0/inventory local-2. Worker owns implementation on manual relay,
not lead records or prior reports. Stop writes at handback for fresh independent
review. No agents, commits, push, release or automatic successor/repair dispatch.
Existing two-unsuccessful-round reassessment and three-identical-attempt stop apply.

## 1B.2b.2 repair-1: read boundaries and honest validation (lead-16)

Fresh `reports/1b-2b-2-review.md` R1-R3 and its real-fixture reproduction are the
repair baseline. Existing 70 focused tests pass but miss these cases. Preserve the
single strict history snapshot, read-only route, old-document compatibility, no-path
serialization intent and absence of save-service runtime imports. No new application
write capability or producer/render validation redesign is needed.

**R1 / WS-12 read occurrence.** Ownership validation must start at the configured
history root itself and cover every intervening component to revision/draft/legacy
sidecar files, not at a derived per-clip directory. Check root, revisions/words/
recipes/reframe intermediate directories, per-clip directories and final documents
as applicable. Missing ordinary files retain their declared missing behavior; linked
owned paths fail with OWNERSHIP_ESCAPE before file content is read. Never realpath
an escaped root and adopt its target as a new trusted root. Configured roots may
live beneath ordinary installation directories; this does not add a guarantee against
adversarial concurrent path swaps or forbid established external legacy media paths.
Use real Windows junction fixtures at each relevant boundary, with no target writes.

**R2 / WS-16 reader occurrence.** Inventory every consumed nested field and derived
capability/serialization output before editing. Validate into checked reader values
instead of broad type casts. An exact current pointer must have its required document
path and consistent identity/version/provenance; only a valid legacy version-zero
state may take the legacy branch. Validate draft as well as committed nested inputs:
segments/ranges, word elements and availability, recipe/keyframes, file/card records,
bookends, timing maps and final-composition fields this reader consumes. Non-finite,
wrong-type, invalid-range or missing required values cannot become exact timing,
widening or playback identity claims. Validate relationships needed by those claims;
do not silently filter malformed tracked arrays. Return stable state/document domain
errors before projection, never TypeError or generic500 for known malformed input.
Explicitly serialize validated fields only; arbitrary nested time-domain objects
must not escape. Keep unknown unconsumed fields on disk untouched and out of response.

This is a compatible read schema, not the current new-save validator. Accepted older
documents may lack final_composition or join_inputs. Their absence remains an honest
diagnostic, not an error or invented value. If optional structures are present, their
consumed fields must be valid. Use actual accepted old/new documents as controls,
including unavailable/empty transcript, no card/bookend and drafts. No retroactive
receipt version upgrade or file rewrite. Word/range checks must preserve legitimate
supported overlap/ordered-segment behavior rather than sort or normalize it away.

**R3 / WS-17.** Validate complete legacy word sidecars before classification. Invalid
elements, mixed valid/invalid lists or reversed/invalid timing mean malformed recovery
input, not a filtered usable transcript or supplied-empty. A valid explicit [] remains
supplied-empty. Preserve text/publishing metadata and other independently usable
recovery inputs, with bounded provenance and no widening inferred. Do not overwrite,
repair or remove bad sidecars. Report this distinction through the actual HTTP path.

Reassessment of recurrence: WS-12 and WS-16 already have accepted write-side fixes;
the new reader duplicated incomplete boundary/schema checks. Repair the entire read
boundary and consumed-field inventory with representative mutation cases, not only
the review examples. Internal helper layout is delegated; no broad refactor or import
of mutating save operations is required. Prior closures remain scoped and searchable.

Expected writes: reader/types, necessary route error mapping, reader/route regressions
and disposable HTTP verification. No Python, save service, legacy mutator, UI, Cleanup,
dependency, instruction inventory, lead-owned record or earlier report edits. Reproduce
with the unchanged review script before edits; rebuild before its after run because
it imports dist. Preserve reviewer files; supply a separate corrected assertion demo.
Record exact invocations against B2B2-1..5 before implementation. Run focused tests,
full Node, build/client types and actual isolated HTTP/restart proof fresh, including
ancestor junction and malformed-state/word cases and unchanged storage hashes.
Retain unaffected Python/media evidence only with covered-input/dependency rationale.
Use accepted `1b-2b-1-repair-1/check-saved-revision-run1.log` for retained save evidence;
server startup is not preview/export parity. Preserve all failed attempts/limitations.

Report: `reports/1b-2b-2-repair-1-worker.md`; evidence/snapshot:
`_local/project/evidence/writing-studio/1b-2b-2-repair-1/`, bound to lead-16 and inventory
4.1.0-local-2. This is repair round one for the reader occurrences. Stop writes at
handback for fresh independent follow-up. Existing two-unsuccessful-round reassessment
and three-identical-attempt circuit breaker remain; no agent/automatic repair dispatch,
commit, push, release or successor implementation.

## 1B.2b.2 repair-2: pre-read ownership and coherent claims (lead-17)

Repair-1 review confirms R3/WS-17; retain its correction. R1 and R2a/b/c in
`reports/1b-2b-2-repair-1-review.md` remain blocking. Reassessed premise: validating
sidecars does not protect the earlier history read, and finite types alone do not
validate consumed ranges or relationships. Test-fixture convenience is not evidence
of a supported writer state. Complete an input-to-read-order and claim-to-invariant
table in Worker evidence, derived from actual supported writer states and response
semantics, before editing. This refines existing requirements, not new product scope.

**R1 / WS-12.** Validate configured history root and every owned component through
clips.json before opening it, including a linked history file itself. Keep existing
revision/draft/legacy sidecar chain checks. All owned-path links, including legacy
sidecar links, produce OWNERSHIP_ESCAPE; do not swallow that code into an unreadable
sidecar. Ordinary missing history/sidecars keep documented semantics, and genuinely
unreadable regular sidecars remain distinguishable. External legacy media paths are
still supported; no adversarial concurrent-swap guarantee or ancestor checks above
the configured root are added. Prove linked legacy-only history cannot leak its
title/transcript before refusal, not just that tracked sidecars later reject.

**R2a / WS-16.** Validate consumed numeric ranges and structural relationships:
nonnegative durations/offsets/asset and overlap lengths, ordered bookend intervals,
valid crop coordinates/time bounds, supported branch/domain values, and present
optional structures. Derive bounds from the actual renderer/recipe contract; preserve
legitimate reverse source order, overlapping words, documented rounding and accepted
fallbacks. Relate raw/final/probe durations and offsets where the response claims they
describe the same saved media, without reprobes/hashes or new-save validation of old
documents. Unknown unconsumed fields need not be rejected; consumed fields must not
be coerced into authority. Keep old specifically optional fields optional.

**R2b.** The immutable document's main file must match the exact pointer output path
under consistent lexical path comparison; contradictory pointer/document media
identity fails with a stable state/document error. Existing by-ID routes serve the
entry summary: if that summary differs from the otherwise valid pointer/document,
retain usable context and a specific mismatch diagnostic, but set committed preview/
download capabilities false and make `media.serves` null. Do not label those URLs as
serving the described revision. No existing serving route is changed here. This is
identity consistency, not proof of on-disk bytes or cryptographic integrity.

**R2c.** A positive committed revision counter requires current. The accepted writer
initializes current null only at version zero with no output and commits current and
counter together; there is no clearing operation. Reject a missing current in that
positive-counter state. Preserve genuine version-zero/no-output and supported legacy
states. Assess draft invariants against real writer transitions too; do not add blanket
ordering/null rules merely to fit fixtures. Repair fixtures that invented unsupported
states for valid controls, using real saved draft/current records. Do not edit original
reviewer fixtures or scripts to make the reproduction pass.

Expected writes remain reader/types/tests, necessary route mapping and actual HTTP
check. No save-service/renderer, history protocol, UI, legacy mutator, Cleanup,
dependency, lead record or instruction changes. Reproduce latest review counterexamples
before edits using an explicitly identified copy/adaptation writing only new fixtures
under this repair. Preserve every original review file/directory in place; no wildcard
fixture moves or output overwrite/restore procedure. After rebuild, rerun against fresh
fixtures and supply corrected assertions, valid real-writer controls and old-document
compatibility. Record pre-edit evidence against its pre-edit snapshot, not final code.

Run focused reader/route tests, full Node, build/client types and isolated actual HTTP
restart/byte-preservation check fresh. Add root-before-read, range, playback identity,
summary-drift capability and positive-counter/null-current cases. Retain R3 regressions
and corrected predecessor media citations. Rerun affected checks if relevant inputs
change; otherwise reuse covered Python/media evidence with hashes and dependency
justification. Do not touch Isaac's Studio or user media.

Report `reports/1b-2b-2-repair-2-worker.md`; evidence/snapshot
`_local/project/evidence/writing-studio/1b-2b-2-repair-2/`, bound to lead-17 and local-2.
Fresh independent follow-up required. This is repair round two for R1/R2; if it returns
unsuccessfully on the same issue, stop for explicit reassessment before another relay.
No agent dispatch, automatic repair loop, commit, push, release or successor work.

## Repair-2 disposition and reassessment checkpoint (2026-09-21)

Fresh repair-2 review independently closes R1/WS-12 and R2c; R3/WS-17 stays closed.
R2a/R2b remain: a card output can end at content start, impossible hardcut/bookend
relationships pass through compensating arithmetic, sidecar domains and card
provenance can contradict their companion fields, and missing/empty entry summaries
still advertise reachable by-ID media. See `reports/1b-2b-2-repair-2-review.md`.

The two-unsuccessful-round threshold is reached for R2. No third repair is authorized
by the earlier direction. Lead owns the next technical design checkpoint, not Worker.
Reassessment identifies a flaw in the approach: inventories enumerate stored fields
and scalar checks but not every relationship behind a returned claim. Repeating a
larger example list would continue the same approach. This is not a request for media
attestation, hashing, wholesale current-save validation or migration of old documents.

Before any further handoff, settle a claim-based read contract against the actual
writer and serving routes. It must separately define: (1) revision-file identity
versus actual by-ID URL reachability for absent/invalid/equal/different summaries;
(2) the raw timeline, bookend branch/overlap/interval and final prefix/output equations
with their applicable recorded tolerance; (3) card provenance and optional-artifact
domains/placements as cross-record relationships, with explicit old-document profiles.
Each claim needs a valid real-writer control and a mutually contradictory but
individually well-typed fixture, not only missing-field/negative-number mutations.

Reconsider duplicated pure validation versus shared read-compatible relation helpers;
the constraint is no runtime access to mutating save operations, not a prohibition
on sharing pure contract code. Any helper extraction would need a newly bounded write
scope and affected writer regressions before authorization. Do not perform that
refactor under the exhausted repair-2 assignment. Preserve readable text/missing-media
behavior, old specifically optional fields, read-only operation and all accepted
ownership/protocol fixes. No product decision or approval waiver is proposed.

This checkpoint records the failed hypothesis and required redesign work, not an
implementation prompt, acceptance or reset of recurrence history. Fresh independent
follow-up remains mandatory after any later explicitly relayed correction.

## Reader R2 reassessment and bounded repair-3 (lead-18)

This direction succeeds the repair-2 hold: fresh design scrutiny and coordinating
disposition in `reports/1b-2b-2-reassessment-review.md` approve this bounded direction
for manual relay. It does not reset the two unsuccessful R2 follow-ups.
Baseline remains repair-2 manifest `01e88e25f56b208e85dfaf8877dfc6aa2653ffbd5209d1dc08a8392571c3e30f`
on HEAD fed8ed1, plus subsequent lead records and review evidence. Preserve the
separate pre-edit snapshot and all historical reports. Generic project references
remain applicable; no product decision is pending.

**Changed approach.** Validate an aggregate of pointer, document, recipe, raw timeline,
final composition and entry serving identity before projecting its consumed claims.
Use one pure read-contract boundary (an internal function or reader-only module),
returning validated data for projection; do not leave cross-record checks scattered
among response builders or validate one object and serialize an unchecked companion.
File inspection remains a separate read-only step. Current-save validation is not a
read profile: older saves must remain readable without today's new-save provenance.
Do not extract or change writer validation in this repair. This avoids risking
accepted saves while correcting the reader's distinct compatibility contract.

**Claim contract, not an example list.** Before edits, enumerate every consumed
claim in the existing response: its stored origins, compatibility profile,
cross-record invariants, exact comparison or tolerance source, failure behavior and
test. Include existing valid checks, not just latest findings; retain valid stored
values rather than silently correcting corrupt documents. Unknown unconsumed fields
need not be rejected. The following relationships are mandatory:

- Serving identity: pointer and immutable document main-file identity must agree.
  Separately classify the entry summary as absent, invalid/empty, equal or different
  under the existing lexical comparison. Only equal, usable media can advertise
  committed preview/download support. Missing/invalid/different summaries retain
  context with COMMITTED_MEDIA_SUMMARY_DRIFT and `media.serves:null`; do not change
  existing media routes. Keep file availability, supported served-file kind and
  summary identity distinct; never claim available URLs for missing/unusable media.
- Raw timing: ordered recipe intervals, receipt segments, requested/measured content,
  transcript provenance and returned word domains must describe the same content.
  Retain reverse source order and legitimate overlapping words. Validate domain
  meanings against the exact-v1 producer, not just string shape. All present bookend
  records describing the same join must agree. Hardcut branches have zero overlap.
  Intro starts at zero, its end is asset minus overlap and equals the raw content
  offset; its transition spans that end to the asset end. Outro starts at content
  end minus overlap, runs for its asset length, and ends at raw output duration.
  Content end uses offset plus measured content. Apply the writer's recorded join
  allowance (composition plus AV) and receipt rounding to their respective equations,
  not one large tolerance to every comparison. Present join inputs also constrain
  asset identity, fade clamp and branch eligibility; supported hardcut fallbacks
  stay valid. Absent historical join inputs cannot disable independent interval or
  hardcut-zero-overlap checks.
- Final composition: raw file/probe/timeline identity, final file/probe identity,
  content duration and offsets must agree across records. No-card final media is
  the raw media. With a card, the final file includes the entire raw media shifted
  by the measured card prefix; it cannot end at the content start. Use recorded
  producer stream summaries, card frame/time-base arithmetic and audio allowance
  to check the shift/end relationships, plus container/probe relationships with
  their actual save-time allowances. Do not assume container duration always equals
  video duration, requested content duration, or an exact decimal sum. Preserve
  accepted VFR, delayed video start, AAC padding and no-audio cases. Reject internal
  contradictions without claiming that stored metadata proves current media bytes.
- Card and artifacts: thumbnail provenance and final card presence, descriptor,
  image identity, measured interval and offsets must describe one applied card.
  Check present artifact placement against its file record and the writer's domain:
  main at zero in served time, raw at card offset in raw-output time, caption/crop
  artifacts at content offset in content time and containing no card, card image
  at zero through the card end. Presence/absence must agree too; a dangling placement
  cannot establish an artifact. Compare repeated image/file identities lexically
  and by stored bytes/hash, without hashing actual media. Validate all domain values
  returned by the response, including raw/final maps and artifact domains.

**Compatibility profiles.** Keep genuine untracked/version-zero recovery separate
from exact documents. Exact documents before final composition use raw output and
explicit absence diagnostics; newer documents with final composition validate that
structure as a whole. Missing `join_inputs` and pointer `groups` remain supported
historical absences. Neither missing arbitrary required fields nor null tolerances
create another historical profile. Confirm required exact-v1 tolerance provenance
against accepted saved documents/producer before implementing; if contrary historical
evidence exists, report it to the lead rather than inventing default precision or
silently skipping equations. Older files are never rewritten or run through current
new-save admission. Missing assets remain distinguishable from contradictory metadata.

**Scope and verification.** Expected writes: reader/model/route tests and necessary
reader/model code, optional pure reader-contract module and tests, and the disposable
editor-context HTTP check. No writer/model-for-save, Python, renderer/composer, media
route, UI, Cleanup, dependencies, instruction or lead-record writes. Add no runtime
import of save operations. Internal helper layout is delegated within this boundary.

Use accepted real saved documents and real writer-produced controls, preserving
original fixtures in place. Generate copied fixtures under the new evidence root.
Pair each claim with well-typed contradictory records, including compensating
mutations across multiple fields; assert stable refusals or the specified degraded
capability result. Preserve old-document, hardcut/crossfade, no-card/card, optional
artifact, no-audio/VFR and source-order controls. A field-count test alone cannot
prove coverage. Run the prior counterexamples against an explicitly bound pre-edit
snapshot and corrected assertions against the final build. Never overwrite or move
reviewer files/directories. Fresh focused tests, full Node, build/client types and
actual isolated HTTP restart/byte-preservation proof remain required under B2B2-1..5;
prove unavailable summaries and aggregate contradictions through HTTP too. Retain
Python/media evidence only by unchanged input hashes and dependency justification.

Report `reports/1b-2b-2-repair-3-worker.md`; evidence and snapshot under
`_local/project/evidence/writing-studio/1b-2b-2-repair-3/`, bound to lead-18,
workflow 4.1.0 and inventory local-2. One manual correction then fresh independent
follow-up and lead disposition. An unsuccessful same-class follow-up returns to
the lead; there is no automatic fourth repair or reset budget. Verification
delegation remains disabled. No agents, commit, push, release or successor work.

### Repair-3 disposition checkpoint (2026-09-21)

`reports/1b-2b-2-repair-3-review.md` independently confirms remaining R2a/R2b:
content words/text can contradict retained source words, historical served probe
duration can contradict raw duration, repeated bookend measurements can disagree,
and the recorded extension can advertise playback the resolved-file route refuses.
Independent186 focused tests pass, but these counterexamples block B2B2-1/3.
Retain prior corrections and WS-12/17/R2c closure. The disputed applied-card without
composition control is unsupported; all221 questioned alternate-domain artifacts
reference fake-render media, so no supported historical regression was established.

The aggregate boundary is appropriate but its coverage is incomplete. The45-row
table did not ensure every projected claim's dependencies were checked. No fourth
implementation relay follows this handback. Lead owns a further producer-to-reader
coverage audit and serving-predicate comparison before deciding another bounded
direction. No new product decision, compatibility waiver, attestation requirement,
recurrence reset or automatic repair loop is introduced.

## Verification-only reader contract proof (lead-19)

Isaac requested proceeding after repair-3 disposition. The lead's coverage audit
traced `projectDocument`, `projectBookend`, `buildTiming`, `buildTranscript`,
`buildMedia` and `buildCapabilities` to the writer and route. Merely moving checks
behind a pure function did not establish that all dependencies of its returned
claims were checked. The next checkpoint is executable expected behavior, reviewed
independently before application changes. This is not repair-4 and does not reset
the unsuccessful R2 follow-ups. Generic references and settled product choices stay.

### Settled expectation sources and coverage

| Claim family | Source of expected behavior and coverage needed |
|---|---|
| Editorial transcript | `clip-revisions.ts` wordsInIntervals/mapWordsToContent/contentText and admission at789–823; Python exact_render helpers are the independent producer. Full source count and selected source words are different facts. Map each touching word into each kept interval in supplied order, clipping and shifting with receipt rounding. Preserve overlapping words, reverse intervals, boundary-touch exclusions, unavailable and supplied-empty, word metadata, whitespace/text normalization and response truncation/count distinctions. Text and served words must describe the same untruncated content. |
| Historical raw media | Before composition, main file is raw output. Admission at1474 compares probe duration to raw duration within max(0.05, composition_seconds); absence of final composition does not remove this rule. Pair valid genuine old documents with duration/probe/identity contradictions. No migration, new-save join-input requirement or invented tolerance. |
| Bookends | Document assembly at1513–1548 copies receipt regions into doc.bookends. Compare shared consumed fields and presence across both records; transition equations derive from exact_render.bookend_region and writer648–750. Measured join output is a stage measurement: intro-with-outro need not equal final output. Last-stage measurement, subsequent join inputs and final raw output must agree within their actual producer allowances. Test intro only, outro only, both, supported hardcut and crossfade, old missing join inputs, and single-copy versus coherent paired contradictions. Do not use whole-object equality to reject unknown unconsumed fields. |
| Serving eligibility | Existing serveClipById uses entry summary, realpath, regular-file stat and resolved extension. Inspect the same resolved file for availability/kind; preserve recorded identity separately. Test both link directions (supported name to unsupported target and the reverse), broken links, ordinary files, missing/invalid/different summaries and tracked/untracked contexts. Owned path links remain refused; external legacy links remain supported. No path-swap guarantee or route change. |
| Remaining projections | Audit identity/state/draft, recipe-as-request, segment timing, card/final/artifacts, domains, precision, operations and diagnostic/capability outputs against existing coverage. Distinguish recorded requests from claims of effective output and from availability. Reuse valid tests with named cases; add an executable case for uncovered relationships instead of another prose-only row. Unconsumed metadata has no new admission requirement. |

These are existing requirements clarified from code, not new product guarantees.
Never turn an unknown relationship into a strict equality: document its source,
positive control and exact tolerance/normalization. If producer evidence conflicts
with the required behavior, return the discrepancy for lead disposition. Do not
silently weaken expected outcomes or change application code to make a control pass.

### Assignment boundaries and completion

Worker may add `scripts/verification/check-editor-read-contract.mjs` and necessary
new fixture/support files under `scripts/verification/fixtures/editor-read-contract/`.
Other writes are its own report and new evidence under the cycle root. No existing
application, tests, verification scripts, packages, instructions, lead records,
original reviewer fixtures or historical documents may be edited. No default test
glob/package-script changes. Runtime fixture creation is limited to isolated owned
directories; preserve synthetic original media and use a free port, never Studio3847.

Implement an isolated conformance runner with assertions for the intended reader
outcomes, not assertions that the broken implementation continues to accept defects.
It must report all case results and exit nonzero when a requirement fails. Keep
valid producer/historical controls separate from malformed-record trials. Use the
real Python pure producer helpers where useful, actual saved records and the real
HTTP serving behavior for linked-file cases; do not derive the oracle by calling
the reader validator being tested or copying its current predicates. Test helpers
may import accepted producers for fixture creation; this grants no production import.

Before running, map cases to B2B2-1..5 and record expected outcomes. Execute against
the frozen repair-3 source/build with hash binding; demonstrate the known failures
and any newly discovered missing relationship. Preserve every failed run and any
harness correction. Validate script syntax and positive controls; retain applicable
186/691/build/Python evidence by unchanged-input comparison instead of rerunning
unaffected suites. A failed application conformance run is expected at this stage,
and must remain reported as failed application verification, not a green result
because its failure was anticipated. Distinguish harness defects/tool failures.

Completion means a reproducible runner, mapped executable coverage for each consumed
claim (existing tests may supply adequate coverage), valid controls, concrete
counterexamples and a bound report. It does not mean application acceptance or a
promise that every malformed record is discoverable without media attestation.
Fresh independent review must assess the oracle, historical profiles, missing
coverage and results before the lead scopes further repair. No automatic transition
from writing tests to changing application code, even for an obvious one-line fix.

Report: `reports/1b-2b-2-contract-proof-worker.md`. Evidence:
`_local/project/evidence/writing-studio/1b-2b-2-contract-proof/`, with separate frozen
application identity and new verification-artifact snapshot. Bind lead-19/workflow
4.1.0/inventory local-2. No agents, verification delegation, commit, push, release,
successor implementation or automatic repair. Hand back and stop artifact writes.

## Contract-proof artifact correction (lead-20)

Fresh `reports/1b-2b-2-contract-proof-review.md` requests changes CP-1/2 to
verification completeness. This direction authorizes one manual artifact correction,
not application repair-4. The14 original application failures remain supported;
the reviewer adds the paired last-stage failure CP-3 and a passing20,001-word
truncation control. Preserve all prior reports/snapshots and attribution.

**CP-1 / WS-18: trustworthy coverage accounting.** A parent marker must not credit
unchecked descendant fields. Each credited leaf needs an actually executed assertion
with its expected-value source and check kind; a failed comparison may count as
checked but remains a failed case. A complete object/array comparison may credit its
checked descendants only when its independently established expectation and structure
were actually compared. New/unclassified fields must surface as gaps. Type/nonempty/
path-redaction checks must be identified as such, not described as independent semantic
equality. Add the missing capability-reason comparisons and inspect the tracked and
legacy ledgers for the same shortcut, including diagnostics/prose. Reused named tests
remain explicit mapped coverage, not blanket credit for a parent object.

Required uncovered claims must make the run nonzero and visibly incomplete even if
all product cases pass. Add small executable checks of the verifier itself: an
unasserted existing child, an added child under a marked parent, and a required gap
with otherwise passing case results cannot produce complete/passing verification.
Preserve all useful existing assertions; do not replace meaningful comparisons with
shape-only checks or remove fields from the ledger to manufacture completeness.

**CP-2: valid present artifacts.** Add positive caption-overlay and cropped-source
file/placement controls derived from accepted producer/writer records. A disposable
real save with `keep_caption_overlay:true` is an available route; if constructing
coherent records instead, justify them against accepted publication/assembly and
prove the positive control reads before asserting refusal cases. Real rendering is
not inherently necessary for metadata coherence, and no claim of byte attestation
is added. Assert each present artifact's file-derived bytes/presence, its own domain,
card-free flag and placement at final content offset. Pair with isolated wrong
domain, flag, offset and file/placement identity cases where both sides exist, so
failure cannot be credited solely to a dangling/missing record. Preserve valid absent
artifacts and existing controls. If a valid positive control fails, report an additional
application defect; do not repair the reader or falsify the control.

**Use supplemental evidence.** Reuse/adapt the fresh review's producer-derived
20,001-word control and coherent paired last-stage mutation. Preserve full-text,
exact served prefix, true count and truncation diagnostic assertions. Both bookend
copies must be mutated together for the stage-to-output case; comparing the copies
alone is insufficient. Integrate these as reproducible coverage or run an adapted
supplement from the new evidence root. Do not write into or rerun a script that
overwrites the reviewer's original evidence. The full-render requirement stated in
the original Worker report is corrected by the review, not by rewriting that report.

Other reviewed limits remain: retained crossfade/legacy/junction/draft coverage is
adequate within its named scope, selected response ledgers are not all possible
states, and current byte integrity is not attested. No unrelated re-verification or
broader feature work is required merely to change authorship of valid evidence.

**Writes and checks.** May edit the two lead-19 verification files and add necessary
support under `scripts/verification/fixtures/editor-read-contract/`, plus own new
report/evidence. This is the narrow exception to lead-19's original new-files-only
boundary. No existing application/test/other verification file, package, instruction,
lead record or original evidence edits. Application and reviewed build remain frozen.
Capture the pre-edit artifact identities; syntax-check changed scripts, run verifier
self-checks and the complete conformance runner plus any adapted supplement on the
configured runtime. Preserve expected failing application cases, actual exits,
positive controls, HTTP checks, fixture hashes and independent source identities.
No fixed pass/fail count is demanded: justified newly exposed defects remain failures.

Map CP-1 self-checks/coverage accounting to B2B2-5; CP-2 and supplemental relationships
to B2B2-1/3; unchanged-byte and source boundaries to B2B2-4. Existing B2B2-2 coverage
is retained by named cases/hashes. Artifact completeness and failed application
conformance stay separate. Fresh independent follow-up is required after handback.

Report `reports/1b-2b-2-contract-proof-repair-1-worker.md`; new evidence/snapshots
`_local/project/evidence/writing-studio/1b-2b-2-contract-proof-repair-1/`. Bind lead-20,
workflow4.1.0/local-2, frozen application and new artifact identities separately.
This is artifact correction round one, no reset of application recurrence history.
After two unsuccessful artifact follow-ups reassess; no automatic loop in either
lane. No agents, commit, push, release, successor or application fixes. Stop writes
at handback and return for review/disposition.

## Contract-proof oracle correction (lead-21)

Fresh repair-1 review closes CP-1/WS-18 and CP-2 on the submitted snapshot.
Coverage is adequate within its selected states; application verification still
fails. Historical run3 remains42 pass/16 fail. The supported interpretation is15
application counterexamples plus unsupported A-X5 expectation CPR-1/WS-19.

Optional `revision.document.artifacts` bytes are recorded document metadata;
`media.output` separately describes live file status. Do not add live optional-file
attestation or change application semantics to satisfy A-X5. Convert that case into
a recorded-metadata projection control: mutate the otherwise coherent positive
document's overlay byte count, require a successful read, and compare returned
overlay bytes to that mutated document field. Disk size may remain a separately
labelled observation. Preserve A-C1's genuine save/file agreement, A-X1..4 refusals,
all15 supported failures, truncation, required coverage and verifier self-checks.
Distinguish expected saved-record values from live observations in the check source.

Only `scripts/verification/check-editor-read-contract.mjs` and the Worker's new
report/evidence are writable. Preserve all earlier reports/results, fixtures and
reviewer files. No application, existing tests, oracle helper, build, dependencies,
instructions or lead-owned records may change. Use a successor report to correct
the16-product-failures conclusion; do not rewrite historical evidence. This is
artifact correction round2, not application repair4 or a reset of recurrence.

Verify freshness and capture before hashes. Run syntax and verifier self-checks,
then the final frozen runner once through the configured runtime on isolated
fixtures/ports. Map corrected projection to B2B2-1/3, preservation to B2B2-4 and
accounting to B2B2-5. Application exit remains nonzero while supported failures
persist; do not force counts or a green result. Preserve actual exits, coverage
results and full logs. Stop editing before final execution; any subsequent script
change invalidates affected run evidence. Unchanged application suites/build are
retained by hashes, not repeated. Verify application, fixture and artifact identities
before/after. Stop and report unexpected drift or scope needs rather than repairing
the application. One bounded correction; reassess before any further unsuccessful
relay on this issue.

Report `reports/1b-2b-2-contract-proof-repair-2-worker.md`; evidence root
`_local/project/evidence/writing-studio/1b-2b-2-contract-proof-repair-2/`.
Bind lead-21, workflow4.1.0/local-2 and application/artifact snapshots separately.
No agents, commit, push, release, Studio3847 or successor work. Stop writes at
handback; fresh independent follow-up and lead disposition remain required.

## Producer-derived reader repair (lead-22)

This is application repair4 after explicit reassessment, not a continuation of
the unsuccessful field-check loop. The intervening lead-19..21 work established
an independently accepted external conformance oracle:15 supported failures and43
positive/control passes on frozen repair-3. Keep that runner and its Python oracle
unchanged. Repair the aggregate reader against producer relationships, not case IDs
or fixture paths. No new schema, save-time restriction or media attestation is added.
One manual bounded repair then fresh independent review; any remaining same-class
failure returns to lead reassessment before another relay. Prior rounds remain recorded.

**Transcript (T-X1..6; B2B2-1).** Validate the full stored transcript before response
truncation. Derive selected source words from `doc.source_words` touching the ordered
recipe intervals, once per source-list item in supplied order. Derive content words
per interval in supplied interval order, clipping/offsetting as the accepted Python
helpers do, preserving word metadata and legal overlapping words. Compare count,
identity, mapped timing within existing receipt rounding, and content text using
producer strip/join semantics. Preserve unavailable versus supplied-empty, reverse
source order, boundary-touch exclusion, duplicate interval mappings, full source
count and the20,001-word/full-text control. Do not sort, filter malformed records,
clean editorial words as captions, or validate only the served20,000-word prefix.

**Historical raw media (H-X1/2/4; B2B2-1/3).** Without final_composition, the served
file is the raw render. Compare recorded probe duration to raw output duration using
the accepted save admission allowance `max(0.05, composition_seconds)`; compare
receipt output bytes to the main file record exactly. This checks stored claims,
not live file bytes. With composition, retain the distinct raw/final records and
existing checks; never compare card-inclusive duration to raw duration. Genuine
accepted older records remain valid without final_composition or join_inputs.

**Bookends (B-X1/2/3/6; B2B2-1).** Compare producer-defined fields shared by document
and timeline bookend copies, including presence, region, transition, branch, fade,
overlap, recorded measurement and optional join inputs. Unknown unconsumed metadata
must not trigger whole-object rejection. Derive transition endpoints from
`exact_render.bookend_region` and the recorded region/overlap, respecting receipt
rounding and existing join allowances. Bind a present measured output of the final
performed join (outro, otherwise intro) to raw output duration within the existing
join allowance. Preserve legitimate older absent/null optional measurements;
an intro followed by an outro is an intermediate
measurement, not the final output. Paired mutations must fail even when the two
copies agree. Preserve valid intro-only/outro-only/both/none, hard cuts, crossfades
and legitimate older missing optional structures. Do not infer missing join inputs
or require new-save fields retrospectively; do not widen tolerances to pass cases.

**Serving eligibility (S-X1/2; B2B2-3).** Keep aggregate validation pure. The service
must obtain the filesystem fact needed to classify the same resolved regular file
that existing by-ID preview/download routes serve. Feed facts into the aggregate or
combine them at the existing service boundary; do not let the pure module access
filesystem/process/save code. A legacy nominal.mp4 link to an .avi target is refused
for playback; the reverse can be available. Keep summary identity, physical file
availability and container eligibility separate. Do not resolve around owned-root
link refusal: configured history/owned documents/artifacts retain their existing
lstat-chain checks. Preserve absent/different summaries, stable missing/unreadable
states, text access, redaction and no false capability claims. No route behavior,
ownership policy or adversarial path-swap guarantee changes.

**Scope.** Expected writes: `src/services/clip-editor-read-contract.ts`,
`src/services/clip-editor-context.ts` and their two `.test.ts` files. Existing
`src/ui/editor-context-route.test.ts` may gain necessary HTTP/import-boundary
regressions. Small internal type adjustments in these modules are delegated;
public response schema remains unchanged. No accepted save service/renderer,
Python, web-server/production route, models schema, dependencies, UI, migration,
Cleanup, adoption or unrelated fixes. No verifier/oracle edits. If the frozen check
has a newly demonstrated unsupported expectation, preserve and report it; do not
alter it or the application just to force agreement. Evidence helpers may be added
only under this repair's new evidence root. Do not touch prior fixtures/evidence.

**Verification.** Map all outcomes to the existing B2B2 acceptance table. Before
editing, bind current source/build to the accepted repair-2 conformance run and
retain that exact baseline reproduction when all relevant hashes match. Do not
repeat the full pre-edit media run solely for authorship; relevant drift instead
requires an affected reproduction on new disposable fixtures before edits. Add focused regressions
for the producer relationships and valid compatibility neighbors, not a second
copy of the validator. Run focused reader/contract/route tests, full Node, build
and client types, then the unchanged complete conformance runner against the final
build. All supported cases and verifier self-checks must pass with complete selected
coverage and exit0; no fixed count substitutes for case preservation. Also run the
existing isolated editor-context HTTP/restart/byte-preservation proof against the
final build. Retain unaffected Python/bridge evidence only by input hashes and
dependency justification. No full media-suite reruns solely for authorship.

Preserve before/after actual exits and logs. Synthetic fixtures/free ports only,
never Studio3847 or user Library. Hash application inputs, accepted verifier and
original evidence, and bind final source/dist before execution; stop editing before
final checks. Later changes require affected checks again. Snapshot base/patch and
untracked source copies separately from evidence; exclude actively written capture
logs or finalize them before a separate capture. Report actual instruction versions.

Report `reports/1b-2b-2-repair-4-worker.md`; evidence root
`_local/project/evidence/writing-studio/1b-2b-2-repair-4/`. Bind lead-22,
workflow4.1.0/local-2. No agents, commit, push, release or successor work. Stop writes
at handback. Fresh independent application review and coordinating disposition
remain mandatory; acceptance of the verifier did not accept the application.

## 1B.2b.3 bounded assignment: tracked-clip write fence (lead-23)

Make every existing production writer respect revision tracking before any production
path can create a tracked clip. A history entry whose `revisions` value is present and
not null is tracked, as the accepted reader and `ensureTracked` already decide. Legacy
mutators must refuse a tracked clip rather than rewrite its immutable revision media or
drift the summary fields the save service owns. Untracked clips keep their current
behavior exactly, including the open legacy defects. This is the prerequisite named in
`Current technical constraints` for adapters and adoption; it adds no adoption, write
route, adapter, UI or migration.

**Entry fence.** On a tracked clip these refuse before any side effect (no media,
sidecar, thumbnail, history or ui-state write; no renderer, FFmpeg or provider call):
web `PATCH /api/clips/:id` carrying `caption_style` or `thumbnail_config` (the whole
request refuses; a title-only request still succeeds); `DELETE /api/clips/:id`; `POST
/api/clips/:id/thumbnail`, `/thumbnail/select`, `/thumbnail/render`, `/logo` (apply and
remove) and `/rerender`; Python `clips edit` with `--caption-style` or
`--thumbnail-config`, and `clips delete`; the MCP `clip_history` delete action. A
malformed non-null `revisions` value is refused the same way (fail-safe). Deleting a
tracked clip stays refused, unlinking nothing, until a successor defines revision-aware
deletion. Unchanged: listing, preview/download, editor context, `reopen`, `source`,
`reframe`, `cuts`, `davinci`, and the preview generators `GET thumbnail/options` and
`GET logo/previews`, which change no clip and write only outside the owned trees.

**Commit-time guarantee.** An early check alone is check-then-act. The shared writers
also refuse under the existing lock: TS `ClipsHistory.update` and `remove`, Python
`update_clip` and `delete_clip`. For a tracked entry they refuse, writing nothing, any
removal and any patch touching a revision-owned field: `revisions`, `id`, `created_at`,
`source_video`, `logo_backup_path` and every field the accepted commit projects in
`applyLegacySummary` (`output_path`, `duration`, `file_size_mb`, `start_second`,
`end_second`, `caption_style`, `crop_strategy`, `format`, `keep_segments`, `logo_path`,
`intro_path`, `outro_path`, `logo_position`, `transcript_slice`, `thumbnail_config`).
In TS every own patch key counts as a write, including one set to undefined; in Python
every non-None field does, matching `update_clip`. No legacy writer adds `revisions` to
an untracked entry either. TS and Python fence the same set; tests
prove they agree and fail if any field a revision commit writes is unfenced.
Metadata-only writes on tracked clips continue: title, generated titles, description,
tags, hashtags, metrics, cloud and YouTube link fields, and unknown fields.
`ClipsHistory.transaction` and Python `mutate_clips_history` remain the unfenced
protocol seams; the report audits every current caller and the fields it writes.

**Path fence.** None of the fenced operations, nor the path-based commands
`bake-thumbnail` and `swap-thumbnail`, may write, replace or delete a path inside the
configured revision export namespace `<export root>/writing-studio/` or sidecar tree
`<history>/revisions/`. Compare after resolving links and junctions, case-insensitively
on Windows; an unresolvable target other than a missing path fails closed. The
path-based commands refuse before any work. This covers an untracked or stale entry
pointing into those trees and commands with no entry context. Revision files left under a previously configured export root rely on the
entry fence only. Fence code may repeat the two directory names, as the reader does,
with a test tying them to the save service's exported constants; the service itself is
not edited.

**Errors and compatibility.** HTTP refusals answer 409 with `{ "error": <plain,
actionable message>, "code": "CLIP_REVISION_TRACKED" | "REVISION_PATH_PROTECTED" }`,
including refusals first detected by the Python locked check behind a CLI-backed route.
Bodies carry no filesystem path or raw exception, and new messages use no em dashes.
CLI refusals exit non-zero with the code in a stable message; MCP answers with refusal
text and deletes nothing; refusals are logged with clip ID, operation and code only.
Existing clients keep reading `error`. Local host/origin policy, the local-only route
and tool allowlists (policy refusals still come first), DEMO read-only answers and every
response for untracked clips stay unchanged. The reader and its capabilities
(`save_revision` and `adopt_for_revision_tracking` stay `WRITE_ROUTE_NOT_AVAILABLE`), the
save service, renderer, composer and Cleanup stay byte-identical, and no production
module imports the save service.

**Accepted residual.** A legacy media route that passed its early check before a clip
became tracked can still finish in-place changes to the legacy output and sidecars it
captured, then fail at the locked commit. Those files lie outside the owned trees, and
version zero claims no provenance. No production path tracks clips in this slice, so
the window cannot open before adoption exists; 1B.2b.5 must close it or explicitly
re-decide it first.

**Scope.** Expected writes: `src/services/clips-history.ts` (plus a focused fence helper
if clearer), `src/ui/web-server.ts` guards and error mapping, `src/server.ts` MCP delete
handling, `backend/services/clips_history.py`, `backend/cli.py` (`clips edit`/`delete`
mapping, `bake-thumbnail`, `swap-thumbnail`), focused tests and a new disposable check
`scripts/verification/check-revision-fence.mjs`. Do not build: adoption or any
production `ensureTracked`, a save or write route, legacy adapters through the revision
protocol, reader or capability changes, UI or client changes, Cleanup, renderer,
composer, save-service or Python rendering changes, dependency, policy or allowlist
changes, WS-03/04/05/06/09 repairs for untracked clips, or incidental refactors. Report
a demonstrated prerequisite conflict instead of widening scope. Internal layout, helper
names, test seams and how TS and Python share the fenced field list are delegated.

| Prerequisite | How to verify | Needed by | If missing |
|---|---|---|---|
| Configured Node, Python, FFmpeg and Remotion bundle cache | `docs/local-setup.md`; the precedent check's preflight | Revision fixtures, suites, bridges | Affected rows `incomplete`; no substitute runtime |
| Current build matches `baseline-1b2b3.json` ignored inputs | Hash the listed `dist/` files before edits | Pre-change capture (B2B3-3) | Rebuild from the bound tree first and record it |
| Junction creation on the fixture volume | Create one inside the fixture tree | B2B3-4 | Junction rows `incomplete` with the tool error |
| Free loopback port | Bind test before server start | HTTP checks | Choose another free port; never 3847 |

**Verification.** Map outcomes to B2B3-1..5. Before application edits, bind the tree to
`baseline-1b2b3.json` (zero unexplained drift, including the current build), record
pending receipt rows with exact commands and expected results, and capture the untracked
controls' observable effects on the pre-change build with the new check. Expected values
come from the legacy route contracts and fixture state, never from the new code's
output. Use only disposable storage: isolated home/data/export trees, a verified free
loopback port (never Studio 3847 or Isaac's Library), the built `dist` server through the
configured runtime under the supported local profile, and the real Python CLI.
Fixtures: version zero (`ensureTracked` only), exact no-card and opening-card revisions
committed through the accepted bridges (precedent `check-editor-context.mjs`), a
malformed `revisions` value, untracked controls with output, sidecars and thumbnails, an
untracked entry pointing into the namespace, and a junction alias into it. Hash every
stored history, sidecar, revision, thumbnail and media byte before and after each
refusal (logs and ephemeral lock activity excluded, as in the reader check). Exercise
policy-blocked routes and MCP delete through focused route or handler tests with the
local policy off. Run focused Node and Python suites, full Node, full Python, build,
client types, `py_compile` of changed Python modules and the new check. For untracked
controls compare status, body shape, history changes, file presence and probe summary
with the pre-change capture; re-encoded media need not be byte-identical. Retain
accepted reader, revision, composer and bridge evidence only by unchanged input hashes
with dependency justification. No provider calls: stop before provider use or supply
fixed text. No browser proof is claimed.

Reports `reports/1b-2b-3-implementation.md` and `reports/1b-2b-3-self-audit.md` use the
5.0.0 templates, bound to lead-23, workflow 5.0.0 and
`docs/workflow/inventories/5.0.0-local-1.md`; evidence and snapshot (base, tracked patch,
untracked copies, manifest) go under `_local/project/evidence/writing-studio/1b-2b-3/`.
Implementation completion: B2B3-1..4 pass on the final snapshot, both reports are
written and writes stop; B2B3-5 review stays separate. Work in this checkout (its 5.0.0
files are uncommitted, C-7). No commit, push, release, agent dispatch or verification
delegation. Leave task-state records, prior reports and prior evidence untouched. A
fresh non-author review `reports/1b-2b-3-review.md` and the task-state disposition
precede acceptance; two unsuccessful rounds on one issue trigger reassessment, and three
identical failed attempts mean STUCK.

## 1B.2b.3 correction-1: DR-1 fixtures and path-fence diagnostics (lead-24)

Task-state disposition of the 2026-09-22 handback (`reports/1b-2b-3-implementation.md`,
`reports/1b-2b-3-self-audit.md`, snapshot `b88984be...`). B2B3-1..4 passed there; full
Node failed two accepted tests only at fixture steps (DR-1), and the self-audit is
BLOCKED on that alone. One bounded correction by the same implementation writer comes
before the single fresh review, so the review sees the final snapshot and no follow-up
round is needed. Lead-23 requirements stand except as amended here.

**DR-1, approved.** Make `src/services/clip-revisions.test.ts` byte-identical to
`_local/project/evidence/writing-studio/1b-2b-3/decision/clip-revisions.test.proposed.ts`
(sha256 `281163f7...`, Git blob `b351951e...`; patch `6ad20863...`). Both tests keep every
assertion and reach the save call with the same entry state: one removes the tracked
entry through the unfenced `transaction` seam instead of the fenced legacy `remove`; the
other sets `thumbnail_config` before `ensureTracked`, which does not touch that field.
Updating a test that the intended fence broke is necessary test work, not a weakened
check. In B2B3-5 "sources" means non-test modules; this file's retained 1B.2a and 1B.2b.1
evidence now rests on the full Node rerun rather than an unchanged hash.

**F-2, corrected.** When a target exists but cannot be resolved (a dangling link, or a
denied or failed lookup), the refusal keeps code `REVISION_PATH_PROTECTED`, but its
message says the file could not be confirmed to be outside the Writing Studio revision
folders, that nothing changed, and that the file, drive or link should be checked; the
owned-tree message stays for resolved targets. This applies to HTTP bodies, CLI output
and MCP text, in TS and Python. Refusal log lines may add a path-free reason (`owned` or
`unresolvable`, plus the error code name) and still carry no path or content.
Fail-closed stays: an untracked clip whose target cannot be resolved now gets this
refusal, deletion included, until the path resolves or is missing. That is the only
exception to lead-23's untracked-unchanged rule; 1B.2b.5 revisits it with
revision-aware deletion.

**Creation gap closed.** `ClipsHistory.record` refuses a caller-supplied `revisions`
field and writes nothing, so only the save service creates revision state (the
self-audit's blind spot). Current callers pass none, and accepted verifiers plant
tracked state by writing `clips.json` directly.

**Records and checks.** The lead-23 reports stay as the initial cycle's frozen record.
Write successors `reports/1b-2b-3-correction-1-implementation.md` and
`reports/1b-2b-3-correction-1-self-audit.md`, bound to lead-24, workflow 5.0.0 and
`docs/workflow/inventories/5.0.0-local-1.md`; link the lead-23 reports for unaffected
rows and give a proportionate ten-lens self-audit of the final snapshot. Before edits,
confirm the tree still matches `b88984be...` and record pending rows. Rerun what the
correction affects: focused fence, route, MCP, history and save-service Node suites; the
Python fence tests; full Node (expect exit 0); full Python; build; client types;
`py_compile` of changed Python modules; the protected-sources check (expect only the DR-1
test file changed among protected inputs); and `check-revision-fence.mjs` in final mode
against the existing pre-change capture, with the unresolvable rows asserting the new
wording and log reason. Recapture the snapshot. Expected writes are the fence modules,
`ClipsHistory.record`, their message, log and CLI mapping, their tests, the check script
and the DR-1 test file. Lead-23 storage, port, provider, commit, dispatch and do-not-build
limits apply, and writes stop at handback.

## 1B.2b.4a bounded assignment: finishing-action adapters (lead-26)

Partition refresh. The accepted fence refuses every legacy media action on a tracked
clip. Before adoption lets users reach tracked clips, those actions must work through the
save protocol instead. This slice adapts the finishing actions (caption style, logo and
opening card), which keep the committed timing, and closes WS-23. `rerender` trim and
reframe move to **1B.2b.4b**: mapping the single-range editor onto ordered, possibly
noncontiguous segments, source-absolute keyframes onto content time, and widening onto
retained source words is a separate risk with its own review. Until then `rerender` on a
tracked clip stays refused.

**Base.** An adapter acts only when the fence-checked entry is tracked and its current
pointer is an exact revision whose document the save service loads and whose recipe
validates. Version zero (`legacy-unversioned`), no current revision, a malformed
`revisions` value, or an unreadable or invalid document answer 409
`REVISION_BASE_UNAVAILABLE` and write nothing. Their effective cuts were never recorded,
and rebuilding from requested inputs would silently change content (`Current technical
constraints`). A non-null `draft` pointer answers 409 `REVISION_BUSY`, so no legacy action
races an editor draft; 1B.2b.5 settles that interplay with its draft routes.

**Derivation.** The next recipe is the current document's recipe with only the requested
change, and `source_words` is the document's retained source words (null stays null).
An applied opening card carries forward unless the action replaces it, using the
committed owned copy of the card image and its recorded SHA-256, so the original upload
need not survive. Expected state comes from the fence-checked entry; each request gets a
new server-generated operation ID. When the derived recipe and card equal the current
revision's, nothing renders and the request succeeds (its title or thumbnail metadata
still apply), which also makes a retried legacy request harmless.

**Actions on an exact tracked clip.**
- `PATCH /api/clips/:id` with an own `caption_style` key: a style `clips edit` accepts
  sets the recipe style; any other value, null included, answers 400
  `INVALID_CAPTION_STYLE` and writes nothing, title included. A title in the same request
  is written only after the style outcome (unchanged or committed). A `thumbnail_config`
  key keeps its 1B.2b.3 refusal, 409 `CLIP_REVISION_TRACKED`: a caller-chosen preview
  path has no safe revision meaning. Title-only PATCH is unchanged.
- `POST /logo`: apply sets the recipe `logo_path` (the resolved asset) and
  `logo_position` (legacy default and allowed positions kept); remove drops `logo_path`,
  and removing with no logo answers 400 with an `error` message. The renderer draws the
  logo and the opening card stays logo-free, as the constraints require. `backup_path`
  and `restored_from` answer null.
- `POST /thumbnail`, `/thumbnail/select` and `/thumbnail/render`: generate or pick the
  image as today (writes stay under `<export root>/thumbnails/<id>/`, still path-fenced),
  then commit with that image as the opening-card descriptor instead of baking.
- `GET /logo/previews` on a tracked clip never reads `logo_backup_path`; it previews from
  the current served file or a current-revision artifact, writing only under
  `logo-previews/`.

Each success answers after the commit with the route's existing success keys and
`ok: true`. Clients read only `error`, so no client change is needed.

**Commit projection.** Every revision commit also removes `logo_backup_path` and sets
`thumbnail_config.preview_path` to a file whose bytes equal the committed card image (the
owned copy is preferred), removing it when the revision has no card; `card_seconds` keeps
its current rule. Thumbnail metadata the legacy action would store (`variations`,
`line1`, `line2` and other keys not projected) lands in the same locked commit
transaction. The mechanism is delegated, but a request without metadata keeps its
pre-slice request identity and a replay rewrites nothing. Old documents stay readable and
replay unchanged. Legacy `.pre-logo.mp4` files and earlier thumbnails stay on disk,
unreferenced by tracked clips and undeleted.

**Errors and compatibility.** New codes: 409 `REVISION_BASE_UNAVAILABLE`; 409
`REVISION_BUSY` (pending operation, draft present, or expected state changed meanwhile);
409 `REVISION_INPUT_MISSING` (source, logo or card image missing or changed); 500
`REVISION_SAVE_FAILED` (render, composition, probe or commit failed while the previous
revision keeps serving); 400 `INVALID_CAPTION_STYLE`. Bodies are `{ "error", "code" }`
with a plain message, no path or raw exception, and no em dash; logs carry clip,
operation, code and operation ID only. The accepted fence otherwise stands: untracked
clips answer as in the 1B.2b.3 pre-change capture, open legacy defects included;
tracked `DELETE`, `rerender` and `thumbnail_config` PATCH still refuse; the Python CLI
and MCP keep refusing tracked media edits and deletion, because the CLI has no
render-and-commit path and a metadata-only style change would drift the summary; the
locked field fence and the `record()` refusal are unchanged. Refusal messages must stay
accurate for what is still refused, with TS and Python agreeing. Policy order, DEMO
answers, the reader and its capabilities (`save_revision` and
`adopt_for_revision_tracking` stay `WRITE_ROUTE_NOT_AVAILABLE`), exact rendering, the
composer and Cleanup are unchanged. No production path calls `ensureTracked`; only the
adapter path may import the save service.

**WS-23.** In `generate_clip`'s legacy (non-exact) branch, check every sink it will write
before the first write: the reserved title-derived file, whatever suffix it gets, the
kept caption-overlay and source copies, and the autofix temporary. Use the Python path
verdict after resolving links. An owned or unresolvable target refuses with
`REVISION_PATH_PROTECTED` and writes nothing; `rerender` maps it to 409 with the fence
body, and other `create_clip` callers get the refusal as their error. Exact mode is
unchanged. U-1 (hard links, post-check swaps) stays the accepted static limit.

**Scope.** Expected writes: a focused adapter module (for example
`src/services/clip-legacy-adapters.ts`), dispatch in `src/ui/clip-write-fence-route.ts`,
the adapted handlers and error mapping in `src/ui/web-server.ts`, the projection and
metadata in `src/services/clip-revisions.ts` and `src/models/clip-revisions.ts`, fence
messages in `src/services/clip-write-fence.ts` and `backend/services/clips_history.py`
if wording changes, the legacy sinks in `backend/services/clip_generator.py`, focused
tests, intended expectation updates in `check-revision-fence.mjs` and
`check-saved-revision.mjs`, and a new disposable check
`scripts/verification/check-legacy-adapters.mjs`. O-1 (the unreachable DEMO arm in the
logo handler) may go while that handler is edited; if the guard-miss harness churns
(O-2), extract the handlers into testable functions. Do not build: the `rerender`
adapter, adoption or production tracking, draft, save, operation or delete routes,
revision-aware deletion, reader or capability changes, client or UI changes, CLI or MCP
adapters, Cleanup, composer or exact-render changes, dependency, policy or allowlist
changes, WS-03/04/05/06/09 repairs for untracked clips, or incidental refactors. Report a
demonstrated prerequisite conflict instead of widening scope. Internal layout, names and
test seams are delegated.

| Prerequisite | How to verify | Needed by | If missing |
|---|---|---|---|
| Configured Node, Python, FFmpeg and Remotion bundle cache | `docs/local-setup.md`; precedent checks' preflight | Renders, suites, bridges | Affected rows `incomplete`; no substitute runtime |
| Tree and build match `baseline-1b2b4a.json` | `python _local/project/evidence/writing-studio/1b-2b-4a-plan/freshness.py --check` before edits (writes nothing) | Pre-change capture, WS-23 reproduction | Explain drift or rebuild from the bound tree first |
| Exact no-card and opening-card fixtures | Commit through the accepted bridges (precedent `check-editor-context.mjs`) | B2B4A-1..3 | Rows `incomplete` with the bridge error |
| Link and junction creation on the fixture volume | Create one inside the fixture tree | B2B4A-4 | Link rows `incomplete` with the tool error |
| Free loopback port | Bind test before server start | HTTP checks | Choose another; never 3847 |

**Verification.** Map outcomes to B2B4A-1..6 and record pending receipt rows before
edits. Reproduce WS-23 on the unchanged build first (a planted file symlink and a
junction at the derived name, as review probe r2). Expected values come from recipes,
fixture media and the legacy contracts, never from the new code's output. Use disposable
storage only: isolated home, data and export trees, a verified free loopback port (never
Studio 3847 or Isaac's Library), the built `dist` server under the supported local
profile, and the real Python bridge, FFmpeg and Remotion. Fixtures: exact no-card and
opening-card revisions, version zero, malformed `revisions`, a present draft, a pending
operation, missing source, logo and card image, and untracked controls. Decode rendered
output for the logo region present or absent, the card once with the chosen image hash
and no logo on it, and unchanged timing (receipt segments and duration within accepted
tolerances); check caption style through the committed recipe and renderer receipt. Hash
every prior group, sidecar, history and legacy file before and after each row; failure
rows prove the previous revision still serves. Run focused Node and Python, full Node
(exit 0), full Python, build, client types, `py_compile` of changed Python modules,
`check-saved-revision.mjs`, `check-exact-render.mjs`, `check-revision-fence.mjs`, the new
check, and a protected-sources check. No provider calls: supply fixed thumbnail text or
stop before provider use. No browser proof is claimed.

Reports `reports/1b-2b-4a-implementation.md` and `reports/1b-2b-4a-self-audit.md` use the
5.0.0 templates, bound to lead-26, workflow 5.0.0 and
`docs/workflow/inventories/5.0.0-local-1.md`; evidence and snapshot (base, tracked patch,
untracked copies, manifest) go under `_local/project/evidence/writing-studio/1b-2b-4a/`.
Implementation completion: B2B4A-1..5 pass on the final snapshot, both reports are
written and writes stop; B2B4A-6 review stays separate. Work in this checkout (C-7). No
commit, push, release, agent dispatch or verification delegation. Leave task-state
records, prior reports and prior evidence untouched. A fresh non-author review
`reports/1b-2b-4a-review.md` and the task-state disposition precede acceptance; two
unsuccessful rounds on one issue trigger reassessment, and three identical failed
attempts mean STUCK.

**Carried, unchanged by 4a.** To 1B.2b.5: the accepted pre-adoption residual; the
`record()` to `persistClipRecipe` batch observation; deletion of untracked clips with
unresolvable targets (lead-24); revision-aware deletion; recovery of a stale pending
operation, which adapters answer with `REVISION_BUSY` until an operation route exists;
draft and legacy-action interplay; and what adoption offers for version zero, which
adapters refuse. To 1B.3: the Library logo-remove button keys on `logo_backup_path`,
which tracked clips no longer carry, and a tracked style change now renders during the
PATCH. U-1 stays the accepted static-boundary limit.

## 1B.2b.4a repair-1: audio-only derived sinks (lead-27)

The fresh review (`reports/1b-2b-4a-review.md`, F-1) reproduced WS-23 on the audio-only
road: `generate_clip` hands a non-exact audio-only source to `render_audiogram` before
the sink check, and that renderer creates its output folder and writes
`<output folder>/<safe title>.mp4` unchecked. The lead-26 WS-23 paragraph listed the
video road's sinks only. Correction: the requirement covers **every** sink the legacy
(non-exact) road of `generate_clip` writes, including every early return that hands off
to another renderer. The other lead-26 requirements are unchanged.

**Repair.** Before the first write on the audio-only road, including folder creation
and the render, check the output folder and the final file with the Python path verdict
after resolving links. Also check any other sink that road writes outside a private
temporary folder. The path that is checked must be the same computed value the renderer
writes: one derivation, not a copy of the naming rule. `backend/services/audiogram.py`
may change only for that purpose. Refusal, rerender mapping (409 with the fence body),
error text for other callers, the case-variant and missing-root behavior and the
path-free diagnostics all match the video road. Exact mode is unchanged. Record a sink
inventory of every return path on the legacy road, so that no other early hand-off
remains unchecked.

**Evidence.** Reproduce F-1 on the unchanged snapshot first. Audio-only fixtures: a
planted file symlink, a junction, a dangling link at the derived name, a case-variant
folder, a missing namespace root, and an outside-tree control. Drive them through a
direct `create_clip`, through `batch_clips` where the audio-only road applies, and
through `rerender` over HTTP for an untracked audio-only clip. Show owned bytes
unchanged. Add them to Python `LegacySinks` and `check-legacy-adapters.mjs`. Refresh the
affected receipts on a new snapshot: focused and full Node (`--maxWorkers=1` allowed,
stated), full Python, `py_compile`, build and client types if TS changes,
`check-legacy-adapters.mjs`, `check-exact-render.mjs`, `check-revision-fence.mjs` and
protected sources, with the `clip_generator.py` rule widened to the audio-only sink
check and `audiogram.py` limited to it. Do not build F-2 (WS-25), WS-26, A-2, O-A or
O-B, and change nothing outside the WS-23 sinks. Reports:
`reports/1b-2b-4a-repair-1-implementation.md` and `-self-audit.md`, bound to lead-27,
with evidence under `_local/project/evidence/writing-studio/1b-2b-4a/repair-1/`.

**Dispositions recorded at lead-27.** D-1 and D-2 accepted. D-2 is the intended update
of the B2B2-4 module-graph test, which lead-26 should have listed. Deferred to 1B.2b.5:
F-2 (WS-25), the lock `EPERM` defect (WS-26, before adoption), A-2, O-A and O-B. A-3 is
deferred to 1B.3.

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
| B2B1-1 (AC-3/7 subset) | Draft card choice persists; committed/replaced/removed card appears once without changing prior media | Real save/reopen and repeated card/content/logo operations; decoded card/content/logo markers, image identity checks and prior-file hashes; no render for draft or replay |
| B2B1-2 (AC-9 subset) | Raw and final timing, words, optional artifacts and probes agree | Producer-backed tests and real FFmpeg bridge: reversed segments, intro/outro, caption/logo, all aspect formats, non-30fps and no-audio fixtures; decode frames/tones across card boundary, check silence/offset and reject contradictory receipts; document frame/sample tolerances |
| B2B1-3 (AC-3 subset) | Failures, stale work and crashes cannot replace current media or lose ownership accounting | Deterministic faults at image capture, group/staging creation, composition, probe, rename, manifest and history commit; real process interruption before/after commit; late cancellation and recreation; prior outputs byte-identical, residuals accurate, durable replay even with missing image/source |
| B2B1-4 (AC-10/11 subset) | Old documents/cardless retries and legacy callers remain compatible; only owned storage is written | Old accepted-document read/replay, unchanged no-card hash, malformed descriptor and linked root/intermediate/artifact checks, Cleanup scan of all new dependency groups, production-import audit; no source writes, public adoption or new deletion candidates |
| B2B1-5 (AC-12 subset) | Required evidence and independent review cover the final slice | Focused revision/composer suites, full Node/Python, build/client types/affected compile, both real bridges and relevant parity; bound patch plus untracked copies/input hashes and receipts; fresh non-author review followed by lead disposition |
| B2B2-1 (AC-2/9 subset) | GET returns coherent committed/draft identities and honest raw/final timing across restart | Real saved card/no-card fixtures, old accepted documents, pending/cancelled status and controlled pointer/draft advancement during read; lead-18 aggregate claim matrix plus lead-19 executable producer-derived transcript, historical probe and duplicate/stage bookend controls and contradictions; response never mixes versions; no readiness/save claim or render |
| B2B2-2 (AC-6/9 subset) | Legacy recovery never fabricates effective cuts or full transcript coverage | Legacy matrix: words missing/empty/corrupt, requested noncontiguous segments, conflicting sidecars, old thumbnail and missing source; explicit provenance/reasons; no unrelated cache fallback |
| B2B2-3 (AC-10/11 subset) | Missing media leaves text usable; invalid/cross-clip/path-escape state fails safely | Corrupt/invalid-encoding history and documents, wrong identity/version, traversal and real junctions, deleted outputs/sources/optional files; lead-18 summary matrix and lead-19 resolved-file kind/link matrix prove by-ID capability honesty through HTTP; stable errors, no arbitrary reads, host/origin refusals |
| B2B2-4 (AC-3/11 subset) | Reads preserve existing bytes and caller behavior, with no adoption | Before/after history/sidecar/media hashes for success/failure/restart; revision field not created, unknown fields untouched; existing preview/download byte match for stable fixtures, old listing and mutator regressions; no new write API/import of save operations |
| B2B2-5 (AC-12 subset) | Bound verification and fresh review cover the HTTP behavior | Focused service/route/policy, full Node, build/client types and disposable actual server proof; retained Python/media evidence justified by unchanged inputs; lead-20 verifier self-checks, accurate assertion accounting and fatal required coverage gaps; fresh independent review then lead disposition |
| B2B3-1 (AC-3/11 subset) | Each fenced operation refuses a tracked clip (version zero, exact no-card, opening-card, malformed state) before any side effect, with a stable code | Real HTTP against the built server in isolated storage for every fenced route the local profile serves, the real Python CLI for `clips edit` and `clips delete`, and focused route or handler tests for policy-blocked routes and MCP delete; stored bytes identical before and after; HTTP 409 with `CLIP_REVISION_TRACKED`, CLI non-zero exit naming it, MCP refusal text; title-only PATCH and `clips edit --title` still succeed |
| B2B3-2 (AC-3 subset) | Once a clip is tracked, no legacy writer removes it or changes a revision-owned field, even after its early check passed | TS `update`/`remove` and Python `update_clip`/`delete_clip` refusal tests; a real second process (CLI) contending with a TS transaction that tracks the entry; a route-level barrier where tracking lands between the early check and the commit, answering 409 with revision-owned fields and `revisions` unchanged; a test that fails if any field a revision commit writes is unfenced, and TS/Python set agreement; lead-24: `ClipsHistory.record` refuses a caller-supplied `revisions` and writes nothing |
| B2B3-3 (AC-11 subset) | Untracked clips and metadata-only edits behave as before; unknown fields survive | Pre-change capture versus final build on the same disposable untracked controls: equal status, body shape, history changes, file presence and probe summary; title, generated-content, metrics, cloud and YouTube-link writes succeed on tracked clips without touching revision-owned fields; existing clips-history, cross-process, cloud, server-policy, CLI, history, mutation-lock and YouTube suites pass; audit of unfenced seam callers |
| B2B3-4 (AC-10/11 subset) | No fenced operation or path-based command writes, replaces or deletes inside the revision namespace or sidecar tree | Untracked entry pointing into the namespace through logo, thumbnail, rerender and delete; `bake-thumbnail` and `swap-thumbnail` on a namespace file, a junction alias to it and a case variant; missing namespace root; stored bytes unchanged; `REVISION_PATH_PROTECTED` through HTTP 409 or the CLI; outside-tree control proceeds; lead-24: an existing but unresolvable target (dangling junction) refuses with the could-not-confirm message and an `unresolvable` log reason, while resolved owned targets keep the owned message |
| B2B3-5 (AC-12 subset) | Bound evidence and fresh review cover the fence | Focused Node and Python, full Node and Python, build, client types, `py_compile` and the new disposable check on the final snapshot; reader, save-service, renderer, composer and Cleanup sources byte-identical to their `baseline-1b2b3.json` or accepted repair-4 manifest hashes; retained bridge evidence justified by unchanged inputs; implementation report and self-audit, then fresh non-author review and task-state disposition; lead-24: "sources" excludes tests, the DR-1 test file equals the approved proposal, full Node exits 0, and correction-1 reports cover the final snapshot |
| B2B4A-1 (AC-3/7 subset) | On an exact tracked clip, caption-style PATCH, logo apply and remove, and thumbnail generate, select and render each commit one new revision through the save service; the served file shows the change while timing, framing, assets and exactly one card (the chosen or the carried one) match the recipe; prior files are untouched; equal requests render nothing | Real HTTP against the built server in isolated storage with the real bridge, FFmpeg and Remotion on no-card and opening-card exact fixtures: recipe diff equals only the requested change; decoded logo region present or absent; card once with the chosen image hash and no logo; receipt segments and duration within accepted tolerances; renderer receipt names the new style; prior group, sidecar and legacy file hashes unchanged; no-op requests leave history and groups byte-identical and start no render; existing success keys with `ok: true` |
| B2B4A-2 (AC-3 subset) | Unavailable bases, conflicts, missing inputs and failures leave the current revision, summary and files unchanged, with a stable code | Version zero, no current revision, malformed `revisions`, unreadable and invalid documents (`REVISION_BASE_UNAVAILABLE`); draft present, pending operation, and expected state changed between the guard and the pending record (`REVISION_BUSY`); missing or changed source, logo and card image (`REVISION_INPUT_MISSING`); injected render, compose, probe and commit failures (`REVISION_SAVE_FAILED`, previous output still served); invalid style including null (`INVALID_CAPTION_STYLE`, title unchanged); byte hashes before and after; bodies and logs path-free |
| B2B4A-3 (AC-7/10 subset) | No tracked clip keeps a stale legacy media pointer or restores an old file | Service and route tests plus the real check: after each commit `logo_backup_path` is absent, `thumbnail_config.preview_path` bytes equal the committed card image (absent without a card) and serve through `/api/image`, `card_seconds` follows its current rule, thumbnail metadata lands in the same transaction; request identity unchanged without metadata; replays rewrite nothing; old documents read and replay unchanged; logo remove never copies a backup; tracked logo previews never read `logo_backup_path` and write only under `logo-previews/`; legacy `.pre-logo.mp4` files and thumbnails byte-identical |
| B2B4A-4 (AC-10/11 subset; WS-23) | Legacy rendering writes nothing into the revision trees through a derived sink | WS-23 reproduced first on the unchanged build; a planted file symlink, junction and dangling link at the title-derived name and at a suffixed name refuse with `REVISION_PATH_PROTECTED` through `rerender` 409 and a direct `create_clip` call, owned bytes unchanged; case variant and missing root; an outside-tree control renders as before; exact mode unaffected (`check-exact-render.mjs`). Lead-27: the same outcomes on the audio-only (`render_audiogram`) road, including a case-variant folder, a missing root, a `rerender` HTTP row and a sink inventory of every legacy return path |
| B2B4A-5 (AC-11 subset) | Untracked clips and the remaining tracked refusals keep their contracts | `check-revision-fence.mjs` final mode: untracked controls equal the 1B.2b.3 pre-change capture; tracked `DELETE`, `rerender`, `thumbnail_config` PATCH, CLI `clips edit` media options, `clips delete` and MCP delete still refuse with unchanged codes and accurate messages; title-only PATCH, metadata writes and unknown fields unchanged; fence, cross-process, clips-history, server-policy, CLI, history and editor-context suites pass; audit: no production `ensureTracked` caller, save service imported only on the adapter path, reader capabilities unchanged |
| B2B4A-6 (AC-12 subset) | Bound evidence and fresh review cover the slice | Focused and full Node (exit 0) and Python, build, client types, `py_compile`, `check-saved-revision.mjs`, `check-exact-render.mjs`, `check-revision-fence.mjs` and the new `check-legacy-adapters.mjs` on the final snapshot; reader, composer, `exact_render.py`, `video_processor.py` and Cleanup sources byte-identical to `baseline-1b2b4a.json`, and `clip_generator.py` changed only in its legacy sinks; implementation report and self-audit, then fresh non-author review and task-state disposition |

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

Workflow 5.0.0 boundary (2026-09-22, appended by the Claude Code maintenance session
under Isaac's workflow-maintenance assignment; the text above is unchanged): work
through 1B.2b.2 acceptance keeps its recorded 4.1.0 bindings. After the independent
maintenance review and a disposition accepting the migration, later planning,
implementation and review use 5.0.0 with inventory 5.0.0-local-1 or a later preserved
revision. Here "coordinating
lead" or "lead" now means the active authorized task-state session and "Worker" a
separately assigned implementation writer; neither is a host default. Carried forward
unchanged: manual relays through Isaac, each bounded assignment's stated limits (such
as no agent dispatch, commit, push or release), fresh non-author initial review, this
task's explicit fresh independent follow-up after each relayed correction, disabled
verification delegation, the two-round reassessment and the three-attempt circuit
breaker. Substantial lead-authored changes still need fresh non-author review; small
or reviewer-authored repairs follow 5.0.0 conditional closure instead of the 4.1.0
author-lead independent-closure default.

Lead-23 (2026-09-22) is the first revision planned under 5.0.0-local-1, by the Claude
Code desktop session Isaac assigned as task-state owner. Its 1B.2b.3 implementation is a
separate manual relay; the implementation report, self-audit and fresh review are three
distinct 5.0.0 records at the paths named in that section.

Workflow 5.2.0 boundary (2026-09-27, Codex workflow-maintenance assignment):
this paragraph supersedes earlier hub-return routing only. Later work uses
`docs/workflow/inventories/5.2.0-local-1.md` and its forward lanes; no former
planner, implementer or hub resumes after transferring rights. Historical relay
entries and reports remain evidence under their recorded versions, not current
authority. Repair-1 is already handed off: it is not reopened for a retroactive
pre-handoff check. A fresh reviewer-owner receives task ownership at Isaac's
next relay, edits no product files, and arranges the focused non-author assessment
already required by lead-27. A later repairer receives writing rights only and
returns only to that current reviewer-owner. The explicit independent follow-up,
manual relays, disabled verification delegation, lead-27 scope and acceptance
criteria, open findings, two-round budget and three-attempt circuit breaker remain.
Maintenance changes resume metadata only, and accepts neither repair-1 nor WS-23.

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

Lead-23 adds no exception or waiver. Refusing tracked-clip deletion and legacy media
actions, and the accepted pre-adoption residual in the 1B.2b.3 section, are interim
limits that 1B.2b.4 and 1B.2b.5 must resolve before production adoption; they relax no
accepted criterion. Lead-24 adds none: its fail-closed note for unresolvable untracked
targets is a stated requirement in the correction-1 section, not a waiver.

Lead-26 adds none. Refusing adapters on version zero, keeping tracked `rerender`,
`thumbnail_config` PATCH, deletion, CLI and MCP media edits refused, and the items carried
in the 1B.2b.4a section are interim limits that 1B.2b.4b, 1B.2b.5 or 1B.3 must resolve
before production adoption; they relax no accepted criterion.

Lead-27 adds none. It widens WS-23 coverage to the audio-only road. Deferring WS-25 and
WS-26 to 1B.2b.5 is scheduling, not a waiver: WS-26 must close before adoption.
