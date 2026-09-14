# Shared Project Workflow Contract

## Part A — Mandatory core

Read this core at every start. Read the selected role and applicable selected references; references add requirements without weakening authority or verification. Responsibilities apply only to the active assignment. Reading another role as data grants no permissions. Part B procedures are required before their named actions.

### Participants and authority

Isaac, Worker and Project Lead are the standing participants. Reviewer is a Project Lead assignment with narrower authority.

| Decision/action | Owner |
|---|---|
| Product intent, business facts, taste, material scope/cost, designated release approvals | Isaac |
| Implementation details within approved constraints | Assigned implementation owner, normally Worker |
| Technical direction preserving approved behavior, bounded repairs, review coordination, task acceptance and shared records | Coordinating lead |
| Independent findings and recommendation | Assigned reviewer |
| Explicit solo slice: technical direction, implementation, verification and disposition, subject to independent closure | Coordinating lead in solo assignment |

Existing user decisions/authorization apply. Inspect project evidence before asking; make routine reversible choices, state material assumptions/tradeoffs, and never invent business facts. Project conventions retain their subject owners. References impose no unused service, stack or unrelated pipeline. Identify conflicts and ask only about unresolved material choices.

### Role selection and ownership

Codex defaults to lead, Claude to Worker. Explicit assignments override only that assignment; read only its selected role as active. “Act as coordinating lead and implementation owner for [task] slice N” selects the lead's Solo slice procedure and records both responsibilities in Status.

One agent owns implementation writes per task checkout. The coordinating lead records ownership before switching and waits for a handoff before patching Worker-owned implementation. Other agents may inspect/run appropriate checks. Concurrent implementation uses separate worktrees and explicitly reconciled commits. Each author writes its designated report; the coordinating lead owns spec, authoritative Status and ledger. Review-only agents write their assigned report, with no repair, acceptance or shared-record authority.

Delegation is bounded: coordinating lead may delegate fresh review; Worker may delegate fresh read-only exploration (Phase A); Worker or explicitly assigned solo implementation owner may delegate verification execution (Phase B) only with `Verification delegation: enabled` in README at Isaac's direction. Absent/disabled means no Phase B grant. Review-only agents delegate nothing. No grant permits delegated implementation, repair, acceptance, recursion, runners, hooks, schedulers or automatic handoffs. Read role procedures and the verification procedure before using a grant; unavailable capabilities have direct-work or fresh-session fallbacks.

### Process lanes

| Lane | Process |
|---|---|
| Small reversible work | Direct assignment, relevant checks, concise result; spec/review optional |
| Contained component/bug fix | Scoped requirements, appropriate evidence, lead review when risk warrants |
| Substantial feature/integration | Approved spec, behavioral slices, cycle reports, fresh independent review |
| Consequential work | Stronger verification/scrutiny; designated Isaac approval before merge/release/destructive action |
| Installed phase pipeline | Selected reference and installed phase procedure |
| Solo slice | One session holds coordination and implementation for an explicitly named bounded slice. Consequential work excluded; substantial work requires fresh non-author review and independent closure. Small reversible work keeps optional proportionate review. |

Implementation authorization is distinct from merge, release, spending or destructive production action. Preserve designated approvals without inventing repeated gates for authorized slices or routine repairs. Classic Lead-Worker relays remain manual.

### Decision boundaries and freshness

- Implementation choice within decided constraints: implementation owner proceeds, recording meaningful choices.
- Technical change preserving intent but changing settled design: coordinating lead decides within delegated authority and updates the spec.
- Product intent, material scope/cost, locked business facts, consequential guarantees or designated approvals: Isaac decides before that path proceeds.

Check relevant current code, configuration, schema/interfaces, ignored inputs, predecessor outcomes and assumptions before detailed planning and before starting/resuming implementation. Partitions remain provisional. Unrelated HEAD movement alone does not invalidate a plan; relevant drift follows these decision boundaries, refreshing affected scope/checks/evidence and pausing only the contested path. Independent parallel work remains allowed; project-specific sequencing stays local.

### Verification, evidence and independent review

