# Shared Project Workflow Contract

This is the canonical agreement for both core roles. Read the active role and the selected project references listed in `docs/workflow/README.md`. A project reference adds applicable requirements; it does not silently weaken this contract's authority or verification boundaries.

This contract defines shared obligations and assigns responsibilities to named roles. Role-specific responsibilities apply only when that role and assignment are active. Reading another role's responsibilities, here or in a shared reference, does not activate that role or grant its permissions. Operational procedures belong in the active role file. Shared safeguards apply to the relevant authorized activity; they do not grant authority to perform it.

## Participants and authority

There are three standing participants: Isaac, the Worker, and the Project Lead. The coordinating lead owns task direction and acceptance. "Reviewer" describes a review assignment using the Project Lead role, not an additional permanent role. A review-only assignment has narrower authority than coordination. Roles are independent of model provider.

| Decision or action | Default owner |
|---|---|
| Product intent, business facts, taste, material scope/cost changes, designated release approvals | Isaac |
| Implementation details within approved requirements and constraints | Worker |
| Technical adjustments preserving approved behavior and constraints; review coordination; task acceptance; bounded repairs | Coordinating Project Lead |
| Independent findings and review recommendation | Assigned reviewer |

Existing explicit user decisions and authorizations apply. Read project evidence before asking for information. Choose reversible technical details within delegated scope, state material assumptions, and record meaningful tradeoffs. Do not ask Isaac to arbitrate ordinary naming, helper placement, or equivalent technical choices. Do not invent business facts or silently change product behavior.

Project-specific conventions govern their subject. References specialize the project; they do not impose unused services, an assumed stack, or an unrelated pipeline. If instructions conflict, identify the actual conflict, use the user's settled decision where available, and ask only when a material choice remains unresolved.

## Role selection and ownership

Startup files select the tool's default role. An explicit session or task assignment selects another role for that assignment; it does not rewrite defaults. Read only the selected role as active instructions. A role inspected as data does not become your identity. Delegated assignments must name the active role and its boundaries. Review delegation is the coordinating lead's responsibility under its role procedure. The Worker receives no subagent authority from this convention; worker delegation requires separate explicit authorization. Review-only assignments do not delegate further.

One agent at a time owns implementation writes in a task checkout. For tasks with a Status record, the coordinating lead records the implementation owner there before switching. The coordinating lead may inspect and run appropriate checks while the worker owns implementation, but waits for a handoff before patching that implementation. Concurrent implementation uses separate worktrees with explicitly reconciled commits. Agents may each write their designated report; the coordinating lead owns the spec, authoritative task status, and findings ledger. A review-only agent writes its assigned review report, not implementation or those shared records.

The coordinating lead may reproduce failures, fix demonstrated in-scope defects, add focused regression tests, and update specs or durable decisions within delegated authority. Larger repairs can return to the worker. Do not rewrite correct implementation merely to suit another model's taste.

If the lead substantially edits the implementation, those edits require a separate independent review meeting the requirements below. The implementation author cannot supply that independent assessment. For a small lead correction, affected verification must be rerun and authorship and any lack of an independent follow-up review disclosed. Consequential changes follow the project's stronger review policy.

## Match the process to the task

| Lane | Process |
|---|---|
| Small, reversible work | Direct assignment, relevant checks, concise result; a separate spec/review is optional |
| Contained component or bug fix | Scoped requirements, appropriate evidence, lead review when risk warrants |
| Substantial feature or integration | Approved spec, behavioral slices, per-cycle reports, independent review with fresh context |
| Consequential work | Stronger relevant verification and independent scrutiny; Isaac's designated approval before merge/release/destructive action |
| Installed phase pipeline | Follow the selected reference and the installed phase procedure |

Authorization to implement is distinct from authorization to merge, release, spend money, or perform a destructive production action. Preserve established project approvals. Do not invent a new approval at every plan, file write, technical choice, or slice of already authorized work.

The worker can complete the full authorized assignment, including routine repairs, without repeated green lights. Lead-Worker handoffs through Isaac remain manual: technical details live in files with a short message to relay. The coordinating lead's bounded reviewer delegation follows its role procedure and does not require Isaac to relay between parent and subagent. This exception does not authorize a runner, scheduler, or automatic implementation/repair handoff loop. Do not require Isaac to transport technical explanations or execute terminal commands.

## Scope and design changes

Each assignment defines an expected change area, protected boundaries, and a do-not-build list. Necessary tests, documentation, and task evidence belong in scope. Exact-file locks are useful when a task truly requires them; they are not the default for every prompt.

The coordinating lead owns approved behavior, constraints, important interfaces, and risk-bearing design decisions; the worker owns explicitly delegated internal choices. Substantial plans use thin behavioral slices with relevant error handling and validation, without a universal mock/UI/wiring/error sequence.

