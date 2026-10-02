---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2a-repair-3"
spec_revision: "lead-12"
snapshot: "_local/project/evidence/writing-studio/1b-2a-repair-3/snapshot/manifest.json"
author: "worker"
date: "2026-09-14"
state: "active"
summary: "WS-16 join provenance implemented: exact bookends record concat_outro's join inputs; new saves require them and reproduce its clamp and eligibility. Producer-derived matrix, both bridges and all required checks pass; handed back for fresh review."
read_when: "Reviewing 1B.2a repair-3 evidence for WS-16, disposing B2A-4/6, or checking join-provenance compatibility and the fed8ed1 base change."
evidence: "_local/project/evidence/writing-studio/1b-2a-repair-3/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---

# Implementation Report: writing-studio / 1b-2a-repair-3

Size exception: a producer and consumer contract change, a base-commit change during the assignment, a 15-case producer matrix compared across two consumers and seventeen receipt rows exceed the 1,200-word soft cap; no required evidence is dropped.

## Identity and freshness

- Implementation author: Worker, Claude Code desktop session (Claude Opus 5), assigned by Isaac's manual relay of spec lead-12 on 2026-09-14. No agent dispatch; verification delegation disabled; every check ran in this session.
- Spec path and bound revision: `docs/project/tasks/writing-studio/spec.md` lead-12, "Reassessment and bounded join-provenance correction", with the 1B.2a assignment, retained repair-1/repair-2 contracts, acceptance map (B2A-4/6, affected B1-2/3), constraints and exceptions; `reports/1b-2a-repair-2-review.md` including the lead disposition; `reports/1b-2a-repair-2-worker.md` receipt and Handoff.
- Code snapshot: HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13` (tree `b0d7d5c8e62c440fca5d1e4b6dfaa65ebd179f2c`) plus `snapshot/manifest.json` (SHA-256 `a237483a90012fa9a10a9b3abff9fcfb5a1e09db5280e0f686076f09c364c691`: 12 file entries, 88 local evidence, 11 contract/dependency inputs, 16 workflow files). Tracked patch against HEAD `snapshot/1b-2a-repair-3-tracked.patch` SHA-256 `6b5b57bfbed008f8a203a09d53c0f2c98b3b05e1fb39c465253424b75983d407` (40,036 bytes, 9 files); the 3 new untracked files are copied under `snapshot/untracked/`; `repair-3-slice.patch` SHA-256 `a06b4a8365f0cfd265be13914d9dd535f65f5ee29287abb533db54befdb6d6ad` diffs all 12 against the pre-edit copies.
- Base change during the assignment: the relayed baseline was HEAD `8cf6b82` plus the repair-2 manifest. At 2026-09-14T18:41:04Z Isaac committed the uncommitted tree as `fed8ed1` in GitHub Desktop with another project's message, and confirmed in session that it was accidental. It followed my pre-edit status capture (18:34:50Z) and preceded every edit (`plan.md` 18:50:51Z). Its 80 paths equal the 80 pre-edit status entries with none outside; the nine planned files' committed blobs equal their pre-edit copies; a later repair-2 manifest recheck shows only lead-12 bookkeeping and repair-3 drift. The compared content is unchanged; only the base identity moved. I did not amend, reset or reword it (`head-drift-fed8ed1*`).
- Environment/target: Windows 11, Node 24.15.0 with tsx, configured venv CPython 3.14, FFmpeg/ffprobe and the Remotion cache from the configured runtime; `dist/` rebuilt 19:13Z (UTC throughout). Synthetic media and isolated storage only (OS temp, `_local/clipperz/tmp/`, evidence directory); no AI call, network or user Library.
- Plan freshness (`plan.md`, before edits): repair-2 `snapshot-capture.mjs --check` exit 1 with 6 drift lines, exactly `findings-ledger.md`, `spec.md`, `spec-log.md` in two groups; no application, evidence, contract or instruction drift. Tracked patch sections 31 of 33 identical (only ledger and spec differ). Repair-2 slice patch `f1050ab1...` and manifest `37227a0f...` re-hashed: match. `strict_ai.py` present and hash-matching. No relevant drift.
- Resume before lead reconciliation: Status (lead-12, repair-3 next, Worker on relay) agrees with the repair-2 Handoff, review disposition and tree; the only discrepancy is the later base change above.
- Implementation: implemented
- Verification: pass
- Submitted for review: yes; acceptance and WS-16 disposition belong to the coordinating lead after fresh independent follow-up.

## Design as implemented

- Producer, `backend/services/exact_render.py` only: `bookend_region` requires the concat report's `main_duration` and `appended_duration` to be finite non-negative numbers (missing, bool, string, NaN, infinity or negative raise ExactRenderVerificationError, so no receipt exists) and adds `join_inputs: {main_duration, appended_duration}` exactly as recorded. Region arithmetic and rounding are unchanged; `concat_outro`, its clamp, fallback order and publication are untouched; `clip_generator.py` needed no plumbing.
- Consumer, `validateReceipt`, after the existing composition checks, for every bookend of a new save: `join_inputs` is required (typed INVALID_RECEIPT: "receipt outro lacks join_inputs: a new save needs the main_duration and appended_duration concat_outro joined, which this renderer did not record; update the renderer and render again"); both values finite and non-negative; `asset_duration` equals its asset-side input (intro main, outro appended) within the existing 0.002 RECEIPT_ROUNDING; with an intro and outro, the outro's main equals the intro's `measured_output_duration` within 0.002, because concat_outro probes the same composed file for both. `concatJoin` reproduces concat_outro in the same IEEE arithmetic: `xfade_acrossfade` must be eligible and overlap the clamp within 0.002; hard cuts keep overlap exactly 0 and remain valid whether or not a crossfade was eligible. The repair-2 upper-bound check it subsumes was removed. No new tolerance.
- Compatibility: `loadRevision` and replay are unchanged, so stored documents are never re-validated, rewritten or upgraded. `RenderTimelineJoinInputs` is added; `join_inputs?` is optional on `RenderTimelineBookend` (inherited by `SavedBookend`) with comments stating that earlier receipts and revisions lack it. Bookend-free saves and legacy non-exact results are unchanged.
- Fake renderer: emits `join_inputs` and follows eligibility. Its repair-2 valid "clamped crossfades" receipt (0.3 s assets, fade 0.5) was producer-impossible, because `0.3 - 0.25` is `0.04999999999999999` and concat_outro hard-cuts. The case now uses 0.6 s assets with fade 0.9 (both joins clamp to 0.55 and are eligible); the old values remain as a valid hard-cut fallback case.
- Prevention: test-only `scripts/verification/fixtures/exact_join_matrix.py` runs the real `handle_create_clip`, exact `generate_clip`, `concat_outro`, `verify_bookend_transition`, `bookend_region`, `_exact_render_timeline` and publication, controlling only probe and FFmpeg I/O (a crossfade's output duration subtracts the xfade duration parsed from the real filter). It owns a 15-case table and 13 wrong-overlap mutations applied to the real report after concat_outro returns, so the next join, regions, the producer's own output proof and the final probe follow the mutation. Python `JoinProvenanceTests` import it; `src/services/clip-revisions.join-matrix.test.ts` spawns it as the service's renderer through `clip-revisions.producer-test-support.ts`. Both bridge checks assert real `join_inputs`; `check-saved-revision.mjs` adds a real stripped-receipt refusal step.

Matrix (producer outcome, then mutation and refusal): fade-limited intro and outro 0.5/0.5 (intro 0.1 and outro 0.3 by clamp); main-limited eligible 0.6 s intro 0.55 (0.3, clamp); main-limited ineligible 0.4 s intro hard cut (claimed crossfade 0.35, eligibility); appended-limited intro 0.25 (0.45, clamp); outro main including the intro 0.25/0.5, outro main 2.05 s (outro 0.25, clamp); appended-limited outro 0.25 (0.2); main-limited outro 0.55 (0.5); no fade hard cuts (claimed crossfade 0.25, eligibility); short 0.1 s crossfade 0.05; short 0.08 s hard cut (claimed 0.05, eligibility); assets both rounding to 0.1 s: 0.1004 crossfades, 0.0996 hard-cuts (claimed 0.05, eligibility); full precision 1.23456789/2.0004/1.7654321 at fade 0.3333333, 0.333/0.333 with unrounded inputs (intro 0.3, clamp); crossfade failing after eligibility, softened hard cuts (hard cut claiming 0.5, hard-cut); pure hard cut.

## Execution Receipt

"Final" is the manifest snapshot above; no implementation, test, fixture or check input changed after the final runs.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| Before reproduction (B2A-4) | `node --import tsx _local/project/evidence/writing-studio/1b-2a-repair-2/review/repro.mjs`, unchanged; reviewer result copied aside and restored; expect 0 with the defect | 0, finished 18:41:46Z: valid-control committed overlap 0.5, output 3.5; wrong-fade committed 0.1, 3.9; seven reviewer hashes identical after restore; script created `review/fixture-ZYD5Ae` | `repro-before.log`, `repro-before-result.json`, `review-original-repro-result.json`, `review-artifacts-before.sha256`, `review-artifacts-after-restore.sha256` | pre-edit (content committed unchanged as fed8ed1) | self |
| Pre-edit baselines | `node scripts/verification/run-tests.mjs python`; `... python -k exact_render -rs` | full 0: 973 passed, 6 skipped; focused 0: 73 passed, none skipped | `python-full-pre-edit.log`, `python-exact-pre-edit.log` | pre-edit | self |
| After reproduction, obsolete assertion (B2A-4) | same unchanged command, result backed up; expect non-zero at wrong-fade | 1 at 19:16Z: AssertionError actual `failed`, expected `committed`; fixture history shows valid-control revision 1 committed, wrong-fade failed "receipt intro crossfade overlap 0.1s is not the requested fade 0.5s clamped by its join inputs to 0.5s" at revision 0; no result write; reviewer hashes identical to the original capture; script created `review/fixture-IEfBR7` | `repro-after.log`, `repro-after-fixture-state.log`, `review-artifacts-before-after-run.sha256`, `review-artifacts-after-run.sha256`, `review-dir-*-after-run.txt` | final | self |
| Corrected demonstration (B2A-4) | `node --import tsx _local/project/evidence/writing-studio/1b-2a-repair-3/demo.mjs`; expect 0 | 0 at 19:19Z, "demo: all corrected outcomes hold": E three genuine repair-2 committed operations (one hard-cut outro without join_inputs) load and replay committed without rendering, documents and clips.json byte-identical, files verify; A producer review scenario valid 0.5 commits, coherent 0.1 refused, pointers unmoved, published probe 3.9 equals receipt; B review's fake receipts: valid-control commits, wrong-fade refused; C repaired consumer commits 15/15 valid and refuses 13/13 mutations, while the pre-edit repair-2 consumer commits 15/15 valid and 11/13 mutations (it already refused the no-fade and hard-cut claims); D missing provenance refused, bookend-free commits | `demo.log`, `demo-result.json`, `mirror-repair-2-consumer.log` (fixture named in manifest) | final | self |
| B2A-4 producer matrix; B1-2/B1-3 focused exact | `node scripts/verification/run-tests.mjs python -k exact_render`; expect 0 | 0 at 19:15Z: 77 passed, 123 subtests (4 new tests; real-media crossfade and fallback now assert join inputs) | `python-exact.log` (diagnostic `python-exact-run1.log` 31 failed, `-run2` passed) | final | self |
| B2A-1,2,4,5 focused service/process and Node matrix | `node scripts/verification/run-tests.mjs node src/services/clip-revisions.test.ts src/services/clip-revisions.process.test.ts src/services/clip-revisions.join-matrix.test.ts`; expect 0 | 0 at 19:13Z: 3 files, 43 passed | `node-focused-revisions.log` (diagnostic `node-focused-fake-run1.log` 39 passed; `node-focused-run1.log` 42/43) | final | self |
| B2A-3,6 full Node | `node scripts/verification/run-tests.mjs node`; expect 0 | 0 at 19:14Z: 38 files, 309 passed (repair-2: 304) | `node-full-suite.log` | final | self |
| B2A-6 build | `node scripts/installation/run.mjs npm build run build`; expect 0 | 0 at 19:13Z, built in 1.53s | `build.log` (`build-run1.log` 0) | final | self |
| B2A-6 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json`; expect 0 | 0 at 19:13Z | `client-types.log` (`-run1` 0) | final | self |
| B2A-6 full Python | `node scripts/verification/run-tests.mjs python`; expect 0 | 0 at 19:15Z: 977 passed, 6 skipped, 280 subtests; no strict_ai failure | `python-full.log` | final | self |
| B2A-6 changed Python syntax | `node scripts/installation/run.mjs python repair-3-1b-2a-py-compile -m py_compile backend/services/exact_render.py tests/test_exact_render.py scripts/verification/fixtures/exact_join_matrix.py`; expect 0 | 0 at 19:13Z | `py-compile.log` (`-run1` 0) | final | self |
| B1-2, B1-3 exact bridge | `node --check scripts/verification/check-exact-render.mjs && node scripts/verification/check-exact-render.mjs`; expect 0 `Passed` | 0 at 19:17Z `Passed`: outro `hardcut`, overlap 0, asset 1.021, join_inputs main 2.09 and appended 1.020998, content video end 2.04, output 3.135 | `check-exact-render.log`, `check-exact-render-result.json` (fixture `exact-render-0imqM2`) | final | self |
| B2A-1..6 saved-revision bridge | `node --check scripts/verification/check-saved-revision.mjs && node scripts/verification/check-saved-revision.mjs`; expect 0 `Passed` | 0 at 19:18Z `Passed`, 15 steps: real receipt with join_inputs committed (hardcut, 3.135 s, decoded cyan/green, caption pixels 5035/2956); new step strips real join_inputs (1.020998/1.020998): failed "receipt outro lacks join_inputs...", pointers unchanged, residual group reported | `check-saved-revision.log`, `check-saved-revision-result.json` (fixture `saved-revision-KKDglC`) | final | self |
| B2A-5 write area and opt-in audit | `git status`, `git diff --stat HEAD`, strict_ai.py hash, importer grep | only the 9 planned files and 3 new files; strict_ai.py `be018cbf...` equals the repair-2 manifest and HEAD; no route, UI, MCP or CLI reference | `production-optin-and-write-area-audit.log` | final | self |
| Base change investigation | reflog; `git diff --name-status 8cf6b82 fed8ed1` against pre-edit status; blob hashes; repair-2 manifest recheck | commit 18:41:04Z; 80/80 paths, 0 outside; 9/9 blobs equal pre-edit; recheck shows only lead-12 and repair-3 drift | `head-drift-fed8ed1.log`, `-name-status.txt`, `-compare.json`, `head-drift-repair-2-manifest-recheck.log` | pre-edit content at fed8ed1 | self |
| Instruction binding (AC-12) | SHA-256 of every path listed in `docs/workflow/inventories/4.1.0-local-1.md` | 22 of 22 match at 19:23:41Z | `instruction-inventory-check.log` | final | self |
| AC-12 snapshot binding | `node _local/project/evidence/writing-studio/1b-2a-repair-3/snapshot-capture.mjs` with its output kept outside the evidence directory, then `--check`; expect manifest, patches and 0 drift | re-capture 0: 12 entries, 88 local evidence, none missing, tracked and slice patches byte-identical to the first capture; `--check` 0 at 19:24:43Z, 0 drift. The first capture (`76b2c09a...`) redirected its output into its own evidence log and recorded that log while still empty (0 bytes), so its recheck at 19:23:52Z exited 1 with that single drift | `snapshot/`, `snapshot-first-manifest.json`, `snapshot-capture.log`, `snapshot-recheck.log`, `snapshot-first-recheck-cause.log`; `snapshot-recapture.log` and `snapshot-recheck-final.log` copied in after capture | final | self |

