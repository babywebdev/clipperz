---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2b-2-repair-4"
spec_revision: "lead-22"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2-repair-4/snapshot/manifest.json"
author: "worker"
date: "2026-09-22"
state: "active"
summary: "Lead-22 producer-derived reader repair implemented. Unchanged conformance runner: 58 pass, 0 fail, 8 self-checks, coverage complete, exit 0. Focused, full Node, build, types and HTTP check pass. Review pending."
read_when: "Reviewing lead-22 reader repair-4, WS-16 closure evidence, or the four existing test fixtures made producer-coherent."
evidence: "_local/project/evidence/writing-studio/1b-2b-2-repair-4/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Implementation Report: writing-studio / 1b-2b-2-repair-4

Size exception: lead-22 requires four relationship repairs with their producer
sources, before/after conformance accounting, four existing-fixture corrections
that a reviewer must be able to judge, and retained-evidence justification.
These do not fit in 1,200 words without dropping required findings. Full output
is filed. Paths below are relative to the evidence root unless they start with
`src/` or `docs/`.

## Identity and freshness

- Implementation author: Worker, Claude Code desktop session (Claude Opus 5.5),
  on Isaac's manual lead-22 relay. No agents; README records
  `Verification delegation: disabled`. Every check ran in this session.
- Spec: `spec.md` lead-22 (SHA-256 `3871e1f9…`): Status, baseline, 1B.2b.2
  requirements, constraints, exceptions, B2B2 map, "Producer-derived reader
  repair (lead-22)". Also read: `1b-2b-2-repair-4-plan-review.md` and its
  disposition, and contract-proof repair-2 worker and review reports with their
  disposition, plus the runner's T/H/B/S case bodies.
- Pre-edit binding: `baseline-pre.json` (exit 0). HEAD `fed8ed1`. Repair-3
  manifest `6b7807c1…` matched on all 120 inputs except the four known
  lead-document rows. All 51 lead-22 plan rows, the dist modules, 22 of 22
  inventory rows, runner `4ee3ae7d…`, oracle `0a03ba7a…` and all 20 accepted
  conformance evidence files match. The capture log was checked by its 644-byte
  prefix. There was no relevant drift, so the accepted contract-proof repair-2
  run is kept as the pre-edit failing reproduction: 43 pass, 15 fail, exit 1.
  It was not rerun.
- Final snapshot: `snapshot/manifest.json` SHA-256 `af85e7ce…`. It holds the
  tracked patch `838b1529…` (same path set as repair-3; the hash differs only
  through lead-owned document changes), 43 untracked copies, 46 contract inputs
  including dist and the verifier, and 15 workflow files. It was captured after
  the build and before the final checks. `--check` showed no drift both before
  and after the checks (`snapshot-check-*.log`). Evidence is kept outside the
  snapshot.
- Environment (`runtime-versions.log`): Windows 11; the configured Node
  v24.15.0, Python 3.14.3 and FFmpeg/ffprobe 8.1.1. Fixtures used isolated
  temporary storage and synthetic media. Free ports were 53771 and 53779. Studio
  3847 and the user Library were never touched.
- Plan freshness: there was no drift, as the pre-edit binding above shows, so
  the settled design was followed. `plan.md` records the final check order. It
  was written after the implementation edits and before any final check. Its
  check list comes from the relay and the lead-22 Verification paragraph.
- Resume comparison: Status (lead-22) agrees with the contract-proof repair-2
  Handoff, the plan-review disposition and the actual tree. There was no active
  writer before this relay.
- Implementation: implemented. Verification: pass. Submitted for review: yes.
  Fresh independent application review and lead disposition are required.

## What changed and why

The pure module is `src/services/clip-editor-read-contract.ts`. It still
imports only the models and `path`, and its purity test passes.

1. **Transcript (B2B2-1).** New `checkTranscript` re-derives the producer's
   projection from `doc.source_words` and `recipe.keep_segments`. It uses
   deliberate duplicates of `exact_render.words_in_intervals`,
   `map_words_to_content` and `content_text` (Python strip whitespace), plus the
   save service's `canonical` word identity.
   - `words.source_count` must equal the stored list's length.
   - `words.source` must equal the touching subset, unmodified and in supplied
     order.
   - Content words must match one to one: same count, identity and metadata,
     with timing within `RECEIPT_ROUNDING`.
   - `content_text` must be the text of the content words.
   - An unavailable transcript must retain a null source and count.

   It runs inside document validation, so every stored word is checked before
   the service caps what it serves at 20,000. Nothing is sorted or filtered, and
   caption filler cleaning is not applied.
2. **Historical raw media (B2B2-1/3).** When there is no `final_composition`:
   - `probe.duration` must be within `max(0.05, composition_seconds)` of
     `output_duration`.
   - `render_timeline.output.file_size_bytes` must equal `files.main.bytes`.

   When a composition is present, the receipt's bytes must equal
   `raw_render.file.bytes`. That is the same writer relationship
   (`clip-revisions.ts:1473`) applied to the raw record, never to the
   card-inclusive file. The receipt bytes must be a count. The original HEAD
   writer already refused a null probe duration and mismatched sizes, so every
   admitted document satisfies these checks. The four genuine historical
   documents were inspected read-only and comply.
