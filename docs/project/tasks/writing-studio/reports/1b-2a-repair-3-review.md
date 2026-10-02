---
record: "review"
task: "writing-studio"
cycle: "1b-2a-repair-3"
spec_revision: "lead-12"
snapshot: "_local/project/evidence/writing-studio/1b-2a-repair-3/snapshot/manifest.json"
author: "reviewer"
date: "2026-09-14"
state: "active"
summary: "Recommend acceptance of the reassessed repair and WS-16 closure. Independent revision/process/producer matrix and exact-render checks pass; recorded-input and media-proof limits remain explicit."
read_when: "Disposing reassessed repair-3, WS-16 closure, retained WS-12 through WS-15, or join-provenance evidence and compatibility."
evidence: "_local/project/evidence/writing-studio/1b-2a-repair-3/review/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---

# Review: writing-studio / 1b-2a-repair-3

Size exception: snapshot qualification, independent receipts and reassessment limits require slightly more than the template's 900-word soft cap.

## Review identity and coverage

Fresh Project Lead review-only agent `/root/review_1b2a_repair3`; no inherited implementation/planning conversation, implementation authorship, delegation, or application edits. Read installed startup, lead-12 requirements and reassessment, then inspected producer/consumer design and changes before the Worker rationale. Read the prior repair-2 review and lead disposition, current Worker report, ledger Open and matching Closed; no findings archive exists.

Focused review covers B2A-4/6 and affected B1-2/3, with retained B2A-1/2/5 regressions. Inspected all 12 changed/new files, actual `video_processor.concat_outro`, `clip_generator._exact_render_timeline` and bookend calls, service capture/replay/load/publication paths, producer fixture and configured test harness. Production importer search finds no new service caller. Broader UI/migration/adapters and legacy defects remain outside this internal slice.

Reviewed base is `fed8ed13dcb2aade06bee341953d6b10d58bff13`, tree `b0d7d5c8e62c440fca5d1e4b6dfaa65ebd179f2c`, plus submitted manifest, tracked patch `6b5b57bfbed008f8a203a09d53c0f2c98b3b05e1fb39c465253424b75983d407`, slice patch `a06b4a8365f0cfd265be13914d9dd535f65f5ee29287abb533db54befdb6d6ad` and three preserved untracked copies. Independent `review/binding-result.json` confirms all 12 application, 88 evidence and 11 contract/dependency entries, both patch hashes and all three copies. Two of 16 workflow-group entries differ: lead-owned spec/spec-log bookkeeping. Inspected spec diff changes Status/baseline naming, not acceptance criteria. Git-derived application changes match the manifest.

The accidental commit is not an implementation failure: supplied head-drift records compare its 80 paths to pre-edit status and nine planned blobs to pre-edit copies. The coordinating lead additionally reports 28/29 preceding application blobs byte-identical, with `video_processor.py` differing only by CRLF/LF normalization; do not describe the entire committed base as byte-identical. Current covered application hashes match. Separate `strict_ai.py` work remains unchanged by this repair and is included in the fresh full-Python evidence. No commit rewriting is needed for this review.

## Verification assessment

Required evidence: **pass** on the bound snapshot. Inspected Worker logs/results: 309 Node tests; 977 Python tests, six skips; build, client types and changed Python syntax; both real bridges; corrected demonstration and genuine older-document replay. The full-Python result is fresh, including the preserved AI change, rather than a reused old pass. These unit tests do not certify live provider behavior.

Independent checks below used the configured Windows Node/Python runtime and isolated fixtures; executor **self**, this reviewer; no human-assisted check. Evidence paths are relative to the review evidence root.

| Command / criteria | Expected and actual outcome | Evidence |
|---|---|---|
| `node scripts/verification/run-tests.mjs node src/services/clip-revisions.test.ts src/services/clip-revisions.process.test.ts src/services/clip-revisions.join-matrix.test.ts` / B2A-1/2/4/5/6 | Expected pass; approved-context exit 0, **43/43** across all three files. | `focused-approved.log` |
| `node scripts/verification/run-tests.mjs python -k exact_render` / B1-2/3, B2A-4/6 | Expected pass; approved-context exit 0, **77 passed, 123 subtests**. Includes real media crossfade and fallback tests. | `python-exact-approved.log` |
| `node _local/project/evidence/writing-studio/1b-2a-repair-3/review/binding.mjs` / B2A-6 | Expected unchanged covered inputs/copies/patches and available media; exit 0. Exact source, saved revision-1 and legacy media bytes match recorded hashes. | `binding.mjs`, `binding-result.json`, `binding.log` |

Initial sandbox runs are preserved separately: Node exit 1, 35 passed/four process failures/four matrix skips with producer setup failure; Python exit 101. Configured Python execution was denied and child barriers timed out. Identical approved-context checks pass. These are environmental attempts, not product failures or discarded successful-test evidence (`focused.log`, `python-exact.log`). The original snapshot script reports only the two bookkeeping drifts (`snapshot-check.log`); its wrapper's exit is not represented as a clean snapshot check.

Worker bridge results establish decoded cyan/green sequence, caption pixels, saved reload/retry/Cleanup protection and missing-provenance refusal. My media hash sampling corroborates the retained files; I did not rerun both bridge scripts or the full suites. Independent focused tests and unchanged evidence inputs make repeating them unnecessary here.

