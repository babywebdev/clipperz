---
record: "spec"
task: "[task]"
cycle: "[cycle]"
spec_revision: "[revision]"
author: "coordinating-lead"
date: "[YYYY-MM-DD]"
state: "active"
summary: "[Outcome first; at most 40 words]"
read_when: "[Relevant situations; at most 25 words]"
---


# Spec: [task]

<!-- Copy to docs/project/tasks/[task]/spec.md; do not fill the installed template. The coordinating lead owns this living spec and its header. Omit cycle if the spec spans cycles; add snapshot only when code-bound. Metadata follows docs/workflow/record-frontmatter.md. Soft cap: 1,500 words; Status 300 words. State a reason here if exceeded; never omit criteria, findings, decisive evidence or approved exceptions to meet a cap. -->

## Status

- Objective: [one line]
- Task ID: [stable name]; spec revision: [revision]; current snapshot: [commit/record or none yet]
- Implementation: partial | implemented | blocked
- Verification: pass | fail | incomplete
- Review: pending | changes-requested | accepted | not-required [reason]
- Integration/release: [separate pending/authorized/done/not-applicable state]
- Current slice and acceptance IDs: [bounded outcome; AC-IDs]
- Coordinating lead: [session]; implementation owner: [role/session or none; both for solo]
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

<!-- This is the single acceptance-to-check map. Reports reference IDs and supply results, not a second plan. Name mapped verify-skill features when applicable; reuse adequate coverage and identify gaps requiring tests. -->

| ID | Acceptance criterion, including relevant failure behavior | Required verification and expected result |
|---|---|---|
| AC-1 | [observable result] | [exact check/runtime steps or mapped feature; expected result] |

## Scope

- Expected change areas: [bounded components/paths, necessary tests/docs/evidence]
- Protected boundaries: [what needs a decision]
- Do not build: [adjacent/speculative work and unrelated refactors]

## Design and delegated choices

- Settled consequential decisions: [important boundaries, interfaces, invariants, minimum sufficient approach, verified precedents and reasons; relevant ADR/external links]
- Delegated internal choices: [what the implementation owner may decide]

## Behavioral slices

1. [Observable outcome, relevant failure behavior, acceptance IDs]
2. [Next outcome; later dependent details remain provisional]

## Prerequisites

| Fact/resource | How to verify | Needed by | If missing |
|---|---|---|---|
| [fact/account/fixture/environment variable name, no secret] | [source/check] | [slice] | [affected path; independent work] |

<!-- For open-ended investigation, name the evidence/lack of progress that triggers reassessment, any explicitly agreed cap, and next action; a cap never establishes completion. Omit if inapplicable. -->

## Current baseline and assumptions

[Compact current block: commit plus relevant working changes or manifest; relevant schema/interfaces/configuration and ignored inputs; accepted predecessor results/evidence and unresolved findings; latest scope reconciliation and freshness comparison, or pending. No invented historical baseline. Link superseded baselines and dated decisions to spec-log.md.]

## Approved exceptions currently in force

[Exception, decision owner/authorization, affected criteria and conditions/expiry, or none. Proposals do not change requirements. Superseded decisions/deviations and drift history go to the append-only spec log.]