3. **Bookends (B2B2-1).**
   - The document and receipt copies must agree on presence and on `kind`,
     region, asset, fade, overlap, branch, `measured_output_duration`,
     `transition` start and end, and `join_inputs` main and appended. Unknown
     fields are ignored.
   - `transition` is now required in the shape check. The HEAD writer always
     required it.
   - Transition equations follow the writer and `bookend_region`. For the intro,
     the transition runs from region end to asset end. For the outro, it starts
     at the region start, one overlap before the content end, the region runs
     for its asset, and the end is within the join allowance of offset plus
     measured content.
   - The measurement of the last performed join (the outro, otherwise the
     intro) must be within the join allowance (`composition + av_sync`) of
     `output_duration`. An intro followed by an outro is intermediate. Absent or
     null measurements stay valid.
4. **Serving (B2B2-3).** `EditorRecordInput` gains a required
   `servedFile: ServedFileFact | null`.
   - The service (`resolveServedFile` in `clip-editor-context.ts`) resolves the
     entry summary with callback `fs.realpath`, the same JS resolver as the
     route's `realpathSync`, and keeps the result only if `stat().isFile()`.
   - The pure module judges the extension of that resolved file, and only for
     the same path it classifies.
   - An unresolvable path, or one that is not a regular file, keeps the
     recorded-name judgment. The route refuses those first and `media.output`
     reports missing or not_a_file, so the existing dangling-link and directory
     behaviour is unchanged.
   - Owned-document lstat chains, summary classes, text access and redaction
     are untouched.

## Execution Receipt

