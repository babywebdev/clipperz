---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2b-2-contract-proof-repair-1"
spec_revision: "lead-20"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2-repair-3/snapshot/manifest.json"
author: "worker"
date: "2026-09-22"
state: "active"
summary: "CP-1 accounting corrected and self-proved, CP-2 present-artifact controls read and refuse, supplement integrated. 42 pass / 16 fail: the 14 known failures plus CP-3 and one new artifact-size defect."
read_when: "Reviewing the lead-20 artifact correction, its coverage accounting, present-artifact controls or the sixteen open reader failures."
evidence: "_local/project/evidence/writing-studio/1b-2b-2-contract-proof-repair-1/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Implementation Report: writing-studio / 1b-2b-2-contract-proof-repair-1

Size exception: lead-20 sets two separate corrections with their own required
proofs (CP-1 accounting plus verifier self-checks, CP-2 present-artifact controls),
a supplement to adapt, and a separate binding of the frozen application against the
revised artifacts. Sixteen application failures, three coverage claims, eight
self-checks and a deliberately stopped run do not compress into 1,200 words without
dropping required findings. Full output is in evidence. Evidence paths are relative
to `_local/project/evidence/writing-studio/1b-2b-2-contract-proof-repair-1/`.

## Identity and freshness

- Implementation author: Worker, Claude Code desktop session (Claude Opus 5), on
  Isaac's manual relay of lead-20. No agent dispatch; README records
  `Verification delegation: disabled`, so every check below ran in this session.
- Spec: `docs/project/tasks/writing-studio/spec.md` **lead-20**, section
  "Contract-proof artifact correction (lead-20)" with Status, "Current baseline and
  assumptions", the acceptance map **B2B2-1..5**, "Current technical constraints"
  and "Approved exceptions currently in force". Also read, as lead-20 directs:
  `reports/1b-2b-2-contract-proof-worker.md` and
  `reports/1b-2b-2-contract-proof-review.md` including its coordinating-lead
  disposition, plus the lead-19 section the corrected artifacts were built under.
- **Application snapshot (frozen, unchanged).** HEAD
  `fed8ed13dcb2aade06bee341953d6b10d58bff13`; repair-3 manifest
  `6b7807c1411dbf1005309d7c2dde3add7530b5a48d0f0c116bfeb86536018c84`.
  `baseline-pre.json` and `baseline-post.json` hash all **120** recorded
  application, contract and untracked inputs plus the compiled modules before the
  first edit and after the last check: **zero application drift**, and the 120 input
  rows are byte-identical between the two stages. Inventory `4.1.0-local-2`:
  22 of 22 rows unchanged, both times. The only four differing rows are the three
  lead-owned documents lead-20 itself rewrote (`spec.md` twice, `spec-log.md`,
  `findings-ledger.md`); their hashes are identical pre and post, so nothing here
  touched them. The helper exits 1 on those four known rows by design.
- **Verification-artifact identities, recorded separately.** Pre-edit
  `scripts/verification/check-editor-read-contract.mjs`
  `eca26d92d92ae0cbff42494e095dfc0ab86bca61d17cb92f61c8c3e5d611e616`; bound-run
  `dd04e3587010d65f98d2a105cd02ac3469de539fc9f13cb0e457ed3efd0258dd`.
  `scripts/verification/fixtures/editor-read-contract/producer-oracle.py` is
  **unchanged**, `0a03ba7a79a06042d549c606aeccb2c0de0237870d23e5c84cf9ca67817016dc`:
  its existing `map_words` op already supplies the 20,001-word mapping, so the
  correction needed no Python edit. The bound run's own result file records the same
  two hashes as the files on disk (`artifact-snapshot.json`).
- **No rebuild.** `dist/` still matches repair-3's `dist-before-rebuild.sha256` byte
  for byte, so the studio under test is the reviewed build and nothing was compiled.
