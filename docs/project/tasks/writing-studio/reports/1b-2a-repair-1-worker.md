---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2a-repair-1"
spec_revision: "lead-10"
snapshot: "_local/project/evidence/writing-studio/1b-2a-repair-1/snapshot/manifest.json"
author: "worker"
date: "2026-09-13"
state: "active"
summary: "R1..R5 (WS-12..16) repaired: physical ownership checks, incarnation-bound operation mutations, captured requests, durable replay, strict receipt validation; all required checks pass; handed back for fresh review."
read_when: "Reviewing 1B.2a repair-1 evidence for WS-12..16, disposing B2A-1..6, or refreshing 1B.2b."
evidence: "_local/project/evidence/writing-studio/1b-2a-repair-1/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---

# Implementation Report: writing-studio / 1b-2a-repair-1

Size exception: five confirmed findings, their before/after reproductions and twelve receipt rows exceed the 1,200-word soft cap; no required evidence is dropped.

## Identity and freshness

- Implementation author: Worker, Claude Code session (Claude Fable 5.1), assigned by Isaac's manual relay of the coordinating lead's bounded repair-1 direction on 2026-09-13. No agent was dispatched; verification delegation stayed disabled; every check ran in this session.
- Spec path and bound revision: `docs/project/tasks/writing-studio/spec.md`, lead-10, section "1B.2a repair-1 direction" plus the 1B.2a assignment, acceptance map, constraints and exceptions; findings from `reports/1b-2a-review.md` and its coordinating disposition; ledger WS-12..16.
- Code snapshot and snapshot evidence: HEAD `8cf6b82039381e62b0f1dac1953c0c8c279e86f1` plus the working tree bound by `snapshot/manifest.json` (75 file entries, 25 local evidence entries, 16 workflow/record entries; manifest SHA-256 `9c43ba0acb4e10b67be10e7dcf6073815f18a75d10813fe4bfd94debf3ceb53c`). The tracked patch `snapshot/1b-2a-repair-1-tracked.patch` (SHA-256 `48e97617b36c94b053611cca5402ccb427be2d28a19dc9e3236268aa02b77a99`, 340,623 bytes) is byte-identical to the pre-edit capture: the repair changed only the seven untracked slice files. Their pre-edit content was reconstructed and hash-verified against the reviewed 1B.2a manifest (`pre-edit-reconstruction.json`, 7/7 match) and the repair itself is `repair-1-slice.patch` (SHA-256 `942969ab640a38fb2a4bed9ec4f5a2cb12c64bb29189cdc9fb82a270db87f0c2`, 7 files).
- Environment/target: Windows 11, Node 24.15.0 with tsx, the configured venv Python, FFmpeg/ffprobe and Remotion bundle cache from `_local/clipperz/config/clipperz.env`; `dist/` rebuilt at about 22:20Z; every fixture under `_local/clipperz/tmp/`, the OS temp directory or this cycle's evidence directory, synthetic media only; no AI call, no network, no user Library.
- Plan freshness: before any edit, `node _local/project/evidence/writing-studio/1b-2a/snapshot-capture.mjs --check` against the reviewed snapshot reported 4 drift lines, all lead-owned coordination records (`findings-ledger.md`, `spec.md`, `spec-log.md`) plus the untracked review report, and no application, test, fixture, script or instruction drift (`pre-edit-drift-vs-1b-2a-manifest.log`); the reviewed patch hash `0acad05e...` was re-verified. Disposition recorded in `plan.md` before edits: no relevant drift, the lead's bookkeeping is the expected baseline delta. Python inputs: 20/20 hashes unchanged against `baseline-1b2.json`.
- Resume before lead reconciliation: Status (1B.2a changes-requested, repair-1 next, Worker on manual relay) agrees with the 1B.2a Worker Handoff, the review disposition and the tree; no discrepancy.
- Implementation: implemented
- Verification: pass
- Submitted for review: yes; acceptance and WS-12..16 disposition belong to the coordinating lead after fresh independent follow-up.

