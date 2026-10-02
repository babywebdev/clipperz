---
record: "review"
task: "writing-studio"
cycle: "1b-2b-4a"
spec_revision: "lead-26"
snapshot: "_local/project/evidence/writing-studio/1b-2b-4a/snapshot/manifest.json"
author: "agent"
date: "2026-09-23"
state: "active"
summary: "Request changes: adapters meet B2B4A-1..3 and 5 with passing reruns, but WS-23 stays open because the audio-only road writes a derived sink into the revision trees (F-1, reproduced)."
read_when: "Disposing 1B.2b.4a, deciding WS-23 closure, D-1 or D-2, or planning the WS-23 repair for the audio-only renderer."
evidence: "_local/project/evidence/writing-studio/1b-2b-4a-review/"
workflow_version: "5.0.0"
instruction_inventory: "docs/workflow/inventories/5.0.0-local-1.md"
---

# Review: writing-studio / 1b-2b-4a

## Review identity and coverage

- Task and spec revision: `docs/project/tasks/writing-studio/spec.md` at lead-26; section "1B.2b.4a bounded assignment: finishing-action adapters (lead-26)", rows B2B4A-1..6, lead-23 and lead-24 sections, constraints and exceptions; planning baseline `baseline-1b2b4a.json`.
- Code snapshot reviewed: base `fed8ed13dcb2aade06bee341953d6b10d58bff13` plus `_local/project/evidence/writing-studio/1b-2b-4a/snapshot/manifest.json`, sha256 `6391643cd9c6c49bc0ca1bd0052bcfdb425cad13252be37974eb5146a5b4c5c0` (verified, `manifest-hash.txt`). `snapshot-capture.mjs . --check` answered "No drift." at start and end (`snapshot-check-start.log`, `snapshot-check-end.log`; the end check ran before this report was written). The slice delta was regenerated from the pre-edit copies and live files and matches `1b-2b-4a-slice-delta.patch` hunk for hunk (`regen-delta.patch`); every pre-edit copy hashes to its baseline or 1B.2b.3 repair-1 manifest entry, and the source files that differ between the 1B.2b.3 and 1B.2b.4a manifests are exactly the delta set.
- Reviewer session/assignment: review-only subagent (claude-opus-5-5), B2B4A-6 fresh non-author review.
- Review independence: fresh subagent spawned by the task-state owner session; starting context was the assignment prompt only, with no planning or implementation conversation. The reviewer authored none of the reviewed code.
- Review depth: full; shared production writers of saved clips across TS and Python and a security-relevant path fence.
- Files and relevant dependencies inspected: all delta files (`clip-legacy-adapters.ts` and its test, `clip-write-fence-route.ts`, `web-server.ts` hunks, `clip-revisions.ts`, models, `clip-write-fence.ts`, `clips_history.py`, `clip_generator.py`, `check-legacy-adapters.mjs`, changed checks and tests including D-2); then `generate_clip` in full, `services/audiogram.py`, `remotion/render-audiogram.mjs`, `backend/main.py` `handle_create_clip`, the rerender handler, `policy.ts`, `/api/image`, the reader's capability rows, Python path verdicts.
- Coverage limits: no browser or Studio client run; F-1 reproduced through the direct `create_clip` bridge, not over rerender HTTP (the rerender path is established by code reading); `check-revision-fence.mjs`, `check-saved-revision.mjs`, `check-exact-render.mjs`, build and client types not rerun (author evidence inspected; tree unchanged).

## Verification assessment

- Required evidence: fail for B2B4A-4 (F-1); pass for B2B4A-1, -2, -3, -5 and the B2B4A-6 check list.
- Expected-value provenance: adapter tests and the real check derive expectations from the fixture recipes, decoded colors of synthetic media, recorded card hashes, the legacy route contracts and the 1B.2b.3 control capture; the request-identity test recomputes the hash independently. Changed expectations (`card_seconds` projections, adapted PATCH rows) follow lead-26. No implementation-derived expectation found.
- Evidence inspected: implementation receipt rows, `final/*` logs and results, `pre/ws23-repro*`, `superseded-1/`, `superseded-2/` READMEs, `delta/pre-edit-copies.json`.
- Additional checks or reproductions performed (evidence folder `_local/project/evidence/writing-studio/1b-2b-4a-review/`):

