---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2b-2-repair-1"
spec_revision: "lead-16"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2-repair-1/snapshot/manifest.json"
author: "worker"
date: "2026-09-20"
state: "active"
summary: "R1-R3 repaired: ownership is validated from the configured history root through every intervening component, consumed nested fields and pointer invariants are checked before any claim, and invalid legacy word lists are malformed rather than filtered into usable transcripts; 105 focused, 610 full Node, build, types and real HTTP restart proof pass; handed back."
read_when: "Reviewing 1B.2b.2 repair-1 evidence for R1/R2/R3, disposing B2B2-1..5, or checking the reader's ownership chain, validation boundary and legacy classification."
evidence: "_local/project/evidence/writing-studio/1b-2b-2-repair-1/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Implementation Report: writing-studio / 1b-2b-2-repair-1

Size exception: three upheld findings each need their own trigger, correction and
receipt, and lead-16 additionally requires a before/after run of the unchanged
reviewer script, a separate corrected demonstration, and retained-evidence
citations. Full output is in evidence, not here. Evidence paths are relative to
`_local/project/evidence/writing-studio/1b-2b-2-repair-1/`; times are UTC.

## Identity and freshness

- Implementation author: Worker, Claude Code desktop session (Claude Opus 5), on
  Isaac's manual relay of lead-16. No agent dispatch; README records
  `Verification delegation: disabled`, so every check below ran in this session.
- Spec: `docs/project/tasks/writing-studio/spec.md` **lead-16**, section
  "1B.2b.2 repair-1: read boundaries and honest validation", acceptance
  **B2B2-1..5**, plus the lead-15 assignment it preserves, "Current baseline and
  assumptions", "Current technical constraints" and "Approved exceptions
  currently in force". Repair baseline: `reports/1b-2b-2-review.md` R1-R3 with the
  coordinating-lead disposition, `reports/1b-2b-2-worker.md`, and the reviewer's
  reproduction `_local/.../1b-2b-2/review/repro.mjs`.
