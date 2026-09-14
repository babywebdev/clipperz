---
record: "review"
task: "writing-studio"
cycle: "1b-2a"
spec_revision: "lead-9"
snapshot: "_local/project/evidence/writing-studio/1b-2a/snapshot/manifest.json"
author: "reviewer"
date: "2026-09-13"
state: "active"
summary: "Request changes: five independently reproduced gaps affect filesystem containment, operation ownership, captured input identity, durable replay and malformed receipt rejection. Existing focused suites pass."
read_when: "Disposing or repairing 1B.2a findings and assessing replacement evidence."
evidence: "_local/project/evidence/writing-studio/1b-2a/review/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-1.md"
---

# Review: writing-studio / 1b-2a

Size exception: concrete schedules, evidence provenance and five findings exceed the 900-word soft cap.

## Review identity and coverage

- Spec: `docs/project/tasks/writing-studio/spec.md`, lead-9, bounded assignment, B2A-1..6 and applicable requirements/constraints/exceptions. Accepted 1A/1B.1 remain predecessors; production adapters, migration and Cleanup eligibility remain excluded.
- Snapshot: HEAD `8cf6b82039381e62b0f1dac1953c0c8c279e86f1`; preserved tracked patch SHA-256 `0acad05e808e37476389adecb3dd86159fae7bcedd7f78042e4be4e3e46e9ec1`, independently hash-checked; manifest/untracked files accessible. Recheck found only authorized coordinating changes to spec/spec-log (spec appears twice among manifest groups), no application drift. See `review/snapshot-check.log`.
- Reviewer: fresh Codex subagent `/root/review_1b2a`, Project Lead in review-only mode; no inherited implementation/planning conversation, authorship, delegation or implementation edits. Requirements and service code inspected before Worker rationale. Parent subsequently supplied observations for independent assessment, identified below.
- Depth: full bounded service review, including model, history transaction, fake renderer, process fixture/tests, disposable real-bridge check, Python bridge, deletion and Cleanup boundaries. Git-derived inventory agrees with two modified/seven new slice files. Production service import audit found no opt-in.
- Limits: no new FFmpeg rendering, browser, power-loss or adversarial concurrent junction-swap test. Existing real-bridge receipts assessed as Worker evidence, not claimed as reviewer execution. Synthetic fixtures are retained under the review evidence directory; no user data used.

## Verification assessment

- Required evidence: **fail for acceptance** because behavioral requirements have confirmed counterexamples despite passing submitted commands.
- Inspected Worker receipt/Handoff, focused/full Node/build/types evidence, real-bridge result (reversed segments, full words, decoded markers, restart, cancellation, Python mutation, Cleanup), snapshot and retained Python-input justification. No changed Python dependency requires gratuitous reruns; these results do not cover the findings below.
- Reviewer command: `node scripts/verification/run-tests.mjs node src/services/clip-revisions.test.ts src/services/clip-revisions.process.test.ts`; expected success, actual exit **0**, **21/21 passed**, `review/focused.log`.
- Reviewer command: `node --import tsx _local/project/evidence/writing-studio/1b-2a/review/repro.mjs`; expected the isolated counterexamples and assertions, actual exit **0** on the final expanded run; exact schedules in `review/repro.mjs`, outcomes in `review/repro-result.json` and `review/repro.log`. Uses configured environment, Node 24.15.0/tsx, actual source modules/history locking and fake media/probe. Initial sandbox invocation failed before executing the script (`uv_os_get_passwd`); approved execution outside that restricted process context succeeded. No product failure inferred from that environmental error.
- Executor for additional checks: self, this reviewer. Human assistance: none. No required passing check is fabricated; reproductions intentionally demonstrate defective outcomes.

## Findings

All locations below are `src/services/clip-revisions.ts` on the bound snapshot. All findings remain **open**.

| ID / importance | Location | Failure condition and impact | Evidence | Required outcome |
|---|---|---|---|---|
| R1 / P1 | `saveDraft` around 363; `saveRevision` around 462/517; `validateArtifacts` around 730 | Pre-existing junctions at `exports/writing-studio/linked` and `history/revisions/linked` point outside those configured roots. Recursive mkdir/write and lexical containment accept them; regular leaf/group checks do not detect linked ancestors. A save commits artifacts physically outside both ownership boundaries. | `repro-result.json: links`: committed; new media group in `outside-export`, revision JSON in `outside-sidecars`. This is a real Windows junction, not a mocked filesystem. | Enforce real containment and reject linked ownership ancestors before creating dependencies, for drafts and revisions as well as returned files. Add actual linked-root and intermediate-directory tests. B2A-5. |
| R2 / P1 | commit lookup around 538; `finishOperation` around 658; `invalidateOperation` around 590 | Pause old incarnation's render, delete/recreate the same clip ID, start a new incarnation's same operation ID, then let old rendering fail. `finishOperation` addresses only clip/operation IDs and marks the **new** pending operation failed with the old error. Its valid completion cannot commit. The commit mismatch branch and cancellation API likewise mutate without first establishing operation incarnation/request ownership. | `incarnation`: different incarnations, new state becomes `failed`, error `old renderer failed`, new completion returns `superseded`. | Every operation mutation must bind expected incarnation and captured operation identity before touching a record, including failure, invalidation and late commit handling. Old completions/cancellation must leave recreated work untouched. B2A-2. |
| R3 / P1 | `validateRecipe`/`validateWords`; `saveRevision` around 408–412, 463, 501 | Recipe/words validation returns caller-owned objects rather than a captured copy. Pause after operation creation, replace caller recipe segments `[0,1]` with `[7,8]`, resume: changed media and recipe commit under the original request hash. Replaying the original request returns that different result. | `mutable`: saved start 7, original start 0, replay committed/true. | Snapshot all request data before asynchronous work; hash, validate, render and persist that same detached snapshot. Include nested words/framing/segments and mutation-during-await regression coverage. B2A-1/2/4. |
| R4 / P2 | validation before replay around 409; `replayResult` around 675; `trimOperations` around 766 | At 34 failed saves with unchanged versions, trimming forgets the first ID; replay renders again (34 to 35 calls). After successful revisions, old replay either fails expected-state checks once trimmed or returns `version:-1` and empty `output_path` beyond current/previous. Removing source also prevents replay of an already committed operation. | `failedReplay`, `trimReplay`, `oldReplay`, `missingSourceReplay`. | Preserve durable ID/request/outcome identity without a silent 32-record expiry; replay complete original results independently of mutable source availability. If using bounded inline records, retain authoritative archival identity/result rather than forget it. B2A-2. |
| R5 / P2 | `validateArtifacts` around 704–716; duration comparison around 479 | Delete receipt `output_duration` and segment `source_start`, set `content_start=999`: numeric subtraction becomes NaN, so comparisons are false and malformed exact provenance commits. The service stamps this as an exact revision although required source/content mapping and final duration are absent/inconsistent. | `malformed`: committed; preserved revision document path in result JSON. | Validate required exact-v1 fields/types/finite numbers and ordered content mapping before arithmetic or persistence; validate composition/words/artifact requirements consistently. Reject malformed receipt without moving saved pointers. B2A-4. |

