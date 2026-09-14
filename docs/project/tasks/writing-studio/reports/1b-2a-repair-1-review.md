---
record: "review"
task: "writing-studio"
cycle: "1b-2a-repair-1"
spec_revision: "lead-10"
snapshot: "_local/project/evidence/writing-studio/1b-2a-repair-1/snapshot/manifest.json"
author: "reviewer"
date: "2026-09-13"
state: "active"
summary: "Request changes: R1 and R5 remain reproducible. R2, R3 and R4 corrections pass independent focused verification; configured-root trust and incomplete receipt relationships still violate lead-10."
read_when: "Disposing 1B.2a repair-1, repairing WS-12/16, or assessing closure of WS-13/14/15."
evidence: "_local/project/evidence/writing-studio/1b-2a-repair-1/review/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---

# Review: writing-studio / 1b-2a-repair-1

Size exception: independent closure, two remaining findings and reproduction provenance exceed the 900-word soft cap.

## Review identity and coverage

- Requirements: spec lead-10, complete bounded 1B.2a and repair-1 direction, B2A-1..6, applicable preservation, baseline, constraints and exceptions; original review/disposition R1..R5 and ledger WS-12..16.
- Reviewer: fresh Codex subagent `/root/review_1b2a_repair1`, Project Lead in review-only mode, without inherited planning/implementation conversation or implementation authorship. Requirements and actual service inspected before Worker rationale. No delegation or application/shared-record edits.
- Snapshot: HEAD `8cf6b82039381e62b0f1dac1953c0c8c279e86f1`; preserved tracked patch SHA-256 `48e97617b36c94b053611cca5402ccb427be2d28a19dc9e3236268aa02b77a99`; repair slice patch `942969ab640a38fb2a4bed9ec4f5a2cb12c64bb29189cdc9fb82a270db87f0c2`, independently hash-checked. Git-derived inventory includes the seven untracked repair files. Manifest recheck found only authorized spec/spec-log bookkeeping drift (each occurs in two manifest groups), no application/evidence drift. See `review/snapshot-check.log`.
- Inspected service/types, test support and repair regressions, process schedules, real-bridge check and receipt, history transaction, Cleanup boundary, renderer bookend/word receipt construction and production importer search. No production opt-in found. The single history transaction and dependency-first publication architecture remain appropriate.
- Limits: reviewer performed synthetic seam/file/process verification, not new FFmpeg renders, UI, power-loss or concurrent junction replacement tests. Existing real-bridge results are Worker evidence, not reviewer execution. No user media or provider call; disposable reproduction files remain in `review/fixture-d07pfx`.

## Verification assessment

Required evidence: **fail for acceptance** due to reproducible B2A-4/5 counterexamples.

Worker logs support 299/299 Node tests, successful build/client types, and the eleven-step real saved-revision bridge check including restart, reversed cyan/green media, widening, cancellation, Python mutation, old replay and Cleanup protection. Accepted Python coverage is reasonably retained: repair changes no Python/configuration/dependency inputs, with 20 matching recorded Python hashes and a fresh Worker bridge run. These passing checks do not cover the remaining cases below.

All additional checks use the bound snapshot, Windows Node 24.15.0/tsx and configured runtime; executor **self**, this reviewer; human assistance none:

| Command / acceptance | Expected and actual result | Evidence |
|---|---|---|
| `node scripts/verification/run-tests.mjs node src/services/clip-revisions.test.ts src/services/clip-revisions.process.test.ts` / B2A-1..6 affected regression | Expected pass; approved-context exit 0, **33/33** pass. Initial sandbox exit 1: 29 service tests pass, four process schedules fail to reach barriers; unchanged approved rerun passes. Environmental limitation, not a product finding. | `review/focused.log`, `review/focused-approved.log` |
| `node --import tsx _local/project/evidence/writing-studio/1b-2a-repair-1/review/repro.mjs` / B2A-4/5 | Expected counterexamples; approved-context exit 0, all four defective outcomes asserted. Initial sandbox exit 1 at tsx `uv_os_get_passwd`, before script execution. | `review/repro.mjs`, `review/repro.log`, `review/repro-approved.log`, `review/repro-result.json` |
| `node _local/project/evidence/writing-studio/1b-2a-repair-1/snapshot-capture.mjs --check` / B2A-6 | Expected only coordination drift; exit 1, precisely spec/spec-log drift, unchanged application and evidence. | `review/snapshot-check.log` |

## Findings

Locations refer to `src/services/clip-revisions.ts` on the bound snapshot.

