# Installed Project Workflow

- Bundle version: 4.1.0
- Installed mode: project
- Installation date: 2026-09-11; refresh date: 2026-09-13
- Source bundle: `.agents/skills/generate-init/`, metadata workflow-version 4.1.0.
  This is provenance only; ordinary sessions use the installed files below and do
  not depend on the ignored source bundle.
- Local customization policy: installed files are user-owned; compare before updates.

## Startup defaults and role map

Codex defaults to Project Lead through `AGENTS.md`. Claude Code defaults to Worker
through `.claude/rules/workflow.md`. Explicit assignments override these defaults
for that assignment. No role-selection message is needed for ordinary sessions.

| Role | File |
|---|---|
| Project Lead, including review-only assignments | `docs/workflow/roles/project-lead.md` |
| Worker | `docs/workflow/roles/worker.md` |

Both read the mandatory contract core (Part A), selected role, shared context and
applicable references, then assigned Status and a bounded task index. Read each
complete applicable Part B procedure before its named action. Reading shared
responsibilities grants no other role's authority. Review-only assignments have
no coordination, implementation, acceptance, shared-record or delegation authority.

## Selected project references

None from the bundle: generic local media application. SaaS and LucentDev client-web
references are not selected; their business and phase assumptions are not established
for this repository. Reassess applicability when substantial scope changes.

`docs/project/references/podstack.md` is a retained, locally adapted content reference,
loaded only for explicit PodStack/content-production tasks. It is not a startup role
or a selected software domain reference.

## Project context and state owners

- Shared project facts and conventions: `CLAUDE.md`.
- Local runtime/setup/verification: `docs/local-setup.md`.
- Dependency versions and available scripts: project manifests and lockfiles.
- Ordinary substantial task status: `docs/project/tasks/[task]/spec.md`.
- Existing phase-status authority: not applicable; no phase pipeline installed.
- ADRs: `docs/adr/`; external setup: `docs/external/`.
- Existing `plans/`, `_local/project/`, PodStack commands/persona documents, and
  knowledge files are preserved. Historical records are not automatically current
  approvals or verified evidence. The original installation fabricated no task.
  This refresh reconciles the existing Writing Studio task only.
- `docs/writing-studio-plan.md` remains a discussion draft. Installation does not
  approve its open product decisions or dispatch feature implementation.

## External workflow dependencies

No external build/verify/wrap skills are required. Use the repository's actual
runtime and verification tools described in `docs/local-setup.md`. The supplied
repo-study skill is optional and was not modified or invoked by this installation.
No global skill, client configuration, or other repository was changed.

The coordinating lead may delegate bounded fresh review; otherwise use its separate
fresh-session review fallback. Worker may delegate bounded fresh read-only
exploration under Phase A unless the assignment is narrower. Phase B verification
execution is available equally to eligible Worker and explicitly assigned solo
implementation owners only when enabled at Isaac's direction. Review-only delegates
nothing; no grant permits delegated repairs, implementation, acceptance or recursion.
Installation provisions no tools or agents. Lead-Worker relays remain manual.

Verification delegation: disabled

The prior installation had no enabled flag; this refresh does not enable one.
Repair-3 retains its existing no-agent-dispatch boundary. An explicit solo slice
uses the lead procedure, excludes consequential work and retains independent closure.

The agent runs the optional standard-library Python index at
`docs/workflow/scripts/record-index.py` with bounded pages (default 20); use bounded
header reads if Python is unavailable. The schema and reading semantics live in
`docs/workflow/record-frontmatter.md`. Isaac need not run the utility.

## Storage policy

Storage policy: docs tracked

Preserve the existing Git eligibility of durable docs and the narrow Claude startup
exception. Small decisive secret-free text may live in task evidence; new bulky
logs/screenshots/patches normally use `_local/project/evidence/[task]/`.
Existing Writing Studio evidence and repair snapshots remain in
`_local/project/writing-studio/`, including the already assigned repair-3 snapshot
path. Keep existing runtime logs/results at their recorded paths; do not move or
rewrite them merely to fit the new default. Workflow-refresh backups/evidence use
`_local/generate-init-backup/` and `_local/generate-init-refresh/`.
Explicitly transfer required ignored artifacts and instructions/inventories plus
uncommitted task records to another checkout before resume/review. A missing
artifact is incomplete evidence; rerunning now does not prove historical execution.

## Installed-file inventory

- Current preserved inventory revision: `docs/workflow/inventories/4.1.0-local-1.md`.
- Prior observed instruction revision: `docs/workflow/inventories/4.0.6-pre-refresh-20260913-1.md`.
- Reports bind the preserved revision actually used, including local identities;
  the mutable README alone is not provenance. Never overwrite referenced inventories.

