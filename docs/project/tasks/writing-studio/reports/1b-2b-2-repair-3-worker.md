---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2b-2-repair-3"
spec_revision: "lead-18"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2-repair-3/snapshot/manifest.json"
author: "worker"
date: "2026-09-21"
state: "active"
summary: "R2a/R2b reassessed correction implemented: one pure read contract validates the whole saved record before projection, and the entry summary decides by-ID capability. All required checks pass; handed back."
read_when: "Reviewing 1B.2b.2 repair-3 evidence for R2a/R2b, disposing B2B2-1..5, or checking the reader's aggregate claim contract."
evidence: "_local/project/evidence/writing-studio/1b-2b-2-repair-3/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Implementation Report: writing-studio / 1b-2b-2-repair-3

Size exception: lead-18 requires a pre-edit claim/invariant table covering five
relationship families, an aggregate correction with separately bound pre-edit and
final evidence, and an explicit account of one reviewer control fixture this
repair now refuses. Full output is in evidence, not here. Evidence paths are
relative to `_local/project/evidence/writing-studio/1b-2b-2-repair-3/`; times UTC.

## Identity and freshness

- Implementation author: Worker, Claude Code desktop session (Claude Opus 5), on
  Isaac's manual relay of lead-18. No agent dispatch; README records
  `Verification delegation: disabled`, so every check below ran in this session.
- Spec: `docs/project/tasks/writing-studio/spec.md` **lead-18**, section "Reader
  R2 reassessment and bounded repair-3 (lead-18)", acceptance **B2B2-1..5**, plus
  the lead-15 assignment and the lead-16/17 repairs it preserves, "Current
  baseline and assumptions", "Current technical constraints" and "Approved
  exceptions currently in force". Repair baseline:
  `reports/1b-2b-2-repair-2-review.md` R2a/R2b with its disposition,
  `reports/1b-2b-2-reassessment-review.md` with its disposition, and
  `reports/1b-2b-2-repair-2-worker.md`.
