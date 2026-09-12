# Worker repair assignment: Writing Studio 1A, repair round 1

Read spec lead-2, `handoff-1a.md`, `reports/1a-worker.md`, and the fresh independent
`reports/1a-review.md`, including the coordinating lead disposition. This is the
first bounded repair of 1A. It does not authorize slice 1B or any UI/media work.
The original approved 1A behavior remains the acceptance contract.

## Required outcomes

- Lock recovery: an unknown or incomplete owner record is not proof of a dead
  process, regardless of age. Fail closed with actionable recovery information
  unless ownership/liveness can actually be established. Never displace a paused
  live acquirer. Apply the same guarantee to the main and recovery locks in both
  languages; update the tests/documentation that currently promise timed reclaim.
- Recovery coordination: eliminate the stale recovery-lock check/rename race and
  unconditional cleanup that can remove another owner's lock. Prove mutual exclusion
  through concurrent recovery, acquisition and release. Conservative fail-closed
  behavior for an orphaned recovery lock is allowed by the existing contract if
  safe automatic recovery cannot be established. Do not add another recursively
  reclaimed lock as an unproven workaround. Bounded Windows retries must not unlink
  a path that has changed ownership during retry.
- Metrics: reconcile the fetched result with current metrics as well as current
  attribution. An intervening metrics update must not be overwritten by a stale
  snapshot. Capture/compare relevant state or an equivalent freshness precondition
  under the mutation lock; keep network fetches outside it. Preserve existing
  deletion/re-attribution/unrelated-field protection for API and CSV writers.
- Strict reads: reject invalid UTF-8 before parsing/mutation; never silently
  replace undecodable bytes with replacement characters and save the result.
  Preserve genuine UTF-8 (including a valid literal replacement character), BOM
  compatibility, missing-file behavior and unknown fields. Both languages must
  surface a useful typed read error without changing bytes. Lenient listing may
  remain lenient, with its existing warning behavior.

## Verification and handback

Use the review's deterministic repros to demonstrate each prior failure and its
correction. Add outcome-based regression tests for both lock implementations,
with explicit barriers for recovery/paused-acquisition interleavings; stress alone
does not prove those paths. Include out-of-order metrics completion and invalid
UTF-8 preservation. Test transient retry success and exhausted retry failure
where shared helper changes require it. Reuse passing tests where sufficient.

Before implementation, map checks to the 1A contract in the new Worker report.
Rerun the affected lock/history/metrics suites, real TS/Python cross-process check,
full offline Node and Python suites, build and relevant type/syntax checks. Use
the configured runtime and disposable fixtures only. Record actual commands,
results and limitations; tooling failures are not product findings. No live AI,
cloud/integration activation, real-data mutation or broad cleanup is authorized.

Preserve the original Worker and reviewer reports, snapshot and implementation
work. Write `reports/1a-repair-1-worker.md` and a new patch/content-hash snapshot
under `_local/project/writing-studio/1a-repair-1-snapshot/`. Do not edit the spec,
ledger, acceptance records or the reviewer's report. Record deviations and remaining
uncertainty honestly. Stop and hand writes back for fresh independent follow-up
review. All implementation handoffs remain manual through Isaac.

Budget remains two unsuccessful repair/review rounds on the same issue before
lead reassessment, plus the three-identical-attempt circuit breaker. No automatic
repair loop, new agents, commits, push, release or next-slice work is assigned.
