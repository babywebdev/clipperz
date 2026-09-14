# Workflow Record Metadata

This file owns record metadata, lifecycle, inventory binding, and reading semantics. Authority and full snapshot requirements remain in `docs/workflow/contract.md`.

## Flat schema

New specs, spec logs, implementation reports, reviews, dispositions, assignments, direction briefs, phase reports, ADRs, external topic records, and ledgers start with YAML frontmatter. Existing active records gain it only during deliberate reconciliation by their existing owner; no bulk backfill. Historical records without metadata remain valid and discoverable. Startup files, contract, roles, workflow README, and instruction inventories are instructions/provenance artifacts and do not use this task schema.

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
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---
```

Use a flat mapping, one single-line quoted scalar per field, no comments or nested YAML in the block. Double quotes use JSON-compatible escaping (also valid YAML); single quotes escape an apostrophe by doubling it. No control characters, multiline values, duplicate/unknown keys, or unrestricted YAML. Keep the header within 64 lines and 16,384 characters. Templates use quoted `[placeholder]` values (including path segments) or `{{placeholder}}`; replace them before a real record is active. The index labels placeholders as templates.

| Field | Rule |
|---|---|
| record | Required: spec, spec-log, worker-report, review, disposition, assignment, direction, phase-report, adr, external, ledger |
| author | Required responsible role: worker, coordinating-lead, reviewer, isaac; unknown for genuinely unavailable legacy provenance. Actual session identity stays in the body. |
| date | Required single-line date, normally YYYY-MM-DD; unknown historical dates remain unknown. |
| state | Required lifecycle: active, historical, superseded. Never implementation, verification, review, or release status. |
| summary | Required outcome first, at most 40 words; never authority or proof. |
| read_when | Required relevant situations, at most 25 words; never a permission boundary. |
| task, cycle | Include only when bound to that task/cycle; shared ledgers/external records need no invented task. |
| spec_revision | Bound requirements for reports; current revision for a living spec. A spanning spec log omits this field; entries identify their own revisions. |
| snapshot | Exact commit or existing reproducible snapshot record identifying base, patches, manifests and relevant inputs. Omit when not code-bound; this field does not replace the snapshot procedure. |
| evidence | Evidence file/root when applicable, under the README's storage policy. |
| workflow_version, instruction_inventory | Required on implementation/review reports (including phase reports): actual installed version and preserved instruction-inventory revision, or explicitly unknown historical provenance. |
| superseded_by | Required only for superseded records; omit otherwise. |

## Lifecycle and ownership

Authors may update draft reports and headers until actual handoff, keeping them consistent with evidence. Checkpointing does not seal or hand off a draft. At handoff the assessment and evidence/provenance metadata freeze. Substantive corrections use an attributed, dated addendum or linked successor explaining the correction and effect; preserve the original assessment, subject to necessary secret redaction. Only the coordinating lead may change a handed-off header's lifecycle state and superseded_by, recording its reason in the disposition. Its designated review disposition section remains separately editable.

Existing authorized owners keep living specs, ledgers, direction and external records synchronized, including summary, revision, snapshot, date and applicable metadata. Spec-log entries remain append-only; ADR supersession keeps its own history rules. Workers/reviewers acquire no ownership of Status, specs, ledgers or other authors' records. Keep a spec active while its task is active; move obsolete history to its spec log.

A newer report does not automatically supersede older evidence. Accepted-cycle history may remain relevant; use the actual disposition. Before adding metadata to an artifact referenced by whole-file hash, preserve the original and an attributed old-to-new identity mapping. An unchanged body is still a changed file hash.

## Preserved instruction inventory

Report frontmatter replaces repetitive provenance paragraphs. Its inventory must resolve to the revision used, including retained/customized instruction identities. Use a repository path plus exact Git commit when that tracked inventory is available, or preserve a small immutable inventory under `docs/workflow/inventories/`. The editable current README alone is insufficient. An inventory names instruction paths, source versions, retained/customized state and exact content identities; it does not copy the manuals. Unknown historical provenance stays unknown.

Installation/refresh preserves a new inventory revision when relevant installed instructions change and points the README to it; never overwrite a referenced revision. For instructions changed during an assignment, identify which revision governed affected work. Ignored inventories must be explicitly transferred with records to another checkout.

## Reading and indexing

Orient in order from README, contract core, selected role, shared project context, applicable selected references, the assigned spec's Status or established phase-state owner, then a bounded index of the assigned task. Read applicable reference requirements before settling design, implementation or review. Do not replace a phase-state owner.

Active records are candidates, not mandatory body reads. Open the needed section when Status/assignment names it for the next action, read_when matches, or freshness, evidence, recurrence or independent review requires it. A mention does not require following every linked history record. Before implementation, read applicable requirements, acceptance criteria, constraints, current baseline and approved exceptions; metadata is no substitute.

Historical, superseded and unclassified bodies are omitted from routine orientation, yet remain available for relevant investigation/evidence, including the latest accepted predecessor result. Missing/stale metadata never permits ignoring an unresolved finding. Reviewers retain independent discovery rights and inspect requirements/code before author justifications. Never read or modify archive-dnr at any depth. If metadata conflicts with a body, report the discrepancy and reconcile from canonical records and actual state within existing ownership.

The agent runs `python docs/workflow/scripts/record-index.py docs/project/tasks/<task>`; Isaac need not run commands. Default pages contain 20 rows; use `--limit 1..100` and `--offset N`. Rows show path, kind, task/cycle, lifecycle, date, revision, word count, summary and read_when, with totals/omissions and the next-page option. Long cells are clipped. `--active` includes known-active and explicitly unclassified/malformed records, excluding templates. `--all [project-root]` explicitly scans only docs/project, docs/adr and docs/external and is not normal startup. With no --all root, use the current project directory.

The standard-library Python 3 utility is manually invoked and read-only: no backfill or mutation mode. It bounds metadata reads, never emits bodies for word counting, stays within the requested root and skips archive-dnr and symlinks/junctions, including root ancestors. Missing headers, malformed/unsupported metadata and unreadable files remain visible. It cannot prove summary freshness or historical acceptance. Without Python, the agent uses bounded header reads without installing a runtime.