Failed, missing or stale required checks block acceptance, not investigation or review. Separate Implementation (`partial`, `implemented`, `blocked`), Verification (`pass`, `fail`, `incomplete`), Review (`pending`, `changes-requested`, `accepted`, or `not-required` with reason), and Integration/release. Implemented but unverified is not complete. Environmental/tool failures are not automatically product defects or passes.

Never invent output. Reports bind exact task/spec revision, reproducible code/input snapshot and environment; each receipt identifies its checked snapshot and actual executor. Prefer a clean commit; otherwise preserve base, patches and content manifests, including relevant untracked/binary/ignored inputs. Without Git use manifests. Changed implementation, dependencies/configuration or criteria invalidate affected evidence/approval; bookkeeping alone may reference unchanged code. Read the full binding procedure. Never put secrets in implementation, fixtures, records, logs, patches, manifests or screenshots; redact before saving while retaining assessable results.

Substantial/consequential work and substantial lead edits require fresh non-author review without inherited planning/implementation history. Necessary project facts still accompany the reviewer. Agreement alone proves nothing; findings need evidence. Missing review stays pending; a recommendation is not acceptance. For small lead corrections rerun affected checks and disclose authorship and any absent independent follow-up; consequential work retains stronger policy.

**Independent closure:** a coordinating lead who authored reviewed implementation cannot self-disposition a confirmed blocking finding as resolved or dismiss a contested finding. A fresh non-author reviewer verifies correction/counterevidence and records it; until then Review stays pending or changes-requested.

### Durable state and reading

- Task `docs/project/tasks/[task]/spec.md`: current intent, criteria, baseline, approved exceptions and lead-owned Status/resume view; obsolete history in append-only spec-log.md.
- Task reports: author-owned cycle evidence and reviews; `docs/project/findings-ledger.md`: lead-owned actionable defect index.
- `docs/adr/`: permanent decisions; `docs/external/`: verified setup facts, no secrets.
- `_local/project/`: scratch and evidence governed by README storage/transfer policy.
- LucentDev phase progress stays in CLAUDE.md Project Status under its existing procedure.

Use `docs/workflow/record-frontmatter.md` for new/reconciled metadata, lifecycle and preserved inventory binding. Summaries/lifecycle are routing hints, never requirements or accepted state. No duplicate status owner or unnecessary assignment/disposition file.

Orient via README, this core, selected role, shared context, applicable selected references, assigned Status/phase owner, then bounded task index. Open required requirements/baseline/exceptions before implementation. Body reads are section-first complete logical units; roughly 2,000–4,000 output tokens is a soft guide, with larger reads justified in-session. No orientation concatenation: multiple files in one command require a named comparison. Never orient from report folders, backups, transcripts or plan/history archives; investigate these only for a named reason, never archive-dnr. Editing permits necessary reads, not blanket reads. Don't reread unchanged retained context. Filter command output before context; file full evidence first. Line count is not density. After compaction, use core/current state/index and reload uncertain protections, reference requirements and procedures.

### Recovery and communication

After three failures of the same fix/command/approach, report STUCK and change hypothesis/approach or hand the decision to its owner; no fourth identical attempt. Reassess earlier without new evidence. Declare a small substantial review budget; after two unsuccessful rounds on the same issue, reassess. No automatic repair loop.

Files carry detail; Isaac carries short manual relays, not technical narratives or terminal commands. Checkpoint within role authority; checkpoints, handoffs, recommendations, acceptance and release are distinct. Context warnings prompt assessment, never forced resets or completion.


## Part B — Procedures

Read each complete applicable procedure before its named action; selective startup does not make procedures optional.

| Procedure | Read before |
|---|---|
| Scope and design changes | Proposing/dispositioning scope or design changes and decision requests |
| Plan freshness | Detailed plan authoring; implementation start/resume |
| Verification and evidence | Naming checks; running/delegating verification; writing a receipt |
| Bind evidence to what was checked | Writing/reviewing any report |
| Review procedure | Any review assignment or disposition |
| Recurrence and recovery | Ledger work; repair handoff; STUCK report |
| Engineering defaults | Any authorized edit |
| Session checkpoints and continuity | Handoff; risky step; context warning |


## Scope and design changes

