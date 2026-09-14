---
record: "spec-log"
task: "writing-studio"
author: "coordinating-lead"
date: "2026-09-14"
state: "active"
summary: "Repair-2 closes root containment; WS-16 survives two rounds. Lead-12 records required reassessment and bounded additive join-provenance correction, preserving prior evidence and instruction boundaries."
read_when: "Investigating historical baselines, review dispositions, instruction changes or repair-3 reconciliation."
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
