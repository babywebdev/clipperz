---
record: "spec"
task: "workflow-maintenance"
spec_revision: "maint-2"
author: "agent"
date: "2026-09-27"
state: "active"
summary: "5.2.0 refresh accepted after passing validation and a clean author-commissioned pre-handoff check. Writing Studio repair-1 remains pending fresh focused assessment; product ownership and historical evidence preserved."
read_when: "Reviewing or dispositioning the 5.0.0 migration, the proposed enforced boundaries, or the recorded version boundary and compatibility items."
---

# Spec: workflow-maintenance

This living record owns repository workflow maintenance: the installed version boundary, maintenance review state, the tool-enforcement proposal awaiting Isaac, and compatibility items. It is not a product task and authorizes no feature work.

## Status

- Objective: surgically refresh the accepted 5.0.0 installation to accepted bundle 5.2.0, preserving project customizations and Writing Studio continuity.
- Task ID: workflow-maintenance; spec revision: maint-2; reviewed snapshot: `_local/generate-init-refresh/20260927/snapshot/manifest.json` (`c201bd7b...`); final bookkeeping in `closure.json`.
- Lane: contained (bounded installation of an accepted bundle, reversible backups, no product behavior/design change); previous substantial maint-1 migration remains accepted history.
- Task owner: Codex maintenance session assigned directly by Isaac on 2026-09-27; previous maint-1 owner ended. No Writing Studio ownership acquired.
- Writing rights: none after maintenance completion; no product writing rights held or transferred.
- Review/repair round: 0; fresh read-only pre-handoff check completed without findings or unresolved hypotheses.
- Implementation: implemented
- Verification: pass (U-1..U-6; doctor 0, no warnings/errors; 16 briefs and two indexes pass; preservation and Git eligibility pass).
- Review: accepted (pre-handoff check, author-commissioned, no findings)
- Integration/release: not authorized; nothing committed, pushed or released.
- Current slice and acceptance IDs: 5.2.0 refresh complete; U-1..U-6 met.
- Current implementation report: docs/project/tasks/workflow-maintenance/reports/5.2.0-upgrade-implementation.md
- Current repair report: none
- Final repair snapshot: not applicable
- Completed slices: maint-1 5.0.0 migration/M-11 gate; maint-2 5.2.0 refresh (2026-09-27).
- Unresolved findings: existing compatibility items C-1..C-11 are historical dispositions below; current applicability is assessed in the upgrade report.
- Pending Isaac decision: none for this upgrade; optional enforced boundaries, commit and old nested-backup relocation remain separate.
- Next action and owner: maintenance complete. Isaac may relay Writing Studio repair-1 to a fresh reviewer-owner for its already-required focused non-author assessment and disposition; no product acceptance or ownership transfer by maintenance.
- Records to open: current upgrade report; Writing Studio Status and repair-1 reports; README and current inventory.
- Evidence root: `_local/generate-init-refresh/20260927/`; backup `_local/generate-init-backup/20260927-5.2.0/`.

## 5.2.0 refresh requirements and scope (maint-2)

Isaac's 2026-09-27 assignment approves installation from this repository's accepted
5.2.0 bundle only. Preserve the source, application work, historical records,
inventories, evidence, shared context, optional reference choices and grants.
U-1..U-6 in the upgrade report are the acceptance/check map for this bounded refresh.
Copy the coherent chain, use profile v2, add bar-guard, preserve one new inventory,
reconcile stale repair-1 resume metadata without acceptance or owner takeover, and
trace startup and lanes. No product work, release, external skill edit, automatic
handoff or grant expansion. No model preference, confirmed by Isaac during this
assignment; neither context threshold is recorded. Plan baseline is the preflight
manifest and verified 5.0.0-local-1 scoped identities. No exception to product review.

The remaining maint-1 sections below describe the prior accepted migration, its
criteria and compatibility history; they do not re-run M-11 or govern this refresh.

## Product and acceptance criteria

