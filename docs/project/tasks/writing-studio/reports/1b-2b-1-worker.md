---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2b-1"
spec_revision: "lead-13"
snapshot: "_local/project/evidence/writing-studio/1b-2b-1/snapshot/manifest.json"
author: "worker"
date: "2026-09-15"
state: "active"
summary: "1B.2b.1 opening-card save implemented: internal Python composer, service composition validation and final-composition record; focused, full, build, type, compile, both bridges, parity and decoded proofs pass; handed back for fresh review."
read_when: "Reviewing 1B.2b.1 evidence, disposing B2B1-1..5, or checking opening-card composition and compatibility."
evidence: "_local/project/evidence/writing-studio/1b-2b-1/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---

# Implementation Report: writing-studio / 1b-2b-1

Size exception: a new producer and consumer contract, prototype findings that changed the delegated design, and receipts for five acceptance IDs exceed the 1,200-word soft cap; no required evidence is dropped. Evidence paths are relative to `_local/project/evidence/writing-studio/1b-2b-1/`; times are UTC.

## Identity and freshness

- Implementation author: Worker, Claude Code desktop session (Claude Opus 5), on Isaac's manual relay of lead-13. No agent dispatch; verification delegation disabled; every check ran in this session.
- Spec: `docs/project/tasks/writing-studio/spec.md` lead-13, "1B.2b.1 bounded assignment", acceptance table B2B1-1..5, constraints, baseline and exceptions; `reports/1b-2a-repair-3-worker.md` receipt and Handoff; `reports/1b-2a-repair-3-review.md` including the lead disposition.
- Code snapshot: HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13` (tree `b0d7d5c8e62c440fca5d1e4b6dfaa65ebd179f2c`) plus `snapshot/manifest.json` (SHA-256 `32ca283f9521a485bdef5fc422108647277c0d1e078fab2a4aa2ec3a0184c899`: 25 file entries, 57 local evidence, 22 contract/dependency inputs, 16 workflow files). Tracked patch against HEAD `snapshot/1b-2b-1-tracked.patch` SHA-256 `4340dca4d6bc57d195b61c0e57036fc3bc117d96e52a774de2f2217360087f84` (180,430 bytes; it also carries the accepted uncommitted 1B.2a work and lead records). All ten untracked inputs are copied under `snapshot/untracked/`. `1b-2b-1-slice.patch` SHA-256 `8b884ae8c14ace1f484e16c9b831ae8ff2c20de26753814a7700ababb94ca40a` diffs this cycle's 9 changed files against their pre-edit copies and adds its 4 new files.
- Environment: Windows 11; Node 24 via the configured runtime; configured venv CPython 3.14 with numpy; pinned FFmpeg/ffprobe 8.1.1 (gyan full build); `dist/` rebuilt by build run 2. Synthetic media and isolated storage only (OS temp, `_local/clipperz/tmp/`, evidence); no AI call, network or user Library.
- Plan freshness (`plan.md`, written before any application edit): `baseline-1b2b1.json` 20 of 20 inputs match. Repair-3 `snapshot-capture.mjs --check` exit 1 with only lead-owned `spec.md`, `spec-log.md` and `findings-ledger.md` drifting (12 files, 88 evidence, 11 contract inputs match). `strict_ai.py` hash matches the repair-3 value; inventory 22 of 22; pre-edit focused Node 43/43. No relevant drift.
- Resume before lead reconciliation: Status agrees with the repair-3 Handoff and disposition (1B.2a accepted, Worker next on relay). Discrepancy: Status says 16 workflow entries match; the recheck shows the three lead bookkeeping files above changed. No application effect; not edited by me.
- Implementation: implemented
- Verification: pass
- Submitted for review: yes; acceptance belongs to the coordinating lead after fresh independent review.

## Design as implemented

- Live prerequisite: real accepted raw exact renders with an outro are flagged variable-rate (r 100/1, avg 1500/61), start video 0.063 s after audio and carry SAR 5120:5121 (`plan.md`). The legacy `thumbnail_to_video_frame` (portrait, square pixels, 44.1 kHz stereo) does not meet the contract and is not used.
- Prototype (`prototype/proto-attempt4.py`, attempts kept in `plan.md`): (1) `setsar=5120/5121` reduced to 1:1 and concat refused; (2) plain raw exact, but the late-start raw's frames moved 17 ms (1.537031 s instead of 1.520 s), which only a packet check exposed; (3) card `settb` changed nothing; (4) setting `-enc_time_base:v` and the track timescale to the raw time base placed every raw frame exactly and gave 0-sample decoded audio lag on both raws.
- Composer: new `backend/services/opening_card.py` behind internal bridge task `compose_opening_card` (`backend/main.py`; no route, CLI or MCP). It refuses any placement but "opening" and any duration but 1.5, checks the raw file's recorded SHA-256 before creating anything, then reuses the accepted `_ExactOutputGroup` (exclusive parent, staging, one rename, cleanup from first parent acquisition, residual note) and `_stage_verified_copy`. The staged image copy must hash to the captured value before any encode. One FFmpeg graph: N image frames (fit, black pad, raw SAR, yuv420p) at the raw's leading frame duration, silent audio at the raw rate/layout floored to whole samples, concat with the decoded raw streams, hard cut, zero overlap, encoder and track time base equal to the raw's. A silent raw gets a video-only card. Before the rename it verifies packets = raw + N, card frames at whole durations from tick 0, every raw frame at its raw pts plus exactly the card, unchanged dimensions/SAR/time base/audio parameters, audio start unchanged and end moved by the card within one AAC frame; the receipt is prepared from those measurements.
- N = whole frames nearest 1.5 s, ties up (25 fps: 38 = 1.52 s; 30000/1001: 45 = 1.5015 s).
- Service (`src/services/clip-revisions.ts`): strict `thumbnail_card` descriptor (four fields, absolute png/jpg/jpeg/webp path, lowercase SHA-256, "opening", 1.5); absent/null/false mean no card and hash as before (`canonical` drops undefined). Drafts persist it after an identity check without rendering. Replay precedes every filesystem check; new work then checks the image identity before the operation begins (`CARD_IMAGE_MISMATCH`). Raw receipt validation is unchanged (card still absent). The composer runs from the fresh validated render with a per-call group stem; `validateComposition` accepts only a single new group beneath the namespace holding exactly the composed file and card image, recomputes the image hash, and with its own ffprobe of every video packet repeats the composer's relationships. Tolerance basis (documented before use): video in whole ticks with no slack; card within half a frame of 1.5 s; audio end within 1024 samples + 1 at the probed rate. Anything else fails with `INVALID_COMPOSITION` or an artifact code; every published group (renderer's and composer's) is a residual.
- Records: `render_timeline` stays the raw receipt. Every new save adds versioned `final_composition` (raw render file/group/offsets, card with descriptor, image, frames, measured duration, samples and producer receipt, served-file probe and stream summaries, `card_offset`, `content_offset`, `content_duration`, artifact placements and time domains, tolerance). `files.main`, pointer `output_path`/`group_root`, legacy `output_path`, `duration` (probed served length) and `file_size_mb` describe the served file; `groups` lists all dependency groups; `thumbnail_config.card_seconds` is the measured card or 0. Older documents and pointers are read as saved. `verifyRevisionFiles` also rechecks a card revision's raw render and image.

## Execution Receipt

Snapshot for every "final" row: HEAD fed8ed1 plus `snapshot/manifest.json`. No application input changed after build run 2 except the saved-revision check script, which ran after its last edit.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| Pre-edit baseline | `node scripts/verification/run-tests.mjs node src/services/clip-revisions.test.ts src/services/clip-revisions.process.test.ts src/services/clip-revisions.join-matrix.test.ts`; expect 0 | 0: 3 files, 43 passed | `pre-edit/node-focused-pre-edit.log` | pre-edit | self |
| B2B1-2,3 composer (real media, faults) | `node scripts/installation/run.mjs python 1b-2b-1-py-compile -m py_compile backend/services/opening_card.py backend/main.py tests/test_opening_card.py`, then `node scripts/verification/run-tests.mjs python -k opening_card`; expect 0 | compile 0; tests 0: 14 passed, 32 subtests (vertical/horizontal/square, NTSC 48 kHz stereo, late video start with join gap, silent raw, repeated groups, decoded 0-sample lag and silent card, faults at raw/image check, parent/staging creation, copy, composition, measurement, lost audio, rename, denied cleanup) | `py-compile-run1.log`, `python-card-run1.log` | final | self |
| B2B1-1..4 service | `node scripts/verification/run-tests.mjs node src/services/clip-revisions.test.ts src/services/clip-revisions.process.test.ts src/services/clip-revisions.join-matrix.test.ts src/services/clip-revisions.card.test.ts`; expect 0 | 0: 4 files, 56 passed (draft, commit record, replay without image/source, change/remove/content+logo with byte-identical earlier files, image refusal, 29 fault/contradiction cases, document/commit failure, cancellation/draft/recreation during composition, junction namespace and linked group, old documents, Cleanup; process kill after compose and after commit) | `node-focused-run1.log` | final | self |
| B2B1-2 producer-backed service | `node scripts/verification/run-tests.mjs node src/services/clip-revisions.card-producer.test.ts`; expect 0 | 0: 5 passed; real bridge composer and ffprobe: 25 fps mono, NTSC 48 kHz stereo square, silent horizontal, late start, each decoded (card, content, 0-sample lag, silence); a default-encoder-time-base re-encode refused by packet placement | `node-card-producer-run1.log` | final | self |
| B2B1-5 full Node | `node scripts/verification/run-tests.mjs node`; expect 0 | 0: 40 files, 327 passed | `node-full-run1.log` | final | self |
| B2B1-5 build | `node scripts/installation/run.mjs npm build run build`; expect 0 | run 1 exit 2 (two TS errors: tsc compiled the old card test while my edit landed, and `TaskRequest.task_type` lacked `compose_opening_card`); run 2 after the union fix: 0 | `build-run1.log`, `build-run2.log` | final (run 2) | self |
| B2B1-5 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json`; expect 0 | 0 | `client-types-run1.log` | final | self |
| B2B1-1..4 saved-revision bridge | `node --check scripts/verification/check-saved-revision.mjs && node scripts/verification/check-saved-revision.mjs`; expect 0 `Passed` | 0 `Passed`, 21 steps. Card: 38 frames of 0.04 s, measured 1.52 s, raw 3.135 s to served 4.655011 s, audio lag 0 samples at 44.1 kHz, card peak 0, card frames identical (diff 0), caption pixels 5027/2923 after the card, 3/3 reopened files ok; replay with the image moved away; card B and removal leave earlier files byte-identical; logo white pixels content 15876, card 0, previous 0; changed image `CARD_IMAGE_MISMATCH`; real receipt claiming 37 frames refused with both groups named; Cleanup offers nothing under exports | `check-saved-revision-run1.log`, `check-saved-revision-run1-result.json` (fixture `saved-revision-2kPI4J`) | final | self |
| B2B1-4 genuine old documents | `node _local/project/evidence/writing-studio/1b-2b-1/demo-old-replay.mjs`; expect 0 | 0: 3 genuine accepted repair-3 committed operations (fixture `saved-revision-KKDglC`, history copied) replay unchanged with card absent, null and false; a card under the same id `OPERATION_ID_REUSED`; no render, compose or probe; copy and original byte-identical; files verify | `demo-old-replay-run1.log` | final | self |
| B2B1-4 write area and opt-in audit | `git status`, `git diff --stat HEAD`, importer search, baseline input hashes | only planned files changed; renderer, history, web server, Cleanup, CLI, thumbnail, packages and config unchanged; `strict_ai.py` `be018cbf...`; no route/CLI/MCP importer | `write-area-audit-run1.log` | final | self |
| B2B1-2,4 exact bridge | `node --check scripts/verification/check-exact-render.mjs && node scripts/verification/check-exact-render.mjs`; expect 0 `Passed` | 0 `Passed`: raw exact output 3.135 s at 1500/61 fps, outro `hardcut`, join inputs 2.09 / 1.020998; raw receipt `thumbnail_card.applied` false; earlier same-title output unchanged; legacy default and invalid-request refusals unchanged (renderer untouched by this cycle) | `check-exact-render-run1.log`, `check-exact-render-run1-result.json` (fixture `exact-render-Yfr0yD`) | final | self |
| B2B1-2,5 focused Python | `node scripts/verification/run-tests.mjs python -k "opening_card or exact_render"`; expect 0 | 0: 91 passed, 155 subtests (77 accepted exact-render tests plus 14 card tests; exact bridge tests cover the changed `main.py`) | `python-focused-run1.log` | final | self |
| B2B1-5 full Python | `node scripts/verification/run-tests.mjs python`; expect 0 | 0: 991 passed, 6 skipped, 313 subtests (repair-3: 977 passed, 6 skipped); includes the preserved `strict_ai.py` change, not a live provider test | `python-full-run1.log` | final | self |
| B2B1-4,5 preview/export parity | `node scripts/verification/check-preview-render.mjs` (port 3893 checked free); expect 0 `Passed` | 0 `Passed: preview/export video and audio match; correct dimensions; preview stays out of history.` (legacy preview and export paths unchanged) | `check-preview-render-run1.log` | final | self |
| AC-12 instruction binding | SHA-256 of every inventory 4.1.0-local-1 entry, before edits and after the last check | 22 of 22 match both times | `pre-edit/instruction-inventory-check.log`, `instruction-inventory-check-final.log` | final | self |
| AC-12 snapshot | `node _local/project/evidence/writing-studio/1b-2b-1/snapshot-capture.mjs`, then `--check`; expect 0 drift | capture 0: no unaccounted change, no missing evidence; `--check` 0: 0 drift, no status line outside the snapshot. Output went to the session scratchpad and was copied in afterwards, so neither log is hashed | `snapshot/`, `snapshot-capture.log`, `snapshot-check.log`, `snapshot-recheck-final.log` | final | self |

