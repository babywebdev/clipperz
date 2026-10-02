---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2b-2-contract-proof-repair-2"
spec_revision: "lead-21"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2-repair-3/snapshot/manifest.json"
author: "worker"
date: "2026-09-22"
state: "active"
summary: "A-X5 converted to a recorded-metadata projection control and passes. Bound run: 43 pass / 15 fail, exit 1, coverage complete. Fifteen supported application failures remain."
read_when: "Reviewing the lead-21 oracle correction, the corrected A-X5 expectation, or the fifteen open reader failures."
evidence: "_local/project/evidence/writing-studio/1b-2b-2-contract-proof-repair-2/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Implementation Report: writing-studio / 1b-2b-2-contract-proof-repair-2

Size exception: lead-21 requires the corrected expectation with its counterevidence,
separate application and artifact snapshot bindings, an explicit preservation
account for fifteen failures and the earlier controls, and an attributed
correction of the prior sixteen-failure conclusion. Fifteen failures, three
coverage claims, eight self-checks and eighteen receipt rows do not compress into
1,200 words without dropping required findings. Full output is in evidence.

Evidence paths are relative to
`_local/project/evidence/writing-studio/1b-2b-2-contract-proof-repair-2/`.

## Identity and freshness

- Implementation author: Worker, Claude Code desktop session (Claude Opus 5), on
  Isaac's manual relay of lead-21. No agent dispatch; README records
  `Verification delegation: disabled`, so every check below ran in this session.
- Spec: `docs/project/tasks/writing-studio/spec.md` **lead-21**, section
  "Contract-proof oracle correction (lead-21)" with Status, "Current baseline and
  assumptions", the acceptance map **B2B2-1..5**, "Current technical constraints"
  and "Approved exceptions currently in force". Also read, as the assignment
  directs: `reports/1b-2b-2-contract-proof-repair-1-worker.md` and
  `reports/1b-2b-2-contract-proof-repair-1-review.md` including its coordinating
  lead disposition, plus the lead-20 section the reviewed artifacts were built
  under.
- **Application snapshot (frozen, unchanged).** HEAD
  `fed8ed13dcb2aade06bee341953d6b10d58bff13`; repair-3 manifest
  `6b7807c1411dbf1005309d7c2dde3add7530b5a48d0f0c116bfeb86536018c84`.
  `baseline-pre.json` and `baseline-post.json` hash all **120** recorded
  application, contract and untracked inputs plus the compiled modules before the
  first edit and after the last check. The two stages are byte-identical: input
  rows, `dist` rows and inventory rows all compare equal object for object
  (`preservation.log` and the comparison in the receipt). Inventory
  `4.1.0-local-2`: 22 of 22 rows unchanged, both times. The only four differing
  rows are the three lead-owned documents lead-20 and lead-21 themselves rewrote
  (`spec.md` twice, `spec-log.md`, `findings-ledger.md`); their hashes are
  identical pre and post, so nothing here touched them. The helper exits 1 on
  those four known rows by design, exactly as in repair-1.
- **Artifact snapshot, recorded separately.** Pre-edit runner
  `dd04e3587010d65f98d2a105cd02ac3469de539fc9f13cb0e457ed3efd0258dd`, the
  identity the repair-1 review and disposition recorded. Bound-run runner
  `4ee3ae7dfab458037aaf23d7d72faaf900975b1a15a3c75afd44a3e16fb25eee`, captured in
  `bound-run-artifact-identity.txt` **before** the run and equal to the hash the
  run's own result file recorded and to the file on disk afterwards.
  `producer-oracle.py` is **unchanged**,
  `0a03ba7a79a06042d549c606aeccb2c0de0237870d23e5c84cf9ca67817016dc`; lead-21
  does not make it writable and it needed no edit.
- **No rebuild.** `dist/` still matches repair-3's `dist-before-rebuild.sha256`
  row for row, so the studio under test is the reviewed build and nothing was
  compiled.
