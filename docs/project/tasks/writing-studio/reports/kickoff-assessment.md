# Coordinating Project Lead assessment — 2026-09-11

Author: Codex, coordinating Project Lead. Workflow 4.0.6; installed inventory in
`docs/workflow/README.md` applies, including customized README and retained CLAUDE.md
with unknown original provenance. This is a source-based planning assessment,
not an independent implementation review or execution receipt for new behavior.

Input spec: draft-1. Resulting spec: lead-2. Application snapshot:
`710b4d4eaf598e1a3a75a48e57b17b1b25f30e0e`. All 46 planning input hashes matched.
Git showed only modified `docs/writing-studio-plan.md` and untracked task documents
before lead edits. Git warned that the global ignore file was inaccessible;
tracked-input hashes and tracked diff still showed no application drift. No Git
configuration/index was changed. Original planning provenance remains preserved
in `planning-baseline.json`; lead comparison is appended separately.

## Assessment

The product direction is feasible and the feature inventory is a useful preservation
contract. The plan is not ready for broad implementation as one assignment. Original
slice 1 combines concurrency, migration, rendering, recovery and UI exposure before
legacy mutators are safe. Split out 1A (shared history safety), then refresh 1B against
its accepted result. Other slices remain a roadmap, not preapproved designs.

Reviewed current TS/Python history services and writers, web routes, Content and
Library components, reframe controls, transcript slicing, renderer boundary logic,
Cleanup, existing tests, local runtime documentation/harness and historical draft.
No selected additional domain reference applies. ADR/external inventory has no
applicable existing decision. Relevant `_local/project` inventory contains reference
archives/guide, not accepted Writing Studio outcomes; private runtime values, real
history/media and browser storage were not read. No build, browser, render or AI
call was run, so actual legacy-data prevalence and runtime outcomes remain unverified.

## Findings and required outcomes

All locations below refer to the application baseline. Source-confirmed paths are
distinguished from runtime reproduction; no claim is made that Isaac's data has
already been harmed.

| ID | Trigger, evidence and impact | Required outcome / disposition |
|---|---|---|
| WS-01 | Concurrent TS/Python mutations: `src/services/clips-history.ts:42,71` queues only one instance; `backend/services/clips_history.py:42,131` replaces a list read earlier. `backend/services/integrations/youtube/sync.py:77,118` also saves stale whole lists. Atomic replacement cannot prevent lost updates. | Open; 1A must cover every writer, resolving IDs inside the critical section; test real processes. |
| WS-02 | Invalid/unreadable history: TS `load()` at line 51 and Python loader at line 30 return empty; subsequent mutation writes that empty view plus its patch/new record. Existing valid work can be discarded after a read failure. | Open; 1A needs strict mutation reads, missing-file distinction, byte-preservation failure tests. |
| WS-03 | Trim-only request: `src/ui/web-server.ts:3212` drops kept segments; `src/utils/transcript.ts:16,32` selects bounding intervals. Renderer at `backend/services/clip_generator.py:957-1034` sorts, snaps and auto-cuts; result at 1364 omits the effective segment map. Stored text can include discarded speech; requested timing cannot prove rendered timing. | Open; exact-edit renderer contract and effective timing required before 1B renders. Timeline polish cannot precede correctness. |
| WS-04 | Logo apply/remove after reframe or card change: `src/ui/web-server.ts:2814-2835` uses an enduring pre-logo backup. Remove copies it onto the current output, restoring old media. Rerender at 3176 saves reframe before success; 3230 updates only some summary fields. | Open; immutable render commit plus adapters for all legacy mutators as revisions become writable. Test operation order, failure and cancellation. |
| WS-05 | Draft Cleanup design places immutable manifests under history and revisions under exports. `src/services/storage-cleanup.ts:57-80` collects every absolute path recursively; line 139 explicitly keeps exports. Retired versions would either remain pinned or never be candidates. This is a plan integration gap, not a defect in today's promised Cleanup scope. | Corrected in lead-2 design; implementation pending. Narrow app-owned revision category and live-root traversal, preserving fail-safe behavior and cross-process reference/delete exclusion. |
| WS-06 | Caption selector save: `src/ui/client/ClipDetail.tsx:113`, server PATCH at 2602, CLI edit at `backend/cli.py:3351` only update caption metadata. `src/ui/web-server.ts:3230` uses pre-card render size/duration; renderer duration excludes bookend output length. Metadata/visible output can disagree. | Open; explicit Apply & save video, post-composition probe, effective output timing and recipe projection. |

Additional migration constraints: old browser persistence contains only title/mode/
main result (`ContentStudio.tsx:55`). Do not promise recovery of pasted transcript,
custom responses or unsaved edits. Legacy recipe words retain source times, but
automatic segment changes are not fully recorded. Preserve the legacy rendered
artifact and label unavailable recovery instead of inventing exact timing. Both
Content endpoints can fall back to global episode text (`web-server.ts:3924,3969`);
the new linked-document API must require its own source and correlate every result.

Deletion remains a future in-scope hardening requirement: TS `remove()` and Python
`delete_clip()` unlink record-specified artifacts without the new revision/document
reference model. Do not expose new storage to those paths until invalidation,
detachment and app-owned/shared-source checks are integrated. 1A does not claim
to repair filesystem deletion races or all legacy rendering behavior.

## Product decisions

- D1: draft proposed moving captions/logos to Writing Studio; alternative was
  keeping them in Library. Both alter video, but moving them fits the requested
  Library focus. Isaac confirmed the move on 2026-09-11. Affects AC-1/AC-7 and slice 3.
- D2: draft proposed detached writing and retaining current plus previous video
  revisions as protected roots. Alternatives were retaining all revisions or
  deleting linked writing. Tradeoff: storage reclamation versus unlimited video
  history. Isaac confirmed keeping writing and offering older revisions through
  explicitly selected Cleanup on 2026-09-11. Affects AC-10; no automatic deletion.
- No other material product question remains at kickoff. Placement, readiness,
  timeline scope and missing-media behavior are specified in lead-2. Worker
  implementation approval remains pending as explicitly requested by Isaac.

## Verification, ownership and next action

Only document/source checks were performed: Git HEAD/status, 46 SHA-256 comparisons,
and targeted reads/searches. No application changes or Worker dispatch occurred.
The coordinating lead owns Status/spec/ledger. Implementation owner remains none.

Proposed first assignment: `../handoff-1a.md`, with actual TS/Python concurrency,
corruption, crash/lock and atomic-write evidence. After Isaac approval, the lead
activates the conditional sole-Worker handoff already recorded in Status. Worker hands
back `1a-worker.md` and a reproducible snapshot; lead arranges a fresh review-only
assignment without inherited history, reads its report, disposes findings and
updates Status. Required review is pending, not waived. Two unsuccessful repair
rounds on the same issue trigger reassessment; all Worker relays remain manual.
