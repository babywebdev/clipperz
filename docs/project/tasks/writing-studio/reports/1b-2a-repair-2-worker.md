---
record: "worker-report"
task: "writing-studio"
cycle: "1b-2a-repair-2"
spec_revision: "lead-11"
snapshot: "_local/project/evidence/writing-studio/1b-2a-repair-2/snapshot/manifest.json"
author: "worker"
date: "2026-09-13"
state: "active"
summary: "R1/WS-12 and R5/WS-16 repaired: configured roots are checked and junction roots refused; receipts validated against renderer domain, word, caption and bookend relationships. All required checks pass; handed back for fresh review."
read_when: "Reviewing 1B.2a repair-2 evidence for WS-12/16, disposing B2A-4/5/6, or confirming retained WS-13/14/15 behavior."
evidence: "_local/project/evidence/writing-studio/1b-2a-repair-2/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---

# Implementation Report: writing-studio / 1b-2a-repair-2

Size exception: two findings, their before/after reproductions, a relational contract derived from the renderer and eleven receipt rows exceed the 1,200-word soft cap; no required evidence is dropped.

## Identity and freshness

- Implementation author: Worker, Claude Code session (Claude Opus 5), assigned by Isaac's manual relay of the coordinating lead's bounded repair-2 direction on 2026-09-13. No agent dispatch; verification delegation disabled; every check ran in this session.
- Spec path and bound revision: `docs/project/tasks/writing-studio/spec.md` lead-11, "1B.2a repair-2 direction" with the 1B.2a assignment, retained repair-1 contracts, acceptance map, constraints and exceptions; `reports/1b-2a-repair-1-review.md` including its disposition; `reports/1b-2a-repair-1-worker.md` receipt and Handoff; ledger rows WS-12/16.
- Code snapshot and snapshot evidence: HEAD `8cf6b82039381e62b0f1dac1953c0c8c279e86f1` plus `snapshot/manifest.json` (SHA-256 `37227a0f0789f9f2377deebe8b42bcf3ecb8a38cda6c1342ff0ec4b4e71f38b2`: 78 file entries, 46 local evidence, 5 renderer contract inputs, 16 workflow/record files). Tracked patch `snapshot/1b-2a-repair-2-tracked.patch` SHA-256 `5a30e84de43ac24d853f865fe5ffd3406c9cd6280401d41cb096c203a442fb82` (346,523 bytes) is identical to the pre-edit capture: this repair changed no tracked file. `repair-2-slice.patch` SHA-256 `f1050ab1a20840f419045149a3d1fffb32cb3b570069ccd2ab1390b2fb1c2219` diffs the 4 changed slice files against `pre-edit/` copies, which matched the repair-1 manifest 7/7 (`pre-edit-capture.json`).
- Environment/target: Windows 11, Node 24.15.0 with tsx, configured venv Python, FFmpeg/ffprobe and Remotion cache from `_local/clipperz/config/clipperz.env`; `dist/` rebuilt 04:15Z (UTC throughout). Fixtures in the OS temp directory, `_local/clipperz/tmp/` or this evidence directory; synthetic media only; no AI call, network or user Library.
- Plan freshness (`plan.md`, written before edits): repair-1 `snapshot-capture.mjs --check` reported 6 drift lines, exactly `findings-ledger.md`, `spec.md` and `spec-log.md` (lead bookkeeping, each in two manifest groups), and no application, test, fixture, script, evidence or instruction drift. Repair-1 tracked (`48e97617...`) and slice (`942969ab...`) patch hashes re-verified. One status line outside that snapshot besides the two repair-1 reports: ` M backend/services/strict_ai.py`, modified 18:31 local after handback (17:25) and lead bookkeeping (18:03), adding Codex model and reasoning-effort flags. Not made by this Worker, not imported by the exact render path, not among the 20 `baseline-1b2.json` Python inputs. Left untouched and recorded in the manifest. No relevant drift for R1/R5.
- Resume before lead reconciliation: Status (changes-requested on R1/R5, repair-2 next, Worker on relay) agrees with the repair-1 Handoff, disposition and tree; the only discrepancy is the `strict_ai.py` change above.
- Implementation: implemented
- Verification: pass
- Submitted for review: yes; acceptance and WS-12/16 disposition belong to the coordinating lead after fresh independent follow-up.

## Design as implemented

