---
record: "implementation-report"
task: "writing-studio"
cycle: "1b-2b-4a"
spec_revision: "lead-26"
snapshot: "_local/project/evidence/writing-studio/1b-2b-4a/snapshot/manifest.json"
author: "agent"
date: "2026-09-23"
state: "active"
summary: "Finishing-action adapters and WS-23 sink checks implemented; B2B4A-1..5 pass on snapshot 6391643c; full Node and Python exit 0 (Node with serialized files after two contention timeouts). Ready for the fresh review."
read_when: "Reviewing Writing Studio 1B.2b.4a finishing-action adapters, WS-23 legacy sink refusals, or planning 1B.2b.4b, 1B.2b.5 or 1B.3."
evidence: "_local/project/evidence/writing-studio/1b-2b-4a/"
workflow_version: "5.0.0"
instruction_inventory: "docs/workflow/inventories/5.0.0-local-1.md"
---


# Implementation Report: writing-studio / 1b-2b-4a

## Identity and freshness

- Implementation author: Claude Code desktop session (claude-opus-5-5), the 1B.2b.4a implementation writer by Isaac's relay on 2026-09-23; not the task-state owner and not the author of earlier reviewed code.
- Execution profile and context mode: claude-opus-5-5, effort not exposed; fresh context. No difference from README.
- Spec path and bound revision: `docs/project/tasks/writing-studio/spec.md` at lead-26 (unchanged by this session).
- Code snapshot and snapshot evidence: base `fed8ed13dcb2aade06bee341953d6b10d58bff13` plus `snapshot/manifest.json` (sha256 `6391643cd9c6c49bc0ca1bd0052bcfdb425cad13252be37974eb5146a5b4c5c0`): tracked patch against HEAD (`83967dd2…`), 80 untracked copies, 86 hashed contract inputs including the rebuilt `dist/` modules, and this slice's delta (`1b-2b-4a-slice-delta.patch`, `3ac1c2f7…`) against pre-edit copies verified against `baseline-1b2b4a.json` or the 1B.2b.3 repair-1 manifest (`delta/pre-edit-copies.json`). `snapshot-check-post-checks.log`: "No drift." after every check below. Helper: `snapshot-capture.mjs` (`node <helper> . --check`).
- Environment/target: Windows 11 Home 10.0.26200; Node v24.21.0, Python 3.14.3, FFmpeg 8.1.1 (configured runtime); built `dist/ui/web-server.js` on verified free loopback ports (never 3847) with isolated home, data, exports and tmp under `_local/clipperz/tmp/`; the real Python bridge, CLI, FFmpeg, Remotion and configured browser. No provider call; no browser proof claimed.
- Plan freshness: before any edit, `freshness.py --check` reported drift none for 54 inputs and HEAD (`pre/freshness-check.log`). Workflow doctor: identities match `5.0.0-local-1` (`doctor-at-implementation.txt`).
- Resume before task-state reconciliation: not applicable.
- Implementation: implemented
- Verification: pass (B2B4A-1..5 and the B2B4A-6 checks below, on the final snapshot)
- Submitted for review: yes. Implementation completion (B2B4A-1..5 pass, both reports, writes stopped) is met; B2B4A-6 needs the fresh non-author review and the task-state disposition.

## Execution Receipt

