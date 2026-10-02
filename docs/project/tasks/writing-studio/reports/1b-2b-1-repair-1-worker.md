---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2b-1-repair-1"
spec_revision: "lead-14"
snapshot: "_local/project/evidence/writing-studio/1b-2b-1-repair-1/snapshot/manifest.json"
author: "worker"
date: "2026-09-15"
state: "active"
summary: "R1/WS-16 composition receipt repaired: complete v1 schema parsed, every retained claim compared with captured inputs, probes and derived timing; 176 producer-backed refusals, controls, full Node, build, types and bridge pass; handed back."
read_when: "Reviewing 1B.2b.1 repair-1 evidence for R1/WS-16, disposing B2B1-2..5, or checking composition receipt validation and retained evidence."
evidence: "_local/project/evidence/writing-studio/1b-2b-1-repair-1/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---

# Implementation Report: writing-studio / 1b-2b-1-repair-1

Size exception: a receipt row per required and retained check, the before/after reproduction and the delegated validation choices exceed the 1,200-word soft cap. The field-by-field inventory lives in evidence, not here. Evidence paths are relative to `_local/project/evidence/writing-studio/1b-2b-1-repair-1/`; times are UTC.

## Identity and freshness

- Implementation author: Worker, Claude Code desktop session (Claude Opus 5), on Isaac's manual relay of lead-14 repair-1. No agent dispatch; verification delegation disabled; every check below ran in this session.
- Spec: `docs/project/tasks/writing-studio/spec.md` lead-14, section "1B.2b.1 repair-1", acceptance B2B1-2..5 (B2B1-1 preserved), constraints, baseline, exceptions; `reports/1b-2b-1-review.md` R1 and lead disposition; `reports/1b-2b-1-worker.md` receipt and Handoff.
- Code snapshot: HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13` (tree `b0d7d5c8e62c440fca5d1e4b6dfaa65ebd179f2c`) plus `snapshot/manifest.json` (SHA-256 `6daecc8b8e8258c57335440863535ea2a3681817bc62741e158d320001a4fe39`: 27 file entries, 39 local evidence including the unrepaired 1B.2b.1 manifest, patches and the six reviewer files, 22 contract inputs, 16 workflow files). Tracked patch `snapshot/1b-2b-1-repair-1-tracked.patch` SHA-256 `52ae6d10c1f3bbc694195e5fd428546f6d931562fda66fd211e0bd5229a9ab5f` (198,557 bytes; also carries accepted uncommitted work and lead records). Repair patch against pre-edit copies `1b-2b-1-repair-1.patch` SHA-256 `69d70d1ec624d813541ec1d50c657356206e0f3dab51be01a60860166f11374f`. Untracked inputs copied under `snapshot/untracked/`. Base: unrepaired `1b-2b-1/snapshot/manifest.json` `32ca283f...`.
- Environment: Windows 11; configured Node v24.15.0, CPython 3.14.3, FFmpeg/ffprobe 8.1.1 gyan full build (`runtime-versions.log`); `dist/` rebuilt by build run 1. Synthetic media and isolated storage only; no AI call, network or user Library.
- Plan freshness (`plan.md`, before any application edit): the 1B.2b.1 snapshot `--check` (read-only) exit 1 with 6 drift lines, all lead bookkeeping (`spec.md`, `spec-log.md`, `findings-ledger.md`, each in two groups) plus the new review report; all 57 evidence, 22 contract and every application entry match. Instruction inventory 22 of 22. No relevant drift.
- Resume before lead reconciliation: Status (lead-14) agrees with the review disposition and the unrepaired snapshot: changes requested on R1, Worker next. Its "25 files, 57 evidence, 22 contract and 16 workflow entries matched before this bookkeeping" is consistent with the drift above. No discrepancy; nothing lead-owned edited.
- Implementation: implemented
- Verification: pass
- Submitted for review: yes; acceptance belongs to the coordinating lead after fresh independent follow-up.

## Design as implemented

- Root cause: `validateComposition` checked selected claims, then persisted `value as OpeningCardReceipt`. Unchecked before this repair: raw/output container `duration`, video `frame_rate/start/duration`, all audio summary values, `card.frame_duration/output_start/output_end/audio_note`, time-domain content, three tolerance numbers and any extra field (`field-inventory.md`).
- `parseOpeningCardReceipt` (new, `src/services/clip-revisions.ts`): exact key sets at all nine object levels (missing required and unsupported fields refused), literals, finite numbers with ranges, safe integers, lowercase SHA-256, positive ratios, declared nullability, time-domain map equal to the Python v1 map (`OPENING_CARD_TIME_DOMAINS`, verbatim). It returns a new object built from checked values; the revision retains that copy.
- Relations, after the unchanged file and packet checks (existing order and messages kept): every stream summary field and both container durations equal the service's own ffprobe of the same file; card frames, ticks and audio samples equal its measurement; `frame_duration`, `measured_duration`, `output_end`, `tolerance.card_seconds` and `tolerance.audio_seconds` equal its tick/sample arithmetic within `DERIVED_SECONDS` (1e-9 s, representation only); `audio_note` null exactly when the raw has audio; container and stream probes must also agree on duration. Timing tolerances, publication, ownership, replay and old-document paths are unchanged.

## Execution Receipt

Snapshot "final" = HEAD fed8ed1 plus `snapshot/manifest.json`. No application input changed after build run 1.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| B2B1-2 before (R1) | `node scripts/installation/run.mjs node card-review-repro node_modules/tsx/dist/cli.mjs _local/project/evidence/writing-studio/1b-2b-1/review/receipt-repro.mts`; expect R1 reproduced | 0: all three trials `committed`; saved raw audio claim 1 Hz x99 beside actual 44,100 Hz mono; duration/timing fields absent | `pre-edit/receipt-repro-before.log` | pre-edit (unrepaired) | self |
| B2B1-5 build | `node scripts/installation/run.mjs npm build run build`; expect 0 | 0 (tsc includes test files) | `build-run1.log` | final | self |
| B2B1-2,3,4 focused | `node scripts/verification/run-tests.mjs node src/services/clip-revisions.test.ts src/services/clip-revisions.process.test.ts src/services/clip-revisions.join-matrix.test.ts src/services/clip-revisions.card.test.ts`; expect 0 | 0: 4 files, 56 passed (29 composition fault cases, old documents, process kills, Cleanup) | `node-focused-run1.log` | final | self |
| B2B1-2 producer matrix | `node scripts/verification/run-tests.mjs node src/services/clip-revisions.card-producer.test.ts`; expect 0 | 0: 183 passed: 5 existing decoded real-composer tests; real and replayed controls (audio, silent) commit and retain the receipt field for field; coverage test (declared schema equals both real receipts' field sets; each field omitted and contradicted); 176 refusals (74 omissions, 74 contradictions incl. 5 no-audio nullability, 28 malformed/unsupported/review-verbatim), each with pointer kept, both groups as residuals, no document | `node-card-producer-run1.log` | final | self |
| B2B1-5 full Node | `node scripts/verification/run-tests.mjs node`; expect 0 | 0: 40 files, 505 passed (1B.2b.1: 327) | `node-full-run1.log` | final | self |
| B2B1-5 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json`; expect 0 | 0 | `client-types-run1.log` | final | self |
| B2B1-1..4 bridge | `node --check scripts/verification/check-saved-revision.mjs && node scripts/verification/check-saved-revision.mjs`; expect 0 `Passed` | 0 `Passed`, 22 step groups: real card revision 38 frames of 0.04 s, 1.52 s, served 4.655011 s, audio lag 0 samples, card peak 0, replay without image, change/removal, logo, image refusal, frame-count refusal; new step refuses real receipts: `composition raw.audio.sample_rate is 1; expected 44100` and `composition raw.duration is required`, both groups named, pointers unchanged; Cleanup offers nothing under exports | `check-saved-revision-run1.log`, `check-saved-revision-run1-result.json` (fixture `saved-revision-LT5RXX`) | final | self |
| B2B1-2 after (R1, unchanged) | same command as the before row; the review's expectation "all three commit" is now obsolete | 0: control `committed`; "contradictory audio probes" `failed`: `composition raw.audio.channel_layout is required`; "missing duration and timing fields" `failed`: `composition raw.duration is required`. The script has no assertions; it prints saved facts only for the committed control | `receipt-repro-after-run1.log` | final | self |
| B2B1-2,3 corrected demonstration | `node scripts/installation/run.mjs node card-receipt-demo node_modules/tsx/dist/cli.mjs _local/project/evidence/writing-studio/1b-2b-1-repair-1/receipt-demo.mts`; expect 0 with asserted outcomes | 0 `DEMO PASSED: 16 trials`, 16 real compositions: both controls commit; review mutations verbatim; coherent audio, output-only audio, output duration missing/contradicted, card end, frame duration, audio tolerance, time domains, unsupported field, and three no-audio cases each fail before commit | `receipt-demo.mts`, `receipt-demo-run1.log` | final | self |
| B2B1-4,5 retained-evidence inputs | `node _local/project/evidence/writing-studio/1b-2b-1-repair-1/retained-inputs-check.mjs`; expect 0 unexpected | run 1 exit 1: my records list omitted the prior Worker report, which its own snapshot excluded; run 2 after adding it: 0, HEAD same, 22 contract inputs unchanged, only 5 repair paths and 3 lead records differ, Python/exact-bridge/parity covered paths equal the 1B.2b.1 manifest, no production importer | `retained-inputs-check-run1.log`, `-run2.log` | final | self |
| B2B1-2,3,5 Python (retained, not rerun) | 1B.2b.1 `py_compile`, `-k opening_card`, `-k "opening_card or exact_render"`, full Python | Retained: 14 passed/32 subtests; 91/155; 991 passed, 6 skipped, 313 subtests. No Python, test or lock input changed (run 2); Python does not import TypeScript | `../1b-2b-1/python-*.log`, `../1b-2b-1/py-compile-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| B2B1-2,4 exact bridge (retained) | `node scripts/verification/check-exact-render.mjs` | Retained: 0 `Passed`. It loads only `dist/services/python-executor.js` (unchanged source) and the renderer | `../1b-2b-1/check-exact-render-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| B2B1-4,5 parity (retained) | `node scripts/verification/check-preview-render.mjs` | Retained: 0 `Passed`. No web-server or route module imports the revision service or its models | `../1b-2b-1/check-preview-render-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| B2B1-4 write area, reviewer files | status, pre-edit copy hashes, `sha256sum -c pre-edit/reviewer-files.sha256` | Only the 5 planned files changed; backend, tests, config, packages untouched; 6 of 6 reviewer files OK | `write-area-audit-run1.log` | final | self |
| AC-12 instructions | inventory 4.1.0-local-1 hashes before edits and after the last check | 22 of 22 both times | `pre-edit/instruction-inventory-check.log`, `instruction-inventory-check-final.log` | final | self |
| AC-12 snapshot | `node _local/project/evidence/writing-studio/1b-2b-1-repair-1/snapshot-capture.mjs`, then `--check`; expect 0 drift | capture 0: nothing unaccounted, no missing evidence, reviewer files unchanged; `--check` 0: 0 drift, no status line outside the snapshot. Output went to the session scratchpad and was copied in, so neither log is hashed | `snapshot/`, `snapshot-capture.log`, `snapshot-check.log` | final | self |

- Executor identities and target: `self` is this Worker session on the configured local runtime with disposable fixtures; retained rows name the 1B.2b.1 Worker session.
- Runtime coverage: success paths (audio and silent real receipts) and refusals at the producer/consumer boundary; no browser or route involved.
- Human assistance: none.
- Not applicable: browser/Studio walkthrough (no UI or route); live AI (no AI call).
- Not run: Python suites, exact bridge and parity, retained with covered-input hashes and dependency justification above.
- Changed inputs after checks: none. After the last check only the inventory log, snapshot, its logs and this report were written.

## Change inventory

Git-derived against HEAD and pre-edit copies (`write-area-audit-run1.log`, `snapshot/manifest.json`):

- `src/services/clip-revisions.ts`: receipt parser, relation checks, retained checked copy, container/stream duration agreement, doc comments.
- `src/models/clip-revisions.ts`: `OPENING_CARD_TIME_DOMAINS`.
- `src/services/clip-revisions.test-support.ts`: fake composer emits the v1 map.
- `src/services/clip-revisions.card-producer.test.ts` (untracked since 1B.2b.1): raw template option, replay composer, receipt matrix, coverage test.
- `scripts/verification/check-saved-revision.mjs`: real-receipt refusal step.
- Unchanged: Python producer/renderer, `backend/main.py`, Python tests, history, Cleanup, routes, packages, lead/reviewer records, reviewer files.

## Deviations and decision requests

No decision request; no producer-contract contradiction found, so Python is unchanged. Delegated choices for review:

- Unsupported fields are refused at every level, so a future producer field needs a receipt version change.
- Probe-copied facts compare exactly: both sides parse the same ffprobe fields, and the configured runtime puts the pinned ffprobe on the Python PATH and in `FFPROBE_PATH`.
- Prose (`audio_note`, `tolerance.basis`) is checked for type, non-emptiness and audio nullability only; time-domain descriptions compare whole as the declared v1 contract, like the raw receipt's map.
- The matrix replays one real composition per profile: each case uses a byte-identical raw copy (the replay refuses otherwise) and moves only `raw.path`, `output.path` and `card.image_path`. Real-composer controls, the 16-composition demonstration and the bridge corroborate it without replay.

## Limitations and findings

- Defects: R1, a WS-16 occurrence at the composition boundary, is repaired; the lead reopened it. Proposed prevention destination: the producer-backed matrix plus the coverage test tying the declared schema to real receipts. Closure awaits fresh follow-up. Found and fixed: my retained-inputs script's records list (evidence tooling, run 1).
- Uncertainty: exact equality assumes one ffprobe build. A `PODCLI_FFPROBE` override pointing elsewhere could refuse valid receipts; that failure is safe, with no bad commit. Receipt facts remain producer-recorded and are checked against service probes; no new attestation. Sample-exact audio offset is still proven by decoding in tests and the bridge, not per save. Static ownership limits are unchanged.
- Proposed durable corrections: `docs/local-setup.md` could mention the bridge's receipt refusals (inventory-hashed; not edited). The lead reconciles.

## Handoff

- Checkpoint or actual handoff: handed off, 2026-09-15 (UTC), this Worker session. Implementation writes stopped at this report.
- Current implementation owner: returns to the coordinating Project Lead for fresh independent follow-up; not self-accepted.
- Current snapshot: HEAD `fed8ed1` plus `snapshot/manifest.json` (`6daecc8b...`), tracked patch `52ae6d10...`, repair patch `69d70d1e...`.
- Unfinished work and unresolved findings: none in repair scope. Composition WS-16 awaits independent follow-up; WS-03/04/05 and legacy WS-06/09 remain open. No adapters, UI, Cleanup or successor work started.
- Last failed approach: retained-inputs check run 1 (script classification), corrected in run 2. The product failure was lead-13's selected-field validation (R1).
- Next action and owner: the coordinating lead arranges fresh independent follow-up of this snapshot against lead-14 and inventory 4.1.0-local-1, then disposes B2B1-2..5. This is repair round one for this occurrence; prior recurrence history and the two-unsuccessful-round reassessment remain. No commit, push, release or automatic repair loop.
- Pending Isaac decision: none.
- Durable decisions: none (no ADR).
- Transfer: evidence, snapshot and fixtures are ignored `_local` files that need explicit transfer. Disposable fixtures left in place: `_local/clipperz/tmp/saved-revision-LT5RXX`, test-runner and demonstration temporary directories.
