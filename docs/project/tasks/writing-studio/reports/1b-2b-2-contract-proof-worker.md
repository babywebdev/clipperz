---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2b-2-contract-proof"
spec_revision: "lead-19"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2-repair-3/snapshot/manifest.json"
author: "worker"
date: "2026-09-22"
state: "active"
summary: "Executable read contract built and run against the frozen reader: 35 cases pass, 14 fail. Transcript, historical probe, repeated bookend and resolved-file claims are unsupported. Application verification fails; no application code changed."
read_when: "Reviewing the lead-19 contract proof, its producer-derived expectations, coverage ledgers or the open reader conformance failures before scoping further repair."
evidence: "_local/project/evidence/writing-studio/1b-2b-2-contract-proof/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Implementation Report: writing-studio / 1b-2b-2-contract-proof

Size exception: lead-19 requires executable expectations for five claim families,
their oracles named, mapped coverage for every consumed claim, concrete
counterexamples and preserved failed runs. Fourteen distinct conformance failures,
two coverage ledgers and four preserved runs do not compress into 1,200 words
without dropping required findings. Full output is in evidence, not here. Evidence
paths are relative to `_local/project/evidence/writing-studio/1b-2b-2-contract-proof/`.

## Identity and freshness

- Implementation author: Worker, Claude Code desktop session (Claude Opus 5), on
  Isaac's manual relay of lead-19. No agent dispatch; README records
  `Verification delegation: disabled`, so every check below ran in this session.
- Spec: `docs/project/tasks/writing-studio/spec.md` **lead-19**, section
  "Verification-only reader contract proof (lead-19)" with its settled expectation
  sources and assignment boundaries, acceptance **B2B2-1..5**, plus "Current
  baseline and assumptions", "Current technical constraints" and "Approved
  exceptions currently in force". Followed its references: the repair-3 Worker
  report, `reports/1b-2b-2-repair-3-review.md` and the coordinating disposition in
  that review, and the lead-18 direction the repair was bound to.
- **Application snapshot (frozen, unchanged).** HEAD
  `fed8ed13dcb2aade06bee341953d6b10d58bff13`; repair-3 manifest
  `6b7807c1411dbf1005309d7c2dde3add7530b5a48d0f0c116bfeb86536018c84`.
  `baseline-pre.json` and `baseline-post.json` hash all **120** recorded
  application, contract and untracked inputs plus the five compiled modules before
  the first run and after the last: **zero application drift** in both. The only
  differing paths are the three lead-owned documents lead-19 itself records
  (`spec.md`, `spec-log.md`, `findings-ledger.md`); their content hashes are
  **identical before and after** this assignment, so nothing here touched them.
  Instruction inventory `4.1.0-local-2`: 22 of 22 rows unchanged, both times.
- **Verification-artifact snapshot (new, separate).** `artifact-snapshot.json`:
  `scripts/verification/check-editor-read-contract.mjs`
  `eca26d92d92ae0cbff42494e095dfc0ab86bca61d17cb92f61c8c3e5d611e616` and
  `scripts/verification/fixtures/editor-read-contract/producer-oracle.py`
  `0a03ba7a79a06042d549c606aeccb2c0de0237870d23e5c84cf9ca67817016dc`, plus all 21
  evidence files. The bound run's own result file records the same two hashes, so
  the reported results belong to exactly these artifacts.
- **No rebuild.** `dist/` already matched repair-3's `dist-before-rebuild.sha256`
  byte for byte, so the studio under test is the reviewed build and nothing was
  compiled here.
- Environment: Windows 11; configured local runtime Node **v24.15.0**, CPython
  **3.14.3**, FFmpeg/ffprobe **8.1.1-full_build-www.gyan.dev**
  (`runtime-versions.log`). Isolated `mkdtemp` home/data/exports/tmp, synthetic
  media only, no AI call, no network, no user Library. Isaac's Studio
  `127.0.0.1:3847` was never started, stopped or contacted; the runner asserts each
  discovered port is neither `3847` nor `PODCLI_PORT` (bound run: 57899, 57915).
- Plan freshness: `plan.md` was written before any fixture existed and records the
  oracles, the fixture plan and every case with its expected outcome and acceptance
  ID. Zero relevant drift: HEAD unchanged, application inputs unchanged, inventory
  unchanged. No settled design or approval boundary moved, so nothing paused and no
  decision request is raised.