## Findings and verified correction

**No additional blocking finding identified. Recommend R5 / WS-16 closure on this snapshot and lead-12 scope.**

At `exact_render.py:459`, missing/malformed raw join durations now fail before a receipt is returned; `bookend_region` preserves both at original float precision. Production concat/report generation, fallback order, rendering and publication algorithms are unchanged.

At `clip-revisions.ts:407` and `:613`, new saves require finite nonnegative join inputs, compare the asset-side input to rounded asset provenance, and connect an outro's main input to the preceding intro's measured output. Crossfade eligibility and exact clamp use the producer's arithmetic, including floating-point threshold behavior; overlap uses only the existing 0.002 receipt-rounding allowance. Supported hard cuts retain zero overlap when crossfade was unavailable or failed.

Independent matrix execution commits all 15 valid cases and refuses all 13 coherent mutations. It exercises actual Python clamp/branch/receipt code with controlled media I/O. Rejection messages demonstrate the clamp/eligibility relationship, not an unrelated duration mismatch. Coverage includes the former two-second/0.5-request/0.1-overlap counterexample, both limits, intro-to-outro chaining, short durations, rounded thresholds and fallbacks. This is materially stronger prevention than fake scalar receipts.

Compatibility is preserved: optional type fields honestly represent old exact-v1 documents; existing load and durable replay do not call new-save validation. Independent older-document and bookend-free tests pass; Worker evidence additionally loads/replays three genuine repair-2 revisions without rendering or changing bytes. Missing provenance in a new bookend receipt fails with an actionable `INVALID_RECEIPT` message and leaves committed pointers unchanged.

WS-12/13/14/15 closures remain supported: root/ancestor refusal, detached request capture, captured operation ownership and lifetime replay regressions pass; their production mechanisms were not changed by this repair.

## Design limits and recurrence

The new fields prove what the producer recorded, not independently attested input media lengths. I traced the non-asset inputs: intro appended media is re-encoded, and outro main media duration need not equal rounded content video end. The real bridge demonstrates 2.09 versus 2.04 seconds. Equating them or using composition slack to decide the clamp would contradict the reassessment's precision premise. Fabricated non-asset durations could still justify another clamp; this is a real trust limit, but no additional production failure was demonstrated and lead-12 expressly adds recorded inputs rather than a new measurement guarantee. Neither the synthetic matrix nor this review claims otherwise. Stronger independent provenance would need a separately decided contract; it is not silently included in closure.

The existing 0.002 rounding allowance also cannot distinguish every closer overlap. Hardcut receipts cannot prove why an eligible crossfade failed. These limits are compatible with the accepted fallback/rounding contract. The producer-derived matrix proves branch relationships, while actual media evidence remains separate.

Propose closing WS-16 with this report and retaining its recurrence history and matrix prevention destination. Retain WS-12/13/14/15 and prior exact closures. WS-03/04/05 and legacy WS-06/09 remain open. No global workflow change or new corrective implementation is warranted by this review.

## Reviewer recommendation

**Accept the reassessed repair and close WS-16**, subject to coordinating-lead disposition. Required affected checks and independent review are satisfied; the broader Writing Studio task is still partial. Next action is lead reconciliation of the internal slice, Status and ledger. No automatic repair cycle, successor implementation, production opt-in, merge or release follows. An unresolved disagreement would require explicit reassessment under the existing post-budget rule.

## Coordinating lead disposition and next action

2026-09-14, existing coordinating Project Lead: **accept repair-3, close WS-16,
and accept internal slice 1B.2a (B2A-1..6)** on the bound snapshot. Read the complete
review, its independent binding/verification and Worker receipts against lead-12.
No supported blocking finding remains within this slice. WS-12/13/14/15 and accepted
1A/1B.1 closures remain applicable; the broader Writing Studio task is partial.

Author-lead closure verified by: not applicable; the coordinating lead authored no
application code. Fresh non-author `/root/review_1b2a_repair3` independently verified
the correction, retained regressions and compatibility. Independent 43/43 Node and
77 exact Python/123 subtests pass; full Worker suites, both bridges, old-document
demonstration, snapshots/copies and sampled media hashes are adequate evidence on
unchanged covered inputs. No unnecessary repeat of full suites is required here.

The recorded-input trust limit is within lead-12's explicit contract: producer
values drive clamp verification; this is not independent attestation of every media
input. No demonstrated production defect requires another provenance system.
Existing 0.002 receipt rounding, static path checks and supported hardcut fallbacks
remain explicit limits, not new waivers. The successful reassessment corrected both
missing contract data and inadequate fake-only prevention; no further repair loop.

Commit fed8ed1 remains untouched. Its source-content preservation is supported by
the base comparison with the recorded CRLF/LF qualification. Fresh Python evidence
includes the preserved strict_ai.py edit but is not a live provider test or a separate
acceptance of unrelated AI work. No release approval is inferred from this commit.

Next: coordinating lead refreshes 1B.2b from the accepted service, including legacy
mutator adapters, composition/migration, cleanup/reference boundaries and reader
duration semantics before public exposure. Old provisional partitions are not an
implementation handoff. No Worker dispatch, application edit, commit, push, release,
production opt-in or 1B.2b implementation by this disposition. Review and Worker
reports remain relevant accepted evidence with original provenance preserved.
