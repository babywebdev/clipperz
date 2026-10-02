# Installed Project Workflow

- Bundle version: 5.2.0
- Installed mode: project
- Installation/update date: installed 2026-09-11; refreshed to 4.1.0 on 2026-09-13; migrated to 5.0.0 on 2026-09-22; upgraded to 5.2.0 on 2026-09-27
- Source bundle: accepted generate-init 5.2.0 at `.agents/skills/generate-init` in this repository. Provenance only; source left untouched and installed files do not depend on it.
- Local customization policy: installed files are user-owned and may be edited manually; compare before updates.

## Process configuration

```json
{
  "schema_version": 1,
  "process": "docs/workflow/process.md",
  "self_audit": "docs/workflow/self-audit.md",
  "self_audit_template": "docs/project/tasks/_SELF-AUDIT-TEMPLATE.md",
  "headings": {
    "orient": "Orient",
    "plan": "Plan",
    "implement": "Implement",
    "verify": "Verify",
    "self-audit": "Self-audit",
    "review": "Review",
    "repair": "Repair",
    "complete": "Complete",
    "resume": "Resume",
    "communicate": "Communicate"
  },
  "authority_profile": "model-neutral-review-lanes-v2"
}
```

This is the only machine-readable process configuration. Paths and headings are the bundle defaults; no custom process path or heading is declared. The audit method has the fixed H2 `Audit method`. The contract owns authority; process and audit files describe actions and scrutiny, not new grants. No task progress or active role map belongs here.

## Selected project references

| File | Applies to |
|---|---|
| `docs/workflow/roles/references/local-app.md` | Local Studio, launcher and installers, Python media pipeline and pinned executables, and local saved-data or media storage when a task touches them |

Selected at the 5.0.0 migration because Clipperz is a local media application with a user-facing Studio. The reference did not exist in 4.1.0, so this is a new selection, not a restored removal. SaaS, website and LucentDev references are not selected: hosted-tenant, public-website and client-phase assumptions are not established here. The active task-state owner reassesses applicability at the start of substantial work.

`docs/project/references/podstack.md` is a retained, locally adapted content reference, read only for explicitly requested PodStack/content-production work. It is not a software workflow reference and grants no authority.

## Project context and existing state owners

- Shared facts and conventions: `CLAUDE.md`
- Additional context: `docs/local-setup.md` for the supported local runtime, storage layout, setup and verification; project manifests and lockfiles for dependency versions and scripts; `docs/project/references/podstack.md` only for explicitly requested PodStack/content-production work
- Ordinary tasks: `docs/project/tasks/[task]/spec.md`
- Existing phase-status authority: not applicable; no phase pipeline is installed
- ADRs: `docs/adr/`
- External setup: `docs/external/`
- Workflow maintenance record: `docs/project/tasks/workflow-maintenance/spec.md`

Existing `plans/`, `_local/project/`, PodStack commands, the root PodStack documents (`AGENTS.podstack.md`, `CLAUDE.podstack.md`, `ETHOS.podstack.md`, none auto-loaded or routed by startup) and knowledge files are preserved. Historical records are not current approvals or verified evidence. `docs/writing-studio-plan.md` remains a discussion draft; the workflow approves none of its open product decisions.

## External workflow dependencies

None required by this bundle. No external build, verify or wrap skill is required; use the repository's actual runtime and verification tools described in `docs/local-setup.md`. The ignored local skills folder holds the generate-init source (maintenance provenance only) and an optional repo-study skill; neither is a startup dependency. Installation provisions no models, tools, services, agents or loop. Handoffs between separate sessions, including implementation relays and separate-session reviews, stay manual through Isaac; no automatic handoff, runner, hook or scheduler exists.

Verification delegation: disabled

Execution profiles: no model preference (Isaac confirmed 2026-09-27); reviewer-owner rotation threshold: not recorded; implementer context threshold: not recorded

Enforced boundaries: none: instructions only

Local task-branch commits at handoff: not authorized

