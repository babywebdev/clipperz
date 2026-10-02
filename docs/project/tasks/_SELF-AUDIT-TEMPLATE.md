---
record: "self-audit"
task: "[task]"
cycle: "[cycle]"
spec_revision: "[revision]"
snapshot: "[assessed reproducible snapshot]"
author: "agent"
date: "[YYYY-MM-DD]"
state: "active"
summary: "[Outcome first; at most 40 words]"
read_when: "[Relevant situations; at most 25 words]"
evidence: "[evidence path]"
workflow_version: "[installed version or unknown]"
instruction_inventory: "[preserved inventory revision or unknown]"
---

# Self-audit: [task] / [cycle]

<!-- Copy to docs/project/tasks/[task]/reports/[cycle]-self-audit.md. Bound to the assessed implementation snapshot and actual author/session. Soft narrative cap 600 words excluding tables, inventory and evidence paths; never omit material findings. Findings-only audit; separate implementation activity handles authorized fixes and refreshes affected coverage. Follow the README-configured self-audit procedure and docs/workflow/record-frontmatter.md. -->

## Identity and scope

- Author/session and context: [actual identity; fresh/continued]
- Spec revision and assessed snapshot: [exact paths/identity]
- Changed paths and relevant dependencies: [Git/manifests and reason]
- Environment/target and evidence: [actual target/paths]
- Scope limits: [gaps or none]

## Cleanup sweep

<!-- Include the weakened-bar sweep: suppressions, skipped/deleted tests and removed assertions, throwing stubs, empty catch blocks, TODOs standing in for implementation, lowered thresholds or disabled checks. bar-guard.py output, when used, is a list of leads; cite its evidence path. -->

| Location/snapshot | Classification | Evidence and consequence | Proposed outcome |
|---|---|---|---|
| [path] | [safe cleanup / needs decision / weakened bar / justified bar change / none] | [concrete evidence] | [outcome] |

## Audit lenses

| Lens | Assessment and evidence, or N/A reason | Finding/uncertainty and required outcome |
|---|---|---|
| Critical correctness | [trace/check] | [result] |
| Security attack paths | [actor/input/sink or N/A] | [result] |
| Test coverage | [outcome and existing coverage] | [result] |
| Dependencies and supply chain | [versions/advisory source/date or unassessed] | [result] |
| Failure paths | [trigger and handling] | [result] |
| Breaking changes and migrations | [consumers/data] | [result] |
| Documentation drift | [observable docs] | [result] |
| Accessibility | [UI evidence or N/A] | [result] |
| Observability | [failure diagnostics] | [result] |
| Engineering invariants | [actual protections and evidence] | [result] |
| Performance and resource bounds | [queries, reads, request-path work, pools and limiters; same before/after measurement and environment, or N/A] | [result] |

## Confidence and blind spot

- Material uncertainties and investigation: [root-cause result or required proof]
- Biggest blind spot: [specific plausible omitted interaction]

## Verdict and next action

- Verdict: PASS | PASS-WITH-FINDINGS | BLOCKED | INCOMPLETE
- Findings and dispositions: [trigger, impact, location/snapshot, evidence/uncertainty, required outcome; nonblocking basis]
- Next action and owner: [specific authorized action or blocker]
- Evidence validity after changes: [snapshot still current, or affected checks/audit to refresh]
