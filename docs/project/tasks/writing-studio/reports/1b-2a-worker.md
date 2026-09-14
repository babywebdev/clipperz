---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2a"
spec_revision: "lead-9"
snapshot: "_local/project/evidence/writing-studio/1b-2a/snapshot/manifest.json"
author: "worker"
date: "2026-09-13"
state: "active"
summary: "1B.2a revision commit core implemented: internal TS save service commits real exact renders atomically with durable operations; all required checks pass; handed back for fresh independent review."
read_when: "Reviewing 1B.2a evidence, disposing B2A-1..6, or refreshing 1B.2b against the revision service."
evidence: "_local/project/evidence/writing-studio/1b-2a/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---

# Implementation Report: writing-studio / 1b-2a

Size note: the receipt table and required audits push this past the 1,200-word soft cap; no row or finding is dropped.

## Identity and freshness

- Implementation author: Worker, Claude Code session (Claude Fable 5.1), assigned by Isaac's manual relay on 2026-09-13. No agent was dispatched; every check ran in this session.
- Spec path and bound revision: `docs/project/tasks/writing-studio/spec.md`, lead-9, section "1B.2a bounded assignment: revision commit core" plus its acceptance map, constraints and exceptions.
- Code snapshot and snapshot evidence: HEAD `8cf6b82039381e62b0f1dac1953c0c8c279e86f1` plus the working tree bound by `snapshot/manifest.json` (73 file entries; tracked patch `1b-2a-tracked.patch` SHA-256 `0acad05e808e37476389adecb3dd86159fae7bcedd7f78042e4be4e3e46e9ec1`, 333,645 bytes; manifest SHA-256 `47bb5fdcc2fbbf28b2fcf681d79334966a1e72ffeda8af601c3f5d76be807ff3`). The manifest names the slice's own changes (2 modified, 7 new) apart from the 66 preserved pre-existing entries and excludes this report.
- Environment/target: Windows 11, Node 24.15.0, the configured venv Python, FFmpeg/ffprobe and Remotion bundle cache from `_local/clipperz/config/clipperz.env` (content hash unchanged from `baseline-1b2.json`); `dist/` built at 21:26:10Z; every fixture under `_local/clipperz/tmp/` or the OS temp directory, synthetic media only; no AI call, no network, no user Library.
- Plan freshness: all 69 `baseline-1b2.json` inputs hash-matched the tree before edits (0 drift). The pre-edit tracked patch (`pre-edit-tracked.patch`, SHA-256 `47049a64…`) differs from the accepted repair-3 patch (`e79ad677…`) only in `spec.md` and `findings-ledger.md`, the lead's WS-11/lead-9 bookkeeping; no application input differed. No relevant drift, no redesign; comparison recorded in `plan.md` before any edit.
- Resume before lead reconciliation: Status (1A and 1B.1 accepted, ownership returned, 1B.2a next) agrees with the repair-3 Worker Handoff and review disposition and with the tree; no discrepancy.
- Implementation: implemented
- Verification: pass
- Submitted for review: yes; acceptance belongs to the coordinating lead.

## Design as implemented

`src/services/clip-revisions.ts` (service) and `src/models/clip-revisions.ts` (types). A clip entry gains one optional field, `revisions`: record incarnation, monotonic draft/revision versions, draft/current/previous pointers, an operation log (at most one pending, capped at 32) and its roots. Immutable draft and revision documents live under `<home>/history/revisions/<clipId>/`; each operation renders through the accepted exact bridge into `<PODCLI_OUTPUT>/writing-studio/<clipId>/`, where the renderer creates its own `<title>_short-<op>/final/` group with its unchanged publication protocol. `ClipsHistory.transaction()` exposes the existing locked strict-read/atomic-replace cycle; nothing else in history changed. A save begins by recording a pending operation under expected state (busy, ID-reuse and stale-state refusals), renders, validates the exact v1 receipt (card absent, segments equal, transcript availability equal, bookend branch in the narrowed consumer type, returned files contained in a group directly beneath the namespace, complete files, probe agreeing with the receipt), writes the revision document, then commits pointers, legacy summary fields and the operation receipt in one transaction only if incarnation, draft version, revision version and its own pending record still match. Replay returns the recorded state without rendering; draft saves and explicit invalidation supersede or cancel a pending operation; refused work reports its residual paths and collects nothing. Opening-card requests are rejected before any state change. `ensureTracked` labels an existing output as version zero without exact provenance.

