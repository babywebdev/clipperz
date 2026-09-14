---
record: "worker-report"
task: "[task]"
cycle: "[cycle]"
spec_revision: "[revision]"
snapshot: "[commit or reproducible snapshot record]"
author: "worker"
date: "[YYYY-MM-DD]"
state: "active"
summary: "[Outcome first; at most 40 words]"
read_when: "[Relevant situations; at most 25 words]"
evidence: "[evidence path]"
workflow_version: "[installed version or unknown]"
instruction_inventory: "[preserved inventory revision or unknown]"
---


# Implementation Report: [task] / [cycle]

<!-- Copy to docs/project/tasks/[task]/reports/[cycle]-worker.md; also usable for lead repairs/solo implementation with author: coordinating-lead. Follow docs/workflow/record-frontmatter.md. Soft cap 1,200 words; state any reason to exceed, never dropping required findings/evidence. Drafts stay editable until handoff, including checkpoints. At handoff freeze assessment and evidence/provenance metadata; corrections use attributed dated addenda or successor reports. -->

## Identity and freshness

- Implementation author: [actual role/session]
- Spec path and bound revision: [exact reference matching header]
- Code snapshot and snapshot evidence: [commit/record matching header; relevant inputs]
- Environment/target: [versions, runtime URL/build identity and fixtures]
- Plan freshness: [starting/resumed relevant state versus baseline; drift and disposition, or no relevant drift]
- Resume before lead reconciliation: [Status versus relevant report Handoff/evidence/working tree; discrepancy and independently authorized next work, or not applicable]
- Implementation: partial | implemented | blocked
- Verification: pass | fail | incomplete
- Submitted for review: [yes/no, reason; acceptance belongs to coordinating lead]

## Execution Receipt

<!-- Fill every required check against the spec's acceptance IDs; no separate planned-check section. Each row is self-sufficient: command/steps, expected result and actual result. Output excerpts max ten lines each only when the line is evidence; longer output is filed before reading a filtered summary. Retain actual exit codes, never synthesize output. An inaccessible artifact makes a row incomplete, not a product failure. -->

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| [AC/check] | [executed command/steps; expectation] | [actual result/code] | [artifact path] | [snapshot] | [self / subagent / human-assisted] |

- Executor identities and target: [actual session/subagent/operator identities mapped to rows]
- Runtime coverage: [happy/failure paths; console/network evidence when relevant]
- Human assistance: [limitation, operator/method, agent-observed versus user-reported outcome/corroboration, evidence path, cleanup and gaps; or none]
- Not applicable: [check and task-specific reason, or none]
- Not run: [required check, reason and acceptance consequence, or none]
- Changed inputs after checks: [none, or affected evidence and replacement verification]

## Change inventory

[Git-derived paths including staged/unstaged, deleted, renamed, binary and untracked changes; one line per important change. Without Git, name the compared manifest.]

## Deviations and decision requests

[Current decision, proposed alternative, evidence/reason, tradeoff, decision owner, affected acceptance IDs/path, resolution and independent work that can continue; or none.]

## Limitations and findings

- Defects, including fixed defects and recurrence: [ledger IDs/evidence or proposed first occurrence]
- Uncertainty, incomplete behavior, or out-of-scope observations: [specific evidence or none]
- Proposed durable corrections: [evidence/status and existing canonical destination; lead reconciles]

## Handoff

- Checkpoint or actual handoff: [draft checkpoint / handed off, date/session; a checkpoint creates no relay or approval gate]
- Current implementation owner: [role/session; whether writes stopped for handoff]
- Current snapshot: [exact reference]
- Unfinished work and unresolved findings: [items or none]
- Last failed approach: [one line, prior failure/evidence, what next attempt changes; or none]
- Next action and owner: [concrete step; any reached investigation stop/cap and consequence]
- Pending Isaac decision: [existing product/business/designated approval boundary or none]
- Durable decisions: [ADR/external links or none]

<!-- Worker checkpoints update this report/evidence without editing or waiting for lead Status or lifecycle updates. Implementation completion, handoff, recommendation, acceptance and release are distinct. -->
