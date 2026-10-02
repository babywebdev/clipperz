---
record: "review"
task: "writing-studio"
cycle: "1b-2b-2-contract-proof"
spec_revision: "lead-19"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2-repair-3/snapshot/manifest.json"
author: "reviewer"
date: "2026-09-22"
state: "active"
summary: "Useful independent oracles confirm failed application conformance, but artifact completion needs corrected coverage accounting and present optional-artifact proof. Supplemental review closes the truncation gap and exposes an untested paired last-stage contradiction."
read_when: "Dispositioning the lead-19 verification artifacts, their coverage claims, and supplemental reader counterexamples."
evidence: "_local/project/evidence/writing-studio/1b-2b-2-contract-proof/review/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Review: writing-studio / 1b-2b-2-contract-proof

Size exception: separate artifact adequacy, existing application failures, supplemental findings and eight differently scoped coverage limitations require more than 900 words.

## Review identity and coverage

Fresh Codex subagent `/root/review_contract_proof`, Project Lead review-only; no inherited implementation conversation or authorship. One bounded review, no repair/delegation/acceptance. Followed workflow 4.1.0/local-2; no selected domain references. Read lead-19 requirements, B2B2-1..5, baseline and exceptions, then actual reader, writer admission/assembly, Python helpers and HTTP serving dependencies before the Worker rationale. Inspected runner, oracle, plan, run-4 output, existing named reader/contract tests and ledger. No application or shared-record writes.