| Check | Command | Result | Evidence |
|---|---|---|---|
| Focused Node | `node scripts/verification/run-tests.mjs node --maxWorkers=1` adapters, fence route, editor-context route, fence, card tests | exit 0, 5 files, 143 passed | `node-focused-review.log` |
| Full Node | `node scripts/verification/run-tests.mjs node --maxWorkers=1` (PowerShell) | exit 0, 48 files, 837 passed | `node-full-review.log` |
| Full Python | `node scripts/verification/run-tests.mjs python` | Git Bash: exit 1, collection interrupted because `platform.win32_ver` spawned `cmd`, which the offline harness blocks (environmental, not product). PowerShell: exit 0, 1006 passed, 6 skipped, 358 subtests | `python-full-review.log`, `python-full-review-ps.log` |
| Real HTTP adapters | `node scripts/verification/check-legacy-adapters.mjs --result ...` | exit 0, `Passed`, 373 s | `check-legacy-adapters-review.log`, `legacy-adapters-review-result.json` |
| Protected sources | `python .../protected-hash-check.py` | reader, read contract, editor route, policy, Cleanup, `exact_render.py`, `video_processor.py`, `opening_card.py`, `backend/main.py` match the baseline; differing inputs are the delta and its `dist` outputs only | `protected-hash-check.log` |
| WS-23 audio-only probe | `node .../ws23-audiogram-probe.mjs` (real bridge, FFmpeg, Remotion, isolated fixture) | control rendered outside; planted file symlink rewrote the owned file (hash changed); case-variant `WRITING-STUDIO` output dir created a file inside `writing-studio/`; both calls reported success | `ws23-audiogram-probe.log`, `ws23-audiogram-probe-result.json` |

- Human assistance: none.
- Adequacy and remaining gaps: B2B4A-4's coverage exercises only video sources; no fixture sends an audio-only source through the legacy road.

## Findings

Confirmed defects:

| ID / importance | Location and snapshot | Failure condition and impact | Evidence | Required outcome / status |
|---|---|---|---|---|
| F-1 / Medium, blocking for B2B4A-4 and the WS-23 closure | `backend/services/clip_generator.py` `generate_clip` audio-only branch (returns `render_audiogram(...)` before the new `_refuse_revision_sinks` check); `backend/services/audiogram.py` `render_audiogram` (`os.makedirs(out_dir)`, `final_path = <out_dir>/<safe title>.mp4`, FFmpeg `-y` output); snapshot `6391643c...` | An audio-only source in a non-exact `create_clip`, `batch_clips` or rerender call writes its title-derived output with no path verdict. A file link planted at that name rewrites owned revision media; an output dir that is a case variant or link into `<export root>/writing-studio/` creates files there. Rerender passes `title=clip.title` and `output_dir=dirname(output_path)`, so after a title edit the derived name differs from the fenced `output_path`. Same class as WS-23; B2B4A-4's outcome ("Legacy rendering writes nothing into the revision trees through a derived sink") is unmet. The spec's sink list named only the video branch's sinks, which contributed. | Reproduced on the reviewed snapshot: `ws23-audiogram-probe-result.json` (owned hash `60392e6e...` became `2c70133d...`; `exports/writing-studio/clip-owned/case/wscase.mp4` created). Code: `clip_generator.py` lines 1297-1318 versus 1845-1861. | Check the audio-only road's output dir and derived final path with the Python path verdict before `os.makedirs` and before the renderer runs, refusing with `REVISION_PATH_PROTECTED` (rerender 409 with the fence body, error for other callers); add audio-only fixtures (planted file symlink, junction, dangling link, case variant) to the Python tests and `check-legacy-adapters.mjs`; or record a task-state spec amendment that scopes it out and keeps WS-23 open. Open. |
| F-2 / Low, nonblocking | `src/services/clip-editor-context.ts` line 1323, `save_revision` capability detail (protected byte-identical by lead-26); snapshot `6391643c...` | The reader tells clients "No route commits a revision", which is false once finishing actions commit revisions on tracked clips. Misleading capability text for the future editor UI; the code (`WRITE_ROUTE_NOT_AVAILABLE`) is still accurate for the editor save route. A spec-level gap: lead-26 froze the reader while enabling commits. Same as self-audit A-1. | Source line read; `protected-hash-check.log` confirms the file is unchanged. | Task-state owner schedules a wording correction (for example in 1B.2b.5, which already changes capabilities) and records it in the spec carry list or ledger. Open. |