- Environment: Windows 11; configured local runtime Node **v24.15.0**, CPython
  **3.14.3**, FFmpeg/ffprobe **8.1.1-full_build-www.gyan.dev**
  (`runtime-versions.log`). Isolated `mkdtemp` home/data/exports/tmp, synthetic
  media only, no AI call, no network, no user Library. Isaac's Studio
  `127.0.0.1:3847` was never started, stopped or contacted; the runner asserts
  each discovered port is neither `3847` nor `PODCLI_PORT` (bound run: 64518,
  64529).
- Plan freshness: `plan.md` was written **before any edit and any run** and
  records the four pre-edit identities, the corrected case with its expected
  outcome and expected-value source, and every check with its acceptance ID.
  Zero relevant drift: HEAD unchanged, application inputs unchanged, reviewed
  runner and oracle unchanged, inventory unchanged. No settled design or approval
  boundary moved, so nothing paused.
- Resume before lead reconciliation: Status (lead-21) agrees with the actual
  tree, with the repair-1 Worker report's Handoff and with the fresh review and
  its disposition. Its "last failed approach" (aggregate boundary omitting
  producer relationships; recorded file kind differing from the serving route's
  resolved kind) is unchanged and untouched here: this assignment repairs no
  application code. WS-12/17 and R2c stay closed; WS-03/04/05 and legacy
  WS-06/09 remain open and untouched.
- Implementation: **implemented** (the artifact-only oracle correction lead-21
  authorises).
- Verification: **fail** for the application, **complete** for artifact coverage.
  These are separate conclusions and the runner reports them separately. The
  runner exits 1. Zero harness errors.
- Submitted for review: yes. Acceptance belongs to the coordinating lead after
  the fresh independent follow-up lead-21 requires.

## The correction, and why this expectation is the supported one

One project file was edited: `scripts/verification/check-editor-read-contract.mjs`.

**CPR-1 / WS-19, `A-X5`.** The reviewed case mutated
`files.caption_overlay.bytes` by one on the otherwise coherent `OVERLAY`
document and then demanded either a refusal or a published value equal to
`statSync(...).size`. That imposed a current-file guarantee on a subtree the
project records at save.
`src/models/clip-editor-context.ts:262` describes `revision.document.artifacts`
as the optional renderer artifacts **recorded** beside the served file, and
`projectDocument` (`src/services/clip-editor-context.ts:1010-1013`) projects
`doc.files.<name>.bytes` through field for field. The live contract is
`media.output`, which separately carries stat-derived `bytes`, `recorded_bytes`
and `size_matches`. No approved requirement makes the recorded subtree track
disk state, so the old expectation was not established by any source the runner
is allowed to derive from.

`A-X5` is now a recorded-metadata projection control, as lead-21 directs. It
mutates the same single field on the same otherwise coherent document, requires
a **successful read**, and compares the returned
`revision.document.artifacts.caption_overlay.bytes` against **the mutated
document's own `files.caption_overlay.bytes`**. The expected value is captured
inside the mutation itself, so it is the record under test and not a value read
back from the response. The current size on disk is returned in the case's
observation as a labelled fact asserted against nothing, together with a note
naming `media.output` as the live contract. The case now passes: recorded
5,749,186, published 5,749,186, current file 5,749,185.

**Deliberately outside every coverage ledger.** The corrected comparison uses
plain `equal`, not `field(...)`, so it adds no ledger entry. The leaf
`revision.document.artifacts.caption_overlay.bytes` is already credited at
`equality` strength by `A-C1` against the genuine save's own file, and a
comparison made against a **mutated** document must not credit a leaf of the
unmutated present-artifact response that `C-R3` audits. Crediting it from here
would repeat the CP-1 accounting error the previous round fixed. The three
required coverage figures are consequently identical to the reviewed run:
253/253, 230/230, 15/15, with the same per-kind breakdowns.