## Recurrence and prevention

Read ledger Open and Closed; no archive exists. R2 relates to WS-01's expected-state publication class (new operation-state occurrence); R3 relates to WS-03/WS-06's saved-content/provenance classes; R5 relates to WS-03/WS-06 and exact receipt scrutiny under WS-09. R1 ownership containment and R4 durable replay are proposed new classes. Lead should choose final IDs/class grouping and retain prior snapshot-limited closures. Focused service regressions for each concrete schedule are the prevention destination; the existing test asserting a 32-record cap enforces an incompatible design choice instead of durable retry behavior.

Worker observations independently assessed: `backend/main.py` omits `captions` while `generate_clip` defaults true; the exact-check `captions:false` calls cannot prove disabled captions. This is a supported out-of-scope bridge observation (also supplied by parent), not a new 1B.2a regression. Legacy deletion does not implement revision retention/cancellation adapters; that is already excluded successor work, not a reason to expand this slice. Inferred renderer group parent is the accepted interface and intrinsically needs no repair.

Parent-raised duration question: legacy summary deliberately retains `result.duration` (content duration); immutable receipt/probe separately retain measured final duration. No unambiguous additional bounded defect established. Clarify reader semantics during adapter refresh rather than silently redefine legacy consumers in this repair.

## Reviewer recommendation

- Recommendation: **request-changes**, R1–R5.
- The locked history transaction and publish-dependencies-before-pointer architecture are appropriate; the five gaps can be corrected within the bounded service without production integration or renderer redesign.
- Coordinating lead: disposition these findings and arrange the existing manual repair handoff; require new evidence on changed inputs and fresh bounded follow-up. Initial review complete; preserve the at-most-two-unsuccessful-repair-round reassessment rule and no automatic repair loop.

## Coordinating lead disposition and next action

2026-09-13, existing coordinating Project Lead: **changes requested**, R1..R5.
Read the complete review, reproduction outcomes and affected service branches
against lead-9. The counterexamples support all five required outcomes; passing
submitted checks do not satisfy B2A-1..6 in their presence. No disagreement with
the review recommendation. 1A and 1B.1 acceptance remains scoped and unchanged.

Author-lead closure verified by: not applicable; the coordinating lead authored
no application implementation. This fresh review is `/root/review_1b2a` with no
inherited history; the next repaired snapshot also needs fresh non-author review.

Ledger mapping: R1 WS-12 (physical ownership containment), R2 WS-13 (operation
incarnation ownership, related WS-01), R3 WS-14 (mutable captured input, related
WS-03/06), R4 WS-15 (durable replay), R5 WS-16 (receipt schema validation, related
WS-06/09). Existing snapshot-limited closures are not reopened as regressions in
unchanged predecessor code. The caption bridge observation is added to WS-06;
deletion compatibility remains WS-05/successor scope; inferred parent is accepted
interface behavior, not a separate defect. No additional duration blocker: final
probe duration is retained, and legacy reader semantics need explicit successor
integration treatment. Do not expand this repair to those legacy paths.

Current direction is spec lead-10, section `1B.2a repair-1 direction`, clarifying
existing acceptance criteria. Keep complete operation identity/results for the
incarnation lifetime in this repair, without an arbitrary cap or new archival
subsystem. Bound all state changes to operation ownership, detach inputs before
awaits, reject physical escapes and malformed receipts. Preserve the reviewed
reproduction and demonstrate corrected outcomes separately. Refresh focused/full
Node, build/types and real saved-revision bridge evidence; unchanged Python
coverage may be retained with explicit justification.

Next: Isaac manually relays the bounded repair prompt to Worker. No repair agent
was dispatched. Worker returns `reports/1b-2a-repair-1-worker.md` with snapshot under
`_local/project/evidence/writing-studio/1b-2a-repair-1/`, then fresh independent
follow-up and lead disposition. Initial review completed; repair round one next,
at most two unsuccessful rounds on an issue before reassessment. Implementation
is frozen until that relay; no acceptance, commit, push, release or 1B.2b.
