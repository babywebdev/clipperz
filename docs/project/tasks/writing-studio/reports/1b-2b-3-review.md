---
record: "review"
task: "writing-studio"
cycle: "1b-2b-3"
spec_revision: "lead-24"
snapshot: "_local/project/evidence/writing-studio/1b-2b-3/correction-1/snapshot/manifest.json"
author: "agent"
date: "2026-09-23"
state: "historical"
summary: "Changes requested: explicit null caption or thumbnail fields bypass the tracked-clip entry fence and permit a title write. Other inspected fence checks and the correction snapshot are consistent with the receipts."
read_when: "Dispositioning Writing Studio 1B.2b.3, repairing its entry fence, or checking recurrence of presence-versus-value guard errors."
evidence: "_local/project/evidence/writing-studio/1b-2b-3/review/"
workflow_version: "5.0.0"
instruction_inventory: "docs/workflow/inventories/5.0.0-local-1.md"
---

# Review: Writing Studio / 1B.2b.3

Size note: the cross-language reproduction and uncommitted-snapshot binding require more narrative than the 600-word soft cap; the finding and evidence paths remain in the template sections.

## Review identity and coverage

- Task and spec: `docs/project/tasks/writing-studio/spec.md`, lead-24; B2B3-1..5 and the lead-23/24 bounded assignments.
- Snapshot: base `fed8ed13dcb2aade06bee341953d6b10d58bff13` plus the header-bound manifest, SHA-256 `a7048a8bc353bc06a573d265014d51eb74c573a9a455a6775bf01b1100c180cd`. Its tracked patch, untracked copies, input hashes and both slice deltas identify the uncommitted code. Independent `--check` returned `No drift.` before this report was written (`review/snapshot-identity.txt`, `review/snapshot-check.log`). Afterward it flags only this new review report as an extra file (`review/post-report-snapshot-check.log`), with no implementation drift. Git diff and untracked-file enumeration independently identified the current source changes; the lead-23 and correction deltas separated this slice from earlier accepted work.
- Reviewer: fresh Codex desktop review session assigned review only by the pasted 2026-09-23 relay; no authorship of the implementation and no inherited author conversation. Requirements, actual code, tests and check script were read before the author reports and self-audits.
- Depth: full fence review of `clip-write-fence.ts`, `clips-history.ts`, `clip-write-fence-route.ts`, `web-server.ts`, `server.ts` MCP delete, `backend/services/clips_history.py`, `backend/cli.py`, the DR-1 test change, focused TS/Python tests and `check-revision-fence.mjs`. The unfenced transaction callers, save-service constants and protected-source hashes were traced. No browser or non-Windows claim.

## Verification assessment

- Required evidence: **fail for acceptance** because R1 contradicts B2B3-1; the supplied B2B3-1..5 receipts otherwise show passing focused/full Node and Python, build, client types, compile and disposable HTTP/CLI checks on this manifest. Full Node reports 776/776; Python reports 1000 passed, 337 subtests passed, 6 skipped. The DR-1 file independently hashes byte-identical to the approved proposal.
- Expected values came from lead-23/24 criteria, the legacy pre-change control capture and known fixture state. The check script asserts stored-byte hashes, real HTTP/CLI refusal outcomes, route barriers and pre-change control parity. I inspected its assertions and the author logs/JSON, including junction creation, 409 bodies, policy order, the accepted post-guard legacy-media residual and path-free refusal logging.
- Independent reproduction: `node _local/project/evidence/writing-studio/1b-2b-3/review/null-field-repro.mjs` against built Studio and real CLI, isolated storage and a verified free loopback port. The successful run used the configured Python executable after the sandbox denied its first launch. `review/null-field-result.json` records 200/`{ok:true}` for both explicit-null PATCH requests and exit 0 for CLI `--thumbnail-config null`; each changed the tracked clip's title. The fixture was removed. No provider call.
- Remaining limit: the original receipts cover a dangling junction, case variants and missing roots; denied lookups and file symlinks are code-reviewed, not separately executed here. Hard links and post-check junction swaps remain the recorded U-1 static-boundary limit, and the post-guard legacy-output write is the accepted pre-adoption residual. Neither explains R1.

## Findings