The disabled verification delegation flag is the prior recorded decision, preserved unchanged; disabled is inert and grants nothing. A model or effort preference is an advisory fact unless an assignment explicitly requires it. A proposed tool-enforced deny list awaits Isaac's per-repository decision in the workflow maintenance record; tooling enforces nothing today. No per-repository local-commit authorization is recorded.

Optional Python 3: the agent may run `record-index.py`, `brief.py`, `section.py`, `review-packet.py`, `doctor.py` and `bar-guard.py` under `docs/workflow/scripts/`. Without Python or a helper, use bounded direct reads. No installation or user terminal work is required.

## Storage policy

Storage policy: docs tracked

- docs tracked: small decisive secret-free text may live in `docs/project/tasks/[task]/evidence/`; bulky logs, screenshots and patches in `_local/project/evidence/[task]/`.
- docs ignored: all evidence stays in `_local/project/evidence/[task]/`; explicit transfer is required before another checkout can rely on the workflow.

Preserved local exceptions: existing Writing Studio evidence and snapshots stay at their recorded paths under `_local/project/evidence/writing-studio/` and the earlier `_local/project/writing-studio/`; runtime logs and results stay where recorded and are not moved to fit the default. Workflow refresh backups and evidence use `_local/generate-init-backup/` and `_local/generate-init-refresh/`. The narrow startup exception in `.gitignore` keeps `.claude/rules/workflow.md` eligible for Git while other local Claude files stay ignored.

## Installed-file inventory

- Current preserved inventory revision: `docs/workflow/inventories/5.2.0-local-1.md`
- Inventory binding: per `docs/workflow/record-frontmatter.md`; reports cite the preserved revision that actually governed their work. A configuration-only change creates a new revision even when instruction hashes are unchanged.
- Prior preserved revisions, immutable and historical: `docs/workflow/inventories/5.0.0-local-1.md`, `docs/workflow/inventories/4.1.0-local-2.md` (the exact pre-migration 4.1.0 instructions, verified byte-identical before replacement), `docs/workflow/inventories/4.1.0-local-1.md` and `docs/workflow/inventories/4.0.6-pre-refresh-20260913-1.md`. Their identities, report bindings and limitations stay as written.

| Destination | Bundle source | Source version | State and local changes |
|---|---|---|---|
| `AGENTS.md` | `templates/project-agents.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `.claude/rules/workflow.md` | `templates/workflow.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/workflow/contract.md` | `templates/contract.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/workflow/process.md` | `procedures/process.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/workflow/self-audit.md` | `procedures/self-audit.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/workflow/record-frontmatter.md` | `templates/record-frontmatter.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/workflow/scripts/record-index.py` | `scripts/record-index.py` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/workflow/scripts/section.py` | `scripts/section.py` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/workflow/scripts/brief.py` | `scripts/brief.py` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/workflow/scripts/review-packet.py` | `scripts/review-packet.py` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/workflow/scripts/doctor.py` | `scripts/doctor.py` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/workflow/roles/references/local-app.md` | `roles/references/local-app.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/project/tasks/_SPEC-TEMPLATE.md` | `templates/spec-template.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/project/tasks/_SPEC-LOG-TEMPLATE.md` | `templates/spec-log-template.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/project/tasks/_REPORT-TEMPLATE.md` | `templates/report-template.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/project/tasks/_SELF-AUDIT-TEMPLATE.md` | `templates/self-audit-template.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/project/tasks/_REVIEW-TEMPLATE.md` | `templates/review-template.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/project/_LEDGER-TEMPLATE.md` | `templates/findings-ledger-template.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/adr/_TEMPLATE.md` | `templates/adr-template.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/external/README.md` | `templates/external-README.md` | 5.2.0 | Unmodified, byte-for-byte copy from accepted bundle |
| `docs/workflow/scripts/bar-guard.py` | `scripts/bar-guard.py` | 5.2.0 | New, byte-for-byte copy |
| `docs/workflow/README.md` | `templates/workflow-README.md` | 5.2.0 | Customized: actual reference selection, context and state owners, storage exceptions, preserved grants, provenance and migration notes |
| `CLAUDE.md` | Existing project file; `templates/project-context.md` was guidance only | Original provenance unknown; retained through 4.1.0 | Customized at 5.0.0: only the workflow-routing and PodStack-authority sentences changed from v4 role wording; all project facts retained |
| `docs/local-setup.md` | Existing project runtime context | Provenance unknown | Retained byte-for-byte; project context, not an instruction identity |
| `docs/project/references/podstack.md` | Existing content instructions | Provenance unknown | Retained byte-for-byte; explicit content-task activation only |
| `.gitignore` | Existing repository rules | Provenance unknown | Retained byte-for-byte; docs tracked with the narrow Claude startup exception |
| `docs/workflow/roles/project-lead.md` and `docs/workflow/roles/worker.md` | `roles/project-lead.md` and `roles/worker.md` | 4.1.0 | Retired at 5.0.0: removed from the active tree; byte-for-byte copies kept in the ignored backup and tracked at commit `fed8ed1` |

