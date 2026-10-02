---
record: "review"
task: "writing-studio"
cycle: "1b-2b-1"
spec_revision: "lead-13"
snapshot: "_local/project/evidence/writing-studio/1b-2b-1/snapshot/manifest.json"
author: "reviewer"
date: "2026-09-15"
state: "active"
summary: "Request changes: malformed composition receipts can commit and persist contradictory producer facts. Independent ordinary card, process and composer tests pass; snapshot and Worker evidence are available."
read_when: "Disposing 1B.2b.1 or repairing composition receipt validation and WS-16 recurrence."
evidence: "_local/project/evidence/writing-studio/1b-2b-1/review/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---

# Review: writing-studio / 1b-2b-1

## Review identity and coverage

Fresh Project Lead review-only agent `/root/review_1b2b1`; no inherited author conversation, implementation authorship, repairs or delegation. Read installed startup and lead-13 requirements before inspecting the new composer, service save/validation/projection/replay paths, types and tests; then read Worker rationale and accepted repair-3 review. Review covers bounded B2B1-1..5, preserving predecessor constraints. Production adapters, browser behavior, Cleanup eligibility and legacy WS-06/09 remain outside this slice.

Snapshot: HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13`, manifest SHA-256 `32ca283f9521a485bdef5fc422108647277c0d1e078fab2a4aa2ec3a0184c899`, tracked patch `4340dca4d6bc57d195b61c0e57036fc3bc117d96e52a774de2f2217360087f84`, slice patch `8b884ae8c14ace1f484e16c9b831ae8ff2c20de26753814a7700ababb94ca40a`. Git-derived changed/untracked application paths match the submitted inventory. `review/binding.json` checks 120 entries: only spec/spec-log bookkeeping differs, each appearing twice in the inventory categories. All application, 57 evidence and 22 contract inputs match. `review/copies.json` confirms all ten untracked copies. Patch/manifest hashes match. Coordinator identifies only Status/header/log edits during review; no acceptance or application change.

## Verification assessment

Required evidence: **fail on B2B1-2 rejection behavior**, despite passing submitted checks. Worker log tails and bound artifacts substantiate 327 Node tests, 991 Python tests/313 subtests (six skips), successful build run 2, client types, syntax, both real bridges, parity and genuine old-operation replay. Initial failed build remains documented. Existing tests do not cover the demonstrated receipt holes.

Independent receipts below use this snapshot and configured Windows Node/Python/FFmpeg runtime; executor **self**, this reviewer, synthetic media and isolated storage. No human assistance, AI or network. Evidence paths are relative to the review directory.

| Command / criteria | Expected; actual | Evidence |
|---|---|---|
| `node scripts/verification/run-tests.mjs node src/services/clip-revisions.card.test.ts src/services/clip-revisions.card-producer.test.ts src/services/clip-revisions.process.test.ts` / B2B1-1..4 | Pass; exit 0, 22/22 including real producer and interruption schedules | `focused.log` |
| `node scripts/verification/run-tests.mjs python -k opening_card` / B2B1-2/3 | Pass; exit 0, 14 tests/32 subtests | `python-card.log` |
| `node scripts/installation/run.mjs node card-review-repro node_modules/tsx/dist/cli.mjs _local/project/evidence/writing-studio/1b-2b-1/review/receipt-repro.mts` / B2B1-2 | Valid control commits; mutated receipts should fail. Exit 0; all three commit, demonstrating R1 | `receipt-repro.mts`, `receipt-repro.log` |

Configured Python initially could not run the read-only index inside the sandbox (access denied); bounded headers supplied the index. Approved execution subsequently ran the independent checks successfully. No product failure is inferred from that tool restriction. Full suites/bridges were assessed from Worker evidence rather than unnecessarily repeated.

## Findings

**R1 / P2 — Validate all retained composition facts before committing (open).** At `src/services/clip-revisions.ts:1655–1764`, `validateComposition` checks only selected fields. Audio claims are checked for nullness, but their sample rate, channel count, start and duration are never compared with independently measured audio. Several declared mandatory duration/boundary fields are neither required nor compared. The unchecked object is cast to `OpeningCardReceipt` and persisted at `:1078` as `final_composition.card.producer`.

The reproduction obtains an actual receipt from the real Python composer and uses real ffprobe validation. Control commits. A second run changes both raw/output audio claims to **1 Hz, 99 channels, start 999, duration 999**: it also commits, retaining those values alongside actual **44,100 Hz mono, start 0, duration 3.54**. A third removes raw/output duration and card frame-duration/start/end fields: it commits too. The script reloads each saved revision to establish durable acceptance, not merely a returned promise.

This violates lead-13's explicit requirement that invalid/missing/contradictory composition receipts fail without a successful revision and B2B1-2's truthful probe agreement. The demonstrated media itself remains valid and the recomputed outer timing is correct; this finding does **not** claim audible corruption or prior-output loss. It concerns a successful pointer commit and durable contradictory provenance at the producer/consumer boundary.

Required outcome: validate the complete supported receipt schema and compare retained measured facts with actual probes/captured inputs and derived card timing before commit. Reject missing or contradictory required facts; preserve previous pointers and accurate residuals. Add producer-backed mutations for these omissions/contradictions, with the valid producer receipt remaining accepted. Review all retained fields together rather than patching only these examples.

## Recurrence and prevention

Read ledger Open and Closed; no findings archive exists. Propose recording R1 as a new occurrence of **WS-16, malformed or contradictory receipt accepted**, now at the composition boundary; preserve the accepted raw exact lead-12 closure and its limits. Prevention belongs in the card producer/consumer suite and validator. WS-03/04/05 and legacy WS-06/09 remain open; this review does not reopen their accepted scoped corrections. No global workflow change is needed.

## Reviewer recommendation

**Request changes.** Repair R1, refresh affected checks/snapshot and obtain fresh follow-up before accepting B2B1-1..5. Immutable groups, image identity, card timing, durable replay and cancellation have substantial passing evidence; no other confirmed blocker was identified within the inspected scope. Runtime audio placement is proven by decoded fixtures, not decoded on every save; static ownership limits remain as approved. Preserve the existing two-unsuccessful-round reassessment budget and no automatic repair loop.

## Coordinating lead disposition and next action

2026-09-15, coordinating Project Lead: **request changes**, uphold R1 as a blocking
B2B1-2 contract failure. Read the complete review and reproduction output against
validateComposition: independent measurements are checked, but unvalidated producer
fields are retained through a type cast. The evidence supports contradictory saved
provenance, not damaged media. Independent 22 Node and 14 Python/32 subtests and the
Worker full receipts remain useful passing coverage, but do not close R1.

Author-lead closure verified by: not applicable; lead authored no implementation.
WS-16 is reopened for this composition occurrence with raw exact lead-12 closure
preserved. Reassessed the recurrence: required producer facts already exist; the
new consumer lacks complete schema/claim validation. Lead-14 requires a field-to-
validation/mutation inventory and producer-backed cases, retaining accepted timing,
audio-proof and static ownership limits. No speculative stronger attestation added.

Manual Worker repair-1 is next, followed by fresh independent follow-up. No slice
acceptance, production adoption or release. Existing two-unsuccessful-round budget
applies to this occurrence; prior repair history is retained, not reset or erased.

