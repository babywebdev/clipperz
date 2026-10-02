---
record: "review"
task: "writing-studio"
cycle: "1b-2b-2"
spec_revision: "lead-15"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2/snapshot/manifest.json"
author: "reviewer"
date: "2026-09-20"
state: "active"
summary: "Request changes: ancestor junctions bypass ownership checks, malformed tracked inputs can become authoritative response fields, and malformed legacy words are presented as usable. Existing focused tests pass."
read_when: "Disposing or repairing the independent editor-context findings and assessing retained verification."
evidence: "_local/project/evidence/writing-studio/1b-2b-2/review/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Review: writing-studio / 1b-2b-2

Size exception: three blocking findings and retained-evidence provenance corrections
need distinct triggers, outcomes and receipts; detailed reproduction output stays in evidence.

## Review identity and coverage

Fresh Project Lead review-only agent `/root/review_1b2b2`, without inherited implementation conversation or authorship. Reviewed lead-15 B2B2-1..5, baseline, constraints, exceptions, feature preservation, accepted repair-1 disposition, actual reader/types/route, focused tests, HTTP check, history reader and existing media routes. No application repairs, delegation, shared-record changes or acceptance. Worker evidence was assessed early; its design summary was included in that read, before code inspection. This is disclosed rather than claiming a perfectly blind code-first sequence.

