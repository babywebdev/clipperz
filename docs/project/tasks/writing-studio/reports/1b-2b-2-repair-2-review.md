---
record: "review"
task: "writing-studio"
cycle: "1b-2b-2-repair-2"
spec_revision: "lead-17"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2-repair-2/snapshot/manifest.json"
author: "reviewer"
date: "2026-09-21"
state: "active"
summary: "Request changes: R1 and R2c corrections verified, but R2a composition relationships and R2b absent-summary playback claims remain open. Second unsuccessful R2 repair requires lead reassessment."
read_when: "Disposing reader repair-2, reassessing remaining WS-16 invariants, or verifying WS-12 closure."
evidence: "_local/project/evidence/writing-studio/1b-2b-2-repair-2/review/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Review: writing-studio / 1b-2b-2-repair-2

Size exception: distinct remaining relationship failures and partial closures require the additional evidence detail below.

## Review identity and coverage

Fresh non-author Project Lead review-only agent `/root/review_1b2b2_repair2`, without inherited implementation conversation. Inspected installed startup/applicable procedures, lead-17 and retained lead-15/16 requirements, B2B2-1..5, baseline/constraints/exceptions, feature preservation, reader/model/route, actual writer validation/publication and existing serving routes before Worker rationale. Review covers owned-read order, tracked state, draft/committed projection, timing/card/artifact relationships, legacy recovery and compatibility. No implementation, shared-record, delegation, acceptance or release action.