Application: HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13`, repair-3 manifest SHA256 `6b7807c1411dbf1005309d7c2dde3add7530b5a48d0f0c116bfeb86536018c84`. New runner SHA256 `eca26d92d92ae0cbff42494e095dfc0ab86bca61d17cb92f61c8c3e5d611e616`; oracle `0a03ba7a79a06042d549c606aeccb2c0de0237870d23e5c84cf9ca67817016dc`. Reviewer execution independently matched all seven source, six compiled and two artifact hashes recorded by run 4. Coordinating lead separately owns the complete Git/provenance audit (`../lead/handback-audit.json`); Git status was inspected, with sandbox warnings for the global ignore file.

## Verification assessment

**Application verification fails. Artifact coverage is incomplete.** These are separate conclusions. A red conformance run is the correct result against frozen repair-3, not a reason to weaken expectations.

The four oracle sources are appropriate: Python producer mapping, accepted writer records, genuine historical profiles, and actual HTTP serving. Neither oracle imports the reader to derive expected outcomes. Writer duration allowance and duplicate-record assembly substantiate the historical/bookend failures. Recorded join branches allow supported hardcut fallbacks; stage measurements must not be equated indiscriminately with final output. Two historical current documents are exercised; four originals are copied/hashed, including previous documents. This is a bounded compatibility sample, not exhaustive historical coverage.

Run 4's 35 passes, 14 failures and zero harness errors are supported by inspected cases/output: six transcript, three historical, three bookend and two resolved-link failures. In particular T-X3 updates text along with the changed word; B-X3 changes both transition copies; these meaningfully exceed single-field type tests. All fourteen expectations are justified. I did not rerender all seven saves or rerun unchanged suites. Retaining the named suites is permitted by lead-19; their passing result does not establish missing relationships.

Additional self-executed check: `node _local/project/evidence/writing-studio/1b-2b-2-contract-proof/review/check.mjs`, final exit **1**, four controls pass and one application contradiction fails. Evidence: `review/check-run3.log`, `review/review-result-run3.json`, runnable script and Python job/result. It copies history into `review/owned`, changes/restores only copied documents, reads existing synthetic media and starts no server. Configured Python child creation was initially sandbox-blocked (preserved `check.log`); approved escalation succeeded. Preliminary observation run and final assertion run are separately preserved. No human assistance or Studio 3847 use.

## Findings

### CP-1 — Correct the projection coverage accounting (artifact; medium)

At runner lines 143–145, `isCovered` credits descendants of any covered parent. P-C5 at1127 calls `cover('capabilities')`, then checks only selected values. For example `known_effective_cuts.reason`, `widen_from_source_words.reason`, `reopen_source_media.reason` and `adopt_for_revision_tracking.reason` are not compared there. Any newly introduced capability property would also count automatically. Broad diagnostic coverage and nonempty prose checks are not independent semantic equality either. At1437 the exit decision ignores tracked `gapSummary`.

Therefore 253/253 and230/230 are traversal/accounting figures, not proof that each leaf has an independent expected value or each consumed claim has invariant coverage. This is more than the acknowledged limitation that good serialization cannot establish internal coherence. Required outcome: record what each assertion actually proves, explicitly map reused cases, avoid crediting unchecked descendants, and make unmet required coverage affect conformance status. Preserve the useful existing comparisons and red application cases.

### CP-2 — Optional artifacts still lack a present-state control (artifact; medium)

Worker gap3 is a real completion gap. The runner saves no caption-overlay/cropped-source artifacts. Named retained tests at `clip-editor-context.test.ts:1354–1384` inject dangling placements or unmatched file records; they can reject before reaching valid-present path/domain/offset behavior. They do not prove a legitimate present artifact reads or that a present file/placement pair with one wrong relationship is refused. Writer `buildFinalComposition` at1189–1235 supplies an external expected domain/offset source.

Required outcome: add or identify executable positive present-artifact controls and meaningful isolated contradictions against producer-established records. A full real render is not inherently required for metadata coherence, but fixture provenance and the positive control must justify the record. No production repair is implied.

### CP-3 — Paired last-stage contradiction remains accepted (application WS-16)

Supplemental review sets **both** `doc.bookends.outro.measured_output_duration` and `render_timeline.bookends.outro.measured_output_duration` to999 on the copied genuine BOTH document. Reader accepts and publishes999 while raw output remains3.929. Untouched BOTH and unknown-unconsumed-metadata controls read normally. Evidence is the bound final review result above.

B-X1 tests only disagreement between copies; B-C5 tests a valid chain. A repair adding copy equality alone would pass these cases without enforcing lead-19's explicit last-stage-to-output relationship. This is a confirmed application failure and an uncovered relationship in the submitted runner. The supplemental executable assertion now supplies the missing negative case; it need not be redundantly recreated merely to change authorship. Keep WS-16 open and include it in any future direction; no repair performed here.

## Eight reported gaps: disposition by scope

1. **Truncation:** originally missing, now demonstrated by supplemental proof. Real Python helpers map20,001 overlapping words in an owned copied record. Reader returns20,000 exact prefix words, count20,001, full producer text ending in `TAIL`, and `TRANSCRIPT_TRUNCATED`. No media attestation is claimed. The Worker's assertion that any synthetic large document necessarily contradicts the oracle is false; preserve the original report and correct this through attributed disposition/addendum.
2. **Crossfade breadth:** retained named arithmetic/eligibility cases plus one actual crossfade are useful bounded coverage; another real crossfade is not automatically required. Do not infer a comprehensive branch matrix from their count.
3. **Optional artifacts:** unmet as CP-2 explains.
4. **Legacy sidecar variants:** acceptable retained coverage; inspected cases distinguish malformed/empty/missing input. No duplicate implementation required.
5. **Owned junctions:** acceptable retained static-ownership coverage; no path-swap guarantee is added.
6. **No byte attestation:** intentional contract boundary, not missing acceptance evidence. `integrity_verified:false` is appropriate.
7. **Draft contradictions:** acceptable retained named nested-input/identity/malformed-document tests.
8. **Selected-response leaf counts:** a scope limitation, not coverage of every response state. CP-1 separately identifies inaccurate accounting within even that sample.

## Recurrence and prevention

Read Open and searched related Closed classes; no findings-ledger archive exists. The fourteen cases and CP-3 extend open **WS-16 R2a/R2b**; WS-12/17 closures remain intact. Preserve WS-03/04/05/06/09 separately. Propose adding this report to WS-16's occurrences and retaining producer-derived paired contradictions as prevention. CP-1/2 concern evidence adequacy, not a new product regression; the lead may track their correction in this cycle's disposition. No global workflow change or recurrence-budget reset proposed.

## Reviewer recommendation

**Request changes to the claim of completed lead-19 artifacts**, specifically CP-1/2; retain the runner as useful reproducible partial proof. Accept the fourteen reported failures as supported counterexamples, and use supplemental evidence to close truncation and add paired last-stage coverage. Application verification remains failed and application review changes-requested; no slice acceptance or automatic repair follows.

Coordinating lead should disposition the narrow artifact gaps and corrected limitation premise using the combined evidence before scoping any further application work. This review is handed off; reviewer artifact writes stop.

## Coordinating lead disposition and next action

2026-09-22, coordinating Project Lead: request changes to artifact completeness,
CP-1/2. Accept the14 submitted application counterexamples and supplemental CP-3
as supported evidence of open WS-16, not application acceptance. Lead inspected
the complete report, coverage accounting/exit code and producer artifact publication.
Author-lead closure verified by: not applicable; no implementation authored here.

Record CP-1 as WS-18, a verification-artifact defect distinct from product WS-16;
CP-2 remains this cycle's missing required evidence. The253/230 counts do not prove
every leaf was compared. Require exact assertion accounting and failure on required
coverage gaps, plus valid present optional-artifact controls and isolated negatives.
No need to repeat retained ownership, legacy-sidecar or draft cases without drift.

The review's runnable supplemental proof closes the20,001-word uncertainty and
establishes the paired last-stage failure. Preserve the Worker report as handed off:
its full-render requirement for that fixture is not supported. Reuse/adapt the
supplement under new owned evidence paths rather than overwrite reviewer evidence.
Preserve supported hardcut/rounding/history and no-attestation limits; do not impose
universal container equalities from incomplete summaries.

Lead-20 scopes one artifact-only correction through Isaac's manual relay, then
fresh independent follow-up. Application stays frozen and changes-requested; no
fourth application repair, automated dispatch, successor, commit or release. The
original run and artifact snapshot remain immutable historical evidence.