| ID | Acceptance criterion | Required verification and expected result |
|---|---|---|
| U-1 | Prior instructions/backups preserved and source untouched | LF inventory and raw-byte backup/source comparison passes |
| U-2 | Coherent 5.2.0 chain, exact configuration and inventory | Bundle bytes, startup parity, strict config and all 21 identities match |
| U-3 | Installed helpers route current records | Doctor 0, no warnings, self-check pass; 16 activity briefs 0; review omissions disclosed |
| U-4 | Startup and three lanes coherent | Complete lane-trace.md; no extra authority or former hub return |
| U-5 | Application/history/evidence and product intent preserved | Before/after hashes; requirements unchanged, spec log append-only, accurate repair-1 pointers |
| U-6 | Storage/Git policy preserved | All expected eligibility/ignore probes pass |

## Scope

Workflow instructions/helpers/templates, README/inventory, this maintenance record
and its reports, and Writing Studio resume metadata plus dated lane-boundary/log
append only. Protected: source bundle, application/tests/configuration, shared
context, historical reports/inventories, ledger, repair evidence and media. No
external writes, commits, pushes, release or product acceptance.

## Current baseline and assumptions

Base `fed8ed13dcb2aade06bee341953d6b10d58bff13`, 619 pre-existing tracked/untracked
files hashed in `before.json`; 20 prior instruction identities match 5.0.0-local-1.
Writing Studio repair-1 is handed off, pending fresh focused assessment. Its two
reports and 137 evidence artifacts are unchanged. The source is the accepted local
5.2.0 bundle, with 40 captured files. All evidence paths are under the current
Evidence root. Required helpers use the Codex host Python because python is absent
from PATH. No product runtime checks are part of this instruction-only refresh.

## Approved exceptions currently in force

None added. Existing evidence locations and disabled grants remain. Isaac confirmed
no model preference; context thresholds remain not recorded. No product review waiver.

## Historical maint-1: Product and acceptance criteria

- Problem and audience: sessions on either host need one active process whose authority, evidence and preservation rules match generate-init 5.0.0, without losing the accepted Writing Studio history.
- Intended behavior and success measure: both startup files route through the same README, contract and common process; the doctor reports no error; historical records are unchanged.
- Implementation completion condition: M-1 to M-10 pass on the final snapshot. M-11 stays a separate gate owned by the next task-state owner.

| ID | Acceptance criterion, including relevant failure behavior | Required verification and expected result |
|---|---|---|
| M-1 | The source bundle is 5.0.0 before any change; the ignored local and live copies agree | Read both SKILL.md metadata values and compare the trees byte-for-byte; expect 5.0.0 and identical |
| M-2 | Exact pre-migration instructions are preserved and restorable outside auto-loading paths; all referenced 4.1.0 inventories stay unchanged | Before edits, current bytes match 4.1.0-local-2; backup copies match originals; no backup under a `.claude/rules/` path; inventories and the 20260913 mapping unchanged |
| M-3 | Accepted work, application code, media, reports, handoffs, baselines, ledger rows and evidence are unchanged | Before/after manifests over tracked, untracked and ignored evidence/backup trees; application diff hash unchanged; only expected paths differ |
| M-4 | One coherent active 5.0.0 chain; no v4 role routing active in startup files, README or CLAUDE.md; retired role files outside the active tree | Byte comparison with the bundle; doctor stale-role checks; text scan |
| M-5 | README uses the strict 5.0.0 grammar and keeps project facts: docs tracked with existing evidence exceptions, verification delegation disabled, no enforced boundaries, local commits not authorized, reference selection recorded | `parse_config()` with root checks; field values match expectations |
| M-6 | Codex and Claude startup chains resolve through README, contract Part A, process Orient and activity sections, CLAUDE.md, the selected reference, Status and a bounded index | `brief.py` for every activity on both tasks exits 0; `--role` refused; exact H2 headings resolve; linked paths exist |
| M-7 | New immutable inventory records LF identities for all required instruction paths and the exact effective configuration | Doctor: identities match, required rows present, configuration matches, no ERROR |
| M-8 | Git eligibility preserved: startup files and durable docs eligible; local Claude settings, backups and evidence ignored | `git check-ignore --no-index` on enumerated paths |
| M-9 | Version boundary and compatibility recorded; Writing Studio metadata changed only where needed, with attribution and append-only history | Spec diff limited to Status and one appended paragraph; spec-log prefix byte-identical; index lists records |
| M-10 | Findings-only self-audit of the final migration snapshot | Self-audit report with ten lenses and a verdict |
| M-11 | Fresh non-author maintenance review and disposition before Writing Studio planning resumes | Review-only report at the reserved path and a recorded disposition; never performed by the migration author |