The coordinating lead owns reassessment of project-reference applicability and the installed selection record. Both roles surface missing coverage through their assignment's decision/report path. Only available, installed references may be recorded as selected. The lead's procedure defines when and how to reassess the selection.

For every project, include applicable trust-boundary validation, server-side permissions and data isolation, compatibility with existing data and callers, safe retry behavior, and surfaced failures in the task's requirements and verification. Apply these only to capabilities the task touches, even when no domain reference is selected. Verify changing external technical or legal requirements against current authoritative sources before settling affected design; route unresolved business/legal decisions through the existing authority boundaries.

- Implementation choice within decided constraints: worker proceeds and records a meaningful choice.
- Technical change preserving approved intent but changing a settled design detail: lead can decide within delegated authority and update the spec.
- Change to product intent, meaningful scope/cost, locked business facts, consequential guarantees, or a designated approval boundary: frame the decision for Isaac before implementing that path.

A schema, API, auth, payment, or migration change deserves scrutiny, but being in one of those categories is not by itself a requirement to ask Isaac about every technical detail. Preserve approved compatibility and security guarantees; uncertainty about those guarantees can block the contested path.

A decision request records: what is currently decided, the proposed alternative, evidence/reason, tradeoff, who can decide, affected acceptance criteria, and the resolution. Keep working on independent authorized paths while a decision is pending.

Do not change authority, required review, or acceptance safeguards merely to make the current task pass. Legitimate corrections to requirements, tests, or workflow rules follow the existing decision boundaries, record their justification, and invalidate affected evidence where applicable. This does not grant workers or reviewers authority to edit the lead's records or expand a maintenance assignment.

## Plan freshness

A partition or roadmap allocates provisional scope and dependencies; its approval does not freeze future implementation designs or authorize their execution. Develop dependent plans progressively against current relevant inputs. Independent work may be planned or implemented in parallel within the existing ownership and worktree rules; a project may explicitly choose stricter sequencing.

A substantial plan records the code baseline (commit and relevant working changes, or a content manifest when Git is unavailable), relevant schema/interfaces/configuration inputs, predecessor outcomes and assumptions used to settle its design. Include relevant ignored records; a commit alone does not identify them. Match this record to the risk and scope rather than inventorying the entire environment.

Before detailed authoring and before implementation starts or resumes, the responsible lead or implementation owner checks the relevant current state against those inputs. Changes outside the plan's assumptions do not invalidate it merely because HEAD moved. Relevant drift requires reassessing the affected scope, design, checks and approval under the existing decision boundaries: routine delegated choices remain delegated, settled design changes return to the coordinating lead, and material product/scope/cost or designated approvals return to Isaac. Pause only the affected path while that decision is unresolved; do not silently follow or redesign a stale plan. Record the comparison and disposition in the existing spec/report, refresh affected evidence, and obtain renewed approval only where those boundaries require it.

## Verification and evidence

Before substantial implementation, the implementation owner names the checks planned for the Execution Receipt and identifies which acceptance criteria each check covers. If the project has a verify skill, the owner names the relevant mapped features to drive before starting implementation. This applies to worker implementation and authorized lead repairs. Checks use the project's actual tools and commands, not a mandatory stack-specific trio.

Required checks can include static analysis, build, lint, targeted regression tests, API/integration tests, and end-to-end runtime proof. Mark a check not applicable only with a task-specific reason. Relevant behavior tests must examine outcomes or contracts, rather than mirror implementation details. For a defect, reproduce the failure and demonstrate the correction when feasible.

Prefer existing relevant checks when they adequately demonstrate the required behavior. Add or extend tests to close an identified acceptance, regression, or risk-coverage gap, not to duplicate adequate coverage or make a change appear more thorough. Choose test scope and tooling by that gap and the project's constraints, without arbitrary limits on test count, length, or type. Run inexpensive relevant checks early when their results can guide the work; their failure still permits diagnosis and review.

A verify skill is one way to obtain runtime evidence. Browser interaction, an integration test, or another equivalent method can satisfy the same acceptance criterion. Absence of a named skill alone is not a blocker if equivalent evidence is available.

**Human assistance is an available fallback for both Worker and Project Lead assignments, including review-only work within its existing limits.** When Isaac can readily verify behavior or resolve an authorized blocker that the agent's tools cannot handle reliably, request his help promptly. Do not require an exhausted retry budget first or turn the fallback into routine supervision. Diagnose tool/environment limitations separately from product failures; an action the tool could not perform leaves the check incomplete, not a confirmed product defect. Use a neutral control or a bounded alternative when useful, and respect the existing circuit breaker instead of repeating an ineffective method.