| Destination | Bundle source | Source version | State and local changes |
|---|---|---|---|
| `AGENTS.md` | `templates/project-agents.md` | 4.1.0 | Unmodified, byte-for-byte copy |
| `.claude/rules/workflow.md` | `templates/workflow.md` | 4.1.0 | Unmodified, byte-for-byte copy |
| `docs/workflow/contract.md` | `templates/contract.md` | 4.1.0 | Unmodified, byte-for-byte copy |
| `docs/workflow/record-frontmatter.md` | `templates/record-frontmatter.md` | 4.1.0 | Unmodified, byte-for-byte copy |
| `docs/workflow/scripts/record-index.py` | `scripts/record-index.py` | 4.1.0 | Unmodified, byte-for-byte copy |
| `docs/workflow/roles/project-lead.md` | `roles/project-lead.md` | 4.1.0 | Unmodified, byte-for-byte copy |
| `docs/workflow/roles/worker.md` | `roles/worker.md` | 4.1.0 | Unmodified, byte-for-byte copy |
| `docs/project/tasks/_SPEC-TEMPLATE.md` | `templates/spec-template.md` | 4.1.0 | Unmodified, byte-for-byte copy |
| `docs/project/tasks/_SPEC-LOG-TEMPLATE.md` | `templates/spec-log-template.md` | 4.1.0 | Unmodified, byte-for-byte copy |
| `docs/project/_LEDGER-TEMPLATE.md` | `templates/findings-ledger-template.md` | 4.1.0 | Unmodified, byte-for-byte copy |
| `docs/project/tasks/_REPORT-TEMPLATE.md` | `templates/report-template.md` | 4.1.0 | Unmodified, byte-for-byte copy |
| `docs/project/tasks/_REVIEW-TEMPLATE.md` | `templates/review-template.md` | 4.1.0 | Unmodified, byte-for-byte copy |
| `docs/adr/_TEMPLATE.md` | `templates/adr-template.md` | 4.1.0 | Unmodified, byte-for-byte copy |
| `docs/external/README.md` | `templates/external-README.md` | 4.1.0 | Unmodified, byte-for-byte copy |
| `docs/workflow/README.md` | `templates/workflow-README.md` | 4.1.0 | Customized: retained local selections, provenance, storage and preservation notes; added schema/index, grants and inventory binding |
| `CLAUDE.md` | Existing project file; `templates/project-context.md` was guidance only | Original provenance unknown; reconciled for 4.0.6, retained in 4.1.0 | Retained byte-for-byte: project facts, optional PodStack boundary and runtime context |
| `docs/local-setup.md` | Existing project runtime context | Existing provenance unknown; repair-2 hash retained | Retained byte-for-byte, including uncommitted repair-2 documentation |
| `docs/project/references/podstack.md` | Existing `CLAUDE.md` content instructions | Existing provenance unknown | Retained byte-for-byte, explicit content-task activation only |
| `.gitignore` | Existing repository rules | Existing provenance unknown | Retained byte-for-byte, docs tracked and narrow Claude startup exception |

## Backup and preservation

The pre-installation `CLAUDE.md` and `.gitignore` were copied byte-for-byte to
`_local/generate-init-backup/20260911-153103/`. Backups are ignored and outside all startup rule directories.
Existing `.claude/commands/`, root PodStack documents, skills, media, and plans were
preserved. `_local/project/` already existed and is retained for scratch records.

The 2026-09-13 refresh preserved the actual prior instructions and all Writing
Studio task records byte-for-byte under `_local/generate-init-backup/20260913-4.1.0/` before edits.
Original and successor hashes, provenance limitations and reconciliation progress
are recorded in `docs/project/tasks/writing-studio/spec-log.md`, with the immutable
mapping at `docs/workflow/reconciliation/20260913-record-identities.json`.
Prior reports, manifests, patches, ADRs, instruction inventories and accepted-cycle
evidence remain unchanged. No archive-dnr content is read or modified.

## Resume and maintenance

Orient in order: this README, contract core, selected role, shared context,
applicable selected references, assigned spec Status (or existing phase owner),
then bounded task index. Read required requirements, acceptance map, constraints,
current baseline and exceptions before implementation. Use section-first body
reads when assignment, read_when, freshness, evidence, recurrence or independent
review calls for them. Active means eligible, not mandatory reading; relevant
unclassified/historical evidence remains discoverable. Apply plan freshness before
authoring/start/resume, and reload uncertain protections/procedures after compaction.

Writing Studio repair-3 now binds spec lead-8 and the 4.1.0 inventory above. Its
scope, existing manual authorization/ownership boundary, unresolved WS-11 and fresh
independent follow-up remain in `docs/project/tasks/writing-studio/handoff-1b-1-repair-3.md` and spec Status. A Worker
already executing it explicitly rereads changed instructions before affected work,
records the switch in its own report and continues its existing assignment without
another relay. The refresh does not execute the repair or assume a handback.

Reports identify their code/spec snapshot and actual instruction revision. Keep
prior reports' known/unknown provenance intact; do not infer old metadata from a
filename or current bundle. Uncommitted work does not automatically appear in
another worktree; explicitly transfer required ignored evidence and snapshot files.

Durable workflow and task files are eligible for Git; only the Claude workflow rule
is excepted from the local `.claude/` ignore. No commit, push, server launch,
scheduler, hook, automatic implementation handoff, or repair loop is installed.
Refreshes must reconcile local changes rather than overwriting them blindly.

Normal sessions need no role-selection message. Example overrides:
"For this session, act as Worker. Implement slice 2 of docs/project/tasks/[task]/spec.md."
"Act as coordinating lead and implementation owner for [task] slice N."
