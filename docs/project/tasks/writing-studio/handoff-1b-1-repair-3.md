---
record: "assignment"
task: "writing-studio"
cycle: "1b-1-repair-3"
spec_revision: "lead-8"
snapshot: "_local/project/writing-studio/1b-1-repair-2-snapshot/manifest.json"
author: "coordinating-lead"
date: "2026-09-13"
state: "historical"
summary: "Repair the remaining owned output-group setup cleanup gap under 4.1.0, preserving prior outputs and independent follow-up."
read_when: "Executing or reviewing the current bounded Writing Studio 1B.1 repair-3 assignment."
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---

# Worker assignment: Writing Studio 1B.1 repair 3 — group setup cleanup

Act as Worker under workflow 4.1.0. Follow the installed startup order: README,
contract core, Worker role, CLAUDE.md/local setup, applicable references (none for
this software repair), spec lead-8 Status, then bounded task index. Read this
assignment and the spec's current requirements, acceptance map, baseline and
exceptions; read complete applicable Part B procedures before their named actions.
Use reports/1b-1-repair-2-review.md Findings/disposition and
reports/1b-1-repair-2-worker.md Handoff/addendum for the prior failure and evidence.
The earlier handoffs retain historical design rationale, not current startup rules.

Isaac's existing manual relay activates sole implementation ownership until handback.
If already relayed, continue that assignment without requesting another relay;
this workflow refresh neither dispatches a Worker nor withdraws its authorization.
Explicitly reread changed instructions before affected work. Bind work after this
refresh to spec lead-8 and `docs/workflow/inventories/4.1.0-local-1.md`;
record any pre-refresh work under the actual 4.0.6 subset/inventory (or unknown where
not recoverable), not retroactively as 4.1.0. The preserved observed prior inventory
is `docs/workflow/inventories/4.0.6-pre-refresh-20260913-1.md`; see spec-log.md for its limits.

## Baseline and reassessment

HEAD 8cf6b82039381e62b0f1dac1953c0c8c279e86f1 plus
_local/project/writing-studio/1b-1-repair-2-snapshot/manifest.json and its
1b-1-repair-2-tracked.patch (SHA-256
14f2219a6e3741174eab3bc29827b7b35d305f3fbe9c14d248d04e8924b8abd3).
Later lead/reviewer bookkeeping and this workflow refresh are mapped in
docs/workflow/reconciliation/20260913-record-identities.json. Original artifacts
and historical hashes remain preserved; 4.1.0 instruction changes are expected
instruction drift, not changed application behavior.
Check relevant input hashes before writing and preserve existing uncommitted work.

The prior R1/R2 and R3a/R3b defects are closed on this snapshot. The new output
group design is retained. The remaining issue is an uncovered preparation path:
parent creation succeeds, staging mkdir raises, and create exits before the caller
has a group to discard. The parent is leaked without a residual note even when
cleanup would succeed. This is a setup lifecycle gap, not another rollback failure.

After two reviewed repair cycles the lead has reassessed the remaining scope:
no restoration/retry redesign, no new abstraction or broader publication protocol.
Extend cleanup ownership to immediately after exclusive parent creation. Preserve
the original staging-creation error; remove the newly owned parent on failure, or
attach/report its residual if cleanup is denied. Cleanup must not touch a group
whose exclusive parent creation did not succeed. Keep successful publication,
same-title isolation, interrupted staging and best-effort reporting unchanged.

## Scope and proof

Expected edits: _ExactOutputGroup creation/failure handling in clip_generator.py
and focused regressions in test_exact_render.py; necessary local evidence/report.
Do not alter output layout, timing/word/transition contracts, TypeScript, legacy
rendering or accepted 1A. No 1B.2, Cleanup service, revisions/migration, UI or
dependency work. The broader TypeScript branch union remains a later non-blocking
consumer-contract cleanup.

Use spec lead-8's single acceptance-to-check map (B1-4 / AC-3 and relevant
AC-9/AC-11). Before edits record chosen checks, expectations and IDs in your draft
receipt; do not create a competing plan or edit the lead's spec. Preserve and inspect
the independent reproduction
_local/project/writing-studio/1b-1-repair-2-review-repro.py and its log. It asserts
the defect; use a separate corrected demonstration and record obsolete-assertion
failures honestly. Use real disposable directories with injected mkdir/cleanup
failures, covering prior outputs both present and absent:

- Parent acquired, staging mkdir fails, cleanup succeeds: original error surfaces,
  no new group remains, prior flat/group paths and bytes remain intact.
- Same failure with cleanup denied: original error remains identifiable and carries
  the owned residual path; no false cleanup claim; previous outputs untouched.
- Existing/colliding parent is never cleaned, including allocation exhaustion.
  Reuse adequate existing collision tests instead of duplicating them.

Run focused exact tests (including media/process schedules), full Python suite,
affected Python syntax and the real exact bridge check. Retain unchanged legacy
parity/Node/build/type evidence with relevant hashes and dependency justification;
refresh any check whose covered behavior changes. No user media/history/provider
operations. Do not change the tests to require only a one-shot setup fault.

## Handback

Write reports/1b-1-repair-3-worker.md using the installed 4.1.0 report template and
flat frontmatter: task writing-studio, cycle 1b-1-repair-3, spec_revision lead-8,
author worker, actual date, lifecycle active, workflow_version 4.1.0 and the preserved
instruction_inventory above. Add the actual reproducible snapshot and evidence
paths, short outcome/read_when, and actual executor/session. Include failed attempts,
coverage limits and Git-derived inventory. Bind a fresh patch/hash snapshot under
_local/project/writing-studio/1b-1-repair-3-snapshot/. Stop implementation writes
and return ownership for a fresh bounded independent follow-up on this correction.
Do not edit lead-owned Status/spec/ledger/handoffs or rewrite earlier reports.

Checkpoints update only your draft report/Handoff and evidence. If Status lags,
compare the bounded index (including unclassified reports), latest Handoff/evidence
and actual tree, report discrepancies and continue independently authorized work.
At actual handoff freeze assessment and evidence/provenance; later corrections use
attributed addenda or successors. Fresh review binds its own actual snapshot,
spec lead-8 and 4.1.0 inventory and cannot accept on missing or stale required checks.

No agent dispatch, commit, push or release. This is one manual assignment, not an
automatic repair loop. If the same setup issue remains after two unsuccessful
repair/review rounds, reassess again; three identical failed attempts require a
changed approach. Acceptance and all later work remain the lead's disposition.