- Executor identities and target: every row `self`, this Worker session, configured local runtime, disposable fixtures.
- Runtime coverage: producer joins through the real Python join and receipt code for every clamp limit, intro/outro order, eligibility edges, rounding and both fallbacks, each valid case paired with coherent mutations where one fits; consumer refusals for missing, null, non-object, negative, NaN and inconsistent provenance; older documents (simulated and genuine repair-2) read and replayed unchanged; bookend-free saves. Real media: this installation's bridge takes `hardcut`; the real crossfade branch is covered by the Python ASS-path media test.
- Human assistance: none. Isaac reported the accidental commit unprompted; its content was verified independently above.
- Not applicable: preview, cleanup and smoke scripts and a Studio walkthrough (no UI, route, CLI, MCP or Cleanup change); live AI smoke (no AI call).
- Not run: none of the required checks.
- Changed inputs after checks: none. Snapshot captures, their rechecks, the inventory check and this report followed.

## Change inventory

Git-derived against HEAD `fed8ed1` (`snapshot/git-status.txt`; `git diff --stat`: 9 files, 318 insertions, 29 deletions):

- `backend/services/exact_render.py`: `_join_input` validation; `bookend_region` records `join_inputs`.
- `src/services/clip-revisions.ts`: `concatJoin`, join-provenance validation, removed bounds check, module contract text.
- `src/models/index.ts`, `src/models/clip-revisions.ts`: `RenderTimelineJoinInputs`, optional `join_inputs`, compatibility comments.
- `src/services/clip-revisions.test-support.ts`: fake join inputs and eligibility.
- `src/services/clip-revisions.test.ts`: refusal regex, 3 provenance cases, corrected crossfade case, fallback case, older-document test.
- `tests/test_exact_render.py`: `JoinProvenanceTests` (4 tests) and join assertions in two real-media tests.
- `scripts/verification/check-exact-render.mjs`, `check-saved-revision.mjs`: real join-input assertions; stripped-receipt step.
- New: `scripts/verification/fixtures/exact_join_matrix.py`, `src/services/clip-revisions.producer-test-support.ts`, `src/services/clip-revisions.join-matrix.test.ts`.
- Ignored evidence under `_local/project/evidence/writing-studio/1b-2a-repair-3/`: plan, pre-edit capture and copies, base-change records, reproduction logs and hashes, demo and results, repair-2 consumer mirror (4 pre-edit files plus copied support modules), all check logs including diagnostics, audit, inventory check, snapshot script, both captures and their rechecks, and `snapshot/`.

