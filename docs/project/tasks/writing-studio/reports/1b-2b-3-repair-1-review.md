---
record: "review"
task: "writing-studio"
cycle: "1b-2b-3-repair-1"
spec_revision: "lead-25"
snapshot: "_local/project/evidence/writing-studio/1b-2b-3/repair-1/snapshot/manifest.json"
author: "agent"
date: "2026-09-23"
state: "historical"
summary: "Repair-1 follow-up on 43ffa1eb: WS-22 and WS-20 repairs supported, no findings, reruns pass, no repairs. Task-state disposition accepts slice 1B.2b.3; WS-23 stays deferred before adoption."
read_when: "Dispositioning or reopening 1B.2b.3 repair-1, WS-20 or WS-22, or planning 1B.2b.4 and 1B.2b.5 fence work."
evidence: "_local/project/evidence/writing-studio/1b-2b-3/repair-1-review/"
workflow_version: "5.0.0"
instruction_inventory: "docs/workflow/inventories/5.0.0-local-1.md"
---

# Review: writing-studio / 1b-2b-3-repair-1

## Review identity and coverage

- Task and spec revision: writing-studio, `spec.md` lead-25 (requirements unchanged from lead-24); required outcomes and question in spec-log `2026-09-23: lead-25`.
- Code snapshot reviewed: base `fed8ed13dcb2aade06bee341953d6b10d58bff13` plus `repair-1/snapshot/manifest.json` (sha256 `43ffa1ebea7a4cd52f35fd459d5a5ec6c8b0684227ea08b63edeca843d151c9a`). `snapshot-capture.mjs . --check` reports seven drift lines, all from the three task-state records edited after capture; a per-file compare of `git diff HEAD --binary` with the tracked patch (37 files each) differs only in those records (`runs/binding-compare.json`, `transfer-snapshot-check.log`).
- Reviewer session/assignment: a new Claude Code desktop session (claude-opus-5-5), assigned by Isaac on 2026-09-23 to review and fix repair-1 as the new task-state owner.
- Review independence: separate fresh session, not a subagent. It inherits no planning, implementation or review conversation and authored none of lead-23, correction-1, repair-1 or the lead-25 records. Limits: startup read the lead-25 spec-log entries, which name the repair's two implementation choices, before the delta; the same session also holds task-state ownership and writes the disposition below.
- Review depth: focused on the repair delta and the fence code it depends on. Shared write routes and a CLI parser changed, so callers and untracked compatibility were checked directly.
- Files and relevant dependencies inspected: the six-file delta (`repair-1-delta.patch`); `src/ui/clip-write-fence-route.ts` in full; the PATCH, DELETE and five media handlers and middleware order in `src/ui/web-server.ts`; `cmd_clips` edit/delete and `main()` parsing in `backend/cli.py`; `_find_in`, `find_clip`, `update_clip`, `_assert_patch_allowed`, `ClipRevisionFenceError` and the lenient loader in `backend/services/clips_history.py`; `ClipsHistory.load`, `findById`, `record` and `validateShape`; `isDemoMode`; production imports of the save service. The author reports were read after this.
- Coverage limits: build and `py_compile` were not rerun. The built `dist` inputs still match the manifest, so the author's build receipt binds the served code. No browser or provider path is involved.

## Verification assessment

- Required evidence: pass.
- Expected-value provenance: lead-23, lead-24 and lead-25 requirements; the `fed8ed1` PATCH and `clips edit` contracts, run directly from `git show fed8ed1:backend/cli.py` in the parity probe; the pre-change capture `pre-change/controls.json`.
- Evidence inspected: `repair-1/before/` reproductions of both defects, `repair-1/final/` receipts and logs, the delta and its pre-edit binding.
- Additional checks performed: see the receipt below. The rerun counts equal the author's (378 focused and 795 full Node tests; 72 HTTP, 48 CLI, 14 legacy and 10 null/empty controls in the real check; JUnit 1356 tests, 0 failures or errors, 6 skipped).
- Human assistance: none.
- Adequacy and remaining gaps: the guard-miss tests execute the real handler source against a spied lookup rather than a live HTTP race. That is deterministic and adequate for the schedule, because the guard now answers the miss itself.

Answers to the lead-25 question:

