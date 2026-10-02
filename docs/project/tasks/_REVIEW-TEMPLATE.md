---
record: "review"
task: "[task]"
cycle: "[cycle]"
spec_revision: "[revision]"
snapshot: "[commit or reproducible snapshot record]"
author: "agent"
date: "[YYYY-MM-DD]"
state: "active"
summary: "[Outcome first; at most 40 words]"
read_when: "[Relevant situations; at most 25 words]"
evidence: "[evidence path]"
workflow_version: "[installed version or unknown]"
instruction_inventory: "[preserved inventory revision or unknown]"
---

# Review: [task] / [cycle]

<!-- Metadata: docs/workflow/record-frontmatter.md. Soft narrative cap 600 words, excluding tables, change inventories and evidence paths; state any reason to exceed without dropping findings or decisive evidence. Draft checkpoints remain editable; assessment and evidence/provenance metadata freeze at actual handoff. -->

<!-- Written by the assigned reviewer to docs/project/tasks/[task]/reports/[cycle]-review.md. A review-only assignment writes findings and recommendation only. A reviewer-owner (four-session lane) writes findings, per-round repair verification and the disposition as task owner, and never edits product files. An authorized review-and-fix assignment (contained lane) may add separately attributed repair, final verification and disposition without changing the initial assessment. A rotated reviewer-owner continues this report with attributed, dated entries. -->

## Review identity and coverage

