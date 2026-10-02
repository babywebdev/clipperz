---
record: "spec-log"
task: "writing-studio"
author: "agent"
date: "2026-09-23"
state: "active"
summary: "Lead-27 records the 1B.2b.4a review disposition: WS-23 audio-only sink (F-1) goes to repair-1, D-1 and D-2 accepted, WS-25 and WS-26 deferred; earlier history retained."
read_when: "Investigating historical baselines, review dispositions, instruction changes, lead-23 to lead-27 decisions or repair-3 reconciliation."
---

# Spec log: Writing Studio

Entries are append-only. This is history, not a competing Status or acceptance map.

## 2026-09-13 — lead-1 through lead-7 — preserved pre-refresh history

Codex coordinating Project Lead, workflow-maintenance assignment: moved the following
original narrative verbatim apart from heading depth. Original dates inside each
section retain their meaning; this is the migration date, not invented decision or
approval dates. Full original spec SHA-256
`f01ab87f33df4715eda4220a1c7fb4a0431b950a1ef2e6bebe892c5bbc1f079a` remains at
`_local/generate-init-backup/20260913-4.1.0/docs/project/tasks/writing-studio/spec.md`. Historical snapshot identities remain unmodified.
Current requirements, metrics rule, product choices and publication constraints are
retained in spec lead-8; history here does not authorize future slices.

### Implementation plan: Writing Studio and Library editing

Originally prepared by a planning-only author. The coordinating Project Lead has
reviewed and refined it against current code through revision lead-7. Slice 1A
is implemented, verified and accepted after independent review of both repairs.
Isaac requested continuation with 1B on 2026-09-12. The current bounded assignment
is 1B.1, activated by manual Worker relay; subsequent 1B steps remain provisional.

### Status

- Task ID: writing-studio
- Spec revision: lead-7, 2026-09-13 (repair-2 disposition; R3 closed, bounded group-setup cleanup repair; accepted 1A unchanged).
- Implementation: partial overall; slice 1A accepted; 1B.1 implemented and handed back, 2026-09-12; later substeps not started.
- Verification: pass for slice 1A. Bound full Python suite 900 passed / 6 skipped;
  independent focused 60 passed plus two subtests and five real-file API/CSV
  scenarios passed. Node 266, cross-process 8 and build/type evidence retained
  with unchanged relevant inputs. Full Writing Studio acceptance remains incomplete.
- Review: slice 1A accepted by coordinating lead, 2026-09-12, after fresh
  reports/1a-repair-2-review.md. R3 closed; unchanged R1/R2/R4 closures retained.
- Current slice: 1B.1 changes-requested after repair-2 independent review,
  2026-09-13. R1/R2 retained and R3a/R3b closed by lead. New R4 setup cleanup
  gap remains; repair 3 prepared for manual relay. 1B.2 remains pending.
- 1B.1 verification: Worker reports Python 952 passed / 6 skipped, Node 266 passed,
  build/client types, default preview/export parity and exact bridge checks passed.
  Lead verified all 43 snapshot entries including patch on handback with zero drift;
  independent focused 52 tests plus 47 subtests and fresh exact bridge check passed.
  Verification is nevertheless fail for acceptance: reviewer reproductions expose
  transcript provenance, incompatible transition and post-publication failure gaps.
  Review: changes-requested for 1B.1, 2026-09-12; no acceptance of this substep.
- Coordinating lead: Codex, this coordinating Project Lead session, 2026-09-11.
- Implementation owner: none active after 1B.1 Worker handback;
  coordinating Project Lead retains task direction. No implementation edits by lead.
- 1B.1 ownership: manual Worker relay completed; writes stopped at handback.
  Repair 1 manual relay and handback also completed; no active implementation owner.
  Repair 2 manual relay and handback also completed. No active implementation owner.
  Isaac's relay of handoff-1b-1-repair-3.md activates sole Worker ownership for that
  setup correction until handback; no automatic Worker dispatch.
- Ownership history: initial 1A, repair rounds 1/2 and 1B.1 Worker handoffs completed;
  all returned implementation ownership to the lead. No Worker currently active.
- Completed slices: 1A accepted. Worker reports: reports/1a-worker.md,
  reports/1a-repair-1-worker.md and reports/1a-repair-2-worker.md.
- Independent reports: reports/1a-review.md, reports/1a-repair-1-review.md and
  reports/1a-repair-2-review.md; each a fresh review-only subagent. All required
  1A follow-up complete; later substantial slices require their own reviews.
- Review snapshot: 8cf6b82039381e62b0f1dac1953c0c8c279e86f1 plus
  _local/project/writing-studio/1a-repair-2-snapshot/1a-repair-2-tracked.patch
  (SHA-256 308aa8fc5e1313e4a64dbf86c23a412cd1c59924a7af2706d6a029b2479c4194)
  and its 21-file manifest. Worker report: reports/1a-repair-2-worker.md.
- 1B.1 review snapshot: base 8cf6b82 plus
  _local/project/writing-studio/1b-1-snapshot/1b-1-tracked.patch
  (SHA-256 b7f9f7825ae618ada238a113bfac2273930e7ec3a78e8d85289829006cb26a34),
  33-file manifest, 3 local evidence and 6 workflow hashes. Worker report:
  reports/1b-1-worker.md. Subsequent lead Status/ledger edits are bookkeeping only.
- Repair 1 snapshot: base 8cf6b82 plus
  _local/project/writing-studio/1b-1-repair-1-snapshot/1b-1-repair-1-tracked.patch
  (SHA-256 6544206139108b6ebd02a68822116fca5b2d4c893eeb8513698f3bc3c4a48db1),
  36-file manifest, 6 local evidence and 6 workflow entries. Lead checked all 49
  entries including patch at handback: zero drift. Report:
  reports/1b-1-repair-1-worker.md. Worker reports focused 62 passed, full Python
  962 passed / 6 skipped, bridge and parity passed; Node/build/types retained.
  Independent focused 62 tests / 67 subtests passed; R3a/R3b reproduced with
  real disposable files and stubbed media. Verification fails for acceptance;
  review changes-requested in reports/1b-1-repair-1-review.md. The broader TS
  bookend union is non-blocking and deferred to the 1B.2 consumer-contract refresh.
- Repair 2 snapshot: base 8cf6b82 plus
  _local/project/writing-studio/1b-1-repair-2-snapshot/1b-1-repair-2-tracked.patch
  (SHA-256 14f2219a6e3741174eab3bc29827b7b35d305f3fbe9c14d248d04e8924b8abd3),
  39-file manifest, 9 local evidence and 6 workflow entries. Lead checked all 55
  entries including patch at handback with zero drift. Worker report:
  reports/1b-1-repair-2-worker.md, focused 69 tests / 63 subtests, Python 969
  passed / 6 skipped, exact bridge/parity passed; Node/build/types retained.
  Independent focused 69 tests / 63 subtests passed. Prior publication failures
  closed; a staging mkdir failure leaks an empty parent with no residual note.
  Verification fails for overall acceptance on R4; review changes-requested in
  reports/1b-1-repair-2-review.md. No prior-output loss reproduced after redesign.
- Next action: manually relay handoff-1b-1-repair-3.md; Worker returns
  reports/1b-1-repair-3-worker.md and refreshed snapshot for fresh bounded follow-up.
  No 1B.2/1B.3 implementation authorized. Two overall repair cycles reviewed;
  reassessment completed below before this assignment. R3 is closed; the remaining
  first-occurrence issue is setup ownership/cleanup, not another rollback failure.
- Prior 1A review/repair budget: round 1 unsuccessful on R3; round 2 accepted. No second
  unsuccessful round, so reassessment threshold not triggered. Future cycles still
  use two-unsuccessful-round reassessment and three-identical-attempt circuit breaker.
- Pending Isaac decisions: none material for 1B.1. D1/D2 resolved by Isaac:
  move captions/logos to Writing Studio; preserve detached writing and offer older
  revisions in explicit Cleanup (reports/kickoff-assessment.md).
- Integration/release: not authorized by this planning request.
- Git reconciliation (2026-09-12): HEAD 8cf6b82 commits the previous 1A work and
  task records; Git records LucentDev as author/committer. This lead did not create
  that commit. Repair rounds 1 and 2 remain uncommitted. The earlier no-commit statements
  describe those sessions at handoff, not the repository's current state. Existing
  history is preserved; a commit does not establish task acceptance or release.
- Installed workflow: 4.0.6; local adaptations recorded in `docs/workflow/README.md`.

Lead-5 disposition: R1 preserves omitted/null versus explicitly empty transcript
input through the exact bridge. R2 forbids known incompatible audio/video
transition semantics even inside codec tolerance. R3 applies failure preservation
to the entire exact render operation, including requested overlay/source artifacts,
not only its main-file atomic copy. These clarify existing B1-2/B1-3/B1-4, without
changing product intent. Legacy composition findings WS-09 remain separately open.
See reports/1b-1-review.md for independent evidence and lead disposition.

Lead-6 publication reassessment: exact outputs use an exclusively owned new
directory per operation. Stage the entire requested artifact group on the output
volume, prepare/validate the receipt, and publish with one directory rename into
an absent operation-owned destination. Never move/replace previous successful
files or their sidecars; same-title operations across processes receive distinct
paths. This removes compensating rollback from failure preservation. Legacy
output naming/replacement stays unchanged. No revision metadata, journal or
migration is introduced here. 1B.2 must refresh against the accepted artifact
layout. Optional completion reporting and its diagnostics are best-effort after
publication; rendering errors remain visible. Interrupted staging may remain
unreferenced, but previous paths stay available and no partial group is published.
Evidence and rationale: reports/1b-1-repair-1-review.md; bounded implementation
and verification: handoff-1b-1-repair-2.md. No new product decision is required.

Lead-7 reassessment (2026-09-13): retain the group publication design. Independent
evidence closes R3a/R3b, including persistent rename faults, failing reporting,
same-title processes and interruption. R4 occurs before the caller receives its
group: exclusive parent acquisition succeeds but staging creation fails outside
cleanup protection. Extend cleanup ownership from that first successful mkdir;
preserve the original setup error, delete only that owned parent or identify its
residual if cleanup is denied. No restoration/retry redesign, new protocol or
product choice is warranted. This is the bounded remaining condition for 1B.1
acceptance; see handoff-1b-1-repair-3.md and repair-2 review disposition.

1B.2 refresh inputs retained: returned files live under
<title>_short-<op_id>/final/; the group parent is inferred, not a result field.
Staging from process death is intentionally uncollected here; empty parents can
also be interrupted setup. Directory shape alone is not proof of an abandoned
operation: later recovery/Cleanup must account for active owners and references
before deletion. Full source transcript recovery input and the narrower exact
bookend consumer type remain required refresh topics. These notes do not authorize
1B.2 implementation or mark the feature-map acceptance boxes complete.

### Planning baseline and freshness

1B refresh (2026-09-12): `plan-1b.md` and `baseline-1b.json` identify current code,
accepted 1A predecessor, risk-bearing renderer/bridge/composition inputs and the
bounded next assignment. The 21-file accepted 1A manifest still matches all
implementation entries; only lead Status/ledger changes differ. No application
code was changed during this planning turn. The baseline is a freshness record,
not runtime evidence for unimplemented 1B behavior.

Current comparison (2026-09-12): repair snapshot above supersedes the kickoff code
input for 1A. Git object comparison confirms 8cf6b82 contains the reviewed original
implementation; CLI/planning-baseline byte differences are line-ending normalization,
with normalized content equal. Historical planning input below remains preserved.
Lead-3 changes only the remaining R3 publication precondition. R1/R2/R4 evidence
remains applicable while their implementation and relevant inputs are unchanged.

- Inspected checkout: `C:/Users/Isaac/Desktop/BabyWebDev/Code and Websites/video-clipperz`.
- HEAD: `710b4d4eaf598e1a3a75a48e57b17b1b25f30e0e`.
- That commit is titled `Updates pre-Writing Studio`. The 46 application/workflow
  inputs captured in `planning-baseline.json` have no working changes at the final
  planning check. This task's new plan files and the historical-draft pointer are
  uncommitted. The manifest records hashes and Git status for drift detection;
  it is not an implementation review or acceptance snapshot.
- Product input: Isaac's request to combine Content and Library's publishing work,
  preserve all capabilities, retain trim/reframe/thumbnail editing in Library,
  add an easier live timeline, and hand off saved clips without export/reupload.
- Earlier discussion: `docs/writing-studio-plan.md`; it is historical context,
  not another task-status owner. Workflow installation is complete; its earlier
  unresolved workflow-location question is obsolete.
- Relevant ignored context: the configured runtime is described by
  `docs/local-setup.md` and loaded by `scripts/local/runtime.mjs`. No credentials,
  actual environment values, media, or user's history were copied into this plan.
  Runtime availability, source files, and browser draft contents were not tested
  in this planning turn. Validate them in disposable fixtures when needed.
- Source-inspection observations below are not runtime bug reproductions. Earlier
  thumbnail/build successes do not prove this proposed workflow works.
- Before implementation and each resumed slice, compare relevant hashes, callers,
  migration shape, and predecessor results; update affected design and checks.
  Do not reset working changes; another checkout needs these plan documents as
  well as the recorded application baseline before it can resume the task.
- Before independent implementation review, capture the stronger patch/content
  snapshot required by the workflow contract. No worker should infer review
  approval or ownership from the existence of this file.

### Workflow and handoff

The coordinating Project Lead owns this task's Status. Lead-Worker relays remain
manual through Isaac. No Worker was dispatched and no application implementation,
commit, server launch, or independent implementation review occurred at kickoff.
Each substantial slice gets a fresh review-only assessment after Worker handoff,
then lead disposition. Budget: two unsuccessful repair/review rounds on the same
issue before reassessment; never a fourth identical failed approach.

Use one task directory and per-cycle reports. Worker reports use the installed
report template and identify checks before substantial implementation. A fresh
independent reviewer uses the lead role in review-only mode, without inheriting
the planning/implementation conversation. If subagents are unavailable, use a
fresh separate session. The coordinating lead owns acceptance and any findings
ledger updates; a Worker does not self-approve. Apply the installed two-round
review reassessment and three-identical-attempt circuit breaker.

The Project Lead should assess the proposed render-commit protocol, TS/Python
locking coverage, legacy timing recovery, deletion retention policy, and timeline
scope before slice 1. Routine internal choices remain delegated. No mandatory new
user approval is introduced for naming/components or already-authorized planning.
Implementation authorization and any unresolved material product choices must be
recorded honestly before Worker dispatch.

### Decisions and durable records

Isaac confirmed captions/logos in Writing Studio, detached writing after clip
deletion, and Cleanup eligibility beyond current-plus-previous renders on
2026-09-11. Single-video timeline and explicit ready handoff remain scoped as above.
The lead selects shared JSON locking for slice 1A rather than a new database.
Later interfaces remain provisional and require freshness checks, verification
and independent review; these decisions do not authorize implementation.

Companion files: `feature-map.md`, `planning-baseline.json`, and
`project-lead-prompt.md`. The latter is a fresh-session prompt, not an executed task.

### Lead-2 technical refinements

These constraints refine the draft's design; they do not authorize later slices.
Evidence and product decisions are in `reports/kickoff-assessment.md`.

- Freshness: all 46 original hashes match 710b4d4 on 2026-09-11. No application
  changes found. Planning files remain uncommitted. Generic media-app references
  still apply; no added domain reference is needed. Relevant ignored project
  inventory contains reference-study materials, not accepted task outcomes.
- History mutation must distinguish missing history from corrupt/unreadable or
  invalid-shaped history. Only a missing file initializes empty. Never turn a
  read failure into a successful overwrite. The lock covers fresh read through
  atomic replacement, including prefix resolution; atomic rename alone is not
  concurrency protection. All callers of full-list saves must be reconciled.
- A render commit publishes immutable, fully written dependencies before one
  authoritative pointer update. Use durable operation IDs and compare expected
  versions under the same mutation protocol; a crash before pointer publication
  leaves an orphan, not a committed revision. Recovery reconciles operation state
  with the pointer after a crash between publication and success acknowledgement.