- Code snapshot: HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13` (tree
  `b0d7d5c8e62c440fca5d1e4b6dfaa65ebd179f2c`) plus `snapshot/manifest.json`
  (SHA-256 `ca104bfb968514288e720a2ee2ae759c3e27594533f392e2de5aeba223bd284d`:
  43 status entries, 25 untracked copies, 33 contract inputs, 15 workflow files,
  262 evidence files, 11 listed links). Tracked patch
  `snapshot/1b-2b-2-repair-1-tracked.patch` SHA-256
  `ffe9eb35afd3707ca0ec7d92c092ae4267918f56cdfe43a6baee1138b1461266`
  (233,519 bytes); as in the reviewed cycle it carries the accepted uncommitted
  1B.2a/1B.2b.1 work and the separate AI-client maintenance change, so the tree is
  reproducible from HEAD. The manifest's contract inputs now also bind the repair
  baseline itself: the reviewed cycle's manifest, both its reports and the
  reviewer's `repro.mjs`/`repro-result.json`.
- Environment: Windows 11; configured local runtime Node **v24.15.0**, CPython
  **3.14.3**, FFmpeg/ffprobe **8.1.1-full_build-www.gyan.dev**
  (`runtime-versions.log`), identical to the reviewed cycle and the accepted
  predecessor. `build-run2.log` plus `dist-stable-check.log` show the compiled
  reader, models, route and studio byte-identical across a rebuild on unchanged
  sources, so the logged build and the HTTP result describe the same application.
  Synthetic media and isolated storage only; no AI call, no network, no user
  Library. Isaac's Studio address `127.0.0.1:3847` was never started, stopped or
  restarted; the HTTP check binds an OS-assigned free loopback port asserted both
  `!== 3847` and `!== PODCLI_PORT` (50448 then 50455 in the recorded run).
- Plan freshness (`plan.md`, written before any application edit): **zero relevant
  drift**. `snapshot-capture.mjs --check` against the reviewed cycle's manifest
  reported 30 drift lines, every one of them lead bookkeeping (`spec.md`,
  `spec-log.md`, `findings-ledger.md`), the new review report, or the reviewer's
  own evidence. No application, contract-input or workflow entry moved. All 22
  rows of inventory `4.1.0-local-2` hash exactly as recorded, before edits and
  after the last check (`instruction-inventory-check.log`,
  `instruction-inventory-check-final.log`). No settled design or approval boundary
  moved, so nothing paused and no decision request is raised.
- Resume before lead reconciliation: Status (lead-16) agrees with the actual tree
  and with the review's Handoff. Its "last failed approach" — checks beginning
  below the configured ownership root, and outer-shape casts and filtering turning
  invalid nested data into usable editor context — is exactly what this repair
  changes. Nothing lead-owned was edited. WS-03/04/05 and legacy WS-06/09 remain
  open and are **not** closed here.
- Implementation: implemented
- Verification: pass
- Submitted for review: yes; acceptance belongs to the coordinating lead after
  fresh independent follow-up.

## Consumed-field inventory

`plan.md` records the full inventory written before any edit: every field the
reader reads out of stored JSON and the response claim it feeds, across tracked
state, the revision document, the draft document, the legacy entry and the three
legacy sidecars, with the gap marked on each row. It found the reviewer's five
examples and nineteen further consumed fields with the same defect, so the repair
is driven by that table rather than by the reproduced cases.

## The three repairs

**R1 / WS-12, ownership.** `inspectOwnedFile` now takes two boundaries instead of
one. `containment` stays the specific owned directory a recorded path must sit
beneath; the physical `lstat` walk starts at the **configured history root** and
covers the root itself and every component down to the file. The previous walk
began at the derived root it was handed (`<history>/revisions/<clipId>`, or
`<history>/words|recipes|reframe`), so it stepped over its own ancestors. A link
anywhere in the chain is refused and never resolved, so no junction target is
adopted as a new trusted root; this mirrors the accepted write-side
`assertOwnedDirectory`. Missing components keep their declared missing behaviour,
parents above the configured root are the user's chosen location and are not
inspected, and this remains a static check — not a defence against a concurrent
swap, and not a restriction on the external media paths legacy entries may hold.

**R2 / WS-16, consumed fields.** Validation is now complete before any projection,
and the projections read validated values instead of coercing. Pointer rules are
provenance-aware: an `exact` pointer must carry its document path, dependency
group, committing operation and a version ≥ 1, while `legacy-unversioned` must be
version zero with none of those, so only a valid legacy version zero can take the
recovery branch. A pointer's version must agree with the counter that names it,
and a document must name the same operation and group as its pointer. Segments are
validated as real intervals whose durations and content chain still add up, within
the renderer's own rounding allowance; word lists are validated element by element;
time-domain maps must be label-to-explanation strings; probe, files, bookends,
card provenance, crop keyframes, frame precision and the optional
`final_composition` are all checked, including that the composition's card and
content offsets agree with the raw receipt they are offset from. Failures are
stable `REVISION_STATE_INVALID` / `REVISION_DOCUMENT_INVALID` /
`DRAFT_DOCUMENT_INVALID` before projection; the removed-card `TypeError` is gone.
It stays a read schema, not the new-save validator: `final_composition`, bookend
`join_inputs` and pointer `groups` remain optional, their absence an honest
diagnostic, and legitimate out-of-source-order segments and overlapping words are
preserved rather than sorted or normalised.

**R3 / WS-17, legacy words.** A words sidecar is validated in full before it is
called usable. Any invalid element, a mixed list, or backwards or non-finite
timing makes it `malformed`, with `words: null` and `word_count: null`; a valid
explicit `[]` stays `empty`. The same present-but-invalid rule now covers the
recipe and reframe recovery inputs and the entry's own `keep_segments`,
`generated_titles`, `format` and thumbnail card length, which previously coerced
to `null` and silently dropped a conflict row or mapped garbage into the response.
Clip text, publishing metadata, media and the other recovery inputs stay usable in
every case, and no sidecar is repaired, rewritten or removed.

Preserved throughout: the single strict history read and its coherent snapshot,
read-only behaviour, no runtime import of save operations, no filesystem path in
any response, and old-document compatibility.

## Execution Receipt

Snapshot "final" = HEAD fed8ed1 plus `snapshot/manifest.json`. No application
input changed after the final build; every row below ran against those sources.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| B2B2-1,2,3 reproduction **before** edits | `node scripts/installation/run.mjs node editor-repair1-before-repro _local/project/evidence/writing-studio/1b-2b-2/review/repro.mjs` (unchanged reviewer script); expect the findings to still reproduce | 0: control succeeds; ancestor junction **succeeded** with authoritative exact timing, `path:null` fell to `legacy-unversioned-revision`, malformed segment served with `effective_cuts_known:true`, `[null]` source words advertised widening, arbitrary domain object escaped, applied card without image threw `TypeError`, malformed legacy words read `present`/`available` | `before-repro-run1.log`, `before-repro-result.json`, `before-repro-summary.txt` | final | self |
| B2B2-1,2,3 reproduction **after** rebuild | same unchanged reviewer script, rerun after `npm run build` | 0: control still succeeds; `OWNERSHIP_ESCAPE`, `REVISION_STATE_INVALID`, and `REVISION_DOCUMENT_INVALID` ×4 (segment, source words, domain object, card); legacy words `malformed` with `words: null` | `after-repro-run2.log`, `after-repro-result.json` | final | self |
| — reviewer files preserved | SHA-256 of all seven reviewer files recorded before the first run and re-checked after the last | 7 of 7 identical each time; the script's own output was captured to this cycle's evidence and the reviewer's copy restored byte-for-byte | `pre-edit/reviewer-files.sha256` | final | self |
| B2B2-1,2,3 corrected demonstration | `node scripts/installation/run.mjs node editor-repair1-corrected-demo _local/project/evidence/writing-studio/1b-2b-2-repair-1/corrected-demo.mjs` | 0 `Passed`, **40 corrected cases**: junctions at the `revisions` ancestor, the per-clip directory, the configured history root and a legacy sidecar directory; containment outside the clip's own directory; 24 malformed state/document/draft refusals; an accepted older document with no `final_composition`/`join_inputs` still read as saved; unavailable vs empty transcript; five malformed legacy word shapes; supplied-empty; a valid overlapping list; a malformed entry segment list | `corrected-demo.mjs`, `corrected-demo-run1.log`, `corrected-demo-result.json` | final | self |
| B2B2-1,2,3,4 focused reader + route | `node scripts/verification/run-tests.mjs node src/services/clip-editor-context.test.ts src/ui/editor-context-route.test.ts`; expect 0 | 0: 2 files, **105 passed** (82 reader, 23 route/policy; the reviewed cycle's 70 all still pass, plus 35 new regressions for R1/R2/R3) | `node-focused-run1.log` | final | self |
| B2B2-5 full Node | `node scripts/verification/run-tests.mjs node`; expect 0 and no regression | 0: 42 files, **610 passed** (the reviewed cycle's 575 plus this repair's 35; zero regressions, no file count change) | `node-full-run1.log` | final | self |
| B2B2-5 build | `node scripts/installation/run.mjs npm build run build`; expect 0 | 0, twice on unchanged sources; `sha256sum -c` shows `dist/services/clip-editor-context.js`, `dist/models/clip-editor-context.js`, `dist/ui/editor-context-route.js` and `dist/ui/web-server.js` byte-identical across the rebuild | `build-run1.log`, `build-run2.log`, `dist-before-rebuild.sha256`, `dist-stable-check.log` | final | self |
| B2B2-5 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json`; expect 0 | 0 | `client-types-run1.log` | final | self |
| B2B2-1,2,3,4,5 actual HTTP + restart | `node --check scripts/verification/check-editor-context.mjs && node scripts/verification/check-editor-context.mjs`; expect 0 `Passed` | 0 `Passed`, 14 step groups. New in this repair: ancestor junction at `history/revisions` → `OWNERSHIP_ESCAPE` with the junction target hash-identical and the clip reading again once it is removed; three malformed pointer/counter states → `REVISION_STATE_INVALID` with no mention of the legacy data beside them; eight malformed document fields → `REVISION_DOCUMENT_INVALID`, never `EDITOR_CONTEXT_FAILED`, never a raw exception, body keys exactly `code`+`error`; three invalid legacy word shapes → `malformed` with `words: null` while text, description, media and `edit_writing_metadata` stay available, and the sidecar bytes unchanged; supplied-empty stays `empty` and a valid list stays `available`. Retained: real card revision (card_offset 1.52 s, served 3.61 s, 2 groups), legacy conflicts, recovery-input distinctions, corrupt history/document, 404/prefix/traversal, Host 403, cross-origin 403, same-origin 200, download bytes identical, 3 clips with unknown fields intact and no `revisions` added, identical bodies after stop/restart on a second free port | `check-editor-context-run1.log`, `check-editor-context-run1-result.json` (fixture `editor-context-ObSt6M`) | final | self |
| B2B2-4 stored bytes unchanged | Whole-fixture SHA-256 tree hashed before the first request and re-compared after the first server, after the repaired cases and after the restart, inside the HTTP check | 0: identical file set and identical hashes at all three points; source bytes unchanged; every mutated fixture file restored to its original hash inside the run | `check-editor-context-run1.log` (`no adoption, no writes`, `after the repaired cases`, `after the restart`) | final | self |
| B2B2-4 write-area audit | `sha256sum -c` of 15 pre-edit boundary hashes plus `git status --porcelain=v1 -uall` | Exactly **5** files changed, all inside lead-16's expected write set. Unchanged: `web-server.ts`, `editor-context-route.ts`, `clip-revisions.ts`, `clips-history.ts`, `models/clip-revisions.ts`, `models/index.ts`, `config/policy.ts` and all three Python files. No path added or removed versus the reviewed cycle's inventory apart from the two reports | `write-area-audit-run1.log`, `pre-edit/boundary.sha256` | final | self |
| B2B2-4,5 retained-evidence inputs and boundaries | `node _local/project/evidence/writing-studio/1b-2b-2/retained-inputs-check.mjs "$PWD"`; expect 0 problems | 0: 20 distinct covered inputs unchanged since the accepted snapshot; all 9 working-tree Python/renderer/script entries unchanged; 0 Python files reference the new module; the revision save service is **not** reachable from the studio in source (29 files) or in compiled `dist` (29 files) | `retained-inputs-check-run1.log` | final | self |
| B2B2-5 Python (retained, not rerun) | 1B.2b.1 `py_compile`, `-k opening_card`, `-k "opening_card or exact_render"`, full Python | Retained: 14 passed/32 subtests; 91/155; **991 passed, 6 skipped, 313 subtests**. No Python, Python test or lock input changed (row above); Python does not import TypeScript and no Python file references this module; this repair edits no renderer path | `../1b-2b-1/python-*.log`, `../1b-2b-1/py-compile-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| B2B2-5 exact bridge (retained) | `node scripts/verification/check-exact-render.mjs` | Retained: 0 `Passed`. Its covered renderer and executor inputs are unchanged; this repair adds no Python and no renderer path | `../1b-2b-1/check-exact-render-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| B2B2-5 saved-revision bridge (retained, **corrected citation**) | `node scripts/verification/check-saved-revision.mjs` | Retained: 0 `Passed`, 2026-09-15T21:44:13Z. Per the review's citation correction this cites the **accepted repair-1** run, which includes the repaired consumer's real refusal checks, not the older pre-repair run the reviewed cycle cited. Its covered inputs are unchanged; this repair's own HTTP check independently re-exercises the same save path to build its fixture | `../1b-2b-1-repair-1/check-saved-revision-run1.log`, `../1b-2b-1-repair-1/check-saved-revision-run1-result.json` | 1B.2b.1 repair-1 snapshot | self (1B.2b.1 repair-1 Worker session) |
| B2B2-5 preview parity (retained, **corrected claim**) | `node scripts/verification/check-preview-render.mjs` | Retained: 0 `Passed`, on unchanged flow and dependencies only. Starting the HTTP server is **not** preview/export parity, and no parity claim is made from it; the HTTP check separately proves the existing preview 206 and download bytes | `../1b-2b-1/check-preview-render-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| AC-12 instructions | Inventory `4.1.0-local-2` hashed before edits and after the last check | 22 of 22 both times | `instruction-inventory-check.log`, `instruction-inventory-check-final.log` | final | self |
| AC-12 snapshot | `node _local/.../1b-2b-2-repair-1/snapshot-capture.mjs "$PWD"`, then `--check`; expect 0 drift | capture 0; `--check` 0, `No drift.` | `snapshot/`, `snapshot-capture.log`, `snapshot-check.log` | final | self |

- Executor identities and target: `self` is this Worker session on the configured
  local runtime against disposable fixtures; retained rows name the 1B.2b.1 and
  1B.2b.1 repair-1 Worker sessions and their own snapshots.
- Runtime coverage: success and failure paths through the real studio process over
  real HTTP, including the local host/origin middleware, a stop/restart on a
  second port, real Windows junctions at an ancestor boundary, and refusals for
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
- Changed inputs after checks: none. After the last check only the snapshot, its
  logs, the final inventory log and this report were written.

## Change inventory

Git-derived against HEAD and pre-edit copies (`write-area-audit-run1.log`,
`snapshot/manifest.json`). All five files were introduced by the reviewed cycle
and are still untracked; line counts are against the reviewed cycle's copies in
`../1b-2b-2/snapshot/untracked/`:

- `src/services/clip-editor-context.ts` (1,176 → 1,581 lines; 589 changed): the
  two-boundary ownership check, the completed validation section, provenance-aware
  pointers, validated word/segment/time-domain/composition handling, the legacy
  present-but-invalid rule, and projections that read validated values.
- `src/models/clip-editor-context.ts` (424 → 433; 11 changed): two diagnostic
  codes (`LEGACY_ENTRY_MALFORMED`, `TRANSCRIPT_TRUNCATED`) and the documented
  meaning of `words`/`word_count`.
- `src/services/clip-editor-context.test.ts` (732 → 1,064; 332 changed): 26 new
  reader regressions in three blocks, one per finding.
- `src/ui/editor-context-route.test.ts` (233 → 343; 110 changed): 9 new adapter
  regressions proving the repaired refusals reach the client as stable domain
  codes, not the catch-all.
- `scripts/verification/check-editor-context.mjs` (439 → 563; 124 changed): three
  new real-HTTP step groups and an extra whole-fixture unchanged assertion.
- Unchanged: `src/ui/web-server.ts` and `src/ui/editor-context-route.ts` (the
  adapter already mapped stable codes, so no route error-mapping change was
  needed), all Python, the renderer, `clips-history.ts`, `clip-revisions.ts` and
  its models, Cleanup, `config/policy.ts`, every existing route, CLI/MCP, the
  client UI, packages, lead records and prior reports and evidence.

## Deviations and decision requests

No decision request. Delegated choices worth review:

- **Two narrower state invariants than I first wrote.** My first attempt also
  refused a null draft or current pointer beside a non-zero counter, and a
  `previous` not older than `current`. The reviewer's own control fixture — a real
  accepted document with `draft: null` and `draft_version: 1` — was refused by it,
  which is the failure recorded below. The counters are the save protocol's
  concurrency counters, nothing in the response depends on a cleared pointer, and
  inferring corruption from one would hold a clip to a rule the protocol never
  promised, so only the positive case is checked: a pointer that exists must agree
  with the counter naming its version. `previous` is validated for shape only,
  since the response never quotes it.
- **Relationship checks are limited to claims the response actually serves.**
  Segment chain, content duration, card offset and content offset are checked
  because the response publishes them together; unconsumed receipt fields
  (`raw_render`, `tolerance`, `captions`, `output`) are not re-derived. This keeps
  the read schema from drifting into the save-time validator.
- **Two constants duplicated, not imported.** `RECEIPT_ROUNDING` and
  `FINAL_COMPOSITION_VERSION` are declared locally with the same reasoning as the
  existing `CLIP_REVISIONS_SCHEMA`, so the reader keeps no runtime edge to the
  save service. The retained-inputs check asserts that in both module graphs.
- **Word lists are capped but counted honestly.** The served array keeps its
  20,000-element cap; `word_count` now reports the true stored count and a
  `TRANSCRIPT_TRUNCATED` diagnostic says so, instead of the cap silently becoming
  the count.
- **Legacy entry fields are reported, not errors.** An unusable `keep_segments`,
  `generated_titles` or thumbnail card length on a legacy entry produces a
  `LEGACY_ENTRY_MALFORMED` diagnostic and a null field. Failing the request there
  would make an old clip's text unreachable, which lead-15 and lead-16 both forbid.

## Limitations and findings

- Defects: none found in accepted predecessor work beyond the three upheld
  findings, and none introduced. No new ledger class is proposed; R1/R2/R3 are the
  read-side occurrences the lead already indexed as WS-12, WS-16 and new WS-17.
  WS-03/04/05 and legacy WS-06/09 remain open; this read-only repair closes none.
- **Failed attempt, preserved.** The first build's state validator refused the
  reviewer's control case (`after-repro-run1.log`, exit 1,
  `'error' !== 'success'`; diagnosed with a scratch script whose fixture is
  retained at `repro-fixtures/dbg-Mg6lmC`, and the run's fixture at
  `repro-fixtures/failed-attempt-fixture-UexUIE`). The correction is the first
  deviation above. That is one unsuccessful round on the state-invariant question,
  resolved within this assignment; the two-round reassessment budget is untouched.
- **Reviewer files.** All seven are byte-identical to their pre-edit hashes. The
  unchanged script writes its result into the reviewer's directory, so each run's
  output was copied to this cycle's evidence and the reviewer's copy restored from
  a pre-run backup, with the hash re-verified. On the final rerun a too-broad
  `mv fixture-*` briefly relocated the reviewer's own `fixture-HO9pKq` into this
  cycle's `repro-fixtures/`; it was moved straight back to the same absolute path.
  Its 17 files, their 2026-09-20 20:48 timestamps and its junction (which targets
  a path inside itself) are intact, but I had no recorded hash baseline for that
  directory — `binding.json` does not hash fixture files — so its integrity rests
  on the move being a same-volume rename, not on a comparison.
- Uncertainty and out-of-scope observations:
  - Ownership remains a **static** check of the chain as it exists at read time.
    A component replaced concurrently between the check and the read is still not
    defended against, and lead-16 does not ask for that.
  - Validation is structural and relational, not cryptographic. Media availability
    is still `stat` only and `integrity_verified` is still a literal `false`; a
    document whose stored numbers are mutually consistent but untrue to the file
    on disk would still be served, which is what "no hashing on every GET" costs.
  - The relationship checks assume the accepted save service wrote every document
    in existence, which holds while production adoption is absent. A document from
    some future writer with different invariants would be refused rather than
    misread — the safe direction, but it is an assumption, not a proof.
  - The response is still a captured view, and a consumer acting on it must
    re-read. No production caller uses this route and no UI consumes it.
- Proposed durable corrections: none. `docs/local-setup.md` needs no change.

## Handoff

- Checkpoint or actual handoff: **handed off**, 2026-09-20 (UTC), this Worker
  session. Implementation writes stopped at this report.
- Current implementation owner: returns to the coordinating Project Lead for fresh
  independent follow-up; not self-accepted.
- Current snapshot: HEAD `fed8ed1` plus `snapshot/manifest.json`
  (`ca104bfb...`), tracked patch `ffe9eb35...`, 25 untracked copies.
- Unfinished work and unresolved findings: none in slice scope. No adapters, UI,
  writing persistence, Cleanup, migration or successor work was started.
- Last failed approach: the over-strict state invariants described above, which
  refused the reviewer's control fixture; the next attempt narrowed the rule to
  pointers that exist rather than retrying the same check.
- Next action and owner: the coordinating lead arranges fresh independent
  follow-up review of this snapshot against lead-16 and inventory
  `4.1.0-local-2`, then disposes R1-R3 and B2B2-1..5. No commit, push, release,
  agent dispatch or automatic successor.
- Pending Isaac decision: none.
- Durable decisions: none (no ADR).
- Transfer: evidence, snapshot, fixtures and the installation config are ignored
  `_local` files needing explicit transfer before review in another checkout.
  Disposable fixtures left in place: `_local/clipperz/tmp/editor-context-ObSt6M`
  (and the reviewed cycle's `editor-context-Wp8oZG`, which this cycle's
  reproduction and demonstration both read), plus the retained reproduction
  fixtures under `repro-fixtures/`, several of which contain real junctions and
  one a deliberately dangling one.