Hypotheses: none beyond F-1's rerender HTTP path, which follows from the handler's parameters but was not driven over HTTP.

Optional suggestions (not blocking):
- O-A: thumbnail metadata is built from the fence-time `thumbnail_config` and replaces non-projected keys at commit; a metadata write between the check and a slow generate is overwritten. The legacy `clips edit --thumbnail-config` merge had the same lost update, so this is not a regression.
- O-B: record asset content hashes for logo, intro and outro in a later recipe revision so "changed" can be detected (A-8).

Deviations: D-1 is adequate. `policy.ts` refuses `/thumbnail` and `/thumbnail/select` in the local profile, so the adapters there are only reachable upstream; the check runs the same `dist` build with strict AI routing and missing AI command paths, and also asserts the local 403. D-2 preserves B2B2-4's intent: the reader's own graphs still exclude the save service, the studio's only direct importer is the adapter module, and `clip-legacy-adapters.test.ts` separately scans all production sources. It changes a check owned by an accepted slice without being listed among lead-26's intended expectation updates, so the owner should record its disposition, as DR-1 was.

Self-audit observations: A-1 agreed and raised as F-2. A-2, A-4, A-6, A-7 agreed as nonblocking. A-3 agreed (previews may show the applied logo; 1B.3). A-5 agreed; only commits made before this slice carry the stale pointer and none exist in production. A-8 agreed as a design limit (O-B). A-9 agreed as environmental; my serialized full Node run passed.

## Recurrence and prevention

Ledger read: Open table (WS-03, 04, 05, 06, 09, 23) and Closed table; no `findings-ledger-archive.md` exists. Class matches: WS-23 (open, same class as F-1), WS-12 and WS-20 (closed path-fence relatives), WS-21 (closed refusal wording), WS-07 (closed Windows lock sharing, related to A-9).

- Proposed durable corrections: keep WS-23 Open and add this review's F-1 as an occurrence, extending its prevention destination to the audio-only renderer with audio-only link and case-variant fixtures; add a low row for F-2 (class "capability detail contradicts served routes"); the owner may compare A-9 (`mutation-lock` `tryCreate` rethrowing `EPERM`, save-service tests near the 5 s timeout) with WS-07 and index it if actionable.

## Reviewer recommendation

- Recommendation: request-changes. B2B4A-1, -2, -3 and -5 are met with independently rerun evidence; B2B4A-4 and the WS-23 closure are not (F-1).
- Required corrections or unresolved coverage: F-1 repair or spec amendment with fixtures; F-2 disposition; D-2 disposition.
- Next action for the active task-state owner: dispose F-1 (repair assignment or amendment), then a focused fresh assessment of the WS-23 repair on its new snapshot.

## Pre-repair assessment checkpoint

- Timestamp and reviewer session: No repairs
- Originally reviewed spec revision and snapshot: lead-26; `6391643c...`
- Preserved assessment and finding dispositions before writes: No repairs
- Later correction addenda: none

## Repair and final verification

- Repair authorization and checkout ownership: no repairs (review-only)
- Actual repair author/session: none
- Original reviewed snapshot: `_local/project/evidence/writing-studio/1b-2b-4a/snapshot/manifest.json`
- Final spec revision and final snapshot: not applicable
- Final environment/target: not applicable
- Governing workflow_version and instruction_inventory for repair: not applicable
- Repair change inventory and affected interfaces: none
- Finding dispositions: not applicable
- Evidence validity: not applicable

