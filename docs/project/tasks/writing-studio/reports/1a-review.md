# Review: writing-studio / 1A

## Review identity and coverage

- Task and spec revision: `docs/project/tasks/writing-studio/spec.md`, lead-2 (2026-09-11), and `handoff-1a.md`. Scope is the slice 1A subsets of AC-3/AC-6/AC-11: safe shared history mutations, corruption preservation, and existing caller compatibility. Later Writing Studio slices are excluded.
- Installed workflow provenance: 4.0.6, project mode, per `docs/workflow/README.md`. Contract and Project Lead role are inventoried as unmodified bundle files; README is the customized installation record; CLAUDE.md is retained with unknown original provenance and reconciled for 4.0.6. No selected domain references.
- Code snapshot reviewed: HEAD `710b4d4eaf598e1a3a75a48e57b17b1b25f30e0e` plus `_local/project/writing-studio/1a-snapshot/1a-tracked.patch`, SHA-256 `412ef41831186616bc19c899cd1f6a9a3366e1e32463894ab2a38f8137a994cd`, and its 24-file `manifest.json`. The coordinating lead verified every manifest hash before assignment. The reviewer inspected actual Git diff/status, implementation, tests, and callers in the shared checkout. Parent-only changes during review update spec Status and ledger bookkeeping; implementation and acceptance criteria remained frozen.
- Reviewer session/role: Codex subagent `/root/review_1a`, Project Lead in review-only mode, 2026-09-11 America/Chicago (execution receipts after midnight UTC on 2026-09-12).
- Review independence: fresh subagent without inherited planning/implementation conversation; no implementation authorship, repairs, or further delegation. Requirements and actual changes were inspected before author justifications. Only this report and ignored disposable reproduction evidence were written.
- Review depth: focused full review of the slice's storage protocol and changed callers because losing history is a material data-integrity failure.
- Files and relevant dependencies inspected: both history services and mutation-lock implementations; `src/utils/atomic-file.ts`; the `backend/cli.py` diff; `backend/services/integrations/youtube/sync.py`; current TS history methods/cloud callbacks and repository writer searches; all new lock/cross-process tests, Python history and YouTube tests, and TS history test additions; runtime/test harnesses, local setup, spec/handoff, Worker report, snapshot inventory, and findings ledger.
- Coverage limits: no browser, render, cloud/provider calls, later revision/deletion-policy work, or real user data. Full-suite/build evidence was assessed from the Worker receipt and existing logs (also corroborated by the parent); targeted suites were independently rerun. Recovery schedules below were executed through the Python implementation with deterministic hooks and real filesystem operations; equivalent TS defects are established by inspection of the same protocol, not an independent TS reproduction of those schedules.

## Verification assessment

- Required evidence: **fail** for the behavioral contract, despite passing existing suites. R1/R2 violate exclusive ownership; R3 violates newer-field preservation; R4 violates corrupt-input byte preservation.
- Evidence inspected: [Worker report](1a-worker.md), saved patch/manifest, relevant test source, and `_local/installation/logs/` receipts. The reported full Node suite (253 tests), Python suite (877 passed / 6 skipped), and build remain useful evidence for their covered paths. They do not cover the reproduced failures below.
- Human assistance: none. Initial sandbox execution could not start the configured Python interpreter (`Access is denied`) and TS child startup also encountered `uv_os_get_passwd ... ENOMEM`. Approved execution outside the sandbox resolved these tool restrictions; they are not product findings.

Independent checks against the frozen implementation:

| Command | Actual result | Evidence |
|---|---|---|
| `node scripts/verification/run-tests.mjs node src/utils/mutation-lock.test.ts src/services/clips-history.test.ts src/utils/atomic-file.test.ts src/services/clips-history.cross-process.test.ts` | Exit 1: 35 unit tests passed; six cross-process tests failed at child startup/marker waits under sandbox restrictions | `step-4-node-tests.log`, started 2026-09-12T01:42:18Z; fixture `node-P2w4CA` |
| `node scripts/verification/run-tests.mjs python -k "mutation_lock or clips_history or youtube_sync"` | Initial sandbox exit 1; approved rerun exit 0, **37 passed, 846 deselected** | `step-4-python-tests.log`, successful start 01:43:08Z; fixture `python-1JdT3g` |
| `node scripts/verification/run-tests.mjs node src/services/clips-history.cross-process.test.ts` | Approved rerun exit 0, **six passed** | `step-4-node-tests.log`, start 01:43:44Z; fixture `node-W0QKBu` |
| Five retained reproduction commands below | Each exit 0; assertions confirm the defect or the stated Python comparison, rather than product success | `review-1a-*.log` in `_local/installation/logs/` |

The required normal contention, CRUD, no-op, missing-file, injected-write failure, and policy compatibility evidence is substantial. Missing adversarial schedules and decoding coverage are consequential gaps. The existing ownerless-lock tests actually require age-based stealing, so passing those tests reinforces the flawed recovery choice rather than proving the fail-closed requirement.