Each assignment defines an expected change area, protected boundaries, and a do-not-build list. Necessary tests, documentation, and task evidence belong in scope. Exact-file locks are useful when a task truly requires them; they are not the default for every prompt.

The coordinating lead owns approved behavior, constraints, important interfaces, and risk-bearing design decisions; the implementation owner owns explicitly delegated internal choices. Substantial plans use thin behavioral slices with relevant error handling and validation, without a universal mock/UI/wiring/error sequence.

The coordinating lead owns reassessment of project-reference applicability and the installed selection record. Both roles surface missing coverage through their assignment's decision/report path. Only available, installed references may be recorded as selected. The lead's procedure defines when and how to reassess the selection.

For every project, include applicable trust-boundary validation, server-side permissions and data isolation, compatibility with existing data and callers, safe retry behavior, and surfaced failures in the task's requirements and verification. Apply these only to capabilities the task touches, even when no domain reference is selected. Verify changing external technical or legal requirements against current authoritative sources before settling affected design; route unresolved business/legal decisions through the existing authority boundaries.

- Implementation choice within decided constraints: implementation owner proceeds and records a meaningful choice.
- Technical change preserving approved intent but changing a settled design detail: lead can decide within delegated authority and update the spec.
- Change to product intent, meaningful scope/cost, locked business facts, consequential guarantees, or a designated approval boundary: frame the decision for Isaac before implementing that path.

A schema, API, auth, payment, or migration change deserves scrutiny, but being in one of those categories is not by itself a requirement to ask Isaac about every technical detail. Preserve approved compatibility and security guarantees; uncertainty about those guarantees can block the contested path.

A decision request records: what is currently decided, the proposed alternative, evidence/reason, tradeoff, who can decide, affected acceptance criteria, and the resolution. Keep working on independent authorized paths while a decision is pending.

Do not change authority, required review, or acceptance safeguards merely to make the current task pass. Legitimate corrections to requirements, tests, or workflow rules follow the existing decision boundaries, record their justification, and invalidate affected evidence where applicable. This does not grant workers or reviewers authority to edit the lead's records or expand a maintenance assignment.

## Plan freshness

A partition or roadmap allocates provisional scope and dependencies; its approval does not freeze future implementation designs or authorize their execution. Develop dependent plans progressively against current relevant inputs. Independent work may be planned or implemented in parallel within the existing ownership and worktree rules; a project may explicitly choose stricter sequencing.

A substantial plan records the code baseline (commit and relevant working changes, or a content manifest when Git is unavailable), relevant schema/interfaces/configuration inputs, predecessor outcomes and assumptions used to settle its design. Include relevant ignored records; a commit alone does not identify them. Match this record to the risk and scope rather than inventorying the entire environment.

Before detailed authoring and before implementation starts or resumes, the responsible lead or implementation owner checks the relevant current state against those inputs. Changes outside the plan's assumptions do not invalidate it merely because HEAD moved. Relevant drift requires reassessing the affected scope, design, checks and approval under the existing decision boundaries: routine delegated choices remain delegated, settled design changes return to the coordinating lead, and material product/scope/cost or designated approvals return to Isaac. Pause only the affected path while that decision is unresolved; do not silently follow or redesign a stale plan. Record the comparison and disposition in the existing spec/report, refresh affected evidence, and obtain renewed approval only where those boundaries require it.

Keep the current compact baseline/assumptions and approved exceptions in the spec head. Move superseded baselines, reconciliation and decision/deviation/drift history to dated append-only entries in `spec-log.md`, identifying each affected revision. Never invent a missing historical baseline. Reports record the implementation owner's comparison. The acceptance table is the single acceptance-to-check map.

## Verification and evidence

Before substantial implementation, the implementation owner names checks in the spec's acceptance table, with expected results and acceptance IDs for the Execution Receipt. If the project has a verify skill, the owner names the relevant mapped features to drive before starting implementation. This applies to Worker implementation, authorized lead repairs and solo implementation owners. Checks use the project's actual tools and commands, not a mandatory stack-specific trio.

