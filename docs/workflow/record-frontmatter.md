# Workflow Record Metadata

This file owns record metadata, lifecycle, inventory binding, and reading semantics. Authority and full snapshot requirements remain in `docs/workflow/contract.md`.

## Flat schema

New specs, spec logs, implementation reports, reviews, dispositions, assignments, direction briefs, phase reports, ADRs, external topic records, and ledgers start with YAML frontmatter. Existing active records gain it only during deliberate reconciliation by their existing owner; no bulk backfill. Historical records without metadata remain valid and discoverable. Startup files, contract, process and self-audit procedures, workflow README, and instruction inventories are instructions/provenance artifacts and do not use this task schema.

Historical 4.2.0 report example; its recorded version and inventory remain bound to that work:

```yaml
---
record: "worker-report"
task: "p02-guarded-edits"
cycle: "3"
spec_revision: "2026-09-11c"
snapshot: "_local/project/evidence/p02/cycle-3-snapshot.json"
author: "worker"
date: "2026-09-11"
state: "active"
summary: "Three repairs implemented; J7 passed; F-P02-7 remains open."
read_when: "Reviewing cycle 3 evidence or investigating F-P02-7 recurrence."
evidence: "_local/project/evidence/p02/cycle-3/"
workflow_version: "4.2.0"
instruction_inventory: "docs/workflow/inventories/4.2.0-local-1.md"
---
```

Use a flat mapping, one single-line quoted scalar per field, no comments or nested YAML in the block. Double quotes use JSON-compatible escaping (also valid YAML); single quotes escape an apostrophe by doubling it. No control characters, multiline values, duplicate/unknown keys, or unrestricted YAML. Keep the header within 64 lines and 16,384 characters. Templates use quoted `[placeholder]` values (including path segments) or `{{placeholder}}`; replace them before a real record is active. The index labels placeholders as templates.

| Field | Rule |
|---|---|
| record | Required: spec, spec-log, worker-report, implementation-report, self-audit, review, disposition, assignment, direction, phase-report, adr, external, ledger |
| author | Required responsible author: agent for new automated records; isaac for user-authored records; unknown for genuinely unavailable provenance. Legacy worker, coordinating-lead and reviewer values remain readable. Actual session identity stays in the body. |
| date | Required single-line date, normally YYYY-MM-DD; unknown historical dates remain unknown. |
| state | Required lifecycle: active, historical, superseded. Never implementation, verification, review, or release status. |
| summary | Required outcome first, at most 40 words; never authority or proof. |
| read_when | Required relevant situations, at most 25 words; never a permission boundary. |
| task, cycle | Include only when bound to that task/cycle; shared ledgers/external records need no invented task. |
| spec_revision | Bound requirements for reports; current revision for a living spec. A spanning spec log omits this field; entries identify their own revisions. |
| snapshot | Exact commit or existing reproducible snapshot record identifying base, patches, manifests and relevant inputs. Omit when not code-bound; this field does not replace the snapshot procedure. |
| evidence | Evidence file/root when applicable, under the README's storage policy. |
| workflow_version, instruction_inventory | Required on implementation/self-audit/review reports (including phase reports and legacy worker-report): actual installed version and preserved instruction-inventory revision, or explicitly unknown historical provenance. |
| superseded_by | Required only for superseded records; omit otherwise. |

## Lifecycle and ownership

Authors may update draft reports and headers until actual handoff, keeping them consistent with evidence. Checkpointing does not seal or hand off a draft. At handoff the assessment and evidence/provenance metadata freeze. Substantive corrections use an attributed, dated addendum or linked successor explaining the correction and effect; preserve the original assessment, subject to necessary secret redaction. Only the current task owner may change a handed-off header's lifecycle state and superseded_by, recording its reason in the disposition. Its designated review disposition section remains separately editable.

Existing authorized owners keep living specs, ledgers, direction and external records synchronized, including summary, revision, snapshot, date and applicable metadata. Spec-log entries remain append-only; ADR supersession keeps its own history rules. Review-only agents and repairers acquire no ownership of Status, specs, ledgers or other authors' records; a reviewer-owner, an authorized review-and-fix session (after its separate repair assessment) or a contained-lane implementer accepting after its pre-handoff check reconciles these as task owner. Keep a spec active while its task is active; move obsolete history to its spec log. At acceptance, the accepting task owner marks that cycle's superseded drafts and closed cycle reports `historical`, preserving their bodies and evidence, so the bounded index narrows to current work. This is a deliberate lifecycle update by the owner, never automatic supersession.

A newer report does not automatically supersede older evidence. Accepted-cycle history may remain relevant; use the actual disposition. Before adding metadata to an artifact referenced by whole-file hash, preserve the original and an attributed old-to-new identity mapping. An unchanged body is still a changed file hash.

## Preserved instruction inventory

Report frontmatter replaces repetitive provenance paragraphs. An inventory covers installed instruction files only: startup files, the contract, process and audit procedures, selected references, the record schema, the index and helper scripts, and task templates. Neither project context such as CLAUDE.md nor README is a hashed instruction identity. Task progress/notes encountered in README are legacy reconciliation input only; current task notes/state belong to their existing spec, phase or report owners.

