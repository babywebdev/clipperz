---
record: "implementation-report"
task: "writing-studio"
cycle: "1b-2b-3-correction-1"
spec_revision: "lead-24"
snapshot: "_local/project/evidence/writing-studio/1b-2b-3/correction-1/snapshot/manifest.json"
author: "agent"
date: "2026-09-23"
state: "historical"
summary: "Correction-1 complete: DR-1 test file equals the approved proposal, unresolvable targets get the could-not-confirm refusal, record() refuses revisions. Full Node 776/776 and full Python pass; B2B3-1..5 checks pass."
read_when: "Reviewing Writing Studio 1B.2b.3 on its final snapshot, or tracing an unresolvable-path or record() refusal."
evidence: "_local/project/evidence/writing-studio/1b-2b-3/correction-1/"
workflow_version: "5.0.0"
instruction_inventory: "docs/workflow/inventories/5.0.0-local-1.md"
---


# Implementation Report: writing-studio / 1b-2b-3-correction-1

Successor to the frozen lead-23 records [`1b-2b-3-implementation.md`](1b-2b-3-implementation.md) and [`1b-2b-3-self-audit.md`](1b-2b-3-self-audit.md), which stay as the initial cycle's record.

## Identity and freshness

- Implementation author: the 1B.2b.3 implementation session (Claude Code desktop, claude-opus-5-5), resuming its stopped writes for correction-1 by Isaac's relay; author of the lead-23 fence it corrects.
- Execution profile and context mode: claude-opus-5-5, effort not exposed; continued context from lead-23. No difference from README.
- Spec path and bound revision: `docs/project/tasks/writing-studio/spec.md` at lead-24 (sha256 `ebe516c0…`, matching the task-state `lead/records-post-lead-24.sha256`; not edited here).
- Code snapshot and snapshot evidence: base `fed8ed13dcb2aade06bee341953d6b10d58bff13` plus `correction-1/snapshot/manifest.json` (sha256 `a7048a8bc353bc06a573d265014d51eb74c573a9a455a6775bf01b1100c180cd`): full tracked patch against HEAD (`c812a3e8…`), 70 untracked copies, 74 hashed contract inputs including the rebuilt `dist/` modules, and this correction's own delta (`1b-2b-3-correction-1-delta.patch`, `dcb1571a…`) against pre-edit copies verified against `b88984be…`. `snapshot-check-post-checks.log`: "No drift." after every check. Helper: `correction-1/snapshot-capture.mjs`, derived by `make-snapshot-helper.py` without editing the lead-23 helper.
- Environment/target: as lead-23 (`correction-1/runtime-versions.log`: Windows 11 Home 10.0.26200, Node v24.21.0, Python 3.14.3, FFmpeg 8.1.1); built server under the local profile on a verified free loopback port (never 3847), isolated fixture storage, real CLI and bridges. No provider call; no browser proof claimed.
- Plan freshness: before edits, the lead-23 helper's read-only check showed drift only in the lead-24 `spec.md`/`spec-log.md` and in the tracked patch, whose per-file compare differs only in those two files (`binding/pre-edit-snapshot-check.log`, `binding/tracked-patch-compare.txt`); the byte copies of every file this correction could touch match `b88984be…` (`binding/pre-edit-copies.txt`). No relevant drift.
- Resume before task-state reconciliation: Status (lead-24) names this session as writer with correction-1 pending; the lead-23 handoff, the owner's `lead/handback-audit.json` and the tree agree. Nothing unreconciled.
- Implementation: implemented
- Verification: pass
- Submitted for review: yes; the fresh non-author review and task-state disposition remain.

## Execution Receipt