Required checks can include static analysis, build, lint, targeted regression tests, API/integration tests, and end-to-end runtime proof. Mark a check not applicable only with a task-specific reason. Relevant behavior tests must examine outcomes or contracts, rather than mirror implementation details. For a defect, reproduce the failure and demonstrate the correction when feasible.

Prefer existing relevant checks when they adequately demonstrate the required behavior. Add or extend tests to close an identified acceptance, regression, or risk-coverage gap, not to duplicate adequate coverage or make a change appear more thorough. Choose test scope and tooling by that gap and the project's constraints, without arbitrary limits on test count, length, or type. Run inexpensive relevant checks early when their results can guide the work; their failure still permits diagnosis and review.

A verify skill is one way to obtain runtime evidence. Browser interaction, an integration test, or another equivalent method can satisfy the same acceptance criterion. Absence of a named skill alone is not a blocker if equivalent evidence is available.

**Human assistance is an available fallback for both Worker and Project Lead assignments, including review-only work within its existing limits.** When Isaac can readily verify behavior or resolve an authorized blocker that the agent's tools cannot handle reliably, request his help promptly. Do not require an exhausted retry budget first or turn the fallback into routine supervision. Diagnose tool/environment limitations separately from product failures; an action the tool could not perform leaves the check incomplete, not a confirmed product defect. Use a neutral control or a bounded alternative when useful, and respect the existing circuit breaker instead of repeating an ineffective method.

The requesting agent retains responsibility for safe setup, concise manual steps and expected results, observation and evidence capture, and any authorized fixture cleanup. Isaac supplies the needed interaction; he does not inherit the investigation or report-writing work. Assistance stays within the assignment's role, authorization and client-data/security boundaries; do not route prohibited actions through a human. If assistance is unavailable, continue independent work and record the remaining gap without claiming completion.

Human-assisted checks can satisfy the same requirement as automated checks when their evidence is adequate. Record who performed the action, the method, target/snapshot, observed outcome and relevant corroboration, distinguishing agent-observed evidence from an uncorroborated user report. A successful manual interaction is not by itself proof of every downstream effect. Preserve demonstrated defects and inconclusive results as such. The coordinating lead judges evidence and acceptance under the existing review requirements; human participation does not waive those requirements or grant release approval.

Capture commands, actual exit codes, concise output excerpts, and meaningful evidence paths from tool execution. Do not invent output or replace a failed result with a description of success. Filter command output before bringing it into context and save full output to the evidence folder. Receipts cite acceptance IDs with command/steps, expected result, actual one-line result/exit code, evidence path, snapshot and executor (`self`, `subagent`, `human-assisted`). Preserve actual session/operator identity and environment/target. Excerpts are at most ten lines each, only when those lines are evidence; longer output stays in files. Record skipped checks as `not run` with reason and consequence.

Keep secret values in the project's approved secret store. Never write them into repository files or shared evidence, including implementation, fixtures, reports, logs, saved patches, manifests, or screenshots. Redact credentials before saving or sharing evidence and clearly mark redactions; preserve the actual result and enough context to assess it.

Separate these states:

- Implementation: `partial`, `implemented`, or `blocked`.
- Verification: `pass`, `fail`, or `incomplete`.
- Review: `pending`, `changes-requested`, `accepted`, or `not-required` with reason.
- Integration/release: record separately when applicable.

Implemented code awaiting unavailable required verification is not approved or complete. Failed, missing, or stale required evidence blocks approval; it does not prevent diagnosis or code review. A pre-existing environmental failure must be distinguished from a regression and still cannot be represented as a passing required check.

### Evidence storage and human capture

Follow the README's existing storage choice; new installations default to `docs tracked`. Under `docs tracked`, small decisive secret-free text may live in `docs/project/tasks/[task]/evidence/`; bulky logs, screenshots and patches live in `_local/project/evidence/[task]/`. Under `docs ignored`, all evidence lives under `_local/project/evidence/[task]/`. Another checkout needs explicit transfer of ignored instructions, preserved inventories, task records, snapshot artifacts and required evidence before startup/review is usable; preserve existing owner overrides without asking again.

