---
record: "self-audit"
task: "writing-studio"
cycle: "1b-2b-3"
spec_revision: "lead-23"
snapshot: "_local/project/evidence/writing-studio/1b-2b-3/snapshot/manifest.json"
author: "agent"
date: "2026-09-22"
state: "historical"
summary: "BLOCKED on DR-1 only: two accepted save-service tests fail at legacy-writer fixture steps. Fence behaviour verified; one low diagnostic finding and three noted residuals."
read_when: "Before reviewing or accepting Writing Studio 1B.2b.3, or deciding DR-1."
evidence: "_local/project/evidence/writing-studio/1b-2b-3/"
workflow_version: "5.0.0"
instruction_inventory: "docs/workflow/inventories/5.0.0-local-1.md"
---

# Self-audit: writing-studio / 1b-2b-3

## Identity and scope

- Author/session and context: Claude Code desktop session (claude-opus-5-5), the implementation writer auditing its own work; continued context from implementation. Not independent review.
- Spec revision and assessed snapshot: lead-23; `snapshot/manifest.json` sha256 `b88984be30c61e4c1ba638fa084bc2723fa7c0ce6fda276c74dd5b93fa849c26` on base `fed8ed13…`.
- Changed paths and relevant dependencies: the slice delta (`snapshot/1b-2b-3-slice-delta.patch`) over five modified files and nine added files listed in the implementation report; dependencies traced: save service transactions, reader, local policy, mutation lock, Python paths and CLI dispatch, the MCP tool wrapper, and every history writer (`final/seam-audit.txt`). Git reports only those five files changed among the `baseline-1b2b3.json` inputs.
- Environment/target and evidence: as in `reports/1b-2b-3-implementation.md`; evidence under `_local/project/evidence/writing-studio/1b-2b-3/final/`.
- Scope limits: no fresh non-author perspective; no non-Windows run (the supported profile is Windows); no advisory lookup needed (no dependency change).

## Cleanup sweep

| Location/snapshot | Classification | Evidence and consequence | Proposed outcome |
|---|---|---|---|
| New TS and test files, `b88984be` | none | `tsc --noEmit --noUnusedLocals --noUnusedParameters` reports nothing in the slice's files; named-import scan of the new files clean; Python AST import scan clean | none |
| `src/server.ts` (`FileManager`, `paths`), `src/ui/web-server.ts` (`sliceWords`) | none (pre-existing) | Same `tsc` run flags them, but their use counts equal the verified pre-edit copies; not made redundant by this slice | leave; outside scope |
| `src/ui/web-server.ts` fence mapping | none | `edit.code !== 0 ? cliFenceCode(edit) : null` repeats in three handlers; one line each, clearer inline than a helper | leave |
| `superseded-1/` evidence | none | Deliberately kept history for the pre-fix snapshot, labelled not current | leave |

## Audit lenses

| Lens | Assessment and evidence, or N/A reason | Finding/uncertainty and required outcome |
|---|---|---|
| Critical correctness | Traced each fenced route from guard to side effect to commit: the guard checks tracking and every write target, then hands the same entry to the handler (`checkedClip`); commits refuse under the lock (TS `update`/`remove`, Python `update_clip`/`delete_clip`); an id prefix skips the exact-match guard but is refused by the Python lock (HTTP-proven). Real commits diffed: no unfenced field. Before this snapshot, the handler re-read gap was found and fixed (implementation report) | No open defect. Residual: the accepted window (legacy media changed, commit refused) is unchanged |
| Security attack paths | Actor: a local process with loopback HTTP, CLI or history-file write access. Inputs: clip id, body, stored paths. Sinks: file writes and unlinks. Links, junctions, case variants and missing roots are resolved; unresolvable targets fail closed; bodies carry no path | Uncertainty U-1: a hard link to revision media placed outside the trees, or a junction swapped after the check, is not detected. Local-actor only; outside "links and junctions" as specified. Owner to weigh for 1B.2b.4/5 |
| Test coverage | Outcomes proven: refusal before side effects (HTTP bytes and unit trees), locked commit (unit, cross-process with a lock probe, route barrier), policy order, DEMO, MCP, field-set coverage from real commits, TS/Python agreement, path cases, pre-change parity of 14 controls | Handing the checked entry to handlers is proven by a guard unit test and a static wiring test, not by an HTTP interleaving (no production path can commit mid-request yet). Acceptable; note for review |
| Dependencies and supply chain | `package.json` and `package-lock.json` match `baseline-1b2b3.json`; `git status` shows no change to `backend/requirements.txt` or `backend/requirements-runtime.txt`; no new module | none |
| Failure paths | Fence errors are typed and mapped at every route, MCP and CLI; other errors keep their old paths. Unresolvable targets refuse | F-2 below. Observation: a clip tracked between `record()` and `persistClipRecipe()` would make the batch recipe step throw; unreachable before adoption, and 1B.2b.5 should include it with the accepted residual |
| Breaking changes and migrations | New 409 `{error, code}` only for tracked clips or owned-tree targets; existing clients read `error`; untracked responses match the pre-change capture; no data migration | Full Node fails two accepted tests at fixture steps (F-1) |
| Documentation drift | No user-visible change until clips can be tracked; spec lead-23 is the design record | N/A now; user docs may need the refusal once adoption ships |
| Accessibility | No UI change | N/A |
| Observability | Refusals logged with clip, operation and code only (58 lines, path-free in the HTTP run); CLI prints a stable coded line; MCP logs | F-2 below |
| Engineering invariants | Local host/origin policy and allowlists answer first (HTTP 403 and MCP test); DEMO untouched; reader, save service, renderer, composer and Cleanup byte-identical (`final/protected-sources.json`); no save-service import from legacy writers; no em dash in new messages; source media untouched | none |

## Confidence and blind spot

- Material uncertainties and investigation: whether the fixture adaptation in DR-1 keeps both tests' intent. I diffed the proposal (2 hunks, no assertion changed) and ran it out of tree: 35 of 35 pass (`decision/oot-run2.log`). The owner still decides whether to change an input of retained evidence.
- Biggest blind spot: a writer outside the audited set. `record()` accepts a `revisions` field unfenced; its three callers do not pass one (`final/seam-audit.txt`). A future caller could, and that would track a clip through a legacy path.

## Verdict and next action

- Verdict: BLOCKED
- Findings and dispositions:
  - F-1 (blocking for acceptance, not a fence defect): `node scripts/verification/run-tests.mjs node` fails 2 of 772 in `src/services/clip-revisions.test.ts` because their fixtures call `history.remove` and `history.update(thumbnail_config)` on a tracked clip, which lead-23 now refuses (`final/node-full-run1.log`). Required outcome: the task-state owner resolves DR-1 and the full Node suite reruns green on the resulting snapshot.
  - F-2 (low, nonblocking): when a target exists but cannot be resolved (dangling link, denied lookup), the refusal is correct but says the action "would change a file in the Writing Studio revision folders", and nothing records why. A user with such a path on an ordinary export gets a misleading reason. Location: `src/services/clip-write-fence.ts` `isRevisionOwnedPath`, Python `is_revision_owned_path`. Required outcome: owner decides whether wording or a log detail should distinguish "could not be verified outside".
  - U-1 and the `record()` and batch-recipe observations above: nonblocking, for the 1B.2b.4/5 planners.
- Next action and owner: the task-state owner decides DR-1 and F-2, then arranges the fresh non-author review.
- Evidence validity after changes: current for snapshot `b88984be…`. Any DR-1 edit changes a test input; after it, rerun full Node, and any fence edit invalidates the affected rows.
