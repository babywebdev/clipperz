# Worker repair assignment: Writing Studio 1A, repair round 2

Read the installed Worker startup, spec, `handoff-1a.md`,
`reports/1a-repair-1-review.md` including the lead disposition, and
`reports/1a-repair-1-worker.md`. This is a narrow continuation of approved 1A,
not authorization for slice 1B or a rewrite of the repaired locking protocol.

## Remaining failure and decided correction

R3 remains open: a sync reads its snapshot, a compatible writer publishes changed
metrics without optional `fetched_at`, then the delayed sync overwrites them.
Evidence: the fresh review and its disposable public-sync reproduction at
`_local/project/writing-studio/1a-repair-1-review-metrics.py` (actual history mutation,
mocked network, views 200 overwritten by views 100). The test asserting that changed
legacy metrics should be overwritten encodes the error rather than compatibility.

Coordinating lead decision, 2026-09-12: use the conservative expected-state rule.
Publish only if the clip still exists, attribution still matches, and its current
metrics equal the metrics captured in the fetched snapshot. Any intervening
metrics change is a conflict; skip it and keep the current value. Do not override
this decision with `fetched_at`, regardless of whether timestamps are absent,
malformed, equal, earlier, or later. This avoids treating incomplete timestamps
as proof of freshness. An unchanged legacy record still refreshes normally.

Keep network work outside the lock. Keep the public API/CSV signatures, return
semantics, deletion/re-attribution protection and unrelated fields compatible.
Make the skipped-conflict stderr message truthful: another change occurred,
not necessarily a provably newer sample. No database, version framework, provider
calls, UI, media, lock changes or broad refactor is needed.

## Checks and handback

Before edits, name checks against R3 / 1A contract item 3 in the successor report.
Reproduce the reported failure, then demonstrate it preserves views 200 and skips
publication after the fix. Add/adjust deterministic public API and CSV tests for
changed metrics with absent and present timestamps; retain unchanged legacy refresh,
deletion, re-attribution, and unrelated-field cases. Include an intervening cleared
metrics value where the old snapshot had metrics. Do not rely on an old private
helper signature failing as proof of correction.

Run the affected history/metrics Python tests, full offline Python suite and Python
compile for modified modules through the configured runtime. Existing Node/build/
lock evidence may be retained only with unchanged input hashes and an explicit
reason those paths are unaffected. If edits expand relevant dependencies, refresh
affected checks instead of claiming old evidence applies. No repeated stress runs
are required solely to pad the receipt. Independent follow-up remains required.

Preserve implementation, reports and prior snapshots. Write
`reports/1a-repair-2-worker.md` and a new Git-derived patch/content-hash snapshot
under `_local/project/writing-studio/1a-repair-2-snapshot/`. Record which checks use
the new snapshot and which unchanged earlier evidence remains applicable. Do not
edit lead-owned spec/ledger/review or silently correct historical reports.

Stop and hand implementation ownership back for fresh independent follow-up.
Manual relay through Isaac only; no agents, commits, push, release or 1B work.
Budget: one unsuccessful repair round on R3 has occurred. If round 2 also fails
on that issue, return for lead reassessment rather than another automatic repair
round. The three-identical-attempt circuit breaker also remains in force.