An inaccessible evidence artifact makes its receipt row `incomplete`, not `fail`. The reviewer may rerun against the recorded snapshot; a new run cannot establish what happened historically. Self-sufficient receipt rows carry command, expected and actual result; artifacts support that historical claim.

The requesting agent says what Isaac does and what to capture, files and indexes his evidence, and prefers text exports for query results, tables or logs. If Isaac pastes an image, save it once under the evidence path, note the observation in the receipt and reference that path thereafter; do not reopen an unchanged image. Preserve the original visual when appearance is the criterion. Reports/reviews carry paths and observations, not pasted bodies. If capture is unavailable, report the precise evidence gap rather than claiming a saved artifact.

### Phase B verification execution (opt-in)

Only `Verification delegation: enabled` in README, set at Isaac's direction, enables this grant for the Worker or coordinating lead explicitly assigned as solo implementation owner. Disabled or absent is inert. Assign only named checks or mapped verify-skill features; name target, allowed effects, fixture ownership/cleanup, evidence destination, snapshot and stop condition. Keep relevant code/configuration unchanged during execution. The subagent writes evidence to the task evidence path and returns receipt rows. The implementation owner validates artifacts, results, target and snapshot binding, records actual executor identity and marks rows `executor: subagent`; missing artifacts mean incomplete evidence.

Serialize checks sharing a browser profile, database or other shared state. This grants verification execution only: no implementation, repair, acceptance or further delegation. The lead's independent-review grant is separate. A README flag is not tool capability: if suitable delegation is unavailable, perform authorized checks directly or record the specific incomplete evidence. No tool installation is required.

## Bind evidence to what was checked

Every implementation report and review identifies the task, spec revision, code snapshot, and relevant environment/target. Derive changed paths from Git, including staged, unstaged, deleted, renamed, and untracked files, rather than relying only on an author's list.

Prefer a commit identifier with a clean implementation tree. When uncommitted work is being reviewed, record the base commit plus a saved staged/unstaged patch and a content-hash manifest for untracked or otherwise uncaptured files, including binary changes. If Git is unavailable, use a content-hash manifest for the relevant implementation and configuration inputs. Report the limitation if a reproducible snapshot cannot be established.

Record which snapshot each check used. Any later implementation, dependency/configuration input, or acceptance-criteria change invalidates the affected evidence and approval. Changes only to reports or progress bookkeeping may point back to the same unchanged code snapshot; do not manufacture a self-referential "final commit" for the report itself.

Bind implementation/review frontmatter's workflow_version and instruction_inventory to the preserved inventory revision actually used, including retained/customized instruction identities, per `docs/workflow/record-frontmatter.md`. Never infer unknown historical provenance from current source. If instructions change during an assignment, identify which revision governed affected work. Drafts are editable until actual handoff; checkpoints do not seal them. After handoff preserve assessment/evidence/provenance through attributed dated addenda or successor reports explaining their effect. The lead may complete its separate disposition and reconcile current Status; only lifecycle/superseded_by may change in a handed-off header. Required secret redaction must not preserve exposed values in historical copies.

An execution receipt establishes what its checks demonstrated. Passing typecheck/build/lint does not establish all behavioral correctness. Review can inspect test adequacy, missing paths, environment mismatch, and evidence provenance, and rerun checks when uncertainty warrants it.

## Review procedure

Substantial or consequential work requires an independent reviewer with fresh context, without inherited planning/implementation conversation history or authorship of the reviewed implementation. The reviewer receives relevant project facts, decisions, requirements, code, and evidence; fresh context does not mean missing necessary project information. The coordinating lead arranges this review under its role procedure. A fresh reviewer does not require replacing the coordinating lead's conversation.

Review covers the design as well as compliance with it. A faithfully implemented flawed spec is a valid finding. Agreement between reviewers is not proof; independence requires fresh context and no implementation authorship.

Each actionable finding includes the location/snapshot, failure condition, impact, supporting evidence, and required outcome, distinguishing confirmed defects from hypotheses and optional improvements. A worker may contest a finding with evidence; the coordinating lead resolves it against requirements and reproducible behavior, not seniority. Supported findings must be resolved before acceptance. A disputed finding requires a documented disposition backed by evidence; unresolved uncertainty cannot be silently converted into approval.