Evidence paths are relative to `_local/project/evidence/writing-studio/1b-2b-4a/`; "final" is the snapshot above. Rows were recorded `pending` before the first application edit. Final checks ran through `run-check.mjs` (`final/<label>.log` and `.receipt.json`), first in the order of `run-final.sh`.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| Plan freshness (all) | `python _local/project/evidence/writing-studio/1b-2b-4a-plan/freshness.py --check`; expect exit 0, drift none | **0**, drift none (54 inputs and HEAD) | `pre/freshness-check.log` | pre-edit tree | self |
| B2B4A-4 WS-23 reproduction (unchanged build) | `node _local/project/evidence/writing-studio/1b-2b-4a/pre/ws23-repro.mjs` on the unedited build and Python: real legacy `create_clip` bridge calls into an outside output directory whose title-derived name is a planted file symlink, a directory junction and a dangling link into the revision namespace; expect the defect | **0**; defect reproduced for all three: the symlink rewrote the owned file, the junction wrote `normalized.mp4` into the owned directory, the dangling link created its missing owned target; every call reported success | `pre/ws23-repro.log`, `pre/ws23-repro-result.json` | pre-edit tree | self |
| B2B4A-1 real HTTP | `node scripts/verification/check-legacy-adapters.mjs --result final/legacy-adapters-result.json`: on exact no-card and opening-card fixtures, caption PATCH (with title), logo apply and remove and thumbnail render (local profile), thumbnail generate and select (upstream-profile phase, D-1) each commit exactly one revision with a `legacy-<uuid>` operation; recipe diff equals only the change; decoded logo patch orange with the logo, cyan without; card frames equal the chosen or carried image with no logo on them and the raw render starts with content; receipt segments equal, raw duration within the composition tolerance; renderer style `hormozi`; earlier files byte-identical; unchanged style and unchanged select leave history and groups byte-identical; success keys with `ok: true` | **0**, `Passed`: caption revision 2 (`hormozi`); logo patch (254, 164, 0) with, (1, 255, 255) before and after removal; render, generate (3 variations) and select (distinct `thumb_v9.png`) committed; unchanged style and select rewrote nothing | `final/check-legacy-adapters-run1.log`, `final/legacy-adapters-result.json` | final | self |
| B2B4A-1 focused | `node scripts/verification/run-tests.mjs node --maxWorkers=1` with the 18 files of `run-final.sh`, including `src/services/clip-legacy-adapters.test.ts` and `src/ui/clip-write-fence-route.test.ts`; expect exit 0 | **0**: 18 files, 614 passed (run 3). Runs 1 and 2 with the default two workers exited **1** on 5 s timeouts in unchanged save-service tests (1 and 2 tests); see Changed inputs | `final/node-focused-run3.log`; `final/node-focused-run1.log`, `-run2.log`, `final/diag-clip-revisions-alone.log` | final | self |
| B2B4A-2 failures | Same check and focused suite: version zero, no current revision, malformed `revisions`, unreadable and invalid document (and, in tests, another clip's or version's document, invalid recipe, card without image): 409 `REVISION_BASE_UNAVAILABLE`; draft, pending operation, state changed between guard and pending record: 409 `REVISION_BUSY`; source missing or changed, logo missing or a folder, card copy missing or changed: 409 `REVISION_INPUT_MISSING`; injected render, composition, probe and commit failures with the real bridge: `REVISION_SAVE_FAILED` 500, previous file still served over HTTP; null, empty, unknown and numeric styles: 400 `INVALID_CAPTION_STYLE`, title unchanged; bodies exactly `{error, code}`, path-free; log lines clip, operation, code only | **0**: 14 base, 2 busy plus the in-process race, 6 input and 4 style refusals with bytes unchanged; failures `failed` (render, composition, probe) and `pending` (commit, then `REVISION_BUSY` over HTTP until invalidated); 30 refusal log lines path-free | `final/legacy-adapters-result.json`, `final/node-focused-run3.log` | final | self |
| B2B4A-3 projection | Same check and suites: after every commit `logo_backup_path` absent, `preview_path` is the committed card copy with its hash and serves through `/api/image` (absent without a card), `card_seconds` per its rule, settings (`line1`, `line2`, `variations`) land in the commit and not after a failed save; identity without settings equals the pre-slice formula; replays rewrite nothing; logo remove restores no backup; tracked logo previews never use the planted backup and write only under `logo-previews/`; legacy `.pre-logo.mp4` files byte-identical; `check-saved-revision.mjs` asserts the projection on real card and no-card commits | **0**: all asserted; 4 previews sampled cyan, not the pink backup; replay byte-identical; `check-saved-revision.mjs` **0**, `Passed` | `final/legacy-adapters-result.json`, `final/check-saved-revision-run1.log`, `final/saved-revision-result.json` | final | self |
| B2B4A-4 WS-23 | Same check: file symlink, junction and dangling link at the title-derived name refused through rerender (409 `REVISION_PATH_PROTECTED`, owned or could-not-confirm wording) and direct `create_clip` (error line `ClipRevisionFenceError: REVISION_PATH_PROTECTED: …`), and at the suffixed name through `batch_clips` (first clip renders, second refused); case variant and missing namespace root refused, root not created; outside-tree rerender and `create_clip` render; bytes unchanged. Python `LegacySinks`: final, suffixed, overlay, source and both autofix sinks, namespace folders, exact mode unchanged | **0**: 3 rerender 409s plus a 200 control, 3 direct and 3 batch refusals, case variant, missing root, outside control rendered; Python 5 of 5 `LegacySinks` pass | `final/legacy-adapters-result.json`, `final/python-full-run1.junit.xml` | final | self |
| B2B4A-5 fence contracts | `node scripts/verification/check-revision-fence.mjs --controls _local/project/evidence/writing-studio/1b-2b-3/pre-change/controls.json --result final/revision-fence-result.json`: untracked controls equal the 1B.2b.3 capture; tracked `thumbnail_config` PATCH variants, DELETE and rerender 409 `CLIP_REVISION_TRACKED`; invalid styles 400; version zero and malformed finishing actions 409 `REVISION_BASE_UNAVAILABLE`; CLI media options and `clips delete` refuse; title-only PATCH and CLI title succeed; bytes unchanged. Focused fence, cross-process, clips-history, cloud, server-policy, policy, MCP (`src/server.clip-fence.test.ts`) and editor-context suites; Python CLI, history and fence tests. Audit: one production importer of the save service, no production `ensureTracked`, reader unchanged | **0**, `Passed`: 72 HTTP and 48 CLI refusals, barriers 409, 14 controls match the capture; focused **0** (run 3); audit as expected | `final/check-revision-fence-run1.log`, `final/revision-fence-result.json`, `final/import-audit.txt` (`import-audit.sh`) | final | self |
| B2B4A-6 build | `node scripts/installation/run.mjs npm build-1b-2b-4a-r3 run build` | **0** | `final/build-run1.log` | final | self |
| B2B4A-6 client types | `node scripts/installation/run.mjs node client-types-1b-2b-4a-r3 node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json` | **0** | `final/client-types-run1.log` | final | self |
| B2B4A-6 full Node | `node scripts/verification/run-tests.mjs node --maxWorkers=1`; expect exit 0 | **0**: 48 files, 837 passed (run 2). Run 1 (default workers) exited **1**: one `EPERM` creating a lock file in the unchanged cross-process history test | `final/node-full-run2.log`; `final/node-full-run1.log` | final | self |
| B2B4A-6 full Python | `node scripts/verification/run-tests.mjs python`; expect exit 0 | **0**: 1006 passed, 6 skipped (platform), 358 subtests passed | `final/python-full-run1.log`, `final/python-full-run1.junit.xml` | final | self |
| B2B4A-6 py_compile | `node scripts/installation/run.mjs python py-compile-1b-2b-4a-r3 -m py_compile backend/services/clip_generator.py backend/services/clips_history.py tests/test_revision_fence.py` | **0** | `final/py-compile-run1.log` | final | self |
| B2B4A-6 saved revision | `node scripts/verification/check-saved-revision.mjs` | **0**, `Passed` | `final/check-saved-revision-run1.log` | final | self |
| B2B4A-6 exact render | `node scripts/verification/check-exact-render.mjs` | **0**, `Passed` | `final/check-exact-render-run1.log`, `final/exact-render-result.json` | final | self |
| B2B4A-6 protected sources | `python _local/project/evidence/writing-studio/1b-2b-4a/protected-sources.py`: reader, composer, `exact_render.py`, `video_processor.py`, Cleanup and `backend/main.py` equal `baseline-1b2b4a.json`; every non-blank changed line of `clip_generator.py` lies in its legacy publication block or the new sink helper | **0**: all match; 5 hunks, 0 outside | `final/protected-sources.json` | final | self |

