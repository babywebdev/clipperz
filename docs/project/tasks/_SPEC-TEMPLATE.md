# Spec: [task]

<!-- Copy to docs/project/tasks/[task]/spec.md for substantial work. The coordinating lead maintains this record; review-only assignments do not transfer that ownership. Do not fill the installed template itself. Scale sections to the task; mark inapplicable design detail explicitly. -->

## Status

- Task ID: [stable task name]
- Spec revision: [revision/date; change when requirements or settled design change]
- Implementation: partial | implemented | blocked
- Verification: pass | fail | incomplete
- Review: pending | changes-requested | accepted | not-required [reason]
- Current slice: [number and observable outcome]
- Coordinating lead: [session/task identifier responsible for authoritative status]
- Implementation owner: [Worker / Project Lead / none; session identifier if useful]
- Completed slices: [brief list]
- Latest reviewed code snapshot: [commit or reproducible snapshot record; none yet]
- Latest worker report: [path or none]
- Latest review: [path or none]
- Next action: [specific step and owner]
- Pending Isaac decision: [decision or none]
- Integration/release: [pending, authorized, done, or not applicable; separate from review]

## Planning baseline and freshness

- Planning baseline: [commit plus relevant working changes, or content manifest; include relevant ignored records]
- Relevant inputs and assumptions: [schema/interfaces/configuration and constraints on which this design depends]
- Predecessor outcomes: [accepted state, evidence and unresolved findings used; none when independent]
- Latest scope reconciliation: [date, current comparison, already-satisfied work removed, dependency/design changes and decision disposition]
- Pre-implementation freshness: [owner/date and comparison result or pending; link the implementation report when available]

<!-- Reassess relevant drift under the contract's decision boundaries; unrelated changes do not invalidate the plan. Keep future dependent partitions provisional. -->

## Product and acceptance criteria

- Problem and audience: [what this solves and for whom]
- Intended behavior: [observable outcomes]
- Success measure: [how the outcome is assessed]
- Implementation completion condition: [observable authorized outcome and required verification; required review remains separate]

| ID | Acceptance criterion, including relevant failure behavior | Required verification |
|---|---|---|
| AC-1 | [observable result] | [test, command, or runtime steps and expected result] |

## Scope

- Expected change areas: [paths or bounded components; include necessary tests/docs/evidence]
- Protected boundaries: [what requires an additional decision]
- Do not build: [adjacent features, speculative work, unrelated refactors]

## Design and delegated choices

- Important system boundaries and interfaces: [contracts, data flow, invariants]
- Existing patterns to reuse: [verified paths]
- Minimum sufficient approach: [how the requirement and important constraints are met without speculative layers]
- Risk-bearing choices settled: [decisions and reasons]
- Implementation choices delegated: [what the worker may decide]
- Planned behavior tests: [existing relevant coverage; identified acceptance/regression/risk gaps requiring additions]
- Program structure where necessary: [file areas, call paths or signatures only where they settle consequential design]

## Behavioral slices

1. [Working outcome, its relevant failure behavior, and acceptance criteria covered]
2. [Next outcome]

<!-- Order by useful behavior and uncertainty. Do not enforce a universal mock/UI/wiring sequence. -->

## Investigate and prerequisites

<!-- For open-ended investigation only: state the evidence or lack of progress that triggers stopping/reassessment, any explicitly agreed cap, and the next action on reaching it. A cap hit does not establish task completion. Omit when inapplicable. -->

| Fact/resource | How to verify | Needed by | If missing |
|---|---|---|---|
| [fact, account, fixture, or environment variable name] | [source/check] | [slice] | [affected path and independent work that can continue] |

## Decisions and deviations

[Meaningful implementation notes, proposals, decision owner, accepted/rejected resolution, and affected spec revision. Apply the shared contract; a proposal does not silently change a requirement.]

## Durable decisions

[Links to ADRs or external setup records, or none. No secret values.]
