# Worker assignment: Writing Studio 1B.1 repair round 2

Act as Worker under workflow 4.0.6. Read the installed startup, Worker role,
CLAUDE.md, docs/local-setup.md, spec lead-6, original handoff-1b-1.md and
handoff-1b-1-repair-1.md. Read reports/1b-1-repair-1-worker.md and the fresh
reports/1b-1-repair-1-review.md including lead disposition. Isaac's manual relay
activates sole implementation ownership for this bounded repair until handback.

## Baseline and reassessed direction

Use HEAD 8cf6b82039381e62b0f1dac1953c0c8c279e86f1 plus the saved repair-1
snapshot in _local/project/writing-studio/1b-1-repair-1-snapshot/manifest.json,
with 1b-1-repair-1-tracked.patch SHA-256
6544206139108b6ebd02a68822116fca5b2d4c893eeb8513698f3bc3c4a48db1.
Subsequent spec, ledger, review and handoff edits are coordination only. Verify
relevant implementation/input hashes before edits and preserve prior work.

R1/R2 closures are retained. R3 remains open: rollback can also fail, leaving a
prior file missing at its public path; diagnostic output can raise after the old
files have been replaced. Do not continue the backup-and-restore approach with
more retries. The lead has reassessed it after the first unsuccessful repair.

**Exact renders now use a new, exclusively owned output directory for each
operation.** Stage the complete main/overlay/source group on the destination
volume, prepare the result and size checks, then publish the group with a single
directory rename into a previously absent destination owned by this operation.
An exclusively created operation parent with staging and final child directories
is one acceptable arrangement. Path naming is delegated; PID alone is not an
operation identity. Returned paths identify the new group's final files.

Never rename, replace or delete a prior successful render or its sidecars in exact
mode. Same-title renders, including different processes, receive independent
output locations. A prior flat output remains byte-identical and readable at its
original path. Do not reuse or clear an orphaned destination or backup. Keep
legacy naming, replacement, result shape and behavior unchanged.

This adjusts exact-mode internal artifact layout; no current UI caller opts into
it and no flat same-title replacement guarantee was required. It does not add
history revisions, migration, operation journals, a cleanup service or new
dependencies. The future 1B.2 plan must refresh against this resulting layout.

## Failure and reporting contract

- Every requested artifact is staged and size-checked before the one publication
  boundary. Success returns paths for a complete group surviving work cleanup.
- Preparation or rename failure leaves previous outputs untouched and no complete
  output group from this failed operation. Clean only operation-owned staging;
  if filesystem denial prevents cleanup, preserve and identify those residuals
  without deleting unrelated files or claiming cleanup succeeded.
- A crash/interruption before the boundary may leave unreferenced staging. It
  cannot remove prior outputs or expose a partial group as published. This is
  process-interruption safety, not a new power-loss durability guarantee.
- After publication, ordinary optional callback or diagnostic I/O failures must
  not turn the completed renderer result into an exception. Diagnostics themselves
  must be best-effort. Do not hide rendering/staging/publication errors. External
  process death or an unavailable bridge result channel cannot promise receipt
  delivery; keep that distinct from renderer completion and future 1B.2 recovery.
- Remove the superseded exact backup/rollback path and misleading guarantees;
  preserve legacy code and the accepted R1/R2 checks/tolerances.

## Verification

Name checks before editing, mapped to R3/B1-4/AC-3 and retained R1/R2. Review the
unchanged failure reproduction at
_local/project/writing-studio/1b-1-repair-1-review-repro.py and its recorded log.
Preserve its history; use a separate adapted demonstration where old-path
assertions no longer fit the new layout. A failed obsolete assertion is not proof
of every closure.

Use real disposable filesystem operations with stubbed media for failure schedules,
and the real bridge for media/output-contract proof. Cover:

- Main/overlay/source staging failures and persistent publication rename failure,
  both with and without prior files; prior paths/bytes remain unchanged. Include
  cleanup denial as an explicitly reported residual, not a false clean result.
- A completion callback that raises while stderr also raises; the fully published
  renderer result still returns. Rendering errors remain visible before publication.
- Successful repeated same-title operations and two actual processes publishing
  that title into the same output root; groups/sidecars are distinct, complete,
  and returned paths survive cleanup. Do not rely on the in-process reservation set.
- A deterministic child-process interruption immediately before the publication
  boundary: old outputs stay playable and no partial group is published. Clean
  only the disposable fixture after inspecting the result.
- Retained omitted/null/empty/nonempty transcript and synchronized intro/outro
  checks. Update the exact bridge check to validate the new returned paths/group,
  decoded media and previous-output preservation. Refresh default preview/export
  parity, focused exact/composition checks, full Python suite and affected syntax.

Retain Node/build/type evidence only with applicable input hashes/dependency
inspection. The broader TS bookend branch union is a non-blocking contract cleanup
for the 1B.2 refresh; no need to modify it to close this repair. If TS inputs change
for a necessary reason, refresh their affected checks instead of freezing them
just to retain prior evidence. No real user media/history/provider operations.

## Handback

Write reports/1b-1-repair-2-worker.md with actual commands, exits, failed attempts,
limits, inventory and decisions. Bind refreshed checks and retained evidence to a
Git-derived patch/hash snapshot under
_local/project/writing-studio/1b-1-repair-2-snapshot/. Stop implementation writes
and return ownership for fresh independent follow-up. Do not edit lead-owned
Status/spec/ledger/handoffs or rewrite previous reports.

No 1B.2, broad legacy composition fixes, UI, migration/Cleanup, dependencies,
agent dispatch, commit, push or release. If this second repair/review is still
unsuccessful on R3, lead reassessment is mandatory before another assignment.
Three identical failed attempts require a changed approach; no automatic loop.