- Do not expose revision-backed clips to legacy mutating routes that can bypass
  this protocol. Adapters must join it as revisions become writable, including
  thumbnail/logo/CLI/MCP operations; moving their UI may wait until slice 3.
- The renderer currently sorts segments, snaps ends, can remove pauses/fillers,
  and does not return its effective segment map. `preserve_timing` only controls
  transition autofix; it does not freeze editorial boundaries. Before 1B accepts
  a render, establish an explicit exact-edit mode preserving ordered segments and
  return effective timing from the renderer. Preserve old defaults for New Episode.
  Test reordered/noncontiguous segments, end snapping, and widening after narrowing.
- Versioned timing must retain source-absolute words as recovery input and derive
  edited words/text from the actual kept segments. Empty words is valid, distinct
  from unavailable words. Retain enough source transcript for widening; never use
  a bounding-range transcript as proof of what an edited render contains.
- Probe the final card/logo/bookend output for actual size and duration. Model
  intro/outro crossfade overlaps as well as the 1.5s opening card. Persist effective
  content mapping separately from full output duration; do not trust the current
  renderer's content-only duration as final MP4 duration.
- Migration must not claim exact timing from recipes that omit automatic cuts.
  Keep the legacy output and writing available; label insufficient edit capability
  until trustworthy source/timing recovery. Do not silently re-transcribe, flatten
  cuts, or use an unrelated episode cache. Copy legacy unknown fields intact.
- Migration publication must be resumable with deterministic identity and durable
  acknowledgement before clearing browser data. Missing old transcript/custom
  answers remain unavailable. Rollback means restore an isolated pre-migration
  metadata snapshot only before new writes; after new writes, retain new documents
  and use forward recovery. Running baseline code concurrently with migrated data
  is unsupported and must not be represented as a lossless downgrade.
- Cleanup needs an explicit app-owned revision namespace/category beneath exports,
  not a blanket scan of exported media. Traverse live current/previous/operation
  roots rather than every historical absolute path; keep unknown/corrupt metadata
  fail-safe. Coordinate final reference validation and unlink against all processes
  that publish references, not only web-server busy flags. Do this before new
  revisions become eligible for deletion. Never make original exports candidates
  merely because they appear in a legacy manifest.
- Thumbnail replacement, logo removal and caption changes rebuild from the same
  recipe, without using stale pre-logo backups. Preserve the chosen card exactly
  once. The initial composition order remains content finishing, bookends, then
  the opening card; no new logo overlay on the card is introduced implicitly.
- D1/D2 are confirmed by Isaac. Readiness is a saved-revision
  marker, not a gate on editing writing or evidence of publication. A missing-media
  document remains accessible without being falsely marked render-ready.

### Lead-3 metrics publication decision

Repair round 1 still overwrites intervening timestamp-less metrics (see
reports/1a-repair-1-review.md). Use the conservative expected-state rule for 1A:
publish a fetched metrics result only when the clip exists, attribution matches,
and current metrics equal the captured snapshot metrics. Any intervening change
is a skipped conflict, regardless of fetched_at. Unchanged legacy metrics still
refresh normally. This is a lead-owned technical choice preserving the approved
no-lost-update guarantee; no product decision or new schema is needed. The Worker
must update the misleading newer-only conflict message and timestamp-override tests.
Affected evidence is R3/history-metrics publication only; preserve prior lock and
encoding closures where input hashes remain applicable.

## 2026-09-13 — lead-7 to lead-8 — 4.1.0 reconciliation and instruction boundary

- Owner/authority: Codex /root as coordinating Project Lead for this workflow
  maintenance, explicitly authorized by Isaac to refresh and propagate repair-3.
  Existing Writing Studio coordination and implementation ownership are preserved.
- Scope: instruction/schema/index/template update, current spec/log, current
  repair-3 assignment and lossless ledger conversion. No application implementation,
  feature acceptance, release, storage-policy change or automated Worker dispatch.
- Starting comparison: repair-2 Worker Handoff returns writes; its review/disposition
  leaves only R4/WS-11 blocking 1B.1. User identifies repair-3 as ongoing handoff.
  There is no repair-3 report at entry. All 55 repair-2 manifest entries checked;
  only spec/ledger differ, matching the prior lead's R3 closure/R4 disposition.
  Implementation and the six recorded workflow hashes match at entry. See
  `_local/generate-init-refresh/20260913/before.json`. Reconciliation preserves already relayed authorization
  without inventing a running session, completed repair or repeat relay requirement.
- Inventory: observed pre-refresh identity `docs/workflow/inventories/4.0.6-pre-refresh-20260913-1.md`; final 4.1.0 identity
  `docs/workflow/inventories/4.1.0-local-1.md`. Reports keep actual historical bindings; the observed old
  inventory proves only its capture and matching six-file repair-2 subset, not the
  entire instruction set used by every historical report. Unknown stays unknown.
- Affected work: repair-3 implementation/checkpoints/handback and its fresh independent
  review use lead-8 and 4.1.0 after explicit reread of changed instructions. Work
  executed before that boundary records its real older instructions separately.
  No application criteria weakened: AC-12 provenance updated; B1-1..4 requirements
  and named checks consolidated into the spec's single map; existing R4 scope,
  no-agent-dispatch boundary, review/retry budgets and media protections retained.
- Reconciled living records: spec.md (lead-8/header/compact Status/current baseline
  and requirements); handoff-1b-1-repair-3.md (active assignment/header and binding);
  docs/project/findings-ledger.md (header, six Open/five Closed rows, all IDs and
  explanatory details); this spec-log (append-only history). The exact original ledger
  is also preserved at docs/project/record-history/20260913/findings-ledger.pre-4.1.0.txt.
- Frozen records: every existing report, handoff except the living repair-3 assignment,
  feature-map, plan-1b, planning/baseline JSON and earlier snapshot/evidence artifacts
  remain byte-for-byte. No handed-off assessment/provenance/header rewritten and no
  automatic supersession of accepted-cycle evidence. Missing headers remain explicitly
  unclassified in the read-only index; no guessed historical metadata/backfill.
- Remaining unclassified: the 13 existing reports (including kickoff and latest
  repair-2 Worker/review), earlier assignments (1A and 1B.1 through repair-2), plan-1b,
  feature-map and project-lead-prompt. They are retained intentionally, not an
  unfinished bulk-migration queue. Latest repair-2 report Handoff/addendum and review
  Findings/disposition remain relevant resume inputs despite absent frontmatter.
- Hash identities: originals were preserved before any edits. The attributed old/new
  mapping at docs/workflow/reconciliation/20260913-record-identities.json distinguishes
  repair-2's historical hashes, already changed lead-7 bookkeeping, and lead-8 records.
  Original patches/manifests are untouched. No new run claims historical execution.
- Validation checkpoint: rendered installation and reconciled records written;
  index/schema, hash/link/Git-policy checks and fresh independent maintenance review
  pending. Append actual results here; do not interpret partial metadata as completion.

## 2026-09-13 — lead-8 — refresh validation and maintenance handback

Codex /root, coordinating Project Lead for workflow maintenance: reconciliation
completed. This append closes the earlier maintenance-validation checkpoint; it
does not rewrite prior entries or change application Status/ownership/acceptance.

| Maintenance check | Actual command or method / expected result | Actual result and executor | Evidence |
|---|---|---|---|
| Installation, records, provenance and preservation | Bundled Python runs `_local/generate-init-refresh/20260913/validate.py`; expect exact source copies, valid headers/templates, preserved inventories/originals, unchanged code/reports and required criteria | Exit 0; 48 passed, 0 failed; self, Codex /root | `_local/generate-init-refresh/20260913/validation.json` and immutable `verification-receipt-manifest.json` |
| Bounded index | Same Python runs `docs/workflow/scripts/record-index.py docs/project/tasks/writing-studio --active --offset 0 --limit 20` and offset 20; expect current records plus unclassified history, bounded pages | Both exit 0; 25 records before new review, 20 then 5 rows; self; page 20 independently corroborated | `index-page-0.txt`, `index-page-20.txt` in the maintenance evidence folder |
| Storage and whitespace | `git check-ignore --no-index` for enumerated durable/local paths and `git diff --check` for workflow destinations; expect docs/startup eligible, backups/settings/source/evidence ignored, no whitespace errors | Expected exits 1 (durable not ignored), 0 (local ignored), 0 (diff check); self | `git-eligible.txt`, `git-ignored.txt`, `diff-check.txt` in the maintenance evidence folder |
| Fresh independent maintenance review | Project Lead review-only, no inherited author history; inspect requirements and actual preserved snapshot | Accept recommendation; no actionable maintenance findings; independent Codex /root/review_workflow_refresh | `reports/workflow-4.1.0-refresh-review.md`; lead disposition accepts maintenance only |

Exact Python executable/command, runtime version, checked snapshot, initial/final
exit codes and SHA-256-preserved logs/scripts/source inputs are in
`_local/generate-init-refresh/20260913/verification-receipt-manifest.json` and
`validation.json`. Initial validation exited 1 because its own comparison stripped
the space after **B1-1**; the exact requirements were present. Corrected only that
assertion and reran successfully, preserving `validation-initial.json`. Reviewer
tooling limitations and successful fallback are recorded in its report. Git warned
that the sandbox could not read the user's global excludes file; repository policy
checks returned the expected results. No missing required maintenance check remains.

The immutable maintenance snapshot contains base commit, binary-capable tracked
patch, Git-derived inventory and exact changed/untracked file copies. Forty-two
pre-refresh artifacts and all 13 original reports remain byte-for-byte; 14 source
mappings match 4.1.0. Current inventory binds 19 installed/context paths plus three
maintenance-only source identities; the prior inventory preserves 15 observed
instruction/context paths. Record identity mapping preserves original and successor
hashes. No existing source bundle, ignore rules, application code, media or historic
report/evidence was edited. No archive-dnr access or backfill mode was used.

Preserve/transfer required ignored originals, sources, evidence and snapshot copies
before another checkout relies on them. Reports without metadata remain intentionally
unclassified and discoverable, not accepted or superseded by this refresh. No
application test was rerun: this maintenance changed no product behavior and makes
no new repair-3 execution claim. WS-11 and repair-3's fresh independent application
review remain outstanding. Later slices and release remain unauthorized.

Normal startup now uses 4.1.0; defaults remain Codex Project Lead and Claude Worker.
Existing repair-3 Worker starts/resumes from handoff-1b-1-repair-3.md and spec lead-8,
explicitly rereading changed instructions and recording the actual revision boundary.
Already relayed authorization needs no second relay. This refresh does not take
application implementation ownership from that Worker or transfer task coordination.

## 2026-09-13 — lead-8 — coordinating-session continuation reconciliation

Author: the existing Writing Studio Codex coordinating Project Lead session.
This is its own coordination report/checkpoint, not application implementation or
another maintenance acceptance. Requirements and spec revision remain lead-8.

Instruction boundary: this continuation explicitly reread README, complete Part A,
Project Lead role, CLAUDE.md/local setup, applicable-reference selection (none),
Status and bounded task index in order. Complete applicable Part B procedures and
record-frontmatter were read before reconciliation, checks, edits and handoff.
Subsequent coordination uses 4.1.0-local-1; earlier coordination and reports retain
their actual 4.0.6 bindings. No application repair-3 execution was discovered from
which to infer a Worker instruction-switch date. The authorized Worker must record
its own actual boundary, preserving unknown historical provenance where necessary.

Compared maintenance spec-log completion, maintenance review/disposition, immutable
inventory/mapping, spec baseline/current requirements/single acceptance map/approved
exceptions, active repair-3 handoff, repair-2 Worker Handoff/addendum and independent
Findings/disposition with the actual tree. The task index has 26 eligible records
on bounded pages of 20 and 6, including unclassified predecessor reports. None is
a repair-3 implementation/review report. No named repair-3 snapshot, scratch item
or runtime log was found in the existing assigned locations. HEAD remains 8cf6b82;
source still has the reported staging-mkdir setup gap. This does not assert that
no Worker session exists; existing relay authorization and sole Worker ownership
until handback remain unchanged.

Read-only evidence, executor self (existing Codex lead), saved at
`_local/project/evidence/writing-studio/20260913-continuation/`:

| Check/method | Expected / actual result | Evidence |
|---|---|---|
| Git inventory plus PowerShell Get-FileHash against repair-2 manifest | No application drift; 55 entries checked, seven expected record/instruction differences only | comparison.json, repair2 and gitStatus |
| Preserved inventory and old/new mapping hashes | 22/22 instruction/source identities and 14/14 live/original mappings match before this Status/log checkpoint | comparison.json, instructionInventory and recordIdentityMappings |
| Bundled Python record-index.py, task root, --active --offset 0/20 --limit 20 | Exit 0/0; 26 eligible records; unclassified history visible | index-0.txt, index-20.txt |
| Relevant report/snapshot/scratch/log discovery and source inspection | No repair-3 handback or implementation delta found; setup issue remains | comparison.json and clip_generator.py _ExactOutputGroup.create |

PATH Python was unavailable; bounded header indexing was followed by successful
index runs using the bundled executable named in the maintenance review. Git's
global-ignore warning persists; normal Git inventory succeeded. The preserved
maintenance validation.json reports 48 passed/0 failed; its independent maintenance
disposition is accepted. Those historical checks were inspected, not rerun or
claimed as new application verification. No product test was run in this turn.

Disposition: Status remains partial / verification fail / review changes-requested;
WS-11 and fresh application follow-up remain outstanding, while prior 1A and exact
R1/R2/R3 closures stand. No metadata backfill, supersession, old report/inventory
rewrite, implementation dispatch or ownership transfer. Only this current Status
and append-only log checkpoint change; the immutable mapping continues to describe
its original refresh result. The complete Worker continuation prompt refers to
lead-8 and the current repair-3 handoff, requires its named checks, preserves
no-agent-dispatch/storage/retry/review safeguards and needs no repeated approval.
No 1B.2, application edit, commit, push or release was performed or authorized here.

## 2026-09-13 — lead-8 — repair-3 handback and independent follow-up

Existing coordinating Codex lead: compared the new Worker report's actual Handoff,
receipt and current tree with Status and the bounded index (27 records, seven on
page 20, including the new report). Repair-3 is now handed off; Worker writes are
stopped. Prior continuation's no-repair-3 observation is historical, not current.
Requirements remain lead-8. No application implementation by this lead.

Snapshot: HEAD 8cf6b82 plus
_local/project/writing-studio/1b-1-repair-3-snapshot/1b-1-repair-3-tracked.patch,
SHA-256 e79ad677ca6012c09ffc24892a0b93f59e9bb676642fd7d7f33426b2ba5002e0,
and manifest.json. PowerShell Get-FileHash checked all 87 entries (63 files,
13 evidence, 10 workflow/context and patch): zero drift before Status/log edits.
Git and repair-2 manifest comparison show only clip_generator.py and
test_exact_render.py changed among application/check inputs. The Worker reports
73 focused tests, 973 full Python tests / 6 skips, syntax, four-case demonstration
and real bridge passed; historical retained evidence remains subject to assessment.

The report binds all repair-3 work to explicit 4.1.0 startup and lead-8 with
4.1.0-local-1; no pre-refresh repair-3 action is claimed. Historical 4.0.6 reports
and immutable inventories remain untouched. Updated AGENTS was explicitly reread;
unchanged 4.1.0 core/procedures/context from this session remain applicable.

Fresh /root/review_1b1_repair3, Project Lead review-only with no inherited history,
is assigned reports/1b-1-repair-3-review.md. Neutral scope is R4/WS-11 closure,
cleanup/error/ownership boundaries and affected evidence/compatibility. No reviewer
implementation or delegation; implementation frozen, Status/log bookkeeping only.
This is one bounded independent follow-up under the existing review budget, not
an automatic repair loop. Acceptance remains pending and WS-11 remains open.

