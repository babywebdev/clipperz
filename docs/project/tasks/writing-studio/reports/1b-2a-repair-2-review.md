---
record: "review"
task: "writing-studio"
cycle: "1b-2a-repair-2"
spec_revision: "lead-11"
snapshot: "_local/project/evidence/writing-studio/1b-2a-repair-2/snapshot/manifest.json"
author: "reviewer"
date: "2026-09-14"
state: "active"
summary: "Request changes: R1 closes and R2/R3/R4 remain supported; R5 still accepts a crossfade inconsistent with the renderer clamp. Reassess after two unsuccessful repair rounds."
read_when: "Disposing repair-2, reassessing WS-16, or checking retained WS-12/13/14/15 corrections."
evidence: "_local/project/evidence/writing-studio/1b-2a-repair-2/review/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---

# Review: writing-studio / 1b-2a-repair-2

Size exception: independent closures, remaining composition finding and evidence qualifications exceed the 900-word soft cap.

## Review identity and coverage

- Fresh Codex subagent `/root/review_1b2a_repair2`, Project Lead review-only, without inherited implementation/planning history or implementation authorship. One bounded review pass plus targeted reproductions; no delegation, implementation/shared-record edits or production interaction.
- Requirements: spec lead-11 bounded 1B.2a, retained repair-1 contracts, repair-2 direction, B2A-1..6, constraints/exceptions; prior review/disposition and ledger. Inspected actual service and renderer contract before Worker rationale.
- Accessible snapshot: HEAD `8cf6b82039381e62b0f1dac1953c0c8c279e86f1`; independently checked tracked patch SHA-256 `5a30e84de43ac24d853f865fe5ffd3406c9cd6280401d41cb096c203a442fb82` and four-file slice patch `f1050ab1a20840f419045149a3d1fffb32cb3b570069ccd2ab1390b2fb1c2219`. Git-derived manifest captures untracked implementation. Recheck: 78 files, 46 local evidence, 5 contract inputs, 16 workflow files; only spec/spec-log bookkeeping drift, each listed twice. Application/evidence unchanged; excluded Worker report alone outside recorded status inventory before this report.
- Reviewed ownership validation, receipt mapping/composition, request capture and operation commit/failure/replay, support fixtures/process tests, bridge check, accepted Python word/bookend construction and callsite search. Production importers remain absent. The existing single history transaction and immutable dependency publication design remain appropriate; a second persistence or rendering system is unnecessary.
- Limits: new reviewer execution is synthetic file/process verification, not FFmpeg, UI, AI, power-loss or adversarial concurrent path replacement testing. Worker real bridge is attributed evidence, not reviewer execution. Disposable reproduction files remain beneath this review's `fixture-*/` directory.

## Verification assessment

Required evidence: **fail for acceptance**, because B2A-4 remains contradicted by an independently reproduced result.

Worker evidence supports full Node **304/304**, build/client types exit 0, corrected demonstration and twelve-step real bridge exit 0, including decoded cyan/green sequence, captions, Python mutation, restart/replay and Cleanup protection. Independent focused execution supports the expanded root/transcript/domain tests and retained R2/R3/R4 schedules.

Python qualification: 20 matching baseline hashes cover retained exact-render/history inputs, not the entire Python application. The concurrent `strict_ai.py` diff changes Codex command model/effort flags. It was preserved, not authored by this repair. That command-construction branch is not exercised by the synthetic exact-render path; fresh bridge evidence and unchanged relevant renderer/dependency inputs support retaining scoped exact/history coverage. Do not describe the old full Python suite as a fresh validation of the concurrently changed AI subsystem. No current AI behavior or full-Python pass is certified here.

All following checks use this bound application snapshot, Windows Node 24.15.0 and configured local runtime; executor **self**, this reviewer; no human assistance:

