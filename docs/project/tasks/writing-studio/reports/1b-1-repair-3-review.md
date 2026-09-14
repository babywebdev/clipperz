---
record: "review"
task: "writing-studio"
cycle: "1b-1-repair-3"
spec_revision: "lead-8"
snapshot: "_local/project/writing-studio/1b-1-repair-3-snapshot/manifest.json"
author: "reviewer"
date: "2026-09-13"
state: "active"
summary: "Recommend accepting the bounded repair and closing R4/WS-11; independent exact tests and setup-failure demonstration pass. Prior exact closures remain applicable."
read_when: "Disposing repair-3 R4/WS-11 or refreshing the next Writing Studio slice."
evidence: "_local/project/writing-studio/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---

# Review: writing-studio / 1b-1-repair-3

## Review identity and coverage

- Reviewer: Codex fresh subagent `/root/review_1b1_repair3`, Project Lead review-only, 2026-09-13. No inherited implementation conversation, authorship, repairs or delegation. One bounded review.
- Requirements: spec lead-8 current renderer/publication requirements, B1-4 / AC-3 and relevant AC-9/AC-11, baseline/exceptions and repair-3 handoff. Read installed startup/core/role/context, applicable procedures, metadata schema and inventory; no selected domain reference. Requirements and actual helper/tests were inspected before Worker justifications.
- Snapshot: HEAD `8cf6b82039381e62b0f1dac1953c0c8c279e86f1`, manifest above and `1b-1-repair-3-tracked.patch`, SHA-256 `e79ad677ca6012c09ffc24892a0b93f59e9bb676642fd7d7f33426b2ba5002e0`. Independently checked all 87 entries: only announced lead bookkeeping in spec.md/spec-log.md differs. Current lead-8 requirements remain unchanged. Binding result: `_local/project/writing-studio/1b-1-repair-3-review-binding.json`.
- Inspected Git inventory; renderer acquisition/publication/finally paths; helper and production-path regressions; runtime harness; predecessor review/disposition; current receipt, demonstration and logs. Compared relevant repair-2 hashes: exact_render.py, main.py, video_processor.py, bridge check and TS result model unchanged. Git confirms manifests/runtime runners unchanged. New application changes remain clip_generator.py and test_exact_render.py.
- Limits: focused repair review, not full-feature/UI acceptance. No live ACL/sharing-violation, power-loss, AI or user-media tests; filesystem faults are injected on real disposable directories. Full suite/bridge evidence assessed rather than independently rerun. Existing VFR, tracking and successor consumer-type limitations remain.

## Verification assessment

Required evidence: **pass for this bounded repair**. Worker execution identity remains its recorded Claude Code session; the following independent executions are reviewer `self`, configured Windows local runtime, disposable fixtures only. No human assistance.

| Check / IDs | Actual result and evidence |
|---|---|
| `node scripts/verification/run-tests.mjs python -k exact_render` — B1-1 through B1-4 subsets | Approved-runtime run exit 0: **73 passed, 906 deselected, 67 subtests**, 31.17s, fixture `python-0ei8vq`, 20:35:34Z. `_local/project/writing-studio/1b-1-repair-3-review-tests-approved.log`. Initial sandbox attempt could not start Python; saved separately as `1b-1-repair-3-review-tests.log`, not a product failure/pass. |
| `node scripts/installation/run.mjs python repair-3-1b-1-review-demo _local/project/writing-studio/1b-1-repair-3-demo.py` — B1-4 / AC-3 | Exit 0, 20:36:30Z. All four persistent staging-denial cases pass: prior outputs present/absent, cleanup allowed/denied. Original error retained, one owned cleanup, prior group never removed; allowed leaves nothing, denied reports its empty residual. `_local/installation/logs/repair-3-1b-1-review-demo.log`. |

Inspected Worker historical logs: before-repair reproduction demonstrates unreported residue; after-repair obsolete assertion fails as expected; corrected demo and py_compile exit 0. Full Python log at 19:37:05Z–19:37:44Z records **973 passed, 6 skipped, 224 subtests**, exit 0. Bridge log exits 0; inspected `_local/clipperz/tmp/exact-render-DY4upe/result.json` and assertions covering media/words/group preservation. Retained legacy parity/Node/build/types are proportionate: covered inputs unchanged, acquisition helper is exact-only, and fresh bridge evidence rechecks legacy default. Historical results retain their original provenance; workflow refresh alone proves no application acceptance.

## Findings

No new actionable finding identified within this coverage.

**R4 / WS-11 closure verified:** `clip_generator.py:940-949` now catches staging mkdir failure after exclusive parent acquisition, calls existing discard, then re-raises the original exception. Denied removal reports the owned residual at `:969-996`. Unsuccessful parent creation reaches no discard. The tests exercise real output directories and unchanged prior flat/group bytes, not merely mocked call counts; collision/exhaustion, persistent publication faults, reporting failure, child interruption and same-title process schedules also pass. Added complexity addresses the demonstrated lifecycle gap without redesigning publication.

Retain R1/R2 and R3a/R3b closures: underlying transcript/transition contracts and group publication are unchanged; focused regressions pass. No prior-output loss or partial publication observed.

## Recurrence and prevention

Read ledger Open and Closed; no findings-ledger-archive.md exists. Recommend closing WS-11 on this snapshot with this report and the four added regressions in tests/test_exact_render.py. Retain related WS-07/WS-10 closures; no new occurrence. Other open classes and legacy WS-06/09 remain unchanged. Later Cleanup must establish ownership/activity; directory shape alone cannot authorize collection. No shared record edited.

## Reviewer recommendation

**Accept the bounded repair and close R4/WS-11.** No remaining correction or evidence gap found for 1B.1 repair-3. Coordinating lead should reconcile disposition, ledger and 1B.1 acceptance separately from broader feature work. No later-slice implementation, commit or release follows from this recommendation.

## Coordinating lead disposition and next action

- Coordinating lead: existing Codex Writing Studio lead, 2026-09-13; workflow 4.1.0.
- Disposition: accept repair-3 and close R4/WS-11 on the bound snapshot. Source,
  independent 73-test/67-subtest run and four-case demonstration support cleanup
  from acquisition, original-error preservation and truthful residual reporting.
  The existing collision/publication/process regressions preserve earlier closures.
- 1B.1 acceptance: accepted for B1-1 through B1-4, with unchanged R1/R2/R3 closures
  and applicable earlier media/compatibility evidence. Full Python 973/6 skips,
  syntax and real bridge receipts inspected; retained Node/build/types/legacy parity
  remain justified by unchanged covered inputs. No full-feature acceptance implied.
- Author-lead closure verified by: not applicable; coordinating lead authored no
  application implementation. Fresh non-author closure is this review by
  /root/review_1b1_repair3. Reviewer assessment/provenance remains unchanged.
- Limits retained: injected filesystem faults, no live ACL/power-loss guarantee,
  existing VFR/tracking limitations and deferred exact consumer-type refinement.
- Shared records: WS-11 moves to Closed; current spec records 1A and 1B.1 accepted.
  Repair-3 assignment lifecycle becomes historical because its bounded work is
  complete. Worker/reviewer reports remain accessible evidence, not superseded.
- Next action: coordinating lead refreshes the provisional 1B.2 plan against the
  accepted output layout, full source-word recovery, operation/reference ownership,
  migration/adapters and outstanding legacy findings before another manual handoff.
  No 1B.2 implementation, Worker dispatch, commit, push or release authorized here.