## Design as implemented

All edits stay in the existing service, types, tests, fake renderer, worker fixture and disposable check.

- R1 / WS-12: `assertOwnedDirectory(root, target, label, create)` walks every component between the configured export or history root (the trusted boundary, exclusive) and the target, lstat-ing each: an existing component must be a real directory, never a symbolic link or junction; with `create` it makes missing components one level at a time and re-checks them. Used before draft documents, before a new render begins (verify only, no operation recorded), before the namespace is created, before the revision document, and for the returned group and `final` directories; returned files must be regular files. New typed error `OWNERSHIP_ESCAPE`. It is a static check of the chain at that moment, not a defense against concurrent replacement.
- R2 / WS-13: the commit, the failure path (`finishOperation`), residual bookkeeping and invalidation first establish ownership: same record incarnation and, for operations, same captured request hash. A late success or failure from another incarnation returns an unpersisted `superseded` description and changes nothing. `InvalidateOperationRequest` gains required `expected_incarnation`; a stale caller receives `not-owned`. An owned but already cancelled or superseded operation keeps its state and gains the late residuals.
- R3 / WS-14: `captureRequest()` structured-clones the whole request as the first statement of `saveDraft`, `saveRevision` and `invalidateOperation`; validation, the request hash, the renderer parameters and the persisted document use only that copy.
- R4 / WS-15: the 32-record cap and trimming are removed; records last for the incarnation's lifetime. `OperationRecord.revision` retains the committed pointer, so a replay of any age returns the complete original result. Replay lookup is a locked read-only transaction that runs before source/asset existence checks; a reused ID with a different captured request still conflicts there. A missing source now refuses only a new render.
- R5 / WS-16: `validateReceipt()` checks the exact v1 receipt before any arithmetic: required objects, strings, booleans, finite numbers and integers; enums (branches, transcript input, caption renderer, keyframe domain); and relationships against the captured request: ordered source intervals, contiguous content placement, durations and sums within the renderer's 3-decimal rounding, measured content within `tolerance.content_seconds`, offset against the intro, output duration and outro placement within composition plus A/V tolerance, output dimensions against framing, keyframes, words availability and counts, captions consistency, card absence, artifact provenance (unrequested sidecars refused). Refusal is a failed operation with `INVALID_RECEIPT`; pointers never move. The fake renderer's outro region was aligned to the renderer's `bookend_region` semantics so the seam obeys the same relationships.

## Execution Receipt

