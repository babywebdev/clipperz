---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2b-2"
spec_revision: "lead-15"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2/snapshot/manifest.json"
author: "worker"
date: "2026-09-20"
state: "active"
summary: "1B.2b.2 read-only editor context implemented: GET /api/clips/:id/editor-context through a focused typed reader with coherent identities, honest legacy recovery and stable codes; 70 focused, 575 full Node, build, types and real HTTP restart proof pass; handed back."
read_when: "Reviewing 1B.2b.2 evidence, disposing B2B2-1..5, or checking editor-context contracts and legacy recovery honesty."
evidence: "_local/project/evidence/writing-studio/1b-2b-2/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Implementation Report: writing-studio / 1b-2b-2

Size exception: the acceptance map has five IDs whose evidence spans focused suites,
a real HTTP proof with a server restart, and retained predecessor checks that each
need their own receipt row. Full output is in evidence, not here. Evidence paths are
relative to `_local/project/evidence/writing-studio/1b-2b-2/`; times are UTC.

## Identity and freshness

- Implementation author: Worker, Claude Code desktop session (Claude Opus 5), on
  Isaac's manual relay of lead-15. No agent dispatch; README records
  `Verification delegation: disabled`, so every check below ran in this session.
- Spec: `docs/project/tasks/writing-studio/spec.md` **lead-15**, section
  "1B.2b.2 bounded assignment: read-only editor context", acceptance **B2B2-1..5**,
  plus "Current technical constraints", "Current baseline and assumptions" and
  "Approved exceptions currently in force"; `baseline-1b2b2.json`;
  `reports/1b-2b-1-repair-1-worker.md` and the repair-1 review with its
  coordinating-lead disposition; `feature-map.md` for retained legacy capabilities.