- Executor identities and target: every row `self`, this Worker session, configured local runtime, disposable fixtures.
- Human assistance: none.
- Not applicable: browser/Studio walkthrough (no UI or route); live AI (no AI call); `check-storage-cleanup.mjs` (Cleanup code unchanged; the real scanner runs in the bridge and service tests).
- Not run: none of the required checks.
- Changed inputs after checks: none. After the last check only the snapshot, its logs and this report were written.

## Change inventory

Git-derived against HEAD `fed8ed1` (`write-area-audit-run1.log`; final list in `snapshot/`):

- `backend/services/opening_card.py` (new): composer, measurement, verification, receipt.
- `backend/main.py`: `handle_compose_opening_card` and its dispatch row.
- `src/services/clip-revisions.ts`: descriptor, identity checks, composition step and validation, stream probe, final composition record, groups, residuals, legacy projection, reopen verification.
- `src/models/clip-revisions.ts`: card descriptor, composer receipt, final composition record, groups, error codes; `src/models/index.ts`: task-type union.
- Tests: `tests/test_opening_card.py` and `src/services/clip-revisions.card.test.ts`, `clip-revisions.card-producer.test.ts` (new); `clip-revisions.test.ts` (served-file duration, descriptor refusals, no-card identity); `clip-revisions.process.test.ts` (two card interruption cases); `clip-revisions.test-support.ts` (fake composer and stream probe); `scripts/verification/fixtures/revision-worker.ts` (card mode).
- `scripts/verification/check-saved-revision.mjs`: real card steps and updated duration/refusal/count assertions.
- Unchanged accepted working changes and lead/reviewer records: `exact_render.py`, `check-exact-render.mjs`, `test_exact_render.py`, join-matrix files, spec, spec-log, ledger, `baseline-1b2b1.json`, repair-3 reports.