| Acceptance ID or check | Exact command/steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| AC-12 pre-edit binding | `node <ev>/baseline-check.mjs "$PWD" pre`; zero relevant drift | **0**; 0 problems, 4 known lead-doc rows | `baseline-pre.json/.log` | pre-edit tree | self |
| B2B2-1,3 pre-edit failure (retained) | accepted contract-proof repair-2 bound run | Retained **1**: 43 pass / 15 fail (T-X1..6, H-X1/2/4, B-X1/2/3/6, S-X1/2) | `../1b-2b-2-contract-proof-repair-2/check-run1.log` | repair-3 + `4ee3ae7d…` | self (prior Worker session) |
| B2B2-1,3 new regressions on the old reader | new describe block run once with the repair-3 reader sources swapped in, then restored; expect refusal/serving cases to fail | **1**: 25 failed (every refusal and both link cases), 10 neighbours passed; restored hashes `OK` | `before-demo/` | repair-3 sources | self |
| B2B2-5 build | `node scripts/installation/run.mjs npm build run build` | **0**; only the two reader dist modules changed (`baseline-post-build.log`) | `build-run1.log` | `af85e7ce…` | self |
| B2B2-5 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json` | **0** | `client-types-run1.log` | `af85e7ce…` | self |
| B2B2-1..4 focused | `node scripts/verification/run-tests.mjs node src/services/clip-editor-context.test.ts src/services/clip-editor-read-contract.test.ts src/ui/editor-context-route.test.ts` | **0**; 3 files, 228 passed (186 before) | `node-focused-run1.log` | `af85e7ce…` | self |
| B2B2-5 full Node | `node scripts/verification/run-tests.mjs node` | **0**; 43 files, 733 passed (691 before) | `node-full-run1.log` | `af85e7ce…` | self |
| B2B2-1..5 conformance | `node scripts/verification/check-editor-read-contract.mjs --out <ev>/conformance`; unchanged runner; all supported cases pass | **0**: 58 pass, 0 fail, 0 harness; self-checks 8/8; coverage 253/253, 230/230, 15/15; `Application verification: pass` | `conformance/check-run1.log`, `…-result.json`, `bound-run-identity.txt` | `af85e7ce…`, dist `86937edd…`/`e1217382…` | self |
| B2B2-1..5 case preservation | compare case statuses with accepted run | 66 of 66 IDs present; exactly the 15 supported failures became pass; the other 51 are unchanged | `conformance/comparison-with-accepted-run.log` | as above | self |
| B2B2-3/4/5 HTTP, restart, bytes | `node scripts/verification/check-editor-context.mjs` | **0**, `Passed`, 20 step groups, including restart and "stored bytes are untouched" | `check-editor-context-run1.log`, `…-result.json` | `af85e7ce…` | self |
| AC-12 post binding | `snapshot-capture.mjs --check`; `baseline-check.mjs post`; `write-boundary-check.mjs` | **0** / **0** / **0**: no drift; only the write area and its 2 dist modules changed, verifier unchanged, 0 problems | `snapshot-check-post-checks.log`, `baseline-post.*`, `write-boundary.*` | `af85e7ce…` | self |
| B2B2-5 Python, bridges, parity (retained) | 1B.2b.1/repair-3 rows | Retained: 991 passed / 6 skipped; bridges and parity `Passed`. No Python, renderer, save-service, dependency or oracle input changed (`baseline-post.json`) | `../1b-2b-1/python-*.log`, `../1b-2b-1/check-exact-render-run1.log`, `../1b-2b-1-repair-1/check-saved-revision-run1.log` | predecessor snapshots | self (prior Worker sessions) |

- Runtime coverage: real studio process over real HTTP, by-ID routes against
  file symlinks, a restart on a second free port, and real saves through the
  accepted producers.
- Not applicable: browser walkthrough (no UI) and live AI.
- Not run: Python suites, bridges and parity. They are retained as justified
  above.
- Changed inputs after checks: none (post snapshot check). Afterwards only this
  report and post-check evidence were written.

## Change inventory

Derived from Git (`write-boundary.json`). All five files are untracked:

- `src/services/clip-editor-read-contract.ts`: all four relationships above,
  plus the `ServedFileFact` input.
- `src/services/clip-editor-context.ts`: `resolveServedFile`, passed into the
  aggregate.
- `src/services/clip-editor-context.test.ts`: 35 new tests in "producer-derived
  relationships (lead-22)", 1 new pre-composition refusal, and four existing
  fixtures corrected (see below).
- `src/services/clip-editor-read-contract.test.ts`: the helper passes
  `servedFile`; 5 new serving-fact cases.
- `src/ui/editor-context-route.test.ts`: 1 HTTP-adapter regression for a
  `.mp4` link to `.avi`; 2 hand-built fixtures completed.

The dist changes are the two reader modules, which are ignored build output.
Nothing else was written: no verifier, oracle, models, routes, save service,
Python, dependencies, UI, lead records or prior evidence.

## Deviations and decision requests

- **Existing fixtures made producer-coherent (reviewer please judge).** No
  assertion was weakened, and each fixture now describes a state the accepted
  writer produces.
  - Two tests deleted `join_inputs` from only the document copy. A genuine
    older save lacked them in both copies, because one object is written twice.
    Both copies are now removed, matching runner case B-C6.
  - "Overlapping words" replaced the content words with arbitrary words. It is
    now a real save of overlapping source words over reversed intervals, and
    asserts the served words equal the receipt's.
  - "Pre-composition no-card" removed the composition from a card save but kept
    the card file as the served file. That is H-class incoherent. It is now the
    genuine profile: the raw file is the document's served file, its probe, its
    group, its pointer and its summary. The old mutation is kept as a new
    refusal test.
  - The route fixtures lacked the receipt's `file_size_bytes`, and their words
    dropped the source word's `confidence`.
- `plan.md` was written after the edits, not before implementation. The check
  set is the one the assignment specified, and none was chosen after seeing a
  result.
- No decision request.

## Limitations and findings

- **WS-16:** all 15 supported occurrences now pass on the unchanged oracle.
  Proposed for closure only after fresh independent review. No new defect
  class.
- **Stale public doc comment, out of write area:**
  `src/models/clip-editor-context.ts:180` says `served_kind` is "Judged from
  the recorded path alone; no link is resolved". It is now judged from the
  resolved regular file when one exists. The schema is unchanged. Proposed as a
  lead-scoped comment correction.
- The runner writes `spec_revision: "lead-21"` into its result because the
  string is hard-coded in the frozen runner. The run itself is bound by the
  hashes above.
- The first write-boundary run (`write-boundary-run1.*`) flagged the repair-3
  report. That was my helper's error: repair-3 excluded its own report from its
  manifest. The helper now classifies such paths and records the modification
  time (2026-09-21, before this session). No earlier record carries that
  report's hash, so its preservation rests on mtime and on this session never
  writing it.
- Limits kept from before: the checks compare stored records, not live bytes;
  the samples are bounded historical ones; crossfade breadth is limited. For a
  path that does not resolve, the served kind falls back to the recorded name.
  That is deliberate, and it has no effect on capabilities because the file is
  reported missing.
- Proposed durable corrections: none beyond the comment above.

## Handoff

- Actual handoff: 2026-09-22, this Worker session. All writes stop at this
  report.
- Implementation owner: returns to the coordinating lead. Not self-accepted.
- Snapshot: HEAD `fed8ed1` plus `snapshot/manifest.json` `af85e7ce…`; runner
  `4ee3ae7d…` and oracle `0a03ba7a…` unchanged.
- Unfinished: the stale model comment (lead scope). Legacy WS-03/04/05/06/09
  are untouched.
- Last failed approach: none in this cycle. All four relationships passed on
  the first final run.
- Next action: the lead arranges fresh independent application review of this
  snapshot, including the fixture corrections, then gives its disposition.
- Pending Isaac decision: none. Durable decisions: none.
- Transfer: the ignored evidence root, `_local/clipperz/tmp/editor-read-contract-nvQ3QD`
  and `editor-context-Punkbh` fixtures need explicit transfer for review
  elsewhere.
