---
record: "implementation-report"
task: "writing-studio"
cycle: "1b-2b-4a-repair-1"
spec_revision: "lead-27"
snapshot: "_local/project/evidence/writing-studio/1b-2b-4a/repair-1/snapshot/manifest.json"
author: "agent"
date: "2026-09-23"
state: "active"
summary: "F-1 reproduced, then repaired: the audio-only road checks its output folder, derived file and temp folder before any write. B2B4A-4 audio rows and all listed checks pass on snapshot 84c74067; ready for the focused fresh assessment."
read_when: "Assessing the WS-23 audio-only repair (review F-1) of Writing Studio 1B.2b.4a, or closing WS-23."
evidence: "_local/project/evidence/writing-studio/1b-2b-4a/repair-1/"
workflow_version: "5.0.0"
instruction_inventory: "docs/workflow/inventories/5.0.0-local-1.md"
---


# Implementation Report: writing-studio / 1b-2b-4a-repair-1

## Identity and freshness

- Implementation author: Claude Code desktop session (claude-opus-5-5), the repair-1 implementation writer by Isaac's relay on 2026-09-23. Not the task-state owner, not the reviewer, and not the author of the 1B.2b.4a slice this repair changes.
- Execution profile and context mode: claude-opus-5-5, effort not exposed; fresh context. No difference from README.
- Spec path and bound revision: `docs/project/tasks/writing-studio/spec.md` at lead-27, sections "1B.2b.4a repair-1: audio-only derived sinks (lead-27)" and "1B.2b.4a bounded assignment: finishing-action adapters (lead-26)", row B2B4A-4, approved exceptions; review `reports/1b-2b-4a-review.md` F-1 and its disposition; ledger WS-23. Not edited by this session.
- Code snapshot and snapshot evidence: base `fed8ed13dcb2aade06bee341953d6b10d58bff13` plus `snapshot/manifest.json`, sha256 `84c74067e738ec2fa93c544d84fbbfff8fbba07818a6a616a050bec0c0f17324` (`manifest-hash.txt`): tracked patch against HEAD (`edb78fc7...`), 83 untracked copies, 93 hashed contract inputs including the `dist/` modules the checks run, and this repair's delta `snapshot/1b-2b-4a-repair-1-delta.patch` (`2cbe5e12...`) against pre-edit copies verified against the 1B.2b.4a manifest or the HEAD blob (`delta/pre-edit-copies.json`). Helper: `snapshot-capture.mjs` (`node <helper> . --check`); `final/snapshot-check-post-checks.log`: "No drift." after every check.
- Environment/target: Windows 11 Home 10.0.26200; Node v24.21.0, Python 3.14.3, FFmpeg 8.1.1 (configured runtime). Unchanged built `dist/ui/web-server.js` on verified free loopback ports (never 3847); isolated home, data, exports and tmp under `_local/clipperz/tmp/` and the test runner's fixture folders; real Python bridge, FFmpeg and Remotion. No provider call; no browser proof claimed.
- Plan freshness: before any edit the 1B.2b.4a helper's `--check` found drift only in `spec.md`, `spec-log.md`, `findings-ledger.md` and the new review report, the expected task-state bookkeeping. The live tracked patch equals the snapshot's with those three files excluded (`pre/snapshot-check-start.log`, `pre/tracked-now-excl.patch`). No application drift. Workflow doctor: identities match `5.0.0-local-1` (`doctor-at-implementation.txt`).
- Resume before task-state reconciliation: Status (lead-27) names this repair as the next action with no active writer; the tree matched it. No discrepancy.
- Implementation: implemented
- Verification: pass (B2B4A-4 audio-only road and the listed B2B4A-6 refresh, final snapshot)
- Submitted for review: yes, for the focused fresh non-author assessment the lead-27 disposition requires.

## Execution Receipt