## Deviations and decision requests

No blocking decision request. Delegated choices for review:

- Card frame timing comes from the raw file's leading packets, not receipt `fps`, because real outro renders are flagged variable-rate; the encoder time base is pinned to the raw's (prototype attempt 4).
- The image identity is checked before an operation begins (typed error, nothing recorded) and again, authoritatively, on the staged copy by the composer and by the service.
- Every new save carries `final_composition`, with `card: null` when no card was requested, so readers have one shape.
- For lead attention, spec-directed: legacy `entry.duration` is now the served file's probed length for new saves (1B.2a projected content length). The bridge and service expectations were updated accordingly.
- `thumbnail_config.card_seconds` is set to the measured card; `preview_path` is untouched (legacy thumbnail routes are successor adapter work).
- `UNSUPPORTED_THUMBNAIL_CARD` was removed as unreachable; `INVALID_THUMBNAIL_CARD`, `CARD_IMAGE_MISMATCH` and `INVALID_COMPOSITION` were added.

## Limitations and findings

- Defects: none open in this scope. Found and fixed before handback, logs kept: build run 1 (my concurrent build and test edit; missing task-type union member); prototype attempts 1 to 3 above; four defects in my first composer test draft found by inspection before its first run.
- Uncertainty: per-save validation proves video placement exactly but audio only by stream start and duration within one AAC frame; the sample-exact audio offset is proven by decoding in tests and the bridge, not on every save. Image scaling uses pixel dimensions, so a non-square SAR changes the card image's display aspect by that ratio (0.02% for 5120:5121). A raw whose leading frames are an intro at another rate gives the card the intro's frame timing. The composed file keeps any variable-rate flag the raw had. The real bridge covers this installation's 25 fps hard-cut outro path; other rates, audio layouts, silence and late starts are covered by synthetic raw files through the real composer. Ownership checks remain static.
- Proposed durable corrections: document the internal `compose_opening_card` task, the card steps of `check-saved-revision.mjs` and the served-file legacy duration in `docs/local-setup.md` (inventory-hashed; not edited here). Status's "16 workflow entries match" line may need reconciling. The lead reconciles both.