**Two supporting edits in the same file**, both made before the bound run: the
results metadata `spec_revision` string moved `lead-20` → `lead-21` in the full
and self-check result writers, and the header comment gained a lead-21 note
stating that a saved-record projection and a live filesystem observation are
different expected-value sources and are never compared with each other. That
note is the "distinguish expected saved-record values from live observations in
the check source" requirement, stated where a later reader meets it.

**Not done, deliberately.** No application, existing test, `producer-oracle.py`,
fixture, build, dependency, instruction or lead-owned record was touched. No
live optional-file byte attestation was added anywhere, and the reader was not
repaired to satisfy any oracle.

## Execution Receipt

One full conformance run, `check-run1.log`. Editing stopped before it; the
runner hash recorded before the run equals the hash in the run's own result file
and the hash on disk afterwards, so no change followed the evidence it is bound
to.

| Acceptance ID or check | Exact command/steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| B2B2-1,2,3,4,5 conformance (**bound run**) | `node scripts/verification/check-editor-read-contract.mjs --out <cycle evidence>`; expect every stated requirement to hold | **1**: 66 cases — application **43 passed, 15 failed, 0 harness**; verifier self-checks **8 passed, 0 failed**; coverage **complete** | `check-run1.log`, `check-editor-read-contract-result-run1.json` | frozen application + `4ee3ae7d…` | self |
| B2B2-1 corrected `A-X5` (CPR-1) | mutate `files.caption_overlay.bytes` by one on the coherent `OVERLAY` save; expect a successful read publishing the mutated record | **passes**: status 200, recorded 5,749,186, published 5,749,186; current file 5,749,185 recorded as a labelled observation | `check-run1.log` line 67; `…-result-run1.json` case `A-X5` | frozen | self |
| B2B2-1 preserved present-artifact controls (CP-2) | `A-C1`, `A-X1..A-X4` on the same genuine `keep_caption_overlay` + card save | `A-C1` **passes**: both sidecars present, bytes equal to the files on disk (5,749,185 and 47,102), own domain, `contains_card: false`, `placed_at: 1.52` = content offset. `A-X1..A-X4` **pass**: wrong domain, wrong flag, wrong offset and swapped file identity each refused with both sides present | `check-run1.log` lines 62–66 | frozen | self |
| B2B2-5 verifier self-checks (CP-1) | `node scripts/verification/check-editor-read-contract.mjs --self-check-only --out <cycle evidence>` | **0**: V-1..V-5 all pass | `self-check-run1.log`, `check-editor-read-contract-self-check-run1.json` | `4ee3ae7d…` | self |
| B2B2-5 required coverage is fatal (CP-1) | `C-R1`, `C-R2`, `C-R3` inside the bound run | 0 failures: 253/253 tracked (equality 96, deep-equality 141, shape 14, format 1, enumeration 1), 230/230 legacy (equality 95, deep-equality 91, shape 35, format 1, enumeration 8), 15/15 present-artifact (equality 12, tolerance 3); **no gap**, identical to the reviewed run | `check-run1.log` lines 100–102 | frozen | self |
| B2B2-1 truncation supplement | `T-C6` against the producer's 20,001-word mapping | 0 failures: 20,000 served words equal to the producer prefix, `word_count` 20,001, 128,894-character full producer text ending `TAIL`, `TRANSCRIPT_TRUNCATED` present | `check-run1.log` line 19 | frozen | self |
| B2B2-1 paired last-stage (CP-3) | `B-X6`: both stored copies of the outro join set to 999 | **fails**, preserved: published `measured_output_duration: 999` beside `raw_output: 3.929` | `check-run1.log` lines 59, 127 | frozen | self |
| B2B2-1 transcript, historical, bookend, serving | `T-*`, `H-*`, `B-*`, `S-*` | the 14 lead-19 failures reproduce unchanged; every control still passes | `check-run1.log` | frozen | self |
| B2B2-4 reads change nothing | `P-C7`, `P-C8`: whole-fixture hash before the first request and after every case; genuine historical originals re-hashed | 0 failures: 2,371 files with no created, removed or changed byte; no `revisions` field added to an untracked clip; all 4 historical originals unchanged | `check-run1.log` lines 89–90 | frozen | self |
| B2B2-5 restart | `P-C9`: stop the studio, restart on a second free port, re-read the control | 0 failures: identical response apart from `identity.captured_at`; ports 64518 then 64529, neither 3847 | `check-run1.log` line 92 | frozen | self |
| AC-12 application snapshot binding | `node <evidence>/baseline-check.mjs "$PWD" pre` and `… post` | **1** both times on the four known lead-document rows; **120 inputs checked, 0 application drift**; input, `dist` and inventory rows compare equal object for object between the two stages | `baseline-pre.json/.log`, `baseline-post.json/.log` | frozen | self |
| AC-12 write boundary | `node <evidence>/write-boundary-check.mjs "$PWD"` | **0**: 9 added status lines, 7 owned by prior assignments and 2 by this one (the runner and this report), **0 problems**; `check-editor-read-contract.mjs` CHANGED against its reviewed repair-1 identity and `producer-oracle.py` unchanged, as intended; no `src`/`backend`/`tests`/`dist` reference; vitest include and pytest target unchanged; both package manifests match the snapshot | `write-boundary.json`, `write-boundary.log` | frozen | self |
| AC-12 prior-evidence preservation | hash every file repair-1's own `artifact-snapshot.json` records, plus the reviewer folder and the four cycle reports | **0 problems**: 21 of 21 repair-1 evidence files unchanged; reviewer `check.mjs`/`check.log`/`result.json`/`attempt-1.txt` and all four reports present and hashed | `preservation.log` | frozen | self |
| AC-12 artifact syntax | `node --check` on the runner and the three evidence helpers; `py_compile` on the oracle through the configured runtime | all exit 0 | `syntax-check.log` | `4ee3ae7d…` | self |
| B2B2-5 focused reader/contract/route (retained, not rerun) | repair-3 `node scripts/verification/run-tests.mjs node src/services/clip-editor-context.test.ts src/services/clip-editor-read-contract.test.ts src/ui/editor-context-route.test.ts` | Retained: 0, **186 passed**. Covered inputs unchanged (`baseline-post.json`); this assignment adds no `src` file and no default test-glob entry | `../1b-2b-2-repair-3/node-focused-run1.log` | repair-3 snapshot | self (repair-3 Worker session) |
| B2B2-5 full Node (retained) | repair-3 `node scripts/verification/run-tests.mjs node` | Retained: 0, 43 files, **691 passed** | `../1b-2b-2-repair-3/node-full-run1.log` | repair-3 snapshot | self (repair-3 Worker session) |
| B2B2-5 build and client types (retained) | repair-3 `npm run build`; `tsc --noEmit -p src/ui/client/tsconfig.json` | Retained: 0 and 0; `dist/` still matches `dist-before-rebuild.sha256`, so the retained build is the build under test | `../1b-2b-2-repair-3/build-run1.log`, `client-types-run1.log` | repair-3 snapshot | self (repair-3 Worker session) |
| B2B2-5 existing HTTP check (retained) | repair-3 `node scripts/verification/check-editor-context.mjs` | Retained: 0 `Passed`, 20 step groups | `../1b-2b-2-repair-3/check-editor-context-run1.log` | repair-3 snapshot | self (repair-3 Worker session) |
| B2B2-5 Python, both bridges, preview parity (retained) | 1B.2b.1 and repair-3 rows | Retained: 991 passed / 6 skipped; both bridges and parity `Passed`. No Python, renderer or dependency input changed; `producer-oracle.py` is byte-identical and is imported by no application or test file | `../1b-2b-1/python-*.log`, `../1b-2b-1/check-exact-render-run1.log`, `../1b-2b-1-repair-1/check-saved-revision-run1.log`, `../1b-2b-1/check-preview-render-run1.log` | predecessor snapshots | self (predecessor Worker sessions) |