| Command / acceptance | Expected and observed | Evidence (relative to review evidence root) |
|---|---|---|
| `node scripts/verification/run-tests.mjs node src/services/clip-revisions.test.ts src/services/clip-revisions.process.test.ts` / B2A-1..6 affected coverage | Expected pass; approved-context exit 0, **38/38**. Initial sandbox run: 34 pass, four child-process barrier timeouts. The outer PowerShell tail command returned 0; test log records failure. Identical approved run passes, so initial failure is environmental. | `focused.log`, `focused-approved.log` |
| `node --import tsx _local/project/evidence/writing-studio/1b-2a-repair-2/review/repro.mjs` / B2A-4 | Expected valid control plus remaining counterexample; approved-context exit 0, both assertions hold. Initial sandbox attempt fails at tsx `uv_os_get_passwd` before script execution; outer tail returned 0. | `repro.mjs`, `repro.log`, `repro-approved.log`, `repro-result.json` |
| `node _local/project/evidence/writing-studio/1b-2a-repair-2/snapshot-capture.mjs --check` / B2A-6 | Expected unchanged application; exit 1, only four spec/spec-log bookkeeping drift entries; no application/evidence drift. | `snapshot-check.log` |

## Findings

| ID / importance | Location and snapshot | Failure condition and impact | Evidence | Required outcome / status |
|---|---|---|---|---|
| R5 / WS-16 / P2, remaining finding | `src/services/clip-revisions.ts:571`, `validateReceipt`, bound repair-2 snapshot | Request a 0.5-second intro fade with two-second intro and content. A receipt reports `xfade_acrossfade`, requested fade 0.5, applied overlap 0.1, coherent transition 1.9..2 and output/probe 3.9. It commits revision 1 with exact provenance. The accepted renderer's clamp produces 0.5, not 0.1; bounded-but-wrong overlap still silently changes the requested transition. | Independent `repro-result.json`: `wrong-fade` commits; `valid-control` commits with overlap 0.5, transition 1.5..2 and output 3.5. Synthetic media/probe agree with each receipt; no size/duration inconsistency causes the result. | **Open.** Validate the actual clamp and crossfade eligibility against available join inputs, with justified precision handling; reject an incompatible overlap without moving pointers. Preserve valid clamped fades and hardcut fallbacks. |

Contract evidence: `backend/services/video_processor.py:3181` computes main duration and requested fade; lines 3217–3221 compute `S = min(parsedFade, max(0.05, mainDuration - 0.05))`, then (when appended duration is positive) `S = min(S, max(0.05, appendedDuration - 0.05))`. Crossfade additionally requires `max(0, mainDuration - S) >= 0.05` and `S >= 0.05`; successful xfade records S. In this reproduction both inputs are 2 seconds and fade is 0.5: S is exactly 0.5 and eligibility holds. `exact_render.bookend_region` rounds overlap/region values to three decimals. The service currently accepts any overlap between 0.05 and its upper bounds; it neither establishes equality to this clamp nor applies the other input's bound.

Precision/input limit: real concatenation uses probed input durations, and an outro's main input may already include intro composition. `content_duration_measured` is rounded video end, whereas `concat_outro` probes media duration; the receipt does not retain both actual join-input durations. Asset/region rounding and composition/A/V tolerances cannot reconstruct those raw inputs uniquely near clamp or eligibility boundaries. Existing fields establish this coarse contradiction (0.4 seconds with ample durations), but do **not** support universally exact two-input clamp/eligibility validation without additional assumptions or slack.

Design recommendation for lead reassessment: a small additive provenance field retaining the actual `main_duration` and `appended_duration` already recorded by `concat_outro` is safer than treating video end as media duration or inventing another tolerance. Preserve those input values at their original precision; compare the resulting clamp to the three-decimal overlap with the existing receipt-rounding allowance. Derive eligibility from the raw inputs, while still allowing supported hardcut fallback when an eligible crossfade fails. Define compatibility explicitly for receipts lacking the new fields rather than silently assigning exact proof. This is a proposed scope correction for the lead, **not** authorization to edit Python under lead-11, and requires affected Python/type/bridge evidence if adopted. No renderer algorithm redesign is necessary.

## Verified corrections and retained closures

- **R1 / WS-12: recommend closure** on the assigned static configured-root boundary. Root lstat occurs before recursive creation/writing, owned descendants remain checked, and artifact checking starts at exportRoot. Independent tests pass for configured/intermediate junctions, late linked root/sidecar/artifact refusal, unchanged outside bytes and ordinary missing roots. Parent directories above configured roots remain the configured location; no adversarial filesystem-swap guarantee is claimed. Drafts need only their history root; pure replay need not touch exports.
- **R2 / WS-13 retained:** incarnation/request identity still protects success/failure/invalidation; independent late completion, recreation, cancellation and real-process schedules pass.
- **R3 / WS-14 retained:** synchronous detached capture remains before awaits; mutation tests verify saved draft/render/replay inputs.
- **R4 / WS-15 retained:** lifetime operation receipts and replay-before-source-check remain; old successful/failed-ID and missing-source replay regressions pass.
- R5's earlier invented transcript/caption-style, empty-domain and gross hardcut composition cases are corrected; valid rounding, unavailable/supplied-empty and caption-cleaning distinctions pass. This is partial repair, not reopening those demonstrated corrections.