- Environment: Windows 11; configured local runtime Node **v24.15.0**, CPython
  **3.14.3**, FFmpeg/ffprobe **8.1.1-full_build-www.gyan.dev**
  (`runtime-versions.log`). Isolated `mkdtemp` home/data/exports/tmp, synthetic
  media only, no AI call, no network, no user Library. Isaac's Studio
  `127.0.0.1:3847` was never started, stopped or contacted; the runner asserts each
  discovered port is neither `3847` nor `PODCLI_PORT` (bound run: 54946, 54953).
- Plan freshness: `plan.md` was written **before any edit and any run**, and records
  the pre-edit artifact hashes, every new case with its acceptance ID and expected
  outcome, and the expected-value source for each new comparison. Zero relevant
  drift: HEAD unchanged, application inputs unchanged, inventory unchanged. No
  settled design or approval boundary moved, so nothing paused.
- Resume before lead reconciliation: Status (lead-20) agrees with the actual tree,
  with the lead-19 Worker report's Handoff and with the fresh review. Its "last
  failed approach" (aggregate boundary omitting producer relationships; recorded
  file kind differing from the serving route's resolved kind) is unchanged and
  untouched here: this assignment repairs no application code. WS-12/17 and R2c stay
  closed; WS-03/04/05 and legacy WS-06/09 remain open and untouched.
- Implementation: **implemented** (the artifact-only correction lead-20 authorises).
- Verification: **fail** for the application, **complete** for artifact coverage.
  These are separate conclusions and the runner now reports them separately. The
  runner exits 1. Zero harness errors in the bound run.
- Submitted for review: yes. Acceptance belongs to the coordinating lead after the
  fresh independent follow-up lead-20 requires.

## What changed, and what each new check actually proves

One project file was edited: `scripts/verification/check-editor-read-contract.mjs`.

**CP-1 / WS-18, trustworthy accounting.** The lead-19 ledger was a set of paths and
`isCovered` credited every descendant of any member, so `cover('capabilities')` and
`cover('diagnostics')` credited leaves nothing had compared, and the final gap
summary could not reach the exit code. Now each response leaf carries the check that
was **actually executed** there plus the source of its expected value, under seven
named kinds: `equality`, `deep-equality`, `tolerance`, `enumeration`, `format`,
`shape` and `marker`. Only `deep-equality` reaches descendants, and only because
`isDeepStrictEqual` against a fully specified expected value compares the structure
too, so an extra or missing descendant fails that comparison instead of being
absorbed. A bare `marker` credits its own path and nothing below it. A weaker check
can never downgrade a path already compared more strongly. `shape` is reported as
shape, never as semantic equality; the bound run's breakdowns are printed per claim.

The missing capability-reason comparisons are added on **both** ledgers. `available`
always has an external expected value; `reason` is compared exactly where an
independent source names it, and otherwise held to the published `EditorReasonCode`
list plus the rule that only an available capability may report `AVAILABLE`. The
observed reasons are recorded in each case's result rather than guessed at: the one
code with no external source, `adopt_for_revision_tracking.reason`, is
`WRITE_ROUTE_NOT_AVAILABLE` in both responses. The legacy ledger's diagnostics are
now compared row by row, with the code multiset derived from the anomalies the
fixture actually has and the four `LEGACY_FIELD_CONFLICT` scopes required to match
the four fields the fixture makes disagree. `legacy.conflicts` is no longer compared
as a mapped projection, which would have let a new property through; each row is
compared leaf by leaf. `identity.captured_at` is recorded as `format`, not equality.
The code vocabularies come from `src/models/clip-editor-context.ts`, the shared type
declaration both sides of the wire are written against, not from the validator.

Required coverage is now **declared, evaluated and fatal**: C-R1 the whole tracked
card-revision response, C-R2 the whole legacy recovery response, C-R3 the artifact
subtree of a present-artifact response. A gap in any of them makes the run
incomplete and the exit nonzero even with every product case passing, and a claim
whose response was never captured counts as missing coverage.