## Handoff

- Checkpoint or actual handoff: handed off, 2026-09-15 (UTC), this Worker session. Implementation writes stopped at this report.
- Current implementation owner: returns to the coordinating Project Lead for fresh independent review of design and implementation; not self-accepted.
- Current snapshot: HEAD `fed8ed1` plus `_local/project/evidence/writing-studio/1b-2b-1/snapshot/` (manifest `32ca283f...`, tracked patch `4340dca4...`, slice patch `8b884ae8...`).
- Unfinished work and unresolved findings: none in this slice. WS-03/04/05 and legacy WS-06/09 remain open. Production adapters, migration, UI, Cleanup eligibility and later slices were not started.
- Last failed approach: build run 1 (my concurrent build and test edit, plus the missing task-type union member), corrected by build run 2; composer time base attempts 1 to 3 in `plan.md`.
- Next action and owner: the coordinating lead arranges fresh independent review of this snapshot against lead-13 and inventory 4.1.0-local-1, then disposes B2B1-1..5. Two unsuccessful rounds on the same issue require reassessment, not an automatic repair loop. No commit, push, release or production adoption was made or is authorized here.
- Pending Isaac decision: none.
- Durable decisions: none (no ADR).
- Transfer: evidence, snapshot and fixtures are ignored `_local` files and must be transferred explicitly for review elsewhere. Disposable fixtures left in place: `_local/clipperz/tmp/saved-revision-2kPI4J`, `exact-render-Yfr0yD`, the `demo-old-replay-*` history copy, test-runner fixtures and OS temp directories.