## Findings

All locations below refer to the frozen snapshot above. Findings are confirmed unless a coverage limitation is stated explicitly.

| ID / importance | Location and snapshot | Failure condition and impact | Evidence | Required outcome / status |
|---|---|---|---|---|
| R1 / P1 | `src/utils/mutation-lock.ts:217-246`; `backend/services/mutation_lock.py:211-244` | Two waiters recovering an abandoned `.lock.reclaim` can both enter reclamation. A stale assessment precedes an unconditional rename of the pathname; the pathname can now belong to a live reclaimer. The older reclaimer can subsequently delete a newly acquired live main lock, admitting concurrent history writers and lost updates. Reclaim cleanup also unconditionally removes the mutex pathname. | Deterministic real-filesystem Python schedule below: both reclaimers return true and `C live lock removed by A: True`. TS has the same check/rename and unchecked cleanup sequence. | Make reclamation itself mutually exclusive and ownership-safe under abandoned-mutex recovery and concurrent acquisitions; safely fail closed if that cannot be established. Test this exact schedule. **Open.** |
| R2 / P1 | `src/utils/mutation-lock.ts:174-180,217-246`; `backend/services/mutation_lock.py:180-187,211-244`; recovery docs and ownerless-lock tests | A living process paused between exclusive creation and writing its owner record becomes eligible for stealing after 60 seconds. On Windows a retry initially fails while its descriptor is open, then removes the now-valid live lock after that process resumes and closes the descriptor. Two critical sections overlap. Elapsed age cannot prove an unknown owner is dead. | Deterministic Python schedule simulates elapsed age only, with a real paused owner and real Windows sharing failure/retry: `B entered while A still held critical section: True`. The same age inference and removal retry exist in TS. | Unknown ownership must fail closed with actionable recovery information, or use a protocol that proves safe recovery. Preserve live ownership during creation and retries. Update tests/docs that currently promise automatic age-based recovery. **Open.** |
| R3 / P2 | `backend/services/integrations/youtube/sync.py:61-80` | A sync fetches clip A, then pauses while fetching other clips. Another sync publishes newer metrics for A under the same attribution. The first sync later unconditionally replaces those newer metrics because publication checks only the attribution field. This remains a lost update even though full-list writes are gone. Both API and CSV publication share this helper. | In-memory locked-publish fixture: existing `views: 200`, fetched_at `01:00:02Z`; older fetched result `views: 100`, fetched_at `01:00:01Z`; `_publish_metrics` returns 1 and saves the older result. | Reconcile freshness or expected metrics state under the lock as well as attribution. A delayed older fetch must not replace newer metrics; retain unrelated fields and deletion/relink checks. **Open.** |
| R4 / P2 | `src/services/clips-history.ts:95-118` (strict read); Python comparison `backend/services/clips_history.py:85-107` | Invalid UTF-8 inside a JSON string is decoded with replacement characters by Node's string read. JSON parsing then succeeds, and an unrelated edit rewrites the damaged file, irreversibly replacing its original bytes. This is a corrupt input accepted by the supposedly strict mutation path. | Disposable bytes `[{"id":"a","title":"` + byte `FF` + `"}]`; TS update of description succeeds with title `U+FFFD`, and `corrupt bytes preserved: false`. Python rejects the same input and preserves bytes, although it currently exposes an unwrapped `UnicodeDecodeError`. | Strictly reject decoding failures before mutation, preserve bytes, and surface an actionable history error. Align Python's decoding-error surface with the history error contract. Add shared malformed-encoding fixtures. **Open.** |

### Reproduction evidence and limits

Retained scratch scripts (ignored, local):

- `_local/project/writing-studio/1a-review-repro.py`: Python recovery schedules, stale metrics, and Python encoding comparison.
- `_local/project/writing-studio/1a-review-encoding.mjs`: actual TS `ClipsHistory.update` with invalid UTF-8.

Run from the repository root using the configured runtime:

```powershell
node scripts/installation/run.mjs python review-1a-reclaim _local/project/writing-studio/1a-review-repro.py reclaim
node scripts/installation/run.mjs python review-1a-unknown _local/project/writing-studio/1a-review-repro.py unknown
node scripts/installation/run.mjs python review-1a-metrics _local/project/writing-studio/1a-review-repro.py metrics
node scripts/installation/run.mjs python review-1a-encoding-python _local/project/writing-studio/1a-review-repro.py encoding
node scripts/installation/run.mjs node review-1a-encoding --import tsx _local/project/writing-studio/1a-review-encoding.mjs
```

These exact retained-script invocations were run and exited 0. Initial equivalent inline reproductions were also executed. Each script uses disposable temporary directories or an in-memory mocked publisher; temporary files are cleaned. No actual Library file, video, network fetch, or provider call is involved.