## Recurrence and prevention

Read ledger Open and matching Closed; no archive exists. Propose closing WS-12, retaining WS-13/14/15, and adding this continued occurrence to WS-16, related to WS-09/06 without reopening unchanged predecessor closures.

Prevention should test the **crossfade relationship**, not just another scalar example: a table covering fade-limited, main-limited and appended-limited joins, intro/outro order, short-input eligibility and rounding edges. Pair valid contract-derived receipts with wrong-overlap mutations that update their dependent regions/output/probe coherently. This makes the validator detect the violated request relationship instead of relying on unrelated arithmetic mismatches. Keep fixtures independently grounded in the Python formula; no global workflow change.

## Reviewer recommendation

**Request changes for R5; recommend R1 closure and retain R2/R3/R4 closures.** WS-16 has survived both repair rounds. The coordinating lead must explicitly reassess the validation premise, available inputs and prevention strategy before any further repair relay. No automatic repair loop, acceptance, production integration, next slice or release follows from this report.

## Coordinating lead disposition and next action

2026-09-14, existing coordinating Project Lead: **changes requested**, R5/WS-16.
Read this complete report, reproduction outcomes and actual concat/receipt code.
The coherent wrong-fade case violates the deterministic renderer clamp. Close
R1/WS-12 on the repair-2 static boundary and retain WS-13/14/15 closures; independent
38/38 focused coverage supports those decisions. Earlier R5 scalar/word/domain
corrections remain supported, but the full class is not closed. 1B.2a is not accepted.

Author-lead closure verified by: not applicable; no coordinating-lead application
authorship. Fresh reviewer `/root/review_1b2a_repair2` independently verified the
closed and retained corrections. Further implementation requires fresh review.

**Required two-round reassessment completed before another relay.** Validation
used necessary overlap bounds as if they established the renderer's selected
overlap. Fixing that with a guessed content duration would introduce another
assumption: the receipt loses one raw join-input duration, and rounded video end
does not uniquely recover probed media duration near the clamp/eligibility thresholds.
Repeated hand-authored fake receipts missed this contract gap. Persistence/publication
architecture is not implicated; no second store or renderer redesign is needed.

Adopt the bounded producer/consumer correction in spec lead-12: additive exact-v1
bookend `join_inputs` with the actual main_duration/appended_duration already
recorded by concat_outro, unrounded. Compute clamp and eligibility from those inputs
and captured fade, compare rounded overlap within existing allowance, and retain
supported zero-overlap hardcut fallback. No new tolerance or probe guarantee.
New saves with bookends require the provenance; old persisted receipts remain
readable and are not silently rewritten/upgraded. This explicitly changes the
prior TS-only write boundary to permit minimal Python receipt serialization and
affected types/tests, preserving legacy behavior and render algorithms.

Prevention now requires producer-derived matrix cases using actual Python join
report generation under controlled I/O, plus valid/wrong-overlap pairs whose other
timing/probe data stay coherent. Fresh focused/full Python, exact bridge, Node,
build/types and saved-revision bridge are required. Preserve strict_ai.py and assess
any related test failure separately; the old full Python suite is not validation
of that concurrent AI change.

Next manual Worker cycle remains named `1b-2a-repair-3`, preserving the recurrence
history. Report `reports/1b-2a-repair-3-worker.md`, evidence under
`_local/project/evidence/writing-studio/1b-2a-repair-3/`. Budget after reassessment:
one bounded contract implementation and fresh independent follow-up; unresolved
results require another explicit disposition/reassessment, not an automatic repair
loop. No application edit or Worker dispatch occurred here. No commit, push,
release, 1B.2b or whole-slice acceptance. The complete Worker prompt is manually
relayed by Isaac under the existing ownership and no-agent restrictions.