- Executor identities and target: every row is this session (self) on this checkout; no subagent, delegation or human assistance.
- Runtime coverage: success, unchanged, refusal, failure-injection, concurrency (state changed before the pending record), policy-first and log paths; decoded frames for logo and card.
- Human assistance: none.
- Not applicable: browser proof (no UI change; none claimed); dependency advisories (no dependency changed).
- Not run: none of the required checks.
- Changed inputs after checks: two earlier final runs are kept with READMEs. `superseded-1/` (snapshot `4d8eee91…`): Node failed only the B2B2-4 module-graph test (D-2). `superseded-2/` (snapshot `8c58ff98…`, all Node and Python green): two intended `\u2014` escapes had been stored by the editing tools as literal em dashes in the new check and a test; they were rewritten byte-level and every final check rerun. On the final snapshot, default two-worker Node runs failed three times on unchanged tests, never on this slice's code: two 5 s timeouts in save-service tests (all 35 in that file take 4.4 s alone, `diag-clip-revisions-alone.log`) and one Windows `EPERM` in the lock's create path. Serializing test files (`--maxWorkers=1`, a runner setting; no test changed) passed both suites; this was the changed approach instead of a third identical run.

## Change inventory

Slice only, from `snapshot/1b-2b-4a-slice-delta.patch`; every other changed or untracked path is earlier accepted work, unchanged.

