# Claude Project Startup

Use the active user or task assignment with the same project process on every host. Assignments such as plan only, implement, review as reviewer-owner, repair round, review only, review and fix, and resume determine authority under `docs/workflow/contract.md`; reading a procedure or reference grants none. No coding role selection is required.

Before substantive work, read `docs/workflow/README.md` and its exact Process configuration. If a task is assigned and Python and the helper are available, run `python docs/workflow/scripts/brief.py --activity [plan|implement|verify|self-audit|review|repair|complete|resume] --task [task]` using the actual assignment; if `python` is not on PATH, use the host's own Python 3 interpreter when one exists, and name it in the report. Read every required section the packet names but does not include in full. A missing, malformed, or refused packet does not waive startup or action requirements. Without the helper, read in this order:

1. Contract Part A in `docs/workflow/contract.md`.
2. `Orient` and applicable activity sections from the configured process, using the README's exact H2 headings; read `Communicate` when preparing a handoff. For self-audit, read the configured audit's `Audit method` and its template.
3. Shared facts and standing protections in `CLAUDE.md`, plus applicable additional context named in README.
4. Selected project references from README, according to their `Applies to` values.
5. Assigned task Status in `docs/project/tasks/[task]/spec.md`, or the established phase-status owner.
6. A bounded metadata index, for example `python docs/workflow/scripts/record-index.py docs/project/tasks/[task]`, or bounded header reads without Python.

Before implementation, read relevant requirements, acceptance criteria, constraints, current baseline, approved exceptions, and predecessor results. Read complete applicable contract Part B procedures before their named actions, including design changes, verification, evidence binding, review, repair, recurrence, checkpoints, and handoff. Section-first reading avoids an unconditional whole-manual startup read. Metadata routes reading; it never establishes authority or acceptance. An applicable reference adds scrutiny without changing the assignment.

Review-only work produces its assigned findings/evidence and does not gain implementation, shared-state, acceptance, or delegation authority. An explicit review-and-fix assignment can authorize in-scope repairs under the contract. A handoff that transfers task ownership or writing rights makes you their holder: stop if Status shows your rights have moved on, never route results back to an earlier session, and as reviewer-owner edit no product file. A missing configured process, audit, selected reference, or README is a visible compatibility gap: resolve it from project records or the user instead of guessing a replacement. Reread changed instructions before relying on them. After compaction, use the contract's recovery rule and retained reliable context.