### Execution Receipt

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| none | not applicable (no repairs) | not applicable | not applicable | not applicable | not applicable |

### Post-repair self-audit

- Final snapshot and author/session: not applicable
- Ten lenses and N/A reasons: not applicable
- New findings, uncertainty and blind spot: not applicable
- Audit verdict: not applicable [no repairs]
- Subsequent changes and affected refresh: none

## Disposition and next action

Separately attributed; the assessment above is unchanged.

- Disposition author/session and date: the Writing Studio task-state owner (Claude Code desktop, claude-opus-5-5), resumed by Isaac on 2026-09-23 after the 1B.2b.4a writer's handoff; it arranged this review and authored no reviewed code. At resume the tree matched `6391643c...` with no drift (`1b-2b-4a-review/owner-resume-snapshot-check.log`); the implementation writer had stopped.
- Review: changes-requested.
- Acceptance basis or blockers:
  - F-1 supported and blocking for B2B4A-4 and WS-23. The owner confirmed it in code: at `clip_generator.py` 1296-1316 the non-exact audio-only branch returns `render_audiogram(...)` before either `_refuse_revision_sinks` call (1838, 1856), and `audiogram.py` 169 creates the output folder unchecked. The lead-26 WS-23 paragraph lists only the video road's sinks. The lead-27 correction states that the requirement covers every sink on the legacy road. Repair-1 goes to a separate implementation writer (spec-log `2026-09-23: lead-27`).
  - F-2 (A-1) supported and nonblocking: lead-26 froze the reader byte-identical, and its code `WRITE_ROUTE_NOT_AVAILABLE` stays accurate for the editor save route. Deferred to 1B.2b.5, which changes capabilities (WS-25).
  - D-1 accepted: the local policy refuses both routes, the local 403 is still asserted, and the upstream phase uses the same `dist` build with strict routing pointed at missing commands and fixed text, so no provider call is possible.
  - D-2 accepted as an intended expectation update. Lead-26 requires the adapter path to import the save service, so B2B2-4's studio-graph exclusion could not hold as written. Its protection is kept: the reader's own graphs exclude the save service, the adapter module is the only importer, and a source scan confirms it. Lead-26 should have listed it; lead-27 records it.
  - A-2, A-4, A-5, A-6, A-7 and A-8 accepted as nonblocking for the reasons in the self-audit and the review. A-2 and O-B go to 1B.2b.5 as optional diagnostics and identity work. A-3 goes to 1B.3. O-A is not a regression and is noted for 1B.2b.5.
  - A-9: two parts. The save-service tests running near the 5 s timeout are a test-environment effect: final evidence uses `--maxWorkers=1`, a runner setting, and no product change is needed. The lock `EPERM` is a pre-existing product defect in the same class as WS-07: `tryCreate` (`src/utils/mutation-lock.ts` 189) and `_try_create` (`backend/services/mutation_lock.py` 195) treat only an existing file as contention, so a Windows delete-pending `EPERM` aborts acquisition instead of retrying until the deadline. This is indexed as WS-26 and scheduled for 1B.2b.5, before adoption. It is not repaired in 4a because it lies outside 4a's scope and in accepted 1A code.
- Conditional closure: not reached. After repair-1, a focused fresh non-author assessment of the WS-23 delta (lead-27 question), because a security path boundary is involved.
- Original independent coverage versus authored repairs: this review covers snapshot `6391643c...` only; repair-1 will need its own assessment.
- Task Status or established phase-state update: spec lead-27 Status: Implementation partial (B2B4A-4 repair pending); Verification fail for B2B4A-4 and pass for the rest; Review changes-requested.
- Ledger update: WS-23 stays Open with F-1 as its second occurrence and an audio-only prevention added; WS-25 (F-2) and WS-26 (lock `EPERM`) added as Open.
- Integration/release approval: not authorized; nothing committed or pushed.
- Next action and owner: Isaac relays repair-1 to an implementation writer in this checkout; the task-state owner then arranges the focused fresh assessment and the acceptance disposition.

Narrative length: about 700 words excluding tables, over the soft cap so that F-1's reachability, D-1, D-2 and all nine observations stay on record.