## 2026-09-13 — lead-8 — 1B.1 acceptance after repair-3 closure

Existing Codex coordinating lead: read reports/1b-1-repair-3-review.md, its
independent checks and closure recommendation against current requirements and
Worker evidence. Accepted repair-3 and closed R4/WS-11; accepted 1B.1 B1-1..4 on
the repair-3 snapshot recorded above. Prior exact R1/R2/R3 and accepted 1A remain
applicable. Author-lead independent closure: not applicable (no lead-authored
application code); fresh non-author reviewer /root/review_1b1_repair3 verified it.

Evidence: independent configured-runtime exact suite 73 passed / 67 subtests,
and four persistent setup-denial scenarios through real disposable directories.
Original error, acquired-only cleanup and residual paths verified. Reviewer
inspected Worker full Python 973 passed / 6 skips, syntax and real bridge evidence.
Retained legacy parity/Node/build/types remain justified by relevant unchanged
inputs and exact-only acquisition code. No new actionable findings or missing
required evidence within this substep. Injected faults are not live ACL/power-loss
proof; existing media precision/tracking limitations remain recorded.

Ledger WS-11 moves from Open to Closed, with its occurrence/prevention links
preserved; five other classes remain Open. Repair-3 assignment lifecycle changes
to historical because the bounded assignment is complete. Its body/provenance is
unchanged; the reviewed manifest still identifies its pre-acceptance bytes.
Worker/reviewer reports stay active as relevant accepted evidence; no automatic
supersession or old report/header rewriting. Status and baseline identify accepted
repair-3 while requirements remain lead-8. No feature-map checkbox is checked by
this prerequisite acceptance and no whole Writing Studio completion is claimed.

Next: coordinating lead refreshes provisional 1B.2 against the actual grouped
output paths and accepted receipt, retains full source transcript for widening,
and resolves operation/reference ownership, migration/legacy mutator adapters,
thumbnail/logo composition and Cleanup protection in the next bounded plan.
The broader exact bookend union and legacy WS-09 remain explicit inputs. No later
implementation is dispatched or authorized by this acceptance. No application
edits, agent implementation dispatch, commit, push or release by the lead.

## 2026-09-13 — lead-9 — 1B.2a plan refresh and manual Worker relay

Isaac's subsequent "Lets proceed" authorizes the next bounded assignment. Existing
coordinating lead retains coordination; Worker becomes implementation owner on
manual relay. No Worker or implementation agent was automatically dispatched, and
the lead made no application edits. No repeated product approval is needed.

Compared the accepted repair-3 snapshot and current tree before authoring. HEAD
remains 8cf6b82039381e62b0f1dac1953c0c8c279e86f1. All application entries remain
unchanged. Four manifest differences are expected lead bookkeeping after handback:
spec.md, this log, findings-ledger.md and the historical lifecycle on
handoff-1b-1-repair-3.md. Accepted reports, earlier plans/handoffs, patch and
inventories remain preserved. The bounded index found no later implementation
handback. New baseline-1b2.json records current relevant inputs; it is planning
freshness evidence, not a claim of new implementation verification.

Named code comparison: clips-history.ts has the accepted strict/locked mutation
primitive but no revision transaction. web-server.ts rerender saves reframe state
before rendering and thumbnail routes bake existing files directly; Python deletion
removes the selected output after history removal. Those paths cannot safely consume
new writable revisions yet. storage-cleanup.ts currently protects exports and scans
history references; new revision eligibility must not precede reference coordination.
ClipResult already carries the accepted exact receipt, while ClipHistoryEntry has
no draft/revision identity. Recipe/words sidecars do not establish truthful legacy
exact timing. These observations refine already-open WS-03/04/05 and legacy WS-06/09,
not new closure claims or authorization for incidental fixes.

Technical direction within approved intent: split the old broad provisional 1B.2
into 1B.2a, an internal revision commit service with real isolated save/reopen proof,
then a freshly planned production integration successor. No production caller opts
into versioned records until thumbnail/logo/rerender/deletion adapters, truthful
migration and final composition are integrated. This adds an intermediate proof
boundary rather than reducing the full feature criteria. Existing Content/Library
functions remain available. The old plan-1b.md stays byte-preserved as provisional
history; the current assignment lives in spec lead-9, avoiding a duplicate handoff file.

Settled risk-bearing choices: one active operation per clip; durable request/result
identity and expected versions; explicit invalidation instead of guessed crash
ownership; one authoritative history commit after immutable dependencies; retained
full source words; no general importer, opening-card composition or orphan collector
in this substep. The core rejects unsupported card requests rather than losing a
chosen card. Full card/logo operation-order and migration requirements remain in
the living spec for the successor before public exposure. Renderer group directory
is inferred from final returned paths and is not a new result field. Current/previous/
active namespace protection must be demonstrated with the actual Cleanup scanner.

Reference applicability remains the installed generic local-media selection; no
new domain/service is introduced, so no README selection change. All lead-9 planning
and subsequent 1B.2a work use workflow 4.1.0 and preserved inventory
docs/workflow/inventories/4.1.0-local-1.md. The earlier 4.0.6 and repair-3 instruction
boundaries are not rewritten. Docs remain tracked; old ignored evidence stays in
place, while new bulky 1B.2a evidence uses the README default under
_local/project/evidence/writing-studio/1b-2a/.

B2A-1..6 in the single acceptance table define required behavioral evidence,
fresh Node/build/types and a real disposable bridge check. Unchanged Python
predecessor checks may be retained only with covered-input comparison and dependency
justification; affected changes require fresh coverage. Worker records exact chosen
commands/expectations before edits, stops implementation writes at handback and
returns reports/1b-2a-worker.md. No agent dispatch or verification delegation.
Fresh independent design/code/evidence review remains required; lead disposition
follows it. Review budget remains one initial review plus at most two bounded repair
rounds before reassessment of an unresolved issue; no automatic repair loop.

Planning-only checks: relevant Git/manifest comparison, installed instructions and
bounded record discovery, source-path inspection, and final lead-9 baseline hash
recheck. No new application suite or save behavior is represented as passed.

## 2026-09-13 — lead-9 — 1B.2a handback and independent review

Coordinating lead received reports/1b-2a-worker.md actual Handoff. Implementation
writes stopped; none active during review. Read the complete report and reconciled
its bound snapshot with current Status and actual tree. The snapshot checker returned
73 files, six local evidence files and 12 workflow files with zero drift and no
unrecorded Git status lines before lead bookkeeping. HEAD remains 8cf6b82039381e62b0f1dac1953c0c8c279e86f1;
tracked patch SHA-256 0acad05e808e37476389adecb3dd86159fae7bcedd7f78042e4be4e3e46e9ec1.
The slice adds seven files and modifies models/index.ts and clips-history.ts;
accepted predecessor application work remains preserved. Worker reports 21 focused
tests, 287 full Node tests, build/types and real bridge passed; these claims remain
subject to independent evidence assessment rather than automatic acceptance.

Assigned fresh /root/review_1b2a with no inherited history, Project Lead review-only.
Its durable output is reports/1b-2a-review.md; ignored review evidence goes under
_local/project/evidence/writing-studio/1b-2a/review/. The reviewer confirmed snapshot
access. Scope is design, implementation, B2A-1..6 evidence and affected compatibility;
no expected verdict supplied. It may inspect relevant dependencies and run isolated
checks, but may not repair, delegate or edit shared records. Lead edits only Status
and this log during review. Application snapshot stays frozen. Workflow 4.1.0 and
inventory 4.1.0-local-1 apply; no historical instruction boundary is rewritten.

Budget: one initial independent review, then at most two bounded repair rounds on
an unresolved issue before reassessment. Repairs remain manual relays; no automatic
loop, commit, push, release or 1B.2b work. Reported bridge captions, deletion adapter
and inferred group-parent observations will be triaged against code and the ledger.
The suggested local-setup paragraph is not adopted during review because that file
is a bound instruction identity. Review and acceptance remain pending.

## 2026-09-13 — lead-10 — 1B.2a changes requested; bounded repair-1

Coordinating lead read the completed fresh reports/1b-2a-review.md, its preserved
repro-result.json and affected service branches. Disposition: changes requested
for all R1..R5. Independent focused suite passes 21/21, while separate isolated
production-service reproductions demonstrate physical junction escapes, stale
incarnation state mutation, caller-owned input mutation, lost/incomplete replay
and malformed receipt acceptance. These are behavioral failures, not absent test
execution. No acceptance or 1B.2b authorization. Prior 1A/1B.1 acceptance survives
within its original snapshot/coverage; no application edits by the lead or reviewer.

Review report owns complete findings and the lead disposition. Ledger adds WS-12
through WS-16 for those five distinct service classes, with related prior classes
linked rather than claiming changes in accepted predecessor code. Lead-10 clarifies
existing B2A criteria in the living repair direction: physical containment before
writes, ownership checks on every operation state mutation, synchronous detached
capture, durable complete operation results, and strict exact-v1 validation before
numeric comparisons. Remove the incompatible 32-record expiry and retain operation
identity/results for the incarnation lifetime; no archival subsystem or collector
is needed for this bounded correction. This is technical direction within approved
intent, not a new product decision or a weakened criterion.

Worker's out-of-scope observations reconciled: captions omission independently
confirmed in backend/main.py and added to WS-06; the existing exact-check calls
with captions:false do not prove captions-disabled behavior. Existing decoded
caption-on evidence is not invalidated by that omission. Revision deletion remains
the known WS-05/successor integration boundary and is not newly enabled here. The
inferred group parent is the accepted renderer interface and no separate finding.
Legacy summary duration retains content semantics while revision probe contains
actual final duration; no additional bounded blocker established. The next adapter
refresh must decide explicitly which duration each reader consumes. Do not fix
these legacy paths or change retained local-setup/instruction identities in repair-1.

Worker receives repair-1 only through Isaac's manual relay and remains the application
owner. Report destination reports/1b-2a-repair-1-worker.md; new evidence/snapshot root
_local/project/evidence/writing-studio/1b-2a-repair-1/. Preserve original reproduction,
run before edits when feasible and separately demonstrate corrected schedules.
Refresh focused/full Node, build/types and real saved-revision bridge on the repaired
snapshot; retain Python only with covered-input hashes and justification. Fresh
independent non-author follow-up is required, then lead disposition. No repair
dispatch, implementation, commit, push or release occurred in this coordination
turn. Initial independent review complete; round one next, reassess after two
unsuccessful repair rounds on an issue. No repeated Isaac product approval needed.

All new direction/disposition uses workflow 4.1.0 and inventory 4.1.0-local-1.
Original lead-9 report/snapshot and historical instruction boundaries remain intact.
Lead changes are spec Status/direction, this log, ledger and the review's designated
disposition section only; final application hash comparison remains required before
relay. The pre-repair planning baseline is historical freshness evidence, not a
new repair verification receipt.

## 2026-09-13 — lead-10 — repair-1 handback and fresh follow-up

Existing coordinating lead read reports/1b-2a-repair-1-worker.md and reconciled its
Handoff with the actual tree. The snapshot checker returned 75 file entries, 25
local evidence entries and 16 workflow/record entries with zero drift before lead
bookkeeping; only the deliberately excluded Worker report was outside Git inventory.
HEAD remains 8cf6b82039381e62b0f1dac1953c0c8c279e86f1. Tracked patch
48e97617b36c94b053611cca5402ccb427be2d28a19dc9e3236268aa02b77a99 is unchanged by
this repair because its seven changed implementation/check files remain untracked.
The repair is also preserved as repair-1-slice.patch, SHA-256
942969ab640a38fb2a4bed9ec4f5a2cb12c64bb29189cdc9fb82a270db87f0c2, against
hash-verified pre-edit copies. "No tracked file changed" does not mean no code change.

Worker reports all R1..R5 repaired, 33 focused / 299 full Node tests, build/types,
real bridge and corrected demonstration passed; Python inputs 20/20 unchanged.
Original reviewer files remain hash-preserved, with two added disposable fixture
directories from reproduction runs. These claims require independent assessment;
WS-12..16 remain open. No active implementation owner after handback; app frozen.

Assigned fresh /root/review_1b2a_repair1 without inherited history, Project Lead
review-only. It owns reports/1b-2a-repair-1-review.md and ignored evidence under
_local/project/evidence/writing-studio/1b-2a-repair-1/review/. Review covers design,
correction of all five findings, delegated choices and affected regression/evidence
adequacy, with neutral direction and no expected verdict. No reviewer implementation,
delegation or shared-record writes. Lead updates Status and this log only while it
runs. This is the follow-up for repair round one; the existing two-unsuccessful-round
reassessment and manual repair relay remain in force. No commit, push, release or
1B.2b. Workflow 4.1.0 and inventory 4.1.0-local-1 remain the actual instruction
binding; no new instruction boundary or historical rewrite.

## 2026-09-13 — lead-11 — repair-1 partial closure and repair-2 direction

Existing coordinating lead read reports/1b-2a-repair-1-review.md, the independent
reproduction and results, and relevant service/accepted renderer contract code.
Disposition: close R2/WS-13, R3/WS-14, R4/WS-15 on the repair-1 snapshot; keep
R1/WS-12 and R5/WS-16 open. Independent 33/33 focused verification supports the
three corrected ownership/capture/replay classes. Required verification still fails
for acceptance because four counterexamples commit through configured-root junctions
or persist contradictory words/caption style, intro composition and empty domains.
Worker full Node/build/types/real bridge evidence remains valid for its actual
coverage, not a substitute for missing cases. 1B.2a remains changes-requested.

Root-trust deviation disposition: lead-10 explicitly included configured roots;
the Worker treated them as an exclusive trusted boundary which could itself be a
junction. No approved exception supports that change. Lead-11 retains inclusive
root validation, not a new product constraint. The allowed static-check limitation
remains; no universal filesystem-race/power-loss protection is introduced.

Receipt direction now points to actual accepted `_build_exact_result` construction
and exact_render.py word mapping/content text/bookend_region functions. The fake
fixture's domain map differs from the real renderer and must follow it, not redefine
the consumer contract. Validate relationships and captured-input provenance without
editing Python, inventing a compositor, equating cleaned caption words with editorial
words, or widening tolerance. Word metadata, repeated/reversed intervals and rounding
must survive valid cases. Original missing-number reproduction is repaired but does
not close the broader provenance requirement. These are narrower corrections to
existing B2A-4/5, not scope expansion or a new approval gate.

Ledger closes WS-13/14/15 with independent follow-up links, retaining all occurrence
and prevention detail; WS-12/16 record continued findings without adding new classes.
The review's designated disposition section holds the acceptance decision; its
author assessment and evidence remain unchanged. No author-lead closure conflict:
the coordinating lead wrote no application code. No instruction/inventory edits.

Manual repair-2 destination: reports/1b-2a-repair-2-worker.md, with evidence/snapshot
under _local/project/evidence/writing-studio/1b-2a-repair-2/. Preserve the repair-1
reviewer artifacts and demonstrate corrected outcomes separately. Required fresh
focused/full Node, build/types and real saved-revision bridge checks remain; retained
Python needs unchanged-input justification. Preserve the three newly closed classes'
regressions. Worker scope is existing TS service/types/tests/fixtures/check only,
no Python, production adapters, Cleanup, migration or incidental legacy corrections.

This is unsuccessful repair round one for WS-12/16. Round two is the next bounded
manual relay, followed by fresh independent review. If either finding remains,
reassess before another repair relay rather than circulate it automatically. No
implementation, repair dispatch, commit, push, release or 1B.2b work occurred in
this coordinating turn. Workflow 4.1.0/inventory 4.1.0-local-1 still apply, with all
historical instruction boundaries and snapshots preserved.

## 2026-09-14 — lead-11 — repair-2 handback and fresh follow-up