**Verifier self-checks (V-1..V-5), over the accounting itself, no application
involved.** V-1 an unasserted sibling is a gap; V-2 a child added under a bare
container marker is a gap; V-3 a complete comparison credits its descendants **and**
an added descendant fails it rather than being credited; V-4 type, non-empty and
redaction checks are recorded as `shape`, a pattern as `format`, a container as
`marker`, and a later weaker check does not downgrade a path already compared
exactly; V-5 a required gap with **zero** failing cases still yields
`coverage: incomplete` and exit 1, while a failed case with complete coverage yields
`application: fail` and exit 1. `--self-check-only` runs these and stops before the
fixture, so the accounting can be exercised without a 15-minute render.

**CP-2, a valid present artifact.** A new eighth real save, `OVERLAY`, commits
through the accepted producers with `keep_caption_overlay: true` **and** an opening
thumbnail card. The renderer publishes the ProRes alpha overlay and the cropped
source beside the main file, and the card puts the content at 1.52 s, so a placement
at the content offset is distinguishable from one at 0. The expected offset is
re-derived from the card composer's measured duration plus the receipt offset, not
read back from the placement record under test; the expected domain and card-free
flag come from `buildFinalComposition`'s `sidecar` helper
(`src/services/clip-revisions.ts:1229`). A-C1 asserts, for both sidecars,
file-derived bytes against `statSync`, presence, each artifact's own domain,
`contains_card: false` and placement at the content offset, plus the card image's
own record; its assertions run through `allOf` so one wrong value cannot turn an
application failure into a coverage gap as well. A-X1..A-X4 then mutate one
relationship at a time on a document where **both** the file record and the
placement exist, so a refusal cannot be credited to a dangling record. P-C2's
genuinely absent artifacts on the card revision are preserved unchanged.

**Supplement, adapted from the fresh review.** T-C6 maps all 20,001 words through
the same out-of-process `exact_render` helpers in the pre-request oracle batch, so
the mutated document is exactly what a save of that transcript would have written,
and asserts the exact 20,000-word producer prefix, the true count 20,001, the full
untruncated producer text ending in `TAIL`, and the `TRANSCRIPT_TRUNCATED`
diagnostic. B-C7 keeps unknown unconsumed bookend metadata readable. B-X6 moves
**both** stored copies of the last join to 999 together, so copy equality cannot
catch it. The reviewer's own script, logs and result files were neither rewritten nor
rerun; these are separate cases writing only under this assignment's evidence root.
The 20,001-word mapping is millions of characters, so the result file records it by
hash, length and endpoints rather than inline.

## Execution Receipt

Three full-run attempts, all preserved. Run 1 is an earlier artifact state
(`9f172fc2…`); run 2 was **stopped by me** and is not a result; **run 3 is the bound
run** and its result file records the artifact hashes above. The same sixteen
application failures appear in run 1 and run 3.

