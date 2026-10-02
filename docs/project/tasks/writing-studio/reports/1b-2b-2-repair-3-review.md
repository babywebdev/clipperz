---
record: "review"
task: "writing-studio"
cycle: "1b-2b-2-repair-3"
spec_revision: "lead-18"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2-repair-3/snapshot/manifest.json"
author: "reviewer"
date: "2026-09-21"
state: "active"
summary: "Request changes: aggregate transcript/timing relationships and resolved-file serving capability remain incomplete. Prior counterexamples are repaired; historical exclusions examined. Return to lead without automatic fourth repair."
read_when: "Disposing reader repair-3 and reassessing remaining WS-16 aggregate and serving claims."
evidence: "_local/project/evidence/writing-studio/1b-2b-2-repair-3/review/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Review: writing-studio / 1b-2b-2-repair-3

Size exception: independent counterexamples, historical compatibility and distinct coverage limits require additional detail.

## Review identity and coverage

Fresh non-author Project Lead review-only agent `/root/review_reader_repair3`; no inherited implementation conversation. One bounded follow-up after reassessment. Read installed startup/applicable procedures, lead-18 requirements/B2B2-1..5/baseline/constraints/exceptions, feature map, reader/model/route, writer validation/publication, exact/card producers and serving routes before Worker rationale. Evidence summary inspected early. No implementation/shared-record edits, delegation, acceptance or release.