Existing coordinating lead read reports/1b-2a-repair-2-worker.md and reconciled
Handoff, Status and actual tree. Snapshot check returned 78 files, 46 local evidence,
five renderer contract inputs and 16 workflow/record entries with zero drift before
lead bookkeeping. Only the excluded Worker report was outside the status inventory.
HEAD remains 8cf6b82039381e62b0f1dac1953c0c8c279e86f1; tracked patch
5a30e84de43ac24d853f865fe5ffd3406c9cd6280401d41cb096c203a442fb82; four repaired
untracked files captured in repair-2-slice.patch, SHA-256
f1050ab1a20840f419045149a3d1fffb32cb3b570069ccd2ab1390b2fb1c2219, against
pre-edit copies. No active implementation owner after handback; app writes frozen.

Separate drift: backend/services/strict_ai.py now supplies Codex model gpt-5.6-sol
and model_reasoning_effort medium. Lead inspected its Git diff; Worker attributed
it to other work and preserved it in this snapshot. No rollback or approval of
that other work occurs here. The 20 retained baseline Python hashes do not include
this module and cannot establish unchanged whole-Python state. Assess dependency
relevance for exact-path evidence; keep historical full-suite claims tied to their
original inputs rather than silently rebinding them to this changed tree.

Worker reports 38 focused/304 full Node tests, build/types, real saved-revision
bridge and corrected demo passed. These require independent assessment. Assigned
fresh /root/review_1b2a_repair2 without inherited history, Project Lead review-only,
to reports/1b-2a-repair-2-review.md and ignored evidence under this cycle's review/.
Neutral scope: remaining R1/WS-12 and R5/WS-16 design/corrections, retained closures,
affected evidence and the separate drift's relevance. No expected verdict, repair,
delegation or shared-record writes. Lead changes only Status/log during review.

This is repair round two; any still-unresolved finding requires lead reassessment
before another relay, not an automatic repair loop. No commit, push, release or
1B.2b. Actual instructions remain workflow 4.1.0/inventory 4.1.0-local-1; report's
2026-09-13 local handback and 2026-09-14 UTC recheck retain their recorded dates.

## 2026-09-14 — lead-12 — repair-2 disposition and post-budget reassessment

Coordinating lead read the full fresh reports/1b-2a-repair-2-review.md, reproduction
script/results and relevant concat_outro, exact_render.bookend_region and exact
result construction. Close R1/WS-12 on repair-2's static ownership boundary;
retain WS-13/14/15 corrections. Independent focused 38/38 passes and earlier
counterexample corrections are supported. Keep WS-16 open: a requested 0.5s fade
with two 2s inputs commits a coherent receipt/probe claiming 0.1s overlap, while
the actual clamp produces 0.5s. No full 1B.2a acceptance or successor implementation.

Reassessment is required and completed because this class survived both repair
rounds. Root cause: bounds establish admissible values, not the deterministic
transition chosen by the renderer. The TS validator's fake-driven examples also
missed a data-contract limitation: concat_outro records both actual input durations,
but bookend_region retains only the bookend asset duration and rounded regions;
content_duration_measured is rounded video end, not necessarily the raw media
duration used by the join. Composition/A/V slack cannot uniquely reconstruct the
missing input near clamp/eligibility thresholds. Another guessed-duration range
check would repeat the faulty premise.

Lead adopts the reviewer's small additive provenance proposal, now settled in
spec lead-12: non-null bookends carry join_inputs.main_duration and
join_inputs.appended_duration, copied from existing concat reports at original
precision. Consumer computes the actual clamp/eligibility with captured numeric
fade and compares the three-decimal overlap using existing rounding allowance.
Supported hardcut fallback remains legal with zero overlap. Existing stored v1
documents remain readable without rewrite; new saves with bookends require the
provenance or refuse clearly. No receipt version bump, renderer algorithm change,
new tolerance, production migration or new product decision.

This is an explicit technical scope correction: minimum Python receipt serialization/
plumbing and affected types/tests now join the TS service write area. Earlier
no-Python limits are superseded only for this correction; accepted locking, media
publication, legacy result shapes, strict_ai.py, dependencies and UI remain protected.
Prevention changes too: actual Python join/report code with controlled I/O supplies
a matrix for fade/main/appended clamps, intro/outro order, eligibility edges and
fallbacks. Coherent wrong-overlap mutations must be rejected independently of other
arithmetic errors. Do not rely only on a manually matching fake formula.

Updated B2A-4 in the existing single acceptance map; B2A-6 and affected B1-2/3 require
fresh focused/full Python, changed-Python syntax, exact bridge, focused/full Node,
build/types and saved-revision bridge. The concurrent strict_ai.py change remains
preserved; old full-suite evidence cannot cover it, and any current failure must
be assessed honestly without out-of-scope repair or a false pass claim.

Ledger moves WS-12 to Closed and adds this continuing WS-16 occurrence/prevention;
the reviewer report's designated lead disposition records all decisions. Earlier
assessment/provenance and accepted snapshots remain unchanged. No lead-authored
application code; independent closure supplied by fresh /root/review_1b2a_repair2.

Next manual cycle is still 1b-2a-repair-3, not a renamed reset of the finding history.
Worker report reports/1b-2a-repair-3-worker.md and new evidence/snapshot under
_local/project/evidence/writing-studio/1b-2a-repair-3/. After this reassessment the
budget is one bounded contract implementation and fresh independent follow-up;
unresolved results need explicit disposition/reassessment before any further relay.
No automatic Worker dispatch, application edits, commit, push, release or 1B.2b
occurred in this coordinating turn. Workflow 4.1.0/inventory 4.1.0-local-1 unchanged.

## 2026-09-14 — lead-12 — reassessed repair-3 handback and base reconciliation

Existing coordinating lead read reports/1b-2a-repair-3-worker.md and reconciled
Handoff with the current tree. Snapshot recheck: 12 file entries, 88 local evidence,
11 contract/dependency inputs and 16 workflow files, zero drift and no unrecorded
status lines before lead bookkeeping. Current HEAD fed8ed13dcb2aade06bee341953d6b10d58bff13,
tree b0d7d5c8e62c440fca5d1e4b6dfaa65ebd179f2c, independently read from Git.
Tracked patch 6b5b57bfbed008f8a203a09d53c0f2c98b3b05e1fb39c465253424b75983d407;
slice patch a06b4a8365f0cfd265be13914d9dd535f65f5ee29287abb533db54befdb6d6ad.

Isaac reports an accidental pre-edit commit. Worker head-drift evidence compares
80 pre-edit status entries with the commit's 80 paths, no additions/omissions, and
nine planned files' committed blobs with pre-edit copies. Lead checked the reported
base/tree and comparison artifact; fresh review also assesses binding. Commit
identity change is not an application acceptance or a reason to erase work.
No amend/reset/reword/commit/push occurred here. A first unquoted PowerShell tree-ref
query misparsed the braces; the quoted read-only query returned the correct tree.

Worker reports 43 focused/309 full Node, 77 exact/977 full Python (six skips),
build/types/syntax and both real bridges pass, plus a producer-derived matrix and
genuine old-document compatibility demonstration. Fresh full Python now includes
the preserved strict_ai.py change; evidence still needs independent assessment.
No application writer active after Handoff; WS-16 remains open pending disposition.

Assigned fresh /root/review_1b2a_repair3 without inherited history, review-only,
to reports/1b-2a-repair-3-review.md and cycle review/ evidence. Neutral scope:
remaining WS-16 contract correction, compatibility, producer-derived checks,
retained closures and base/snapshot evidence. It may inspect relevant dependencies
and run isolated checks, but not implement, delegate or edit shared records. Lead
updates only Status/log during review. This is the one follow-up in the reassessed
budget; unresolved results need explicit reassessment, not an automatic repair.
No release, production opt-in, 1B.2b or instruction/inventory changes.

Additional base check by lead: compared fed8ed1 Git blob hashes against all 29
repair-2 application entries. Twenty-eight match byte-for-byte; video_processor.py
differs only CRLF-to-LF normalization (working 157175 bytes, committed blob 153446).
Its normalized text is identical and current working bytes still match the repair-2
manifest. The commit preserves application source content, with this explicit
byte-identity qualification. The independent reviewer received the comparison;
no source change, normalization write or commit amendment was performed.

## 2026-09-14 — lead-12 — WS-16 closure and internal 1B.2a acceptance

Coordinating lead read the completed reports/1b-2a-repair-3-review.md, independent
binding results and verification against current lead-12 requirements and Worker
evidence. Accepted reassessed repair-3, closed WS-16 and accepted 1B.2a B2A-1..6.
Retain WS-12/13/14/15, 1A and 1B.1 closures. No supported blocking finding remains
within this internal slice. Worker implementation was not accepted automatically:
fresh /root/review_1b2a_repair3 inspected all 12 changed/new inputs, actual producer,
consumer and compatibility paths, and independently ran 43/43 service/process/matrix
tests and 77 exact Python tests with 123 subtests. Worker full suites (309 Node,
977 Python/six skips), build/types/syntax, both bridges and genuine old-document
demonstration were assessed on bound unchanged inputs. Initial environmental failures
remain recorded separately from approved-context passing execution.

Independent binding corroborates patches, all three untracked copies, 12 application,
88 evidence and 11 contract/dependency inputs, plus sampled actual bridge media bytes.
Only lead-owned spec/log bookkeeping differed during review. The reviewer's assessment
and provenance remain unchanged; the lead filled its designated disposition section.
No author-lead closure conflict: no coordinating-lead application authorship.

Acceptance limit: join_inputs prove what the actual producer recorded, not an
independent attestation of every input file's media duration. This is the explicit
lead-12 scope, not a new waiver. Existing rounding cannot distinguish arbitrarily
close overlaps; supported hardcut fallback and static ownership checks remain.
The actual producer-derived matrix and real-media tests establish the implemented
contract; no demonstrated additional production defect warrants another validation
system. The reassessed correction is complete and the repair loop ends here.

Ledger moves WS-16 to Closed while preserving its three-cycle recurrence and
prevention links. Five legacy/integration classes WS-03/04/05/06/09 remain Open.
No full feature-map acceptance is claimed; the service is not publicly enabled.
Current accepted application snapshot is fed8ed1 plus repair-3 tracked patch and
untracked copies. Commit message/history are untouched; CRLF/LF qualification and
separate strict_ai.py provenance remain recorded. Full Python evidence is fresh
but does not constitute live provider verification or approval of unrelated work.

Next owner/action: existing coordinating lead refreshes 1B.2b from the accepted
service, including legacy mutators, migration/composition, retention/reference
boundaries and reader duration semantics, before another manual Worker handoff.
No production exposure, next-slice implementation, agent dispatch, commit, push or
release occurs through this acceptance. Proposed local-setup documentation remains
for the next coordinated update with instruction inventory handling; no installed
instruction or preserved inventory was changed here.

## 2026-09-14: lead-13 successor planning and manual handoff

Isaac requested planning for implementation after acceptance of 1B.2a. Refreshed
against the current service/models, exact renderer, thumbnail helpers and CLI bake,
server thumbnail/logo/rerender paths, history/cleanup boundaries, and accepted
repair-3 review/disposition. HEAD remains fed8ed1; all 23 accepted application and
contract manifest entries match. No application implementation was changed by the
lead. `baseline-1b2b1.json` binds current relevant interfaces/configuration (hashes
only), dependencies and accepted snapshot. Previous planning baselines stay intact.

The broad provisional production-adapter/composition/migration partition is resized:
1B.2b.1 proves an immutable opening-card save through the internal revision service;
remaining production adapters/migration and visible handoff get a later freshness
check. Existing CLI baking overwrites its input and defaults the card to portrait
geometry; the accepted service refuses cards. Direct route wiring now would either
lose the existing card behavior or expose saved revisions to unsafe legacy mutators.
This is a technical sequencing decision within approved product intent, not a new
product gate. No new domain reference applies to this local-media capability.

Lead-13 explicitly replaces only the successor card refusal, preserving raw exact
receipts and adding separate final composition provenance. The card choice uses an
expected image hash and owned immutable copy. Final timing/size projection must
use final probes, while content-relative assets keep explicit domains. Composition
publishes a new group, never changes the renderer's or earlier groups, and accounts
for all dependencies/residuals. Old document/replay behavior, no-card request hashes,
static ownership limits, locks, incarnation and cancellation safeguards remain.
Later cleanup must use the resulting dependency graph, not infer a single group.
No collector or production opt-in is added in this slice.

Current spec holds B2B1-1..5, write boundaries and required verification. Worker owns
implementation upon Isaac's manual relay, writes its own 1b-2b-1 report/evidence,
and stops writes at handback. Fresh independent review remains required; the
existing two-unsuccessful-round reassessment and no-agent-dispatch boundary remain.
No additional product decision or approval is needed for this handoff. Workflow
4.1.0/inventory 4.1.0-local-1 govern this planning; preserved earlier inventories,
reports, accepted evidence and actual instruction-version boundaries are unchanged.

## 2026-09-15: 1B.2b.1 handback and independent review

Read the complete Worker report/Handoff against lead-13 and the actual tree. HEAD
remains fed8ed1. Before lead bookkeeping, the Worker snapshot check passed: 25 files,
57 local evidence, 22 contract inputs and 16 workflow-group entries, zero drift and
no unrecorded status paths. Manifest SHA-256 32ca283f9521a485bdef5fc422108647277c0d1e078fab2a4aa2ec3a0184c899.
Worker reports required verification passed; this is not yet acceptance.

Corrected stale Status: the older repair-3 workflow grouping included lead-owned
spec/log/ledger whose later bookkeeping changed. That grouping is distinct from the
22 installed inventory identities, reported unchanged before/after this cycle.
Current planning-baseline assertions describe pre-implementation freshness, not
unchanged application code after 1B.2b.1. Acceptance map and requirements unchanged.

Implementation writes stopped. Fresh non-author /root/review_1b2b1 was assigned with
no inherited conversation, bounded review-only authority, its own report/evidence
and no repairs/delegation. Review covers design, producer/consumer media and timing,
compatibility and publication safeguards, not just check counts. Lead keeps
coordination; no Worker dispatch or successor implementation. Retain the existing
two-unsuccessful-round reassessment budget. Proposed setup documentation is deferred
pending disposition and separate handling of the preserved instruction inventory.

## 2026-09-15: lead-14 composition R1 disposition and repair-1

Fresh /root/review_1b2b1 recommends changes for R1. Independent 22 Node and 14 Python
checks pass, but the real-composer reproduction commits contradictory audio claims
and missing required timing facts. Lead inspected the report, reproduction output
and validator: actual media relationships remain checked; unchecked retained
producer fields cause durable contradictory provenance. Uphold R1; B2B1-2 fails.

Reopened WS-16 for this new composition-boundary occurrence, preserving accepted
raw exact lead-12 closure and all prior occurrence links. Reassessment identifies
incomplete consumer validation, not missing producer measurements; no new media
attestation or tolerance policy is needed. Lead-14 bounds full supported-schema
validation, measured-claim comparisons and a field/mutation inventory with real
producer controls, preventing an examples-only patch. Existing compatible documents
and operation replay must remain unchanged. This is first repair of this occurrence;
two unsuccessful rounds require reassessment, and prior history remains searchable.

Status, ledger and designated review disposition reconciled. Worker receives a
manual repair prompt; no automatic implementation or agent dispatch. Lead authored
no application edits. Fresh independent follow-up remains required. Worker report
and reviewer findings/provenance unchanged. Required affected checks and permitted
hash-justified evidence reuse are recorded in the spec. No product decision pending.

## 2026-09-19: repair-1 handback and instruction boundary

Read complete 1b-2b-1-repair-1 Worker report/Handoff (executed September 15) against
lead-14. Snapshot manifest 6daecc8b8e8258c57335440863535ea2a3681817bc62741e158d320001a4fe39
remains on fed8ed1. Recheck: application files, 39 local evidence and 22 contract
inputs match. Three drift rows are ledger (twice) and docs/local-setup.md; new
external AI-client repair record explains the separately authorized September 16
configuration repair and eight-line setup addition. Preserve that work. No product
implementation drift from this repair was found. Worker verification claims remain
historical, not rebound to today's environment or instruction identities.