Substantial reviews use the review template. The reviewer owns its findings and recommendation; the coordinating lead owns the subsequent disposition and authoritative task status. A recommendation alone does not change task acceptance. If the reviewer is unavailable or cannot inspect the specified snapshot, required review remains pending. Failed or incomplete required verification still blocks acceptance.

For author-leads, apply the core's independent-closure rule to confirmed blocking findings and contested dismissals. The review disposition records `Author-lead closure verified by: [fresh non-author reviewer and report path / not applicable]`; until the required independent verification exists, Review remains pending or changes-requested. The reviewer reads the ledger's Open table and searches matching classes in both Closed and `docs/project/findings-ledger-archive.md`, when present, without entering archive-dnr.

## Recurrence and recovery

The coordinating lead owns `docs/project/findings-ledger.md`, indexing all actionable defects it discovers or receives from the first occurrence of each class, including defects resolved during its own repairs. Create from `docs/project/_LEDGER-TEMPLATE.md`. Keep one-line rows in Open and Closed tables: ID, first seen, class, location, occurrences, prevention destination and explanatory record link. Table membership records status; narrative stays in linked reports. A concise linked finding suffices when no separate report is warranted. Reviewers compare findings with earlier occurrences and report proposed ledger updates; workers report discovered defects and recurrence evidence. This preserves recurrence discovery without competing ledger writers. Optional style suggestions are excluded from the index.

Keep an unresolved finding actionable even when its class repeats. Add a prevention proposal alongside it: preferably a meaningful test, lint/check, or schema constraint; otherwise a documented convention. Record class, occurrences, status, evidence and prevention destination in the ledger. Generalize only when the rule actually applies beyond this project.

Implement in-scope local prevention within delegated authority. Changes to a global template or skill require a separately scoped maintenance assignment unless already authorized. Fixing the current defect must not wait for unrelated template maintenance.

Anti-loop circuit breaker: if the same fix, command, or approach fails three times, stop and report `STUCK`, listing what was tried and the current hypothesis. Never make a fourth identical attempt. Form a new hypothesis and change the approach, or hand the unresolved decision to its appropriate owner. Reassess earlier when repeated attempts produce no new evidence.

Separately, substantial review/repair cycles have a small budget declared by the coordinating lead; after two unsuccessful rounds on the same issue, the lead reassesses rather than circulating the same finding indefinitely. This budget does not authorize automatic repair delegation.

When Closed exceeds 60 rows, move older rows to `docs/project/findings-ledger-archive.md`, preserving IDs, all columns, links and searchable classes. Recurrence lookup searches matching classes in both Closed and that archive, not only the current file; never use archive-dnr. Only the coordinating lead edits ledger/lifecycle state; reviewer/Worker reports propose updates.

## Engineering defaults

The coordinating lead may reproduce failures, fix demonstrated in-scope defects, add focused regression tests and update specs/durable decisions within delegated authority after the write handoff. Larger repairs can return to the Worker; do not rewrite correct implementation for personal preference.

Implementation and cleanup requirements below apply only during authorized edits. They do not grant write authority to a review-only assignment.

Prefer the simplest implementation satisfying real requirements. A single-use abstraction is allowed when it contains complexity, isolates effects, improves testability, or makes the code clearer. Avoid speculative extension points and incidental refactors.

When a solution accumulates workarounds or duplicate paths, reassess the premise and existing implementation before adding another layer. Prefer an in-scope root-cause correction when evidence supports it. Compatibility layers remain appropriate when required by existing users, data, or integrations; simplicity does not authorize removing those guarantees.

Push back constructively when a request adds unnecessary complexity or breaks an established convention. Explain the concrete consequence and propose an alternative that satisfies the requirement and respects project conventions. Resolve material disagreements through the existing decision boundaries.

Use project language conventions, parsers and linting for syntax and quoting. Correct obvious in-scope syntax errors directly. As part of each authorized edit, remove unused imports, unreachable branches, commented-out old implementations, and other code made redundant by that change; keep cleanup within the task's scope. Do not weaken tests, checks, or requirements to obtain a green result.

## Session checkpoints and continuity