## Historical maint-1: Scope

- Expected change areas: startup files, `docs/workflow/`, task and record templates, README, the two CLAUDE.md routing sentences, Writing Studio Status plus one appended spec paragraph and spec-log entry, this record, the new inventory, local backups and evidence.
- Protected boundaries: application code, media, tests, historical reports, handoffs, baselines, evidence, ledger rows, prior inventories and backups, `.gitignore`, PodStack commands and knowledge files. archive-dnr is never read.
- Do not build: feature planning or implementation, commits, pushes, releases, automatic handoffs, hooks, schedulers, verification delegation, tool-enforced rules, or edits to external skills, vault records or other repositories.

## Design and delegated choices

- Retired 4.1.0 roles: `docs/workflow/roles/project-lead.md` and `worker.md` leave the active tree instead of remaining as a second manual; bytes stay in the ignored backup and at commit `fed8ed1`.
- Reference selection: `local-app.md` is selected because Clipperz is a local media application with a user-facing Studio. It is new in the bundle, so no deliberate removal is overridden. The task-state owner may deselect it at the next substantial plan, and later refreshes must preserve that removal.
- Authority mapping: the 4.1.0 coordinating lead becomes the active authorized task-state session and Worker a separately assigned implementation writer. Host defaults are removed. Kept: manual relays through Isaac, fresh non-author initial review, per-assignment limits, disabled verification delegation, the two-round review budget and the three-attempt circuit breaker.
- Closure semantics: 5.0.0 conditional closure replaces the 4.1.0 author-lead independent-closure default. Writing Studio's explicit rule requiring fresh independent follow-up after each relayed correction still applies.
- CLAUDE.md: only the v4 role-routing wording changed; every project fact and the PodStack boundary are retained with original line endings.
- Writing Studio stays at spec revision lead-22 because no requirement changed.
- Delegated internal choices: evidence layout and helper scripts under the evidence root.

## Behavioral slices

1. 5.0.0 migration: preserved pre-migration identity and backup, verbatim install, strict README and immutable inventory, reconciled CLAUDE.md and Writing Studio metadata, verified by M-1 to M-10. Any failed check leaves Verification fail or incomplete; the backup's `RESTORE.md` restores 4.1.0 without deleting new or historical records.
2. Maintenance gate: M-11 fresh independent review and disposition by the next task-state owner. Writing Studio work stays paused until the disposition accepts the migration.

## Prerequisites

| Fact/resource | How to verify | Needed by | If missing |
|---|---|---|---|
| generate-init 5.0.0 source | `SKILL.md` metadata and tree comparison | slice 1 | Stop before a partial install |
| Python 3 for the helpers | `python --version` | slice 1 checks; later startup packets | Bounded direct reads; affected checks recorded as not run |
| Git repository at `fed8ed1` | `git rev-parse HEAD` | Snapshot and eligibility checks | Content manifests only, with the limitation stated |
| Fresh non-author reviewer | Subagent without inherited history, or a separate review-only session | slice 2 | Review stays pending |

## Proposed tool-enforced boundaries

Awaiting Isaac's per-repository decision; nothing is applied and README records `Enforced boundaries: none: instructions only`. Proposed starting deny list for Claude project permissions and equivalent Codex rules where supported:

- Any `git push`, including `origin main`, the `upstream` podcli remote, and tag pushes. A `v*` tag push starts the automated GitHub release in `.github/workflows/release.yml`.
- Release commands such as `gh release create` and `npm publish`.
- Working-tree destruction that would discard uncommitted accepted work: `git reset --hard`, `git clean`, `git checkout -- .`, `git restore .`, `git stash drop` and `git stash clear`.
- Recursive deletion outside `_local/`, including `data/`, `.podcli/`, `podcli-clips/`, `episodes/` and user media folders.

No hosted database or production deployment exists for this local application, so none is proposed. A project Claude settings file would also need a narrow `.gitignore` exception to travel with the repository; that choice belongs to the same decision.

## Version boundary