- Code snapshot: HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13` (tree
  `b0d7d5c8e62c440fca5d1e4b6dfaa65ebd179f2c`) plus `snapshot/manifest.json`
  (SHA-256 `6f8a714072fcae7d30e91d67e8594f08dfc31ad746952db83bddb9bbf8c69875`:
  41 status entries, 23 untracked copies, 28 contract inputs, 15 workflow files,
  23 evidence files). Tracked patch `snapshot/1b-2b-2-tracked.patch` SHA-256
  `1d8efe77c3fe69d47c5b81fb4c28b985fc8cd9ab38d4369147f4f8585ecbf2e0`
  (221,581 bytes); it carries this cycle's one modified file **and** the accepted
  uncommitted 1B.2a/1B.2b.1 work and the separate AI-client maintenance change, so
  the tree is reproducible from HEAD. Untracked inputs are copied under
  `snapshot/untracked/`. The report itself and the two capture logs are listed in
  the manifest's `excluded` because they cannot hash themselves.
- Environment: Windows 11; configured local runtime Node **v24.15.0**, CPython
  **3.14.3**, FFmpeg/ffprobe **8.1.1-full_build-www.gyan.dev**
  (`runtime-versions.log`), matching the versions the accepted predecessor cycle and
  its review recorded. The build ran three times on identical sources: once before
  the HTTP check (producing the `dist/` that check exercised), then the two logged
  runs; `dist-stable-check.log` shows the compiled studio, reader and route files are
  byte-identical across the last rebuild, so the logged builds and the HTTP result
  describe the same compiled application.
  Synthetic media and isolated storage only; no AI call, no network, no user Library.
  Isaac's Studio address `127.0.0.1:3847` was never started, stopped or restarted;
  `netstat` showed nothing listening on it at plan time, and the HTTP check binds an
  OS-assigned free loopback port asserted `!== 3847` (ports 61702 and 61710 in run 1).
- Plan freshness (`plan.md`, written before any application edit): **zero relevant
  drift**. All 20 inputs recorded in `baseline-1b2b2.json` hash exactly as lead-15
  captured them and HEAD is unchanged (`baseline-check.log`). All 22 rows of
  inventory `4.1.0-local-2` hash exactly as recorded, the September 16 AI-client
  setup guidance included (`instruction-inventory-check.log`). No settled design or
  approval boundary moved, so nothing paused and no decision request was raised.
- Resume before lead reconciliation: Status (lead-15) agrees with the latest
  predecessor records and the actual tree. `1b-2b-1-repair-1-worker.md` Handoff
  returned ownership with no unfinished repair work; the repair-1 review's
  coordinating-lead disposition accepts repair-1 and B2B1-1..5 and closes the
  composition occurrence of WS-16. No discrepancy found. Nothing lead-owned was
  edited. WS-03/04/05 and legacy WS-06/09 remain open and are **not** closed here.
- Implementation: implemented
- Verification: pass
- Submitted for review: yes; acceptance belongs to the coordinating lead after fresh
  independent review.

## Design as implemented

- `GET /api/clips/:id/editor-context` is served by `registerEditorContextRoute`
  (`src/ui/editor-context-route.ts`), which `web-server.ts` calls once. The route
  module registers exactly one handler and no other verb; no existing route changed.
- `ClipEditorContextService` (`src/services/clip-editor-context.ts`) resolves one
  clip. The id is validated against the revision service's identifier shape **before**
  any path is built. The clip list is read once through the accepted
  `readHistoryStrict`, then deep-copied: every pointer, version and identity in one
  response comes from that snapshot, and the documents those pointers name are
  immutable, so a concurrent commit cannot mix versions. The read takes no mutation
  lock: `writeFileAtomic` replaces the file by rename, so one read always sees one
  whole version, and holding the lock would queue every editor open behind a save.
- Tracked state and documents are validated before use: schema, clip, revision,
  version and incarnation identity, the fields this response consumes, and
  configured-root ownership with no link anywhere in the chain. A corrupt,
  unreadable, absent or wrong-identity tracked document is a **stable error**; it
  never degrades to the legacy sidecars sitting beside it. A corrupt clips.json is an
  error, not an empty Library or a 404; a genuinely absent id is 404.
- Accepted older documents are read exactly as saved: `final_composition` and
  bookend `join_inputs` stay optional, their absence is reported as a diagnostic, and
  nothing is rewritten or upgraded. Newer documents keep raw `render_timeline` and
  final composition offsets separate, with the producers' own time-domain maps
  attributed verbatim, card image identity, optional artifact placements and
  dependency group count.
- Legacy recovery reads the words, recipe and reframe sidecars strictly and keeps
  **absent, supplied-empty, malformed and unreadable** distinct. Stored ranges and
  `keep_segments` are labelled `requested` with `effective_cuts_known: false`; bounded
  words carry their recorded source domain and explicitly cannot support widening; no
  range is inferred from first and last timestamps. Conflicting entry/recipe/reframe
  choices become explicit conflict rows, not a guessed recipe. A selected thumbnail is
  described with `baked_provenance: "unknown"`.
- The serializer is explicit: no operations archive, request hash, residual path or
  raw error text, and **no filesystem path at all** — display basenames only, plus the
  existing clip-id preview/download urls with the revision identity they served at the
  captured snapshot and a note that they are current-by-id, not pinned. Work is
  bounded to `stat`: no hashing, no decoding, and `integrity_verified` is a literal
  `false`.
- Capabilities are explicit, and `save_revision` and `adopt_for_revision_tracking` are
  always `false` with reason `WRITE_ROUTE_NOT_AVAILABLE`.

## Execution Receipt

Snapshot "final" = HEAD fed8ed1 plus `snapshot/manifest.json`. No application input
changed after the first build; every row below ran against those same sources.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| B2B2-1,2,3,4 focused reader + route | `node scripts/verification/run-tests.mjs node src/services/clip-editor-context.test.ts src/ui/editor-context-route.test.ts`; expect 0 | 0: 2 files, **70 passed** (56 reader, 14 route/policy) | `node-focused-run1.log` | final | self |
| B2B2-5 full Node | `node scripts/verification/run-tests.mjs node`; expect 0 and no regression | 0: 42 files, **575 passed** (accepted baseline 40 files / 505, plus this cycle's 70; zero regressions) | `node-full-run1.log` | final | self |
| B2B2-5 build | `node scripts/installation/run.mjs npm build run build`; expect 0 | 0, twice on unchanged sources (runs 1 and 2); `sha256sum -c` shows `dist/ui/web-server.js`, `dist/services/clip-editor-context.js` and `dist/ui/editor-context-route.js` byte-identical across the rebuild | `build-run1.log`, `build-run2.log`, `dist-before-rebuild.sha256`, `dist-stable-check.log` | final | self |
| B2B2-5 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json`; expect 0 | 0 | `client-types-run1.log` | final | self |
| B2B2-1,2,3,4,5 actual HTTP + restart | `node --check scripts/verification/check-editor-context.mjs && node scripts/verification/check-editor-context.mjs`; expect 0 `Passed` | 0 `Passed`, 10 step groups: real exact revision with a real opening card (card_offset 1.52 s, content_offset 1.52 s, served 3.61 s, 2 dependency groups) answered coherently; legacy clip labelled requested with 4 conflicts and bounded words; empty/malformed/invalid-encoding/absent recovery inputs distinct; `REVISION_DOCUMENT_INVALID`, `REVISION_DOCUMENT_UNAVAILABLE`, `OWNERSHIP_ESCAPE` (real junction), `HISTORY_INVALID_JSON`, `HISTORY_INVALID_ENCODING`, `CLIP_NOT_FOUND` (absent **and** id prefix), `INVALID_CLIP_ID`; wrong Host 403, cross-origin 403, same-origin 200; download bytes identical to the current revision; 3 clips listed with unknown fields intact and no `revisions` added; identical bodies after stop/restart on a second free port | `check-editor-context-run1.log`, `check-editor-context-run1-result.json` (fixture `editor-context-Wp8oZG`, ports 61702 then 61710) | final | self |
| B2B2-4 stored bytes unchanged | Whole-fixture SHA-256 tree hashed before the first request and re-compared after the first server and after the restart, inside the HTTP check | 0: identical file set and identical hashes at both points; source bytes unchanged | `check-editor-context-run1.log` (`no adoption, no writes`, `restart`) | final | self |
| B2B2-4 write-area audit | `git status --porcelain=v1 -uall` plus pre-edit hashes of the seven candidate files | Only `src/ui/web-server.ts` changed, by 6 added lines (1 import, 1 call, 3 comment); the other six are byte-identical | `write-area-audit-run1.log`, `git-status-final.txt`, `diff-stat-src.txt`, `pre-edit/planned-touch.sha256` | final | self |
| B2B2-4,5 retained-evidence inputs and boundaries | `node _local/project/evidence/writing-studio/1b-2b-2/retained-inputs-check.mjs "$PWD"`; expect 0 problems | 0: 20 distinct covered inputs unchanged since the accepted snapshot; all 9 working-tree Python/renderer/script entries unchanged; 21 source entries are either this cycle's 7 or accepted-unchanged; 0 Python files reference the new module; the revision save service is **not** reachable from the studio in source (29 files) or in compiled `dist` (29 files) | `retained-inputs-check-run1.log`, `retained-inputs-check.mjs` | final | self |
| B2B2-5 Python (retained, not rerun) | 1B.2b.1 `py_compile`, `-k opening_card`, `-k "opening_card or exact_render"`, full Python | Retained: 14 passed/32 subtests; 91/155; **991 passed, 6 skipped, 313 subtests**. No Python, Python test or lock input changed (row above); Python does not import TypeScript and no Python file references this module | `../1b-2b-1/python-*.log`, `../1b-2b-1/py-compile-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| B2B2-5 exact bridge (retained) | `node scripts/verification/check-exact-render.mjs` | Retained: 0 `Passed`. Its covered renderer and executor inputs are unchanged; this cycle adds no Python and no renderer path | `../1b-2b-1/check-exact-render-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| B2B2-5 saved-revision bridge (retained) | `node scripts/verification/check-saved-revision.mjs` | Retained: 0 `Passed`. Its covered inputs are unchanged; this cycle's own HTTP check independently re-exercises the same save path to build its fixture | `../1b-2b-1/check-saved-revision-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| B2B2-5 preview parity (retained) | `node scripts/verification/check-preview-render.mjs` | Retained: 0 `Passed`. Covered inputs unchanged; the one studio change is an added GET registration, and the parity flow is re-exercised implicitly by the new check's real server start | `../1b-2b-1/check-preview-render-run1.log` | 1B.2b.1 snapshot | self (1B.2b.1 Worker session) |
| AC-12 instructions | Inventory `4.1.0-local-2` hashes before edits and after the last check | 22 of 22 both times | `instruction-inventory-check.log`, `instruction-inventory-check-final.log` | final | self |
| AC-12 snapshot | `node _local/.../1b-2b-2/snapshot-capture.mjs "$PWD"`, then `--check`; expect 0 drift | capture 0; `--check` 0, `No drift.` | `snapshot/`, `snapshot-capture.log`, `snapshot-check.log` | final | self |