| Acceptance ID or check | Exact command/steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| B2B2-1,2,3,4,5 conformance (**bound run**) | `node scripts/verification/check-editor-read-contract.mjs --out <cycle evidence>`; expect every stated requirement to hold | **1**: 66 cases — application **42 passed, 16 failed, 0 harness**; verifier self-checks **8 passed, 0 failed**; coverage **complete** | `check-run3.log`, `check-editor-read-contract-result-run3.json` | frozen application + `dd04e358…` | self |
| B2B2-5 verifier self-checks (CP-1) | `node scripts/verification/check-editor-read-contract.mjs --self-check-only --out <cycle evidence>`; expect every accounting rule to hold | **0**: V-1..V-5 all pass | `check-editor-read-contract-self-check-run3.json` | `dd04e358…` | self |
| B2B2-5 required coverage is fatal (CP-1) | `C-R1`, `C-R2`, `C-R3` inside the bound run | 0 failures: 253/253 tracked (equality 96, deep-equality 141, shape 14, format 1, enumeration 1), 230/230 legacy (equality 95, deep-equality 91, shape 35, format 1, enumeration 8), 15/15 present-artifact (equality 12, tolerance 3); **no gap** | `check-run3.log` lines 95–103 | frozen | self |
| — same runner, run 1 (earlier artifact state) | same command | 1: application 42 passed, 16 failed, 0 harness; verifier 8 passed; coverage complete, tracked breakdown then included one `marker` credit | `check-run1.log`, `…-result-run1.json` | `9f172fc2…` | self |
| — same runner, run 2 (**stopped, not a result**) | same command, interrupted after ~3 minutes | stopped by `TaskStop`; no result file written | `check-run2-stopped.log`, `…-self-check-run2.json` (`c29028cc…`) | `c29028cc…` | self |
| B2B2-1 present optional artifacts (CP-2) | `A-C1`, `A-X1..A-X5` on the new `keep_caption_overlay` + card save | `A-C1` **passes**: both sidecars present, bytes equal to the files on disk, own domain, `contains_card: false`, `placed_at: 1.52` = content offset. `A-X1..A-X4` **pass**: wrong domain, wrong flag, wrong offset and swapped file identity are each refused with both sides present. `A-X5` **fails** | `check-run3.log` lines 62–68 | frozen | self |
| B2B2-1 truncation supplement | `T-C6` against the producer's 20,001-word mapping | 0 failures: 20,000 served words equal to the producer prefix, `word_count` 20,001, 128,894-character full producer text ending `TAIL`, `TRANSCRIPT_TRUNCATED` present | `check-run3.log` line 19 | frozen | self |
| B2B2-1 paired last-stage supplement (CP-3) | `B-X6`: both stored copies of the outro join set to 999 | **fails**: published `measured_output_duration: 999` beside `raw_output: 3.929` | `check-run3.log` lines 59–60 | frozen | self |
| B2B2-1 unknown unconsumed metadata | `B-C7` | 0 failures: reads normally | `check-run3.log` line 58 | frozen | self |
| B2B2-1 transcript, historical, bookend, serving (retained cases) | `T-*`, `H-*`, `B-*`, `S-*` as in lead-19 | the 14 lead-19 failures reproduce unchanged; every lead-19 control still passes | `check-run3.log` | frozen | self |
| B2B2-4 reads change nothing | `P-C7`, `P-C8`: whole-fixture hash before the first request and after every case; genuine historical originals re-hashed | 0 failures: no created, removed or changed byte; no `revisions` field added to an untracked clip; all 4 historical originals unchanged | `check-run3.log` lines 90–91 | frozen | self |
| B2B2-5 restart | `P-C9`: stop the studio, restart on a second free port, re-read the control | 0 failures: identical response apart from `identity.captured_at`; ports 54946 then 54953, neither 3847 | `check-run3.log` line 93 | frozen | self |
| AC-12 application snapshot binding | `node <evidence>/baseline-check.mjs "$PWD" pre` and `… post` | **1** both times on the four known lead-document rows; **120 inputs checked, 0 application drift**, input rows byte-identical pre/post, inventory 22/22, all compiled modules match | `baseline-pre.json/.log`, `baseline-post.json/.log` | frozen | self |
| AC-12 write boundary | `node <evidence>/write-boundary-check.mjs "$PWD"` | **0**: 6 added status lines, 4 owned by the prior assignment and 2 by this one, **0 problems**; `check-editor-read-contract.mjs` CHANGED and `producer-oracle.py` unchanged, as intended; no `src`/`backend`/`tests`/`dist` reference; vitest include and pytest target unchanged; both package manifests match the snapshot | `write-boundary.json`, `write-boundary.log` | frozen | self |
| AC-12 artifact syntax | `node --check` on the runner and both evidence helpers; `py_compile` on the oracle through the configured runtime | all exit 0 | `syntax-check.log` | `dd04e358…` | self |
| B2B2-5 focused reader/contract/route (retained, not rerun) | repair-3 `node scripts/verification/run-tests.mjs node src/services/clip-editor-context.test.ts src/services/clip-editor-read-contract.test.ts src/ui/editor-context-route.test.ts` | Retained: 0, **186 passed**. Covered inputs unchanged (`baseline-post.json`); this assignment adds no `src` file and no default test-glob entry | `../1b-2b-2-repair-3/node-focused-run1.log` | repair-3 snapshot | self (repair-3 Worker session) |
| B2B2-5 full Node (retained) | repair-3 `node scripts/verification/run-tests.mjs node` | Retained: 0, 43 files, **691 passed** | `../1b-2b-2-repair-3/node-full-run1.log` | repair-3 snapshot | self (repair-3 Worker session) |
| B2B2-5 build and client types (retained) | repair-3 `npm run build`; `tsc --noEmit -p src/ui/client/tsconfig.json` | Retained: 0 and 0; `dist/` still matches `dist-before-rebuild.sha256`, so the retained build is the build under test | `../1b-2b-2-repair-3/build-run1.log`, `client-types-run1.log` | repair-3 snapshot | self (repair-3 Worker session) |
| B2B2-5 existing HTTP check (retained) | repair-3 `node scripts/verification/check-editor-context.mjs` | Retained: 0 `Passed`, 20 step groups | `../1b-2b-2-repair-3/check-editor-context-run1.log` | repair-3 snapshot | self (repair-3 Worker session) |
| B2B2-5 Python, both bridges, preview parity (retained) | 1B.2b.1 and repair-3 rows | Retained: 991 passed / 6 skipped; both bridges and parity `Passed`. No Python, renderer or dependency input changed; `producer-oracle.py` is byte-identical to lead-19 and is imported by no application or test file | `../1b-2b-1/python-*.log`, `../1b-2b-1/check-exact-render-run1.log`, `../1b-2b-1-repair-1/check-saved-revision-run1.log`, `../1b-2b-1/check-preview-render-run1.log` | predecessor snapshots | self (predecessor Worker sessions) |