- Before: 4.1.0, inventory `4.1.0-local-2` (2026-09-19). All 19 recorded instruction and context paths were byte-identical to it at the pre-migration capture (2026-09-23T02:22Z, evening of 2026-09-22 local time). Its three maintenance-only source rows described the earlier 4.1.0 skill, which had already been replaced by 5.0.0 in the ignored source folder.
- After: 5.0.0, inventory `5.0.0-local-1`, installed by this session under generate-init 5.0.0.
- 4.1.0 bindings stay: every Writing Studio record through 1B.2b.2 acceptance at lead-22 and the 4.1.0 refresh records. Nothing is rebound.
- 5.0.0 bindings: this migration's post-install verification and self-audit, the M-11 review and its disposition (recorded 2026-09-22 after M-11 R2), and all work started after the maintenance disposition. The migration implementation report binds 4.1.0-local-2 because that revision was installed when the assignment began; its body records the switch.
- Checkout boundary: all 5.0.0 changes are uncommitted; commit `fed8ed1` still holds 4.1.0.

## Compatibility items

None blocks the review, acceptance or Writing Studio planning. Each remains open until its owner resolves or accepts it.

| ID | Item | Consequence and handling |
|---|---|---|
| C-1 | Writing Studio spec headings predate 5.0.0 (`Acceptance criteria and verification`, `Scope and preservation`) | `brief.py` shows an empty acceptance map and names 5.0.0 headings; read the equivalent sections directly. Restructuring the living spec is left to its owner |
| C-2 | Wrapped Status bullets | `brief.py`'s next-action excerpt shows only the first line; the verbatim Status above it is complete |
| C-3 | 4.1.0 record kinds and authors (`worker-report`, `worker`, `reviewer`, `coordinating-lead`) | Read as legacy values; no backfill. The schema's only worked example is the bundle's labelled historical 4.2.0 example; this repository never installed 4.2.x |
| C-4 | Junctions in ignored scratch and evidence (64 under `_local/project/evidence/`, 139 under `_local/clipperz/tmp/`) | `review-packet.py` refuses its Git-tree comparison with exit 2 in this checkout; reviewers use the preserved manifests and direct bounded reads. Evidence is not moved |
| C-5 | Closure semantics changed (see Design) and host role defaults removed | Isaac can record a stricter repository-wide independent-closure rule as an explicit project rule if wanted |
| C-6 | 4.1.0-local-2 maintenance-only source rows no longer match the ignored source folder | Historical rows stay as written; they were never installed instruction identities |
| C-7 | Uncommitted state | Another checkout or worktree from `fed8ed1` has 4.1.0; commit or transfer before using it |
| C-8 | Bundle files are LF while the prior install was CRLF on disk | Not drift: 5.0.0 identities are LF-normalized and Git normalizes on commit |
| C-9 | The Writing Studio `Current implementation report` pointer is bound to lead-22 | If the next spec revision is written without updating it, `brief.py` refuses with exit 2 (reproduced in a scratch copy; resetting it to `none` restores exit 0). Update the three pointers in the same edit |
| C-10 | No live Codex startup was observed here because no Codex CLI is installed | `AGENTS.md` has the exact body of the Claude rule, which a fresh subagent exercised live. The coordinating session's first reread is the first live Codex run; report any divergence in the review or disposition. Still open after M-11: the coordinating and reviewer sessions were both Claude |
| C-11 | Pre-existing v4 startup copies ("Default to Worker") sit under nested `.claude/rules/` paths in `_local/generate-init-backup/20260913-4.1.0/` and `_local/generate-init-refresh/20260913/snapshot/files/` (M-11 R4) | Both startups observed on 2026-09-22 auto-loaded only the root rule; on-demand nested loading is untested and routine work does not open backups. Relocation needs Isaac's decision because 20260913 records reference both copies by hash |

## Historical maint-1: Current baseline and assumptions

- Base commit `fed8ed13dcb2aade06bee341953d6b10d58bff13` with 63 pre-existing uncommitted status entries (Writing Studio application work and task records), all preserved; hashes in `_local/generate-init-refresh/20260922/before.json`.
- Writing Studio 1B.2b.2 accepted at lead-22 after repair-4 and fresh review; application writes stopped; no successor dispatched.
- Environment: Windows 11 (10.0.26200), Git 2.55.0.windows.4 with `core.autocrlf=true`, Python 3.14.3.

## Historical maint-1: Approved exceptions currently in force

None. Isaac's assignment authorized the migration, backups, needed task-metadata reconciliation and these records. It authorized no feature planning or implementation, commit, push, release, automatic handoff or verification delegation.