- Task and spec revision: [exact reference]
- Code snapshot reviewed: [commit or reproducible snapshot record]
- Lane and assignment: [four-session reviewer-owner / contained review-and-fix / standalone review-only]
- Reviewer session and model family: [actual identity; model family when the tool exposes it; the implementer's family for comparison, or unknown]
- Review independence: [fresh session reached by handoff; isolation evidence such as the handoff prompt and starting context; implementation authorship or other limitation]
- Subagent angles: [2 or 3 risk-chosen angles with each subagent's isolation evidence, or direct review and the reason]
- Review depth: [focused/full and risk-based reason]
- Files and relevant dependencies inspected: [begin with actual changes, then named callers/dependencies/contracts/config/tests needed for a concrete question]
- Coverage limits: [uninspected relevant area and consequence, or none]
- Pre-handoff check read after own inspection: [yes, or none]
- Reviewer-owner rotation: [date, outgoing and incoming session, open findings, what was verified, pending round; or none]

## Verification assessment

- Required evidence: pass | fail | incomplete
- Expected-value provenance: [requirement, contract or independent fixture; implementation-derived expectations are a finding]
- Evidence inspected: [receipt, real output, runtime proof, and snapshot binding]
- Additional checks or reproductions performed: [actual commands/results, or none needed]
- Weakened-bar pass: [manual diff pass and bar-guard.py evidence path if used; candidates and dispositions, or none]
- Human assistance: [none, or operator/method, tool limitation/blocker, observed versus user-reported results, target/snapshot, cleanup and evidence adequacy/remaining gaps]
- Adequacy and remaining gaps: [missing behavior coverage, stale inputs, environmental limits, or none]

<!-- Red evidence prevents acceptance, not this review. Continue diagnosis and findings when useful. -->

## Findings

| ID / importance | Location and snapshot | Failure condition and impact | Evidence | Required outcome / status |
|---|---|---|---|---|
| [finding] | [file/location] | [reproducible consequence] | [proof or explicitly labeled hypothesis] | [resolution needed; open/resolved] |

[If no actionable findings were identified, state that with coverage limits. Put optional improvements outside the blocking findings. Challenge defective requirements as well as implementation. A reviewer-owner opens the evidence behind every blocking finding before recording it.]
<!-- Assess whether added complexity serves a demonstrated requirement and tests close real coverage gaps; do not impose arbitrary diff-size or test-count limits. -->

## Recurrence and prevention

[Before finalizing, read the Open table in `docs/project/findings-ledger.md` if present and search matching class keywords in both its Closed table and `docs/project/findings-ledger-archive.md` when present. Compare current findings with earlier occurrences by ledger ID across tasks; never enter archive-dnr. Link relevant entries and still-open defects, propose first-occurrence/recurrence updates, and include any prevention proposal with destination/cost. The current task owner, including a reviewer-owner, updates the ledger; review-only does not. Repeated defects remain findings until resolved.]

- Proposed durable corrections: [evidence/status and existing canonical destination, or none; the task owner reconciles]

## Reviewer recommendation

- Recommendation: accept | request-changes | pending [reason and evidence]
- Required corrections or unresolved coverage: [list or none]
- Next action: [acceptance, a repair handoff to a fresh writer, a forward handoff to a session assigned to act on this report, or pending; review-only dispatches no implementation]

<!-- A review-only recommendation does not update authoritative task status. Before any repair starts, whether by this reviewer (contained lane) or a fresh repairer (four-session lane), preserve the dated checkpoint below; that assessment becomes append-only even while the report remains draft. -->

## Pre-repair assessment checkpoint

- Timestamp and reviewer session: [date/time and actual identity; or No repairs]
- Originally reviewed spec revision and snapshot: [exact header-bound identity]
- Preserved assessment and finding dispositions before writes: [original assessment, unresolved questions and links; no repairs if applicable]
- Later correction addenda: [attributed dated addenda, or none; never rewrite original checkpoint]

## Repair and final verification

<!-- Contained lane: this reviewer authored the repairs; fill every field, the receipt and the post-repair self-audit. Four-session lane: fresh repairers authored the repairs in their own round reports; the reviewer-owner fills the fields, one round record per round, the receipt of checks it or its subagents reran, and links each repairer's self-audit. -->

- Lane and repair authorship: [contained, reviewer-authored / four-session, non-author repairers / no repairs]
- Repair authorization and checkout ownership: [assignment or repair handoff, previous writer ended, reconciliation; or no repairs]
- Actual repair author/session: [identity per round, or none; authored changes are not independently reviewed by this initial assessment]
- Original reviewed snapshot: [header-bound identity]
- Final spec revision and final snapshot: [exact values, or not applicable]
- Final environment/target: [actual runtime/fixtures or not applicable]
- Governing workflow_version and instruction_inventory for repair: [actual installed revision or not applicable]
- Repair change inventory and affected interfaces: [paths/purposes or none]
- Finding dispositions: [confirmed/fixed, already satisfied, unsupported with counterevidence, accepted nonblocking deferral with reason, unresolved blocking; original findings remain above]
- Evidence validity: [unaffected/reused basis, refreshed checks, not-run and inaccessible artifacts with consequences]

### Repair verification rounds

<!-- Four-session lane only: one row per round, written by the reviewer-owner after the repairer hands back. A verifier never authored the repair it checks. -->

| Round | Repairer session and round report | Findings addressed | Verification: verifier, checks rerun, snapshot, evidence path | Outcome: closed / next round / reassess |
|---|---|---|---|---|
| [n or none] | [session; report path] | [finding IDs] | [fresh subagent or reviewer-owner; commands; snapshot; path] | [result and reason] |

### Execution Receipt

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| [AC/check or none] | [exact check and independent expectation] | [actual exit/result or not run with reason] | [artifact/inaccessible] | [final snapshot] | [actual session/subagent/human-assisted identity] |

### Post-repair self-audit

- Final snapshot and author/session: [exact identity; four-session lane: each repairer's self-audit path]
- Eleven lenses and N/A reasons: [applicable assessments; reuse only unaffected coverage with basis]
- New findings, uncertainty and blind spot: [evidence and required outcome or none]
- Audit verdict: PASS | PASS-WITH-FINDINGS | BLOCKED | INCOMPLETE | not applicable [no repairs]
- Subsequent changes and affected refresh: [none or named invalidated coverage]

## Disposition and next action

- Disposition author/session and date: [task owner or pending]
- Review: accepted | changes-requested | pending | not-required [reason]
- Acceptance basis or blockers: [criteria, checks, initial review, repair outcome, project gates]
- Repair verification: [non-author verified by round (four-session lane) / reviewer-authored under conditional closure (contained lane) / no repairs]
- Conditional closure: [contained lane: adequate direct evidence, or the focused forward assignment's question/scope/completion criterion; never claim independent review of an authored repair; four-session lane: not applicable]
- Original independent coverage versus repairs: [exact boundary]
- Task Status or established phase-state update: [what was reconciled or pending]
- Ledger update: [first occurrences including fixed defects, recurrence/prevention, or none]
- Integration/release approval: [separate state]
- Next action and owner: [next forward handoff, a repair handoff to a fresh writer, a completion summary, or a concrete blocker; never an automatic loop]

<!-- Handoff freezes the original assessment/evidence/provenance except attributed dated corrections and separately attributed repair/disposition. Changes to implementation or criteria invalidate affected evidence, audit and review. -->