- Executor identities and target: `self` is this Worker session on the configured
  local runtime against disposable fixtures; retained rows name their own sessions
  and snapshots. No subagent, no human assistance.
- Runtime coverage: success and failure paths through the real studio process over
  real HTTP, including the by-id preview and download routes against nine summary
  and link states, real Windows file symlinks, a directory wearing a media
  extension, a stop/restart on a second free port, eight real saves through the
  accepted producers (one of them publishing two optional artifacts), one real
  legacy render, and whole-fixture byte hashing at three points.
- Not applicable: browser walkthrough (no UI in this slice); live AI smoke test.
- Not run: Python suites, both bridges, preview parity, the full Node suite, the
  build and client types — all retained above by unchanged covered inputs, which
  `baseline-post.json` establishes, plus the write-boundary evidence that neither
  verification file is reachable from the application or collected by a default glob.
- Changed inputs after checks: none. After the bound run only this report,
  `artifact-snapshot.json` and its helper were written; the runner's recorded hash
  still equals the file on disk.

## Change inventory

Git-derived (`write-boundary.json`). One project file edited, none added, none
removed:

- `scripts/verification/check-editor-read-contract.mjs` (**edited**, 1,438 → 2,086
  lines): the coverage ledger replaced by per-leaf kind-and-source accounting with
  no descendant crediting from a marker; capability and diagnostic ledgers for both
  responses; five verifier self-checks and a `--self-check-only` mode; three declared
  and fatal required-coverage claims; the two conclusions and the exit decision
  separated; the `OVERLAY` fixture and cases `A-C1`, `A-X1..A-X5`; supplemental cases
  `T-C6`, `B-C7`, `B-X6`; an explicit `reused_coverage` map of five reused claims
  naming fourteen existing test cases, each verified to be an exact `it()` name.
- `scripts/verification/fixtures/editor-read-contract/producer-oracle.py`:
  **unchanged**, byte-identical to lead-19.
- Evidence only, under this cycle's root: `plan.md`, `baseline-check.mjs`,
  `write-boundary-check.mjs`, `artifact-snapshot.mjs`, three run logs, three result
  files, three self-check results, the baseline and boundary records, and the
  runtime and syntax logs.
- Unchanged: all of `src/`, `backend/`, `tests/`, `dist/`, every other verification
  script and fixture, `package.json`, `package-lock.json`, the vitest and pytest
  configuration, instructions, lead records, all prior reports and all earlier
  evidence directories, including the reviewer's `review/` folder and its scripts.

## Deviations and decision requests

No decision request. Delegated choices worth review:

