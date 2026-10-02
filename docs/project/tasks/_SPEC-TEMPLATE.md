---
record: "spec"
task: "[task]"
spec_revision: "[revision]"
author: "agent"
date: "[YYYY-MM-DD]"
state: "active"
summary: "[Outcome first; at most 40 words]"
read_when: "[Relevant situations; at most 25 words]"
---


# Spec: [task]

<!-- Copy to docs/project/tasks/[task]/spec.md; do not fill the installed template. The current task owner owns this living spec and its header. Omit cycle if the spec spans cycles; add snapshot only when code-bound. Metadata follows docs/workflow/record-frontmatter.md. Soft narrative cap: 1,200 words; Status 300 words; tables, change inventories and evidence paths excluded. State a reason here if exceeded; never omit criteria, findings, decisive evidence or approved exceptions to meet a cap. -->

<!-- Status pointer fields take exact values only, because the startup helper routes from them: `Current implementation report` and `Current repair report` hold one repository-relative path or `none`; `Final repair snapshot` holds one commit id or repository-relative snapshot record path, or `not applicable`. `Current repair report` is the review report whose `Repair and final verification` section records the final repair evidence in either lane. Any prose belongs in `Next action and owner`. -->

## Status

- Objective: [one line]
- Task ID: [stable name]; spec revision: [revision]; current snapshot: [commit/record or none yet]
- Lane: small | contained | substantial | consequential [recorded by the planning session or Isaac; phase work records the lane its risk warrants]
- Review/repair round: [n of declared budget, or none]
- Implementation: partial | implemented | blocked
- Verification: pass | fail | incomplete
- Review: pending | changes-requested | accepted | not-required [reason]
- Integration/release: [separate pending/authorized/done/not-applicable state]
- Current slice and acceptance IDs: [bounded outcome; AC-IDs]
- Task owner: [session], by handoff from [session] on [date]
- Writing rights: [session or none]
- Current implementation report: [repository-relative path or none]
- Current repair report: [repository-relative path or none]
- Final repair snapshot: [commit id or repository-relative snapshot record path, or not applicable]
- Completed slices: [one line]
- Unresolved findings: [ledger IDs or none]
- Last failed approach: [one line or none]
- Pending Isaac decision: [decision or none]
- Next action and owner: [specific step]
- Records to open for this action: [exact paths and sections]
- Evidence root: [path under recorded storage policy]

## Product and acceptance criteria

- Problem and audience: [what this solves and for whom]
- Intended behavior and success measure: [observable outcome]
- Implementation completion condition: [authorized outcome and required verification; review remains separate]

<!-- This is the single acceptance-to-check map. Reports reference IDs and supply results, not a second plan. Name mapped verify-skill features when applicable; reuse adequate coverage and identify gaps requiring tests. The current task owner maintains this table; review-only agents and repairers propose changes through their report. -->

| ID | Acceptance criterion, including relevant failure behavior | Required verification and expected result |
|---|---|---|
| AC-1 | [observable result] | [exact check/runtime steps or mapped feature; expected result] |

## Scope

- Expected change areas: [bounded components/paths, necessary tests/docs/evidence]
- Protected boundaries: [what needs a decision]
- Do not build: [adjacent/speculative work and unrelated refactors]

## Design and delegated choices

<!-- Record decisions and their binding constraints; move extended rationale to docs/adr or the spec log. -->

- Settled consequential decisions: [important boundaries, interfaces, invariants, minimum sufficient approach, verified precedents and reasons; relevant ADR/external links]
- Delegated internal choices: [what the implementation writer may decide]

## Behavioral slices

1. [Observable outcome, relevant failure behavior, acceptance IDs]
2. [Next outcome; later dependent details remain provisional]

## Prerequisites

| Fact/resource | How to verify | Needed by | If missing |
|---|---|---|---|
| [fact/account/fixture/environment variable name, no secret] | [source/check] | [slice] | [affected path; independent work] |

<!-- Include applicable trust-boundary validation, server-side permissions, data isolation, existing data/caller compatibility, safe retries and surfaced failures for touched capabilities, even when no reference is selected. For open-ended investigation, name the evidence/lack of progress that triggers reassessment, any explicitly agreed cap, and next action; a cap never establishes completion. Omit if inapplicable. -->

## Current baseline and assumptions

[Compact current block: commit plus relevant working changes or manifest; relevant schema/interfaces/configuration and ignored inputs; accepted predecessor results/evidence and unresolved findings; latest scope reconciliation and freshness comparison, or pending. No invented historical baseline. Link superseded baselines and dated decisions to spec-log.md.]

## Approved exceptions currently in force

[Exception, decision owner/authorization, affected criteria and conditions/expiry, or none. Proposals do not change requirements. Superseded decisions/deviations and drift history go to the append-only spec log.]
