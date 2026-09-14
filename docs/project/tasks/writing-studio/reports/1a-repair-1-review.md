# Review: writing-studio / 1A repair round 1

## Review identity and coverage

- Task and spec revision: `spec.md` lead-2, `handoff-1a.md`, and `handoff-1a-repair-1.md`; slice 1A subsets of AC-3/AC-6/AC-11, prior R1-R4 and regressions. Later slices are excluded.
- Installed workflow provenance: 4.0.6 project mode per `docs/workflow/README.md`. Contract and Project Lead role are inventoried as unmodified bundle files; README is customized; CLAUDE.md is retained with unknown original provenance, reconciled for 4.0.6. No selected domain references.
- Code snapshot reviewed: HEAD `8cf6b82039381e62b0f1dac1953c0c8c279e86f1` plus `_local/project/writing-studio/1a-repair-1-snapshot/1a-repair-1-tracked.patch`, SHA-256 `4bb784e5fbf9ec9653f6730045b31810294859beae6d86feec7ca30b33763ee6`, and its 18-file manifest including untracked `src/utils/mutation-lock.recovery.test.ts`. Actual Git status/diffs were inspected. Reviewer re-hashed the patch and manifest: only the coordinating lead's authorized spec Status bookkeeping differs; implementation remains bound to the snapshot. Parent independently verified all 18 entries before review and reconciled the preceding commit/line-ending normalization.
- Reviewer session/role: Codex `/root/review_1a_repair1`, Project Lead in review-only mode, 2026-09-12 America/Chicago.
- Review independence: fresh subagent with no inherited planning/implementation history, no implementation authorship, no repairs or further delegation. Requirements, actual protocol, changed code and test design were read before Worker justifications. Only this report and ignored disposable reproduction evidence were written.
- Review depth: focused full assessment of recovery ownership, strict decoding, metrics publication and affected compatibility, because storage exclusivity and lost updates are the slice's primary guarantees.
- Files and dependencies inspected: both mutation-lock implementations and tests, TS recovery suite, both history services and changed tests, atomic-file helper, YouTube sync and tests, cross-process suite and fixtures, relevant CLI/server callers and repository metrics searches, runtime harnesses, local setup, spec/handoffs, prior review/disposition, repair Worker report and evidence, snapshot inventory, findings ledger.
- Coverage limits: no UI, media, live integrations/providers, real user data, or later-slice deletion/revision work. Full suites/build were assessed from Worker receipts (also corroborated by the parent); focused suites were independently rerun. TS recovery tests use async actors with real filesystem operations and mocked scheduling boundaries; paused TS acquisition uses a test-only child that creates the protocol record manually. Python additionally exercises a pause inside production acquisition. These distinctions limit claims about fixture implementation coverage, but do not undermine the inspected removal of the unsafe takeover paths.

## Verification assessment

- Required evidence: **fail** for the complete behavioral contract: R3 remains partially unresolved. Existing required suites are passing on the supported execution path.
- Evidence inspected: [Worker repair report](1a-repair-1-worker.md), relevant test source, saved patch/manifest, `repair-1a-after-reclaim.log`, `repair-1a-after-unknown.log`, `repair-1a-after-metrics.log`, build output and test receipts under `_local/installation/logs/`. Worker reports full Node **266 passed**, Python **894 passed / 6 skipped**, build/type/syntax success; parent corroborated full-suite/build logs. No need to duplicate full-suite execution for this review.
- Human assistance: none. Sandbox denied Python child startup and Node/tsx children encountered `uv_os_get_passwd ... ENOMEM`. Approved execution outside the sandbox resolved these execution restrictions. They are not product defects.

Independent commands, all on the bound implementation:

| Command | Actual result | Evidence |
|---|---|---|
| `node scripts/verification/run-tests.mjs python -k "mutation_lock or clips_history or youtube_sync"` | Initial sandbox exit 1 before tests; approved rerun exit 0, **54 passed, 846 deselected** | `step-4-python-tests.log`, successful start `2026-09-12T08:33:41.042Z`, fixture `python-xC3Hm6` |
| `node scripts/verification/run-tests.mjs node src/utils/mutation-lock.test.ts src/utils/mutation-lock.recovery.test.ts src/services/clips-history.test.ts src/services/clips-history.cross-process.test.ts src/utils/atomic-file.test.ts` | Exit 1: **46 passed**, eight cross-process failures at child startup/barrier waits under sandbox restrictions | `step-4-node-tests.log`, start `08:33:16.481Z`, fixture `node-wfpStA` |
| `node scripts/verification/run-tests.mjs node src/services/clips-history.cross-process.test.ts` | Approved rerun exit 0, **8 passed** | Same log, start `08:34:58.354Z`, fixture `node-8kXxgA` |
| `node scripts/installation/run.mjs python review-1a-repair-metrics _local/project/writing-studio/1a-repair-1-review-metrics.py` | Exit 0; assertions confirm the remaining R3 defect | `review-1a-repair-metrics.log`; output below |

The original retained repros' changed-barrier aborts and old-private-interface `AttributeError` are **not proof of closure**. The repair report correctly distinguishes them. Closure assessment instead uses the revised protocol, positive after-demonstrations, inspected deterministic schedules and independent focused runs. The passing legacy-metrics test requires an unsafe changed-state overwrite, so suite success does not establish the complete R3 contract.

## Findings

| ID / importance | Location and snapshot | Failure condition and impact | Evidence | Required outcome / status |
|---|---|---|---|---|
| R3 follow-up / P2 | `backend/services/integrations/youtube/sync.py:81-98`, especially the missing-timestamp fallback; `tests/test_youtube_sync.py`, `test_legacy_metrics_without_fetched_at_are_replaced` | The sync reads a snapshot, another compatible history writer saves different metrics without the optional `fetched_at`, then the sync publishes. `_is_stale` sees that metrics changed but assumes unknown freshness means older, replacing the intervening update. Both API and CSV use this helper. | Independent public `sync_metrics()` reproduction uses actual `update_clip()` and the actual locked history mutation on a disposable JSON file; only network fetch and learnings are mocked. Intervening `{views:200}` becomes `{views:100,fetched_at:...}`. Existing history schema explicitly makes `fetched_at` optional. | Preserve intervening metrics when freshness cannot be established, e.g. require unchanged expected metrics or a genuinely comparable freshness precondition. Refreshing unchanged legacy metrics must still work. Cover changed legacy/missing/invalid freshness separately from unchanged legacy state. **Open; R3 partially repaired.** |

Reproduction sequence: public sync loads clip A with no metrics; its mocked network fetch calls production `update_clip('a', metrics={'views': 200})`, then returns `{'views': 100}`. Sync's publication runs through production `mutate_clips_history`. The temporary history is cleaned on exit and no provider is contacted. Output:

```text
Applied: 1
Intervening metrics: {'views': 200}
Final metrics: {'views': 100, 'fetched_at': '2026-09-12T08:34:33.869949+00:00'}
Unrelated title preserved: True
Confirmed: intervening metrics without optional fetched_at were overwritten
```

This is a contract/design defect, not a request for different style. The handoff explicitly requires that an intervening metrics update not be overwritten by a stale snapshot. An unchanged legacy record can be refreshed without treating a changed legacy record as provably older. No product scope expansion is needed.

### Prior finding closure assessment

- **R1: closure supported.** Recovery files are acquired with exclusive creation and never automatically reclaimed. The former stale check/rename path and unconditional cleanup are removed. Only one recovery owner can remove a dead main lock; it checks the expected token and dead ownership under that exclusion. A stale outer read is rechecked, and release/removal retries verify tokens. Under cooperating writers, a live owner cannot concurrently release a lock assessed as belonging to a dead process, and competing reclaimers cannot enter the recovery section. Deterministic tests in both languages cover stale observation, a recovery owner paused inside the section, orphaned recovery records, changed ownership and bounded retry exhaustion. Conservative manual recovery fits the approved fallback.
- **R2: closure supported.** Age is no longer used to establish death; missing/unreadable/incomplete records fail closed. Tests establish timeout with preserved bytes, then successful exclusive acquisition after the living owner resumes/releases, including real Python and Node children. Documentation names manual recovery paths. No surviving age-based removal found.
- **R3: partial only.** The original comparable-timestamp out-of-order case is fixed for API and CSV, and deletion/relink/unrelated fields remain protected. Unknown freshness still fails as above. Worker choice 3 knowingly permits this fallback, but does not supply evidence that a changed, timestamp-less value is older.
- **R4: closure supported.** Both strict readers decode bytes before parsing and surface `HistoryReadError/HISTORY_INVALID_ENCODING`; failed mutations preserve bytes. Valid literal U+FFFD, BOM, missing-file, unknown-field and lenient warning behavior retain focused evidence. No encoding regression identified.