Reread changed setup guidance. Created immutable inventory 4.1.0-local-2 capturing
22 current installed/context/source identities, with README successor pointer.
Local-1, earlier reports/inventories and instruction bodies remain preserved; roles,
contract, review safeguards and storage policy unchanged. Worker September 15 work
retains local-1; September 19 coordination/follow-up uses local-2. No live AI call
or acceptance of unrelated configuration work is part of this review.

Fresh non-author /root/review_1b2b1_repair1, no inherited conversation, assigned
review-only of actual snapshot/design and R1 closure, own report/evidence only.
Application writes frozen. Status reconciled; composition WS-16 remains unresolved
until independent follow-up and disposition. No successor/repair auto-dispatch.

## 2026-09-19: accept composition repair-1 and 1B.2b.1

Read complete fresh /root/review_1b2b1_repair1 report, binding and recommendation.
Independent200 tests pass; unchanged reproduction commits valid control and rejects
both defects. Coherent numeric mutations and full supported-schema inventory close
R1 beyond shape-only checks. Worker505 Node/build/types/real bridge evidence and
retained Python/exact/parity remain applicable by covered input/dependency review.
Initial sandbox EPERM preserved, approved rerun passes. No new actionable finding.

Accept repair-1 and B2B1-1..5; close composition WS-16 with all prior recurrence links
and raw exact lead-12 closure preserved. Lead authored no application implementation.
Snapshot remains manifest6daecc8b.../patch52ae6d10... on fed8ed1; no commit or release.
Worker actual instruction local-1 and current follow-up local-2 stay distinct.
Current media tool versions match; separate AI-pin environment edit is not a claim
of whole historical environment identity. Accepted limits: strict versioned producer
schema, configured same-build probe comparisons, static path ownership and decoded
audio proof in tests/bridge rather than per-save sample attestation.

Status and designated disposition updated. Broader task remains partial; production
adapters/migration require fresh planning using multiple dependency groups, final
served duration, immutable image/receipt and no-card/old-replay compatibility before
any manual successor handoff. No successor authorized automatically by acceptance.
Setup-documentation proposals remain deferred; today's inventory only preserves
the already existing independently authorized AI-pin guidance and README boundary.

## 2026-09-19: lead-15 editor-context successor refresh and handoff

Isaac requested proceeding after 1B.2b.1 acceptance. Refreshed current revision
reader/state/draft APIs, TS/Python history and sidecars, server preview/download,
source/reframe/rerender/thumbnail/logo routes, local policy and accepted evidence.
41 non-document application/contract entries (overlapping categories) match accepted
repair-1; HEAD fed8ed1 unchanged. baseline-1b2b2.json binds relevant current inputs
including ignored configuration by hash only and instruction inventory local-2.
No new domain reference is applicable to this local-media read capability.

Bound 1B.2b.2 as an actual read-only editor-context HTTP API, the first production
reader for the revision model and an honest legacy recovery description. Existing
loadWords/loadRecipe/loadReframe collapse absence and corruption; requested legacy
segments and bounded words cannot prove effective rendered edits. A faithful
migration must discover these capabilities before deciding a write. No silent
ensureTracked/adoption on GET. This preserves functioning old mutation routes until
all mutating adapters can join the accepted save/invalidation protocol.

The technical sequencing does not alter product intent: old media and writing stay
usable, insufficient source/timing is explicit, and new exact/card-bearing revisions
have a canonical context. Known source/content/final domains, optional artifact
placements and snapshot identities remain distinct. Exact route chosen in spec;
internal service/type layout delegated. Actual metadata migration, mutating adapters,
writing persistence and visible UI remain provisional successor scope, not omitted
requirements or automatically authorized work. No new product decision required.

Lead-15 supplies B2B2-1..5 and bounded write area/verification. Worker owns application
implementation on Isaac's manual relay; no application edits or dispatch by lead.
Fresh independent review, local-only policy, source preservation, no-agent rule and
existing repair/reassessment safeguards remain. No commit, push or release.

## 2026-09-20: editor-context handback and fresh review

Read the complete 1b-2b-2 Worker report/Handoff against lead-15. Current HEAD fed8ed1;
manifest6f8a714072fcae7d30e91d67e8594f08dfc31ad746952db83bddb9bbf8c69875,
patch1d8efe77c3fe69d47c5b81fb4c28b985fc8cd9ab38d4369147f4f8585ecbf2e0.
Correct invocation of snapshot-capture.mjs with explicit repository argument and
--check reports No drift. Lead first omitted the root argument; the script treated
--check as cwd and its first read-only git call failed ENOENT. No capture/mutation
occurred and the corrected call succeeded; this was not a product failure.

Worker reports70 focused/575 full Node, build/types and actual HTTP restart proof.
Implementation writes stopped. Fresh review-only /root/review_1b2b2 assigned with
no inherited conversation, own report/evidence only; application/criteria frozen.
Status updated to implemented/review pending. Local-2 remains actual instructions.
No Worker dispatch, successor or acceptance yet. Retained evidence citations and
coverage will be assessed, including the saved-revision row's older log reference
and the distinction between starting a server and exercising preview/export parity.

## 2026-09-20: lead-16 reader findings and repair-1

Fresh /root/review_1b2b2 recommends changes. Independent70 focused tests pass; copied
real revision fixtures reproduce ancestor junction escape, exact null-path fallback,
malformed nested authoritative fields/serialization and invalid legacy word filtering.
Lead read complete report/reproduction and affected code; uphold R1-R3. No application
writes by lead. Reviewer disclosed early reading of Worker summary; independent
non-author reproduction supports the findings without claiming perfectly blind order.

WS-12/16 reopened only for new reader occurrences, prior writer/composer closures
preserved. WS-17 records malformed recovery classification. Reassessed repeated
classes immediately: duplicated ownership checking begins too low, and broad casts
validate outer shape rather than consumed fields. Lead-16 requires full configured
ownership chain and consumed-field/capability validation inventory, stable failures,
old-document compatibility controls and whole-list legacy-word classification. No
new-save validator retroactively imposed on old documents, no path-swap guarantee,
no source mutation, policy change or new product decision.

Retained evidence correction is in the review disposition: accepted composition
repair-1 bridge supersedes the pre-repair log cited in the Worker row for retained
save coverage. Starting Studio does not implicitly run parity; existing parity is
retained on unchanged-flow dependency grounds. Preserve author report, no fabricated
historical execution or redundant full-suite requirement solely for citation repair.

Repair-1 manual relay is next. Reader/types/necessary route mapping/tests/HTTP check
only; no save/renderer/legacy-writer/UI/Cleanup/dependency changes. Fresh required
checks and unchanged reproduction plus corrected demonstration; independent follow-up
before acceptance. Existing retry/reassessment limits remain, no automatic dispatch.

## 2026-09-21: reader repair-1 handback and follow-up

Read repair-1 Worker report/Handoff against lead-16. Rechecked submitted manifest
ca104bfb968514288e720a2ee2ae759c3e27594533f392e2de5aeba223bd284d using the script
with explicit repository argument: No drift. Base fed8ed1 unchanged. Application
writes stopped; no acceptance yet. Fresh non-author /root/review_1b2b2_repair1
assigned without inherited history; its own report/evidence only, no repairs or
delegation. Requirements/application frozen; only Status/log bookkeeping by lead.

Explicit evidence limitation: Worker temporarily moved and restored original review
fixture-HO9pKq. Seven reviewer files have verified hashes, but original fixture
contents have no before-hash baseline. A same-volume rename is the Worker's account,
not independent byte-integrity proof. Follow-up must use fresh isolated fixtures and
must not mutate original reviewer evidence. No speculative historical hash claim.
The report's pre-edit reproduction row says final snapshot despite running before
edits; preserve report and clarify actual binding in review/disposition. Initial
control rejection is a recorded failed implementation attempt, not an independently
returned second repair round; all failures remain subject to circuit-breaker policy.
Narrowed invariants must be judged against supported protocol, not test convenience.

No pending product decision. R1-R3 / reader WS-12/16/17 remain open pending review.

## 2026-09-21: reader repair-1 disposition and lead-17 repair-2

Fresh /root/review_1b2b2_repair1 independently runs105 passing tests but confirms
remaining root-before-history-read, numeric-range, playback identity and committed
pointer failures using new isolated fixtures. R3 complete legacy-word classification
is verified; close WS-17 only. WS-12/16 read occurrences remain open, accepted writer
closures intact. Lead read complete report and actual writer transitions; no code edits.

Reassessed coverage now: the repair protected sidecars after an unprotected history
read, finite checks did not establish ranges, and a fixture-cleared pointer was
mistaken for protocol support. Lead-17 requires read-order and claim/invariant tables,
full configured-root checks before consumption, stable OWNERSHIP_ESCAPE for linked
legacy sidecars, valid timing ranges/relationships and document/pointer file identity.
Entry-summary drift retains context but disables committed play/download and clears
media.serves. Positive revision counter cannot have null current; initial zero/no-output
remains valid. No new cryptographic, migration or concurrent-swap guarantee.

Before-reproduction binding clarified in disposition: pre-edit sources, not final
snapshot. Original moved fixture lacks historical hash proof; fresh review fixtures
support current findings without erasing that limitation. Future reruns use separate
identified scripts/fixtures only, no original artifact moves or overwrite/restore.

Manual repair-2 is next, independent follow-up afterward. A second unsuccessful
repair on the same issue requires explicit reassessment before any third relay.
No application writes, automatic dispatch, successor, commit or release by lead.

## 2026-09-21: reader repair-2 handback and fresh follow-up

Read repair-2 report/Handoff, separately bound pre-edit/final evidence, delegated
choices and failed-attempt disclosures. Rechecked final snapshot with explicit-root
--check: No drift. HEAD fed8ed1 unchanged; five untracked application files carry
the repair, so unchanged tracked patch alone is not the repair identity. Manifest
01e88e25... and27 untracked copies identify final work;69189dfe... identifies pre-edit.
Worker reports135 focused/640 Node/build/types/HTTP pass, original evidence hashes
preserved. No application edits by lead. Prior historical fixture limitation remains.

Fresh non-author /root/review_1b2b2_repair2 assigned no inherited history, review-only
own report/evidence, no repairs/delegation. Criteria/app frozen; Status updated.
R3/WS17 remains closed; R1/R2 await assessment. Second unsuccessful follow-up on the
same issue requires explicit reassessment before any third relay. No automatic loop,
successor work, commit or release. Inventory local-2 remains applicable.

## 2026-09-21: repair-2 partial closure and mandatory reassessment

Fresh /root/review_1b2b2_repair2 independently passes135 tests but reproduces remaining
R2a/R2b on new fixtures. Lead read complete report: missing/empty entry output leaves
unreachable URLs advertised; mutually contradictory card/raw/final/bookend/artifact
records still become authoritative claims. Close R1/WS12 and R2c as independently
verified; retain R3/WS17 closure and prior writer closures. WS16 remains open.

This is the second unsuccessful R2 follow-up. No third repair prompt or automatic
implementation. Reassessment: field/scalar inventories have not represented the
cross-record relationships that make a response claim true. Next lead design must
map claims to writer/serving semantics and compatible historical profiles, then use
valid real-writer and coherent cross-field counterexamples. Consider pure shared
contracts rather than duplicated partial validators; no mutation-service import or
broad refactor is authorized by this checkpoint. Scope/verification must be refreshed
before a new manual relay. Existing constraints and independent closure remain.

Worker before/final snapshot identities are adequate; current independent fixtures
preserve original evidence. Earlier moved fixture still has no historical content
proof. No application writes, commits, push, release, acceptance or successor work.

## 2026-09-21: lead-18 reader relationship-contract reassessment

Isaac requested proceeding after repair-2's unsuccessful R2 follow-up. Lead traced
the response, actual by-ID serving gate, writer raw-bookend validation and final
composition construction/probe checks. Field inventories and additional scalar
examples failed to capture the relationships underlying authoritative response
claims. The new direction validates one aggregate before projection, separates
revision identity from served-URL availability, and defines old/current read profiles
without changing accepted producers or using current-save admission for old data.

Considered extraction of shared writer validation, but rejected it for this bounded
repair: it would change accepted write paths and couple historical reads to stricter
new-save admission. A pure reader contract boundary is authorized instead, with
producer-backed controls and cross-record contradiction tests. Unknown unconsumed
fields remain outside strict admission. Required exact-v1 precision cannot disappear
merely because an object is described as old. No media attestation is added.

Refreshed baseline audit compares 47 unique non-document application/configuration/
contract entries against repair-2, zero drift; HEAD and manifest hash match. Four
genuine prior current/previous documents retain tolerance and lack final composition.
Read-only evidence: `_local/project/evidence/writing-studio/1b-2b-2-reassessment/`
`lead-baseline-check.json` and `historical-profiles.json`. This sample is not an
exhaustive historical survey. No tests rerun for coordination-only changes.

Lead-18 updates the single B2B2 acceptance map, current baseline and prospective
repair-3 scope. Fresh review-only agent `/root/review_reader_reassessment` receives
the candidate and current implementation without inherited conversation; its own
report is `reports/1b-2b-2-reassessment-review.md`. Application remains frozen.
This is design scrutiny, not application acceptance. One subsequent manual relay,
then fresh independent implementation follow-up; no automatic fourth attempt or
reset of existing recurrence history. Workflow 4.1.0/local-2, settled product choices,
storage, disabled verification delegation and no-agent Worker restriction retained.

Fresh design review completed with no blocking finding, independently confirming
47 matching input hashes and four historical records. Lead read and accepted its
recommendation for one manual repair-3 relay; application acceptance remains
changes-requested. The reviewed design does not claim packet-level evidence from
stored summaries or conflate artifact-local domains with served-file placement.
Status assigns implementation to Worker upon Isaac's relay, and WS-16 links the
design review without closing the finding. Final post-review spec edits reconcile
Status/disposition only; the reviewed technical contract is unchanged. Fresh
independent implementation follow-up remains necessary. No application writes,
commit, push, release or automatic dispatch occurred.

## 2026-09-21: reader repair-3 handback and fresh independent follow-up

Worker report `reports/1b-2b-2-repair-3-worker.md` hands off implementation on
manifest `6b7807c1411dbf1005309d7c2dde3add7530b5a48d0f0c116bfeb86536018c84`, HEAD
fed8ed13dcb2aade06bee341953d6b10d58bff13. Before evidence separately binds manifest
e6beabcc3bbbf9bab06a994114fde26a9ae8373f2dff1ed6c43e4343e48f966a.
Lead read full report/Handoff and independently matched 73 unique recorded file
inputs before bookkeeping, zero drift. Pre-edit/final comparison confirms exactly
seven changed/new application/test paths within lead-18's scope. Audit evidence:
`_local/project/evidence/writing-studio/1b-2b-2-repair-3/lead/`.

Submitted 186 focused/691 full Node, two builds, types and 20-group actual HTTP
check pass; these are Worker results pending independent assessment. Same tracked
patch on before/after is expected because the seven files are untracked and their
copies/hashes capture changes. Prior evidence and retained Python/media citations
remain preserved, not re-executed or freshly certified by this reconciliation.

Fresh /root/review_reader_repair3 assigned review-only without inherited history;
own report `reports/1b-2b-2-repair-3-review.md` and isolated evidence only. Review
includes actual read/producer/serving relations, supported historical profiles and
Worker counterevidence concerning the earlier applied-card-without-composition
control and 221 old test-run documents. Disclosure alone grants no compatibility
exception or acceptance. Application frozen; Status reconciled to pending review.
WS-16 R2a/R2b remain open, prior WS-12/17/R2c closures retained. No automatic fourth
repair, recurrence reset, implementation dispatch, successor, commit or release.

## 2026-09-21: repair-3 disposition, remaining aggregate relationships