- Executor identities and target: `self` is this Worker session on the configured
  local runtime against disposable fixtures; retained rows name the 1B.2b.1 Worker
  session and their own snapshot.
- Runtime coverage: success and failure paths through the real studio process over
  real HTTP, including the local host/origin middleware, a stop/restart on a second
  port, and refusals for corrupt history, corrupt and missing documents, a real
  junction, an absent id, an id prefix and a traversal attempt.
- Human assistance: none.
- Not applicable: browser/Studio walkthrough (this slice adds no UI and the
  assignment states browser UI checks are not claimed); live AI smoke test (no AI
  call is made).
- Not run: Python suites, exact bridge, saved-revision bridge and preview parity,
  retained above with covered-input hashes and dependency justification. Also not
  run: socket-level assertions inside vitest — this project's test harness
  (`scripts/verification/node-offline.mjs`) deliberately blocks `fetch`,
  `http.request` and outbound TCP as a tripwire, so the route test drives the real
  registered handler directly and all HTTP-level proof lives in the disposable check.
  Weakening that tripwire to make a test convenient was rejected.
- Changed inputs after checks: none. After the last check only the snapshot, its
  logs, the build-stability evidence, the final inventory log and this report were
  written; no application input changed.

## Change inventory

Git-derived against HEAD and pre-edit copies (`git-status-final.txt`,
`write-area-audit-run1.log`, `snapshot/manifest.json`):

