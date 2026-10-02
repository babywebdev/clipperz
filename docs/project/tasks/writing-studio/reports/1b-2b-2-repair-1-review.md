---
record: "review"
task: "writing-studio"
cycle: "1b-2b-2-repair-1"
spec_revision: "lead-16"
snapshot: "_local/project/evidence/writing-studio/1b-2b-2-repair-1/snapshot/manifest.json"
author: "reviewer"
date: "2026-09-21"
state: "active"
summary: "Request changes: root-linked history is read before ownership checks; numeric ranges, playback identity and missing committed pointers remain insufficiently validated. Legacy word classification is repaired."
read_when: "Disposing reader repair-1, resolving remaining R1/R2 gaps, or assessing R3 closure and evidence provenance."
evidence: "_local/project/evidence/writing-studio/1b-2b-2-repair-1/review/"
workflow_version: "4.1.0"
instruction_inventory: "docs/workflow/inventories/4.1.0-local-2.md"
---

# Review: writing-studio / 1b-2b-2-repair-1

Size exception: distinct remaining boundary failures and historical evidence limitations require more than the usual compact review.

## Review identity and coverage

Fresh non-author Project Lead review-only agent `/root/review_1b2b2_repair1`. Read installed startup, applicable Part B procedures, lead-16 requirements/B2B2-1..5, constraints/exceptions, prior review/disposition, legacy feature map and relevant writer/reader/route/tests before Worker design rationale. Generic local-media rules apply. No application repairs, delegation, ledger/Status edits, acceptance or release action.

Snapshot: HEAD `fed8ed13dcb2aade06bee341953d6b10d58bff13`; manifest SHA-256 `ca104bfb968514288e720a2ee2ae759c3e27594533f392e2de5aeba223bd284d`; patch `ffe9eb35afd3707ca0ec7d92c092ae4267918f56cdfe43a6baee1138b1461266`; 25 untracked copies. Git-derived change inventory inspected. Snapshot check finds only lead spec/log bookkeeping plus this review's new log; application/evidence inputs match. Four compiled module hashes in `root-junction-result.json` match the Worker's `dist-before-rebuild.sha256` and stable-check record. These binaries drove the independent reproductions.

## Verification assessment

**B2B2-1/3 fail remaining behavior below; R3/B2B2-2 malformed-word correction verified.** The complete list validation preserves supplied-empty, unavailable and legitimate overlap; focused compatibility tests pass for old documents lacking optional composition/join structures, drafts and ordinary missing media. No new save import or application write capability found. Read-only and old-route evidence remains useful.

Independent receipts, executor **self**, configured Windows Node runtime, snapshot above. Evidence paths below are relative to this review's evidence root:

| Command | Actual result | Evidence |
|---|---|---|
| `node scripts/verification/run-tests.mjs node src/services/clip-editor-context.test.ts src/ui/editor-context-route.test.ts` | Exit 0; 105/105 pass | `focused.log` |
| `node scripts/installation/run.mjs node editor-repair-review _local/project/evidence/writing-studio/1b-2b-2-repair-1/review/repro.mjs` | Exit 0; real-document control succeeds; previously malformed pointer/word examples refuse; new counterexamples succeed incorrectly | `repro.mjs`, `repro.log`, `repro-result.json` |
| `node scripts/installation/run.mjs node editor-review-root _local/project/evidence/writing-studio/1b-2b-2-repair-1/review/root-junction.mjs` | Exit 0; linked configured root exposes outside history text | `root-junction.mjs`, `root-junction.log`, `root-junction-result.json` |
| `node _local/project/evidence/writing-studio/1b-2b-2-repair-1/snapshot-capture.mjs "$PWD" --check` | Checker reports four drift lines: spec/log bookkeeping and its own newly created log; no application drift. Shell display command exited 0, not a checker pass. | `snapshot-check.log` |

`repro.mjs` is an explicitly identified adaptation/extension of the prior script. It writes only new fixtures here and copies the original real draft instead of clearing its pointer. Original reviewer evidence is untouched. No active Studio, user media or AI; synthetic media only stat-ed. Submitted 610-test full Node, HTTP/restart/byte-preservation, build/type and retained-input receipts were inspected, not independently rerun. Retained Python/media evidence is proportionate to unchanged covered inputs; corrected accepted save-bridge/parity citations are appropriate. No browser check claimed.

## Findings

All reader locations refer to `src/services/clip-editor-context.ts` on this snapshot.

**R1 remains open / P1 — validate the configured history boundary before capturing history (captureEntry, around 894; buildLegacy, around 978).** `readHistoryStrict` opens `clips.json` before any owned-path check. A real junction replacing the configured history root points at our separate fixture containing `external`; GET service succeeds and serializes its title/transcript. Later sidecar walks detect the linked root but merely mark those inputs unreadable. `root-junction-result.json` proves outside text escapes despite the claimed root refusal. Revision/draft ancestor checks themselves now work, but do not cover the earlier history read. Required: refuse linked configured-root/history chains before consuming history, with stable OWNERSHIP_ESCAPE; preserve genuine missing history semantics and external legacy media support. Legacy sidecar links also currently degrade to unreadable instead of lead-16's specified OWNERSHIP_ESCAPE; reconcile this deliberately in the lead disposition rather than claiming literal compliance.

