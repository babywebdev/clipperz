---
record: "review"
task: "writing-studio"
cycle: "1b-2b-2-reassessment"
spec_revision: "lead-18"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2-repair-2/snapshot/manifest.json"
author: "reviewer"
date: "2026-09-21"
state: "active"
summary: "Recommend the bounded lead-18 repair direction: no blocking design finding. Aggregate validation covers remaining reader claims while preserving old-document compatibility. Application acceptance remains unresolved."
read_when: "Disposing the reader R2 reassessment or implementing and reviewing its bounded repair-3 direction."
evidence: "_local/project/evidence/writing-studio/1b-2b-2-reassessment/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Review: writing-studio / reader R2 reassessment

## Review identity and coverage

Fresh non-author Project Lead review-only agent `/root/review_reader_reassessment`, with no inherited planning/implementation conversation. One bounded design pass, not application acceptance. Reviewed lead-18's reassessment against B2B2-1..5, current baseline, constraints/exceptions, repair-2 remaining findings, reader response/projections, serving route, writer receipt/final-composition validation, exact producer and opening-card producer. No implementation, delegation or shared-record edits.

Application base: `fed8ed13dcb2aade06bee341953d6b10d58bff13`; repair-2 manifest SHA-256 `01e88e25f56b208e85dfaf8877dfc6aa2653ffbd5209d1dc08a8392571c3e30f`. Reviewed spec SHA-256 `023c8982943c5162286964a1ba35512b525ca150f4cb15df06e98db8ed17718b`. Lead records differ from application snapshot as disclosed. Inspected Git-derived tracked/untracked paths; Git warned that its global ignore file was inaccessible. Independently rehashed all 47 rows in `lead-baseline-check.json`: zero mismatch; HEAD and manifest hash match. This is a targeted input comparison, not a whole-tree clean claim.

## Verification assessment

Design evidence adequate; implementation verification remains **fail/incomplete for remaining R2**, as the repair-2 review records. No full tests, build, new rendering, HTTP restart or new behavioral reproduction executed for this design assignment. No human assistance or active Studio/user-media interaction.

Read original repair-2 findings and code behind their counterexamples. Independently opened and hashed the four historical documents enumerated in `historical-profiles.json`: each hash matches, each carries numeric exact-v1 tolerance provenance, and none carries final composition. These provide positive historical controls, not an exhaustive inventory of all saves. The direction appropriately requires contrary historical evidence to return to the lead instead of inventing a tolerance/default profile. Python was absent from PATH; bounded record headers supplied the startup index fallback.

## Findings and design assessment

**No actionable blocking design findings identified.** The direction is sufficiently concrete and bounded for the assigned implementation owner to produce its required claim/invariant table and correction.

- **Serving identity:** spec lines 1241–1247 explicitly separate pointer/document identity, summary classification, media usability and by-ID capability. This covers missing/empty summaries missed by `clip-editor-context.ts:1007–1009`; `web-server.ts:1965–1981` requires a summary, reachable regular file and supported resolved extension. Degraded capability retains context without changing those routes or claiming playback is permanently pinned.
- **Raw equations:** spec lines 1248–1261 match `clip-revisions.ts:648–750` and `exact_render.py:469–503`: segment continuity; requested/measured content; hardcut zero overlap; intro offset/transition; outro start, extent and final end; join-input clamp where recorded. Interval arithmetic uses receipt rounding; measured join agreement uses composition plus AV allowance. Historical missing join inputs do not justify skipping independent equations. Reverse source ordering and overlapping words are expressly retained.
- **Final composition:** spec lines 1262–1271 require the missing raw-to-final relationship and separate stored identities, stream timing and container probes. `clip-revisions.ts:1816–1912` supplies card tick/frame arithmetic, packet-count/shift relations, audio-presence/sample allowance and probe agreement. Its container duration is not a universal exact raw-duration-plus-card equation. The direction expressly preserves delayed starts, VFR, AAC and no-audio cases rather than imposing that false equation. Implementation must translate the available stored summaries into checks; it must not pretend they retain every packet or attest present media bytes.
- **Card/artifacts:** spec lines 1272–1280 address contradictory thumbnail/card presence and dangling or wrong-domain placements. `buildFinalComposition` at `clip-revisions.ts:1179–1239` and document assembly at 1513–1548 establish repeated identities and placements. Here artifact `placed_at` is served-file time even when the artifact's own `time_domain` is raw/content-relative. The prose agrees with that producer contract. No-card final tolerance legitimately contains null card/audio values; the restriction on null *exact-v1 timeline* tolerances does not prohibit this no-card record.
- **Compatibility/boundary:** old final-composition absence and missing join inputs/groups remain explicit profiles; current-save validation and runtime imports of save operations are excluded. A single pure reader aggregate boundary is a proportionate response to validation/projection divergence. Required coherent multi-field mutations and actual HTTP checks cover the remaining counterexamples beyond scalar mutations, while retaining original fixtures and independent closure.

## Recurrence and prevention

Read ledger Open and Closed; no ledger archive exists. WS-16 remains the existing reader occurrence, related to earlier writer receipt/composition recurrences and WS-06/09. This design review closes none of them and does not reopen WS-12/17. The proposed aggregate claim table and producer-backed contradictory-record regressions are appropriate prevention. Do not count this successful design scrutiny as a successful application repair or reset the two unsuccessful R2 follow-ups.

## Recommendation and next action

Recommend proceeding with the lead-18 bounded direction after coordinating disposition and the existing manual relay. Preserve the required pre-edit claim table, old-document controls, fresh checks and independent follow-up. This recommendation grants no application acceptance, implementation dispatch, release or subsequent repair loop.

## Coordinating lead disposition and next action

2026-09-21, coordinating Project Lead: accept the lead-18 technical direction for
one manual Worker relay. Read the complete design review and its source-supported
compatibility assessment. No design finding needs another change. Author-lead
closure verified by: not applicable; no application implementation authored here.
This disposition approves direction only: application review remains changes-requested,
WS-16 R2a/R2b open, B2B2-1..5 unaccepted. WS-12/17 and R2c closures remain.

The final spec changes after the review's recorded hash reconcile Status/manual
ownership and this disposition, not the reviewed relationship contract. Repair-3
must preserve the distinction between artifact-local time and served placement,
use only information actually stored, and never claim packet/media attestation from
summary records. One manual implementation handback then fresh independent follow-up;
another unsuccessful same-class follow-up returns to the lead. No recurrence reset,
automatic Worker/repair dispatch, successor work, commit or release.
