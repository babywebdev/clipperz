---
record: "implementation-report"
task: "writing-studio"
cycle: "1b-2b-3"
spec_revision: "lead-23"
snapshot: "_local/project/evidence/writing-studio/1b-2b-3/snapshot/manifest.json"
author: "agent"
date: "2026-09-22"
state: "historical"
summary: "Tracked-clip write fence implemented; B2B3-1..4 pass on the final snapshot. Full Node fails two accepted save-service tests whose fixtures use the now-fenced legacy writers (decision request DR-1)."
read_when: "Reviewing Writing Studio 1B.2b.3, deciding DR-1, or tracing a legacy-write refusal on a tracked clip."
evidence: "_local/project/evidence/writing-studio/1b-2b-3/"
workflow_version: "5.0.0"
instruction_inventory: "docs/workflow/inventories/5.0.0-local-1.md"
---


# Implementation Report: writing-studio / 1b-2b-3

## Identity and freshness

- Implementation author: Claude Code desktop session (claude-opus-5-5), the 1B.2b.3 implementation writer by Isaac's relay; not the author of earlier reviewed code.
- Execution profile and context mode: claude-opus-5-5, effort not exposed; fresh context. No difference from README.
- Spec path and bound revision: `docs/project/tasks/writing-studio/spec.md` at lead-23 (sha256 `851cd47b…`, unchanged by this session).
- Code snapshot and snapshot evidence: base `fed8ed13dcb2aade06bee341953d6b10d58bff13` plus `snapshot/manifest.json` (sha256 `b88984be30c61e4c1ba638fa084bc2723fa7c0ce6fda276c74dd5b93fa849c26`): full tracked patch against HEAD (`e2d4c3d5…`), 68 untracked copies, 69 hashed contract inputs including the rebuilt `dist/` modules, and this slice's own delta (`1b-2b-3-slice-delta.patch`, `fe59f015…`) against pre-edit copies each verified against `baseline-1b2b3.json`. `snapshot-check-post-checks.log`: "No drift." after every check below. Helper: `snapshot-capture.mjs`.
- Environment/target: Windows 11 Home 10.0.26200; Node v24.21.0, Python 3.14.3, FFmpeg 8.1.1 from the configured runtime (`runtime-versions.log`); built `dist/ui/web-server.js` under the supported local profile (`PODCLI_LOCAL_ONLY=1`) on a verified free loopback port (never 3847) with isolated home/data/exports/tmp under `_local/clipperz/tmp/revision-fence-*`; the real Python CLI; real bridges for revision fixtures. No provider call; no browser proof claimed.
- Plan freshness: before any application edit, every `baseline-1b2b3.json` input, the five ignored inputs (four `dist/` files, hashed env) and HEAD matched with 0 mismatches (`binding/pre-edit-binding.json`, rechecked before the capture in `pre-change/binding-before-capture.json`); git status differed from the lead-23 planning capture only by `baseline-1b2b3.json` itself; of the 98 repair-4 rows only lead-23 `spec.md`/`spec-log.md` changed, matching the planning `records-post-edit.sha256` (`binding/repair4-rows-recheck.txt`). No relevant drift.
- Resume before task-state reconciliation: not applicable.
- Implementation: implemented
- Verification: fail (B2B3-1..4 pass; B2B3-5 full Node fails two accepted save-service tests, DR-1)
- Submitted for review: yes. Implementation completion (B2B3-1..4 pass, both reports, writes stopped) is met; acceptance also needs DR-1 resolved, a full Node rerun and fresh review.

## Execution Receipt