- Resume before lead reconciliation: Status (lead-19) agrees with the actual tree
  and with the repair-3 report's Handoff and its review. Its "last failed approach"
  — an aggregate boundary that omits producer relationships, and a recorded-path
  file kind that differs from the serving route's resolved-path check — is exactly
  what the cases below make executable. Nothing lead-owned was edited. WS-12/17 and
  R2c stay closed; WS-03/04/05 and legacy WS-06/09 remain open and are not touched.
- Implementation: **implemented** (the verification artifacts lead-19 authorises).
- Verification: **fail** — this is failed *application* conformance, not a harness
  problem. The runner exits 1. Zero harness errors in the bound run.
- Submitted for review: yes. Acceptance belongs to the coordinating lead after
  fresh independent review of the expectations, coverage and evidence.

## What was built, and where each expectation comes from

`scripts/verification/check-editor-read-contract.mjs` states what
`GET /api/clips/:id/editor-context` **must** answer and reports every case as it
actually lands. It is not a regression suite for current behaviour: each assertion
is the intended outcome, a failing case is a failed application result, and the
process exits non-zero. Nothing in it imports `clip-editor-read-contract.js` or
`clip-editor-context.js` to decide an expected value, and no predicate of theirs is
copied. The four oracles:

- **The real Python producer, out of process.**
  `fixtures/editor-read-contract/producer-oracle.py` imports
  `backend/services/exact_render.py` and nothing else, and returns
  `words_in_intervals`, `map_words_to_content`, `content_text`,
  `content_intervals`, `content_duration` and `bookend_region` for jobs the runner
  supplies. Every transcript expectation and every bookend interval and transition
  equation is that helper's own output.
- **The accepted writer's own documents.** Seven real revisions are committed in the
  fixture through `ClipRevisionService` and the configured bridges; every projected
  identity, recipe, segment, card, artifact, domain and probe is compared field by
  field with the document on disk.
- **Genuine historical records.** The four accepted pre-composition documents named
  in `1b-2b-2-reassessment/historical-profiles.json` are verified against their
  recorded hashes, copied byte for byte into the fixture and read as a real clip.
  Only the sidecar pointer paths in the fixture's own clip list are written; the
  documents are untouched, and `P-C8` re-hashes all four originals at the end.
- **The real serving routes.** Every committed-media claim is compared with what
  `/api/clips/:id/preview` and `/api/clips/:id/download` actually answered for the
  same clip in the same run, in both directions: the response may not claim a
  capability the route refuses, and may not deny one the route honours.

The supplied word list is built so a single genuine save exercises overlap
(`bravo`/`charlie`), a straddled boundary (`delta`, `foxtrot`), a boundary-touch
exclusion (`echo`), an out-of-interval word (`alpha`) and reversed interval order
(`[{4,5},{1,2}]`).

## Execution Receipt

Four runs, all preserved. Runs 1–3 are earlier states of the same runner; **run 4
is the bound run** and its result file records the artifact hashes above. Runs 1
and 2 differ only in how a failure's evidence is formatted; run 3 added two
entry-summary controls; run 4 added the legacy projection ledger. The same 14
application failures reproduce in all four.