- Executor identities and target: `self` is this Worker session on the configured
  local runtime against disposable fixtures; retained rows name their own
  sessions and snapshots. No subagent, no human assistance.
- Runtime coverage: success and failure paths through the real studio process
  over real HTTP, including the by-id preview and download routes against nine
  summary and link states, real Windows file symlinks, a directory wearing a
  media extension, a stop/restart on a second free port, eight real saves through
  the accepted producers (one publishing two optional artifacts), one real legacy
  render, and whole-fixture byte hashing at three points.
- Not applicable: browser walkthrough (no UI in this slice); live AI smoke test.
- Not run: Python suites, both bridges, preview parity, the full Node suite, the
  build and client types, all retained above by unchanged covered inputs, which
  `baseline-post.json` establishes, plus the write-boundary evidence that neither
  verification file is reachable from the application or collected by a default
  glob.
- Changed inputs after checks: none. After the bound run only this report and
  the post-run evidence records were written (`baseline-post`, `write-boundary`,
  `preservation.log`, `artifact-snapshot.json`, which is the last write and so
  indexes the evidence set as of its own capture); the runner's recorded hash
  still equals the file on disk, verified again at handback.

## Change inventory

Git-derived (`write-boundary.json`). One project file edited, none added, none
removed:

- `scripts/verification/check-editor-read-contract.mjs` (**edited**, 2,086 →
  2,117 lines, `dd04e358…` → `4ee3ae7d…`): `A-X5` converted from a live-file
  expectation into a recorded-metadata projection control with its expected value
  taken from the mutated document field and the disk size demoted to a labelled
  observation; the header comment gained the lead-21 expected-value-source note;
  the two result writers record `spec_revision: 'lead-21'`.