## Backup and preservation

The pre-installation `CLAUDE.md` and `.gitignore` are in `_local/generate-init-backup/claude-backup/`. The 4.1.0 refresh preserved the prior instructions and Writing Studio records in `_local/generate-init-backup/20260913-4.1.0/`, with its identity mapping at `docs/workflow/reconciliation/20260913-record-identities.json`.

The 5.0.0 migration copied every replaced, edited or retired file byte-for-byte to `_local/generate-init-backup/20260922-5.0.0/`, with a raw and LF SHA-256 manifest; `.claude/` is stored there as `_dot-claude/` so no backup sits in a startup rules folder. Before/after state manifests, snapshot and check output are in `_local/generate-init-refresh/20260922/`. Prior reports, manifests, patches, evidence, ADRs, inventories and the record-identity mapping are unchanged. No archive-dnr content is read or modified.

The 5.2.0 refresh preserves replaced files in `_local/generate-init-backup/20260927-5.2.0/`, with raw and LF hashes and restore notes; Claude startup is stored as `_dot-claude/`. Evidence and source/preservation manifests are in `_local/generate-init-refresh/20260927/`. No source bundle, application, historical report, prior inventory, or repair evidence is edited.

## Resume and maintenance

Checkout and worktree support: supported when tracked instructions and required ignored artifacts are available in the checkout

Startup and recovery follow the contract core and common process. The README configures paths, grants and state owners; the assigned Status or phase tracker holds progress. Under docs ignored, another checkout needs explicit transfer of ignored instructions, preserved inventory revisions, task records, snapshot artifacts and required evidence before startup/review is usable. Under either storage policy, transfer required ignored artifacts. Inaccessible evidence is incomplete, and a current rerun cannot prove a historical execution.

The installed 5.2.0 workflow and current task records are uncommitted. A checkout or worktree created from commit `fed8ed1` still holds the retired 4.1.0 chain and must not be used for workflow work until the current files are committed or explicitly transferred.

Version boundary: work through Writing Studio 1B.2b.2 acceptance on 2026-09-22 keeps its recorded 4.1.0 bindings; subsequent work before the 2026-09-27 upgrade keeps its recorded 5.0.0 bindings; work after the upgrade binds the current preserved revision above. The workflow maintenance record holds the boundary detail and any unresolved incompatibility.

Keep old referenced inventories immutable. Reconcile manual changes on refresh, preserve a backup outside auto-loading instruction directories, and do not bulk rewrite historical reports or invent provenance. Commit eligible durable files only when authorized; local commit permission never implies push, deploy or release. No scheduler, hook, runner or automatic handoff loop is installed.

Normal sessions need no role-selection message. Example assignments: "Plan [task] only", "Implement slice N of [task]", "Review [task] only", "Review and fix [task] within the approved scope" and "Resume [task]".
