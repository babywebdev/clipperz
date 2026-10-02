---
record: "implementation-report"
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


# Implementation Report: [task] / [cycle]

<!-- Copy to docs/project/tasks/[task]/reports/[cycle]-implementation.md; usable for any authorized implementation session; author stays `agent` and the actual session is named below. A repair round uses this template as its repair report, with the round in `cycle` (for example `[slice]-repair-1`), and lists the findings it addresses. Follow docs/workflow/record-frontmatter.md. Soft narrative cap 600 words, excluding tables, change inventories and evidence paths; state any reason to exceed, never dropping required findings/evidence. Drafts stay editable until handoff, including checkpoints. At handoff freeze assessment and evidence/provenance metadata; corrections use attributed dated addenda or successor reports. -->

## Identity and freshness

- Implementation author: [actual session and whether author of earlier reviewed code]
- Assignment, lane and rights held: [implement / repair round N / review and fix / resume; lane; task ownership, writing rights or both, and the handoff that granted them]
- Repair round and findings addressed: [round N and finding IDs from the review, or not a repair]
- Execution profile and context mode: [model and effort if the tool exposes them; fresh or continued context]
- Spec path and bound revision: [exact reference matching header]
- Code snapshot and snapshot evidence: [commit/record matching header; relevant inputs]
- Environment/target: [versions, runtime URL/build identity and fixtures]
- Plan freshness: [starting/resumed relevant state versus baseline; drift and disposition, or no relevant drift]
- Resume before Status reconciliation: [Status versus relevant report Handoff/evidence/working tree; discrepancy and independently authorized next work, or not applicable]
- Implementation: partial | implemented | blocked
- Verification: pass | fail | incomplete
- Submitted for review: [yes/no, reason; acceptance requires the applicable gates]

## Execution Receipt

<!-- Fill every required check against the spec's acceptance IDs. Create rows with a pending result before substantial implementation and complete them with actual results; no separate planned-check section. Each row is self-sufficient: command/steps, expected result and actual result. Output excerpts max ten lines each only when the line is evidence; longer output is filed before reading a filtered summary. Retain actual exit codes, never synthesize output. An inaccessible artifact makes a row incomplete, not a product failure. A new or changed test that evidences new or changed behavior records its fail-first result (fails on the baseline or with the change reverted, then passes) or why that is not feasible; tests pinning unchanged refactor behavior are exempt. Side-effecting checks name their test-mode or non-production target. -->

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| [AC/check] | [planned command/steps, then actual execution; expectation] | [pending, then actual result/code] | [artifact path] | [snapshot] | [self / subagent / human-assisted] |

- Executor identities and target: [actual session/subagent/operator identities mapped to rows]
- Runtime coverage: [happy/failure paths; console/network evidence when relevant]
- Human assistance: [limitation, operator/method, agent-observed versus user-reported outcome/corroboration, evidence path, cleanup and gaps; or none]
- Not applicable: [check and task-specific reason, or none]
- Not run: [required check, reason and acceptance consequence, or none]
- Changed inputs after checks: [none, or affected evidence and replacement verification]

## Change inventory

[Git-derived paths including staged/unstaged, deleted, renamed, binary and untracked changes; one line per path with purpose, relevant acceptance IDs and affected interfaces. Without Git, name the compared manifest. This is a review map, not a read boundary or pasted code.]

## Deviations and decision requests

[Current decision, proposed alternative, evidence/reason, tradeoff, decision owner, affected acceptance IDs/path, resolution and independent work that can continue; or none.]

## Limitations and findings

- Defects, including fixed defects and recurrence: [ledger IDs/evidence or proposed first occurrence]
- Uncertainty, incomplete behavior, or out-of-scope observations: [specific evidence or none]
- Proposed durable corrections: [evidence/status and existing canonical destination; current task owner reconciles]

## Pre-handoff check

<!-- Author material, read by reviewers after their own inspection. Finding rows sit outside the narrative cap. -->

- Subagent and saved files: [type; model family when exposed; [evidence root]/pre-handoff-check/ paths; or not run and why]
- Findings and hypotheses, one line each: [ID linked to its original finding in the saved return; the check's severity; fixed, disproved or disputed with evidence, or deferred with reason. Preserve full verbatim text in that return, not this index; the contract's ten-line quote limit still applies]
- Doubtful checks named: [check and receipt result, or none]
- Contained closure: [post-repair self-audit; each confirmation with per-finding results; acceptance basis and Status label]
- Handed off: [proposed ledger rows; for contained work, why it went forward]

## Handoff

- Checkpoint or actual handoff: [draft checkpoint / handed off, date/session; a checkpoint creates no relay or approval gate]
- Forward handoff issued: [next assignment (plan / implement / review as reviewer-owner / repair round N / review and fix / resume) and rights transferred (task ownership, writing rights or both); or not yet]
- Writing-rights holder: [session; whether writes stopped for handoff]
- Current snapshot: [exact reference]
- Unfinished work and unresolved findings: [items or none]
- Decision requests for the next task owner: [items or none]
- Last failed approach: [one line, prior failure/evidence, what next attempt changes; or none]
- Next action and owner: [concrete step; any reached investigation stop/cap and consequence]
- Pending Isaac decision: [existing product/business/designated approval boundary or none]
- Durable decisions: [ADR/external links or none]

<!-- Implementation checkpoints update this report/evidence. The task owner reconciles Status; a repairer holding writing rights only, and review-only, do not. After its handoff the sending session never resumes the task. Implementation completion, handoff, recommendation, acceptance and release are distinct. -->
