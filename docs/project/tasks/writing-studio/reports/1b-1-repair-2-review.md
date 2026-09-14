# Review: writing-studio / 1B.1 repair 2

## Review identity and coverage

- Task/spec: `spec.md` lead-6, `handoff-1b-1.md`, repair-1 and repair-2 handoffs; independent follow-up on R1/R2 retention, R3a/R3b, publication design and regressions, B1-4 / AC-3 and relevant B1-2/B1-3 / AC-9/AC-11 subsets.
- Workflow: installed 4.0.6, Project Lead review-only procedures. Read AGENTS.md, README, contract, selected role, CLAUDE.md, local setup, review template and findings ledger. README is locally customized; retained CLAUDE.md has unknown original provenance reconciled for 4.0.6. No selected domain references.
- Snapshot: HEAD `8cf6b82039381e62b0f1dac1953c0c8c279e86f1`, plus `_local/project/writing-studio/1b-1-repair-2-snapshot/1b-1-repair-2-tracked.patch`, SHA-256 `14f2219a6e3741174eab3bc29827b7b35d305f3fbe9c14d248d04e8924b8abd3`, and `manifest.json`. Independently inspected Git status/diff inventory and hashed all 55 entries (39 files, 9 local evidence, 6 workflow, patch). Only spec.md differs, matching the coordinating lead's announced Status-only update. Implementation inputs match. Compared repair-1/repair-2 manifests: changed implementation/check files are clip_generator.py, tests/test_exact_render.py, check-exact-render.mjs and local-setup.md; spec/ledger differences are coordination. Accepted 1A and earlier 1B changes remain predecessor work in this uncommitted tree.
- Reviewer: Codex `/root/review_1b1_repair2`, Project Lead, review-only; 2026-09-13 America/Chicago. Fresh subagent without inherited planning or implementation conversation, no authorship. Requirements and actual publication/test changes were inspected before author justification. Only this durable report and ignored reproduction evidence were written; no implementation/shared-record edits or delegation.
- Depth: focused risk-based follow-up. Inspected clip_generator planning/publication/finally paths; exact_render composition validation; video_processor synchronized fallback; main.py transcript/bridge behavior; PythonExecutor/result-type dependencies; exact tests (including actual-media coverage), bridge script, runtime harness, manifests and prior/current receipts.
- Limits: no user media, UI, Library, migration, AI or release testing. Full Python suite, real bridge and preview parity evidence were inspected rather than independently repeated in full. Focused independent suite includes real encoded-media tests and real child processes. Fault injection targets Python filesystem calls on real disposable files, not actual Windows ACL/sharing violations. VFR precision and real-face tracking limits remain. Process interruption is not power-loss durability or guaranteed delivery of a bridge result.

## Verification assessment

- Required evidence: **fail for acceptance on the setup cleanup contract below**. The prior destructive-publication defects are closed by the redesign; passing checks do not cover the newly identified setup failure.
- Inspected Worker full-suite log: start `2026-09-13T05:35:56.449Z`, exit 0 `05:36:35.923Z`, **969 passed, 6 skipped, 220 subtests passed**. Inspected bridge result `_local/clipperz/tmp/exact-render-d3aFQr/result.json`, script assertions for grouped paths/decoded markers/same-title preservation and transcript provenance; preview result `_local/clipperz/tmp/preview-render-YjYgPj/result.json` records identical decoded video/audio. Inspected the adapted demonstration's logged JSON in `_local/installation/logs/repair-2-1b-1-demo.log`; did not need direct access to its separate saved result.json. Retaining Node/build/client-type evidence is proportionate: those source/dependency inputs are unchanged from the prior snapshots, and the new layout flows through existing string paths and generic bridge JSON.

| Independent check | Result and evidence |
|---|---|
| `node scripts/verification/run-tests.mjs python -k exact_render` | Initial sandbox startup denied before tests (harness exit 1; child log 101). Approved configured-runtime rerun exit 0: **69 passed, 906 deselected, 63 subtests passed in 28.75s**. `_local/installation/logs/step-4-python-tests.log`, start `05:45:51.330Z`, fixture `python-jcX2nJ`, exit `05:46:20.474Z`. |
| `node scripts/installation/run.mjs python review-1b-1-repair-2-repro _local/project/writing-studio/1b-1-repair-2-review-repro.py` | Exit 0; production generate_clip raises injected staging mkdir denial, leaves one empty operation parent, supplies no residual note, preserves earlier flat/group bytes, cleans work temp. `_local/installation/logs/review-1b-1-repair-2-repro.log`, `05:46:31Z`. |
| Snapshot hash comparison | All 55 entries inspected; only announced spec Status drift. |

Reproduction SHA-256: `a579ba6df7b917e9083a37ee884a899cb5ea92a72115f0e04d869d3354ef565e`. It reuses the existing stub-media publication fixture, runs real directory operations apart from the denied staging mkdir, asserts the actual defect, and removes its disposable fixture after recording the result. Human assistance: none. Configured-runtime escalation was needed for executable access, not to bypass a product failure.

## Findings

