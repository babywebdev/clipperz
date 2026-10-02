---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2b-2-repair-2"
spec_revision: "lead-17"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2-repair-2/snapshot/manifest.json"
author: "worker"
date: "2026-09-21"
state: "active"
summary: "R1/R2a/R2b/R2c repaired: the history boundary is proved before clips.json is read, and consumed ranges, media identity and pointer counters are validated. All required checks pass; handed back."
read_when: "Reviewing 1B.2b.2 repair-2 evidence for R1/R2, disposing B2B2-1..5, or checking the reader's read order and claim invariants."
evidence: "_local/project/evidence/writing-studio/1b-2b-2-repair-2/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Implementation Report: writing-studio / 1b-2b-2-repair-2

Size exception: lead-17 requires a documented owned-read sequence and a
claim/invariant table derived from actual writer states, four upheld findings
each with its own correction, and separately bound pre-edit and final evidence.
Full output is in evidence, not here. Evidence paths are relative to
`_local/project/evidence/writing-studio/1b-2b-2-repair-2/`; times are UTC.

## Identity and freshness

- Implementation author: Worker, Claude Code desktop session (Claude Opus 5), on
  Isaac's manual relay of lead-17. No agent dispatch; README records
  `Verification delegation: disabled`, so every check below ran in this session.
- Spec: `docs/project/tasks/writing-studio/spec.md` **lead-17**, section
  "1B.2b.2 repair-2: pre-read ownership and coherent claims", acceptance
  **B2B2-1..5**, plus the lead-15 assignment and lead-16 repair it preserves,
  "Current baseline and assumptions", "Current technical constraints" and
  "Approved exceptions currently in force". Repair baseline:
  `reports/1b-2b-2-repair-1-review.md` R1/R2a/R2b/R2c with the coordinating-lead
  disposition, `reports/1b-2b-2-repair-1-worker.md`, and the reviewer's
  `repro.mjs` / `root-junction.mjs` and their result files.