- R1 / WS-12: `assertOwnedDirectory` now lstat-checks the configured root itself first. A symbolic link, junction or non-directory there is refused with `OWNERSHIP_ESCAPE`; nothing is followed and no realpath is substituted. A missing root is created only on writing paths, then re-checked; owned descendants are checked as before. Returned artifacts are checked from the configured export root down to `final/` instead of from the namespace. This covers drafts (before the sidecar write), new renders (before any operation is recorded), namespace creation, revision documents and artifact paths. Replay still answers first and writes nothing.
- R5 / WS-16: `validateReceipt` additionally enforces the accepted renderer contract, read from `exact_render.py`, `clip_generator.py`, `video_processor.concat_outro`, `media_probe.parse_duration_seconds` and `backend/main.py` without editing Python:
  - `time_domains` equals the exact v1 map, keys and values.
  - `words.source` equals `words_in_intervals` of the captured words, unmodified and in supplied order. `words.content` equals `map_words_to_content`: same count, text and metadata exact, times within the existing 0.002 s rounding. `content_text` follows `content_text` with Python strip semantics. Unavailable stays null/null/[].
  - Captions: `requested` true (the bridge forwards no captions flag), `style` and `filler_cleaning` equal what was sent, ASS only with `allow_ass_fallback`, no words unless rendered. Rendered words must be an ordered subsequence of content words (the cleaner only drops entries) and identical to them when cleaning is off. No cleaner was implemented.
  - Bookends: top-level and per-bookend `requested_fade` equal the sent fade (bridge default 0). Hard cuts overlap 0. A crossfade needs a fade above 0 and 0.05 <= overlap <= fade and <= max(0.05, asset - 0.05). Intro region is [0, asset - overlap] with transition [asset - overlap, asset]. Outro region is [E - overlap, E - overlap + asset] with transition [E - overlap, E], where E lies within the existing join tolerance of offset plus measured content. The output add-up and all tolerances are unchanged.
- Fake renderer corrected where it misrepresented the renderer: invented domain map, wrong heuristics list, word membership by start only with unclipped starts, null fade instead of the bridge's 0, unclamped crossfade overlap, bookend measured durations, caption unavailable reasons, null source duration.

## Execution Receipt