| Acceptance ID or check | Exact command/steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| B2B2-1,2,3,4,5 conformance (**bound run**) | `node scripts/verification/check-editor-read-contract.mjs --out <cycle evidence>`; expect every stated requirement to hold | **1**: 49 cases — **35 passed, 14 failed, 0 harness errors**; tracked-response ledger 253/253 leaves compared, 0 gaps; legacy-response ledger 230/230 leaves compared | `check-run4.log`, `check-editor-read-contract-result-run4.json` | frozen | self |
| — same, run 3 | same command | 1: 48 cases, 34 passed, 14 failed, 0 harness | `check-run3.log`, `…-result-run3.json` | frozen | self |
| — same, run 2 | same command | 1: 46 cases, 32 passed, 14 failed, 0 harness | `check-run2.log`, `…-result-run2.json` | frozen | self |
| — same, run 1 (first run, verbose failure evidence) | same command | 1: 46 cases, 32 passed, 14 failed, 0 harness | `check-run1.log` (198 KB), `…-result-run1.json` | frozen | self |
| B2B2-1 transcript controls | `T-C1..T-C5` against the Python producer | 0 failures: served words, count, text, supplied-empty and unavailable all equal the producer's projection | `check-run4.log`, result `cases` | frozen | self |
| B2B2-1 transcript counterexamples | `T-X1..T-X6` | **6 failed**: every contradiction is served as authoritative | `check-run4.log` | frozen | self |
| B2B2-1 historical raw media | `H-C1..H-C3`, `H-X1..H-X4` on two genuine pre-composition documents | **3 failed** (`H-X1`, `H-X2`, `H-X4`); `H-C3` confirms a legitimate in-allowance variation still reads; `H-X3` already refuses | `check-run4.log` | frozen | self |
| B2B2-1 bookends | `B-C1..B-C6`, `B-X1..B-X5` against `exact_render.bookend_region` | **3 failed** (`B-X1`, `B-X2`, `B-X3`); `B-X4`/`B-X5` already refuse; all six recorded joins match the producer region | `check-run4.log` | frozen | self |
| B2B2-3 serving eligibility over real HTTP | `S-C1..S-C7`, `S-X1..S-X3`; each compared with the route's own answer | **2 failed** (`S-X1` over-claim, `S-X2` under-claim); seven controls agree with the routes exactly | `check-run4.log` | frozen | self |
| B2B2-1,2 projection ledgers | `P-C1..P-C6`, `P-C10`; every response leaf compared with an independently derived value | 0 failures: 253/253 tracked leaves and 230/230 legacy leaves compared, no uncompared leaf | `check-run4.log`, result `coverage` | frozen | self |
| B2B2-4 reads change nothing | `P-C7`, `P-C8`: whole-fixture hash before the first request and after every case; genuine historical originals re-hashed | 0 failures: 1,954 files identical, no `revisions` field added to an untracked clip, unknown stored fields intact, all 4 historical originals unchanged | `check-run4.log` | frozen | self |
| B2B2-5 restart | `P-C9`: stop the studio, restart on a second free port, re-read the control | 0 failures: identical response apart from `identity.captured_at`; ports 57899 then 57915, neither 3847 | `check-run4.log` | frozen | self |
| AC-12 application snapshot binding | `node <evidence>/baseline-check.mjs "$PWD" pre` and `… post` | pre and post: **120 inputs checked, 0 application drift**, inventory 22/22; only the three lead documents differ from the manifest, with identical hashes pre and post | `baseline-pre.json/.log`, `baseline-post.json/.log` | frozen | self |
| AC-12 write boundary | `node <evidence>/write-boundary-check.mjs "$PWD"` | **0 problems**: exactly 2 new project files, both inside lead-19's write set; no `src`, `backend`, `tests` or `dist` file references them; vitest include and pytest target unchanged; package manifests unchanged | `write-boundary.json`, `write-boundary.log` | frozen | self |
| AC-12 artifact syntax | `node --check` on the runner and both evidence helpers; `python -m py_compile` on the oracle | all exit 0 | `syntax-check.log` | new artifacts | self |
| B2B2-5 focused reader/contract/route (retained, not rerun) | repair-3 `node scripts/verification/run-tests.mjs node src/services/clip-editor-context.test.ts src/services/clip-editor-read-contract.test.ts src/ui/editor-context-route.test.ts` | Retained: 0, **186 passed**. Covered inputs unchanged (`baseline-post.json`); this assignment adds no `src` file and no default test-glob entry | `../1b-2b-2-repair-3/node-focused-run1.log` | repair-3 snapshot | self (repair-3 Worker session) |
| B2B2-5 full Node (retained) | repair-3 `node scripts/verification/run-tests.mjs node` | Retained: 0, 43 files, **691 passed** | `../1b-2b-2-repair-3/node-full-run1.log` | repair-3 snapshot | self (repair-3 Worker session) |
| B2B2-5 build and client types (retained) | repair-3 `npm run build`; `tsc --noEmit -p src/ui/client/tsconfig.json` | Retained: 0 and 0; `dist/` still matches `dist-before-rebuild.sha256` here, so the retained build is the build under test | `../1b-2b-2-repair-3/build-run1.log`, `client-types-run1.log` | repair-3 snapshot | self (repair-3 Worker session) |
| B2B2-5 existing HTTP check (retained) | repair-3 `node scripts/verification/check-editor-context.mjs` | Retained: 0 `Passed`, 20 step groups | `../1b-2b-2-repair-3/check-editor-context-run1.log` | repair-3 snapshot | self (repair-3 Worker session) |
| B2B2-5 Python, exact bridge, saved-revision bridge, preview parity (retained) | 1B.2b.1 and repair-3 rows | Retained: 991 passed / 6 skipped; both bridges and parity `Passed`. No Python, renderer or dependency input changed; the new oracle is not imported by any application or test file | `../1b-2b-1/python-*.log`, `../1b-2b-1/check-exact-render-run1.log`, `../1b-2b-1-repair-1/check-saved-revision-run1.log`, `../1b-2b-1/check-preview-render-run1.log` | predecessor snapshots | self (predecessor Worker sessions) |