- Code snapshot: **two**, because a before-edit reproduction cannot bind to
  repaired sources — the qualification the repair-1 review made.
  - `pre-edit-snapshot/manifest.json` SHA-256 `69189dfe...` (patch
    `e6e26337...`, 27 untracked copies): HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13`
    with the reader, models, tests and check script still as reviewed. **Every
    before row binds here.**
  - `snapshot/manifest.json` SHA-256 `01e88e25...` (same HEAD, same tracked
    patch `e6e26337...` because all five edited files are untracked; 27
    untracked copies, 35 contract inputs, 352 evidence files, 15 listed links).
    **Every after row binds here.**
  Comparing the two manifests shows exactly five changed files, all inside
  lead-17's expected write set, zero workflow or instruction change and an
  unchanged HEAD.
- Environment: Windows 11; configured local runtime Node **v24.15.0**, CPython
  **3.14.3**, FFmpeg/ffprobe **8.1.1-full_build-www.gyan.dev**
  (`runtime-versions.log`), identical to repair-1 and the accepted predecessor.
  `build-run1.log`/`build-run2.log` plus `dist-stable-check.log` show the four
  compiled modules byte-identical across a rebuild on unchanged sources, so the
  logged build, the reproductions and the HTTP result describe one application.
  The pre-edit compiled reader hashes to `fab383d2...`, the same binary the
  reviewer's `root-junction-result.json` recorded, so the before rows reproduce
  against exactly the modules the review examined. Synthetic media and isolated
  storage only; no AI call, no network, no user Library. Isaac's Studio address
  `127.0.0.1:3847` was never started, stopped or restarted; the HTTP check binds
  an OS-assigned free loopback port asserted both `!== 3847` and `!== PODCLI_PORT`
  (57900 then 57912 in the recorded run).
- Plan freshness (`plan.md`, written before any application edit): **zero
  relevant drift**. HEAD unchanged at `fed8ed1`; all 22 rows of inventory
  `4.1.0-local-2` hash exactly as recorded, before edits and after the last
  check (`instruction-inventory-check.log`, `instruction-inventory-check-final.log`).
  No settled design or approval boundary moved, so nothing paused and no
  decision request is raised.
- Resume before lead reconciliation: Status (lead-17) agrees with the actual
  tree and with the repair-1 review's Handoff. Its "last failed approach" —
  sidecar checks that missed the initial history read, finite-number checks that
  missed ranges and identity, and fixture convenience standing in for a
  supported writer state — is exactly what this repair changes. Nothing
  lead-owned was edited. WS-03/04/05 and legacy WS-06/09 remain open and are
  **not** closed here; WS-17 stays closed and its regressions are retained.
- Implementation: implemented
- Verification: pass
- Submitted for review: yes; acceptance belongs to the coordinating lead after
  fresh independent follow-up.

## Owned-read sequence and claim invariants

`plan.md` §1 and §2, written before any edit, carry the two tables lead-17
requires. §1 lists all nine filesystem reads in order with the boundary each
needs; §2 lists every response claim, the stored field behind it and the
invariant the **accepted writer** actually guarantees, citing the writer line
that establishes it. The invariants were derived by reading the writer, not the
fixtures: `ensureTracked` (clip-revisions.ts:1283-1313), `saveDraft` (1330-1377),
the commit transaction (1565-1620), `applyLegacySummary` (2051-2075),
`buildFinalComposition` (1178-1243), the document assembly (1512-1541),
`validateReceipt` (582-830), `validateRecipeShape` (293-334) and
`validateComposition` (1781-1930). Rows the pre-edit reader did not hold are
marked as gaps there; each one is repaired below.

## The four repairs

**R1 / WS-12, the boundary before the read.** `assertHistoryOwned()` now runs at
the top of `captureEntry`, before `readHistoryStrict` opens anything. It reuses
the existing two-boundary `inspectOwnedFile` with the configured history root as
both chain root and containment, so the root itself, every intervening component
and the history file are `lstat`-ed and a link at any position is refused
without being resolved. Ordinary semantics are untouched: a missing root or file
is absent and still reads as an empty Library, answering 404 for a specific
clip; a component of the wrong kind is `HISTORY_UNREADABLE`, which keeps a
genuinely unreadable regular history distinguishable. Separately, a link in an
app-owned sidecar directory now raises `OWNERSHIP_ESCAPE` instead of degrading
that recovery input to `unreadable`; an ordinary unreadable sidecar keeps its own
state. No ancestor above the configured root is inspected, no escaped root is
`realpath`-ed and adopted, external legacy media paths are unaffected, and this
stays a static check with no concurrent-swap guarantee.

**R2a / WS-16, ranges and relationships.** Consumed numbers are now bounded by
the renderer and recipe contract rather than by finiteness: non-negative content
lengths and offsets, a strictly positive rendered duration, non-negative bookend
intervals that run forwards, a branch from the composition helper's own
supported set, crop keyframes with `t ≥ 0`, `0 ≤ x_pct ≤ 100` and — for a
rendered revision — `t` inside its own content, a non-negative fade, a positive
probe and card duration, and non-negative artifact positions. Relationships the
response publishes together are re-derived from the document's **own recorded
tolerances**: measured content against content duration, the rendered length
against offset plus measured content plus outro, the content offset against the
intro's end, the probe against the receipt when there is no card, and the probe
against the composition record that quotes the same probe. An "unavailable"
transcript may no longer carry editorial words or text, and an editorial word may
not end after the content it was cut from. Legitimate reverse source order,
overlapping words, the documented rounding and the accepted hard-cut fallbacks
are preserved; `final_composition`, `join_inputs` and pointer `groups` stay
optional, and an absent recorded tolerance simply skips the tolerance-scaled
relationships rather than failing an older document.

**R2b / WS-16, media identity.** A document whose `files.main.path` is not the
pointer's `output_path`, under the same lexical normalisation the write side
uses, is now a stable `REVISION_DOCUMENT_INVALID`; so is a composition record
whose own `output.file` is not that file, or a card image that is not the
composed card or does not run to the reported card offset. For the separate
legacy-summary case — pointer and document agree, but the clip entry's
`output_path`, which the existing by-ID preview and download routes resolve
through, has moved — the response keeps the clip, revision, timing and
transcript context, emits the new `COMMITTED_MEDIA_SUMMARY_DRIFT` diagnostic,
sets both committed media capabilities false with that reason, and sets
`media.serves` to null. No existing serving route is changed, and nothing here
hashes or re-probes a file.

**R2c / WS-16, counters and pointers.** A positive `revision_version` with no
`current`, and a positive `draft_version` with no `draft`, are now
`REVISION_STATE_INVALID`. Both follow from the writer: `ensureTracked` is the
only producer of a null `current` and only for an entry with no output, at
version zero; commit publishes the pointer and its counter in one transaction;
`saveDraft` publishes the draft and its counter together; and no operation in the
service clears either. Genuine version-zero states are preserved and now have
real controls. No ordering rule was added for `previous`, which the response
never quotes.

Preserved throughout: the single strict history read and its coherent snapshot,
read-only behaviour, no runtime import of save operations, no filesystem path in
any response, old-document compatibility, and R3/WS-17's legacy word
classification with its regressions.

## Execution Receipt

Two snapshots, as above. `pre-edit` = `pre-edit-snapshot/manifest.json`;
`final` = `snapshot/manifest.json`. Each reproduction result records the SHA-256
of the four compiled modules that answered it, and those hashes were compared
with the matching snapshot's recorded hashes (`before` rows resolve to the
pre-edit boundary hashes, `after` rows to the current ones).

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| B2B2-1,2,3 counterexamples **before** edits | `node scripts/installation/run.mjs node editor-repair2-before _local/.../1b-2b-2-repair-2/before-repro.mjs`; expect the review's findings to reproduce | 0: control succeeds; negative durations, reversed bookend, invalid keyframe, unavailable-with-content and wrong playback identity all **succeed** with `effective_cuts_known:true` and true committed capabilities; summary drift keeps `serves` and both capabilities with a misleading `MEDIA_MISSING`; missing current succeeds as `tracked-without-revision`; null draft beside counter 1 succeeds | `before-repro-run1.log`, `before-repro-result.json`, `before-repro-summary.json` | pre-edit | self |
| B2B2-3 R1 **before** edits | `node scripts/installation/run.mjs node editor-repair2-root-before _local/.../1b-2b-2-repair-2/root-junction-before.mjs` | 0: linked configured root, linked history file and linked legacy sidecar all **succeed** and serialise the outside title and transcript; real-root control succeeds | `before-root-junction-run1.log`, `before-root-junction-result.json` | pre-edit | self |
| — reviewer evidence preserved | SHA-256 of every file beneath the reviewer's `review/` and `repro-fixtures/` directories, recorded before the first run and re-compared after the last | 82 and 163 entries identical both times; nothing in the reviewer's directories was written, moved, renamed or restored, because both reproductions write only under this repair | `pre-edit/reviewer-review-dir.sha256`, `pre-edit/reviewer-repro-fixtures.sha256`, `hash-tree.mjs` | both | self |
| B2B2-1,2,3 counterexamples **after** rebuild | same script, `--after`, after `npm run build` | 0: control still succeeds; `REVISION_DOCUMENT_INVALID` ×5, `REVISION_STATE_INVALID` ×3, summary drift keeps context with `serves:null` and both capabilities false at `COMMITTED_MEDIA_SUMMARY_DRIFT`; legacy words still `malformed` | `after-repro-run1.log`, `after-repro-result.json`, `after-repro-summary.json` | final | self |
| B2B2-3 R1 **after** rebuild | same script, `--after` | 0: all three linked cases `OWNERSHIP_ESCAPE`; no outside title or transcript anywhere in the result; the identical content in a real root still reads | `after-root-junction-run1.log`, `after-root-junction-result.json` | final | self |
| B2B2-1,2,3 corrected demonstration | `node scripts/installation/run.mjs node editor-repair2-demo _local/.../1b-2b-2-repair-2/corrected-demo.mjs` | 0 `Passed`, **34 corrected cases**: real-writer controls built by `ensureTracked` (no output, and with a legacy output) and `saveDraft`; the real committed revision with its real draft; an accepted older document without final composition; junctions at the configured root, the history file and a legacy sidecar; an unreadable regular sidecar and a missing history keeping their semantics; 13 R2a refusals, 2 R2b refusals plus the drift case, 2 R2c refusals and the retained R2/R3 regressions | `corrected-demo.mjs`, `corrected-demo-run1.log`, `corrected-demo-result.json` | final | self |
| B2B2-1,2,3,4 focused reader + route | `node scripts/verification/run-tests.mjs node src/services/clip-editor-context.test.ts src/ui/editor-context-route.test.ts`; expect 0 | 0: 2 files, **135 passed** (repair-1's 105 with 3 repaired fixtures, plus 30 new regressions for R1/R2a/R2b/R2c) | `node-focused-run1.log` | final | self |
| B2B2-5 full Node | `node scripts/verification/run-tests.mjs node`; expect 0 and no regression | 0: 42 files, **640 passed** (repair-1's 610 plus this repair's 30; zero regressions, no file-count change) | `node-full-run1.log` | final | self |
| B2B2-5 build | `node scripts/installation/run.mjs npm build run build`; expect 0 | 0, twice on unchanged sources; `sha256sum -c` shows all four compiled modules byte-identical across the rebuild | `build-run1.log`, `build-run2.log`, `dist-before-rebuild.sha256`, `dist-stable-check.log` | final | self |
| B2B2-5 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json`; expect 0 | 0 | `client-types-run1.log` | final | self |
| B2B2-1,2,3,4,5 actual HTTP + restart | `node --check scripts/verification/check-editor-context.mjs && node scripts/verification/check-editor-context.mjs`; expect 0 `Passed` | 0 `Passed`, **18 step groups**. New here: the configured history root as a junction → `OWNERSHIP_ESCAPE` with no outside title or transcript in the body, the real history unchanged and the clip reading again once the junction is gone; a linked legacy `words/` directory → `OWNERSHIP_ESCAPE` with the target unchanged; 17 malformed-document and 2 malformed-state cases → stable domain codes, body keys exactly `code`+`error`, never `EDITOR_CONTEXT_FAILED` and never a raw exception; entry-summary drift → 200 with revision and timing intact, `serves:null`, both committed capabilities false and the drift diagnostic, then normal service once the summary is restored. Retained: real card revision, legacy conflicts, recovery-input distinctions, corrupt history/document, 404/prefix/traversal, Host 403, cross-origin 403, same-origin 200, download bytes identical, unknown fields intact, no `revisions` added, identical bodies after stop/restart on a second free port | `check-editor-context-run1.log`, `check-editor-context-run1-result.json` (fixture `editor-context-9YKm6w`) | final | self |
| B2B2-4 stored bytes unchanged | Whole-fixture SHA-256 tree hashed before the first request and re-compared after the first server, after the repaired cases and after the restart, inside the HTTP check | 0: identical file set and identical hashes at all three points; source bytes unchanged; every mutated fixture file restored to its original hash inside the run; the repair-2 steps create no file inside the fixture (the decoy history lives outside it and is removed) | `check-editor-context-run1.log` (`no adoption, no writes`, `after the repaired cases`, `after the restart`) | final | self |
| B2B2-4 write-area audit | `sha256sum -c` of 24 pre-edit boundary hashes plus `git status --porcelain=v1 -uall` | Exactly **5** source files changed, all inside lead-17's expected write set, plus the rebuilt `dist/services/clip-editor-context.js`. Unchanged: `web-server.ts`, `editor-context-route.ts`, `clip-revisions.ts`, `clips-history.ts`, `models/clip-revisions.ts`, `models/index.ts`, `config/policy.ts`, `config/paths.ts`, `storage-cleanup.ts` and all four Python files | `write-area-audit-run1.log`, `pre-edit/boundary.sha256` | final | self |
| B2B2-4,5 retained-evidence inputs and boundaries | `node _local/project/evidence/writing-studio/1b-2b-2/retained-inputs-check.mjs "$PWD"`; expect 0 problems | 0: 20 distinct covered inputs unchanged since the accepted snapshot; all 9 working-tree Python/renderer/script entries unchanged; 0 Python files reference the new module; the revision save service is **not** reachable from the studio in source (29 files) or in compiled `dist` (29 files) | `retained-inputs-check-run1.log` | final | self |
| B2B2-5 Python (retained, not rerun) | 1B.2b.1 `py_compile`, `-k opening_card`, `-k "opening_card or exact_render"`, full Python | Retained: 14 passed/32 subtests; 91/155; **991 passed, 6 skipped, 313 subtests**. No Python, Python test or lock input changed (row above); Python does not import TypeScript and no Python file references this module; this repair edits no renderer path | `../1b-2b-1/python-*.log`, `../1b-2b-1/py-compile-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| B2B2-5 exact bridge (retained) | `node scripts/verification/check-exact-render.mjs` | Retained: 0 `Passed`. Its covered renderer and executor inputs are unchanged; this repair adds no Python and no renderer path | `../1b-2b-1/check-exact-render-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| B2B2-5 saved-revision bridge (retained) | `node scripts/verification/check-saved-revision.mjs` | Retained: 0 `Passed`, 2026-09-15T21:44:13Z. Cites the **accepted repair-1** run, as the repair-1 review's citation correction requires. Its covered inputs are unchanged; this repair's own HTTP check independently re-exercises the same save path to build its fixture | `../1b-2b-1-repair-1/check-saved-revision-run1.log`, `../1b-2b-1-repair-1/check-saved-revision-run1-result.json` | 1B.2b.1 repair-1 snapshot | self (1B.2b.1 repair-1 Worker session) |
| B2B2-5 preview parity (retained) | `node scripts/verification/check-preview-render.mjs` | Retained: 0 `Passed`, on unchanged flow and dependencies only. Starting the HTTP server is **not** preview/export parity and no parity claim is made from it; the HTTP check separately proves the existing preview 206 and download bytes | `../1b-2b-1/check-preview-render-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| AC-12 instructions | Inventory `4.1.0-local-2` hashed before edits and after the last check | 22 of 22 both times | `instruction-inventory-check.log`, `instruction-inventory-check-final.log` | both | self |
| AC-12 snapshots | `node _local/.../1b-2b-2-repair-2/snapshot-capture.mjs "$PWD" --pre-edit` before edits; `... "$PWD"` then `--check` after the last check | pre-edit capture 0; final capture 0; `--check` 0, `No drift.` | `pre-edit-snapshot/`, `snapshot/`, `pre-edit-snapshot-capture.log`, `snapshot-capture.log`, `snapshot-check.log` | both | self |

- Executor identities and target: `self` is this Worker session on the configured
  local runtime against disposable fixtures; retained rows name the 1B.2b.1 and
  1B.2b.1 repair-1 Worker sessions and their own snapshots.
- Runtime coverage: success and failure paths through the real studio process
  over real HTTP, including the local host/origin middleware, a stop/restart on
  a second free port, real Windows junctions at the configured history root, the
  history file, the `revisions` ancestor and a legacy sidecar directory, and
  refusals for every repaired class.
- Human assistance: none.
- Not applicable: browser/Studio walkthrough (this slice adds no UI and the
  assignment does not claim browser checks); live AI smoke test (no AI call).
- Not run: Python suites, exact bridge, saved-revision bridge and preview parity,
  retained above with covered-input hashes and dependency justification. Also not
  run: socket-level assertions inside vitest — the harness
  (`scripts/verification/node-offline.mjs`) deliberately blocks `fetch`,
  `http.request` and outbound TCP as a tripwire, so the route tests drive the
  real registered handler directly and all HTTP-level proof lives in the
  disposable check. Weakening that tripwire was rejected again here.
- Changed inputs after checks: none in the recorded run. One earlier source
  change did invalidate an earlier pass: removing the `EditorSidecarState`
  import that the R1 sidecar change made redundant. Every after row, the HTTP
  check, both builds, the demonstration and the audits above were rerun against
  the corrected sources and the recorded logs are those reruns, so no row cites
  a superseded build. After the last check only the final snapshot, its logs,
  the final inventory log and this report were written.

## Change inventory

Git-derived against HEAD and the pre-edit snapshot's untracked copies
(`write-area-audit-run1.log`, both manifests). All five files were introduced by
the reviewed cycle and are still untracked, so the tracked patch is unchanged
and the untracked copies carry every edit:

- `src/services/clip-editor-context.ts` (1,581 → 1,796 lines; 335 changed): the
  pre-read history boundary, sidecar escapes surfacing as `OWNERSHIP_ESCAPE`,
  range and relationship validation across recipe, timeline, bookends, probe,
  card and final composition, document/pointer media identity, entry-summary
  drift handling, and the positive-counter pointer rules.
- `src/models/clip-editor-context.ts` (433 → 445; 14 changed): the
  `COMMITTED_MEDIA_SUMMARY_DRIFT` reason and diagnostic codes and the documented
  meaning of `media.serves`. Type-only: the compiled module is unchanged.
- `src/services/clip-editor-context.test.ts` (1,064 → 1,364; 330 changed): 25 new
  reader regressions in four blocks, one per finding, plus three repaired
  fixtures (two sidecar-junction expectations that encoded repair-1's downgrade,
  and the older-document control, which had grafted an intro onto a render made
  without one — a state no renderer or save produces).
- `src/ui/editor-context-route.test.ts` (343 → 420; 79 changed): 5 new adapter
  regressions proving the repaired refusals reach the client as stable domain
  codes with a `code`+`error` body.
- `scripts/verification/check-editor-context.mjs` (563 → 716; 153 changed): four
  new real-HTTP step groups and an updated header contract.
- Unchanged: `src/ui/web-server.ts`, `src/ui/editor-context-route.ts`, all
  Python, the renderer, `clips-history.ts`, `clip-revisions.ts` and its models,
  Cleanup, `config/policy.ts`, `config/paths.ts`, every existing route, CLI/MCP,
  the client UI, packages, lead records, instructions and prior reports and
  evidence.

## Deviations and decision requests

No decision request. Delegated choices worth review:

- **The draft half of R2c was included.** Lead-17 names the committed counter and
  asks for draft invariants to be assessed against real writer transitions.
  `saveDraft` publishes `draft` and `draft_version` in one transaction and
  nothing clears `draft`, exactly as for `current`, so the symmetric rule is
  derived from the writer rather than fitted to a fixture. No ordering or null
  rule was added for `previous`, which the response never quotes.
- **Tolerance-scaled relationships are skipped when the tolerance is absent.**
  Every document the accepted service has written records
  `render_timeline.tolerance`, and it is validated when present. Treating its
  absence as a failure would hold an older document to a validator written after
  it, so those relationships are simply not checked there; the plain range bounds
  still apply. A present but invalid tolerance is refused.
- **`media.output` still describes the pointer's file under summary drift.** That
  is the media the revision, timing and transcript sections are about, so it
  remains the useful context lead-17 asks to retain; what is withdrawn is the
  claim that a url reaches it.
- **The card duration is bounded, not pinned.** `validateCardDescriptor` accepts
  only 1.5 s today; the reader requires a positive duration so a later supported
  duration is not refused retroactively.
- **`final_composition.raw_render` is related, not re-derived.** Only its
  `output_duration` and `content_to_output_offset` are compared with the receipt
  they are offset from, because the response quotes raw and final timing side by
  side. The rest of the record stays unconsumed and unchecked.
- **Two constants duplicated, not imported.** `PROBE_DURATION_FLOOR` and
  `SUPPORTED_BOOKEND_BRANCHES` are declared locally with the same reasoning as
  the existing `CLIP_REVISIONS_SCHEMA`, `RECEIPT_ROUNDING` and
  `FINAL_COMPOSITION_VERSION`, so the reader keeps no runtime edge to the save
  service. The retained-inputs check asserts that in both module graphs.

## Limitations and findings

- Defects: none found in accepted predecessor work beyond the four upheld
  findings, and none introduced. No new ledger class is proposed; R1 and
  R2a/b/c are the read-side occurrences the lead already indexed as WS-12 and
  WS-16. WS-17 stays closed with its regressions retained. WS-03/04/05 and
  legacy WS-06/09 remain open; this read-only repair closes none.
- **Failed attempts, preserved.** Three focused-suite failures after the first
  build, all in `node-focused-probe.log` (exit 1, 3 failed / 102 passed): two
  sidecar-junction tests asserting repair-1's `unreadable` downgrade, which
  lead-17 reverses, and the older-document control, which the repair refused
  because its hand-grafted intro claimed to end at one second on a render whose
  content offset is zero. The first two were rewritten to the new contract with
  an added test keeping an unreadable *regular* sidecar distinguishable; the
  third was rebuilt from a real bookended commit with the later structures
  removed. A fourth failure (`keeps context but disowns the urls`, exit 1) was my
  own wrong expectation that a commit rewrites the clip entry's title; it does
  not, and the assertion was corrected to check the entry title and the
  document's recipe title separately. None of these is an unsuccessful round on
  the finding itself; the two-round reassessment budget is untouched.
- Uncertainty and out-of-scope observations:
  - Ownership remains a **static** check of the chain as it exists at read time.
    A component replaced concurrently between the check and the read is still not
    defended against, and lead-17 does not ask for that.
  - Validation is structural and relational, not cryptographic. Media
    availability is still `stat` only and `integrity_verified` is still a literal
    `false`; a document whose stored numbers are mutually consistent but untrue
    to the file on disk would still be served, which is what "no hashing on every
    GET" costs. R2b proves identity, not bytes.
  - The relationship checks assume the accepted save service wrote every document
    in existence, which holds while production adoption is absent. A document
    from a future writer with different invariants would be refused rather than
    misread — the safe direction, but an assumption, not a proof.
  - Summary drift is reported and disowned, never resolved: the response does not
    decide which of the two files is right, and no existing serving route is
    changed, so the by-ID urls keep serving the entry summary exactly as before.
  - The response is still a captured view, and a consumer acting on it must
    re-read. No production caller uses this route and no UI consumes it.
- Proposed durable corrections: none. `docs/local-setup.md` needs no change.

## Handoff

- Checkpoint or actual handoff: **handed off**, 2026-09-21 (UTC), this Worker
  session. Implementation writes stopped at this report.
- Current implementation owner: returns to the coordinating Project Lead for
  fresh independent follow-up; not self-accepted.
- Current snapshot: HEAD `fed8ed1` plus `snapshot/manifest.json`
  (`01e88e25...`), tracked patch `e6e26337...`, 27 untracked copies. The
  pre-edit rows bind to `pre-edit-snapshot/manifest.json` (`69189dfe...`).
- Unfinished work and unresolved findings: none in slice scope. No adapters, UI,
  writing persistence, Cleanup, migration or successor work was started.
- Last failed approach: the three superseded fixtures described above, all of
  which encoded either repair-1's downgraded sidecar contract or a writer state
  no save produces; each was rebuilt from a real writer record rather than
  retried.
- Next action and owner: the coordinating lead arranges fresh independent
  follow-up review of this snapshot against lead-17 and inventory
  `4.1.0-local-2`, then disposes R1/R2a/R2b/R2c and B2B2-1..5. This is repair
  round two for R1/R2; if it returns unsuccessfully on the same issue, lead-17
  requires reassessment before any further relay. No commit, push, release,
  agent dispatch or automatic successor.
- Pending Isaac decision: none.
- Durable decisions: none (no ADR).
- Transfer: evidence, both snapshots, fixtures and the installation config are
  ignored `_local` files needing explicit transfer before review in another
  checkout. Disposable fixtures left in place:
  `_local/clipperz/tmp/editor-context-9YKm6w` (this cycle's HTTP fixture, which
  the corrected demonstration reads) and the reproduction and demonstration
  fixtures under `repro-fixtures/` and `demo-fixture-*/`, several of which
  contain real junctions. The reviewer's own directories under
  `1b-2b-2-repair-1/` are byte-identical to their recorded pre-edit hashes.