1. Supported. The PATCH guard tests own-key presence (`Object.hasOwn`) before the handler drops nulls, and resolves the ID exactly, then by unique prefix, as Python `_find_in` does, on one loaded list. Ambiguous and unknown IDs pass to the CLI, which answers as at `fed8ed1`. `clips edit` refuses on raw option presence before JSON or null filtering. Delaying the `--caption-style` choice check lets any value on a tracked clip reach that refusal. Invalid values on untracked or unknown clips are reparsed with the original choices. The probe shows help text, argparse errors, exit codes and writes identical to `fed8ed1` in six untracked or unknown cases, and a coded refusal for invalid, abbreviated and prefix forms on tracked clips.
2. Supported. On a non-DEMO miss the guard answers `404 {"error":"clip not found"}` itself. Live handlers use only `checkedClip(res)`, and the lookup is called once. Planting a tracked or untracked namespace entry after the lookup changes nothing and calls no CLI or FFmpeg. DEMO keeps its original lookup and answers. The policy middleware (`web-server.ts` 532-549) still precedes the fence (line 2008).
3. Supported. Every non-test protected source matches; only the approved DR-1 test file differs. The F-2 could-not-confirm rows and log reasons pass in the real check. The `record()` refusal test passes, and `clips-history.ts` is outside the delta. Production still has no path that tracks clips, so the accepted residual, U-1 and the WS-23 deferral keep their basis. This review found no evidence to reopen them.

## Findings

No actionable findings on this snapshot.

Optional suggestions, not blocking:
- O-1: `src/ui/web-server.ts:2835` in the logo handler: the `DEMO ?` arm cannot run, because line 2834 already returns in DEMO. It is harmless, and the wiring test pins the uniform line. Remove it with the next edit to that handler.
- O-2: `src/ui/clip-write-fence-route.test.ts` guard-miss harness slices handler source and relies on Node's `module.stripTypeScriptTypes`. A reshaped handler or a Node upgrade fails the test loudly, not silently. If it churns, prefer extracting the handlers into testable functions.

Considered and discarded: in `main()`, the early `find_clip` runs before `_auto_migrate_cli`. The `.env` loads at import, and migration moves presets, cache and env, not tracked history, so the lookup sees the same history.

## Recurrence and prevention

The Open table holds WS-20, WS-22 and WS-23 for this slice. The Closed table has no presence-versus-value or guard-miss match; WS-13 (stale identity) and WS-12 (linked path escape) are related, as already noted. No archive exists.

- Proposed durable corrections: close WS-22 and WS-20 on `43ffa1eb...`. Their prevention now lives in the route tests, the Python CLI tests and `check-revision-fence.mjs`. WS-23 stays Open under its lead-25 deferral. No new row.

## Reviewer recommendation

- Recommendation: accept. Both required outcomes hold, with direct and rerun evidence, and no finding remains.
- Required corrections or unresolved coverage: none.
- Next action for the active task-state owner: disposition and Status reconciliation (below).

## Pre-repair assessment checkpoint

- Timestamp and reviewer session: 2026-09-23, the reviewer session above. No repairs: no supported finding.
- Originally reviewed spec revision and snapshot: lead-25; `43ffa1eb...`.
- Preserved assessment and finding dispositions before writes: the assessment above; no findings; O-1 and O-2 optional.
- Later correction addenda: none.

## Repair and final verification

- Repair authorization and checkout ownership: review and fix authorized; no repair needed. The prior writer (Codex repair-1) had ended.
- Actual repair author/session: none.
- Original reviewed snapshot: `43ffa1eb...`.
- Final spec revision and final snapshot: lead-25; `43ffa1eb...` (unchanged).
- Final environment/target: Windows x64, configured Node 24.21.0 and Python 3.14.3, built `dist` server on free loopback port 61361 (not 3847), real Python CLI, isolated fixtures.
- Governing workflow_version and instruction_inventory for repair: not applicable.
- Repair change inventory and affected interfaces: none.
- Finding dispositions: no findings; O-1 and O-2 are optional and deferred to later edits of those files.
- Evidence validity: every row below ran on the unchanged `43ffa1eb...` code snapshot.

### Execution Receipt