Evidence paths are relative to `_local/project/evidence/writing-studio/1b-2b-3/correction-1/`; "final" is the snapshot above.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| Plan freshness | `node ../snapshot-capture.mjs <root> --check` plus a per-file compare of `git diff HEAD --binary` with the `b88984be` patch; expect drift only in lead-24 records | drift only `spec.md`, `spec-log.md` (and their tracked-patch sections); pre-edit copies 14 of 14 match | `binding/` | pre-edit tree | self |
| B2B3-5 DR-1 identity | sha256, Git blob and `cmp` of `src/services/clip-revisions.test.ts` against the approved proposal; expect `281163f7…`, `b351951e…` | `281163f7…`, blob `b351951e…`, byte-identical | `final/dr1-identity.txt` | final | self |
| B2B3-2 record refusal | `src/services/clip-write-fence.test.ts`: `record()` with an own `revisions` key (object, undefined, null) rejects `CLIP_REVISION_TRACKED` with the start message; history bytes unchanged; a missing history file stays missing; a record without it succeeds | pass (focused row) | `final/node-focused-run1.log` | final | self |
| B2B3-4 unresolvable (unit) | Focused Node: dangling junction gives verdict `unresolvable` with an error code name, owned and missing-root targets `owned`, outside null; `remove` of a dangling pointer rejects with reason `unresolvable`, the could-not-confirm message and `errorCode`, owned pointers keep the owned message; route guard answers 409 with it for every media route and DELETE; CLI output mapping recovers the reason; MCP text is `Not deleted (REVISION_PATH_PROTECTED): <could-not-confirm>`; TS and Python field sets, directory names and all four messages equal. Python: verdicts, `delete_clip`, `bake-thumbnail`, `swap-thumbnail` and `clips delete` print the could-not-confirm wording; owned targets the owned wording; wording contains the spec's elements | pass | `final/node-focused-run1.log`, `final/python-full-run1.junit.xml` | final | self |
| B2B3-1..4 HTTP, including lead-24 rows | `node scripts/verification/check-revision-fence.mjs --controls ../pre-change/controls.json --result final/check-result.json` (existing lead-23 capture): all lead-23 assertions, plus owned wording on every owned-path refusal, and a dangling-junction pointer refused through logo, thumbnail/render, rerender, DELETE and CLI delete, and `bake-thumbnail`/`swap-thumbnail` on it, with wording checked against the spec's elements; logs: owned lines carry `"reason":"owned"`, unresolvable lines `"reason":"unresolvable"` and an error code name, no path | **0**, `Passed`: 40 HTTP and 16 CLI tracked refusals, 20 + 10 owned-path refusals, 7 unresolvable refusals (junction created), both barriers 409, 62 refusal log lines (16 owned, 4 unresolvable with `ENOENT`), 14 controls match | `final/check-revision-fence-run1.log`, `final/check-result.json` | final | self |
| Focused Node | `node scripts/verification/run-tests.mjs node` with the fence, cross-process, route, MCP, clips-history (3), server-policy, policy, editor-context-route and all five `clip-revisions*.test.ts` suites | **0**: 15 files, 359 passed | `final/node-focused-run1.log` | final | self |
| B2B3-5 full Node | `node scripts/verification/run-tests.mjs node`; expect 0 | **0**: 47 files, 776 passed | `final/node-full-run1.log` | final | self |
| B2B3-5 full Python | `node scripts/verification/run-tests.mjs python` (whole suite; fence tests 9 of 9) | **0**: 1343 tests, 0 failures, 6 skipped | `final/python-full-run1.log`, `final/python-full-run1.junit.xml` | final | self |
| B2B3-5 build | `node scripts/installation/run.mjs npm build run build` | **0** | `final/build-run1.log` | final | self |
| B2B3-5 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json` | **0** | `final/client-types-run1.log` | final | self |
| B2B3-5 py_compile | `node scripts/installation/run.mjs python py-compile -m py_compile backend/services/clips_history.py tests/test_revision_fence.py` | **0** | `final/py-compile-run1.log` | final | self |
| B2B3-5 protected sources | `python protected-sources.py` | all 13 non-test sources match; among protected inputs only `src/services/clip-revisions.test.ts` changed, equal to the proposal | `final/protected-sources.json` | final | self |

- Rows carried from lead-23 unchanged, not rerun: the pre-change capture (`../pre-change/`, reused as the assignment directs) and the seam audit (`../final/seam-audit.txt`; no caller changed, and `record()` now refuses `revisions`). See the lead-23 report for their receipts.
- Executor identities and target: every row is this session on this checkout; no subagent or delegation.
- Human assistance: none. Not applicable: browser proof. Not run: none.
- Changed inputs after checks: none. Before the formal runs, a scratch Python run and a scratch check run passed on the same code and check script (`scratch/` holds the check run).

## Change inventory

This correction only, from `1b-2b-3-correction-1-delta.patch` (no files added):

- `src/services/clip-revisions.test.ts` (+4/-2): DR-1, byte-identical to the approved proposal.
- `src/services/clip-write-fence.ts` (+71/-22): `FENCE_MESSAGES` (tracked, owned, unresolvable, start); `revisionPathVerdict` with reason and error code name; error carries `reason`/`errorCode`; `assertLegacyRecordAllowed`.
- `src/services/clips-history.ts` (+3/-1): `record()` refuses an own `revisions` key before any write.
- `src/ui/clip-write-fence-route.ts` (+18/-7): refusal log adds `reason` and `error_code`; `cliFenceRefusal` replaces `cliFenceCode` and recovers the unresolvable reason from the shared CLI wording.
- `src/ui/web-server.ts` (+8/-8): renamed mapping call sites only.
- `src/server.ts` (+4/-1; mixed line endings preserved byte for byte): MCP refusal log adds the same reason fields.
- `backend/services/clips_history.py` (+57/-22): same messages, `revision_path_verdict`, error `reason`/`error_code`.
- Tests: `src/services/clip-write-fence.test.ts`, `src/ui/clip-write-fence-route.test.ts`, `src/server.clip-fence.test.ts`, `tests/test_revision_fence.py`; check: `scripts/verification/check-revision-fence.mjs` (+71/-12).

## Deviations and decision requests

None. The CLI prints the reason only through its wording; the error code name reaches the logs for TS-detected refusals (the route guard, which checks first, and MCP), not for the rarer Python-first refusal behind a route. The spec makes the log reason optional.

## Limitations and findings

- New behavior, as lead-24 states: an untracked clip whose target exists but cannot be resolved is refused, deletion included, until the path resolves or is missing.
- Lead-23's U-1 (hard links, junction swaps after the check) and the batch-recipe note stand, dispositioned by the task-state owner for successors.
- No new defect found.

## Handoff

- Checkpoint or actual handoff: handed off 2026-09-23 by this session.
- Current implementation writer: this session; writes stopped at handoff.
- Current snapshot: `_local/project/evidence/writing-studio/1b-2b-3/correction-1/snapshot/manifest.json` (`a7048a8b…`).
- Unfinished work and unresolved findings: none for correction-1.
- Last failed approach: none.
- Next action and owner: the task-state owner arranges the fresh non-author review `reports/1b-2b-3-review.md` of this snapshot.
- Pending Isaac decision: none.
- Durable decisions: none.
