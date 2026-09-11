# Installed Project Workflow

- Bundle version: 4.0.6
- Installed mode: project
- Installation date: 2026-09-11
- Source bundle: `.agents/skills/generate-init/`, metadata workflow-version 4.0.6.
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

Both read `docs/workflow/contract.md`, the assigned role, and shared project context.
Review-only assignments use the lead's review procedures without coordination,
implementation, acceptance, or further delegation authority. Workers do not gain
delegation authority by reading shared instructions.

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
  approvals or verified evidence. No active task was fabricated or migrated.
- `docs/writing-studio-plan.md` remains a discussion draft. Installation does not
  approve its open product decisions or dispatch feature implementation.

## External workflow dependencies

No external build/verify/wrap skills are required. Use the repository's actual
runtime and verification tools described in `docs/local-setup.md`. The supplied
repo-study skill is optional and was not modified or invoked by this installation.
No global skill, client configuration, or other repository was changed.

Independent review can use a bounded fresh reviewer subagent when supported by the
current tool; otherwise use the lead role's separate fresh-session fallback.
Installation does not provision agents or tools. Lead-Worker relays remain manual.

## Installed-file inventory

| Destination | Bundle source | Source version | State and local changes |
|---|---|---|---|
| `AGENTS.md` | `templates/project-agents.md` | 4.0.6 | Unmodified, byte-for-byte copy |
| `.claude/rules/workflow.md` | `templates/workflow.md` | 4.0.6 | Unmodified, byte-for-byte copy |
| `docs/workflow/contract.md` | `templates/contract.md` | 4.0.6 | Unmodified, byte-for-byte copy |
| `docs/workflow/roles/project-lead.md` | `roles/project-lead.md` | 4.0.6 | Unmodified, byte-for-byte copy |
| `docs/workflow/roles/worker.md` | `roles/worker.md` | 4.0.6 | Unmodified, byte-for-byte copy |
| `docs/project/tasks/_SPEC-TEMPLATE.md` | `templates/spec-template.md` | 4.0.6 | Unmodified, byte-for-byte copy |
| `docs/project/tasks/_REPORT-TEMPLATE.md` | `templates/report-template.md` | 4.0.6 | Unmodified, byte-for-byte copy |
| `docs/project/tasks/_REVIEW-TEMPLATE.md` | `templates/review-template.md` | 4.0.6 | Unmodified, byte-for-byte copy |
| `docs/adr/_TEMPLATE.md` | `templates/adr-template.md` | 4.0.6 | Unmodified, byte-for-byte copy |
| `docs/external/README.md` | `templates/external-README.md` | 4.0.6 | Unmodified, byte-for-byte copy |
| `docs/workflow/README.md` | `templates/workflow-README.md` | 4.0.6 | Customized installation record with actual selections and preservation notes |
| `CLAUDE.md` | Existing project file; `templates/project-context.md` used as guidance only | Existing provenance unknown; reconciled for 4.0.6 | Retained project facts/layout; optional PodStack rules separated; local runtime context added |
| `docs/project/references/podstack.md` | Existing `CLAUDE.md` content instructions | Existing provenance unknown | Customized activation boundary; preserved content guidance |
| `.gitignore` | Existing repository rules | Existing provenance unknown | Added narrow exception for Claude workflow startup; other local Claude files remain ignored |

## Backup and preservation

The pre-installation `CLAUDE.md` and `.gitignore` were copied byte-for-byte to
`_local/generate-init-backup/20260911-153103/`. Backups are ignored and outside all startup rule directories.
Existing `.claude/commands/`, root PodStack documents, skills, media, and plans were
preserved. `_local/project/` already existed and is retained for scratch records.

## Resume and maintenance

Read the assigned task spec/status and latest relevant reports. Before detailed
authoring or implementation, apply the contract's plan-freshness checks to current
code and relevant ignored records. Reports identify their code/spec snapshot.
Uncommitted work does not automatically appear in another worktree.

Durable workflow and task files are eligible for Git; only the Claude workflow rule
is excepted from the local `.claude/` ignore. No commit, push, server launch,
scheduler, hook, automatic implementation handoff, or repair loop is installed.
Refreshes must reconcile local changes rather than overwriting them blindly.

Example override: "For this session, act as Worker. Implement slice 2 of
docs/project/tasks/[task]/spec.md."
