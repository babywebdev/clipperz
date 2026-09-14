---
record: "review"
task: "[task]"
cycle: "[cycle]"
spec_revision: "[revision]"
snapshot: "[commit or reproducible snapshot record]"
author: "reviewer"
date: "[YYYY-MM-DD]"
state: "active"
summary: "[Outcome first; at most 40 words]"
read_when: "[Relevant situations; at most 25 words]"
evidence: "[evidence path]"
workflow_version: "[installed version or unknown]"
instruction_inventory: "[preserved inventory revision or unknown]"
---

# Review: [task] / [cycle]

<!-- Metadata: docs/workflow/record-frontmatter.md. Soft cap 900 words; state any reason to exceed without dropping findings or decisive evidence. Draft checkpoints remain editable; assessment and evidence/provenance metadata freeze at actual handoff. -->

<!-- Written by the assigned reviewer to docs/project/tasks/[task]/reports/[cycle]-review.md. Reviewer is an assignment, not another standing role. The coordinating lead completes only the disposition section after review finishes, preserving the reviewer's assessment. -->

## Review identity and coverage

- Task and spec revision: [exact reference]
- Code snapshot reviewed: [commit or reproducible snapshot record]
- Reviewer session/role: [identity]
- Review independence: [fresh subagent / separate fresh session / focused local review; inherited conversation history, implementation authorship, or other limitation]
- Review depth: [focused/full and risk-based reason]
- Files and relevant dependencies inspected: [paths and what was checked]
- Coverage limits: [uninspected relevant area and consequence, or none]

## Verification assessment

- Required evidence: pass | fail | incomplete
- Evidence inspected: [receipt, real output, runtime proof, and snapshot binding]
- Additional checks or reproductions performed: [actual commands/results, or none needed]
- Human assistance: [none, or operator/method, tool limitation/blocker, observed versus user-reported results, target/snapshot, cleanup and evidence adequacy/remaining gaps]
- Adequacy and remaining gaps: [missing behavior coverage, stale inputs, environmental limits, or none]

<!-- Red evidence prevents acceptance, not this review. Continue diagnosis and findings when useful. -->

## Findings

| ID / importance | Location and snapshot | Failure condition and impact | Evidence | Required outcome / status |
|---|---|---|---|---|
| [finding] | [file/location] | [reproducible consequence] | [proof or explicitly labeled hypothesis] | [resolution needed; open/resolved] |

[If no actionable findings were identified, state that with coverage limits. Put optional improvements outside the blocking findings. Challenge defective requirements as well as implementation.]
<!-- Assess whether added complexity serves a demonstrated requirement and tests close real coverage gaps; do not impose arbitrary diff-size or test-count limits. -->

## Recurrence and prevention

[Before finalizing, read the Open table in `docs/project/findings-ledger.md` if present and search matching class keywords in both its Closed table and `docs/project/findings-ledger-archive.md` when present. Compare current findings with earlier occurrences by ledger ID across tasks; never enter archive-dnr. Link relevant entries and still-open defects, propose first-occurrence/recurrence updates, and include any prevention proposal with destination/cost. The coordinating lead updates the ledger; the review-only agent does not. Repeated defects remain findings until resolved.]

- Proposed durable corrections: [evidence/status and existing canonical destination, or none; coordinating lead reconciles]

## Reviewer recommendation

- Recommendation: accept | request-changes | pending [reason and evidence]
- Required corrections or unresolved coverage: [list or none]
- Next action for the coordinating lead: [concrete step; no implementation dispatch]

<!-- A reviewer recommendation does not update authoritative task status. In review-only mode, leave the following section pending for the coordinating lead. -->

## Coordinating lead disposition and next action

- Coordinating lead: [session/date, or pending]
- Review: accepted | changes-requested | pending | not-required [reason]
- Findings disposition: [resolution/evidence per finding, including any disagreement; preserve the original findings]
- Acceptance basis or blockers: [requirements and evidence]
- Author-lead closure verified by: [fresh non-author reviewer and report path / not applicable]
- Lead-authored changes needing separate review: [list or none]
- Task Status update: [what the coordinating lead reconciled in spec.md, or the established phase-state procedure; pending until reconciled]
- Ledger update: [indexed defects/occurrences and links, none needed, or pending]
- Integration/release approval: [separate state, if applicable]
- Next action / Hand to the Worker (classic) / Hand to the reviewer (solo fallback) / pending Isaac decision: [one concise next instruction]

<!-- Review-only checkpoints preserve only this assigned report, coverage/evidence and next action; never Status or another author's header. A lead who authored implementation cannot self-close confirmed blocking findings or contested dismissals; fresh non-author verification is required and Review stays pending/changes-requested until then. -->

<!-- A later implementation or acceptance-criteria change invalidates affected approval and evidence. -->
<!-- After handoff, substantive corrections use an attributed, dated addendum or linked successor explaining their effect on evidence/acceptance. Preserve the reviewer's original assessment and the separately attributed coordinator disposition, subject to required secret redaction. Current task status remains editable. -->