- `scripts/verification/fixtures/editor-read-contract/producer-oracle.py`:
  **unchanged**, byte-identical.
- Evidence only, under this cycle's root: `plan.md`, `baseline-check.mjs`,
  `write-boundary-check.mjs`, `artifact-snapshot.mjs`, the bound run log and
  result, the self-check log and result, the baseline, boundary, preservation,
  runtime and syntax records, and `bound-run-artifact-identity.txt`.
- Unchanged: all of `src/`, `backend/`, `tests/`, `dist/`, every other
  verification script and fixture, `package.json`, `package-lock.json`, the
  vitest and pytest configuration, instructions, lead records, all prior reports
  and all earlier evidence directories, including repair-1's root and the
  reviewer's `review/` folder.

## Correction to the prior product-failure classification

The repair-1 Worker report concluded **sixteen** application failures and
proposed adding `A-X5` to WS-16's occurrences. That conclusion is **corrected
here**: fifteen of those cases are supported product counterexamples, and the
sixteenth, `A-X5`, was an unsupported oracle expectation, now recorded as
**CPR-1 / WS-19** and corrected in this cycle. `A-X5` is not a WS-16 occurrence
and no application defect corresponds to it.

That correction is made in this successor report, as lead-21 directs. The
repair-1 Worker report, its evidence root, its run logs and result files, and
the reviewer's files all stay exactly as handed off; nothing historical was
rewritten. Run 3 of repair-1 correctly records 42 pass / 16 fail for the artifact
state it was bound to, and that record remains accurate for that runner.

## Limitations and findings

### Failed application conformance: 15 cases, all preserved

`T-X1..T-X6`, `H-X1`, `H-X2`, `H-X4`, `B-X1`, `B-X2`, `B-X3`, `B-X6`, `S-X1`,
`S-X2`. All open, none repaired, all open **WS-16**. `B-X6` (CP-3) still
reproduces: both stored copies of the outro join moved to 999 together are
accepted and published beside `raw_output: 3.929`, so a repair adding copy
equality alone would pass `B-X1` and still fail this. Application verification is
**fail** and the runner exits **1**; no count was forced and no green result was
manufactured.

### What this correction does and does not establish

