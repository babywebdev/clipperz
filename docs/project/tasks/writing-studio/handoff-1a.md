# Proposed Worker assignment: Writing Studio slice 1A

Spec: lead-2, 2026-09-11. Prepared by coordinating Project Lead under workflow
4.0.6. Pending Isaac approval/relay; implementation owner is currently none.
The lead has recorded conditional Worker ownership in spec Status; Isaac's explicit
approval/relay activates it. Merely reading this proposal does not authorize work.

## Outcome and boundaries

Make existing Library history mutations safe when Studio/TS and CLI/Python run
concurrently, and prevent corrupt history from being overwritten as an empty list.
This is a storage prerequisite, not the entire Writing Studio implementation.

Expected areas: `src/services/clips-history.ts`, `backend/services/clips_history.py`,
focused lock/atomic-file helpers, current full-list writer callers, relevant tests
and verification fixtures. Inspect `backend/services/integrations/youtube/sync.py`
even though the local integration stays disabled: its full-list writes must not
bypass the shared protocol. No network access is needed to test those callers.

Do not build revisions, migration, Writing Studio routes/UI, render jobs, timeline,
thumbnail/logo changes, retention/Cleanup policy, new database or general framework.
Do not change application policy or enable integrations. Preserve existing work,
IDs, unknown fields, list order, storage paths and current successful CRUD semantics.
Do not edit lead-owned spec, feature-map, ledger or approval records.

## Contract

1. Every history read-modify-write holds the same cross-language/process lock from
   fresh read and ID resolution through atomic replacement. Cover multiple TS
   instances as well as Python writers. No stale full-list replacement escapes it.
2. Acquire with a bounded timeout and surfaced error. Release only the owner's
   lock. A slow living owner must never lose ownership merely because time elapsed.
   Document crash recovery, PID reuse/unknown owner behavior and interrupted lock
   acquisition. If safe automatic recovery cannot be established, fail closed
   with actionable recovery information rather than steal a possibly live lock.
3. Keep network/AI/render work outside the lock. Reconcile fetched metrics against
   the current entry and matching attribution when publishing; don't resurrect a
   deleted record or replace unrelated/newer fields from a stale read.
4. Missing history can initialize empty. Invalid JSON, invalid top-level/entry
   structure, permission/read failures must abort mutation without changing bytes.
   Preserve valid unknown fields. Define the minimum compatible structural checks
   from current records; do not require new optional fields on legacy entries.
5. Failed writes/rename leave the prior file intact and yield a useful error.
   Cleanup only operation-owned temporary/lock artifacts. Preserve demo read-only
   behavior. Do not extend this slice into filesystem deletion policy changes.

## Planned evidence and completion

Before substantial edits, name checks mapped to these slice criteria in the Worker
report (AC-3/AC-6/AC-11 subsets only). At minimum prove:

- Concurrent real TS and Python processes changing different fields/entries retain
  both changes and unknown nested fields; don't use timing luck as the only barrier.
- Two TS instances/processes serialize; update/delete races cannot resurrect entries.
- Corrupt, invalid-shaped and unreadable fixtures cannot be overwritten by mutation;
  missing-file initialization still works. Save/rename failure retains original bytes.
- Live-owner contention times out safely; crashed-owner recovery or documented
  fail-closed behavior is exercised; another owner's lock is never released.
- Existing history CRUD and mocked metrics writers remain compatible; local-policy
  regression checks pass. No actual user history/media/provider calls are involved.

Use the configured runtime, disposable isolated home/data/output, and existing
test harnesses. Candidate commands:

```powershell
node scripts/verification/run-tests.mjs node
node scripts/verification/run-tests.mjs python
node scripts/installation/run.mjs npm build run build
```

Add a focused cross-process fixture/check if current tests cannot prove the shared
contract. Record exact invocation, environment, actual exit codes and decisive
evidence. UI/render checks are not applicable to this storage-only slice unless
the implementation unexpectedly touches those paths. Missing required runtime
evidence leaves verification incomplete; use the workflow's human-assistance
fallback for tool limitations without calling those limitations product defects.

Write `reports/1a-worker.md` using the installed report template. Compare baseline
and relevant current inputs before starting/resuming. Derive the inventory from
Git, including untracked files. Bind evidence to base commit plus staged/unstaged
patch and content hashes for uncaptured/untracked/binary inputs. Record actual
workflow provenance and distinguish inherited planning files from implementation.

Stop after this bounded implementation and verification; hand writes back to the
lead. Do not self-approve, dispatch agents or proceed to 1B. Independent fresh
review and lead disposition are required before slice acceptance. After two
unsuccessful review/repair rounds on one issue, return for reassessment; apply the
three-identical-attempt circuit breaker. No commit/push/release is assigned here.