Snapshot: HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13`; manifest SHA-256 `6f8a714072fcae7d30e91d67e8594f08dfc31ad746952db83bddb9bbf8c69875`; tracked patch `1d8efe77c3fe69d47c5b81fb4c28b985fc8cd9ab38d4369147f4f8585ecbf2e0`. Git-derived paths agree with the submitted change inventory. Independent `binding.json` checks 130 entries including all 23 untracked copies: only current lead spec/log bookkeeping differs (spec occurs in two categories). All application, workflow and evidence entries match. Three compiled HTTP-build hashes also match.

Current Status now correctly records handback and pending review. This cycle and review use local-2; older evidence retains its recorded inventory. Generic media-app rules apply. Static ownership guarantees are reviewed; hostile concurrent filesystem swaps, UI adoption and future mutators are outside scope.

## Verification assessment

Required evidence: **fail for B2B2-1/2/3 behavior**, despite passing submitted suites. B2B2-4 read-only preservation and existing-route evidence are useful; no new write/import path was found.

Inspected Worker full Node output (575 passing), build/type receipts, actual HTTP result/log and script, restart/byte-preservation assertions, retained-input comparison and accepted predecessor bridge record. The single detached strict history read is a reasonable coherent snapshot over the accepted atomic writer; expensive file work occurs afterward. Old documents intentionally retain absent optional final composition/join inputs. Those choices do not require redesign.

Independent receipts, executor **self**, Windows configured Node runtime, snapshot above; evidence paths relative to this report's evidence root:

| Command / scope | Expected / observed | Evidence |
|---|---|---|
| `node scripts/verification/run-tests.mjs node src/services/clip-editor-context.test.ts src/ui/editor-context-route.test.ts` / B2B2-1..4 | Existing suite passes; exit 0, 70/70 | `focused.log` |
| `node scripts/installation/run.mjs node editor-review-repro _local/project/evidence/writing-studio/1b-2b-2/review/repro.mjs` / B2B2-1..3 | Control succeeds; malformed/escaped states should be refused or marked unusable. Exit 0 captures confirmed counterexamples below | `repro.mjs`, `repro.log`, `repro-result.json` |
| `node _local/project/evidence/writing-studio/1b-2b-2/review/bind.mjs` / binding | Application/evidence/copies and compiled inputs match; exit 0, only lead bookkeeping drift | `binding.log`, `binding.json` |

Reproduction copies the real Worker card revision into isolated reviewer storage and changes only synthetic copies. Original synthetic media is stat-ed, never altered; no AI/user media or active Studio changes. Fixture directories remain under `review/`. No human assistance. Bare Python indexing was unavailable; bounded headers supplied orientation.

Retained Python/exact/parity evidence is proportionate: covered renderer inputs and dependency directions are unchanged. However, the Worker's saved-revision row cites the **pre-repair** bridge. Use the accepted `1b-2b-1-repair-1/check-saved-revision-run1.log` and its snapshot instead; it includes the repaired consumer's real refusal checks. Starting the new HTTP server does **not** implicitly execute preview/export parity. Existing parity may be retained on unchanged flow/dependency grounds; the new HTTP script separately verifies existing preview/download bytes. These are citation/claim corrections, not independently missing full-suite requirements. I did not rerun full Python/media suites or the complete HTTP renderer check.

## Findings

All locations are `src/services/clip-editor-context.ts` on the bound snapshot.

| ID / importance | Location | Failure condition and impact | Evidence | Required outcome / status |
|---|---|---|---|---|
| R1 / P1 | `inspectOwnedFile`:160; `loadRevisionDocument`:600 | Ownership checking begins at `<history>/revisions/<clipId>`, so a junction at its `revisions` ancestor is never inspected. A document physically outside the history tree is consumed successfully. This violates B2B2-3's configured-root/intermediate ownership boundary. | `linked-revisions-ancestor` succeeds with authoritative exact timing through a real Windows junction; control also succeeds. | Open: validate the complete configured ownership chain for revision/draft and legacy sidecar reads. Add real ancestor-junction cases, retaining static-boundary limits. |
| R2 / P1 | `validPointer`:359, `validTimeline`:412, `validateRevisionDocument`:431, `read`:515, projections at 904/948/1040 | Only outer shapes are validated before casts. An exact pointer with `path:null` silently becomes legacy recovery. A malformed segment containing an object and negative endpoint is returned with `effective_cuts_known:true`; `source_words:[null]` advertises widening. Arbitrary nested `time_domains` values are copied into the response. Removing an applied card's image throws `TypeError` instead of a domain error. | `missing-exact-document-pointer`, `malformed-segment`, `malformed-source-words`, `arbitrary-domain-object`, `invalid-applied-card` in the reproduction. | Open: validate consumed nested fields, pointer/provenance invariants and coherent identities before serialization; project only validated fields and use stable domain failures. Preserve accepted old documents' specifically optional fields without applying new-save validation retroactively. |
| R3 / P2 | `projectWords`:333, `buildLegacy`:674, `buildTranscript`:1090 | Valid JSON containing invalid word elements is treated as a present usable sidecar. `[null,{word:"bad",start:9,end:1}]` silently drops null, preserves backward timing, and returns `availability:"available"`. A wholly filtered list can resemble intentionally empty input. This loses the malformed-versus-supplied-empty distinction required by B2B2-2. | `malformed-legacy-words` result, including `state:"present"` and backward word. | Open: validate the legacy word records and timing before classifying them; report malformed recovery input while preserving clip text. Cover invalid/mixed lists as well as JSON/encoding failures. |

## Recurrence and prevention

Read ledger Open and matching Closed classes; no archive exists. Propose R1 as a new read-side occurrence of **WS-12**, preserving its accepted write-side closure. R2 is related to **WS-16**'s unchecked nested receipt consumption; index the reader occurrence without undoing the accepted producer/save validation. R3 merits an indexed malformed-recovery classification defect, related to WS-02 but distinct from writable-history recovery. Add targeted fixtures to `clip-editor-context.test.ts` and representative stable-error route assertions. No global workflow change is needed. WS-03/04/05 and legacy WS-06/09 remain open.

## Reviewer recommendation

**Request changes.** Resolve R1–R3 with focused regression evidence and fresh independent follow-up. Reconcile retained-evidence citations in the lead disposition without rewriting the handed-off Worker report. No application repair or successor dispatch was performed here; the two-unsuccessful-round reassessment budget remains. Recommendation does not change acceptance or release state.

## Coordinating lead disposition and next action

2026-09-20, coordinating Project Lead: **request changes; uphold R1-R3**. Reviewed
the complete report, reproduction output and affected reader checks against lead-15.
Existing70 tests pass but cannot outweigh reproduced ownership escape, false exact/
widening claims, tracked-to-legacy fallback and malformed recovery classification.
Author-lead closure verified by: not applicable; lead authored no implementation.
Reviewer disclosed reading the Worker design summary early; fresh non-author context
and independently reproducible findings still provide an adequate assessment.

Reopen WS-12/16 only for these read-side occurrences, retaining accepted write-side
closures. New WS-17 indexes malformed legacy words classified as usable. Lead-16
requires complete configured-root traversal and consumed-field validation inventory,
with old-document controls and no retroactive new-save enforcement. This addresses
the repeated boundary/outer-shape assumptions rather than only the current examples.

Evidence clarification: retain the accepted repair-1 saved-revision bridge and its
snapshot, not the Worker's older pre-repair citation. Existing preview/export parity
is retained by unaffected flow/dependencies; merely starting the HTTP server does
not prove parity. Current HTTP check separately proves download bytes and restart.
Preserve Worker report as handed off; no new full-suite requirement is invented for
these citation corrections.

Manual repair-1 is next, then fresh independent follow-up and lead disposition.
No slice acceptance, automatic repair, successor implementation, commit or release.
Two unsuccessful repair rounds for a reader occurrence trigger reassessment; prior
recurrence history is retained, not erased by this new bounded assignment.