Checkpoints preserve recoverable assignment state within role write authority: at slice completion, before human assistance or risky/irreversible operations when new state needs preserving, before actual handoff, and at context warnings/degradation. Reuse a still-current checkpoint; do not rewrite it before every small interaction or introduce a relay/approval gate.

- Worker: update its draft report/Handoff and evidence with current snapshot, unfinished work, last failed approach and next action. Do not edit or wait for lead Status/lifecycle merely to checkpoint.
- Coordinating lead: reconcile authoritative Status and applicable lifecycle/dispositions at dispatch, actual handoff, acceptance or transfer of coordination. A solo implementation owner also preserves its implementation report/evidence.
- Review-only: preserve only its assigned report, coverage/evidence and next action; never Status or other authors' headers.

### Status as resume view

The lead-owned spec Status targets under 300 words: objective; task ID/revision/current snapshot; the four separate states; current slice/acceptance IDs; coordinating lead and implementation owner; completed slices; unresolved ledger IDs; last failed approach; pending Isaac decision; next action/owner; exact record paths/sections to open; evidence root. Existing phase-state ownership remains intact.

Before lead reconciliation, compare Status with the latest relevant implementation report's Handoff, required evidence and actual tree. Discover reports through assignment and bounded index, including unclassified or stale headers; never choose solely by lifecycle/timestamp. Record comparison in your own report. A Worker reports discrepancies and continues independently authorized work without editing lead Status. Missing metadata never means completion.

### Record size and continuity

Soft caps: active spec 1,500 words; Status 300; implementation report 1,200; review 900; separate disposition 400. State a reason in an over-cap record. Never omit required criteria, findings or decisive evidence: move evidence to files and cite it. Ledger rows stay one line; summary stays at most 40 words. Avoid separate assignment/kickoff/disposition/acceptance documents when Status and cycle reports carry the decision. The conversation relay is the assignment, with next action and records in Status; use a separate disposition only when its review section cannot hold it.

Around 250,000 active-context tokens in Claude Code, or an available Codex compaction warning, is an experimental attention threshold only when reliably exposed. Never invent counts or require Isaac to monitor them. Checkpoint and assess remaining work; no automatic stop, completion declaration, forced reset or fixed slice/session count. After compaction use core/current state/bounded index; explicitly reload missing, changed or uncertain protections, selected-reference requirements and procedures rather than blindly repeating startup.

The coordinating lead maintains the task's accepted Status from worker/review evidence; reviewer assignments do not transfer that ownership. The worker writes its implementation report and the reviewer writes its review report rather than changing authoritative task status. Templates in `docs/project/tasks/` remain blank reference shapes. One task folder can cover a feature's slices; do not create paperwork for every tiny edit.

Durable storage does not promote a claim into an accepted fact. Failed attempts, proposals, and uncertain findings retain their evidence and status. Accepted corrections belong with the existing owner of that project fact, decision, or convention; they do not require a second universal constraints file.

Preserve the README's recorded storage policy: durable records are eligible for version control by default, while an existing docs-ignored owner override retains explicit transfer. Commit eligible records at authorized meaningful checkpoints. Uncommitted files do not automatically travel to another worktree or machine. Bring the corresponding commits into the destination explicitly before continuing there. Never rely on a missing local artifact as the only evidence of an accepted decision.

For LucentDev phase work, CLAUDE.md Project Status remains authoritative for phase progress. Phase direction briefs and reports supplement it; do not create a competing phase-status table. The project reference defines those paths and compatibility handling.

Session boundaries remain flexible. The coordinating lead reconciles shared state and explicitly transfers coordinating ownership if another lead takes over; a fresh reviewer does not replace that conversation. Role files define operational continuity; an installed handoff skill can help but is not the only way to preserve state.

Resume from current task state and applicable evidence. Settled work may be reused only while its requirements, implementation inputs, dependencies, environment, and evidence remain applicable; changed inputs require affected verification to be refreshed. Once the authorized implementation outcome and required verification are satisfied, implementation stops expanding and proceeds to any required review. An investigation stop condition or an explicitly agreed cap preserves partial results and the next action; reaching it does not establish completion or waive acceptance requirements.
