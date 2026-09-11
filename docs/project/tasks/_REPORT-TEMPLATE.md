# Worker Report: [task] / [cycle]

<!-- Copy to docs/project/tasks/[task]/reports/[cycle]-worker.md. Also usable for a lead's implementation repair: identify the actual author. Keep previous cycle records intact. -->

## Assignment and identity

- Task ID and slice: [assignment]
- Implementation author: [role/session]
- Spec path and revision: [exact reference]
- Installed workflow provenance: [installed version and relevant customized/retained instruction versions, or unknown; use the installed inventory and actual files]
- Code snapshot: [commit with clean implementation tree, or base commit plus patch/content manifest]
- Snapshot evidence: [path for uncommitted/no-Git work, or not applicable]
- Environment/target: [relevant versions, test environment, runtime URL or build identity]
- Plan freshness check: [starting/resumed relevant state versus planning baseline; drift and decision disposition, or no relevant drift]
- Implementation: partial | implemented | blocked
- Verification: pass | fail | incomplete
- Submitted for review: [yes/no and reason; acceptance belongs to the lead]

## Execution Receipt

<!-- Actual execution evidence. Link bulky logs, retain decisive excerpts, and never synthesize output. Every required check has a result or named gap. -->
<!-- After handoff, substantive corrections require an attributed, dated addendum or linked successor with the reason and effect on evidence/acceptance. Preserve the original result subject to required secret redaction. -->

| Criterion/check | Exact command or runtime steps | Actual exit code/result | Evidence excerpt/path | Code snapshot checked |
|---|---|---|---|---|
| [AC/check] | [executed command] | [actual code; not applicable for manual browser steps] | [real output excerpt or evidence] | [snapshot] |

- Runtime behavior exercised: [happy path and relevant failure paths; console/network evidence when useful]
- Human assistance: [none, or tool limitation/blocker, operator and manual steps, observed outcome/corroboration, target/snapshot, cleanup and remaining gaps; distinguish agent observations from user-reported results]
- Not applicable: [check and task-specific reason, or none]
- Not run: [required check, reason, and approval consequence, or none]
- Changes after these checks: [none, or changed inputs and replacement verification]

## Change inventory

[Derive from Git, including staged/unstaged/untracked changes. When Git is unavailable, identify the manifest used. Explain important changes; do not hide unrelated, deleted, binary or renamed files.]

## Deviations and decision requests

[Current decision, proposed alternative, evidence, tradeoff, decision owner, affected path, resolution, and what independent work can continue. Use "none" when appropriate.]

## Limitations and findings

- Known defects or incomplete behavior: [list or none]
- Choices needing scrutiny: [specific uncertainty and supporting context, or none]
- Proposed durable corrections: [evidence/status and existing canonical destination, or none; coordinating lead reconciles]
- Out-of-scope observations: [list or none]

## Handoff

<!-- For repairs, link the prior failure/evidence and identify what the next attempt should investigate or change. If an investigation stop condition/cap was reached, name it and preserve unfinished work. -->

- Current implementation owner: [role; whether writes have stopped for handoff]
- Next action and owner: [concrete step]
- Pending Isaac decision: [product/business/designated approval only, or none]
- Durable decisions recorded: [ADR/external links or none]