## Execution Receipt

"Final snapshot" is the manifest above; no implementation, test, script or documentation input changed after the last run listed for it. Exit codes are harness process exit codes; times are UTC from the logs.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| B2A-1..5 focused service and process suites | `node scripts/verification/run-tests.mjs node src/services/clip-revisions.test.ts src/services/clip-revisions.process.test.ts`; expect 0, 21 tests | 0: `Test Files 2 passed (2)`, `Tests 21 passed (21)`, 21:27:34Z, fixture `node-TCoJHt` | `_local/project/evidence/writing-studio/1b-2a/node-focused-revisions.log` | final snapshot | self |
| B2A-1,2,4,5 real bridge: legacy v0, draft, real exact revision, reopen from a separate process, replay/ID reuse, widen from retained words, cancelled late commit, Python edit during a real save, refusals, real Cleanup scan | `node --check scripts/verification/check-saved-revision.mjs && node scripts/verification/check-saved-revision.mjs`; expect 0, `Passed` | 0: `Passed`, 21:26:3xZ to 21:27:32Z; outro branch `hardcut` (as repair-3 on this installation), output 3.135 s, decoded colours `cyan, green` only, caption pixels 5035/2956, reopen hash check ok, 7 refusal codes as expected, 5 groups kept by Cleanup | `check-saved-revision.log`, `check-saved-revision-result.json` (fixture `saved-revision-yZExB2`); first run before the test-only edit: `check-saved-revision-run1.log`, `-run1-result.json` | final snapshot (run 1: same application inputs, earlier test file) | self |
| B2A-3,6 full Node suite including `clips-history.cross-process.test.ts` | `node scripts/verification/run-tests.mjs node`; expect 0 | 0: `Test Files 37 passed (37)`, `Tests 287 passed (287)`, 21:26:12Z to 21:26:25Z, fixture `node-Ynwem3` | `node-full-suite.log`; the harness log `_local/installation/logs/step-4-node-tests.log` also retains the 21:25:27Z run that failed 1/287 on a test-only ordering assumption (fixed, see Limitations) | final snapshot | self |
| B2A-6 build | `node scripts/installation/run.mjs npm build run build`; expect 0 | 0: `built in 1.52s`, 21:26:12Z (the 21:22Z build failed on a test-file strictness error, fixed before the next run) | `build-tail.log`; `_local/installation/logs/build.log` | final snapshot | self |
| B2A-6 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json`; expect 0 | 0, 21:27:33Z | `client-types.log` | final snapshot | self |
| B2A-5 production opt-in and callsite audit | `git status --porcelain -- backend tests`; grep for `clip-revisions`, `timing_mode`, `.revisions`, `ClipRevisionService` under `src`/`scripts`; expect no Python change and the service reachable only from its tests, fixture and check | as expected: Python status lines identical to the pre-edit capture; importers are the service, its types, two test files, the test-support module, the worker fixture and the check; no route, handler, CLI or MCP file references it | `production-optin-and-python-audit.log` | final snapshot | self |
| B2A-6 retained Python evidence | SHA-256 of every `backend/`, `tests/`, fixture and harness Python input against `baseline-1b2.json`; expect unchanged | 20/20 `same` (for example `clip_generator.py` `947795e8d1d4…`, `exact_render.py` `151ecf95243b…`, `test_exact_render.py` `adbc7a9fd2aa…`). Justification: the service consumes the bridge without changing any Python input, so the accepted repair-3 receipts (73 focused exact, 973 full, real `check-exact-render.mjs`) stay applicable; the new check exercised the real bridge fresh in addition | same log | final snapshot | self |
| AC-12 snapshot binding | `node _local/project/evidence/writing-studio/1b-2a/snapshot-capture.mjs`; expect manifest, tracked patch and hashes | 0: HEAD `8cf6b82`, 73 entries, patch `0acad05e…`; modified since pre-edit: `src/models/index.ts`, `src/services/clips-history.ts`; new: 7 files listed in Change inventory | `snapshot/manifest.json`, `snapshot/1b-2a-tracked.patch`, `snapshot/git-status.txt` | final snapshot | self |
| AC-12 manifest recheck after this report | `node _local/project/evidence/writing-studio/1b-2a/snapshot-capture.mjs --check`; expect 0 drift | recorded under Handoff | `snapshot/manifest.json` | final snapshot | self |

- Executor identities and target: every row `self`, this Worker session, configured local runtime, disposable fixtures only.
- Runtime coverage: happy path (draft, real exact render with reversed noncontiguous segments, outro fade and Remotion captions, decoded frame/tone/caption markers, widened second revision from the document's retained words); failure paths (renderer exception, card-applied receipt, `xfade_audio_concat` branch, path escaping the namespace, size disagreement, staging left behind, sidecar write failure, history commit write failure, corrupt history); concurrency and interruption (busy, draft during pending render, explicit cancellation, deletion and recreation during render, real SIGKILL before and after the commit in a child process, replay from a fresh process, Python production update and Python lock holder during a pending save, two-process busy); validation (identifier traversal, relative source, title separators, segment/keyframe domains, missing assets, stale expected state); Cleanup (real scanner with committed, previous, cancelled and interrupted groups plus a control reel). Unit and process schedules use the fake exact renderer in `clip-revisions.test-support.ts`, which reproduces the renderer's group shape and receipt; the real bridge covers the check rows.
- Human assistance: none.
- Not applicable: fresh Python suites and `check-exact-render.mjs` (no Python input changed; retained with hashes above); `check-preview-render.mjs`, `check-storage-cleanup.mjs`, `check-step-5-smoke.mjs` (legacy paths untouched; Cleanup protection proven by the real scanner in the focused test and the check); Studio walkthrough (no UI, route, CLI or MCP change); live AI smoke (no AI call).
- Not run: none of the checks named in `plan.md` or the assignment.
- Changed inputs after checks: none. This report and the recheck line are the only later writes.

## Change inventory

Git-derived (`snapshot/git-status.txt`; 73 entries of which 66 are preserved pre-existing changes unrelated to this slice):

- `src/services/clip-revisions.ts` (new): the revision save service, receipt/artifact validation, ffprobe adapter, render-parameter builder, legacy summary projection.
- `src/models/clip-revisions.ts` (new): revision state, documents, requests/results, typed errors, narrowed bookend consumer type.
- `src/models/index.ts` (modified): optional `revisions` field on `ClipHistoryEntry`.
- `src/services/clips-history.ts` (modified): public `transaction()` over the existing locked mutation; no other change.
- `src/services/clip-revisions.test.ts` (new, 17 tests) and `src/services/clip-revisions.process.test.ts` (new, 4 tests with real Node and Python processes).
- `src/services/clip-revisions.test-support.ts` (new): fake exact renderer and probe (test seam; compiled with the tests like every `src` test).
- `scripts/verification/fixtures/revision-worker.ts` (new): child-process worker with SIGKILL and wait barriers.
- `scripts/verification/check-saved-revision.mjs` (new): disposable real-bridge check.
- Ignored evidence under `_local/project/evidence/writing-studio/1b-2a/`: `plan.md`, pre-edit capture, logs, check results, `snapshot-capture.mjs`, `snapshot/`.

No Python, dependency, lockfile, configuration, route, UI, Cleanup or documentation file changed.

## Deviations and decision requests

None requiring a lead decision. Meaningful delegated choices, recorded for review:

- The operation's request hash covers the expected state as well as the recipe and words, so a replay must resend the same captured expectation; a caller that re-reads state after a commit and reuses the ID gets `OPERATION_ID_REUSED`, never a silent second render.
- A draft saved while a render is pending marks that operation superseded immediately (the spec's "changed drafts cannot publish a late pointer"); the render still completes into its own group and is reported as a residual.
- Legacy summary projection on commit: `output_path`, bounds (min/max of the ordered segments), `duration` (renderer's legacy content seconds), `file_size_mb`, style/strategy/format, `keep_segments`, asset paths (removed when the recipe has none), `transcript_slice` from the receipt's content text (removed when the transcript was unavailable) and `thumbnail_config.card_seconds` set to 0 because the new output carries no card. Legacy `recipes/`, `words/` and `reframe/` sidecars are not rewritten: they are separate files, not atomic with the commit, and legacy mutators must not act on tracked clips before their adapters exist.
- The recipe carries no `captions` boolean because `backend/main.py` does not forward one to `generate_clip` (see Limitations).
- `docs/local-setup.md` was not edited: it is a retained instruction/context identity in the baseline; a paragraph describing `check-saved-revision.mjs` is proposed below for the lead.

## Limitations and findings

- Defects fixed during the assignment: none in product code. Two test-authoring defects were fixed before the final runs: a strict-mode `at(-1)` access that failed the build, and an assumption that the alphabetically last group is the newest (two groups created in the same second sort by random suffix), which failed once in the full suite; the test now identifies the new group by set difference.
- Out-of-scope observations for the lead (proposed ledger first occurrences, not fixed here): (1) `backend/main.py` `create_clip` drops a `captions` parameter; `check-exact-render.mjs` passes `captions: false` in its same-title case without effect, so that case renders captions it did not ask for (no product impact in this slice). (2) Legacy TS `remove()` and Python `delete_clip` delete only `output_path` and the legacy sidecars; on a tracked clip they would leave previous revision groups and revision documents unreferenced and would not cancel a pending operation, which the spec already assigns to the deletion adapter successor. (3) The bridge does not surface the renderer's group parent as a result field; the service infers it from the returned path, as the spec anticipated.
- Uncertainty: interruption schedules use the fake renderer (real SIGKILL, real lock, real history); the real bridge covers commit, replay, cancellation, Python mutation, refusals and Cleanup but not process death mid-render. Injected filesystem faults only; no live ACL or power-loss guarantee. On this installation the outro join is `hardcut` (as in repair-3), so the `xfade_acrossfade` consumer branch is exercised only through the fake receipt. Windows file-in-use during a commit is covered by the existing atomic-replace retry, not by a new test.
- Proposed durable corrections: add `check-saved-revision.mjs` and the revision namespace/sidecar layout to `docs/local-setup.md` (lead reconciles); record the three observations above in the findings ledger if the lead agrees they are actionable.

## Handoff

- Checkpoint or actual handoff: handed off, 2026-09-13, this Worker session. Implementation writes stopped at this report.
- Current implementation owner: ownership returns to the coordinating Project Lead for fresh bounded independent review; not self-accepted.
- Current snapshot: HEAD `8cf6b82` plus `_local/project/evidence/writing-studio/1b-2a/snapshot/` (patch `0acad05e…`, manifest `47bb5fdc…`).
- Unfinished work and unresolved findings: none in this slice's scope. WS-03/04/05 and legacy WS-06/09 remain open as before; 1B.2b (production adapters, migration, card composition, render avoidance) not started.
- Last failed approach: none in product code; the two test-only failures above were corrected before the final runs.
- Next action and owner: coordinating lead arranges the fresh independent review of the bound snapshot against spec lead-9 and inventory 4.1.0-local-1, then disposes B2A-1..6. No commit, push, release, 1B.2b, production opt-in, UI, Cleanup or dependency change was made or is authorized by this report.
- Pending Isaac decision: none.
- Durable decisions: none (no ADR).
- Manifest recheck after writing this report (2026-09-13T21:29Z): `node _local/project/evidence/writing-studio/1b-2a/snapshot-capture.mjs --check` reported `checked 73 files, 6 local evidence, 12 workflow files: 0 drift; HEAD 8cf6b82...` and no status line outside the recorded snapshot (`snapshot-recheck.log`). This report is excluded from the manifest's file entries by design.