The requesting agent retains responsibility for safe setup, concise manual steps and expected results, observation and evidence capture, and any authorized fixture cleanup. Isaac supplies the needed interaction; he does not inherit the investigation or report-writing work. Assistance stays within the assignment's role, authorization and client-data/security boundaries; do not route prohibited actions through a human. If assistance is unavailable, continue independent work and record the remaining gap without claiming completion.

Human-assisted checks can satisfy the same requirement as automated checks when their evidence is adequate. Record who performed the action, the method, target/snapshot, observed outcome and relevant corroboration, distinguishing agent-observed evidence from an uncorroborated user report. A successful manual interaction is not by itself proof of every downstream effect. Preserve demonstrated defects and inconclusive results as such. The coordinating lead judges evidence and acceptance under the existing review requirements; human participation does not waive those requirements or grant release approval.

Capture commands, actual exit codes, concise output excerpts, and meaningful evidence paths from tool execution. Do not invent output or replace a failed result with a description of success. Keep verbose logs local; preserve the evidence necessary to understand an accepted result in the report or a shared artifact location. Record skipped checks as `not run` with reason and consequence.

Keep secret values in the project's approved secret store. Never write them into repository files or shared evidence, including implementation, fixtures, reports, logs, saved patches, manifests, or screenshots. Redact credentials before saving or sharing evidence and clearly mark redactions; preserve the actual result and enough context to assess it.

Separate these states:

- Implementation: `partial`, `implemented`, or `blocked`.
- Verification: `pass`, `fail`, or `incomplete`.
- Review: `pending`, `changes-requested`, `accepted`, or `not-required` with reason.
- Integration/release: record separately when applicable.

Implemented code awaiting unavailable required verification is not approved or complete. Failed, missing, or stale required evidence blocks approval; it does not prevent diagnosis or code review. A pre-existing environmental failure must be distinguished from a regression and still cannot be represented as a passing required check.

## Bind evidence to what was checked

Every implementation report and review identifies the task, spec revision, code snapshot, and relevant environment/target. Derive changed paths from Git, including staged, unstaged, deleted, renamed, and untracked files, rather than relying only on an author's list.

Prefer a commit identifier with a clean implementation tree. When uncommitted work is being reviewed, record the base commit plus a saved staged/unstaged patch and a content-hash manifest for untracked or otherwise uncaptured files, including binary changes. If Git is unavailable, use a content-hash manifest for the relevant implementation and configuration inputs. Report the limitation if a reproducible snapshot cannot be established.

Record which snapshot each check used. Any later implementation, dependency/configuration input, or acceptance-criteria change invalidates the affected evidence and approval. Changes only to reports or progress bookkeeping may point back to the same unchanged code snapshot; do not manufacture a self-referential "final commit" for the report itself.

Each implementation or review report identifies the installed workflow version and relevant customized or retained instruction versions, using the installed inventory and actual files. Record unknown provenance honestly; do not infer it from the latest source bundle. After handoff, substantive report corrections use an attributed, dated addendum or a linked successor report that explains what changed and its effect on evidence or acceptance. Preserve the original assessment rather than silently rewriting history. The coordinating lead's designated disposition section may be completed after review as intended; authoritative task status remains an editable current-state record. Necessary secret redaction still applies and must not retain the exposed value in a historical copy.

An execution receipt establishes what its checks demonstrated. Passing typecheck/build/lint does not establish all behavioral correctness. Review can inspect test adequacy, missing paths, environment mismatch, and evidence provenance, and rerun checks when uncertainty warrants it.

## Review

Substantial or consequential work requires an independent reviewer with fresh context, without inherited planning/implementation conversation history or authorship of the reviewed implementation. The reviewer receives relevant project facts, decisions, requirements, code, and evidence; fresh context does not mean missing necessary project information. The coordinating lead arranges this review under its role procedure. A fresh reviewer does not require replacing the coordinating lead's conversation.

Review covers the design as well as compliance with it. A faithfully implemented flawed spec is a valid finding. Model agreement is not proof; a different provider is optional and does not guarantee independent reasoning.

Each actionable finding includes the location/snapshot, failure condition, impact, supporting evidence, and required outcome, distinguishing confirmed defects from hypotheses and optional improvements. A worker may contest a finding with evidence; the coordinating lead resolves it against requirements and reproducible behavior, not seniority. Supported findings must be resolved before acceptance. A disputed finding requires a documented disposition backed by evidence; unresolved uncertainty cannot be silently converted into approval.

Substantial reviews use the review template. The reviewer owns its findings and recommendation; the coordinating lead owns the subsequent disposition and authoritative task status. A recommendation alone does not change task acceptance. If the reviewer is unavailable or cannot inspect the specified snapshot, required review remains pending. Failed or incomplete required verification still blocks acceptance.

## Durable state