"Final snapshot" is the manifest above; no implementation, test, fixture, script or check input changed after the last run listed for it. Exit codes are process exit codes; times are UTC from the logs.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| Before-edit reproduction (R1..R5 present) | `node --import tsx _local/project/evidence/writing-studio/1b-2a/review/repro.mjs` (unchanged script, SHA-256 `304dc91e...`; the review's `repro-result.json` was copied aside first and restored byte-identically, SHA-256 `33acc146...`); expect 0 with the defect outcomes | 0: linked save `committed` with files outside both roots, `oldReplay` version -1, `failedReplay` 34 to 35 renders, missing-source replay `INVALID_RECIPE`, new incarnation `failed` with the old error, malformed `committed`, saved segment start 7 | `repro-before.log`, `repro-before-result.json`, `review-original-repro-result.json` | reviewed 1B.2a snapshot (pre-edit; tracked patch identical to final) | self |
| After-edit reproduction (obsolete defect assertions) | same command, unchanged script; expect non-zero | 1: uncaught `OWNERSHIP_ESCAPE` at the linked-namespace save ("is a symbolic link or junction; refusing to write through it"), which precedes the script's assertion block, so the obsolete assertions are never reached and no result file is written; reviewer files unchanged (same hashes) | `repro-after.log` | final snapshot | self |
| R1..R5 corrected demonstration (B2A-1,2,4,5) | `node --import tsx _local/project/evidence/writing-studio/1b-2a-repair-1/demo.mjs`; expect 0 and every corrected outcome asserted | 0: `demo: all corrected outcomes hold`: op-0 and op-2 replay committed (versions 1 and 3, files present, 34 records, no render); failed replay renders nothing; replay with source removed committed, new render `INVALID_RECIPE`; linked roots `OWNERSHIP_ESCAPE` for save and draft with both outside directories empty and no operation recorded; old incarnation's failure `superseded`, new operation stays `pending` with null error, stale cancel `not-owned`, new commit version 1; malformed receipt `failed` ("must be a finite number"), no document, version 0; saved segments start 0, title unchanged, original replays, mutated request `OPERATION_ID_REUSED` | `demo.log`, `demo-result.json`, fixture `demo-fixture-DrwGVl` | final snapshot | self |
| B2A-1,2,4,5 focused service and process suites (all five regressions) | `node scripts/verification/run-tests.mjs node src/services/clip-revisions.test.ts src/services/clip-revisions.process.test.ts`; expect 0 | 0: `Test Files 2 passed (2)`, `Tests 33 passed (33)`, 22:21:08Z (run 1 at 22:17:48Z also 33/33 before the test-only typing fix) | `node-focused-revisions.log`, `node-focused-revisions-run1.log` | final snapshot | self |
| B2A-1,2,4,5 real bridge, now including old-operation replay | `node --check scripts/verification/check-saved-revision.mjs && node scripts/verification/check-saved-revision.mjs`; expect 0, `Passed` | 0: `Passed`, 11 steps; outro branch `hardcut` (this installation), output 3.135 s, decoded colours `cyan, green` only, caption pixels 5035/2956; new step `old replay`: op-1 replayed after two later revisions and a cancellation with version 1, same revision id, output path and file hash, history bytes and groups unchanged, 4 operation records; 7 refusal codes as expected; Cleanup kept 5 groups | `check-saved-revision.log`, `check-saved-revision-result.json` (fixture `saved-revision-yTvzJD`) | final snapshot | self |
| B2A-3,6 full Node suite including cross-process history tests | `node scripts/verification/run-tests.mjs node`; expect 0 | 0: `Test Files 37 passed (37)`, `Tests 299 passed (299)`, 22:21:15Z (run 1 at 22:19:10Z also 299/299) | `node-full-suite.log`, `node-full-suite-run1.log` | final snapshot | self |
| B2A-6 build | `node scripts/installation/run.mjs npm build run build`; expect 0 | 0: `built in 1.54s`, about 22:20Z; the first build at about 22:19Z failed with TS18048 on an optional receipt field in the new test (test-only), fixed before every final run | `build.log`, `build-run1-failed.log` | final snapshot | self |
| B2A-6 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json`; expect 0 | 0, about 22:22Z (run 1 also 0) | `client-types.log`, `client-types-run1.log` | final snapshot | self |
| B2A-5 production opt-in and callsite audit | `git status --porcelain -- backend tests`; grep for `clip-revisions`, `ClipRevisionService`, `timing_mode`, `.revisions` under `src`/`scripts`; expect no Python change and no production importer | as expected: Python status lines identical to the pre-edit capture; importers are the service, its types, `models/index.ts`, two test files, the test-support module, the worker fixture and the check; the only other `timing_mode` references are the pre-existing `check-exact-render.mjs` | `production-optin-and-python-audit.log` | final snapshot | self |
| B2A-6 retained Python evidence | SHA-256 of every Python input recorded in `baseline-1b2.json`; expect unchanged | 20/20 `same`. Justification: no Python, dependency or configuration input changed, so the accepted repair-3 Python receipts stay applicable; the real bridge was exercised fresh by the check above | same log | final snapshot | self |
| AC-12 snapshot binding | `node _local/project/evidence/writing-studio/1b-2a-repair-1/snapshot-capture.mjs`; expect manifest, tracked patch, slice patch and hashes | 0: HEAD `8cf6b82`, 75 entries, tracked patch identical to pre-edit, repair changed exactly the 7 slice files; pre-edit copies 7/7 hash-match the reviewed manifest | `snapshot/manifest.json`, `snapshot/1b-2a-repair-1-tracked.patch`, `snapshot/git-status.txt`, `repair-1-slice.patch`, `pre-edit/`, `pre-edit-reconstruction.json`, `snapshot-capture.log` | final snapshot | self |
| AC-12 manifest recheck after this report | `node _local/project/evidence/writing-studio/1b-2a-repair-1/snapshot-capture.mjs --check`; expect 0 drift and only this report as a new status line | recorded under Handoff | `snapshot/manifest.json` | final snapshot | self |

- Executor identities and target: every row `self`, this Worker session, configured local runtime, disposable fixtures only.
- Runtime coverage: R1 real Windows junctions (`symlinkSync(..., "junction")`, asserted via lstat) at the sidecar intermediate, sidecar clip root, namespace intermediate, namespace clip root, a sidecar link appearing after begin, and a renderer group replaced by a junction; R2 late failure, late success and stale cancellation across a recreated clip plus a cross-process stale cancellation; R3 synchronous and mid-render nested mutation for saves, drafts and invalidation; R4 34 committed and 34 failed operations, replay older than current/previous, replay with source and asset removed, ID conflict of any age; R5 a 31-case malformed-receipt matrix including the review's schedule and NaN, plus an accepted intro/outro/crossfade/keyframe receipt. All prior 1B.2a schedules still pass, including real SIGKILL before and after the commit, Python mutation and lock holding, and the real Cleanup scanner.
- Human assistance: none.
- Not applicable: fresh Python suites and `check-exact-render.mjs` (no Python input changed; retained with hashes above); preview/cleanup/smoke scripts and Studio walkthrough (no UI, route, CLI, MCP or Cleanup change); live AI smoke (no AI call).
- Not run: none of the checks named in `plan.md` or the direction.
- Changed inputs after checks: none. This report and the recheck line are the only later writes.

## Change inventory

Git-derived (`snapshot/git-status.txt`, 75 entries; the tracked patch equals the pre-edit capture, so no tracked file changed). Repair changes, all untracked slice files, diffed in `repair-1-slice.patch` against hash-verified pre-edit copies:

- `src/services/clip-revisions.ts`: request capture, ownership chain check, receipt validator, replay-before-existence ordering, ownership-bound commit/failure/invalidation, retained operation results, updated module contract.
- `src/models/clip-revisions.ts`: `OperationRecord.revision`, `expected_incarnation` on invalidation, `not-owned` outcome, `OWNERSHIP_ESCAPE` code, retention comments.
- `src/services/clip-revisions.test.ts`: 32-cap test replaced by durable-replay coverage; new describes for ownership, incarnations, captured requests and receipt validation (29 tests).
- `src/services/clip-revisions.process.test.ts`: cross-process stale cancellation; invalidation names the incarnation.
- `src/services/clip-revisions.test-support.ts`: fake bookend regions follow the renderer's semantics.
- `scripts/verification/fixtures/revision-worker.ts`: `invalidate` takes the incarnation.
- `scripts/verification/check-saved-revision.mjs`: invalidation names the incarnation; new real-bridge `old replay` step.
- Ignored evidence under `_local/project/evidence/writing-studio/1b-2a-repair-1/`: `plan.md`, pre-edit capture and reconstruction, before/after reproduction logs, `demo.mjs` and result, all check logs, `snapshot-capture.mjs`, `snapshot/`.

No Python, dependency, lockfile, configuration, route, UI, Cleanup, migration, instruction or lead-owned record changed.

## Deviations and decision requests

None requiring a lead decision. Delegated choices, recorded for review:

- The configured export and history roots are the trusted ownership boundary; they may themselves be links (user configuration), while every component beneath them must be a real directory. An ownership refusal before rendering reports no residual; a linked returned group is reported by its lexical group path.
- Invalidation now requires the observed incarnation. The fixture, process test and check pass it; production adapters (successor work) will need it too.
- The replay lookup uses a locked read-only transaction rather than the lenient read, keeping corrupt-history refusal identical for every mutation.
- A committed record written by the reviewed snapshot without a stored result would replay from current/previous or refuse with `INVALID_RECEIPT`; no such data exists outside disposable fixtures.
- Receipt relationships use the renderer's stated tolerances: 3-decimal rounding (0.002 s) for exact arithmetic, 0.011 s for the 2-decimal legacy duration, `content_seconds` for measured versus requested content, and composition plus A/V tolerance for output and outro joins. Source paths compare after normalization. The request hash still covers expected state, unchanged from 1B.2a.

## Limitations and findings

- Defects fixed during the assignment: WS-12, WS-13, WS-14, WS-15, WS-16 in product code (repaired, pending fresh review; lead disposes). One test-authoring defect (an optional receipt field accessed without narrowing) failed the first build and was fixed before the final runs; `build-run1-failed.log` retains it.
- The unchanged reproduction now stops at its linked-root schedule with an uncaught typed refusal before its assertion block, so its obsolete assertions do not run at all; the corrected outcomes are demonstrated separately by `demo.mjs` and the regressions. Running it twice added two fixture directories (`fixture-4YbLDF`, `fixture-EfD9QN`) to the review evidence directory; the reviewer's own files are unchanged by hash.
- Uncertainty: ownership is a static per-component check, as the direction allows; no claim against concurrent filesystem replacement. On this installation the outro join is `hardcut`, so the crossfade relationships are exercised through the fake renderer only, as in 1B.2a. Injected faults only; no ACL or power-loss guarantee. `repair-1-slice.patch` shows Windows-style `a/` paths, cosmetic only.
- Out-of-scope observations: none new. The caption-forwarding bridge observation (WS-06) and deletion adapters remain successor work as the lead recorded.
- Proposed durable corrections: the 1B.2a proposal to document `check-saved-revision.mjs` and the revision layout in `docs/local-setup.md` still stands; the invalidation contract (incarnation-bound) belongs in the same successor documentation. Lead reconciles.

## Handoff

- Checkpoint or actual handoff: handed off, 2026-09-13, this Worker session. Implementation writes stopped at this report.
- Current implementation owner: ownership returns to the coordinating Project Lead for fresh bounded independent follow-up; not self-accepted.
- Current snapshot: HEAD `8cf6b82` plus `_local/project/evidence/writing-studio/1b-2a-repair-1/snapshot/` (tracked patch `48e97617...`, manifest `9c43ba0a...`, slice patch `942969ab...`).
- Unfinished work and unresolved findings: none in this repair's scope. WS-03/04/05 and legacy WS-06/09 remain open as before; 1B.2b not started.
- Last failed approach: none in product code; the test-only strictness error above was corrected before the final runs.
- Next action and owner: coordinating lead arranges the fresh independent follow-up of this snapshot against spec lead-10 and inventory 4.1.0-local-1, then disposes WS-12..16 and B2A-1..6. No commit, push, release, 1B.2b, production opt-in, UI, Cleanup, Python or dependency change was made or is authorized by this report. This is repair round one.
- Pending Isaac decision: none.
- Durable decisions: none (no ADR).
- Manifest recheck after writing this report (2026-09-13T22:27Z): `node _local/project/evidence/writing-studio/1b-2a-repair-1/snapshot-capture.mjs --check` reported `checked 75 files, 25 local evidence, 16 workflow files: 0 drift; HEAD 8cf6b82...` and exactly one status line outside the recorded snapshot, this report (`snapshot-recheck.log`). This report is excluded from the manifest's file entries by design; this line was the only edit after the recheck.