Fresh /root/review_reader_repair3 passed186 focused tests but reproduced inconsistent
editorial words/text versus source words, old raw/probe duration1.021 versus999,
and a published bookend measurement999 beside raw duration3.135. Empty retained
source words correctly disable widening; the transcript inconsistency, not widening,
is the finding. A real nominal.mp4 symlink to actual.avi also yields true media
capabilities while the unchanged serving route's resolved-file predicate rejects
it. That check used the actual predicate directly, not a new HTTP server.

Lead read full review/evidence and relevant code and requests changes. B2B2-1/3
fail; slice remains unaccepted. Prior examples repaired, WS-12/17/R2c and prior
writer closures remain. WS-16 links this follow-up. No automatic fourth repair:
lead must audit coverage of each returned claim against producer and route predicates
before further direction; moving checks into an aggregate did not alone make the
45-row table complete. No application writes or new implementation owner.

Historical counterevidence independently supports refusal of the applied-card with
composition deleted: no accepted writer produces it. All221 alternate-domain
artifacts reference fake-render headers; only34 directly reside under step-4-tests,
the remainder are fixture copies. Preserve Worker and earlier review assessments
with this attributed clarification; all719 canonical-map records are not necessarily
genuine untouched saves. No supported historical compatibility regression established.
The unpromoted huge-container and missing-media identity observations add no new
requirement. Scope/provenance limits and no attestation guarantee remain.

Status, ledger and designated review disposition reconciled. No acceptance, fourth
relay, successor, commit, push or release. Application snapshot unchanged.

## 2026-09-21: lead-19, executable contract proof before further repair

Isaac requested proceeding with the lead audit. Lead traced the actual projections
to accepted producer/admission and serving code. Missing edges: full versus selected
source words, editorial mapping/text normalization; historical raw/probe relationship;
copied bookend records and stage measurements; realpath/stat/resolved-extension
versus recorded filename. Other projections include recorded requests and diagnostic
facts that must not be misclassified as guarantees of effective output. This is the
reason to audit per-claim dependencies rather than add blanket whole-object equality.

Rechecked51 unique application/configuration inputs against repair-3, zero drift,
HEAD unchanged; evidence `1b-2b-2-contract-proof/lead-baseline.json` under the normal
task evidence root. Lead-19 preserves application freeze and all previous acceptance
states, supplies a concrete expectation-source table and modifies the single check
map to include executable conformance coverage. No new product decision/reference,
historical migration, attestation or concurrency guarantee.

Changed work sequencing: one manually relayed verification-only Worker assignment,
new isolated check script/support plus own report/evidence, no edits to existing
application/tests/scripts. The runner asserts intended outcomes and must fail for
unresolved product defects; it cannot turn known failures into passing expectations.
Positive controls and the independent producer make the oracle reviewable. Existing
coverage is reused by named case. New script is outside default test discovery;
there is no new package/harness change or requirement to make the frozen product green.

Fresh independent review of expectations, historical profiles and coverage precedes
any later application repair direction. This is not a fourth repair, no retry-budget
reset, and no automatic tests-to-fixes handoff. Report is
`reports/1b-2b-2-contract-proof-worker.md`, lead-19/workflow4.1.0/local-2. Status and
ledger reflect the new bounded artifact ownership upon Isaac's manual relay. No
application writes, agent dispatch, commits, push, release or successor work.

## 2026-09-22: lead-19 verification-artifact handback and independent review

Worker hands back two new verification files, own report and evidence against the
unchanged repair-3 application. Bound run4 reports35 pass/14 fail/0 harness errors,
exit1. These are application failures, not green verification or another attempted
application repair. Submitted projection ledgers compare253 tracked/230 legacy
response leaves and disclose eight limits/gaps; completeness requires review of
the expectations and state coverage, not merely those counts.

Lead independently rehashed all24 artifact-manifest entries (two new project files,
21 evidence files and report), zero drift; manifest identity
def5cf0a460ee5c1789ebe9b5de1394db221dc5a395d7a7559e01b463d2ec4c8.
All51 unique frozen non-document inputs match the lead-19 baseline. HEAD remains
fed8ed13dcb2aade06bee341953d6b10d58bff13; no rebuild or application write by lead.
Evidence: `1b-2b-2-contract-proof/lead/handback-audit.json` under the task evidence root.

Read full Worker report/Handoff and submitted logs/binding. Assigned fresh
/root/review_contract_proof without inherited history, review-only own report and
isolated evidence. Review covers producer-derived oracles, historical records,
actual HTTP route expectations, failure classifications and gaps (including whether
the >20000-word control really requires a full render). Artifact/application writes
remain stopped, no fourth repair or successor. Status records pending review;
existing application changes-requested and WS-16 findings remain unchanged.

## 2026-09-22: contract-proof disposition and lead-20 artifact correction

Fresh review supports the14 reported product failures and their external oracles,
but CP-1 shows parent coverage markers credit unasserted capability reasons and
future descendants; tracked coverage gaps do not affect exit. CP-2 shows retained
optional-artifact tests are unmatched/dangling negatives, not valid present-state
controls. Lead inspected the accounting and renderer publication paths, requests
artifact changes and records WS-18 separately from product WS-16. No application
fix or acceptance occurs. Two small verification-artifact writes remain the base;
new lead-20 direction bounds their correction and new support/evidence only.

Supplemental reviewer check supplies a passing20,001-word producer-derived control
without rendering:20,000 prefix words, true count, full text and diagnostic. It also
confirms both last-stage bookend copies can claim999 beside raw duration3.929.
Preserve the original Worker report and correct its large-fixture premise through
the review/disposition. The253/230 figures are not evidence of complete semantic
comparison. Reused legacy/junction/draft and bounded crossfade coverage remain
acceptable, while no-attestation and selected-response scope remain explicit limits.

Lead-20 requires exact actually-executed assertion accounting, fatal required gaps,
verifier self-checks, valid present caption/crop artifacts and isolated relationship
negatives, plus reused/adapted supplemental evidence in a new owned output root.
It does not demand fixed counts or hide newly exposed application defects. Original
snapshots/evidence remain immutable. The application is still bound to repair-3;
verification artifacts receive separate pre/final identities. No product decision
or reference selection change. Manual artifact-only relay then fresh independent
follow-up; artifact round one does not reset the application repair history.

Status, WS-18 and review disposition updated. WS-16 remains open with this proof
and paired-stage occurrence linked. No fourth application repair, automatic agent
dispatch, successor, commit, push or release. All implementation stays with Worker.

## 2026-09-22: contract-proof artifact repair-1 handback

Worker hands back one changed runner (dd04e3587010d65f98d2a105cd02ac3469de539fc9f13cb0e457ed3efd0258dd),
unchanged Python oracle and new evidence. Artifact manifest
7f7febd81ac7fa7b72de9f8919eb91c6f1eb7c88423cb9b664018e7f889166a6 binds run3;
lead matched all23 manifest entries and51 frozen application inputs, zero drift.
HEAD remains fed8ed1. Lead audit is in this cycle's `lead/handback-audit.json`.

Full report/Handoff read. Submitted run3 reports42 application passes/16 failures,
verifier checks passing and complete declared coverage; these conclusions await
fresh independent assessment. Run2 was stopped after an edit during execution and
is explicitly unusable as a final result; its log is retained. No lead rebuild or
application write. Worker reports CP-1/2 corrected and supplemental tests integrated.

Fresh /root/review_contract_proof_repair1, no inherited history, reviews only its
own report/evidence and may run bounded checks on new fixtures. Assignment includes
whether A-X5's live-size expectation is supported by the recorded optional-artifact
contract; report disclosure is not approval of a new requirement. Status records
handback/freeze/pending review. No automatic application repair or successor.

## 2026-09-22: lead-21 independent artifact follow-up disposition

Fresh review `reports/1b-2b-2-contract-proof-repair-1-review.md` independently
verified CP-1/WS-18 and CP-2; lead closes both on runner dd04e358... and the
repair-1 artifact snapshot. Lead audit matched23 snapshot entries and51 frozen
application inputs; reviewer matched15 source/build/artifact identities and ran
five verifier self-checks. The stopped run2 remains excluded; historical run3 is
unchanged at42 pass/16 fail/zero harness errors.

The supported interpretation is15 application failures plus one unsupported
A-X5 oracle expectation. The documented optional-artifact subtree projects saved
metadata, whereas media.output describes current file status. CPR-1/WS-19 therefore
requires a test correction, not an application fix or new live-byte guarantee.
The reviewer's counterevidence resolves that question without a product decision.
WS-16 remains open, including paired-stage B-X6/CP-3; no slice is accepted.

Lead-21 authorizes manual artifact correction round2 only: convert A-X5 to a
successful recorded-byte projection control, preserve A-C1 and A-X1..4, retain all
supported failures and accounting checks, and produce a new bound run/report.
Only the runner and new Worker evidence/report are writable. Earlier reports,
results and inventories remain preserved; no application implementation, build,
agent dispatch, commit or release is authorized. Fresh independent follow-up and
lead disposition remain required. Application history and recurrence budget are
not reset. No active implementation writer until Isaac relays the prompt.

## 2026-09-22: lead-21 artifact repair-2 handback reconciliation

Worker report `reports/1b-2b-2-contract-proof-repair-2-worker.md` handed back;
runner4ee3ae7d... and unchanged oracle0a03ba7a... are separately bound to frozen
repair-3 application. Lead checked51 unique non-document application inputs with
zero drift and21/22 artifact/evidence entries matching. The one exception is the
capture log: its recorded644-byte prefix hashes exactly; the final capture appended
322 diagnostic bytes afterwards. Original manifest/log preserved. This limited
self-capture defect does not represent changed runner or conformance evidence.
Audits: cycle `lead/handback-audit.json` and `lead/capture-log-reconciliation.json`;
the latter binds the Worker report fdfdb7c4... separately.

Submitted result43 application passes/15 failures, zero harness errors, eight
verifier rows pass and complete selected coverage remains pending independent
follow-up. Fresh review-only agent /root/review_contract_proof_repair2 assigned
one bounded inspection of CPR-1, preservation, evidence and closure recommendation;
no implementation or delegation authority. All application/artifact writes remain
stopped. Optional live-artifact size is not a pending requirement or approval gate;
the existing recorded-metadata contract remains in force.

## 2026-09-22: lead-21 artifact correction accepted

Fresh independent review `reports/1b-2b-2-contract-proof-repair-2-review.md`
verified the A-X5 correction, retained cases, five verifier self-checks and15
source/build/artifact hashes. Lead accepts runner4ee3ae7d... as the conformance
artifact and closes CPR-1/WS-19. Prior CP-1/WS-18 and CP-2 closures remain.
Application result43 pass/15 fail/zero harness errors remains failed; no B2B2
slice acceptance, implementation dispatch or release follows.

The21/22 matching artifact/evidence entries and exactly matching644-byte capture-log
prefix establish the remaining322 bytes as the snapshot command's own appended
diagnostic. This nonblocking evidence qualification is preserved, not hidden by a
zero-drift claim. Future capture excludes actively written capture logs or finalizes
them before a separate capture. Original reports/manifests/results remain unchanged.

Application and artifact writes remain stopped. Lead owns next bounded repair
scoping against the now-accepted producer-derived conformance evidence; the
application recurrence history and independent-review requirement remain in force.
Optional live artifact sizes are not a pending requirement or product gate.

## 2026-09-22: lead-22 producer-derived application repair reassessment

Isaac requested proceeding after artifact acceptance. Lead inspected current pure
aggregate validation and filesystem projection, accepted writer transcript/probe
admission and Python transcript/bookend producers, and actual by-ID serving routes.
51 unique non-document application inputs and accepted runner4ee3ae7d... still match;
audit `1b-2b-2-repair-4-plan/baseline.json` under the task evidence root. No selected
reference change is needed for this local reader-only repair.

Lead-22 scopes transcript derivation, historical raw-media stored consistency,
producer-defined duplicate/transition/terminal bookend relationships and resolved
serving eligibility. Accepted independent oracle stays frozen. Retrospective new-save
requirements, live optional-artifact byte attestation and owned-link bypass are
excluded. This is repair4 after explicit independent conformance reassessment, not
a fourth identical field-check attempt or a reset of the earlier repair budget.
One bounded Worker relay, fresh verification and independent application review;
any remaining same-class failure returns to lead reassessment before another relay.

Fresh review-only /root/review_reader_repair4_plan is assigned the bounded design
review before manual relay. No application implementation owner active; lead edits
only coordination records. Worker internal choices remain delegated within the
specified boundaries. No commit, release, agents for Worker, successor work or user
media changes are authorized.

## 2026-09-22: lead-22 design accepted for manual relay

Fresh review `reports/1b-2b-2-repair-4-plan-review.md` finds no blocking design
issue and independently matches51 baseline inputs. Lead accepts the bounded
direction for Isaac's manual Worker relay. Final reviewed refinements name the
terminal join as outro else intro, preserve optional absent/null historical
measurements and existing join allowance, and reuse the accepted pre-edit failing
run only with matching source/build/verifier hashes. Final rebuilt conformance,
Node/types and isolated HTTP proof plus fresh application review remain required.

This accepts the plan only; all15 application failures and WS-16 remain open.
No application writes, Worker dispatch, commit or release were performed by the
lead. Current authorization needs no repeated approval. Worker ownership starts
on manual relay and stops at handback. A failed same-class follow-up returns to
lead reassessment rather than an automatic further repair.

## 2026-09-22: lead-22 application repair-4 handback

Worker report `reports/1b-2b-2-repair-4-worker.md` submitted with58 passing
application cases, eight verifier rows and complete selected coverage,228 focused
and733 full Node tests, build/types and isolated HTTP proof passing. Accepted
runner/oracle unchanged; all15 prior failures reportedly flip and51 other case
statuses remain. Lead audit matches98 unique manifest entries with zero drift,
manifest af85e7ce1548469bc50566be177dc03bb46368a9444466759a7e595fc298f968;
evidence `1b-2b-2-repair-4/lead/handback-audit.json` under task evidence root.

Fresh review-only /root/review_reader_repair4 assigned application correctness,
producer contracts, four existing fixture corrections and historical compatibility.
No acceptance follows the passing Worker receipt. Implementation ownership is
inactive after handback. A stale model comment is held for bounded lead correction
after review, preserving the bound snapshot during inspection.

Worker's plan.md was written after edits; this is not represented as a pre-edit
Worker plan. The accepted lead-22 design/check set and pre-edit freshness capture
preceded implementation, and final checks follow that set. Preservation of the old
repair-3 Worker report lacks a historical content hash; its mtime and no-write
statement are supporting claims, not cryptographic proof. Review must retain this
limitation. The frozen runner's hard-coded lead-21 metadata describes its artifact
provenance; this execution is bound to lead-22 by the Worker receipt and source/build
hashes. No prior report or evidence is rewritten to conceal these distinctions.

## 2026-09-22: repair-4 accepted; slice1B.2b.2 complete

Fresh independent application review `reports/1b-2b-2-repair-4-review.md`
recommends acceptance, independently passes228 focused tests and corroborates all
four producer-derived relationships, corrected fixtures, historical compatibility
and ownership boundaries. Lead accepts B2B2-1..5 and closes reader WS-16 on
manifest af85e7ce... plus the separately recorded comment delta. All15 prior
conformance failures become passes;58 application cases/eight verifier rows pass,
selected coverage complete. Full Node733, build/types and isolated HTTP evidence
remain bound. Legacy WS-03/04/05/06/09 are unaffected.

Lead corrected only the stale model comment after handback, preserving before
bytes under cycle/lead and recording before29576397.../after05dfb65c.... Fresh
reviewer independently verified identical non-documentation text and accurate
wording. No executable change or rebuild was needed for this correction.

Post-edit Worker plan timing, absent historical repair-3 report hash and frozen
verifier lead-21 label retain their qualified interpretation from the review; no
historical proof is fabricated and no original report/snapshot is rewritten.
Acceptance covers the read-only endpoint, not adoption, write routes, UI, migration,
Cleanup or release. Writes stopped; next integration planning belongs to the lead,
with fresh baseline assessment and manual Worker relay. No successor was dispatched,
committed, pushed or released.