Snapshot: HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13`; final manifest SHA-256 `01e88e25f56b208e85dfaf8877dfc6aa2653ffbd5209d1dc08a8392571c3e30f`. Separate pre-edit manifest `69189dfe26938442b34c912320f17386cf1cfee6e213feee3ed1bc8fbfc79f20` appropriately binds before evidence. Git-derived changed paths inspected. Checker with explicit repository root finds only lead spec/log bookkeeping and subsequently this review's new evidence; no application/covered-input drift. Four compiled hashes in `review/repro-result.json` match Worker's `dist-before-rebuild.sha256` exactly. Current Status correctly records handback/frozen application and pending review; its no-drift statement is explicitly before bookkeeping.

## Verification assessment

**B2B2-1/3 fail remaining behavior below despite passing submitted checks.** Self-executed configured Windows Node v24.15.0 receipts (all paths relative to cycle evidence root):

| Command | Expected / actual | Evidence |
|---|---|---|
| `node _local/project/evidence/writing-studio/1b-2b-2-repair-2/review/run.mjs tests` | Existing focused reader/route regressions pass: exit 0, **135/135** | `review/tests.log` |
| Same runner, `repro` | Valid control/old optional absence succeed; malformed relationships should refuse or disable claims. Exit 0 records remaining incorrect successes below | `review/repro.mjs`, `review/repro.log`, `review/repro-result.json` |
| `node _local/project/evidence/writing-studio/1b-2b-2-repair-2/snapshot-capture.mjs "$PWD" --check` | Recorded application inputs match; checker exit 1 for bookkeeping/new review evidence, not a clean-check pass | `review/snapshot-check.log` |

The review runner uses `loadRuntime` and the existing offline Vitest configuration, disables test caching and redirects fixture/temp/log destinations into this review. It changes no shared harness. Reproductions copy the repair-2 HTTP fixture's real committed and draft documents into newly allocated directories; original fixtures are never modified. A real root junction now returns OWNERSHIP_ESCAPE. Pointer/document disagreement returns REVISION_DOCUMENT_INVALID; positive-counter/null-current returns REVISION_STATE_INVALID. Different nonempty summary correctly disables serving; valid control and old optional absence remain readable. Focused tests additionally cover sidecar/history links, missing media, malformed legacy words, supported draft/no-card/bookended states and routes. Recommend R1/WS-12 and R2c closure; retain R3/WS-17 closure.

Inspected submitted full Node **640/640**, HTTP/restart/byte-preservation results, build/type logs, retained-input and compiled-stability evidence. Did not independently repeat full Studio restart, full suite, build, media rendering or browser interaction; focused source tests plus matching compiled reproduction are sufficient to establish these failures. Retained Python/media evidence remains proportionate to unchanged dependencies. Python indexing was unavailable (PATH missing; configured launcher access denied, preserved `review/index.log`); used bounded assigned-record headers instead. No human assistance, active Studio, user media, AI or external-network action.

## Findings

All locations refer to `src/services/clip-editor-context.ts` on the bound snapshot.

**R2b remains open / P1 — absent summary is excluded from drift detection (1007–1009).** Deleting `entry.output_path` or setting it to `""` retains a valid pointer/document and existing synthetic output. Both reads return the saved revision in `media.serves` and true play/download capabilities, with no drift diagnostic. `serveClipById` in `src/ui/web-server.ts:1965` returns 404 for either summary. The predicate requires a nonempty summary before detecting disagreement, so it falsely labels unreachable URLs. `missing-summary` and `empty-summary` independently demonstrate this; `other-summary` is the passing repaired control. Required: missing/unusable summaries must also disown the by-ID URLs while retaining useful revision/text context, as lead-17 requires. Pointer/document identity correction itself passes.

**R2a remains open / P1 — individually valid fields still support contradictory saved-media claims (681–791, 846–878).** Four independent mutations of the real card document all succeed with `effective_cuts_known:true`:

- `short-card-output`: set final output/probe duration to **1.52**, equal to content start, while retaining **2 seconds** of content and raw duration **2.09**. The response asserts the file ends before any of that content plays. Card-present validation checks only output >= content offset; it never relates final length to card plus raw length.
- `hardcut-impossible-overlap`: add an outro at **900–901 seconds**, asset **500**, overlap **500**, branch `hardcut`, to a **3.61-second** final file. Asset-minus-overlap cancels, so the arithmetic check passes; impossible branch/overlap and output interval are serialized. Actual writer validation at `clip-revisions.ts:696–750` enforces hardcut zero overlap and bookend relationships; these do not depend on new optional provenance being present.
- `wrong-artifact-domain`: a caption placement reports **source-absolute seconds** and `contains_card:true`. Reader accepts any nonempty domain/boolean; the writer's `buildFinalComposition` records content-relative, card-free sidecars. Those consumed values are returned as authoritative artifact metadata.
- `contradictory-card-provenance`: set thumbnail provenance to requested/applied false while retaining the final composition's applied card. Response simultaneously reports no applied thumbnail and a present card image/1.52-second card offset. The two independently validated structures never meet.

Required: enforce the relationships behind these consumed claims using supported writer semantics and recorded tolerances; preserve genuine old optional absence, overlap/order and fallback compatibility. No hashing, reprobe or retroactive new-save validation is requested. The Worker's table captures several scalar bounds but omits these relationships; passing mutations of isolated fields do not close the full claim contract.

## Recurrence and recommendation

Read ledger Open/Closed matching classes; archive does not exist. Propose closing WS-12's reader occurrence on this snapshot, retaining WS-17 and prior writer closures, and keeping WS-16 open for R2a/R2b with this report linked. R2c is independently verified. Unrelated WS-03/04/05/06/09 remain unchanged. Prevention belongs in reader/route regressions: missing/empty summaries and mutually contradictory but individually valid timing/card/artifact fixtures. Preserve historical uncertainty about the earlier moved original reviewer fixture; this review proves current behavior using new fixtures only.

**Request changes.** This is the second unsuccessful repair follow-up on R2. Coordinating lead must explicitly reassess the relationship-validation approach before any third relay; no automatic repair dispatch. Reconcile the claim/invariant table against actual writer relations rather than extending only the latest example list. No slice acceptance or release recommendation.

## Coordinating lead disposition and next action

2026-09-21, coordinating Project Lead: **request changes for R2a/R2b; accept R1
and R2c corrections on this snapshot.** Close reader WS-12, retain WS-17 closure,
keep reader WS-16 open with prior writer closures preserved. Read complete review,
independent135-test results and reproduction counterexamples against lead-17 and
actual serving/writer code. Author-lead closure verified by: not applicable; lead
authored no application implementation. No unsupported new requirement is needed
to establish unreachable URLs or contradictory consumed timing/card/artifact claims.

Two unsuccessful R2 follow-ups trigger the mandatory reassessment now. No third
Worker repair prompt is issued. The spec checkpoint identifies why scalar/field
inventories have failed and requires a claim/relationship design and coherent
cross-record mutations before another bounded scope. Sharing pure contracts may be
considered without importing writable service operations; no refactor authorized yet.
Existing old-document, static ownership and no-hashing limits remain unchanged.

The separate before/final snapshot binding is adequate, and current reviewer
reproductions preserve original evidence. The earlier fixture-integrity limitation
is not erased by later successful hash checks. Passing full Worker checks and fresh
focused tests remain useful evidence, but do not close R2a/R2b. No slice acceptance,
successor implementation, automatic repair, commit or release.