Evidence paths are relative to `_local/project/evidence/writing-studio/1b-2b-3/`; "final" is the snapshot above.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| Plan freshness (all) | Hash baseline inputs, ignored inputs and HEAD; compare git status and repair-4 rows with the lead-23 capture; expect 0 mismatches, explained drift only | 0 mismatches; drift only lead-23 bookkeeping and the baseline file | `binding/pre-edit-binding.json`, `binding/repair4-rows-recheck.txt`, `pre-change/binding-before-capture.json` | pre-edit tree | self |
| B2B3-3 pre-change capture | `node scripts/verification/check-revision-fence.mjs --capture pre-change/controls.json --result pre-change/capture-result.json` on the unedited build and Python; expect controls recorded and the pre-change defect shown | **0**, `Passed`; 14 controls; defect reproduced: caption PATCH on a version-zero clip 200 (karaoke to hormozi), `bake-thumbnail` rewrote card revision media, DELETE removed an exact revision's media | `pre-change/capture-run1.log`, `pre-change/controls.json` (`78d297a3…`) | pre-edit tree | self |
| B2B3-1 HTTP and CLI | `node scripts/verification/check-revision-fence.mjs --controls pre-change/controls.json --result final/check-result.json`: 8 fenced requests plus PATCH and DELETE by id prefix, x 4 tracked kinds (version zero, exact no-card, opening card, malformed), answer 409 `CLIP_REVISION_TRACKED`, body exactly `{error, code}`, no path or em dash, every stored byte unchanged; POST thumbnail and thumbnail/select still 403 (policy first); CLI `clips edit --caption-style`, `--thumbnail-config`, title plus caption, and `clips delete --yes` exit non-zero naming the code; title-only PATCH and `clips edit --title` succeed without touching other fields; editor context, reframe, cuts, preview bytes, `logo/previews` and `reopen` unchanged | **0**, `Passed`: 40 HTTP and 16 CLI refusals (the 8 prefix refusals come from the Python locked check behind the CLI), metadata edits on all 4 kinds, 58 refusal log lines with clip, operation and code only | `final/check-revision-fence-run1.log`, `final/check-result.json` | final | self |
| B2B3-1 policy-blocked routes and MCP | Focused run (row below) with `src/ui/clip-write-fence-route.test.ts` and `src/server.clip-fence.test.ts`: guards for all 7 fenced routes, including POST thumbnail and thumbnail/select, refuse tracked and malformed clips with the policy off, before any side effect and without handing an entry on; title-only, untracked, unknown and DEMO requests pass (untracked with the checked entry); fence registered after the policy middleware and before every fenced handler, which act on the checked entry; MCP delete answers refusal text (full id, prefix, malformed, owned-tree pointer) and deletes nothing; with the local policy on, the allowlist answers first | pass | `final/node-focused-run1.log` | final | self |
| B2B3-2 locked writers | `src/services/clip-write-fence.test.ts`, `tests/test_revision_fence.py`: TS `update` refuses all 20 owned fields (value and undefined) and `remove`, on version zero and five malformed values; Python `update_clip` refuses all 20 non-None owned fields on six tracked values, and `delete_clip`; nothing written; `revisions` refused on untracked entries; None-valued fields are not writes | pass (focused Node; Python 8 of 8 in the full run) | `final/node-focused-run1.log`, `final/python-full-run1.junit.xml` | final | self |
| B2B3-2 cross-process | `src/services/clip-write-fence.cross-process.test.ts`: the real CLI (through `fixtures/cli_lock_probe.py`, which only signals before asking for the lock) passes its unlocked lookup, waits while the real `ensureTracked` transaction holds the lock, then refuses `clips edit --caption-style`, `--thumbnail-config` and `clips delete --yes` with `CLIP_REVISION_TRACKED`; entry equals the TS-written state | pass (3 tests) | `final/node-focused-run1.log` | final | self |
| B2B3-2 route barrier | In the HTTP check: hold the history lock, send logo apply (TS commit) and thumbnail/render (Python commit behind `clips edit`) for an untracked clip, wait until the route changed its media (early check passed), land tracking with the real `ensureTracked` under that lock, release; expect 409 and the tracked entry unchanged | both 409 `CLIP_REVISION_TRACKED`; entry equal to the landed state; legacy media changed (the accepted residual) | `final/check-result.json` (`route barriers`) | final | self |
| B2B3-2 field set | `src/services/clip-write-fence.test.ts`: real commits through the save service with fakes (card with logo, bookends and words; no card, no words; logo only) diffed before and after, every changed key fenced and the projection exercised; TS and Python sets equal (Python child process); directory names equal `REVISION_NAMESPACE`/`REVISION_SIDECARS`; legacy writers do not import the save service | pass | `final/node-focused-run1.log` | final | self |
| B2B3-3 controls | Same HTTP check run: 12 route and CLI controls plus outside-tree `bake-thumbnail` and `swap-thumbnail` compared with the pre-change capture (status, body shape, history change, file presence, probe summary; sizes within 5%) | `controls match the pre-change capture` (14) | `final/check-result.json` | final | self |
| B2B3-3 metadata and suites | `node scripts/verification/run-tests.mjs node src/services/clip-write-fence.test.ts src/services/clip-write-fence.cross-process.test.ts src/ui/clip-write-fence-route.test.ts src/server.clip-fence.test.ts src/services/clips-history.test.ts src/services/clips-history.cross-process.test.ts src/services/clips-history-cloud.test.ts src/server-policy.test.ts src/config/policy.test.ts src/ui/editor-context-route.test.ts` (metadata writes on version-zero and malformed clips leave owned fields untouched); Python: title, generated, cloud, `set_link` and `_publish_metrics` on a tracked clip, and `test_clips_history`, `test_cli`, `test_youtube_sync`, `test_mutation_lock` | Node **0**: 10 files, 116 passed. Python modules pass (19, 4, 22, 19) | `final/node-focused-run1.log`, `final/python-full-run1.junit.xml` | final | self |
| B2B3-3 seam audit | `git grep` of production `ClipsHistory.transaction` and `mutate_clips_history` callers, with the fields each writes | 7 TS callers, all in the save service; Python callers are the two fenced writers and `_publish_metrics` (`metrics` only) | `final/seam-audit.txt` | final | self |
| B2B3-4 path fence | HTTP check: untracked entries pointing at a namespace file, a sidecar document, a case variant and a junction alias answer 409 `REVISION_PATH_PROTECTED` for logo, thumbnail/render, rerender and DELETE, and CLI `clips delete` refuses; `bake-thumbnail` and `swap-thumbnail` refuse a namespace file, a sidecar document, a case variant, a junction alias and a target under a missing namespace root (root not created) before any work; bytes unchanged; outside-tree controls proceed. Focused TS and Python resolution tests (dangling junction fails closed, same-prefix sibling allowed) | 20 route/CLI and 10 command refusals, junction created; unit tests pass | `final/check-result.json`, focused logs | final | self |
| B2B3-5 build | `node scripts/installation/run.mjs npm build run build` | **0** | `final/build-run1.log` | final | self |
| B2B3-5 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json` | **0** | `final/client-types-run1.log` | final | self |
| B2B3-5 full Node | `node scripts/verification/run-tests.mjs node`; expect 0 | **1**: 47 files, 772 tests, 770 passed, 2 failed, both in `src/services/clip-revisions.test.ts` with `ClipWriteFenceError` at a fixture step that calls a legacy writer on a tracked clip (DR-1) | `final/node-full-run1.log` | final | self |
| B2B3-5 full Python | `node scripts/verification/run-tests.mjs python`; expect 0 | **0**: 1340 tests, 0 failures, 6 skipped | `final/python-full-run1.log`, `final/python-full-run1.junit.xml` | final | self |
| B2B3-5 py_compile | `node scripts/installation/run.mjs python py-compile -m py_compile backend/services/clips_history.py backend/cli.py tests/test_revision_fence.py scripts/verification/fixtures/cli_lock_probe.py` | **0** | `final/py-compile-run1.log` | final | self |
| B2B3-5 protected sources | `python protected-sources.py`: reader, save service (and its compiled module), renderer, composer and Cleanup against `baseline-1b2b3.json` or the repair-4 manifest | all 13 match; both save-service test files also unchanged | `final/protected-sources.json` | final | self |
| DR-1 proposal (not a repository change) | `node decision/run-oot.mjs`: the proposed fixture adaptation of `clip-revisions.test.ts`, run out of tree with the same runtime and offline tripwire | **0**: 35 of 35 pass | `decision/oot-run2.log`, `decision/clip-revisions.test.proposed.patch` | final | self |

- Executor identities and target: every row is this session (self) on this Windows checkout; no subagent or delegation.
- Runtime coverage: happy paths (metadata edits, untracked controls, outside-tree commands, read routes) and refusal paths (entry, locked commit, cross-process, prefix via the Python lock, path, policy order, DEMO, MCP). Server refusal log lines were inspected for paths.
- Human assistance: none.
- Not applicable: browser proof (no UI change; the spec claims none).
- Not run: none of the required checks.
- Changed inputs after checks: none on the final snapshot. Earlier evidence for snapshot `1c9958c8…` is kept in `superseded-1/` and is not current: before handoff I made the five media handlers act on the entry the fence checked and added the prefix cases (see Limitations). Scratch runs before that: a first final-mode check ended with `fetch failed` (`read ECONNRESET`) on the first request after the long CLI step while the server kept running (log overwritten by the next scratch run, not retained); a pooled keep-alive socket had been idled out, so the check now opens one connection per request. The capture ran with the earlier transport. `pre-change/check-revision-fence.capture-version.mjs` is reconstructed from the final file by reverting the later edits (not a byte copy saved at capture time); `pre-change/capture-vs-final-check.diff` shows the differences: transport, two em-dash literals rewritten as JavaScript unicode escapes, an unused import, and the final-mode prefix cases.

## Change inventory

Git-derived (`snapshot/manifest.json`). This slice only, from `1b-2b-3-slice-delta.patch` and the added-file list; every other changed or untracked path is earlier accepted work, unchanged.

- `src/services/clip-write-fence.ts` (new): owned-field set, tracked test, patch and removal assertions, link-resolving path fence, `ClipWriteFenceError` (B2B3-1/2/4).
- `src/services/clips-history.ts` (+21/-7): locked checks in `update` and `remove`; one artifact list for check and unlink (B2B3-2/4).
- `src/ui/clip-write-fence-route.ts` (new): entry guards for 7 routes, `sendFenceRefusal`, `cliFenceCode`, `checkedClip` (B2B3-1/4).
- `src/ui/web-server.ts` (+47/-16): registers the guards after the policy middleware; the five media handlers act on the checked entry; CLI and TS commit refusals map to 409 in PATCH, DELETE, thumbnail, select, render, logo and rerender (thumbnail and select now read their `clips edit` result, for a fence code only).
- `src/server.ts` (+14/-1; mixed line endings preserved byte for byte): MCP delete refusal text, logged.
- `backend/services/clips_history.py` (+173/-7): same field set, fence error, path fence, locked checks in `update_clip` and `delete_clip`.
- `backend/cli.py` (+21/-0): path fence first in `bake-thumbnail` and `swap-thumbnail`; `clips delete` refuses before its prompt.
- Tests (new): `src/services/clip-write-fence.test.ts`, `src/services/clip-write-fence.cross-process.test.ts`, `src/ui/clip-write-fence-route.test.ts`, `src/server.clip-fence.test.ts`, `tests/test_revision_fence.py`, `scripts/verification/fixtures/cli_lock_probe.py`.
- `scripts/verification/check-revision-fence.mjs` (new): disposable HTTP and CLI check with capture and final modes.

## Deviations and decision requests

**DR-1: two accepted save-service tests use legacy writers on a tracked clip.**
- Current decision: lead-23 fences `ClipsHistory.update`/`remove` on tracked clips and requires full Node to pass. `src/services/clip-revisions.test.ts` is outside the expected writes and is an input of retained 1B.2a/1B.2b.1 evidence, so I did not edit it.
- Evidence: "a clip deleted or recreated during the render..." deletes the tracked clip with `history.remove`; "refuses malformed card descriptors..." sets `thumbnail_config` with `history.update` after `ensureTracked`. Both now throw `ClipWriteFenceError` at that fixture step; no assertion fails (`final/node-full-run1.log`).
- Proposed alternative: delete through the unfenced `transaction` seam, and set `thumbnail_config` before `ensureTracked` (`decision/clip-revisions.test.proposed.patch`: 2 hunks, assertions untouched). Out of tree the adapted file passes 35 of 35.
- Tradeoff: both tests keep their intent, but the file's hash changes, so retained evidence for it rests on the rerun instead of an unchanged input.
- Owner: the task-state owner (a test-fixture detail that keeps approved intent). Affected: the B2B3-5 full Node row only. Resolution: pending; nothing else waits on it.

## Limitations and findings

- Fixed before handoff: the first version re-read the clip in each media handler after the guard. A revision committed between the two reads could have given logo, thumbnail or rerender a namespace `output_path` to overwrite before the commit refused. The accepted residual assumes a route acts on the entry its early check captured. That case was not reachable (nothing tracks clips yet), and it is now closed by `checkedClip`, with a route test and a static wiring test. No ledger entry proposed; the task-state owner may decide otherwise.
- The pre-change capture reproduces the exposure lead-23 closes. No production path tracked clips, so it was not reachable in production.
- Accepted residual observed as specified: after the early check, logo apply and thumbnail/render changed the legacy output in place, then answered 409 at the commit.
- Out of scope, noted for the reviewer: `ClipsHistory.record` does not refuse a `revisions` field (its three callers build explicit fields without it, `final/seam-audit.txt`); the path fence compares paths, so a hard link to revision media from outside the trees is not detected (see the self-audit).
- Proposed durable corrections: DR-1 only.

## Handoff

- Checkpoint or actual handoff: handed off 2026-09-22 by this session.
- Current implementation writer: this session; writes stopped at handoff.
- Current snapshot: `_local/project/evidence/writing-studio/1b-2b-3/snapshot/manifest.json` (`b88984be…`).
- Unfinished work and unresolved findings: DR-1; the B2B3-5 full Node rerun after it; fresh non-author review.
- Last failed approach: none.
- Next action and owner: the task-state owner decides DR-1 (and who applies it), then arranges the fresh non-author review `reports/1b-2b-3-review.md`.
- Pending Isaac decision: none.
- Durable decisions: none.
