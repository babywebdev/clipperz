# Worker Report: writing-studio / 1A repair round 1

## Assignment and identity

- Task ID and slice: writing-studio, slice 1A repair round 1, per `handoff-1a-repair-1.md`. Relayed by Isaac on 2026-09-11, activating the conditional Worker ownership recorded in spec Status. Scope: resolve review findings R1-R4 from `reports/1a-review.md` within the original 1A contract (AC-3/AC-6/AC-11 subsets). No slice 1B, UI, or media work.
- Implementation author: Worker (Claude Code session, model Claude Fable 5.1), 2026-09-11 America/Chicago (execution receipts after midnight UTC on 2026-09-12). No subagents dispatched.
- Spec path and revision: `docs/project/tasks/writing-studio/spec.md`, revision lead-2 (2026-09-11), with `handoff-1a.md`, `handoff-1a-repair-1.md`, `reports/1a-worker.md`, and `reports/1a-review.md` including the coordinating lead disposition.
- Installed workflow provenance: bundle 4.0.6, project mode, per `docs/workflow/README.md`. Contract, Worker role, and report template are recorded there as unmodified byte-for-byte copies; their SHA-256 values match `planning-baseline.json` (see the final recheck row in the Execution Receipt). `CLAUDE.md` is retained with unknown original provenance and reconciled for 4.0.6; the README is a customized installation record. No workflow file was changed by this assignment.
- Code snapshot: base commit `8cf6b82039381e62b0f1dac1953c0c8c279e86f1` plus the uncommitted working changes below. Tracked changes are saved as a patch; every changed or untracked file is bound by SHA-256 in the manifest.
- Snapshot evidence: `_local/project/writing-studio/1a-repair-1-snapshot/` (ignored, local): `git-status.txt`, `1a-repair-1-tracked.patch` (SHA-256 `4bb784e5fbf9ec9653f6730045b31810294859beae6d86feec7ca30b33763ee6`, 96,286 bytes, `git diff HEAD`), `manifest.json` (18 entries plus the four local evidence scripts). Implementation-file hashes are also listed inline under Change inventory. This report is excluded from the manifest; it is bookkeeping written after the last check.
- Environment/target: Windows 11 Home 10.0.26200, host `GamingPC`. Configured local runtime from `_local/clipperz/config/clipperz.env` through `scripts/local/runtime.mjs`: Node v24.15.0 (`PODCLI_NODE`), Python 3.14.3 in `_local/clipperz/venv` (`PYTHON_PATH`), pytest 9.1.1, vitest 4.1.10. All test runs used `scripts/verification/run-tests.mjs`, which strips ambient `PODCLI_*` and provider variables and creates a disposable home/data fixture under `_local/clipperz/tmp/step-4-tests/`. No real clip history, media, credentials, or provider calls were involved. Logs: `_local/installation/logs/step-4-node-tests.log`, `step-4-python-tests.log`, `build.log`, `review-1a-*.log`, `repair-1a-after-*.log`.
- Plan freshness check: see Baseline comparison below. Relevant drift: the base commit identity changed (HEAD moved from `710b4d4` to `8cf6b82`, which commits the reviewed 1A implementation unchanged). No design or approval drift; implementation resumed without replanning.
- Implementation: implemented
- Verification: pass on the bound snapshot for every check named below (see Not applicable, Not run, and Limitations for the boundaries of that claim)
- Submitted for review: yes. Acceptance belongs to the coordinating Project Lead after a fresh independent follow-up review; this report does not self-approve.

## Checks named before implementation

Written before any implementation edit. Each row maps a planned check to the 1A contract item it demonstrates (handoff-1a contract items 1-5; slice subsets of AC-3/AC-6/AC-11) and to the review finding it closes.