- **Establishes**: the optional-artifact subtree is projected from the saved
  record exactly as its type contract describes, proved by changing that record
  and observing the projection follow it. Paired with `A-C1`, which proves a
  genuine untouched save agrees with its files on disk, the two cases now
  separate the recorded fact from the live one instead of conflating them.
- **Does not establish**: that the recorded size matches the file at read time.
  Nothing here attests current bytes, and `A-X5` no longer claims to. Whether the
  response should also publish a live size for optional artifacts, as
  `media.output` does for the served file, is an open product/design question for
  the lead, not a defect this runner asserts.

### Coverage limits that remain, unchanged from the reviewed round

1. **Crossfade breadth.** One recorded join took `xfade_acrossfade`; the rest
   fell back to hard cuts on these assets. No comprehensive branch matrix.
2. **Historical sample.** Two genuine pre-composition documents exercised, four
   originals hashed. Bounded, not exhaustive.
3. **No decoding and no hashing.** Coherence of stored records and agreement with
   the serving routes. A document whose numbers agree with each other but not
   with the bytes would still pass, exactly as `integrity_verified: false` says.
4. **Selected response states.** The two full-leaf ledgers are one card revision
   and one legacy recovery response; other populated states are covered by the
   named existing cases in `reused_coverage`.
5. **Present-artifact scope.** The fatal `C-R3` claim is the artifact subtree of
   one present-artifact response.
6. **Retained ownership, legacy sidecar and draft coverage** is reused by named
   case and not re-implemented.

### Uncertainty and out-of-scope observations

- The expectations assume the accepted save service wrote every document that
  exists, which holds while production adoption is absent.
- Four of six recorded joins falling back to a hard cut on 640x360 assets remains
  a renderer-side observation, not a defect claim.
- Proposed durable corrections: none. `docs/local-setup.md` needs no change.
- Proposed ledger updates, for the lead to apply: **WS-19**'s required outcome is
  implemented here and its closure needs the fresh independent follow-up, not a
  Worker claim; **WS-16** keeps its fifteen supported occurrences including
  `B-X6`, and `A-X5` should not appear among them.

## Handoff

- Checkpoint or actual handoff: **handed off**, 2026-09-22 (UTC), this Worker
  session. All writes stopped at this report.
- Current implementation owner: returns to the coordinating Project Lead. Not
  self-accepted: application verification remains failed and this is not a
  recommendation.
- Current snapshot: frozen application HEAD `fed8ed1` plus repair-3 manifest
  `6b7807c1…`; corrected verification artifact `4ee3ae7d…` with
  `producer-oracle.py` unchanged at `0a03ba7a…`; bound run `check-run1.log` /
  `check-editor-read-contract-result-run1.json`; identities in
  `artifact-snapshot.json`.
- Unfinished work and unresolved findings: the fifteen conformance failures, all
  open and none repaired; the six coverage limits above; the open design question
  of whether optional artifacts should also publish a live size. No application
  fix, adapter, UI, writing persistence, Cleanup, migration or successor work was
  started.
- Last failed approach: none in this cycle. One bounded correction, one syntax
  pass, one self-check run and one conformance run, all first attempts. No
  application hypothesis was attempted, because lead-21 authorises no repair-4.
- Next action and owner: the coordinating lead arranges the **fresh independent
  follow-up** lead-21 requires on the corrected `A-X5`, the preserved controls
  and failures, and this report's correction of the sixteen-failure conclusion,
  then decides whether and how to scope further application work. This is
  artifact correction round two; reassess before any further relay on this issue.
- Pending Isaac decision: none.
- Durable decisions: none (no ADR).
- Transfer: the evidence root, the edited verification file, the fixture roots
  under `_local/clipperz/tmp/editor-read-contract-*` and the genuine historical
  documents under `_local/clipperz/tmp/saved-revision-*` are ignored files
  needing explicit transfer before review in another checkout. Disposable
  fixtures from this run are left in place; nothing outside them was written.