Preserve a new revision when an instruction file or effective selection/authority configuration changes: at installation, at refresh, or when instructions change mid-assignment. Routine task progress requires none. The current task owner creates a mid-assignment revision and identifies which revision governed the affected work.

Use a repository path plus an exact Git commit when that tracked inventory is available, or preserve a small immutable inventory under `docs/workflow/inventories/`. Under a docs tracked policy, a Git commit identifier for `docs/workflow/` is an acceptable identity by itself. The editable current README alone is insufficient. Compute content identities over content normalized to LF so checkouts with different line-ending settings resolve the same identity. An inventory names instruction paths, source versions, retained or customized state, and exact content identities; it does not copy the manuals. Unknown historical provenance stays unknown. Never overwrite a referenced revision, and transfer ignored inventories explicitly with their records.

README contains configuration only, not current task narratives. Preserve the effective process configuration, selected references, state owners, storage policy and grants in the inventory as configuration facts, without hashing README, its self-referential inventory pointer or legacy task notes encountered during reconciliation. A configuration change affecting instruction selection or authority requires a new revision even if file hashes are unchanged; routine progress in its existing owned records does not. New inventory rows use `Path | Source version | State and reason | SHA-256 (LF)`; historical inventory shapes remain valid and are not rewritten.

## Reading and indexing

Orient in order from README, contract core, common process Orient and applicable activity sections, shared project context, applicable selected references, the assigned spec's Status or established phase-state owner, then a bounded index of the assigned task. Read applicable reference requirements before settling design, implementation or review. Do not replace a phase-state owner.

Active records are candidates, not mandatory body reads. Open the needed section when Status/assignment names it for the next action, read_when matches, or freshness, evidence, recurrence or independent review requires it. A mention does not require following every linked history record. Before implementation, read applicable requirements, acceptance criteria, constraints, current baseline and approved exceptions; metadata is no substitute.

Historical, superseded and unclassified bodies are omitted from routine orientation, yet remain available for relevant investigation/evidence, including the latest accepted predecessor result. Missing/stale metadata never permits ignoring an unresolved finding. Reviewers retain independent discovery rights and inspect requirements/code before author justifications. Never read or modify archive-dnr at any depth. If metadata conflicts with a body, report the discrepancy and reconcile from canonical records and actual state within existing ownership.

The agent runs `python docs/workflow/scripts/record-index.py docs/project/tasks/<task>`; Isaac need not run commands. Default pages contain 20 rows; use `--limit 1..100` and `--offset N`. Rows show path, kind, task/cycle, lifecycle, date, revision, word count, summary and read_when, with totals/omissions and the next-page option. Long cells are clipped. `--active` includes known-active and explicitly unclassified/malformed records, excluding templates. `--all [project-root]` explicitly scans only docs/project, docs/adr and docs/external and is not normal startup. With no --all root, use the current project directory. The read-only helpers `brief.py`, `section.py` and `review-packet.py` bound startup, section and review reads the same way. Run installed helpers from the project root; `--help` documents bounds and focused selectors. Helpers assemble existing records, never establish acceptance, freshness or authority.

The standard-library Python 3 utility is manually invoked and read-only: no backfill or mutation mode. It bounds metadata reads, never emits bodies for word counting, stays within the requested root and skips archive-dnr and symlinks/junctions, including root ancestors. Missing headers, malformed/unsupported metadata and unreadable files remain visible. It cannot prove summary freshness or historical acceptance. Without Python, the agent uses bounded header reads without installing a runtime.

## Version 5 instruction inventories

New preserved inventories have H2 `Instruction identities` with the exact `Path | Source version | State and reason | SHA-256 (LF)` table and H2 `Effective configuration` with one fenced `json` object. The object is the exact validated `parse_config()` result: `schema_version`, `process_configuration`, `selected_references`, `context_and_state_owners`, `storage_policy`, `verification_delegation`, `local_task_branch_commits`, `execution_profiles`, `enforced_boundaries`, `checkout_worktree_support`. Canonical comparison sorts JSON keys and selected references by path, uses LF and trims outer scalar whitespace without case folding paths/titles. Missing legacy facts stay unknown/unverified. Historical inventories are retained, never rewritten or presented as fully verified. README and mutable context are excluded from instruction hashes.

The initial implementation report, self-audit and review are three distinct substantial-cycle records. Review frontmatter binds the originally reviewed snapshot and revision; authorized post-review repairs name their final snapshot/revision, author and governing inventory in the separately attributed `Repair and final verification` section. In the four-session lane each repair round is an `implementation-report` with the round in `cycle`, and the reviewer-owner records per-round verification in that section. Before any repair begins, the reviewer's dated `Pre-repair assessment checkpoint` becomes append-only even while the rest of the report is draft. Later corrections require attributed dated addenda. This prevents a repaired outcome from replacing the original independent assessment.