No `strict_ai.py`, dependency, lockfile, configuration, route, UI, Cleanup, migration, installed instruction, lead-owned record or earlier report changed. Reviewer artifacts are byte-identical.

## Deviations and decision requests

None requiring a lead decision under lead-12. Delegated choices and corrections for review:

- The outro-main check against the intro's `measured_output_duration` is a same-probe relationship. The non-asset inputs otherwise have no rounded copy in the receipt, so they are checked for type and used for the clamp, not compared with content video end through composition or A/V slack (real data: main 2.09 s against video end 2.04 s).
- Join inputs must be non-negative in both producer and consumer.
- The stripped-receipt bridge step runs last so earlier step counts are unchanged.
- Plan corrections: the plan listed 11 mutations and said old bounds accepted all of them; the table has 13, and the repair-2 consumer accepted 11 (demo section C).

## Limitations and findings

- Defects: WS-16 continued occurrence repaired in product code, pending fresh review. The fake renderer's producer-impossible crossfade receipt (above) is corrected as prevention. Authoring defects fixed before handback, logs retained: `join_inputs` omitted from the return dictionary in the first producer edit (`python-exact-run1.log`, 31 KeyError failures); matrix mutation count 11 instead of 13 (`node-focused-run1.log`); `pre-edit-capture.json` first omitted `exact_render.py` through an argv slice and was regenerated before any edit; the first snapshot capture recorded its own redirected log while empty and was re-captured (`snapshot-first-recheck-cause.log`).
- Uncertainty: the matrix controls probe and FFmpeg I/O and proves the contract, not media timing; the 0.002 allowance cannot separate overlaps closer than that to the clamp; join inputs are the producer's recorded values, including its 30.0/0.0 probe defaults, not a new measurement guarantee. For an outro-only join, or an intro's appended input, a fabricated value outside the real producer could still justify a wrong clamp; closing that would need another recorded relationship, which is a lead decision.
- Out of scope: commit `fed8ed1` carries an unrelated message and includes the separate `strict_ai.py` change and all earlier uncommitted Writing Studio work. Rewording it would change the commit id; tree `b0d7d5c8...` and the manifest hashes still identify this base. The reviewer script leaves fixture directories in the review folder when rerun.
- Proposed durable corrections: document join provenance, the producer fixture and the new bridge step beside the existing check descriptions in `docs/local-setup.md` (an inventory-hashed installed context file, so not edited here); the ledger records WS-16's third occurrence with prevention destination the producer-derived matrix. The lead reconciles both.