- Executor identities and target: `self` is this Worker session on the configured
  local runtime against disposable fixtures; retained rows name their own sessions
  and snapshots. No subagent, no human assistance.
- Runtime coverage: success and failure paths through the real studio process over
  real HTTP, including the existing by-id preview and download routes driven
  against nine distinct summary and link states, real Windows file symlinks and a
  directory wearing a media extension, a stop/restart on a second free port, and
  whole-fixture byte hashing at three points.
- Not applicable: browser walkthrough (no UI in this slice); live AI smoke test.
- Not run: Python suites, both bridges, preview parity, the full Node suite, the
  build and client types — all retained above by unchanged covered inputs, which
  `baseline-post.json` establishes, plus the write-boundary evidence that neither
  new file is reachable from the application or collected by a default test glob.
- Changed inputs after checks: none. After the bound run only this report and the
  refreshed `artifact-snapshot.json` were written, and the runner's recorded hash
  still equals the file on disk.

## Change inventory

Git-derived (`write-boundary.json`). Exactly two new project files, both untracked
and both inside lead-19's expected write set; no existing file was modified:

- `scripts/verification/check-editor-read-contract.mjs` (**new**): the conformance
  runner — fixtures, the producer-oracle bridge, 49 cases, two projection coverage
  ledgers, byte-preservation and restart proof, and a machine-readable result.
- `scripts/verification/fixtures/editor-read-contract/producer-oracle.py` (**new**):
  the out-of-process producer oracle. (`__pycache__/` beside it is an ignored
  byproduct of the `py_compile` syntax check.)
- Evidence only: `plan.md`, `baseline-check.mjs`, `write-boundary-check.mjs`, four
  run logs, four result files, the baseline and boundary records, the runtime and
  syntax logs and `artifact-snapshot.json`, all under the cycle evidence root.
- Unchanged: all of `src/`, `backend/`, `tests/`, `dist/`, every existing
  verification script and fixture, `package.json`, `package-lock.json`, the vitest
  and pytest configuration, instructions, lead records, prior reports and all
  earlier evidence directories.

## Deviations and decision requests

No decision request. Delegated choices worth review:

- **The historical fixture rewrites pointers, never documents.** A genuine accepted
  document cannot be read from another checkout's path, so the fixture's own clip
  list names the copied sidecar path while `files.main.path` and
  `pointer.output_path` keep the document's recorded media location. The document
  bytes are identical to the recorded profile hash, and the originals are re-hashed
  at the end (`P-C8`). `draft` is set to null with `draft_version` 0, the genuine
  version-zero shape, rather than copying an unrelated draft.
- **Bookend regions are compared within the producer's own 3-decimal rounding**
  (0.0011), not exactly, because the region is re-derived from values the producer
  already rounded. Branch names are compared exactly.
- **What the renderer actually chose is reported, not assumed.** Of six recorded
  joins, four took `hardcut`, one `hardcut_soft_audio` and one `xfade_acrossfade`,
  even where a 0.25 s fade was requested and the clamp would have permitted a
  crossfade. Those are supported fallbacks; the control asserts the producer's
  region for whatever branch was recorded, and `B-C4` separately requires zero
  overlap and a hard-cut branch for the `bookend_fade: 0` save.
- **Corroborating relationships are asserted even when the field is not
  serialised.** `B-X2`, `B-X3` and `H-X4` mutate records the response does not
  quote directly. Lead-18 requires all present records of one join to agree and
  lead-19 requires the historical file identity to hold, so a contradiction there
  is a contract failure even though no single published number is visibly wrong.
  They are reported separately from the claims that are visibly false.
- **`describeValue`'s display convention is restated, not imported**, so the legacy
  conflict comparison does not come from the module under test.
- **Two harness corrections, both preserved.** (1) The producer oracle's project
  root was one directory short, so its first invocation failed with
  `ModuleNotFoundError`; corrected before any case ran. (2) Run 1's failure detail
  embedded whole response bodies, producing a 198 KB log; runs 2–4 record a
  targeted claim extract instead. Neither changed a single expected outcome: the
  same 14 failures reproduce in all four runs.