Paths are relative to `_local/project/evidence/writing-studio/1b-2b-4a/repair-1/`. Rows were recorded `pending` in this report before the first code edit. Final rows ran in `run-final.sh` order through `run-check.mjs` (`final/<label>.log` and `.receipt.json`), one at a time, on the final snapshot.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| Freshness | `node _local/project/evidence/writing-studio/1b-2b-4a/snapshot-capture.mjs . --check`; expect drift only in task-state bookkeeping | **1**, 8 drift lines, all in `spec.md`, `spec-log.md`, `findings-ledger.md`, the new review report and the tracked patch through those files; patch equal with them excluded | `pre/snapshot-check-start.log`, `pre/tracked-now-excl.patch` | `6391643c...` (unchanged) | self |
| B2B4A-4 F-1 reproduction | `node pre/ws23-audio-repro.mjs ws23-audio-repro-result`: real `create_clip` bridge, 3 s audio-only source, isolated fixture; expect the defect | **0**; defect reproduced: file symlink rewrote the owned file; junction as output folder wrote `wsjfolder.mp4` into the owned folder; dangling link created its owned target; case variant created `writing-studio/clip-owned/case/wscase.mp4`; missing root created `writing-studio/`; all reported success. Junction at the file name failed inside Remotion ("Audiogram render failed"), nothing written; control rendered | `pre/ws23-audio-repro.log`, `pre/ws23-audio-repro-result.json` | `6391643c...` (unchanged) | self |
| B2B4A-4 sink inventory | Read every return and hand-off of `generate_clip`'s legacy road and every use of `output_dir` and `title`; expect only the audio-only hand-off unchecked | Only the audio-only hand-off (line 1308) was unchecked; the video road's single final return was already checked by 4a; exact mode is not a legacy road | `sink-inventory.md` | `6391643c...` | self |
| B2B4A-4 tests detect F-1 | New audio-only `LegacySinks` tests run against a scratch copy of `backend/` with the two pre-edit files restored; expect the refusal tests to fail | **1**: 6 failed ("ClipRevisionFenceError not raised"), control passed | `dev/new-tests-on-pre-edit-code.log`, `dev/README.md` | pre-edit code | self |
| B2B4A-4 Python focused | `node scripts/verification/run-tests.mjs python -k "test_revision_fence or test_audiogram"`: audio-only symlink, junction, dangling link and renamed-title link at the derived name; junction, case-variant, namespace and missing-root folders (not created); default `<cwd>/output` and shared temp folder in the trees; refusal before the waveform read and Remotion, error `REVISION_PATH_PROTECTED: <fence wording>`; outside control renders | **0**: 31 passed, 48 subtests | `final/python-focused-run1.log` | final | self |
| B2B4A-4 real bridge and HTTP | `node scripts/verification/check-legacy-adapters.mjs --result final/legacy-adapters-result.json`, new step "WS-23 audio-only sinks" (6 s audio-only m4a, ffprobe: audio stream only): untracked audio clip `rerender` with a symlink, junction and dangling link at `Adapter_ws23a-<kind>.mp4` answers 409 `{error, code}` `REVISION_PATH_PROTECTED` with the fence wording, bytes unchanged; direct `create_clip` and `batch_clips` (plain-name clip renders, planted-name clip errors `REVISION_PATH_PROTECTED: ...`); junction as output folder, case variant, missing root refused and not created; outside rerender and `create_clip` controls render audiograms (audio and video streams) | **0**, `Passed` (428 s): 3 rerender 409s plus a 200 control, 3 direct and 3 batch refusals, junction folder, case variant and missing root refused, control rendered; every 1B.2b.4a step still passes, including the video "WS-23 legacy sinks" rows and path-free refusal logs | `final/check-legacy-adapters-run1.log`, `final/legacy-adapters-result.json` | final | self |
| B2B4A-4 correction demo | The reproduction probe on the repaired build: `node pre/ws23-audio-repro.mjs ../final/ws23-audio-after-result`; expect every F-1 case refused, nothing changed, control rendered | **0**: control rendered; symlink, junction at name, junction folder, case, missing root refused with the owned wording, dangling with the could-not-confirm wording; namespace unchanged, owned file unchanged | `final/ws23-audio-after-run1.log`, `final/ws23-audio-after-result.json` | final | self |
| B2B4A-6 py_compile | `node scripts/installation/run.mjs python r1-py-compile -m py_compile backend/services/clip_generator.py backend/services/audiogram.py tests/test_revision_fence.py` | **0** | `final/py-compile-run1.log` | final | self |
| B2B4A-6 Node focused | `node scripts/verification/run-tests.mjs node --maxWorkers=1` with the 18 files of `run-final.sh` (same set as 1B.2b.4a) | **0**: 18 files, 614 passed | `final/node-focused-run1.log` | final | self |
| B2B4A-6 Node full | `node scripts/verification/run-tests.mjs node --maxWorkers=1` (serialized files, allowed by lead-27) | **0**: 48 files, 837 passed | `final/node-full-run1.log` | final | self |
| B2B4A-6 Python full | `node scripts/verification/run-tests.mjs python` | **0**: 1010 passed, 6 skipped, 361 subtests (1006 before plus the 4 new tests) | `final/python-full-run1.log` | final | self |
| B2B4A-5/6 revision fence | `node scripts/verification/check-revision-fence.mjs --controls _local/project/evidence/writing-studio/1b-2b-3/pre-change/controls.json --result final/revision-fence-result.json` | **0**, `Passed`; controls match the pre-change capture | `final/check-revision-fence-run1.log`, `final/revision-fence-result.json` | final | self |
| B2B4A-6 exact render | `node scripts/verification/check-exact-render.mjs`; exact mode unchanged | **0**, `Passed` | `final/check-exact-render-run1.log` | final | self |
| B2B4A-6 protected sources | `python protected-sources.py`: reader, composer, `exact_render.py`, `video_processor.py`, Cleanup, `backend/main.py` equal `baseline-1b2b4a.json`; `clip_generator.py` changed lines only in the WS-23 helper, the legacy publication block and the audio-only hand-off; `audiogram.py` changed lines only in the typing import and `render_audiogram` through its `os.makedirs`, CRLF kept; 64 other 4a code and `dist` inputs equal the 4a snapshot | **0**: all match; `clip_generator.py` 7 hunks, `audiogram.py` 5 hunks, 0 outside; 0 of 64 differ | `final/protected-sources.log`, `final/protected-sources.json` | final | self |
| Snapshot | `node snapshot-capture.mjs . --check` after all checks | **0**, "No drift." | `final/snapshot-check-post-checks.log` | final | self |