"Final snapshot" is the manifest above; no implementation, test, fixture, script or check input changed after the final runs.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| Before-edit reproduction (B2A-4/5) | `node --import tsx _local/project/evidence/writing-studio/1b-2a-repair-1/review/repro.mjs`, unchanged (SHA-256 `ac166230...`), reviewer `repro-result.json` copied aside and restored; expect 0 with the four defects | 0 at 03:52Z: rootLinks committed through both junctions (1 physical group, 2 sidecars); words, composition and domains committed; reviewer file hashes identical after restore | `repro-before.log`, `repro-before-result.json`, `review-original-repro-result.json`, `review-artifacts-before.sha256`, `review-artifacts-after-restore.sha256` | pre-edit (repair-1 snapshot plus lead bookkeeping) | self |
| After-edit reproduction, obsolete assertions (B2A-4/5) | same unchanged command; expect non-zero at the linked-root draft save | 1 at 04:15Z: uncaught `OWNERSHIP_ESCAPE` "draft sidecar directory: configured root .../linked-history is a symbolic link or junction" at `repro.mjs:29`, before its assertion block; no result written; reviewer file hashes identical | `repro-after.log`, `review-artifacts-before-after-run.sha256`, `review-artifacts-after-run.sha256` | final | self |
| Corrected demonstration (B2A-4/5) | `node --import tsx _local/project/evidence/writing-studio/1b-2a-repair-2/demo.mjs`; expect 0, every corrected outcome asserted | 0 at 04:15Z, "demo: all corrected outcomes hold": junction roots (both, export only, history only) refuse the revision, and the draft whenever history is linked, with 0 renders, 0 operations and outside bytes unchanged; intermediate link refused; missing roots created as real directories and commit; export root swapped after render refused; the review's words, composition and domains receipts `failed` with version 0 and no document; 17 further single contradictions refused; 7 valid boundary receipts committed | `demo.log`, `demo-result.json` (fixture `demo-fixture-UmHg8W`) | final | self |
| B2A-1,2,4,5 focused suites | `node scripts/verification/run-tests.mjs node src/services/clip-revisions.test.ts src/services/clip-revisions.process.test.ts`; expect 0 | 0: `Test Files 2 passed (2)`, `Tests 38 passed (38)`, 04:15Z | `node-focused-revisions.log` (diagnostic `-run1`, `-run2` below) | final | self |
| B2A-1,2,4,5,6 real bridge | `node --check scripts/verification/check-saved-revision.mjs && node scripts/verification/check-saved-revision.mjs`; expect 0, `Passed` | 0: `Passed`, 12 steps; outro `hardcut`, output 3.135 s, decoded `cyan, green` only, caption pixels 5035/2956; new step `configured root links`: draft and revision `OWNERSHIP_ESCAPE`, link targets hold only their sentinel, history bytes and groups unchanged; every real receipt accepted by the stricter validator; Cleanup kept 5 groups | `check-saved-revision.log`, `check-saved-revision-result.json` (fixture `saved-revision-MqCh5K`) | final | self |
| B2A-3,6 full Node suite | `node scripts/verification/run-tests.mjs node`; expect 0 | 0: `Test Files 37 passed (37)`, `Tests 304 passed (304)`, 04:16Z | `node-full-suite.log` | final | self |
| B2A-6 build | `node scripts/installation/run.mjs npm build run build`; expect 0 | 0: `built in 1.78s`, 04:15:20Z | `build.log` (diagnostic `build-run1.log` failed, `build-run2.log` passed) | final | self |
| B2A-6 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json`; expect 0 | 0 at 04:15:23Z (diagnostic run1 also 0) | `client-types.log` | final | self |
| B2A-5 production opt-in and callsite audit | `git status --porcelain -- backend tests` compared with pre-edit lines; grep importers of `clip-revisions`/`ClipRevisionService`, `timing_mode`, `.revisions` in `src`/`scripts`; expect no Python change, no production importer | as expected: backend/tests status identical to pre-edit; importers are the service, its types, `models/index.ts`, tests, test support, worker fixture and check; other `timing_mode` use is the existing `check-exact-render.mjs` | `production-optin-and-python-audit.log` | final | self |
| B2A-6 retained Python evidence | SHA-256 of `baseline-1b2.json` inputs; expect Python unchanged | Python 20/20 same (other changes: the lead records and the reviewed 1B.2a `models/index.ts`/`clips-history.ts`, unchanged since repair-1). Justification: no Python, dependency or configuration input changed; the real bridge ran fresh; `strict_ai.py` is outside covered inputs and exact-render imports | same log | final | self |
| AC-12 snapshot binding | `node _local/project/evidence/writing-studio/1b-2a-repair-2/snapshot-capture.mjs`; expect manifest, patches, hashes | 0: 78 entries, tracked patch same as pre-edit, 4 slice files changed, 3 unchanged, no missing evidence | `snapshot/`, `repair-2-slice.patch`, `snapshot-capture.log` | final | self |

- Executor identities and target: every row `self`, this Worker session, configured local runtime, disposable fixtures.
- Runtime coverage: R1 real junctions at the export root, history root and both (the review schedule), an export root swapped to a junction after render (artifact path), a history root swapped after render (revision document path), missing roots, retained intermediate/clip-root/late-sidecar/linked-group cases. R5: the review's three receipts; a 29-case relational matrix (domains, source words, content words, text, caption settings and words, fades, overlap, regions, transitions) beside the existing 31 malformed cases; valid boundary, reversed and repeated intervals, metadata, rounding, supplied-empty, unavailable, clamped crossfades, hard-cut fallback with a fade, filler cleaning. R2/R3/R4 regressions and real SIGKILL/Python/Cleanup schedules pass unchanged.
- Human assistance: none.
- Not applicable: fresh Python suites and `check-exact-render.mjs` (no Python input changed; retained by hashes); preview/cleanup/smoke scripts and Studio walkthrough (no UI, route, CLI, MCP or Cleanup change); live AI smoke (no AI call).
- Not run: none of the checks named in `plan.md` or the direction.
- Changed inputs after checks: none. This report and the recheck line are the only later writes.

## Change inventory

Git-derived (`snapshot/git-status.txt`, 78 entries, the same status set as `pre-edit-git-status.txt`; the tracked patch equals the pre-edit capture). Repair changes, all untracked slice files, in `repair-2-slice.patch`:

- `src/services/clip-revisions.ts` (+184/-41): root-inclusive ownership check, artifact check from the export root, renderer contract helpers, relational receipt validation, module contract text.
- `src/services/clip-revisions.test.ts` (+207/-0): root-level junction, late root swap and missing-root tests; 29 relational matrix cases; review counterexamples; valid near-boundary receipts.
- `src/services/clip-revisions.test-support.ts` (+83/-33): fake receipt aligned with the renderer.
- `scripts/verification/check-saved-revision.mjs` (+40/-4): real-bridge configured-root junction step.
- Unchanged slice files: `src/models/clip-revisions.ts`, `clip-revisions.process.test.ts`, `fixtures/revision-worker.ts`.
- Ignored evidence under `_local/project/evidence/writing-studio/1b-2a-repair-2/`: `plan.md`, pre-edit capture, reproduction logs and restored-hash records, `demo.mjs` and results, all check logs including diagnostic runs, audit, `snapshot-capture.mjs`, `snapshot/`.

No Python, dependency, lockfile, configuration, route, UI, Cleanup, migration, instruction, lead-owned record or earlier report changed. Reviewer artifacts are byte-identical; running the unchanged script created `review/fixture-KcswfZ` and `review/fixture-oX2p8X` beside them.

## Deviations and decision requests

None requiring a lead decision. Delegated choices for review:

- Parents above a configured root are the user's configured location and are not inspected. A realpath comparison was not used: it would either substitute the target or reject ordinary short-name or redirected paths.
- A linked export root alone does not block a draft, which writes only beneath the history root; it blocks every revision.
- `clips.json` stays owned by the accepted shared history service, unchanged; the revision service refuses its own sidecar, namespace and artifact writes.
- `captions.requested` must be true because the bridge forwards no captions flag. A future bridge that forwards one must update this check; the WS-06 forwarding observation is untouched.
- Source words and drawn caption words compare exactly; content times use the existing 0.002 s rounding. The crossfade asset clamp applies when the asset is above 0, mirroring `concat_outro`. `heuristics_disabled` and `measured_output_duration` remain shape-only checks, as the direction did not name them.

## Limitations and findings

- Defects fixed: WS-12 and WS-16 in product code (pending fresh review; lead disposes). The fake renderer misrepresented the renderer as listed above; corrected as WS-16 prevention. Three authoring defects during this assignment were fixed before final runs, with logs retained: tool input decoded Unicode escape sequences in a new regex into raw line separators (`build-run1`/`node-focused-revisions-run1`/`demo-run1` transform failures), replaced by a code-point set; a fixture word lacking `confidence` (TS2741); a test operation id containing `+` (`-run2`, 37/38).
- Uncertainty: ownership is a static check, with no claim against concurrent replacement. Crossfade and ASS relationships are exercised through the fake renderer only; this installation takes `hardcut`. With filler cleaning on, drawn words are proven only an ordered subsequence.
- Out-of-scope observations: the concurrent `strict_ai.py` change (not reverted); the reviewer script leaves fixtures in the review folder when rerun. Extra diagnostic fixtures: `demo-fixture-lcZHiI`, `demo-fixture-dbLjGo`, `_local/clipperz/tmp/saved-revision-GQg0os`.
- Proposed durable corrections: the earlier proposal to document `check-saved-revision.mjs` and the revision layout in `docs/local-setup.md` still stands, now including configured-root refusal. Lead reconciles.

## Handoff

- Checkpoint or actual handoff: handed off, 2026-09-13, this Worker session. Implementation writes stopped at this report.
- Current implementation owner: ownership returns to the coordinating Project Lead for fresh independent follow-up; not self-accepted.
- Current snapshot: HEAD `8cf6b82` plus `_local/project/evidence/writing-studio/1b-2a-repair-2/snapshot/` (manifest `37227a0f...`, tracked patch `5a30e84d...`, slice patch `f1050ab1...`).
- Unfinished work and unresolved findings: none in this repair's scope. WS-03/04/05 and legacy WS-06/09 remain open; 1B.2b not started.
- Last failed approach: none in product code; the decoded-escape regex was replaced before final runs.
- Next action and owner: coordinating lead arranges fresh independent follow-up of this snapshot against lead-11 and inventory 4.1.0-local-1, then disposes WS-12/16 and B2A-4/5/6. This is repair round two; if either finding remains unresolved, the lead reassesses before any further relay. No commit, push, release, 1B.2b, production opt-in, UI, Cleanup, Python or dependency change was made or is authorized here.
- Pending Isaac decision: none.
- Durable decisions: none (no ADR).
- Manifest recheck after writing this report (2026-09-14T04:21Z): `node _local/project/evidence/writing-studio/1b-2a-repair-2/snapshot-capture.mjs --check` exit 0, `checked 78 files, 46 localEvidence, 5 contractInputs, 16 workflowFiles: 0 drift; HEAD 8cf6b82...`, with exactly one status line outside the recorded snapshot, this report (`snapshot-recheck.log`). The report is excluded from the manifest by design; replacing one stray control character in the Limitations text and adding this line are the only edits after the recheck.
