---
record: "review"
task: "writing-studio"
cycle: "1b-2b-2-contract-proof-repair-1"
spec_revision: "lead-20"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2-repair-3/snapshot/manifest.json"
author: "reviewer"
date: "2026-09-22"
state: "active"
summary: "CP-1 accounting and CP-2 present-artifact proof are corrected. A-X5 imposes an unsupported current-file guarantee on recorded metadata; fifteen application failures remain supported."
read_when: "Dispositioning lead-20 artifact correction, coverage closure and A-X5 expectation authority."
evidence: "_local/project/evidence/writing-studio/1b-2b-2-contract-proof-repair-1/review/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Review: writing-studio / contract-proof repair-1

## Review identity and coverage

Fresh Codex subagent `/root/review_contract_proof_repair1`, Project Lead review-only, without inherited implementation history or authorship. One bounded follow-up, no delegation, application changes, shared-record writes or acceptance. No selected domain references. Read lead-20 Status, baseline, B2B2 map, constraints/exceptions, prior CP review/disposition, actual runner/accounting, producer assembly, reader projection/validation and shared types before Worker rationale. Inspected run3 results/log, stopped-run2 evidence and ledger Open/Closed; no ledger archive exists.

Application remains HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13`, repair-3 manifest SHA256 `6b7807c1411dbf1005309d7c2dde3add7530b5a48d0f0c116bfeb86536018c84`. Reviewed runner SHA256 `dd04e3587010d65f98d2a105cd02ac3469de539fc9f13cb0e457ed3efd0258dd`; unchanged oracle `0a03ba7a79a06042d549c606aeccb2c0de0237870d23e5c84cf9ca67817016dc`. Cycle `artifact-snapshot.json` identifies the verification artifacts separately. Git status inspected; coordinating lead owns complete provenance/Status audit.

## Verification assessment

**Original CP-1 and CP-2 outcomes are satisfied; full artifact recommendation still requests changes for the new oracle error below. Application verification remains failed.** Preserve run3's actual 42 passes/16 failures/zero harness errors and eight passing verifier rows. Fifteen failures are supported product counterexamples; A-X5 is an unsupported expectation, not established product failure.

CP-1: markers no longer credit descendants. Executed exact/deep comparisons, tolerance, shape, format and enumeration checks carry their kinds and sources; deep comparisons test structure. Capability reasons are now checked, including exact comparisons where derivable and disclosed enumeration/availability consistency otherwise. Diagnostic/prose checks are not called semantic equality. Required missing leaves or uncaptured responses make verification incomplete and nonzero. Selected ledgers cover 253 tracked, 230 legacy and 15 artifact leaves; these remain selected response states, not universal behavior coverage.

CP-2: a real accepted save requests retained caption overlay/cropped source and adds a card. A-C1 proves both file sizes, presence, content-relative domain, card-free flag and nonzero final content placement. A-X1..4 change one relationship with both file/placement records present, and are refused. Writer `clip-revisions.ts:1190–1230` independently establishes these relationships. Prior absent-artifact controls remain.

T-C6 integrates the producer-derived 20,001-word control: exact 20,000 prefix, true count, full text through TAIL and truncation diagnostic. B-X6 mutates both stage copies and confirms the separately supported CP-3 failure. Original fourteen failures remain supported.

Reviewer command `node _local/project/evidence/writing-studio/1b-2b-2-contract-proof-repair-1/review/check.mjs` exited **0** on Windows/Node24.15.0: executed exact submitted accounting/V-1..5 bodies without runtime setup, all five pass; independently matched all seven source, six compiled and two artifact identities from run3; genuine overlay document hash and current size match its record. Evidence `review/check.log`, `review/result.json`. An initial reviewer wrapper used the wrong pointer property and exited1 after self-checks; correction and limitation preserved in `review/attempt-1.txt`. No original evidence changed.

Run2 is correctly excluded: partial log ends during saves, with no claimed completed result. Run3 is the stable successor bound to the current runner. End-of-run hashing alone cannot prove historical absence of transient edits; the explicit stopped-run disclosure, separate rerun and matching snapshot support the submitted binding within normal receipt limits.

## Finding

**CPR-1 — A-X5 confuses recorded artifact metadata with live file status (artifact oracle, medium).** At runner1334–1355, changing only `files.caption_overlay.bytes` makes an otherwise coherent record fail unless GET refuses or substitutes current disk size. The case reports 5,749,186 recorded bytes against 5,749,185 current bytes as a product defect.

Current type contract `src/models/clip-editor-context.ts:262` explicitly describes this subtree as optional artifacts **recorded** beside the served file. `projectDocument` at `clip-editor-context.ts:984–1013` projects that record; live `media.output` is a different contract with stat-derived bytes and recorded_bytes. Writer fileRecord measures size at save; it does not establish that recorded optional-artifact metadata always equals future disk state. Lead-20 asks for valid file-derived positive controls and isolated domain/flag/offset/identity contradictions, while retaining the no-current-byte-attestation limit. No source authorizes A-X5's stronger guarantee. This differs from H-X4, which contradicts two stored claims that describe the same output.

Required outcome: make A-X5 a recorded-metadata projection control: after the otherwise coherent positive byte-count mutation, expect a successful read and compare `response.revision.document.artifacts.caption_overlay.bytes` with the mutated document's `files.caption_overlay.bytes`, not `statSync(...).size`. Current disk size may remain an observation demonstrating that these are different facts. Preserve its original failed run with an attributed correction to the sixteen-product-failures claim. Retain A-C1's genuine-save disk/record agreement and all A-X1..4 relationship refusals. A new current-file guarantee would need explicit lead design disposition, not authority inferred from a test expectation or disclosure. Do not repair the application to satisfy this oracle.

## Recurrence and recommendation

Recommend closure of original **WS-18/CP-1** and **CP-2** on this snapshot; retain **WS-16** for the fourteen original failures plus B-X6/CP-3. Do not add A-X5 as a WS-16 occurrence. CPR-1 is an artifact expectation/provenance issue; lead should index its correction separately as appropriate. Prevention: expected-value sources must distinguish saved record projections from current filesystem observations.

Recommend **request changes to artifact conclusions/oracle for CPR-1**, with original corrections independently verified. No slice acceptance or application repair follows. No full rendering, HTTP rerun, rebuild or unchanged-suite repetition was performed by this reviewer; submitted bound execution was inspected, with bounded independent self-check/hash verification. No Studio3847 use or human assistance. Historical/crossfade/ownership/draft and selected-state limits remain as previously reviewed. Reviewer writes stop at handoff; coordinating lead dispositions this report.

## Coordinating lead disposition and next action

2026-09-22, coordinating Project Lead: accept the independent evidence and close
CP-1/WS-18 and CP-2 on runner `dd04e358...`. Artifact coverage is complete within
the reported selected states. Application acceptance remains blocked by15 supported
failures, including B-X6/CP-3. Preserve run3's actual42/16 result; A-X5 is one
unsupported oracle failure, not an additional WS-16 product defect.

Confirm CPR-1 as WS-19. The type's recorded-artifact contract and projection support
the reviewer's counterevidence; no approved requirement adds current optional-file
byte attestation. Lead-21 authorizes a narrow manual artifact correction, retaining
the positive disk-agreement control and four relationship refusals. Worker report
and original evidence remain unchanged. Application repair and successor work remain
frozen. Fresh independent follow-up is required after the correction.

Lead handback audit matched23 artifact/evidence/report entries and51 frozen
application inputs; reviewer independently checked15 relevant identities and five
verifier self-checks. No application tests/build were rerun by the lead for this
coordination-only disposition. Author-lead closure verified by: not applicable;
lead authored no reviewed implementation. Review recommendation is adopted only
to the scoped closures above, not slice acceptance or release.