- Executor identities and target: every row is this session (self) in this checkout; no subagent, delegation or human assistance.
- Runtime coverage: refusal through three callers (HTTP rerender, direct bridge, batch), controls on each road, the pre-repair defect and the post-repair refusal with the same probe, and the video road's rows unchanged.
- Human assistance: none.
- Not applicable: build and client types (no TypeScript changed; `dist` equals the 4a snapshot, protected-sources row); dependency advisories (no dependency changed); browser proof (no UI change).
- Not run: `check-saved-revision.mjs` (not in the lead-27 refresh list; no input it exercises changed).
- Changed inputs after checks: none. Development runs before snapshot capture are kept under `dev/` with a README.

## Change inventory

From `snapshot/1b-2b-4a-repair-1-delta.patch`; every other changed or untracked path equals the 1B.2b.4a snapshot.

- `backend/services/audiogram.py` (+10/-2, CRLF kept): `render_audiogram` takes an optional `check_sinks` hook and calls it with the `out_dir` and `final_path` it computed plus `tempfile.gettempdir()`, before `os.makedirs` and before the waveform read (B2B4A-4).
- `backend/services/clip_generator.py` (+10/-5): the audio-only hand-off passes `check_sinks=_refuse_revision_sinks`; helper docstring names the audio-only sinks (B2B4A-4).
- `tests/test_revision_fence.py` (+83): four audio-only `LegacySinks` tests (B2B4A-4).
- `scripts/verification/check-legacy-adapters.mjs` (+91): the "WS-23 audio-only sinks" step and header note (B2B4A-4).
- Interfaces: `render_audiogram` gains one optional keyword; callers without it are unchanged. No TS, route, CLI, MCP or client change.

## Deviations and decision requests

- None. Design choice within delegation: the renderer hands its own computed paths to the caller's check (one derivation), so no copy of the naming rule exists. It also checks the shared temp folder, which the video road checks only when it is the output location; this is stricter, never looser.
- No decision request for Isaac.

## Limitations and findings

- Defects: F-1 (WS-23, audio-only road) reproduced and repaired; proposed WS-23 closure is the task-state owner's after the focused assessment. No new defect found.
- Observations (self-audit A-1..A-3, nonblocking): shared-temp scratch names (Remotion silent video, waveform WAV) cannot be checked before the write, only their folder; the video road's shared-temp scratch stays unchecked as lead-26 accepted; the checked temp folder is Python's, which equals Node's in the supported profile (TMP, TEMP and TMPDIR set together).
- Record size: narrative over the 600-word soft cap because the freshness disposition, the reproduction and the inventory must stay on record.

## Handoff

- Checkpoint or actual handoff: handed off 2026-09-23 by this session; writes stopped after both reports.
- Current implementation writer: none after this handoff.
- Current snapshot: `repair-1/snapshot/manifest.json` (`84c74067...`), no drift after checks.
- Unfinished work and unresolved findings: none in scope. Out of scope and untouched: F-2 (WS-25), WS-26, A-2, O-A, O-B.
- Last failed approach: none in this repair.
- Next action and owner: the task-state owner arranges the focused fresh non-author assessment of the WS-23 audio-only repair on `84c74067...`, then the disposition of B2B4A-4 and WS-23.
- Pending Isaac decision: none.
- Durable decisions: none.