Paths are relative to `_local/project/evidence/writing-studio/1b-2b-3/repair-1-review/`.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| Binding | `node _local/project/evidence/writing-studio/1b-2b-3/repair-1/snapshot-capture.mjs . --check`, then `node <review>/binding-compare.mjs`; only task-state records drift | 7 drift lines; 37/37 patch files, differing only ledger, spec-log, spec | `transfer-snapshot-check.log`, `runs/binding-compare.json` | 43ffa1eb | this session |
| WS-20, WS-22, B2B3-1..4 focused Node | `node <review>/run.mjs node-focused scripts/verification/run-tests.mjs node` with the 15 files of the author's focused receipt; exit 0 | 0; 15 files, 378/378 | `runs/node-focused.log` | 43ffa1eb | this session |
| B2B3-1..4 real HTTP/CLI | `node <review>/run.mjs check-fence scripts/verification/check-revision-fence.mjs --controls _local/project/evidence/writing-studio/1b-2b-3/pre-change/controls.json --result <review>/runs/check-fence-result.json`; exit 0, controls match the capture | 0; 72 HTTP and 48 CLI refusals, 10 null/empty controls, 20+10 path and 7 unresolvable refusals, 14 controls match | `runs/check-fence.log`, `runs/check-fence-result.json` | 43ffa1eb | this session |
| WS-22, B2B3-3 CLI parity | `node scripts/installation/run.mjs python cli-parity-probe <review>/cli-parity-probe.py`; untracked/unknown identical to `fed8ed1`, tracked coded refusal, no write | 0; 10/10 cases pass | `runs/cli-parity-probe.json` | 43ffa1eb | this session |
| B2B3-5 full Python | `node <review>/run.mjs python-full scripts/verification/run-tests.mjs python tests/test_revision_fence.py`; exit 0, zero failures | 0; JUnit 1356 tests, 0 failures, 0 errors, 6 skipped | `runs/python-full.log`, `runs/python-full.junit.xml` | 43ffa1eb | this session |
| B2B3-5 protected sources | `python <review>/protected-sources.py` (author checker, output redirected); only DR-1 differs and equals the proposal | 0; onlyDr1Changed true | `runs/protected-sources.log`, `runs/protected-sources.json` | 43ffa1eb | this session |
| B2B3-5 full Node | `node <review>/run.mjs node-full scripts/verification/run-tests.mjs node`; exit 0 | 0; 47 files, 795/795 | `runs/node-full.log` | 43ffa1eb | this session |
| B2B3-5 client types | `node <review>/run.mjs client-types scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json`; exit 0 | 0 | `runs/client-types.log` | 43ffa1eb | this session |
| Binding after checks and cleanup | same `--check`; code unchanged | 8 drift lines: the 7 above plus this report | `runs/post-checks-snapshot-check.log`, `runs/post-cleanup-snapshot-check.log` | 43ffa1eb | this session |
| Build, `py_compile` | not rerun: a rebuild would rewrite bound `dist` inputs; the author's receipts (`repair-1/final/build-final.log`, `py-compile.log`) stand, with `dist` still matching the manifest | not run | n/a | 43ffa1eb | Codex repair-1 session (author) |

Fixtures from these runs were removed without following links (`runs/cleanup.json`); fixtures from earlier cycles were left alone.

### Post-repair self-audit

- Final snapshot and author/session: not applicable; no repair.
- Ten lenses and N/A reasons: not applicable.
- New findings, uncertainty and blind spot: none from repair.
- Audit verdict: not applicable (no repairs).
- Subsequent changes and affected refresh: none.

## Disposition and next action

- Disposition author/session and date: the reviewer session above, acting as task-state owner, 2026-09-23.
- Review: accepted. Slice 1B.2b.3 is accepted on `43ffa1eb...`.
- Acceptance basis or blockers: B2B3-1..4 pass on the final snapshot (author receipts, confirmed by the reruns above). B2B3-5 is met: focused and full Node and Python, client types, the real check and protected sources were rerun here; build and `py_compile` are author-run and bound through `dist`. The retained bridge, reader and composer evidence rests on unchanged protected inputs. The implementation reports and self-audits for lead-23, correction-1 and repair-1 exist. The initial fresh review (`1b-2b-3-review.md`) and this focused follow-up are complete. WS-22 (R1) and WS-20 are resolved. WS-21 and WS-24 were already Closed. WS-23 remains an accepted nonblocking deferral (lead-25) that must close in 1B.2b.4 or 1B.2b.5 before adoption. The accepted residual and U-1 remain the interim limits recorded under `Approved exceptions currently in force`.
- Conditional closure: adequate direct evidence. This cycle has no reviewer-authored repair, and no material question needs another fresh assessment.
- Original independent coverage versus authored repairs: `1b-2b-3-review.md` covers the lead-23 and correction-1 implementation. This report covers repair-1, which the Codex session wrote, as a non-author. The same session also dispositions, a limit recorded above. No repair here is unreviewed.
- Task Status or established phase-state update: Status set to accepted, with 1B.2b.3 added to completed slices and the next action set to successor planning. Spec revision stays lead-25 (Status only, as at the 1B.2b.2 acceptance). The 1B.2b.3 cycle reports are marked `historical`; originals and the identity mapping are in `repair-1-review/records/`.
- Ledger update: WS-20 and WS-22 move to Closed on `43ffa1eb...`; no new row. O-1 and O-2 are optional and not indexed.
- Integration/release approval: not authorized; nothing committed, pushed or released.
- Next action and owner: Isaac assigns a task-state session to refresh and plan 1B.2b.4 (revision-backed legacy adapters) from this accepted evidence. WS-23 and the accepted residual carry into 1B.2b.4 and 1B.2b.5.