- `src/services/clip-legacy-adapters.ts` (new, 352 lines): base and busy checks, derivation, unchanged-request handling, input checks, error mapping, preview base (B2B4A-1/2/3).
- `src/services/clip-revisions.ts` (+108/-12): `thumbnail_metadata` in request identity and commit; commit projection of `logo_backup_path` and `preview_path`; `updateThumbnailMetadata`; exported `revisionInputs`, `sameRecipe`, `sha256File`; header (B2B4A-1/3).
- `src/models/clip-revisions.ts` (+22/-2): request field, metadata request and result types, header.
- `src/ui/clip-write-fence-route.ts` (+66/-6): adapted dispatch (`adapted`, `adaptedClip`), `sendAdapterRefusal`, `bridgeFenceRefusal` (B2B4A-1/2/4/5).
- `src/ui/web-server.ts` (+120/-5): tracked PATCH, logo and thumbnail handlers; tracked logo previews; rerender WS-23 mapping.
- `src/services/clip-write-fence.ts` (+3/-2), `backend/services/clips_history.py` (+3/-2): tracked refusal wording, identical in both (B2B4A-5).
- `backend/services/clip_generator.py` (+34/-10): `_refuse_revision_sinks` and the legacy sink check before the first write (WS-23, B2B4A-4).
- Tests: `src/services/clip-legacy-adapters.test.ts` (new), `src/ui/clip-write-fence-route.test.ts`, `tests/test_revision_fence.py` (`LegacySinks`), projection expectations in `src/services/clip-revisions.test.ts`, `.card.test.ts`, `.process.test.ts`, module-graph rule in `src/ui/editor-context-route.test.ts`.
- Checks: `scripts/verification/check-legacy-adapters.mjs` (new); lead-26 expectations in `check-revision-fence.mjs` and projection assertions in `check-saved-revision.mjs`.

## Deviations and decision requests

- D-1 Thumbnail generate and select are refused by the local policy (403, still asserted). Their real-HTTP rows use a second disposable server in the upstream profile that keeps strict AI routing and points both AI command paths at missing files, with fixed text; all other rows use the local profile. The task-state owner may accept this or prefer the focused route tests alone.
- D-2 `src/ui/editor-context-route.test.ts` asserted that the save service is absent from the studio's module graph (B2B2-4). Lead-26 requires the adapter path to import it, so the test now asserts the reader's own graph excludes it and the adapter module is its only importer in the studio graph. Pre-edit copy in `delta/pre-edit/`. Flagged for the reviewer.
- No decision request for Isaac.

## Limitations and findings

- Defects: WS-23 reproduced on the unchanged build and fixed; proposed ledger closure for the task-state owner. No new defect in this slice.
- Observations (self-audit A-1..A-9, all nonblocking): the protected reader's `save_revision` detail still says no route commits a revision; an unavailable `ffprobe` answers `REVISION_INPUT_MISSING`; tracked logo previews use the raw render, which carries an applied logo; a title after a committed style is a second step; an unchanged thumbnail request keeps a pre-slice stale `preview_path`; WS-23 refuses after the legacy render finishes in its temp folder; a refused sink keeps its in-process reservation; logo, intro and outro count as changed only when missing or not regular files; pre-existing Windows test flakes (timing-sensitive save-service tests under two workers, and `EPERM` from the lock's `tryCreate`), a candidate ledger entry for the owner. O-1 (the unreachable DEMO arm) was left.
- Carried as the spec states: interrupted commits leave a pending operation answered `REVISION_BUSY` (1B.2b.5); the Library logo-remove button keys on `logo_backup_path` (1B.3).
- Record size: the narrative exceeds the 600-word soft cap because two superseded final runs, three failed default-worker test runs, two deviations and nine observations all have to stay on record.

## Handoff

- Checkpoint or actual handoff: handed off 2026-09-23 by this session; writes stopped.
- Current implementation writer: none after this handoff (this session stopped writing).
- Current snapshot: `snapshot/manifest.json` (`6391643c…`), no drift after checks.
- Unfinished work and unresolved findings: none in scope; observations above for the owner.
- Last failed approach: default two-worker Node runs on the final snapshot hit contention timeouts and one lock `EPERM` in unchanged tests; serialized runs passed.
- Next action and owner: the task-state owner arranges the fresh non-author review `reports/1b-2b-4a-review.md` (B2B4A-6) and then the disposition, including D-1, D-2 and the WS-23 ledger closure.
- Pending Isaac decision: none.
- Durable decisions: none.
