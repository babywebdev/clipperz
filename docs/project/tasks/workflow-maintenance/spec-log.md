---
record: "spec-log"
task: "workflow-maintenance"
author: "agent"
date: "2026-09-27"
state: "active"
summary: "Maint-1 acceptance preserved; maint-2 refresh adopts 5.2.0 forward lanes without transferring Writing Studio ownership."
read_when: "Tracing workflow maintenance version boundaries and former hub precedent."
---

# Workflow maintenance history

## 2026-09-27 — maint-1 to maint-2

Isaac assigned a surgical update from the accepted local 5.2.0 bundle. The maint-1
spec is preserved byte-for-byte in the upgrade backup; its prior Status follows.
Later work uses the 5.1.0 lanes as incorporated in 5.2.0, not prior hub returns.
No historical report is rebound. Maint-2 is a contained, reversible installer
refresh; the accepted maint-1 substantial migration is not reclassified.

### Preserved maint-1 Status

- Objective: move the installed project workflow from 4.1.0 to 5.0.0 with one coherent active authority system and no loss of accepted work or history.
- Task ID: workflow-maintenance; spec revision: maint-1; current snapshot: base `fed8ed1` plus `_local/generate-init-refresh/20260922/snapshot/manifest.json`
- Lane: substantial (repository-wide workflow authority migration; no application behavior change)
- Review/repair round: 0 of 2 (no repairs)
- Implementation: implemented
- Verification: pass (M-1 to M-10: 30 of 30 checks and clean doctor, reproduced by M-11; M-3 capture omitted managed storage, covered by M-11's repository-wide scan; Claude cold start was a precheck, M-11's startup resolved the final chain; no live Codex run, C-10)
- Review: accepted 2026-09-22 (M-11 fresh non-author review; R2 and R3 resolved, R1 and R4 nonblocking deferrals)
- Integration/release: not authorized; nothing committed or pushed (C-7)
- Current slice and acceptance IDs: 5.0.0 migration; M-1 to M-11 met
- Task-state owner: the coordinating Claude Code session (Opus 5.5) that dispositioned M-11 on 2026-09-22; later maintenance goes to the session Isaac assigns; implementation writer: none
- Current implementation report: docs/project/tasks/workflow-maintenance/reports/5.0.0-migration-implementation.md
- Current repair report: none
- Final repair snapshot: not applicable
- Completed slices: 1 (5.0.0 migration) and 2 (maintenance gate)
- Unresolved findings: none open; WM-01 indexed Closed; compatibility items C-1 to C-11 below
- Last failed approach: none
- Pending Isaac decisions, none blocking Writing Studio planning: commit the 5.0.0 files; the optional deny list below; a stricter closure rule (C-5); the README backup-path fix (M-11 R1); relocating nested v4 rules copies (C-11)
- Next action and owner: Isaac assigns the Writing Studio task-state session to refresh its next bounded plan under 5.0.0-local-1 in this checkout (process Plan; contract "Scope and design changes" and "Plan freshness").
- Records to open for this action: this spec; `reports/5.0.0-migration-review.md` Disposition; `docs/workflow/README.md`; `docs/workflow/inventories/5.0.0-local-1.md`
- Evidence root: `_local/generate-init-refresh/20260922/`; review evidence `_local/project/evidence/workflow-maintenance/m11-review/`

## 2026-09-27 - maint-2 completion

U-1..U-6 passed. The fresh read-only author-commissioned pre-handoff check returned
no confirmed findings or unresolved hypotheses; accepted in the contained lane.
No instruction or product edit followed the check. Status/report closure is
bookkeeping, recorded in closure.json; the reviewed snapshot remains immutable.
Writing Studio ownership, open findings and required fresh assessment are unchanged.