## Limitations and findings

### Failed application conformance (14 cases, all reproduced in four runs)

**R2a transcript — six failures, all published false claims (B2B2-1).** The
response's editorial transcript is not checked against the producer that made it.

| Case | Single well-typed change | What the response published |
|---|---|---|
| T-X1 | only `render_timeline.words.content_text` | `"Speech that was never supplied"` beside the unchanged words `foxtrot golf bravo charlie delta` |
| T-X2 | retained source words and count emptied | the same five editorial words, with widening correctly `TRANSCRIPT_EMPTY` — the contradiction is the transcript, not the widening |
| T-X3 | one content word's text set to `november`, never supplied | `november golf bravo charlie delta` served as the editorial transcript |
| T-X4 | one content word shifted 0.4 s, still inside the content | served at a position the producer never maps it to |
| T-X5 | retained source words replaced by a word touching no kept interval | served, still advertising widening from 7 source words |
| T-X6 | content words reordered against the producer's interval order | words served in the wrong order while the text keeps the producer's order |

T-X1 and T-X2 are the review's confirmed findings. **T-X3 to T-X6 are new**: the
editorial word list's text, placement, derivability and order are equally
unchecked, so the gap is the whole producer relationship, not two examples.

**R2a historical raw media — three failures (B2B2-1).** On a genuine accepted
pre-composition document whose only change is one field:

- `H-X1`, `H-X2` (the review's finding, now on two different genuine documents):
  `probe.duration` set to 999 is published as `recorded_probe.duration: 999` beside
  `raw_render.output_duration: 1.021`, for a document where the served file *is*
  the raw render. The writer already compares them at save
  (`clip-revisions.ts:1474`, allowance `max(0.05, 0.0632)`); the reader does not.
  `H-C3` confirms the honest version is not over-strict: a duration moved half an
  allowance still reads.
- `H-X4` (**new**, corroborating): `render_timeline.output.file_size_bytes` may
  contradict `files.main.bytes` on a historical document and still read, although
  `probe.bytes` against the same record is already refused (`H-X3` passes).

**R2a bookends — three failures (B2B2-1).** Two records of one join are not
compared, and the transition equation is not checked:

- `B-X1` (the review's finding): `doc.bookends.outro.measured_output_duration` set
  to 999 is published while the receipt copy still holds `3.929002` and the raw
  output is `3.929`.
- `B-X2`, `B-X3` (**corroborating**): the receipt copy's `output_end` moved by 5 s,
  and a `transition` moved 2 s away from what its own asset and overlap can
  produce, both read.
- Already honest: `B-X4` and `B-X5` refuse a join input that is not the previous
  stage's measurement and an asset duration its own join inputs contradict, and
  `B-C5` shows the genuine chain agrees (intro stage 3.134014 → outro join main
  3.134014 → outro stage 3.929002 → raw output 3.929), so the stage measurement is
  correctly *not* required to equal the final output.

**R2b serving eligibility — two failures, both directions (B2B2-3).** The response
judges the served kind from the recorded filename while `serveClipById` resolves
the link first:

- `S-X1` (the review's finding): a legacy summary `nominal.mp4` resolving to a
  regular `actual.avi` → response `served_kind: supported`, play and download
  `true`, reason `AVAILABLE`; both routes answered **400**.
- `S-X2` (**new, the opposite direction**): `nominal.avi` resolving to a regular
  `actual.mp4` → response `served_kind: unsupported`, play and download `false`,
  reason `MEDIA_KIND_UNSUPPORTED`; both routes answered **200**. The reader denies a
  capability the existing route honours.
- Seven controls agree with the routes exactly, including a dangling link (404),
  an ordinary `.avi` (400), a directory named `folder.mp4` (400), an absent
  summary, a non-string summary and a drifted summary.

### Defects, ledger and recurrence

No new ledger class is proposed. All 14 failures are reader occurrences of the class
the lead already indexed as **WS-16 (R2a/R2b)**, and they refine rather than reopen
it: the transcript, historical-identity and bookend families are wider than the
review's four examples, and the serving mismatch has a second, opposite direction.
WS-12, WS-17 and R2c stay closed with their regressions retained; WS-03/04/05 and
legacy WS-06/09 remain open and untouched. **No defect was fixed here**, and no
application code, test, script, dependency, instruction or lead record was edited.

### Coverage gaps, stated rather than silently omitted

1. **Transcript truncation above `WORD_LIMIT` (20,000) is not exercised.** A genuine
   fixture needs a real render with more than 20,000 editorial words; a synthetic
   document at that scale would contradict the producer oracle and, under this
   contract, must be refused. No existing named case covers it either. Gap.
2. **Crossfade breadth.** Only one of six recorded joins took `xfade_acrossfade`;
   the renderer chose hard-cut fallbacks for the others on these assets. Further
   crossfade clamp and eligibility relationships are retained by named existing
   cases ("refuses a crossfade its own recorded join inputs could not have
   produced", "refuses a hard cut that claims an overlap, however the arithmetic is
   balanced"), not by a second real crossfade here.
3. **Optional artifacts.** No genuine save carries a caption-overlay or
   cropped-source artifact — the same limit the repair-3 report recorded — so those
   two projections are compared as genuinely absent only. Their placement and domain
   relationships are retained by named existing cases.
4. **Populated legacy recovery states.** `P-C10` compares all 230 leaves of a legacy
   response with a full present set of sidecars, its four genuine entry-versus-
   sidecar conflicts and its selected thumbnail. The malformed, unreadable,
   supplied-empty and absent sidecar states are retained by the named existing
   B2B2-2 cases rather than re-implemented.
5. **Ownership and junction refusals** are retained by named existing cases
   ("refuses a junction at the configured history root itself", "refuses a legacy
   sidecar directory that is a junction", "refuses to read a revision document
   through a junction"); no owned-path link case is re-implemented here.
6. **No decoding and no hashing.** This proof is about the coherence of stored
   records and agreement with the serving routes. A document whose numbers are
   mutually consistent but untrue to the bytes on disk would still pass, exactly as
   `integrity_verified: false` says.
7. **Draft-document contradictions** are not extended here; existing named coverage
   ("refuses a draft whose nested inputs are unusable", "refuses a draft document
   that is missing, malformed or from another incarnation") is retained.
8. The tracked-response ledger's 253/253 figure is the **card revision** response;
   the legacy response has its own 230/230 ledger. Responses in refusal states have
   no leaves to compare.

### Uncertainty and out-of-scope observations

- The expectations assume the accepted save service wrote every document that
  exists, which holds while production adoption is absent.
- The projection ledger compares each leaf with a value derived from the stored
  record and the published type contract; it cannot prove that the contract itself
  is the behaviour Isaac wants, only that the response matches its own inputs.
- Four of the six recorded joins falling back to a hard cut on 640x360 assets is a
  renderer-side observation, not a defect claim; nothing here investigates it.
- Proposed durable corrections: none. `docs/local-setup.md` needs no change.

## Handoff

- Checkpoint or actual handoff: **handed off**, 2026-09-22 (UTC), this Worker
  session. Artifact writes stopped at this report.
- Current implementation owner: returns to the coordinating Project Lead. Not
  self-accepted; this is failed application verification, not a recommendation.
- Current snapshot: frozen application HEAD `fed8ed1` plus repair-3 manifest
  `6b7807c1…`; new verification artifacts in `artifact-snapshot.json`, bound run
  `check-run4.log` / `check-editor-read-contract-result-run4.json`.
- Unfinished work and unresolved findings: the eight coverage gaps above; the 14
  conformance failures, all open and none repaired here. No adapters, UI, writing
  persistence, Cleanup, migration or successor work was started.
- Last failed approach: two harness corrections only (the oracle's project root, and
  run 1's verbose failure evidence), both described above and both preserved. No
  application hypothesis was attempted, because lead-19 does not authorise repair-4.
- Next action and owner: the coordinating lead arranges **fresh independent review**
  of these expectations, their oracles, the two coverage ledgers and the evidence,
  then decides whether and how to scope a further bounded repair. There is no
  automatic transition from writing these cases to changing application code, even
  for an obvious one-line fix.
- Pending Isaac decision: none.
- Durable decisions: none (no ADR).
- Transfer: the evidence root, both new project files, the fixture roots under
  `_local/clipperz/tmp/editor-read-contract-*` and the genuine historical documents
  under `_local/clipperz/tmp/saved-revision-*` are ignored files needing explicit
  transfer before review in another checkout. Disposable fixtures from the four runs
  are left in place; nothing outside them was written.