- Recorded baseline confirmed before editing (`pre-edit/baseline-confirmation.log`):
  HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13`; repair-2 final manifest SHA-256
  `01e88e25f56b208e85dfaf8877dfc6aa2653ffbd5209d1dc08a8392571c3e30f` and pre-edit
  manifest `69189dfe26938442b34c912320f17386cf1cfee6e213feee3ed1bc8fbfc79f20`,
  both matching lead-18. The spec now hashes
  `a994bd38effa62e585d4a4c8be6e651c4844ed75f641198872a61e7fefc4bb4c` rather than
  the `023c8982…` the reassessment review recorded; that review's own disposition
  discloses the later Status/ownership/disposition edits. No application input moved.
- Code snapshot: **two**, because a before-edit reproduction cannot bind to
  repaired sources.
  - `pre-edit-snapshot/manifest.json` SHA-256 `e6beabcc3bbbf9bab06a994114fde26a9ae8373f2dff1ed6c43e4343e48f966a`
    (patch `1425b8a8…`, 30 untracked copies): the reader, models, tests and check
    script still as repair-2 was reviewed. **Every before row binds here.** Its
    four compiled modules hash exactly as the repair-2 reviewer's run recorded
    (`compiled-binding.log`), so the before rows reproduce against the modules
    that review examined.
  - `snapshot/manifest.json` SHA-256 `6b7807c1411dbf1005309d7c2dde3add7530b5a48d0f0c116bfeb86536018c84`
    (same HEAD, same tracked patch `1425b8a8…` because all seven edited or added
    files are untracked; 32 untracked copies, 38 contract inputs, 274 evidence
    files, 0 listed links). **Every after row binds here.**
- Environment: Windows 11; configured local runtime Node **v24.15.0**, CPython
  **3.14.3**, FFmpeg/ffprobe **8.1.1-full_build-www.gyan.dev**
  (`runtime-versions.log`), identical to repair-2 and the accepted predecessor.
  `build-run1.log`/`build-run2.log` and `dist-stable-check.log` show all five
  compiled modules byte-identical across a rebuild on unchanged sources, so the
  logged build, the after reproduction, the demonstration and the HTTP result
  describe one application. Synthetic media and isolated storage only; no AI
  call, no network, no user Library. Isaac's Studio address `127.0.0.1:3847` was
  never started, stopped or restarted; the HTTP check binds an OS-assigned free
  loopback port asserted both `!== 3847` and `!== PODCLI_PORT`.
- Plan freshness (`plan.md`, written before any application edit): **zero
  relevant drift**. HEAD unchanged; all 22 rows of inventory `4.1.0-local-2` hash
  exactly as recorded, before edits and after the last check
  (`pre-edit/instruction-inventory-check.log`, `instruction-inventory-check-final.log`).
  No settled design or approval boundary moved, so nothing paused and no decision
  request is raised.
- Resume before lead reconciliation: Status (lead-18) agrees with the actual tree
  and with the repair-2 report's Handoff. Its "last failed approach" — scalar
  checks that still permit mutually contradictory timing, card and artifact
  records, and a nonempty-only drift predicate that misses unavailable URLs — is
  exactly what this repair changes. Nothing lead-owned was edited. WS-12/17 and
  R2c stay closed with their regressions retained; WS-03/04/05 and legacy
  WS-06/09 remain open and are **not** closed here.
- Implementation: implemented
- Verification: pass
- Submitted for review: yes; acceptance belongs to the coordinating lead after
  fresh independent follow-up. This is the third repair round on R2 and does not
  reset the recurrence history.

## What changed, and why it is a different approach

`plan.md` §3, written before any edit, is the claim contract lead-18 requires: 45
rows over five families (identity and state, serving identity, raw timing, final
composition, card and artifacts), each naming the consumed claim, its stored
origin, the invariant, the accepted producer line that establishes it, the exact
comparison or tolerance source, and the failure behaviour. Rows carried over from
repair-2 are marked kept; 28 are new. §2 lists the five compatibility profiles and
§1 records the tolerance provenance check below.

**One pure boundary.** `src/services/clip-editor-read-contract.ts` is a new
reader-only module with no filesystem, process or save-service import — asserted
by its own test and by the route test's module-graph check. The service reads
(history, documents, sidecars, `stat`) and projects; the contract validates the
whole record — pointer, state, document, recipe, raw receipt, final composition,
producer receipt, card, artifacts and the clip entry's own output summary —
together, and returns validated data. No response builder re-decides a
cross-record fact for itself any more.

**Validating the aggregate, not the fields.** Every counterexample the repair-2
review left open is a set of individually well-typed records that contradict each
other. The new relationships are each derived from the accepted producer:

- **Serving identity (R2b).** The entry summary is now classified as `absent`,
  `invalid`, `different`, `equal` or `untracked`, separately from whether the file
  is on disk and separately from whether it is a container `serveClipById` will
  stream. Only `equal` plus an available file plus a supported container
  advertises committed preview or download; the other classes keep the revision,
  timing and transcript context, emit `COMMITTED_MEDIA_SUMMARY_DRIFT` or the new
  `MEDIA_KIND_UNSUPPORTED`, and set `media.serves` to null. The three facts are
  published separately as `media.summary`. No serving route is changed.
- **Raw timing.** Intro and outro intervals are checked against
  `validateReceipt`'s own equations — intro from zero to asset minus overlap,
  outro running for its asset from one overlap before the content ends to the end
  of the rendered file — with receipt rounding on the interval arithmetic and the
  recorded composition-plus-AV allowance on the join comparisons. Hard-cut
  branches must overlap nothing whether or not `join_inputs` is present, present
  join inputs also constrain asset identity, the clamp and branch eligibility, and
  the receipt's cuts must be the intervals its own recipe asked for. Reverse
  source order, overlapping words and supported hard-cut fallbacks are preserved.
- **Final composition.** The served file must hold the whole raw render shifted by
  the measured card, and the content it publishes must fit inside it; without a
  card the served file must *be* the raw render, with the same file record and the
  same probe. Card frames, ticks, frame length, measured length, packet counts,
  first PTS, the audio start and end, the audio sample count and both tolerances
  are re-derived from the producer receipt's own time base and sample rate, within
  the allowances the composer recorded. Container duration is compared as a lower
  bound, never as an exact decimal sum, so VFR, a delayed video start, AAC padding
  and no-audio cases stay valid.
- **Card and artifacts.** Card provenance and the composition must agree that
  there is a card, and on its image, descriptor and dependency group. Every
  artifact placement is checked against its file record and the writer's own
  domain string: main at zero in served time, raw render at the card offset,
  caption and crop sidecars at the content offset holding no card, card image from
  zero to the card end. Presence must agree both ways, so neither a dangling
  placement nor an unplaced file passes.
- **Domain meanings.** The raw receipt's, the final composition's and the producer
  receipt's time-domain maps are compared with the maps their producers write,
  rather than accepted as any set of strings, because the response quotes them
  verbatim as the meaning of every number beside them.

**Tolerance provenance, confirmed before implementing** (`plan.md` §1). Lead-18
required this. `backend/services/clip_generator.py:1052-1088` writes `tolerance`
and the three-key exact-v1 domain map on every receipt, and `validateReceipt`
requires both. A survey of all 966 saved documents under `_local`
(`pre-edit/saved-document-survey.json`, `pre-edit/time-domain-signatures.log`)
finds 719 genuine documents carrying both; the exceptions are 16 hand-built route
test fixtures, 221 stale 2026-09-13 test-run artifacts written before the writer
pinned the map, and 10 reviewer counterexample fixtures. Repair-2's "absent
tolerance skips the relationship" branch is therefore removed: the tolerance is
required and its equations always apply. The four historical profiles lead-18
names re-hash exactly (`pre-edit/historical-profile-recheck.log`) and are positive
controls in the demonstration. A survey of the same 719 documents against every
new invariant (`pre-edit/writer-invariant-survey.log`) finds five exceptions, all
of them deliberately mutated counterexample fixtures from earlier review and
demonstration runs, named individually in that log.

Preserved throughout: the single strict history read and its coherent snapshot,
R1/WS-12's pre-read ownership boundary, R2c's counter rules, R3/WS-17's legacy
word classification, read-only behaviour, no runtime import of save operations, no
filesystem path in any response, old-document compatibility and the existing
`media.output` context under every summary class.

## Execution Receipt

Two snapshots, as above. Each reproduction records the SHA-256 of the compiled
modules that answered it; `compiled-binding.log` compares them with the recorded
build hashes — before rows to the reviewed repair-2 build, after rows and the
demonstration to the final build, all matching.

| Acceptance ID or check | Exact command/steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| B2B2-1,2,3 counterexamples **before** edits | `node scripts/installation/run.mjs node editor-repair3-before _local/.../1b-2b-2-repair-3/before-repro.mjs`; expect the review's findings to reproduce | 0: **26 cases, all 26 succeed**. Five real producer-backed controls read; the four R2a counterexamples, 12 further coherent contradictions and the absent/null/empty summaries are all served as authoritative with `effective_cuts_known:true`, `serves` set and both committed capabilities true; `summary-unsupported-kind` advertises a url the route answers 400 for | `before-repro-run1.log`, `before-repro-result.json`, `before-repro-summary.json` | pre-edit | self |
| B2B2-1,2,3 counterexamples **after** rebuild | same script, `--after`, after `npm run build` | 0: **26 cases, 10 succeed, 16 refuse**. The five controls still read; 16 contradictions return `REVISION_DOCUMENT_INVALID`; five summary classes degrade with `serves:null` and false capabilities | `after-repro-run1.log`, `after-repro-result.json`, `after-repro-summary.json` | final | self |
| B2B2-1,2,3 corrected demonstration | `node scripts/installation/run.mjs node editor-repair3-demo _local/.../1b-2b-2-repair-3/corrected-demo.mjs` | 0 `Passed`, **32 corrected cases**: 7 real producer-backed controls (card, card with outro and join inputs, composed no-card, no-card with outro, two genuine pre-composition documents, deleted media keeping its writing), 19 asserted refusals including all four review counterexamples and six compensating multi-field mutations, 6 asserted summary degradations | `corrected-demo.mjs`, `corrected-demo-run1.log`, `corrected-demo-result.json` | final | self |
| B2B2-1,2,3,4 focused reader + contract + route | `node scripts/verification/run-tests.mjs node src/services/clip-editor-context.test.ts src/services/clip-editor-read-contract.test.ts src/ui/editor-context-route.test.ts`; expect 0 | 0: 3 files, **186 passed** (repair-2's 135, plus 21 reader, 24 contract and 6 route regressions) | `node-focused-run1.log` | final | self |
| B2B2-5 full Node | `node scripts/verification/run-tests.mjs node`; expect 0 and no regression | 0: 43 files, **691 passed** (repair-2's 640 plus this repair's 51; zero regressions) | `node-full-run1.log` | final | self |
| B2B2-5 build | `node scripts/installation/run.mjs npm build run build`; expect 0 | 0, twice on unchanged sources; `sha256sum -c` shows all five compiled modules byte-identical across the rebuild | `build-run1.log`, `build-run2.log`, `dist-before-rebuild.sha256`, `dist-stable-check.log` | final | self |
| B2B2-5 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json`; expect 0 | 0 | `client-types-run1.log` | final | self |
| B2B2-1,2,3,4,5 actual HTTP + restart | `node --check scripts/verification/check-editor-context.mjs && node scripts/verification/check-editor-context.mjs`; expect 0 `Passed` | 0 `Passed`, **20 step groups**. New here: 14 aggregate contradictions each answering `REVISION_DOCUMENT_INVALID` with a body of exactly `code`+`error`, never `EDITOR_CONTEXT_FAILED` and never a raw exception; and the entry-summary matrix, which drives the by-id preview route with the same summary and records absent→404, null→404, empty→404, not-a-path→404, another file→200 of that other file, unsupported container→400, with the response degrading to `serves:null` and the matching reason each time. Retained: real card revision, legacy conflicts, recovery-input distinctions, root/sidecar junctions, corrupt history and document, 404/prefix/traversal, Host 403, cross-origin 403, same-origin 200, download bytes identical, unknown fields intact, no `revisions` added, identical bodies after stop/restart on a second free port | `check-editor-context-run1.log`, `check-editor-context-run1-result.json` (fixture `editor-context-HakWsC`) | final | self |
| B2B2-4 stored bytes unchanged | Whole-fixture SHA-256 tree hashed before the first request and re-compared after the first server, after the repaired cases and after the restart, inside the HTTP check | 0: identical file set and identical hashes at all three points; every mutated fixture file restored to its original hash inside the run; the new unstreamable-container copy is created before the fixture is hashed, so it is covered like every other stored file | `check-editor-context-run1.log` (`no adoption, no writes`, `after the repaired cases`, `after the restart`) | final | self |
| B2B2-4 write-area audit | `sha256sum -c` of the 25 pre-edit boundary hashes plus `git status --porcelain=v1 -uall` | Exactly **5** existing files changed and **2** new files added, all inside lead-18's expected write set. Unchanged: `web-server.ts`, `editor-context-route.ts`, `clip-revisions.ts` and its models and tests, `clips-history.ts`, `config/policy.ts`, `config/paths.ts`, `storage-cleanup.ts`, all four Python files, both saved-revision/exact bridges, `package.json` and `package-lock.json` | `write-area-audit-run1.log`, `pre-edit/boundary.sha256` | final | self |
| B2B2-4,5 retained-evidence inputs and boundaries | `node _local/.../1b-2b-2/retained-inputs-check.mjs "$PWD"`, then the same check extended for this repair's two new files | Original: 2 problems, both naming this repair's new module and its test as unlisted. The accepted cycle's script was read, never written; it hashes `930698f7…` after the run. Extended copy: 0 problems, `OK`. Both runs: 20 distinct covered inputs unchanged since the accepted snapshot, all 9 working-tree Python/renderer/script entries unchanged, 0 Python files referencing the new module, and the revision save service **not** reachable from the studio in source (30 files) or in compiled `dist` (30 files) | `retained-inputs-check-run1.log`, `retained-inputs-check-repair3-run1.log`, `retained-inputs-check.mjs` | final | self |
| — reviewer and reassessment evidence preserved | SHA-256 of every file beneath `1b-2b-2-repair-2/review/` and `1b-2b-2-reassessment/`, recorded before the first run and re-compared after the last | 165 and 2 entries identical both times; nothing in either directory was written, moved, renamed or restored, because every fixture this cycle uses is a fresh copy under this repair | `pre-edit/reviewer-repair2-review-dir.sha256`, `pre-edit/reassessment-dir.sha256`, `reviewer-dirs-unchanged.log` | both | self |
| B2B2-5 Python (retained, not rerun) | 1B.2b.1 `py_compile`, `-k opening_card`, `-k "opening_card or exact_render"`, full Python | Retained: 14 passed/32 subtests; 91/155; **991 passed, 6 skipped, 313 subtests**. No Python, Python test or lock input changed (rows above); Python does not import TypeScript and no Python file references this module; this repair edits no renderer path | `../1b-2b-1/python-*.log`, `../1b-2b-1/py-compile-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| B2B2-5 exact bridge (retained) | `node scripts/verification/check-exact-render.mjs` | Retained: 0 `Passed`. Its covered renderer and executor inputs are unchanged; this repair adds no Python and no renderer path | `../1b-2b-1/check-exact-render-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| B2B2-5 saved-revision bridge (retained) | `node scripts/verification/check-saved-revision.mjs` | Retained: 0 `Passed`, 2026-09-15T21:44:13Z, citing the **accepted repair-1** run as the repair-1 review's citation correction requires. Its covered inputs are unchanged; this repair's own HTTP check independently re-exercises the same save path to build its fixture | `../1b-2b-1-repair-1/check-saved-revision-run1.log`, `…-result.json` | 1B.2b.1 repair-1 snapshot | self (1B.2b.1 repair-1 Worker session) |
| B2B2-5 preview parity (retained) | `node scripts/verification/check-preview-render.mjs` | Retained: 0 `Passed`, on unchanged flow and dependencies only. Starting the HTTP server is **not** preview/export parity and no parity claim is made from it; the HTTP check separately proves the existing preview 206 and download bytes | `../1b-2b-1/check-preview-render-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| AC-12 instructions | Inventory `4.1.0-local-2` hashed before edits and after the last check | 22 of 22 both times | `pre-edit/instruction-inventory-check.log`, `instruction-inventory-check-final.log` | both | self |
| AC-12 snapshots | `snapshot-capture.mjs --pre-edit` before edits; `snapshot-capture.mjs` then `--check` after the last check | pre-edit capture 0; final capture 0; `--check` 0, `No drift.` | `pre-edit-snapshot/`, `snapshot/`, `pre-edit-snapshot-capture.log`, `snapshot-capture.log`, `snapshot-check.log` | both | self |

- Executor identities and target: `self` is this Worker session on the configured
  local runtime against disposable fixtures; retained rows name the 1B.2b.1 and
  1B.2b.1 repair-1 Worker sessions and their own snapshots.
- Runtime coverage: success and failure paths through the real studio process over
  real HTTP, including the local host/origin middleware, a stop/restart on a
  second free port, real Windows junctions at the configured history root, the
  history file, the `revisions` ancestor and a legacy sidecar directory, the
  existing by-id preview route driven against each summary class, and refusals for
  every repaired class.
- Human assistance: none.
- Not applicable: browser/Studio walkthrough (this slice adds no UI and the
  assignment does not claim browser checks); live AI smoke test (no AI call).
- Not run: Python suites, exact bridge, saved-revision bridge and preview parity,
  retained above with covered-input hashes and dependency justification. Also not
  run: socket-level assertions inside vitest — the harness
  (`scripts/verification/node-offline.mjs`) deliberately blocks `fetch`,
  `http.request` and outbound TCP as a tripwire, so the route tests drive the real
  registered handler directly and all HTTP-level proof lives in the disposable
  check. Weakening that tripwire was rejected again here.
- Changed inputs after checks: none. After the final snapshot capture only this
  report was written, and it is in the manifest's excluded list.

## Change inventory

Git-derived against HEAD and the pre-edit snapshot's untracked copies
(`write-area-audit-run1.log`, both manifests). All seven files are untracked, so
the tracked patch is unchanged and the untracked copies carry every edit:

- `src/services/clip-editor-read-contract.ts` (**new**, 1,243 lines): the pure
  boundary. Absorbs the state, document and draft validators, adds the aggregate
  relationships and the entry-summary classification, and duplicates the producer
  constants and the two pieces of renderer arithmetic (`concatJoin`, the card
  frame count) so the reader keeps no runtime edge to the save service.
- `src/services/clip-editor-read-contract.test.ts` (**new**, 149 lines): 24 tests
  proving the module is pure and import-free of the save service, plus the summary
  classification, the served-file kind and the state rules.
- `src/services/clip-editor-context.ts` (1,796 → 1,302 lines): the validators move
  out; the service reads, calls the contract once and projects from the result;
  `media.summary` is published; the committed capabilities follow summary, file
  state and container kind in the order `serveClipById` applies them.
- `src/models/clip-editor-context.ts` (445 → 468): the `MEDIA_KIND_UNSUPPORTED`
  reason and diagnostic codes, the `EditorContextMediaSummary` shape, and the
  broadened meaning of the drift code. Type and constant only.
- `src/services/clip-editor-context.test.ts` (1,364 → 1,582): 21 new regressions
  in two blocks — the aggregate relationships against a real card commit, and the
  entry-summary matrix — including a pre-composition control read exactly as saved.
- `src/ui/editor-context-route.test.ts` (420 → 545): 6 new adapter regressions,
  the module-graph assertion extended to the new boundary, and one repaired
  fixture (below).
- `scripts/verification/check-editor-context.mjs` (716 → 876): two new real-HTTP
  step groups and the unstreamable-container copy created before the fixture hash.
- Unchanged: `src/ui/web-server.ts`, `src/ui/editor-context-route.ts`, all Python,
  the renderer, `clips-history.ts`, `clip-revisions.ts` and its models and tests,
  Cleanup, `config/policy.ts`, `config/paths.ts`, every existing route, CLI/MCP,
  the client UI, packages, lead records, instructions, prior reports and all
  earlier evidence directories.

## Deviations and decision requests

No decision request. Delegated choices worth review:

- **One reviewer control fixture is now refused, with counterevidence.** The
  repair-2 reviewer's `old-optional-absent` case deletes `final_composition` from
  a card document while leaving `thumbnail_card.applied: true`, and the review
  treats its success as correct old-document behaviour. This repair refuses that
  state. The opening-card composer and `final_composition` arrived in the same
  slice (1B.2b.1) and the save service rejected every card request before it, so
  no writer produced an applied card without a composition; the response would
  otherwise report a card over card-free raw timing. All four genuine historical
  profiles and all 719 genuine documents on disk carry `applied: false` where
  there is no composition. The reviewer's files are untouched; the demonstration
  supplies two *genuine* pre-composition controls in its place, and the reader
  still reads a real pre-composition document with its absence diagnostics.
- **`render_timeline.tolerance` is required, not optional.** Justified in
  `plan.md` §1 against the producer and 966 documents on disk. Treating it as
  optional is what let repair-2 skip the tolerance-scaled relationships entirely.
- **The three time-domain maps are pinned to their producers.** This is the only
  way to validate what the response *means* by the numbers beside them, which the
  `wrong-artifact-domain` counterexample is about. The only non-matching documents
  found anywhere are pre-4.1.0 test-run artifacts and deliberately malformed
  fixtures; both are named in `pre-edit/time-domain-signatures.log`.
- **The container relationship is a lower bound, not an equation.** The served
  file may not be shorter than the raw render plus the measured card, or shorter
  than its own content offset plus measured content, within the recorded card and
  audio allowances. No exact decimal sum is assumed, so VFR, delayed video starts,
  AAC padding and no-audio cases stay valid — the reassessment review's explicit
  caution.
- **`media.serves` is null for an unsupported container as well as for a summary
  that is not `equal`.** In both cases no url in the response reaches the revision
  described. A merely missing file keeps its identity, because the same route
  would serve exactly this revision again once the file is back at that path.
- **The served-file kind is judged from the recorded path.** No link is resolved
  and no file is opened for it, so a link whose target has another extension is
  not detected; `serveClipById` realpaths before checking. Recorded as a limit.
- **A copy of the 1B.2b.2 retained-inputs check was used, not an edit.** The
  accepted cycle's script cannot know this repair's two new files. It was run
  unmodified first, its two expected problems recorded, and an extended copy under
  this repair's evidence run for the clean result.

## Limitations and findings

- Defects: none found in accepted predecessor work beyond the two upheld findings,
  and none introduced. No new ledger class is proposed; R2a and R2b are the reader
  occurrences the lead already indexed as WS-16. WS-12, WS-17 and R2c stay closed
  with their regressions retained. WS-03/04/05 and legacy WS-06/09 remain open.
- **Failed attempts, preserved.** Two, both before any check was claimed. The
  first before-reproduction refused all 26 cases including the controls, because
  the fixture entries were renamed while the documents kept their own `clip_id`;
  the builder was corrected to derive the entry from the document as a commit
  does, and the run was repeated. The first `summary-unsupported-kind` case
  reported `MEDIA_MISSING` rather than proving the kind gate, because only the
  records were renamed and no file existed at the new path; it was corrected to a
  real byte copy inside the fixture. One focused-test failure after the first
  build (`editor-context-route.test.ts`, 1 failed / 134 passed) came from that
  suite's hand-built document, which carried a one-key time-domain map and no
  tolerance — a state no producer writes; it was repaired to the real exact-v1 map
  and a real tolerance rather than by weakening the check. None of these is an
  unsuccessful round on the findings themselves.
- Uncertainty and out-of-scope observations:
  - Validation remains structural and relational, not cryptographic. Media
    availability is still `stat` only and `integrity_verified` is still a literal
    `false`; a document whose stored numbers are mutually consistent but untrue to
    the bytes on disk would still be served. The producer's stream summaries are
    records, not the packets themselves: they establish what the composer measured
    and refused, never what the file contains now.
  - The relationships assume the accepted save service wrote every document that
    exists, which holds while production adoption is absent. A document from a
    future writer with different invariants would be refused rather than misread —
    the safe direction, but an assumption.
  - No genuine document on disk carries an optional caption-overlay or
    cropped-source artifact, so their domain strings and placements are validated
    from `buildFinalComposition` rather than from an observed save. A real
    `keep_caption_overlay` save would be useful coverage for a later slice.
  - 221 stale documents under `_local/clipperz/tmp/step-4-tests/…/podcli-revisions-*`,
    written 2026-09-13 before the writer pinned the exact-v1 domain map, would be
    refused by this reader. They are test-run artifacts on no production read path
    and are not treated as a historical profile; they are reported here rather than
    accommodated, as lead-18 directs.
  - Ownership remains a static check of the chain as it exists at read time, and
    summary drift is reported and disowned, never resolved: the response does not
    decide which file is right and no serving route is changed.
  - The response is still a captured view, and a consumer acting on it must
    re-read. No production caller uses this route and no UI consumes it.
- Proposed durable corrections: none. `docs/local-setup.md` needs no change.

## Handoff

- Checkpoint or actual handoff: **handed off**, 2026-09-21 (UTC), this Worker
  session. Implementation writes stopped at this report.
- Current implementation owner: returns to the coordinating Project Lead for fresh
  independent follow-up; not self-accepted.
- Current snapshot: HEAD `fed8ed1` plus `snapshot/manifest.json`
  (`6b7807c1…`), tracked patch `1425b8a8…`, 32 untracked copies. The pre-edit rows
  bind to `pre-edit-snapshot/manifest.json` (`e6beabcc…`).
- Unfinished work and unresolved findings: none in slice scope. No adapters, UI,
  writing persistence, Cleanup, migration or successor work was started.
- Last failed approach: the two reproduction-builder errors and the one
  unsupported route-test fixture described above, each corrected against a real
  writer state rather than retried.
- Next action and owner: the coordinating lead arranges fresh independent
  follow-up review of this snapshot against lead-18 and inventory
  `4.1.0-local-2`, then disposes R2a/R2b and B2B2-1..5. This is repair round three
  on R2 and resets no recurrence history; lead-18 requires an unsuccessful
  same-class follow-up to return to the lead, with no automatic fourth repair. No
  commit, push, release, agent dispatch or automatic successor.
- Pending Isaac decision: none.
- Durable decisions: none (no ADR).
- Transfer: evidence, both snapshots, fixtures and the installation config are
  ignored `_local` files needing explicit transfer before review in another
  checkout. Disposable fixtures left in place: `repro-fixtures-before/`,
  `repro-fixtures-after/` and `demo-fixtures/` under this repair, and the HTTP
  check's own `_local/clipperz/tmp/editor-context-HakWsC`. The repair-2 reviewer's
  and the reassessment's directories are byte-identical to their recorded pre-edit
  hashes.