The protocol simplification and focused additional tests serve demonstrated requirements. No database, new UI, recursive lock or general framework is required. No additional blocking finding identified within the stated coverage.

## Recurrence and prevention

Read [findings ledger](../../../findings-ledger.md) before finalizing. Proposed updates for the coordinating lead:

- WS-01: link this follow-up; record R1/R2 as independently supported closures, but keep the class open for R3's incomplete publication precondition. This is continuation of the existing defect, not a separate first occurrence. Add a public-path changed-legacy regression beside the current metrics tests; retain an unchanged-legacy success case. Cost is small and localized.
- WS-02: R4 now has independently passing typed-error and exact-byte preservation evidence; closure is supported for this slice.
- WS-07: token-verified retries and passing real contention checks support the ownership-safety follow-up. The Worker-reported fixture release recurrence is not a new product defect. WS-08 no-op compatibility remains passing.
- Proposed durable correction: update the sync module's publication contract/comments when the unknown-freshness fallback is corrected. Retain the revised recovery documentation; no global workflow/skill changes are indicated. The reviewer did not edit the ledger.

## Reviewer recommendation

- Recommendation: **request-changes**. R1, R2 and R4 have adequate closure evidence; R3 still permits a supported lost update.
- Required corrections or unresolved coverage: close the changed-metrics/unknown-freshness case and adjust its existing regression expectation, refresh affected verification and snapshot, then obtain the required follow-up assessment. Preserve successful lock/encoding evidence if those files remain unchanged.
- Next action for coordinating lead: assess this finding and record disposition, reconcile Status/ledger, and use the existing bounded repair budget. This is the review of repair round 1; no acceptance or slice 1B authorization is issued here.

## Coordinating lead disposition and next action

- Coordinating lead: Codex coordinating Project Lead, 2026-09-12 America/Chicago.
- Review: **changes-requested**, with R1/R2/R4 closure accepted on this snapshot.
- Findings disposition: R3 follow-up supported. Lead inspected the public-path
  reproduction, decisive log and `_is_stale` fallback: changed metrics with no
  timestamp are accepted by the history contract and cannot be assumed older.
  R1/R2 protocol simplification and tests satisfy conservative recovery; R4 strict
  decoding and typed errors satisfy byte preservation within the reviewed scope.
- Acceptance basis or blockers: R3 remains open; slice 1A not accepted. Existing
  266 Node / 894 Python passes and independent focused passes retain their coverage,
  but do not negate the reproduced failure. Lead selects strict snapshot-metrics
  equality plus attribution, with no timestamp override, in spec lead-3. Ordinary
  unchanged legacy refresh remains supported. No product decision is needed.
- Lead-authored changes needing separate review: none in implementation. New spec
  decision, Status/ledger bookkeeping, this disposition, and bounded repair handoff
  only. Repaired publication logic still needs independent follow-up.
- Task Status update: lead-3; repair round 1 completed but unsuccessful on R3;
  repair round 2 prepared, no automatic dispatch, no slice 1B authorization. Base
  commit 8cf6b82 reconciled separately; repair remains uncommitted. Prior historical
  no-commit statements describe those sessions, not current Git history.
- Ledger update: WS-01 remains open for R3; R1/R2 closure recorded. WS-02/R4 and
  WS-07 ownership follow-up resolved on the reviewed snapshot; fixture recurrence
  retained with attribution. WS-08 remains resolved.
- Integration/release approval: not granted; no commit/push/release by this lead.
- Hand to the Worker: after Isaac's manual relay, execute
  `../handoff-1a-repair-2.md`, return a successor report/snapshot, and stop for fresh
  independent follow-up. If a second repair round fails on R3, lead reassessment
  is required; no automatic third round. Reviewer assessment above is preserved.