| ID / importance | Location in reviewed snapshot | Failure condition and impact | Evidence | Required outcome / status |
|---|---|---|---|---|
| R1 / retain closure | backend/main.py:193-202 | Exact omission/null remain unavailable; explicit empty remains supplied-empty; legacy default unchanged. | Unchanged input hash, inspected handler, independent exact tests and refreshed bridge receipt. | Closure retained. |
| R2 / retain closure | exact_render.py:438-456; video_processor.py:3231-3250; clip_generator bookend call sites | Synchronized-only helper calls plus semantic rejection prevent an incompatible branch from becoming a successful exact receipt. | Unchanged helpers/bridge; independent small-overlap intro/outro refusals, synchronized controls and media cases pass. | Exact closure retained; legacy WS-09 remains open. |
| R3a / close recommendation | clip_generator.py:894-978, 1800-1870 | Persistent publication failure now affects a fresh owned group only. No prior output is moved, so preservation does not depend on restoring to a failed destination. | Real-file persistent-failure matrix passes independently with and without prior flat/group outputs. Repeated and two-child-process cases yield separate complete groups. | Prior R3a closed. |
| R3b / close recommendation | clip_generator.py:854-864, 1871-1880 | Completion callback and stderr failure no longer escape after successful publication. | Independent enclosing-operation test with both channels failing returns all three final paths and preserves earlier outputs. | Prior R3b closed. |
| **R4 / P2 — output-group setup escapes owned cleanup** | **clip_generator.py:934-940, 1805; cleanup protection starts at 1853** | Parent mkdir succeeds but staging mkdir fails (e.g. denied directory creation or exhausted directory allocation). create raises before returning the group and before the cleanup-protected block. An empty operation directory remains even when its removal is allowed; it is neither removed nor identified as residual. Repeated failed requests accumulate unreported directories. | Independent production-render reproduction: `empty_group_left: [overlay_short-20260913T054631Z-58756-f138f213]`, `notes: []`; prior outputs intact, work temp removed. Source proves discard is never reached. | Cover ownership from the first successful parent creation: remove the owned parent on later setup failure; if removal is denied, identify the residual while preserving the original failure. Exercise staging-directory creation failure, including cleanup denial. **Open.** |

R4 is a preparation-cleanup defect under the repair-2 handoff's explicit failure/residual contract, not evidence of prior-output loss or partial final publication. It does not justify returning to backup/rollback or rejecting the new layout. The Worker's statement that failure between group creation and first copy leaves an empty group that discard removes is incorrect for staging mkdir failure; correct it through a dated addendum or successor report.

The design is otherwise appropriate to the approved preservation requirement. Exclusive mkdir arbitrates collisions across processes; one same-volume directory rename publishes the requested group. The child interruption test leaves staging with no final directory, while prior files remain intact. The test suite's additional complexity covers demonstrated failure/concurrency boundaries. The missing boundary is acquisition of the group itself, not the number of tests. Ordinary optional reporting is guarded; external process death and unavailable stdout cannot establish result delivery and remain properly excluded.

Non-blocking: the broader `RenderTimelineBookend.branch` union remains an over-broad exact consumer type; retain the planned 1B.2 refresh. Grouped output layout and residual recognition must likewise inform that refresh. No current public caller enables exact mode, so flat-output discovery compatibility is not required for this repair.

## Recurrence and prevention

Read [findings ledger](../../../findings-ledger.md). Recommend marking WS-10's prior R3a/R3b destructive-publication occurrences resolved on this snapshot, retaining their regression tests. Index R4 separately as the first confirmed exact output-group setup cleanup occurrence, linked to WS-10's enclosing-operation prevention and WS-07's related ownership-cleanup history; do not portray it as another demonstrated prior-file loss. WS-06 exact R1 and WS-09 exact R2 closures remain; their legacy scope and other task findings remain unchanged.

Proposed prevention: a focused acquisition-failure regression in tests/test_exact_render.py covering parent-created/staging-denied and denied cleanup, with the original error preserved and residual identified. Small local test/helper coverage, no universal workflow or skill change. Proposed durable correction: attributed report clarification of the setup cleanup claim. Coordinating lead owns reconciliation; reviewer made no ledger/shared-report changes.

## Reviewer recommendation

- **Request changes for R4.** Recommend closing prior R3a/R3b and retaining R1/R2 closures. No remaining evidence of the original destructive-publication failure on this snapshot.
- Required correction: complete owned cleanup/residual handling across group acquisition, with proportionate affected evidence. Existing green media/concurrency evidence can be retained while its inputs remain applicable.
- Next action for coordinating lead: dispose R4 and reconcile closures separately from overall acceptance. Apply the existing second-unsuccessful-review reassessment rule conservatively before any further assignment; reassessment should explicitly recognize that the publication design now preserves prior outputs and the remaining issue is a bounded setup ownership gap. No automatic repair loop, 1B.2 acceptance, commit or release follows from this review.

## Coordinating lead disposition and next action

2026-09-13, coordinating Project Lead (Codex): retain R1/R2 closures and close
R3a/R3b on this bound snapshot. Accept R4/P2 as supported by source and the
independent production-render reproduction/log: cleanup protection does not cover
staging mkdir after acquiring the parent. Previous files are preserved; the gap
is unreported owned residue. Overall 1B.1 remains changes-requested solely for R4.

Reassessment after two repair cycles is complete. The publication design satisfies
the prior preservation issues and is retained; a small setup ownership correction
is required, without restoring backup/rollback or expanding into revisions/Cleanup.
Spec lead-7 and ../handoff-1b-1-repair-3.md record one bounded manual assignment,
followed by fresh independent review. No application edits or Worker dispatch by
this lead. Ledger WS-10 is resolved; WS-11 indexes R4 separately.

The setup-cleanup claim is clarified by an attributed Worker-report addendum.
1B.2 remains pending; its refresh must preserve full transcript input and assess
group/reference ownership, interrupted/empty staging and the exact consumer type.
Directory shape alone cannot establish that a group is inactive and collectible.
No commit, push or release performed.