| ID / importance | Location | Failure condition and impact | Evidence | Required outcome / status |
|---|---|---|---|---|
| R1 / WS-12 / P1 | `assertOwnedDirectory`, lines 336–361; draft/save callsites | Configured export/history roots are themselves pre-existing Windows junctions. The helper excludes the root from lstat and recursively creates it unchecked. Both draft and revision commit through those links into physical directories outside the nominal owned roots. | `repro-result.json: rootLinks`: committed, one physical media group and two sidecar documents; real junctions fixed before invocation, no race. | **Open.** Enforce lead-10's physical ownership check on the configured roots and applicable ownership ancestry before writes, as well as descendants. Add root-level junction refusal coverage; retain the permitted static-check limitation. B2A-5. |
| R5 / WS-16 / P2 | `validateReceipt`, lines 414, 469–478, 531–556 | Shape/type checks still accept contradictory provenance. Supplied word `actual` at 0.1–0.4 becomes receipt source `invented` at 90–91 and content `invented` at 0.7–0.9; caption style changes. A separate one-second intro reports asset 999, overlap 888, hardcut branch and transition 500–600 while its region ends at 1. A third receipt has empty required time-domain mapping. Each is persisted as exact and moves current revision to version 1. | `repro-result.json: words, composition, domains`, with complete committed documents; fake media/probe remain internally consistent and unmodified. Renderer `bookend_region` and receipt construction establish the violated relationships. | **Open.** Validate required domain keys/values and source/content word mapping against captured input, caption settings, and bookend asset/overlap/branch/transition relationships against the accepted renderer contract. Refuse contradictory receipts without moving pointers. B2A-4. |

The Worker explicitly chose to trust linked configured roots, calling this delegated. Lead-10 explicitly requires owned roots and descendants and real junction tests at the root: this is a changed settled boundary, not merely helper design. No approved exception supports it. Per-component checking is otherwise a proportionate implementation; adversarial concurrent filesystem replacement is not required.

The expanded receipt validator is justified by the contract, but testing many malformed scalar fields does not establish relational correctness. R5's original missing-number schedule is fixed; the finding's full required outcome remains unmet. The independent cases require no renderer redesign or new compositing feature.

## Verified corrections and delegated choices

- **R2 / WS-13: propose closure on this snapshot.** Commit/failure establish incarnation and request hash before mutation; invalidation uses observed incarnation plus the durable, non-reusable operation ID. Existing captured hash owns completion, and legitimate cancellation retains late residuals. Independently passing schedules cover old success/failure, recreated same-ID operations, stale cancellation and process behavior. No unsupported same-incarnation ID replacement is assumed.
- **R3 / WS-14: propose closure.** Synchronous structuredClone at all three request entrypoints detaches expected state, recipe, words and invalidation before any await. Passing immediate/nested mutation tests inspect renderer parameters, persisted documents, replay and cross-clip preservation.
- **R4 / WS-15: propose closure.** No trimming; each operation retains its complete pointer/result. Locked replay precedes mutable source/asset existence checks. Passing 34-success/34-failure and missing-source/asset schedules cover old results and changed-ID conflict. Retention and strict replay lookup follow settled direction without an unnecessary archive protocol.

## Recurrence and prevention

Read ledger Open and Closed; no archive exists. Keep WS-12 and WS-16 open and append this repair follow-up as continuing occurrences; relate WS-16 to WS-06/09 without reopening unchanged predecessor closures. Propose closing WS-13/14/15 with this snapshot and independently executed regressions. Prevention belongs in `clip-revisions.test.ts`: root-level real junction fixtures plus table-driven relational/domain/word contradictions alongside valid exact receipts. No global workflow change or additional ledger class is needed.

## Reviewer recommendation

**Request changes**, R1 and R5. Coordinating lead should disposition the explicit root-trust design deviation and remaining receipt gaps, preserve three supported closures, and prepare any next bounded manual repair under existing authority. This is unsuccessful repair round one for WS-12/16; after two unsuccessful rounds on an issue, reassess rather than loop. No acceptance, next slice, production integration or release follows from this recommendation.

## Coordinating lead disposition and next action

2026-09-13, existing coordinating Project Lead: **changes requested**, R1/WS-12
and R5/WS-16. Read the full independent review, reproduction script/results and
affected ownership/receipt branches against lead-10. Both remaining findings are
supported. The configured-root exemption changes an explicit settled boundary and
is not approved; keep root-inclusive checking. Semantic receipt checks must follow
the actual accepted renderer rather than merely accept individually typed fields.

Close R2/WS-13, R3/WS-14 and R4/WS-15 on the repair-1 snapshot, based on independent
source inspection and 33/33 focused verification of the stated schedules. Retain
these regressions in the next repair. This is partial closure, not acceptance of
1B.2a or authorization for production integration. 1A/1B.1 closures remain unchanged.

Author-lead closure verified by: not applicable; no lead-authored application code.
Independent correction evidence: fresh `/root/review_1b2a_repair1`, this report.
The next repaired snapshot still requires fresh non-author follow-up.

Spec lead-11 contains bounded repair-2 direction and the current acceptance mapping.
Repair only root inclusion and receipt domain/transcript/caption/composition
relationships plus affected coverage. The accepted exact word-mapping and bookend
helpers are contract inputs, not authorization to edit Python or redesign rendering.
Preserve reviewer artifacts and separately demonstrate corrected outcomes. Refresh
focused/full Node, build/types and real saved-revision bridge evidence; retain Python
with unchanged-input justification. No blanket requirement for new media/rendering
features or adversarial filesystem-swap guarantees.

Worker receives a manual relay through Isaac; report destination
`reports/1b-2a-repair-2-worker.md`, snapshot/evidence under
`_local/project/evidence/writing-studio/1b-2a-repair-2/`. No repair agent dispatch.
This is unsuccessful repair round one for WS-12/16; round two is next. If either
remains unresolved after that follow-up, reassess before a further repair relay.
No application edits, commit, push, release, 1B.2b or whole-slice acceptance here.