R1 schedule: seed both lock paths with a genuinely exited child PID. B reads the dead reclaim mutex and pauses. A recovers that mutex, creates its own live mutex, reads the dead main lock, and pauses. B resumes from its stale mutex read, moves A's live mutex aside, creates B's mutex, removes the dead main lock, and completes. C now creates a main lock carrying a live PID/token. A resumes from its earlier main-lock read and deletes C's lock. Hooks only schedule returns from real `_read_owner` calls; they do not fake the owner records or successful removals. Output:

```text
C live lock before A resumes: C-live
Both reclaimers reported success: {'B': True, 'A': True}
C live lock removed by A: True
```

R2 schedule: A pauses before the first `os.write`, after exclusive lock creation. A hook reports 65,000 ms age for the actual empty lock to model a long process suspension without waiting a minute. B attempts recovery, hits a real Windows sharing violation, and begins the implemented retry. A resumes, records ownership, closes its descriptor, and enters its critical section. B's retry removes A's valid lock and enters while A waits inside its critical section. Owner A never died. This proves the scheduling failure; it does not estimate how often a 60-second creation pause happens in ordinary use. Output:

```text
Owner A was living while paused before owner record: True
B entered while A still held critical section: True
```

R3 uses the production `_publish_metrics` callback against an in-memory current list, substituting only `mutate_clips_history` to avoid real storage. It demonstrates publication behavior, not an actual external metrics request. Output:

```text
applied: 1
metrics after older result publishes: {'views': 100, 'fetched_at': '2026-09-12T01:00:01Z'}
```

R4 executes the production TS mutation and Python `update_clip` on separate disposable files containing the same invalid bytes. Output:

```text
updated: { id: 'a', title: '�', description: 'review' }
corrupt bytes preserved: false
Python invalid UTF-8 mutation exception: UnicodeDecodeError
Python corrupt bytes preserved: True
```

### Design and scope assessment

Shared JSON mutation, fresh reads under the lock, removing the stale full-list save API, preserving unknown fields, and keeping external work outside the critical section fit the approved scope. The bounded Windows rename/removal retries address a demonstrated platform issue and are reasonable in principle. No database, UI, or revision framework is needed to resolve these findings.

The unsafe part is the additional recovery protocol: a second recoverable lock repeats the ownership race it is meant to prevent, while age-based ownerless recovery conflicts with handoff item 2's explicit fail-closed fallback. The Worker report's assertion that a missing record after 60 seconds “can only be a crash” is disproven by the live-pause schedule. Retaining the current requirements and simplifying or proving recovery is appropriate; weakening the live-owner guarantee is not necessary.

## Recurrence and prevention

Read [findings ledger](../../../findings-ledger.md), including parent-added Worker occurrences WS-07/WS-08, before finalizing.

- R1/R2 are new unsafe-reclamation mechanisms within the still-open WS-01 cross-process lost-update class. Link this review as continuation evidence; WS-01 should remain open until adversarial recovery schedules pass. Prevention belongs in both lock test suites and the real cross-process harness, with barriers around acquisition/recovery boundaries.
- R3 is another still-open WS-01 occurrence: delayed publication can overwrite a newer value despite serialized writes. Add a deterministic same-attribution newer-metrics case to `tests/test_youtube_sync.py` and preserve the publication conflict contract in that module.
- R4 extends WS-02's incomplete corrupt/read-failure protection to decoding. Add malformed-byte fixtures to both history test suites; ensure failure paths preserve exact bytes and provide a useful message.
- WS-07's bounded-retry correction passes the ordinary contention tests, but R2 shows why retries also need ownership safety. WS-08's no-op correction is supported by the inspected tests and independent focused passes; no new no-op defect identified.
- Proposed durable corrections: revise the recovery section in `docs/local-setup.md` and module comments after the protocol is fixed; index these occurrences in the existing ledger. No global prompt/skill change is indicated. A protocol ADR remains optional and cannot substitute for the required concurrency proof.

## Reviewer recommendation

- Recommendation: **request-changes**. Four confirmed contract failures remain; R1/R2 can defeat the primary purpose of this slice.
- Required corrections or unresolved coverage: resolve R1-R4, retain existing compatibility evidence, add deterministic regression coverage for the reproduced schedules and data cases, refresh the patch/hash snapshot, and rerun affected checks. Required independent recovery-safety assessment should examine the revised protocol, not only its tests.
- Next action for the coordinating lead: assess and record dispositions, preserve the existing review/repair budget, and arrange bounded slice 1A correction/review. Do not accept 1A or proceed to 1B on the current snapshot.

## Coordinating lead disposition and next action

- Coordinating lead: pending.
- Review: pending coordinating disposition.
- Findings disposition: pending; reviewer assessment above is preserved.
- Acceptance basis or blockers: pending.
- Lead-authored changes needing separate review: pending.
- Task Status update: pending.
- Ledger update: pending.
- Integration/release approval: separate; not assessed or granted by this review.
- Hand to the Worker / pending Isaac decision: pending coordinating lead.