## Handoff

- Checkpoint or actual handoff: handed off, 2026-09-14, this Worker session. Implementation writes stopped at this report.
- Current implementation owner: returns to the coordinating Project Lead for fresh independent follow-up; not self-accepted.
- Current snapshot: HEAD `fed8ed1` plus `_local/project/evidence/writing-studio/1b-2a-repair-3/snapshot/` (manifest `a237483a...`, tracked patch `6b5b57bf...`, slice patch `a06b4a83...`).
- Unfinished work and unresolved findings: none in this correction's scope. WS-03/04/05 and legacy WS-06/09 remain open; 1B.2b not started.
- Last failed approach: none in final product code; the omitted return field was found by the first focused Python run and fixed.
- Next action and owner: the coordinating lead arranges fresh independent follow-up of this snapshot against lead-12 and inventory 4.1.0-local-1, then disposes WS-16 and B2A-4/6. This is the post-reassessment budget; an unresolved result needs explicit disposition or reassessment, not an automatic repair loop. No commit, push, release, 1B.2b or production opt-in was made or is authorized here.
- Pending Isaac decision: none for this cycle. Whether to reword the accidental commit message is optional housekeeping for Isaac and the lead.
- Durable decisions: none (no ADR).
- Manifest recheck (2026-09-14T19:24:43Z): `node _local/project/evidence/writing-studio/1b-2a-repair-3/snapshot-capture.mjs --check` exit 0, `checked 12 files, 88 localEvidence, 11 contractInputs, 16 workflowFiles: 0 drift; HEAD fed8ed13dcb2aade06bee341953d6b10d58bff13`, no status line outside the recorded snapshot (this report's untracked line was recorded at re-capture; the report is excluded from file entries by design). Updating this report's snapshot references afterwards is the only later write.