**R2a remains open / P1 — finite numbers still become invalid exact timing (validRecipe/validTimeline/validBookend/validProbe/validFinalComposition, around 517–689).** Independent cases return raw output duration -12, measured content -4, final/probe duration -99, and a bookend spanning 8 to -3 with negative duration/overlap/join inputs, while `effective_cuts_known:true` remains. Crop keyframe `t:-50,x_pct:9999` also passes. These are consumed fields, not unconsumed receipt internals. Required: validate legitimate ranges and relationships needed by these timing/editor claims, including present optional structures, with stable document errors. Retain old-field absence, reordered segments and overlapping words; no new-save schema upgrade or media hashing is required.

**R2b remains open / P1 — committed playback identity can disagree with its document (validateRevisionDocument around 691; buildMedia around 1240).** `wrong-playback-identity` changes both current.output_path and entry.output_path to a different synthetic MP4 while leaving document.files.main.path unchanged. It returns the original exact revision identity/timing and true committed play/download capabilities for the unrelated file; no summary-drift diagnostic fires. The writer publishes pointer.output_path from doc.files.main.path together (`clip-revisions.ts:1595` onward); existing by-ID routes serve entry.output_path (`web-server.ts:1965`). Required: compare document/pointer identity and fail contradictory tracked state; separately ensure existing legacy-summary drift cannot leave a capability claiming the URL serves the described revision. This finding does not request cryptographic integrity verification.

**R2c remains open / P2 — missing committed pointer becomes legacy recovery (validateState around 494; read around 823).** Clearing only `current` from the real committed fixture retains a positive revision counter but succeeds as `tracked-without-revision`. The actual protocol creates null current only during ensureTracked for an entry without output, with revision_version zero (`clip-revisions.ts:1291–1311`); commits publish current and its positive counter together (`1607–1610`). No writer clears it. The prior review script's cleared draft was fixture convenience, not proof of a supported clear operation. Required: reject missing committed pointers for protocol states that require them. Preserve genuine initial no-output/version-zero state. This report does not infer that every absent pointer or previous-pointer ordering needs a blanket new invariant.

## Evidence provenance and recurrence

Worker's pre-edit reproduction row cannot bind to the final repaired sources: its own before results show predecessor behavior. Treat it as the pre-edit 1B.2b.2 snapshot plus disclosed bookkeeping; the receipt-wide “every row” final-source assertion is inaccurate. Preserve the handed-off report and correct through attributed disposition/addendum. Final reruns independently support repaired original examples but do not establish historical execution.

Seven original reviewer files were restored byte-identically per recorded hashes. Worker admits moving/restoring fixture-HO9pKq without a historical directory hash baseline. Its historical integrity remains unproven; same-volume rename and timestamps are not a content comparison. This review uses independent new fixtures and does not erase that limitation.

Read ledger Open and matching Closed classes; no archive exists. Keep WS-12 open for the history-root occurrence and WS-16 open for remaining consumed-value/identity cases; retain accepted write-side closures. Recommend closing WS-17's reader occurrence on this snapshot. Add root-linked legacy-history and range/identity/protocol-state mutations to reader/route tests; existing success tests should use real writer states instead of legitimizing convenience mutations. No global workflow change proposed. Unrelated WS-03/04/05/06/09 remain unchanged.

## Reviewer recommendation

**Request changes.** Lead should dispose these concrete gaps, clarify R1's legacy-link error contract and evidence binding, and reassess the incomplete boundary inventory before another bounded repair. This is an unsuccessful first repair follow-up; preserve the existing two-unsuccessful-round reassessment budget and do not start an automatic repair loop. No acceptance or release recommendation.

## Coordinating lead disposition and next action

2026-09-21, coordinating Project Lead: **request changes for R1/R2; accept the R3
correction and close WS-17 on this snapshot.** Read complete review, independent
reproductions and writer/reader evidence. Independent105 tests corroborate retained
coverage but do not close remaining counterexamples. Author-lead closure verified
by: not applicable; lead authored no application implementation.

Uphold the pre-history-read ownership gap, invalid consumed timing ranges, mismatched
document/pointer media identity and positive-counter/null-current fallback. Prior
fixture-cleared draft is not a writer contract. Lead-17 explicitly preserves genuine
version-zero states, requires root checks before history consumption and stable
OWNERSHIP_ESCAPE for linked legacy sidecars. Summary drift retains usable context
but disables committed-media capabilities and clears the claimed served revision.
No per-read hashing, new-save schema migration or concurrent-swap guarantee is added.

Evidence qualification: the before-reproduction row belongs to the pre-edit 1B.2b.2
snapshot plus recorded bookkeeping, not final repaired sources. Original seven
reviewer files have recorded hashes; the moved original fixture lacks historical
content proof. Fresh independent fixtures establish current findings/correction
without retroactively proving that directory's integrity. Preserve this limitation.

Reassessed incomplete read-order and claim/invariant coverage now; manual repair-2
is bounded in lead-17. WS-12/16 reader occurrences remain open; prior accepted writer
closures remain. If repair-2 is unsuccessful on the same issue, reassess before a
third relay. Fresh follow-up remains required; no slice acceptance, automatic repair,
successor work, commit or release.