| ID / importance | Location and snapshot | Failure condition and impact | Evidence | Required outcome / status |
|---|---|---|---|---|
| R1 / blocking contract gap | `src/ui/clip-write-fence-route.ts:85`, `src/ui/web-server.ts:2618-2625`, `backend/cli.py:3375-3387`, `backend/services/clips_history.py:493`; manifest `a7048a8b…` | B2B3-1 and lead-23 require the *whole* tracked-clip PATCH carrying `caption_style` or `thumbnail_config`, and `clips edit` with `--thumbnail-config`, to refuse before a side effect. The guard uses `!= null`; HTTP then drops the null field and applies `title`. Python parses JSON `null` to `None` and applies `--title`. Thus explicitly supplied fenced fields return success and mutate the title instead of refusing. Revision fields and media stayed unchanged in this reproduction. | `review/null-field-repro.mjs` and `review/null-field-result.json`: title-only control 200; caption-null PATCH 200 and title changed; thumbnail-null PATCH 200 and title changed; CLI option `null` exit 0 and title changed. Existing tests cover non-null values only. | Refuse these explicit-field requests with the specified code/message and no title write, and add outcome checks for mixed title/null requests through HTTP and CLI. If null is intentionally exempt, the task-state owner must revise the explicit whole-request criterion and assess compatibility before acceptance. Open. |

## Recurrence and prevention

The ledger's Open table contains WS-03/04/05/06/09 legacy issues; none is this presence-versus-value guard class. Closed WS-08 concerns no-op mutation but not a supplied guarded field; no ledger archive exists. Propose a first-occurrence row for R1, with focused mixed-field HTTP/CLI tests as prevention. The task-state owner owns the ledger update. Lead-23's pre-handoff guard/handler re-read fix and lead-24 F-2 diagnostic correction can be indexed Closed after disposition; this review found them satisfied on this snapshot.

- Proposed durable corrections: R1's request-presence rule and tests in the existing fence modules; no workflow or product-scope change proposed.

## Reviewer recommendation

- Recommendation: **request-changes** for R1; no acceptance or Status edit by this review-only session.
- Next action for the task-state owner session **“Writing-studio integration plan refresh”**: disposition R1 against the explicit lead-23 contract, arrange the bounded correction and refreshed affected receipts on a new snapshot, then obtain focused non-author assessment of that repair if material correctness remains unresolved. Reconcile Status and ledger there; preserve this original review.

## Pre-repair assessment checkpoint

- No repairs. Original review is bound to lead-24 and manifest `a7048a8b…`; no later addenda.

## Repair and final verification

- No repair authorization or implementation writes; final snapshot, repair author, execution receipt and post-repair self-audit: not applicable.

## Disposition and next action

- Disposition: pending the active task-state owner. Review recommendation: changes-requested. Task Status, ledger and integration/release were not changed by this session.

### Task-state disposition (2026-09-23, lead-25)

Separately attributed; the review above is unchanged. Author: the Writing Studio task-state session (Claude Code desktop, claude-opus-5-5), which took over task-state ownership from the "Writing-studio integration plan refresh" session by Isaac's transfer on 2026-09-23. At disposition the correction-1 helper's `--check` flags only this report against `a7048a8b…` (`lead/lead-25-snapshot-check.log`).

- R1: supported; repair required. Lead-23 refuses the whole request that carries `caption_style` or `thumbnail_config` and exempts only a title-only request, and the fence counts key presence elsewhere (TS own keys, including undefined). An explicit `null` is carried, so a tracked-clip PATCH with it refuses, as does `clips edit` with either option supplied, whatever its value. Requirement unchanged. Untracked behavior stays as at `fed8ed1`. Present since lead-23 `b88984be…`. Ledger WS-22.
- Lead-23 guard/handler re-read fix: not closable. When the guard finds no entry it calls `next()` (`clip-write-fence-route.ts:117`), and the five TS media handlers read again (`checkedClip(res) ?? findById`, `web-server.ts:2658, 2711, 2763, 2835, 3186`). This review's probe r1 (`review/reproduce.mjs`, `reproduce-result.json`) planted a tracked entry between the reads: logo remove overwrote the owned output, then answered 409. The accepted residual covers only files a route captured at its early check, outside the owned trees, so this is a recurrence, not the residual. Repair required; ledger WS-20 stays Open.
- F-2: confirmed on `a7048a8b…`; ledger WS-21 Closed.
- Probe r2 (`review/reproduce-publication.py`, `publication-result.json`), not among the findings above: supported gap. Rerender writes a title-derived name in the checked directory, and a link planted there reaches the owned tree. Accepted nonblocking deferral for 1B.2b.3: it needs a deliberately planted link, the hard-link form is already the accepted U-1 limit, production writes nothing to the namespace before adoption, and the fix is in `clip_generator.py`, outside this slice's scope. 1B.2b.4 or 1B.2b.5 closes it before adoption. Ledger WS-23 Open.
- Next: bounded repair-1 by manual relay (spec-log `2026-09-23: lead-25`), then the task's fresh independent follow-up for relayed corrections. Review stays changes-requested; nothing accepted.