Snapshot: HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13`; manifest SHA-256 `6b7807c1411dbf1005309d7c2dde3add7530b5a48d0f0c116bfeb86536018c84`; tracked patch `1425b8a80663329f067f32c96ca71ba595f9ceb552f57fe52cd617375ea91ca2`, plus manifest untracked copies. Git-derived paths inspected. Explicit-root snapshot checker reports only lead spec/log bookkeeping and new lead/review evidence, no application drift. Compiled reader/contract hashes recorded in `review/repro-result.json` match submitted `dist-before-rebuild.sha256`. Status changed during review solely to record handback/freeze/pending review; requirements unchanged.

## Verification assessment

**B2B2-1/3 fail remaining behavior below despite passing submitted checks.** All additional execution is self on Windows Node v24.15.0; evidence paths below are relative to this cycle:

| Command | Actual result | Evidence |
|---|---|---|
| `node _local/project/evidence/writing-studio/1b-2b-2-repair-3/review/run.mjs tests` | Exit 0; **186/186** focused reader/contract/route tests | `review/tests.log` |
| Same runner, `repro` | Exit 0; three real-save controls read; contradictory cases below also read | `review/repro.mjs`, `review/repro.log`, `review/repro-result.json` |
| `node _local/project/evidence/writing-studio/1b-2b-2-repair-3/review/repro-extra.mjs` | Exit 0; additional measured-bookend contradiction reads | `review/repro-extra.log`, `review/repro-extra-result.json` |
| Same directory `serve.mjs` | Exit 0; real file symlink produces true capabilities despite resolved route guard refusing it | `review/serve-result.json` |
| Same directory `historical.mjs` | Exit 0; 221 alternate-domain documents all reference fake-render media | `review/historical-audit.json` |
| `node _local/project/evidence/writing-studio/1b-2b-2-repair-3/snapshot-capture.mjs "$PWD" --check` | Checker reports 38 bookkeeping/new-evidence drift lines; not a clean-snapshot pass | `review/snapshot-check.log` |

The isolated runner uses configured runtime/offline Vitest with cache disabled and all new fixtures/temp/logs beneath this review. Reproductions adapt the Worker fixture-loading helper but add independent mutations, copying documents into fresh directories; original evidence/media remains untouched. Output records observations rather than interpreting exit 0 as successful refusal. Prior R1/WS-12, R2c and R3/WS-17 regressions pass. Absent-summary and pointer-state corrections independently pass; submitted aggregate cases cover the previous four R2a examples.

Inspected submitted full Node691, focused186, build/types, corrected-demo32, actual HTTP20 groups/restart/byte-preservation and retained-input evidence. Did not rerun full suite/build/HTTP restart/media rendering/browser or exercise active Studio3847. Serving reproduction evaluates the unchanged route's actual realpath/stat/extension predicate, not an HTTP request. Retained Python/media coverage is proportionate to unchanged inputs; it does not close these reader defects. No human assistance, AI or external network. Python absent from PATH; bounded headers supplied startup index fallback.

## Findings

**R2a / P1 remains open — aggregate boundary still omits relationships behind returned claims.** Locations: `src/services/clip-editor-read-contract.ts:459`, `:608`, `:653`, `:661`, `:742`; projection in `clip-editor-context.ts:305`, `:1006`, `:1145`. Bound snapshot above.

- `words-text-disagrees` changes only `render_timeline.words.content_text` to “Speech that was never supplied”. Response returns that text beside the unchanged two words `cyan green`. `words-source-disagrees` sets retained source words and receipt source/count to empty while leaving nonempty content words. It returns those two words/text despite no source words from which they could derive. Widening correctly becomes false/TRANSCRIPT_EMPTY; the defect is the contradictory editorial transcript. Accepted writer mapping/text checks (`clip-revisions.ts:789–823`) and lead-18's same-content requirement establish the missing relationship.
- `old-probe-disagrees` changes only the genuine pre-composition document's `probe.duration` to999. Response simultaneously reports raw output1.021 seconds and served recorded probe999. No-card historical absence cannot disable this independent equality-with-tolerance: that file is the raw output. Writer admission (`clip-revisions.ts:1474`) already compared them. Current reader checks that relationship only inside final composition.
- `bookend-measured-disagrees` changes saved outro `measured_output_duration` to999; response publishes999 alongside raw output3.135 and outro end3.111. Its repeated raw-receipt record retains the original value. `receipt-bookend-disagrees` and `bookend-transition-disagrees` additionally demonstrate that repeated regions/transition equations are not examined. The latter fields are not directly serialized, so these are corroborating contract omissions, not separate claimed output leaks. Lead-18 expressly requires all present records of the same join to agree.

Required outcome: validate these aggregate relationships before projection, with producer-derived tolerances and legitimate empty/reordered/overlapping controls. Preserve old profiles without bypassing equations that existed before composition. This remains one WS-16 class, not multiple repair rounds.

**R2b / P2 remains open — extension classification differs from the serving route.** `clip-editor-read-contract.ts:1237` checks the recorded filename; `clip-editor-context.ts:244` follows links for stat. In the isolated Windows fixture, `nominal.mp4` links to regular `actual.avi`. Response says available/supported with true play/download capabilities. `web-server.ts:1970–1977` resolves the link and refuses `.avi` with400. Existing external legacy media behavior permits this path; no adversarial swap is needed. Worker disclosure is not an approved exception to honest capability. Required: judge usable served kind from the same resolved file as the existing route, while preserving owned-document protections and external-media support.

## Compatibility, limits and non-findings

Refusing the prior review's synthetic card-without-composition control is justified: accepted pre-card service rejected cards, and card support introduced final composition together. Genuine pre-composition and current real controls still read. Historical audit opened all221 alternate-domain documents in the submitted survey: all referenced files carry the fake-render header, matching retained `1b-2a-repair-1/pre-edit/src/services/clip-revisions.test-support.ts:106`; the real exact producer already used the canonical three-key map. Only34 are directly under step-4-tests; others are retained fixture copies. Worker descriptions of all221 as that directory and all719 canonical-map records as “genuine” overstate provenance. No supported historical regression is established; existence alone does not establish accepted compatibility.

`card-container-huge` is recorded but not promoted to a separate defect: repeated container claims remain consistent and stored summaries do not establish a universal container-duration equality. Missing-media identity in `media.serves` is not treated as false availability when both capabilities correctly remain false. Optional artifact placement validation has no new observed real saved-sidecar control; submitted synthetic coverage and its limitation remain explicit. These qualifications do not excuse confirmed transcript/probe/bookend contradictions.

## Recurrence and prevention

Read ledger Open/Closed; no archive exists. Propose retaining WS-16 open with this occurrence, preserving WS-12/17, R2c and earlier writer closures. Unrelated WS-03/04/05/06/09 unchanged. Prevention belongs in reader aggregate/route regressions: derive transcript consistency, test old raw/probe equality, compare repeated bookends, and pair linked-media capability with resolved serving behavior. No generic workflow expansion proposed.

## Reviewer recommendation

**Request changes.** Return to coordinating lead for reassessment/disposition of this unsuccessful same-class follow-up. No automatic fourth repair, acceptance or successor dispatch. Pure aggregation is a reasonable design, but this implementation still leaves claims independent of their companion records.

## Coordinating lead disposition and next action

2026-09-21, coordinating Project Lead: **request changes; retain WS-16 R2a/R2b
open and do not accept B2B2-1..5.** Read the complete review, independent observations
and relevant reader/writer/serving code. The confirmed transcript, historical probe
and published bookend contradictions violate existing lead-18 requirements. The
linked legacy-media case is a static mismatch with the actual serving predicate,
not an adversarial path-swap requirement. Its disclosed limitation was not approved.
Author-lead closure verified by: not applicable; lead authored no implementation.

Retain the repaired prior examples and WS-12/17/R2c closures. Accept the review's
counterevidence concerning the synthetic applied-card/no-composition control: it
is unsupported, and its refusal is correct. The221 alternate-domain documents
all reference fake-render media;34 are directly in step-4-tests, others are copies.
Do not treat all719 canonical-map records as genuine untouched saves. This attributed
clarification preserves the Worker report and prior review, with no new historical
compatibility exception. No universal container-duration equality or missing-media
identity requirement is added from the unpromoted observations.

The independent186 pass establishes regression coverage, not complete aggregate
consistency. This third unsuccessful same-class follow-up returns to the lead;
no fourth repair is relayed. Next technical checkpoint must trace each returned
claim to actual producer relationships and the serving predicate, identifying what
the45-row table missed rather than adding only this example list. Any further
implementation needs refreshed bounded direction and fresh independent closure.
Application stays frozen; no successor, automatic dispatch, commit or release.