## 2026-09-22: workflow 5.0.0 migration boundary (maintenance)

Author: Claude Code maintenance session (Opus 5.5) under Isaac's explicit
workflow-maintenance assignment; not the Writing Studio task-state owner. Scope is
the instruction migration plus needed task metadata only: no application, criterion,
evidence, report or acceptance change, and no dispatch, commit, push or release.

- Instructions: installed 4.1.0, byte-verified against inventory 4.1.0-local-2 before
  replacement, became 5.0.0 with inventory 5.0.0-local-1. Replaced, edited and retired
  files, including this spec and log, are backed up byte-for-byte at
  `_local/generate-init-backup/20260922-5.0.0/`.
- This spec stays lead-22: requirements and the acceptance map are unchanged. Status
  changes: v5 owner labels naming the same Codex owner, explicit report pointers, the
  maintenance gate in Next action, the inventory boundary and an attribution note.
  `Workflow and handoff` gained an appended 5.0.0 boundary paragraph; earlier text is
  untouched.
- Historical bindings stay: 1B.2b.2 reports and reviews remain on 4.1.0-local-2 and
  earlier work on its recorded revisions. No report header, lifecycle, ledger row or
  evidence was edited, and no metadata was backfilled.
- Gate: Writing Studio planning resumes only after the fresh independent maintenance
  review and its disposition in `docs/project/tasks/workflow-maintenance/spec.md`.
  Before/after manifests and checks: `_local/generate-init-refresh/20260922/`.

## 2026-09-22: lead-23 tracked-clip write-fence plan (1B.2b.3)

Author: Claude Code desktop session (claude-opus-5-5), assigned by Isaac on 2026-09-22
as Writing Studio task-state owner to plan only, after the workflow 5.0.0 maintenance
disposition accepted the migration. It loaded only 5.0.0-local-1 (doctor: identities
and effective configuration match) and never 4.1.0. Ownership: the Codex coordinating
session's last task-state write is the lead-22 acceptance entry above; the maintenance
session's later edits were bookkeeping; no implementation writer is active. No
application file, report, evidence or ledger row changed; nothing was dispatched,
committed or pushed.

Freshness: HEAD fed8ed1. All 98 unique repair-4 manifest paths are explained (85
match; comment delta 1; 5.0.0 migration 7 edited and 2 retired; bookkeeping 3).
Lead-22 plan rows differ only by the five accepted repair-4 writes and the comment
delta. Against the maintenance final capture (591 files) only its two disposition
records changed and its review report was added. Audit, doctor and brief output and
byte copies of this log and the spec before editing:
`_local/project/evidence/writing-studio/1b-2b-3-plan/`. Planning manifest:
`baseline-1b2b3.json`. The superseded lead-22 Status facts (1B.2b.2 results,
4.1.0-local-2 binding, maintenance note) remain in the entries above and in the spec's
`Workflow and handoff`.

Current code: no production path tracks clips or imports the save service; legacy
logo, thumbnail-bake and rerender routes write `output_path` media in place; `clips
edit`, rerender and logo summaries change fields `applyLegacySummary` owns; legacy
deletion unlinks `output_path`; `logo_backup_path` and legacy `thumbnail_config`
preview fields survive a revision commit. Any of these reaching a tracked clip would
rewrite immutable revision media or drift its summary. The real Library was not read.

Decisions, within delegated authority and without product change:
- The next slice is a write fence that refuses rather than routes. Routing legacy
  actions through the protocol needs recipe derivation, version-zero handling and
  operation identity for legacy callers, which belong to 1B.2b.4. Refusal cannot reach
  a clip created through the app, because no production code path tracks one.
- Deleting a tracked clip stays refused until 1B.2b.5 defines revision-aware deletion.
- The field fence is anchored on the accepted commit projection plus identity and
  legacy media bookkeeping; metadata-only writers keep working.
- The path fence covers the configured owned trees for the same operations and the
  path-based CLI commands; revision files under a previously configured export root
  rely on the entry fence.
- Accepted residual: a legacy media operation already past its early check when a clip
  becomes tracked can change the legacy files it captured. It cannot occur before
  production adoption; 1B.2b.5 must close or re-decide it.
- Provisional partition: 1B.2b.4 revision-backed legacy adapters (including stale
  `logo_backup_path`, `thumbnail_config.preview_path` and logo previews for tracked
  clips), 1B.2b.5 adoption and save API with revision-aware deletion and editor
  capability updates, then 1B.3 visible save and handoff.
- Reference: `local-app.md` applies and is carried as filesystem and link boundaries,
  no write on refusal, compatible older entries, path-free diagnostics, real binaries
  in controls and an identified runtime. Installer, update, offline, capacity and
  release checks do not apply: no launcher, network, storage-format or distribution
  change. README selection unchanged.
- Lane recorded substantial. No focused fresh plan assessment is required before relay:
  the change is reversible, migrates no data, and its design and implementation get a
  fresh non-author review. Isaac may still request one.
- Records: Status now uses the 5.0.0 field list, with all three report pointers reset
  (C-9) and single-line routing bullets (C-2). Headings keep their pre-5.0.0 names
  (C-1) because reports cite them; the spec head says where acceptance and scope live.
  The behavioral-slices bullet, baseline, exceptions and workflow notes were refreshed.

No Isaac decision is required. Next: Isaac relays the bounded assignment to a separate
implementation session in this checkout.

## 2026-09-23: lead-24 1B.2b.3 handback disposition and correction-1

Author: the Writing Studio task-state session (Claude Code desktop, claude-opus-5-5),
acting on the implementation session's handback relayed at Isaac's request, under
5.0.0-local-1. Coordination and requirements only: no application, test, report or
evidence file of the implementation writer was changed, and nothing was dispatched,
committed or pushed.

Handback reconciliation: HEAD fed8ed1; all 149 unique paths of snapshot `b88984be...`
match the tree, and git status differs only by the two reports the snapshot excludes.
The report handoff, receipt and self-audit agree with that state: B2B3-1..4 pass; full
Node fails 2 of 772 in `src/services/clip-revisions.test.ts` at fixture steps that call
fenced legacy writers; the self-audit is BLOCKED on that alone (F-1), with F-2 low.
Audit and pre-edit byte copies of this spec and log:
`_local/project/evidence/writing-studio/1b-2b-3/lead/`.

Decisions, within delegated authority and without product change:
- DR-1 approved exactly as proposed. The byte diff is two hunks with no assertion
  changed. The first test asserts that the late commit is superseded and a recreated
  clip untouched; none of its assertions read the files legacy `remove` unlinked. The
  second reaches the save with identical entry state. A test broken by the intended
  fence is in scope; "sources" in B2B3-5 means non-test modules. Retained evidence for
  that file now rests on the rerun.
- F-2 corrected, not deferred: the owned-tree wording is untrue for an unresolvable
  target, which fails lead-23's "plain, actionable" rule exactly when the user must
  act, and the local-app reference asks diagnostics to separate environment limits
  from defects. Same code, distinct message, optional path-free log reason. Fail-closed
  stays; the untracked exception it implies is now stated, and deletion of such entries
  is revisited in 1B.2b.5.
- `ClipsHistory.record` refuses a caller-supplied `revisions`, closing the self-audit's
  blind spot at negligible cost; no accepted verifier plants tracked state through it.
- Sequencing: correction-1 comes before the initial review, so one fresh review covers
  the final snapshot; this task's fresh follow-up after each relayed correction would
  otherwise add a second round.
- Nonblocking, for successors: hard links and junction swaps after the check stay
  outside the static path check (U-1; the accepted static-boundary limit, local actor
  only). A clip tracked between `record` and `persistClipRecipe` would refuse the
  recipe step; 1B.2b.5 plans it with the accepted residual.
- Ledger: the implementer's pre-handoff fix of the guard and handler re-read gap, and
  F-2, are indexed at the review disposition, Closed if the review confirms them, as
  WM-01 was.
- Records: spec lead-24 adds the correction-1 section, amends B2B3-2/4/5 and the
  exceptions note, and sets Status's implementation-report pointer to none until a
  lead-24 report exists (C-9). The lead-23 reports stay frozen.

Next: Isaac relays correction-1 to the implementation session; the task-state owner
then arranges the fresh non-author review.

## 2026-09-23: lead-25 1B.2b.3 review disposition and repair-1

Author: the Writing Studio task-state session (Claude Code desktop, claude-opus-5-5),
assigned by Isaac on 2026-09-23 to take over task-state ownership for 1B.2b.3 from the
"Writing-studio integration plan refresh" session (author of lead-23 and lead-24), which
makes no further writes. Coordination and disposition only, under 5.0.0-local-1: no
application, test, other author's report or evidence changed; nothing dispatched,
committed or pushed; no provider call.

Transfer reconciliation: HEAD fed8ed1. `spec.md` and this log hash-equal the lead-24
record (`lead/records-post-lead-24.sha256`), so the prior owner wrote nothing after
lead-24. The correction-1 handback (`reports/1b-2b-3-correction-1-implementation.md` and
its self-audit; snapshot `a7048a8b...`; implemented, receipts pass, self-audit PASS) and
the fresh review `reports/1b-2b-3-review.md` (lead-24, same snapshot, changes-requested
on R1) agree with the tree: the correction-1 helper's `--check` flags only the review
report. Lead-24 Status still showed correction-1 pending; lead-25 brings it current. The
implementation writer stopped at its correction-1 handback. Pre-edit copies, check log
and ledger script: `_local/project/evidence/writing-studio/1b-2b-3/lead/`
(`*.pre-lead-25.md`, `lead-25-snapshot-check.log`, `ledger-lead-25.py`).

Decisions, within delegated authority; requirements and acceptance rows unchanged:
- R1 supported (WS-22). Lead-23 refuses the whole request carrying `caption_style` or
  `thumbnail_config` and exempts only a title-only request; the fence elsewhere counts
  key presence (TS own keys, including undefined). An explicit null gets no exemption.
  The Studio `ClipDetail` save always sends `caption_style`, so its title save already
  refuses on a tracked clip; client handling stays with 1B.2b.5 and 1B.3.
- The lead-23 pre-handoff re-read fix is not closed (WS-20). The guard calls `next()`
  when it finds no entry and the five TS media handlers look the clip up again. The
  review's probe r1, not among its findings, planted a tracked entry between the reads:
  logo remove overwrote owned output before the 409. The accepted residual assumes a
  route acts on the entry its early check captured, outside the owned trees, so this is
  a recurrence of the same class and is repaired now.
- F-2 closed (WS-21), confirmed by the fresh review.
- Probe r2, also not among the findings (WS-23): rerender writes a title-derived file in
  the checked directory, and a link planted at that name reaches the owned tree.
  Nonblocking for 1B.2b.3: it needs a deliberately planted link; the hard-link form of
  the same write is the accepted U-1 limit; production writes nothing to the namespace
  before adoption; the fix is in `clip_generator.py`, excluded by lead-23 and would
  invalidate retained render evidence. 1B.2b.4 or 1B.2b.5 closes it before adoption,
  with the accepted residual.
- Commit-time scope unchanged: locked checks guard revision-owned fields. A
  null-carrying PATCH that races tracking after its guard can at most write the title,
  which lead-23 already allows on tracked clips.