- `src/ui/web-server.ts` (modified, +6 lines): imports and calls
  `registerEditorContextRoute(app)` beside the existing clip-by-id read routes.
- `src/ui/editor-context-route.ts` (new): the one GET adapter, stable error mapping,
  `Cache-Control: no-store`, no raw exception in any response.
- `src/services/clip-editor-context.ts` (new): the focused typed reader.
- `src/models/clip-editor-context.ts` (new): response types, capability ids, stable
  reason, diagnostic and error codes.
- `src/services/clip-editor-context.test.ts` (new): 56 focused tests using the
  accepted save service and fake renderer/composer to build real-shaped fixtures.
- `src/ui/editor-context-route.test.ts` (new): 14 adapter, policy and
  module-boundary tests.
- `scripts/verification/check-editor-context.mjs` (new): the disposable actual
  HTTP-server check.
- Unchanged: all Python, the renderer, `clips-history.ts` (including its lenient
  `load()` and the three tolerant sidecar readers), `clip-revisions.ts` and its
  models, Cleanup, `config/policy.ts`, every existing route, CLI/MCP, the client UI,
  packages, lead records and prior evidence.

## Deviations and decision requests

No decision request. Delegated choices worth review:

- **A corrupt tracked document fails the request** rather than returning a partial
  context. Lead-15 forbids silent fallback to legacy sidecars and asks that invalid
  state "fail safely"; a partial answer that silently omits the revision would be the
  same ambiguity in a different shape. Clip text and publishing metadata remain
  available in every case lead-15 names for them (missing media, missing source,
  missing or unusable sidecars) — only unusable *tracked* state is fatal.