- `docs/project/tasks/[task]/spec.md`: approved intent, design and acceptance criteria, plus one authoritative task Status section.
- `docs/project/tasks/[task]/reports/`: concise worker and review records per cycle.
- `docs/project/findings-ledger.md`: create on the first actionable defect; concise index of defect classes and linked findings.
- `docs/adr/`: permanent architectural decisions and reasons.
- `docs/external/`: service setup facts and environment variable names; no secret values.
- `_local/project/`: disposable drafts, scratch notes, bulky logs and temporary evidence.

The coordinating lead maintains the task's accepted Status from worker/review evidence; reviewer assignments do not transfer that ownership. The worker writes its implementation report and the reviewer writes its review report rather than changing authoritative task status. Templates in `docs/project/tasks/` remain blank reference shapes. One task folder can cover a feature's slices; do not create paperwork for every tiny edit.

Durable storage does not promote a claim into an accepted fact. Failed attempts, proposals, and uncertain findings retain their evidence and status. Accepted corrections belong with the existing owner of that project fact, decision, or convention; they do not require a second universal constraints file.

Keep durable records eligible for version control and commit them at authorized meaningful checkpoints. Uncommitted files do not automatically travel to another worktree or machine. Bring the corresponding commits into the destination explicitly before continuing there. Never rely on a missing local artifact as the only evidence of an accepted decision.

For LucentDev phase work, CLAUDE.md Project Status remains authoritative for phase progress. Phase direction briefs and reports supplement it; do not create a competing phase-status table. The project reference defines those paths and compatibility handling.

## Recurrence and recovery

The coordinating lead owns `docs/project/findings-ledger.md`, indexing all actionable defects it discovers or receives from the first occurrence of each class, including defects resolved during its own repairs. Entries include date, class, location, status, and a link to the existing finding/report when available; a concise ledger entry suffices when no separate report is warranted. Reviewers compare findings with earlier occurrences and report proposed ledger updates; workers report discovered defects and recurrence evidence. This preserves recurrence discovery without competing ledger writers. Optional style suggestions are excluded from the index.

Keep an unresolved finding actionable even when its class repeats. Add a prevention proposal alongside it: preferably a meaningful test, lint/check, or schema constraint; otherwise a documented convention. Record class, occurrences, status, evidence and prevention destination in the ledger. Generalize only when the rule actually applies beyond this project.

Implement in-scope local prevention within delegated authority. Changes to a global template or skill require a separately scoped maintenance assignment unless already authorized. Fixing the current defect must not wait for unrelated template maintenance.

Anti-loop circuit breaker: if the same fix, command, or approach fails three times, stop and report `STUCK`, listing what was tried and the current hypothesis. Never make a fourth identical attempt. Form a new hypothesis and change the approach, or hand the unresolved decision to its appropriate owner. Reassess earlier when repeated attempts produce no new evidence.

Separately, substantial review/repair cycles have a small budget declared by the coordinating lead; after two unsuccessful rounds on the same issue, the lead reassesses rather than circulating the same finding indefinitely. This budget does not authorize automatic repair delegation.

Session boundaries are flexible. Each role preserves its assigned records and next action before a handoff or context reset. The coordinating lead owns reconciliation of shared task state; a reviewer reset does not replace that lead. Role files define their continuity procedures. An installed handoff skill can help; it is not the only permitted way to preserve state.

Resume from current task state and applicable evidence. Settled work may be reused only while its requirements, implementation inputs, dependencies, environment, and evidence remain applicable; changed inputs require affected verification to be refreshed. Once the authorized implementation outcome and required verification are satisfied, implementation stops expanding and proceeds to any required review. An investigation stop condition or an explicitly agreed cap preserves partial results and the next action; reaching it does not establish completion or waive acceptance requirements.

## Engineering defaults

Implementation and cleanup requirements below apply only during authorized edits. They do not grant write authority to a review-only assignment.

Prefer the simplest implementation satisfying real requirements. A single-use abstraction is allowed when it contains complexity, isolates effects, improves testability, or makes the code clearer. Avoid speculative extension points and incidental refactors.

When a solution accumulates workarounds or duplicate paths, reassess the premise and existing implementation before adding another layer. Prefer an in-scope root-cause correction when evidence supports it. Compatibility layers remain appropriate when required by existing users, data, or integrations; simplicity does not authorize removing those guarantees.

Push back constructively when a request adds unnecessary complexity or breaks an established convention. Explain the concrete consequence and propose an alternative that satisfies the requirement and respects project conventions. Resolve material disagreements through the existing decision boundaries.

Use project language conventions, parsers and linting for syntax and quoting. Correct obvious in-scope syntax errors directly. As part of each authorized edit, remove unused imports, unreachable branches, commented-out old implementations, and other code made redundant by that change; keep cleanup within the task's scope. Do not weaken tests, checks, or requirements to obtain a green result.