- This task's fresh independent follow-up after each relayed correction (spec `Workflow
  and handoff`) applies to repair-1; it is also warranted because WS-20's recurrence
  was not a review finding. Round 1 of 2 on R1 and WS-20.

Repair-1, by manual relay; lead-23 and lead-24 limits apply unless stated:
- HTTP: on a tracked clip (any lead-23 fixture state, malformed included), a PATCH whose
  parsed body has an own `caption_style` or `thumbnail_config` key, whatever its value
  including null, answers 409 `CLIP_REVISION_TRACKED` with the existing message, runs no
  CLI and writes nothing, also when that key is the only one. Title-only PATCH still
  answers 200 and writes only the title. Untracked and DEMO keep the `fed8ed1` contract
  (`src/ui/web-server.ts` 2602-2612): null fields ignored, title applied; a null-only
  body answers 400 `nothing to update`.
- CLI: `clips edit` on a tracked clip with `--caption-style` or `--thumbnail-config`
  supplied, including `null` or an empty value, exits non-zero naming
  `CLIP_REVISION_TRACKED` and writes nothing, title included, also as the only option.
  `--title` alone still succeeds. Untracked keeps the `fed8ed1` contract
  (`backend/cli.py` 3353-3370).
- Guard miss: on thumbnail, thumbnail/select, thumbnail/render, logo (apply and remove)
  and rerender, when the guard found no entry the route answers its existing 404
  `clip not found` with no second lookup and no write, even if a matching tracked or
  namespace-pointing entry appears afterwards. DEMO and found-clip behavior unchanged.
- Out of scope: WS-23, `clip_generator.py`, client, messages, codes, policy, save
  service, reader, renderer, composer and Cleanup.
- Evidence: reproduce both failures on the unchanged build first; deterministic
  guard-miss route tests for all five routes; null-field HTTP and CLI rows in
  `check-revision-fence.mjs` final mode, untracked expectations from the `fed8ed1`
  source; focused Node and Python, full Node (exit 0), full Python, build, client types,
  `py_compile`, protected sources (DR-1 file still equal to the proposal) and a new
  `repair-1/` snapshot with a drift-free `--check`. Reports
  `reports/1b-2b-3-repair-1-implementation.md` and `-self-audit.md`, bound to lead-25.

Follow-up question, after handback (`reports/1b-2b-3-repair-1-review.md`): on the
repair-1 snapshot, do tracked-clip PATCH requests carrying either fenced key (any value)
and `clips edit` supplying either option refuse before any side effect while title-only
and untracked behavior keep the `fed8ed1` contract; do the five TS media routes act only
on a guard-checked entry; and does the delta leave the other B2B3-1..5 outcomes, F-2
wording and the `record()` refusal intact? Scope: the repair delta, callers it touches
and refreshed receipts. Complete when each part is answered supported or not, with
evidence and any findings in template form.

Records: spec lead-25 changes Status and frontmatter only; the ledger adds WS-20, WS-22
and WS-23 (Open) and WS-21 (Closed); the review report gains a separately attributed
disposition with its assessment unchanged. No Isaac decision is required.

Next: Isaac relays repair-1 to an implementation writer in this checkout.

## 2026-09-23: lead-25 repair-1 handback reconciliation

Author: the lead-25 task-state session (Claude Code desktop, claude-opus-5-5), on the
repair-1 handback Isaac relayed. Reconciliation only: spec revision stays lead-25
because requirements are unchanged and the repair-1 reports bind to it; Status and
frontmatter were refreshed. No application, test, report or evidence of another author
changed; nothing dispatched, committed or pushed; no provider call.

Handback: a fresh Codex implementation session (the assignment's permitted fallback,
not the author of lead-23 or correction-1) wrote
`reports/1b-2b-3-repair-1-implementation.md` and its self-audit (PASS), bound to lead-25
and snapshot `repair-1/snapshot/manifest.json` (sha256 `43ffa1eb...`).

Checked here: the manifest hash matches; the repair-1 helper's `--check` reports "No
drift."; the four lead-25 task-state records still match `lead/records-post-lead-25.sha256`;
no file under the earlier `review/`, `correction-1/`, `lead/`, `pre-change/`, `final/` or
`snapshot/` evidence changed after its own cycle. The receipts agree with their logs: full
Node 47 files and 795 tests passed; Python JUnit 1356 tests, 0 failures or errors, 6
skipped; `check-revision-fence.mjs` passed with controls matching the pre-change capture;
protected sources report only the DR-1 file changed. Both defects were reproduced first
(`repair-1/before/`). These are author-run results. This session did not rerun them.

Scope: six files, all within the expected writes (`clip-write-fence-route.ts`,
`web-server.ts`, `backend/cli.py`, their two test files and the check script); no
history-writer, client, `clip_generator.py` or protected-source change. Two in-scope
implementation choices are named for the follow-up review. First, the PATCH guard now
resolves the ID exactly, then by a unique prefix, as Python `_find_in` does; the writer
found that a unique-prefix PATCH also bypassed the fence with a null field, and treated
it as the same WS-22 defect. Second, `clips edit --caption-style` checks its choices after
parsing, so any value on a tracked clip reaches the refusal; invalid values on untracked
clips are reparsed with the original choices to keep argparse's error and exit 2. The
CLI refusal is an early check outside the history lock, which lead-25 allows because a
race can write only the title.

Record slip: the lead-25 Status report pointers were not machine-parseable (a
backticked task-relative path, and "none until ..." for the repair pointer), so
`brief.py` refused and the writer used the direct-read fallback. There was no
requirement effect. The pointers now use the exact values: the repair-1 implementation
report as the current implementation report, repair report `none`, snapshot `not
applicable`. `brief.py` accepts the Status. The ledger indexes it as WS-24 (Closed). The
post-lead-25 spec bytes are reproducible from the repair-1 tracked patch. Pre-edit copies
of this log and the ledger, and the ledger script, are in `lead/`.

Ledger: WS-20 and WS-22 are marked repaired on `43ffa1eb...` and stay Open until the
follow-up confirms them. WS-23 is unchanged. WS-24 is added as Closed.

Follow-up: the fresh non-author review `reports/1b-2b-3-repair-1-review.md` asks the
lead-25 question, including the two choices above. Eligible reviewers exclude the
lead-23/correction-1 implementation session, the repair-1 Codex session, the original
review session and this session. `review-packet.py` refuses Git tree inspection here
because leftover evidence fixtures contain links. The reviewer uses the manifest
`--check` and direct reads instead.

Next: Isaac relays the follow-up review; the task-state owner then dispositions it.

## 2026-09-23: task-state transfer for the repair-1 follow-up

Author: a new Claude Code desktop session (claude-opus-5-5), assigned by Isaac on
2026-09-23 to resume writing-studio 1B.2b.3 as task-state owner and to review and fix
repair-1 within the approved scope. Isaac states that every earlier session for this task
has ended and will not resume. This session inherits no planning, implementation or
review conversation and wrote none of lead-23, correction-1, repair-1 or the lead-25
records.

Transfer reconciliation: HEAD fed8ed1. `spec.md`, this log, the ledger and
`reports/1b-2b-3-review.md` hash-equal `lead/records-post-repair-1-reconciliation.sha256`,
so the lead-25 owner wrote nothing after its reconciliation. The repair-1 helper's check
(`snapshot-capture.mjs . --check`; the root argument is required) reports seven drift
lines, all from those three task-state records, and a per-file compare of `git diff HEAD
--binary` with the repair-1 tracked patch differs only in them. The code snapshot is
still `43ffa1eb...`. `reports/1b-2b-3-repair-1-review.md` did not exist. Pre-edit copies
and the check log: `repair-1-review/records/` and `repair-1-review/transfer-snapshot-check.log`.

Already current, so not repeated: the Status report pointers use the exact values
(`brief.py` accepts them; the lead-25 reconciliation fixed them, WS-24), and that
reconciliation already folded the repair-1 reports into Status.

Status changes only. The spec revision stays lead-25 because requirements are unchanged
and the repair-1 reports bind to it. Task-state owner and implementation writer: this
session. The follow-up is review and fix: this session reviews repair-1 as a non-author
and may then write in-scope repairs, which conditional closure covers and which are not
independently reviewed. Evidence root for this cycle:
`_local/project/evidence/writing-studio/1b-2b-3/repair-1-review/`.

Next: this session completes the follow-up review, repairs supported findings and applies
conditional closure.

## 2026-09-23: 1B.2b.3 accepted

Author: the task-state session recorded in `task-state transfer for the repair-1
follow-up` (Claude Code desktop, claude-opus-5-5), under Isaac's review-and-fix
assignment. No application, test, build or dependency file changed; nothing dispatched,
committed or pushed; no provider call.

Follow-up review: `reports/1b-2b-3-repair-1-review.md`, on the unchanged repair-1
snapshot `43ffa1eb...`, answers all three parts of the lead-25 question as supported and
records no finding. Two optional suggestions (an unreachable DEMO arm in the logo
handler; a source-slicing test harness) are left for the next edit of those files. This
session reran focused Node (378), full Node (47 files, 795), full Python (JUnit 1356
tests, 0 failures or errors, 6 skipped), client types, protected sources,
`check-revision-fence.mjs` in final mode (72 HTTP and 48 CLI refusals; 14 controls
match the capture) and a CLI parity probe against `git show fed8ed1:backend/cli.py`
(10 of 10). All counts match the author's receipts. Build and `py_compile` were not rerun:
`dist` still matches the manifest. The review is by a non-author with no inherited
conversation, but the same session holds task-state ownership and wrote this
disposition. The report records that limit. No repair was made, so conditional closure
needs no further assessment.

Decision: B2B3-1..5 are met and slice 1B.2b.3 (tracked-clip write fence) is accepted on
`43ffa1eb...`. WS-20 and WS-22 move to Closed. WS-23 stays Open as the lead-25
nonblocking deferral and must close in 1B.2b.4 or 1B.2b.5 before adoption. The accepted
pre-adoption residual and U-1 stay interim limits under `Approved exceptions currently in
force`. Acceptance covers the fence only, not adoption, adapters, save routes, UI,
Cleanup, integration or release.

Records: Status reconciled; spec revision stays lead-25 (Status and frontmatter only, as
at the 1B.2b.2 acceptance). The `Behavioral slices` wording ("bounded below") is refreshed
by the next planning revision. The eight 1B.2b.3 cycle reports are marked `historical`
(header `state` only); originals and the old-to-new identity mapping are in
`repair-1-review/records/pre-historical/` and `historical-identity-mapping.json`. Five of
them are hashed in the repair-1 manifest, so its `--check` now reports those as expected
bookkeeping drift. Ledger edit script and pre-edit copies are in `repair-1-review/records/`.

Next: Isaac assigns a task-state session to refresh and plan 1B.2b.4 from this accepted
evidence. This session makes no further writes.

## 2026-09-23: lead-26 1B.2b.4 partition refresh and 1B.2b.4a plan

Author: a new Claude Code desktop session (claude-opus-5-5), assigned by Isaac on
2026-09-23 to resume writing-studio as task-state owner, plan only, for 1B.2b.4. It
inherits no planning, implementation or review conversation and wrote none of the
1B.2b.3 records. Planning only, under 5.0.0-local-1 (doctor: identities match): no
application, test, build, other author's report or prior evidence changed; nothing
dispatched, committed or pushed; no provider call.

Transfer reconciliation: the accepting session's last write is the entry above.
`spec.md`, this log, the ledger and the eight 1B.2b.3 reports still hash-equal
`repair-1-review/records/records-post-acceptance.sha256`, so it wrote nothing after
acceptance. The repair-1 manifest still hashes `43ffa1eb...`; its `--check` reports drift
only in those eleven records. All 46 planning inputs equal their manifest entry or HEAD
blob; configuration and six `dist` files match. Audit, doctor, brief, drift log and
pre-edit copies: `_local/project/evidence/writing-studio/1b-2b-4a-plan/`. Planning
manifest: `baseline-1b2b4a.json`.

Current code: the fence refuses every legacy media action on a tracked clip; no production
module imports the save service or calls `ensureTracked`; each save renders from a
caller-supplied recipe (no render reuse); a commit re-projects the summary but leaves
`logo_backup_path` and `thumbnail_config.preview_path` stale; version zero has no recipe
and the reader reports `known_effective_cuts` false; the legacy `generate_clip` branch
writes its title-derived sink unchecked (WS-23). Clients read only `error` from these
routes.

Decisions, within delegated authority and without product change:
- Split 1B.2b.4. 4a adapts caption style, logo and opening-card actions, which keep the
  committed timing, and closes WS-23; 4b (provisional) adapts `rerender` trim and
  reframe, whose single-range editor, keyframe and widening mapping onto exact recipes is
  a distinct risk. 1B.2b.2 needed four repair rounds; thinner slices keep each review
  bounded. `rerender` on tracked clips stays refused until 4b.
- Adapters act only on an exact current revision. Version zero refuses with
  `REVISION_BASE_UNAVAILABLE`: rebuilding it from requested inputs would flatten or
  change unrecorded cuts, which the constraints forbid doing silently. What adoption
  offers for version zero moves to 1B.2b.5.
- The next recipe is the current document's recipe with only the requested change,
  retained source words and the carried card (owned copy and recorded hash). No-op
  requests render nothing, which also makes legacy retries harmless without client
  operation IDs. A present draft refuses (`REVISION_BUSY`) until 1B.2b.5 defines draft
  routes.
- A tracked caption-style PATCH renders a new revision, as the spec requires caption
  changes to render; `thumbnail_config` PATCH keeps refusing (a caller-chosen preview path
  has no safe revision meaning). The WS-22 presence rule holds: a present style is never
  ignored on a tracked clip; invalid values, null included, answer 400.
- The Python CLI and MCP keep refusing tracked media edits and deletion: the CLI has no
  render-and-commit path, and its legacy style edit is metadata-only (WS-06).
- The commit projection clears `logo_backup_path` and sets `preview_path` from the
  committed card; thumbnail metadata lands in the same transaction. This edits the save
  service, so 4a reruns its focused, bridge and full suites.
- WS-23 closes in 4a, in `generate_clip`'s legacy sinks, as its ledger prevention states;
  it shares 4a's bridge reruns. U-1 remains the accepted static limit.
- Carried to 1B.2b.5 unchanged: the pre-adoption residual, the `record()` to
  `persistClipRecipe` observation, deletion of untracked unresolvable targets,
  revision-aware deletion, stale pending-operation recovery and draft interplay. To 1B.3:
  the Library logo-remove button keys on `logo_backup_path`, and a tracked style change
  renders during PATCH.
- Reference: `local-app.md` applies (filesystem and link boundaries, real binaries,
  path-free diagnostics, failure recovery, identified runtime); installer, update,
  offline and release checks do not. README selection unchanged.
- No focused fresh plan assessment before relay: the change is reversible, migrates no
  data, is unreachable in production before adoption, and gets a fresh non-author
  review. Isaac may still request one.

Records: spec lead-26 adds the 1B.2b.4a section, B2B4A-1..6, an exceptions note and a
refreshed behavioral-slices bullet, replaces the lead-23 freshness paragraph (its content
remains in that entry above), and resets Status (implementation report pointer `none`
until a lead-26 report exists). The ledger's WS-23 row names 4a as its closing slice.
No Isaac decision is required.

Next: Isaac relays the 1B.2b.4a assignment to a separate implementation session in this
checkout.

## 2026-09-23: lead-27 1B.2b.4a review disposition and repair-1

Author: the Writing Studio task-state owner (Claude Code desktop, claude-opus-5-5), the
lead-26 planning session. Isaac resumed it on 2026-09-23 after the 1B.2b.4a writer
handed off. It did coordination, review arrangement and disposition only, under
5.0.0-local-1. It changed no application code, test, check, `dist`, other author's
report header or evidence, and it committed and pushed nothing.

Resume reconciliation: HEAD fed8ed1, and the tree matched the handed-off snapshot
`6391643c...` with no drift (`1b-2b-4a-review/owner-resume-snapshot-check.log`). The
implementation report's Handoff (writes stopped, next action review) agreed with the
tree. Lead-26 Status still showed the slice as not started; lead-27 brings it current.
Pre-edit copies and hashes are in `_local/project/evidence/writing-studio/1b-2b-4a-lead/`.

Review arrangement: a fresh general-purpose subagent, spawned by this session with a
neutral prompt and no planning or implementation history, wrote
`reports/1b-2b-4a-review.md`. It confirmed the snapshot binding and reran the focused
and full Node suites, full Python, `check-legacy-adapters.mjs` and the protected hashes,
all passing. Recommendation: request-changes on F-1.

Decisions, within delegated authority:
- F-1 is supported, and the owner confirmed it in code (`clip_generator.py` 1296-1316
  versus 1838 and 1856; `audiogram.py` 169). It is WS-23's second occurrence and blocks
  B2B4A-4. The lead-26 sink list was incomplete. Lead-27 corrects the requirement's
  coverage to every legacy-road sink, adds a bounded repair-1, and extends the B2B4A-4
  row. Round 1 of 2 on WS-23 in this slice.
- F-2 (self-audit A-1) is supported and nonblocking: the reader was frozen by lead-26
  and its code is still accurate. Indexed as WS-25 for 1B.2b.5.
- D-1 accepted: the local policy refuses the routes, the local 403 is asserted, and the
  upstream phase runs the same build with no possible provider call. D-2 accepted as
  the intended B2B2-4 expectation update that lead-26 omitted from its list; the
  protection is preserved.
- A-9 has two parts. The save-service test timeouts are environmental, and serialized
  runs are an accepted runner setting. The lock `EPERM` is a pre-existing product defect
  in the same class as WS-07: TS `tryCreate` and Python `_try_create` treat only an
  existing file as contention. It is indexed as WS-26, scheduled for 1B.2b.5 before
  adoption, and outside 4a scope.
- A-2, A-4..A-8, O-A and O-B are nonblocking. A-2, O-A and O-B are noted for 1B.2b.5,
  and A-3 for 1B.3.
- WS-23 is not closed.

Repair-1 is relayed manually to a separate implementation writer, following the
`1B.2b.4a repair-1: audio-only derived sinks (lead-27)` section.

Follow-up question after handback, for a focused fresh non-author assessment: on the
repair-1 snapshot, does every sink on `generate_clip`'s legacy road, including the
audio-only road and any other early hand-off in the sink inventory, get the path verdict
before its first write? Is the checked path the one the renderer writes? Do link, case
and missing-root fixtures refuse with owned bytes unchanged through `create_clip`,
`batch_clips` and `rerender` over HTTP, while outside controls and exact mode are
unchanged? And does the delta leave B2B4A-1, -2, -3 and -5 intact? Scope: the repair
delta, `audiogram.py`, the callers it touches, and the refreshed receipts. The
assessment is complete when each part is answered supported or not, with evidence.

Records: spec lead-27 adds the repair-1 section and changes the B2B4A-4 row, the
exceptions note, Status and the frontmatter. The review report gains a separately
attributed disposition, with its assessment unchanged. The ledger updates WS-23 and adds
WS-25 and WS-26 (Open). No Isaac decision is required.

Next: Isaac relays repair-1 to an implementation writer in this checkout.

## 2026-09-27 — 5.2.0 workflow boundary; lead-27 unchanged

Codex maintenance session, under Isaac's repository-only upgrade assignment.
The 4.x Lead/Worker relays and 5.0.0 hub returns above remain historical precedent
only. Later work follows the 5.1.0 forward lanes as incorporated in 5.2.0; no
intermediate 5.1.0 installation occurred. The former hub does not resume. The last
recorded owner remains identified pending Isaac's actual forward relay to a fresh
reviewer-owner; maintenance acquires no product-task ownership or writing rights.

The pre-upgrade Status was stale: it called repair-1 not started, while Isaac's
assignment and the 2026-09-23 implementation Handoff record completed repair-1,
stopped writes and snapshot `84c74067...`. Status now points to that repair report
and snapshot, records reported checks and PASS-WITH-FINDINGS (A-1..A-3 nonblocking),
and retains changes-requested pending the required fresh assessment/disposition.
No findings are closed. The original implementation report remains lead-26 history. The current implementation
pointer selects the lead-27 repairer implementation report. The separate repair pointer
is `none` and final repair snapshot `not applicable`: those helper fields select a
reviewer-authored repair section, not a repairer implementation report. The current
repair-1 snapshot remains explicit in Status and the implementation report. Requirements, acceptance rows, scope, exceptions, historical
reports and their 5.0.0 bindings are unchanged. The pre-edit spec/log bytes and
identity mapping are in `_local/generate-init-backup/20260927-5.2.0/manifest.json`.