- **No filesystem path appears in any response**, only display basenames and the
  existing clip-id urls. Existing routes such as `/api/history` still return stored
  paths; this is a tightening confined to the new route, not a change to them.
- **Bounded words are returned, the full source list is not.** The clip-bounded
  editorial or legacy words are small and are what a transcript view needs; the
  retained full source-absolute list can be a whole episode, so it is described by
  count, domain and coverage instead of being served. The widening capability is
  reported from it either way.
- **The reader has no runtime edge to the save service.** It duplicates two small
  constants and a read-only containment check rather than importing
  `clip-revisions.ts`, so B2B2-4's "no import of save operations" holds in the
  compiled studio; the retained-inputs check asserts that in both graphs.
- **Demo mode** (`PODCLI_DEMO=1`) serves the demo clip list as an untracked legacy
  clip and reads no sidecar, so the new route behaves like the rest of the app there.
- **`ClipsHistory` was not modified.** The module-level `readHistoryStrict` is the
  minimal strict read interface lead-15 allows; no second history collection or lock
  protocol was introduced, and the lenient listing behaviour is untouched.

## Limitations and findings

- Defects: none found in accepted predecessor work, and none introduced. No new
  ledger class is proposed. WS-03/04/05 and legacy WS-06/09 remain open; this
  read-only slice closes none of them. Found and fixed during this cycle, both mine
  and both in test code, not the product: an assertion that hard-coded a bookend
  overlap the fake renderer's default branch never produces, and a readiness regex
  loose enough to match the word "already" (`node-focused` run before run 1).
- Uncertainty and out-of-scope observations:
  - Media availability is `stat` only. Existence and recorded-size agreement are
    reported; `integrity_verified` is always `false`, and a file replaced in place at
    the same size reads as available. Verifying content would need hashing on every
    GET, which lead-15 excludes.
  - The response is a captured view. It states so in `identity.note`; a consumer that
    acts on it must re-read.
  - If a legacy writer moves `entry.output_path` away from the current revision's
    file, the by-id urls and the described revision diverge; the response emits a
    diagnostic for that case, but the divergence itself belongs to the later
    adapter/migration work.
  - No production caller uses this route yet, and no UI consumes it. Adoption,
    mutating adapters and migration remain unplanned successor work.
- Proposed durable corrections: none. `docs/local-setup.md` needs no change for a
  read route; the lead reconciles if it disagrees.

## Handoff

- Checkpoint or actual handoff: **handed off**, 2026-09-20 (UTC), this Worker
  session. Implementation writes stopped at this report.
- Current implementation owner: returns to the coordinating Project Lead for fresh
  independent review; not self-accepted.
- Current snapshot: HEAD `fed8ed1` plus `snapshot/manifest.json`
  (`6f8a7140...`), tracked patch `1d8efe77...`, 23 untracked copies.
- Unfinished work and unresolved findings: none in slice scope. No adapters, UI,
  writing persistence, Cleanup, migration or successor work was started.
- Last failed approach: an in-process HTTP route test using `fetch` against a local
  express server, which the offline test harness blocks by design. The next attempt
  changed approach rather than the harness: the adapter is driven directly in vitest
  and all HTTP-level proof moved to the disposable real-server check.
- Next action and owner: the coordinating lead arranges fresh independent review of
  this snapshot against lead-15 and inventory `4.1.0-local-2`, then disposes
  B2B2-1..5. No commit, push, release, agent dispatch or automatic successor.
- Pending Isaac decision: none.
- Durable decisions: none (no ADR).
- Transfer: evidence, snapshot, fixtures and the installation config are ignored
  `_local` files needing explicit transfer before review in another checkout.
  Disposable fixtures left in place: `_local/clipperz/tmp/editor-context-Wp8oZG` and
  the test-runner temporary directories.