| Finding / contract item | Planned check | Where |
|---|---|---|
| R1, contract 2 (never release another owner's lock; safe recovery): stale reclaimer must not remove a lock that changed owner | Deterministic schedule with barriers: waiter B reads the dead lock, pauses; A reclaims and acquires; B resumes and must not remove A's live lock; B acquires only after A releases | new `src/utils/mutation-lock.recovery.test.ts`; `tests/test_mutation_lock.py` |
| R1, contract 2: concurrent reclaimers are mutually exclusive | A pauses inside the recovery critical section; B cannot enter recovery, never renames or removes the recovery file, and times out naming it; A completes recovery | same files |
| R1, contract 2: orphaned recovery file fails closed with actionable message | Seed a recovery file with a dead or unreadable record; acquisition times out naming both files; both files byte-identical; manual deletion then allows recovery | same files |
| R2, contract 2: record-less lock is never removed regardless of age | Seed an empty lock aged one day; acquisition times out with owner null and an actionable message; file untouched | same files (replaces the timed-reclaim tests) |
| R2, contract 2: a paused live acquirer is never displaced | Real child process holds the lock file open before writing its record (barrier files); waiter times out; child resumes, records, runs its critical section exclusively; waiter proceeds only after release | `src/services/clips-history.cross-process.test.ts` (Node child and Python child); in-process threaded schedule in `tests/test_mutation_lock.py` |
| R1/R2, contract 5 (bounded retries must not unlink a path that changed ownership) | Removal helper: transient error then success removes; exhausted retries raise; ownership change during retry leaves the file and returns false | `src/utils/mutation-lock.recovery.test.ts`; `tests/test_mutation_lock.py` |
| R3, contract 3 (reconcile fetched metrics against current entry) | Out-of-order completion: a sync that fetched earlier publishes after a newer result; the older result is skipped; an older intervening result is replaced; unchanged and legacy (no fetched_at) metrics are replaced; CSV writer follows the same rule; deletion/re-attribution/unrelated-field cases retained | `tests/test_youtube_sync.py` |
| R4, contract 4 (invalid input aborts mutation without changing bytes) | Invalid UTF-8 inside a JSON string: every mutation aborts with a typed encoding error and identical bytes; a valid literal U+FFFD survives an unrelated edit; BOM, missing-file, unknown-field and lenient-listing behavior retained | `src/services/clips-history.test.ts`; `tests/test_clips_history.py` |
| Reviewer repros (before and after) | The five retained review invocations; before: defects reproduce; after: each defect is absent (scripts assert the defect, so a non-zero exit or explicit "not reproduced" output is the expected after-state) | `_local/project/writing-studio/1a-review-repro.py`, `1a-review-encoding.mjs` |
| Compatibility (AC-11 subset) | Existing lock/history/metrics suites; real TS/Python cross-process suite; full offline Node and Python suites; build; server `tsc --noEmit`; Python `py_compile` of changed modules | configured runtime via `scripts/verification/run-tests.mjs` and `scripts/installation/run.mjs` |

All planned checks were executed; the R2 paused-acquirer check was run in both forms named above.

## Baseline comparison

- Review snapshot recorded by the lead: `710b4d4` plus `_local/project/writing-studio/1a-snapshot/1a-tracked.patch` and its 24-file manifest.
- Current state at start: HEAD `8cf6b82039381e62b0f1dac1953c0c8c279e86f1` ("changes", committed by LucentDev on 2026-09-11 20:50 -0500, that is after the review's execution receipts). That commit contains the complete 1A implementation, the planning records, both 1A reports, and the repair handoff. `git status` showed only three modified lead-owned records (`spec.md`, `findings-ledger.md`, `reports/1a-review.md`, carrying the post-review disposition and Status updates) and nothing else.
- Hash comparison against the 1A manifest: all 22 implementation, test, fixture, documentation and planning entries matched the worktree byte-for-byte (0 drift). The two remaining entries (`spec.md`, `findings-ledger.md`) differ only by the lead's bookkeeping edits made during and after the review, as the review report itself states. The reviewed implementation is therefore exactly the code this repair started from.
- Disposition: no settled-design or approval drift; only the commit identity changed. This report binds to `8cf6b82` plus the new patch. Bookkeeping observation for the lead (not edited here): spec Status still says no commit was performed, while `8cf6b82` exists; the lead owns reconciling that record.

## Design of the repair

Both lock implementations now share this protocol (documented in the module headers and `docs/local-setup.md`):

1. Acquire with O_EXCL and write the owner record. Release removes the lock only while it still carries the releaser's token, re-read before every removal attempt (`removeOwned` / `remove_owned`). This closes the retry hazard named in the handoff: a bounded Windows retry can never unlink a path whose ownership changed meanwhile.
2. A lock with no readable record is never assessed and never removed, however old. Acquisition fails closed at the timeout with a message naming the file and the manual step. This resolves R2: a paused live acquirer looks exactly like this and elapsed time cannot prove it has gone. The 60-second grace and the age computation are deleted.
3. A lock whose record names a provably dead process on this host is removed by one waiter at a time under the recovery file (`<lock>.reclaim`, O_EXCL). Under it the waiter re-reads the lock and removes it only if it still carries the same dead record. The recovery file is released by token like the lock. The rename-aside and unconditional cleanup are deleted.
4. The recovery file is never taken over automatically. Its critical section is one read and one unlink, so an orphan is a crash at that instant; acquisition then fails closed naming both files. This resolves R1 without adding another recursively reclaimed lock.

Why mutual exclusion holds: at most one process creates the lock (O_EXCL). The lock is removed only by its owner (token-verified) or by the single holder of the recovery file who has just read a dead record under it; nobody else can remove the lock in that window and nobody can create one while it exists, so the record cannot change between that read and the removal. A live pid is never assessed dead, and a record-less lock is never assessed at all, so no living acquirer loses its lock. The regression schedules exercise exactly these interleavings with barriers.

Metrics (R3): each fetched result now carries the entry's metrics as seen at snapshot time. Under the lock a result is published only if the attribution still matches and the current metrics are either unchanged since the snapshot or carry an older `fetched_at` than the result. Skipped clips are counted on stderr so a rerun picks them up. Network fetches remain outside the lock; deletion, re-attribution, and unrelated-field protection are unchanged and still tested.

Strict reads (R4): both readers read bytes and decode UTF-8 strictly before JSON parsing. Undecodable bytes raise the typed `HistoryReadError` with the new code `HISTORY_INVALID_ENCODING` and leave the file untouched; Python's previously unwrapped `UnicodeDecodeError` now uses the history error surface. Genuine UTF-8 including a literal U+FFFD, BOM handling, missing-file initialization, unknown fields, and lenient listing with a warning are preserved and tested.

## Execution Receipt

All commands ran from the repository root through the configured runtime. Exit codes are the harness process exit codes. Timestamps are the harness `Started` lines (UTC, 2026-09-12). "Bound snapshot" means no implementation, test, fixture, or documentation file changed after the run; the last such edit preceded 02:14:37Z (see the intermediate-state table for what changed before it).

Before the repair (unrepaired snapshot `8cf6b82`, clean worktree), the reviewer's retained scripts reproduced every defect exactly as the review recorded. Each script asserts the defect and exits 0 when it is present:

| Reviewer command | Result on unrepaired code | Evidence |
|---|---|---|
| `node scripts/installation/run.mjs python review-1a-reclaim _local/project/writing-studio/1a-review-repro.py reclaim` | Exit 0: `Both reclaimers reported success: {'B': True, 'A': True}`, `C live lock removed by A: True` | `_local/installation/logs/review-1a-reclaim.log` |
| `... review-1a-unknown ... unknown` | Exit 0: `B entered while A still held critical section: True` | `review-1a-unknown.log` |
| `... review-1a-metrics ... metrics` | Exit 0: `metrics after older result publishes: {'views': 100, ...}` | `review-1a-metrics.log` |
| `... review-1a-encoding-python ... encoding` | Exit 0: `UnicodeDecodeError`, bytes preserved (the unwrapped error the review flagged) | `review-1a-encoding-python.log` |
| `node scripts/installation/run.mjs node review-1a-encoding --import tsx _local/project/writing-studio/1a-review-encoding.mjs` | Exit 0: `title: '�'`, `corrupt bytes preserved: false` | `review-1a-encoding.log` |

Checks on the bound snapshot:

| Criterion/check | Exact command or runtime steps | Actual exit code/result | Evidence excerpt/path | Code snapshot checked |
|---|---|---|---|---|
| Types (server sources, tests, fixtures) | `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` | 0 | no diagnostics; rerun after the last edit and again after the after-scripts | bound snapshot |
| Python syntax of changed modules, fixtures and tests | `venv python -m py_compile backend/services/mutation_lock.py backend/services/clips_history.py backend/services/integrations/youtube/sync.py` and `... scripts/verification/fixtures/history_worker.py tests/test_mutation_lock.py tests/test_clips_history.py tests/test_youtube_sync.py` | 0, 0 | `py_compile ok`; the later harness-only edit to `tests/test_mutation_lock.py` was compiled and executed by the three subsequent pytest runs | bound snapshot |
| R1/R2 schedules, retry helper, R4 (Python), R3 | `node scripts/verification/run-tests.mjs python -k "mutation_lock or clips_history or youtube_sync"` run 3 times | 0, 0, 0 | `54 passed, 846 deselected` each run; started 02:14:37Z (`python-qfNPuD`), 02:15:17Z (`python-MMgCgh`), 02:15:25Z (`python-pXcrfY`) | bound snapshot |
| AC-11 subset: full Python suite (strict AI, CLI, all existing) | `node scripts/verification/run-tests.mjs python` | 0 | `894 passed, 6 skipped, 155 subtests passed in 12.88s`; started 02:15:33Z, fixture `python-RHAB1z` (was 877 passed before this repair; +17 new tests) | bound snapshot |
| R2 paused acquirer, Python child and Node child; existing hold/crash/race/stress cases | `node scripts/verification/run-tests.mjs node src/services/clips-history.cross-process.test.ts` run 3 times | 0, 0, 0 | `Tests 8 passed (8)` each run; started 02:14:15Z (`node-nuxRpr`), 02:15:48Z (`node-DfXMWf`), 02:15:53Z (`node-CzPh6e`) | bound snapshot |
| AC-11 subset: full Node suite, including the new recovery schedules, retry tests, R4 (TS), and all existing suites | `node scripts/verification/run-tests.mjs node` | 0 | `Test Files 35 passed (35)`, `Tests 266 passed (266)`; started 02:15:58Z, fixture `node-SW287W` (was 253 tests before this repair; +13 new tests) | bound snapshot |
| Build | `node scripts/installation/run.mjs npm build run build` | 0 | `built in 1.65s`; `_local/installation/logs/build.log`: `Exit 0 at 2026-09-12T02:16:13.659Z` | bound snapshot |
| Corrections demonstrated on the reviewer's scenarios | `node scripts/installation/run.mjs python repair-1a-after-<reclaim|unknown|metrics|encoding> _local/project/writing-studio/1a-repair-1-after.py <scenario>`; `node scripts/installation/run.mjs node repair-1a-after-encoding --import tsx _local/project/writing-studio/1a-repair-1-after-encoding.mjs` | 0, 0, 0, 0, 0 | see the block below; logs `repair-1a-after-*.log` | bound snapshot |
| Reviewer's original scripts rerun on the repaired code | the five reviewer commands above | 1, 1, 1, 0, 1 | interpretation below; logs `review-1a-*.log` (appended) | bound snapshot |
| Snapshot binding | `git status --porcelain=v1 --untracked-files=all`, `git diff HEAD`, SHA-256 per file | 0 | 18 entries, HEAD `8cf6b82`; manifest re-verified after this report was written (final row) | bound snapshot |
| Workflow provenance and final manifest recheck | SHA-256 of `docs/workflow/contract.md`, `docs/workflow/roles/worker.md`, `docs/project/tasks/_REPORT-TEMPLATE.md` against `planning-baseline.json`; manifest re-hash | 0 | 3 of 3 workflow hashes match; 18 of 18 manifest entries match, 0 drift | bound snapshot |

Output of the after-demonstration scripts (each drives the reviewer's scenario against the repaired code and asserts the correction):

```text
reclaim:  Both reclaimers blocked by the orphaned recovery file: {'B': 'blocked', 'A': 'blocked'}
          Dead lock and recovery file untouched: True
          A's live lock intact after B resumed with its stale read: True
          B entered while A held the lock: False
          Final order: ['A', 'B'] leftover files: []
unknown:  B timed out instead of stealing the record-less lock: FileLockError owner = None
          Record-less lock still present and empty: True
          B2 entered while A held its critical section: False
          Final order: ['A', 'B2']
metrics:  applied: 0
          metrics after the older result tried to publish: {'views': 200, 'fetched_at': '2026-09-12T01:00:02Z'}
          stderr: ! 1 clip(s) skipped: newer metrics were saved meanwhile
encoding: Python invalid UTF-8 mutation error: HistoryReadError HISTORY_INVALID_ENCODING
          Python corrupt bytes preserved: True
encoding (TS): TS invalid UTF-8 mutation outcome: HistoryReadError HISTORY_INVALID_ENCODING
          corrupt bytes preserved: true; lenient list: []
```

Interpretation of the reviewer's original scripts on the repaired code (they were not modified; they assert the defect):

- `reclaim` exits 1: the harness waits for "A reads the main lock" after A recovers the seeded dead recovery file. A is now blocked by that file and never reaches that read, so the barrier assertion fails. Neither reclaimer removes anything; the after-script shows the same seed ending in both reclaimers `blocked` with both files untouched.
- `unknown` exits 1: the harness waits for "B hits a sharing violation while removing the record-less lock". B never attempts a removal, so that barrier is never reached, B times out, and the harness aborts while A is still paused holding its descriptor (the final `PermissionError` is the temp-dir cleanup colliding with that still-open descriptor, not a product failure).
- `metrics` exits 1 with `AttributeError`: the script calls the private `_publish_metrics` with the old tuple shape; the helper now takes `FetchedMetrics` records that include the snapshot metrics. The after-script and `tests/test_youtube_sync.py` drive the same scenario through the public `sync_metrics` path.
- `encoding` (Python) exits 0 and now prints `HistoryReadError` instead of `UnicodeDecodeError`, bytes preserved: the typed surface the review asked for.
- `encoding` (TS) exits 1 because the mutation now throws `HISTORY_INVALID_ENCODING` before the script reaches its "expected to reproduce" assertion; the after-script confirms the bytes are preserved and listing stays lenient.

Earlier runs that failed, kept as evidence of what the new checks caught before the final snapshot (all on intermediate working states, none on the bound snapshot):

| Run | Result | What it showed | Disposition |
|---|---|---|---|
| Typecheck after the lock rewrite | 1 | Old unit test imported the removed `UNKNOWN_OWNER_GRACE_MS` | Test replaced by the record-less fail-closed test |
| First focused Python run (02:12:44Z, `python-HA6z6Q`) | 2 (collection error) | My test-writing script wrote the invalid-UTF-8 fixture as a literal non-ASCII byte inside a bytes literal | Test literal corrected to the `\xff` escape; not a product defect |
| First cross-process run (02:12:50Z, `node-sFy0nR`) | 1 (1 failed / 7 passed) | The new Python `paused-acquire` fixture released its lock with a bare `os.remove`, which hit a transient Windows sharing violation while the Node waiter was reading the file | Both fixtures now release through the production token-verified retry helper; the WS-07 class recurred in a test fixture only |
| Second focused Python run (02:13:51Z, `python-KFBkcU`) | 1 (5 failed / 49 passed) | Test harness recursion: the removal hook called the patched `os.remove` | Harness keeps the real function; not a product defect |
| First focused Node unit run (02:12:50Z, `node-6FZJYi`) | 0 (46 passed) | Passed, but preceded the fixture edits above | Superseded by the full Node suite on the bound snapshot |

- Runtime behavior exercised: real TS and Python processes on one isolated history file for the paused-acquirer schedule in both directions (Python child paused, Node waiter; Node child paused, Node waiter), plus the existing four-process stress, deterministic blocking, crash recovery, and delete/update races. In-process deterministic schedules with real O_EXCL files and barriers in both languages: stale reclaimer versus a later live owner, concurrent reclaimers, orphaned recovery file (dead and unreadable), dead lock replaced by a live one, paused acquirer, and removal retries (transient success, ownership change, exhausted, failed release reporting). Out-of-order, older-intervening, unchanged, legacy, and CSV publication cases for metrics. Invalid-UTF-8, literal U+FFFD, BOM, corrupt, shape, unreadable, missing-file, no-op, and injected-save-failure cases for history reads. No UI, browser, render, or network path was exercised; none is touched by this repair.
- Human assistance: none.
- Not applicable: browser/UI walkthroughs, preview-render and storage-cleanup disposable scripts, and the client `tsc` check. This repair changes only storage helpers, one Python integration helper, their tests, fixtures, and documentation; no client code, render path, or cleanup policy changed. Storage-cleanup unit tests ran inside the full Node suite.
- Not run: none of the checks named above. Live provider or cloud calls were deliberately not run; the metrics publish path is covered with mocked fetches only, as the handoff specifies.
- Changes after these checks: none to implementation, tests, fixtures, or documentation. The two local after-scripts and this report were written after the last implementation edit; the manifest recheck in the final receipt row confirms 0 drift.

## Change inventory

Derived from `git status --porcelain=v1 --untracked-files=all` at HEAD `8cf6b82`. Line-ending note: Git warns that the edited files carry LF and will be normalized to CRLF on the next touch; the diffs are content-only and the manifest hashes are of the bytes on disk.

Implementation, verification, and documentation files written by this repair:

| Status | SHA-256 | Path | Change |
|---|---|---|---|
| modified | `52ec81eafc1b31b669cfe543cad453cc33062ceead227142e91e3def989f7bce` | `src/utils/mutation-lock.ts` | Protocol rewrite per the Design section: record-less locks never assessed or removed; single-holder recovery under a token-released, never-recovered recovery file; token re-verified removal with bounded retry (`removeOwned`); timeout messages name the lock, the recovery file, and the manual step. Removed `UNKNOWN_OWNER_GRACE_MS`, the reclaim-mutex grace, age computation, rename-aside, and unconditional cleanup. Exports `reclaimPathFor`, `readOwner`, `OwnerRead`, `removeOwned`, `REMOVE_RETRY_MS` for tests and fixtures. |
| modified | `9c5cc7a39f4d730ccd3817e1bc5f3393b99ed19e09ad11e590ba297c88ad654a` | `backend/services/mutation_lock.py` | Same protocol in Python: `OwnerRead` named tuple, `remove_owned`, `reclaim_path_for`, `REMOVE_RETRY_S`; `_reclaim` returns removed/changed/blocked and never takes over the recovery file. |
| modified | `2d465e82680fc972fb8a0f2aeb95d396d2951ad3296a74d9f1bbfa29f7119fa0` | `src/services/clips-history.ts` | `readHistoryStrict` reads bytes and decodes with a fatal UTF-8 decoder before parsing; new error code `HISTORY_INVALID_ENCODING`. Lenient `load()` unchanged (warns, returns empty). |
| modified | `0ca8ae9b7ad70c8e34f1adb83104040724b56c542a5d73a0bd8d7e2fd8b68ef1` | `backend/services/clips_history.py` | `read_clips_history_strict` reads bytes and decodes strictly; `UnicodeDecodeError` becomes `HistoryReadError("HISTORY_INVALID_ENCODING")`. |
| modified | `6df1119577b165eb58af169d558a2f053eed0261f28bb062cb6f502900a56c14` | `backend/services/integrations/youtube/sync.py` | `FetchedMetrics` record carries the snapshot metrics; `_publish_metrics` skips a result when the current metrics changed since the snapshot and are at least as fresh (`fetched_at`), reports the skipped count on stderr; API and CSV writers share it. Public `sync_metrics`/`sync_from_csv` signatures and return values unchanged. |
| modified | `36902ad2c5c6a90dbd9c83e0eb5eb9258a2eef9e8086228aae94527de6ddccae` | `docs/local-setup.md` | "Clip history lock and recovery" section: single-waiter recovery, record-less lock and orphaned recovery file are never removed automatically (manual steps named), strict-read note, new test file listed. |
| modified | `0daf02f76eef6d6f69f7743e8b9211657f28f1f643bf3085399ee653b5ce9d91` | `src/utils/mutation-lock.test.ts` | Timed-reclaim test replaced by "never removes a lock without a readable owner record, however old it is" (empty, truncated, non-JSON; aged one day; manual removal path). |
| new | `886e9090471456ff085ebd8179e221a252f1a94eabac563344a764f2973c0239` | `src/utils/mutation-lock.recovery.test.ts` | Deterministic recovery schedules driven by an `fs/promises` mock and AsyncLocalStorage actor tags (production code unmodified): stale reclaimer, concurrent reclaimers, orphaned recovery file, live replacement, and the four removal-retry cases. |
| modified | `cd50af1760ec91614878f3dc792ecb8368aa62f02c9e3de6cf9e8a52175faca7` | `tests/test_mutation_lock.py` | Python mirror of the above with a thread-name harness patching `_read_owner`/`os.remove`; includes the review's paused-acquirer schedule; record-less fail-closed test replaces the grace test. |
| modified | `f01bdada11741c0d317f10315531115e3a5d1ec1c770669862aa4c4b5bbd857f` | `src/services/clips-history.cross-process.test.ts` | Two real-process paused-acquirer cases (Python child, Node child) with barrier files. |
| modified | `40ba8b37e1aeeb9aad71efb551e8814d551dca3ac6558b2c146c28c39ff36d85` | `scripts/verification/fixtures/history-worker.ts` | `paused-acquire` mode (creates the lock file, holds the descriptor, writes the record on signal, releases through `removeOwned`). |
| modified | `70f84ef417310044faad399eda1a80b867dfb3b0f2a473e27ece66ab855581ab` | `scripts/verification/fixtures/history_worker.py` | Python counterpart, releasing through `remove_owned`. |
| modified | `a206539fbcfc43a5fa60a710984e035eeea3ba5e2b67e7a0b3994e1f66a5d5bb` | `src/services/clips-history.test.ts` | Invalid-UTF-8 abort/preservation and literal-U+FFFD survival cases; identical fixture bytes to the Python suite. |
| modified | `df4bdfc51a551192fa0bda733d643e0f4de5a4fc2c8e9037321690084474395d` | `tests/test_clips_history.py` | Python counterparts of the two encoding cases. |
| modified | `06e2b10cdc32f5b10913dca505c59d714c2e5fee198342b696f3b5b476ae5290` | `tests/test_youtube_sync.py` | Out-of-order completion (the review's values), older-intervening, unchanged-regardless-of-timestamp, legacy-without-fetched_at, and CSV newer-metrics cases; existing reconciliation cases retained. |

Present in the manifest for binding only, not written by this assignment: the lead's uncommitted bookkeeping edits to `docs/project/tasks/writing-studio/spec.md` (`41e7ceef...`), `docs/project/findings-ledger.md` (`886acea0...`), and `docs/project/tasks/writing-studio/reports/1a-review.md` (`9f0caa4b...`). No lead-owned record was edited. No file was deleted or renamed; no binary changed. `dist/` and `_local/` outputs are ignored. Local evidence scripts (ignored) and their hashes are listed under `localEvidence` in the manifest: `1a-repair-1-after.py`, `1a-repair-1-after-encoding.mjs`, and the reviewer's unchanged `1a-review-repro.py` and `1a-review-encoding.mjs`.

## Deviations and decision requests

No blocking decision is open. Delegated choices that deserve the lead's scrutiny:

1. **Record-less lock fails closed forever.** Decided: a lock without a readable record is never removed automatically; the message names the file and the manual step. Reason: the handoff requires that unknown ownership is not treated as proof of death regardless of age; safe automatic recovery cannot be established from the file alone. Consequence: a crash in the microseconds between O_EXCL creation and the record write, or a power loss that leaves a zero-length file, needs one manual deletion. Alternative not taken: creating the lock by writing the record to a temp file and hard-linking it into place would close that window on NTFS but adds a filesystem dependency (no hard links on exFAT/FAT32) and a second creation path; recorded as an optional follow-up, not required by the contract.
2. **Recovery file fails closed.** Decided: an orphaned `<lock>.reclaim` is never taken over; the message names both files. Reason: the handoff forbids another recursively reclaimed lock and explicitly allows conservative fail-closed behavior. The critical section is one read and one unlink, so orphans need a crash at that instant.
3. **Metrics freshness rule.** Decided: publish only if attribution matches and the current metrics are unchanged since the snapshot or older by `fetched_at`; equal timestamps count as newer and are skipped; changed metrics without a comparable `fetched_at` (legacy) are replaced; skipped clips are counted on stderr. `fetched_at` values are UTC ISO-8601 strings from the existing `_now()` and compare lexicographically; a later CSV import therefore outranks an earlier API fetch, matching the existing "as of import time" semantics. The private `_publish_metrics` input shape changed (now `FetchedMetrics`); no caller outside the module existed.
4. **New typed code `HISTORY_INVALID_ENCODING`.** Additive to both `HistoryReadError` surfaces; the CLI's existing `ClipsHistoryError` handling and Studio's 400 forwarding need no change.
5. **Exports and fixtures.** `readOwner`/`OwnerRead`/`removeOwned`/`reclaimPathFor` (TS) and `remove_owned`/`reclaim_path_for`/`OwnerRead` (Python) are exported for tests and fixtures. The `paused-acquire` fixture mode reproduces the on-disk record format by hand, because the pause it models sits inside the production acquire function; it is test-only and documented as such.
6. **TS schedules run in one process.** The TS recovery schedules use two async actors in one process against real O_EXCL files, with an `fs/promises` mock as the barrier mechanism; the cross-process TS/Python suite covers the paused-acquirer case with real child processes. The lead asked that both implementations be tested; both are.

Independent work continues nowhere: the repair boundary is reached and writes have stopped.

## Limitations and findings

- Known defects or incomplete behavior: none known within the slice. Residual documented behaviors: a record-less lock and an orphaned recovery file need manual deletion (messages name the files); a reused PID after a crash still fails closed until the lock file is deleted by hand.
- Choices needing scrutiny: items 1 and 3 above. Two negative assertions ("the waiter has not entered while the acquirer holds the lock") use a 200-300 ms observation window in addition to the barrier checks that precede them; the positive ordering assertions that follow are barrier-driven. The `utimes` call on a lock file held open by a child is best effort and not asserted, since age is no longer part of the protocol.
- Actionable defects for the lead's ledger (all resolved on the bound snapshot): R1, R2, R3, R4 as dispositioned in the review. Recurrence evidence: the WS-07 class (Windows sharing violation on release) recurred once in the new test fixture's hand-written release during this repair and was closed by routing the fixture through the production token-verified retry helper; no product occurrence.
- Proposed durable corrections: the protocol and its mutual-exclusion argument are documented in both module headers and `docs/local-setup.md`; an ADR remains optional (canonical home `docs/adr/`). The hard-link creation option in item 1 belongs with any future lock hardening decision, not with this repair.
- Out-of-scope observations, unchanged by this repair: TS `remove()` and Python `delete_clip` still unlink artifacts outside the lock (kickoff notes deletion hardening for a later slice); the reviewer's retained repro scripts depend on the previous private `_publish_metrics` tuple shape and on the removed recovery-file takeover, so they no longer drive their schedules (interpretation above); spec Status records that no commit was performed while `8cf6b82` contains the 1A work, a bookkeeping item for the lead; `docs/writing-studio-plan.md` is now committed in `8cf6b82`.

## Handoff

- Prior failure and evidence: `reports/1a-review.md` R1-R4 with the reviewer's retained scripts; before/after outcomes are recorded in the Execution Receipt above.
- Current implementation owner: Worker; implementation writes stopped at the bound snapshot. Ownership is handed back to the coordinating Project Lead.
- Next action and owner: coordinating Project Lead arranges a fresh, independent follow-up review of this snapshot (base `8cf6b82` plus `1a-repair-1-tracked.patch` and `manifest.json`), including the recovery protocol's design and not only its tests, then disposes findings and updates spec Status and the ledger. Slice 1B is not started and is not authorized by this report. This was repair round 1; no automatic loop.
- Pending Isaac decision: none.
- Durable decisions recorded: none beyond the documentation section; ADR optional as proposed above.