- **`A-X5` accepts either honest answer.** The plan expected a refusal. On reading
  the response I saw that `media.output` already handles the same situation by
  publishing `bytes` from the file, `recorded_bytes` from the record and
  `size_matches` between them, so demanding a refusal would have imposed one remedy
  the project has not settled. The case now passes if the response refuses **or** if
  it publishes the file's real size; it fails only on an unlabelled number the
  file disproves. That is the weaker, better-supported expectation, and it still
  fails today.
- **Capability reasons with no external source are enumerated, not guessed.** Rather
  than inventing an expected code for `adopt_for_revision_tracking.reason`, the
  runner asserts published-enumeration membership plus the available/reason
  consistency rule, records the kind as `enumeration`, and reports the observed
  value. Two reasons that another independently compared field settles
  (`widen_from_source_words`, `known_effective_cuts` on legacy) are compared exactly
  against that field.
- **The supplement is integrated rather than re-executed from the review's script.**
  Lead-20 allows either. Integration makes the truncation control and the paired
  mutation part of the reproducible runner; the reviewer's evidence is untouched and
  the review keeps authorship of the finding.
- **One harness correction, disclosed rather than hidden.** After starting run 2 I
  edited a metadata string in the runner. The result file hashes the runner at the
  **end** of a run, so run 2 would have recorded a hash whose content had not run.
  I stopped run 2 with `TaskStop`, preserved its partial log and its own self-check
  result, made the remaining edits, and reran from a stable file as run 3. No
  expected outcome changed: run 1 and run 3 report the same sixteen failures.
- **Run 1 versus run 3.** Between them I added the strength ordering that stops a
  weaker check downgrading a stronger one, recorded an empty diagnostic list as the
  equality it is rather than leaving a container marker to stand for it, reformulated
  `A-X5` as above, and corrected five `reused_coverage` case names to exact `it()`
  names. The only numeric difference is the tracked breakdown: `marker 1` became
  `equality 96`.

## Limitations and findings

### CP-1 / WS-18 and CP-2: what is now established

- CP-1 is corrected and proved against itself: eight verifier cases pass, the three
  required claims report 253/253, 230/230 and 15/15 with per-kind breakdowns, and
  V-5 demonstrates that a required gap alone produces `coverage: incomplete` and
  exit 1. The `253/253` and `230/230` figures are no longer traversal arithmetic:
  every leaf names the check executed on it.
- CP-2 is closed with **positive** results. A legitimate present caption overlay and
  cropped source read correctly, and each of the four isolated contradictions with
  both sides present is refused. The reviewer's concern that the retained tests
  could reject before reaching valid-present behaviour is answered by A-C1 reading
  and A-X1..A-X4 refusing on the same genuine save.
- The truncation uncertainty is closed in this runner as well as in the review's
  supplement: the full 128,894-character producer text, the exact 20,000-word
  prefix, the true count and the diagnostic all hold. The lead-19 Worker report's
  claim that a large synthetic document must necessarily contradict the producer is
  wrong, exactly as the review found; that report stays as handed off.

### Failed application conformance: 16 cases

The **14** lead-19 failures reproduce unchanged (`T-X1..T-X6`, `H-X1`, `H-X2`,
`H-X4`, `B-X1..B-X3`, `S-X1`, `S-X2`), with every lead-19 control still passing.
Two more are now executable:

- **`B-X6` (CP-3, the review's finding, now reproducible here).** Both stored copies
  of the outro join set to 999 together are accepted, and the response publishes
  `measured_output_duration: 999` beside `raw_output: 3.929`. `B-X1` only tests
  disagreement between the copies, so a repair that adds copy equality alone would
  pass `B-X1` and still fail this. Open **WS-16 (R2a)**.
- **`A-X5` (new).** With `files.caption_overlay.bytes` one byte above the file, the
  response publishes `artifacts.caption_overlay.bytes: 5749186` for a 5,749,185-byte
  file, and no field in the artifact projection separates the record's claim from
  the file. For the main output the same response distinguishes `bytes`,
  `recorded_bytes` and `size_matches`; for an optional artifact it publishes one
  unlabelled number it never compares with the file. This is a new occurrence of the
  same class, not a new class: **WS-16 (R2a)**, in the family of `H-X3`/`H-X4`.
  Either remedy is honest, and the choice is the lead's, not this report's. It is
  not a byte-integrity claim: `integrity_verified: false` concerns hashes, and this
  is a recorded size the writer measured at save.

**No defect was fixed here**, and no application code, test, other verification
script, dependency, instruction, lead record or prior evidence file was edited.

### Coverage limits that remain, stated rather than silently omitted

1. **Crossfade breadth.** One of the recorded joins took `xfade_acrossfade`; the rest
   fell back to hard cuts on these assets. Retained named arithmetic and eligibility
   cases cover the rest, as the review accepted. No comprehensive branch matrix is
   claimed.
2. **Historical sample.** Two genuine pre-composition documents are exercised and
   four originals are hashed. A bounded compatibility sample, not exhaustive.
3. **No decoding and no hashing.** Coherence of stored records and agreement with
   the serving routes. A document whose numbers agree with each other but not with
   the bytes would still pass, exactly as `integrity_verified: false` says. A-X5 is
   about a size the document itself records, not about attestation.
4. **Selected response states.** The two full-leaf ledgers are one card revision and
   one legacy recovery response. Refusal states have no leaves to compare, and other
   populated states are covered by the named existing cases now listed in
   `reused_coverage`, not by a third ledger.
5. **Present-artifact scope.** The fatal C-R3 claim is the artifact subtree of one
   present-artifact response, which is what CP-2 required; the rest of that response
   is not separately ledgered.
6. **Retained ownership, legacy sidecar and draft coverage** is reused by named
   case, per the review's disposition, and not re-implemented.

### Uncertainty and out-of-scope observations

- The expectations assume the accepted save service wrote every document that
  exists, which holds while production adoption is absent.
- Four of six recorded joins falling back to a hard cut on 640x360 assets remains a
  renderer-side observation, not a defect claim.
- Proposed durable corrections: none. `docs/local-setup.md` needs no change.
- Proposed ledger updates, for the lead to apply: add this report to **WS-16**'s
  occurrences for `B-X6` and the new `A-X5`; **WS-18**'s required outcomes are
  implemented and self-proved here, and its closure needs the fresh independent
  follow-up, not a Worker claim.

## Handoff

- Checkpoint or actual handoff: **handed off**, 2026-09-22 (UTC), this Worker
  session. Artifact writes stopped at this report.
- Current implementation owner: returns to the coordinating Project Lead. Not
  self-accepted: application verification remains failed and this is not a
  recommendation.
- Current snapshot: frozen application HEAD `fed8ed1` plus repair-3 manifest
  `6b7807c1…`; revised verification artifact `dd04e358…` with `producer-oracle.py`
  unchanged at `0a03ba7a…`; bound run `check-run3.log` /
  `check-editor-read-contract-result-run3.json`; identities in
  `artifact-snapshot.json`.
- Unfinished work and unresolved findings: the sixteen conformance failures, all
  open and none repaired; the six coverage limits above. No application fix,
  adapter, UI, writing persistence, Cleanup, migration or successor work was started.
- Last failed approach: one harness/process correction only, the stopped run 2
  described under Deviations, preserved as `check-run2-stopped.log`. No application
  hypothesis was attempted, because lead-20 authorises no repair-4.
- Next action and owner: the coordinating lead arranges the **fresh independent
  follow-up** lead-20 requires on the corrected accounting, the present-artifact
  controls, the adapted supplement and the two new failures, then decides whether
  and how to scope further application work. This is artifact correction round one
  of at most two before reassessment; there is no automatic loop in either lane.
- Pending Isaac decision: none.
- Durable decisions: none (no ADR).
- Transfer: the evidence root, the edited verification file, the fixture roots under
  `_local/clipperz/tmp/editor-read-contract-*` and the genuine historical documents
  under `_local/clipperz/tmp/saved-revision-*` are ignored files needing explicit
  transfer before review in another checkout. Disposable fixtures from the three
  attempts are left in place; nothing outside them was written.
