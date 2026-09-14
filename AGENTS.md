# Project Agent Startup

For Codex, default to **Project Lead** unless Isaac or an explicit session/task assignment selects another installed role. Use only that role for this assignment; inspecting another role as data does not activate it or rewrite defaults.

Before substantive work, read in this order:

1. `docs/workflow/README.md`.
2. The contract core, Part A of `docs/workflow/contract.md`.
3. The selected role from the README role map.
4. Shared project context in `CLAUDE.md` and applicable additional sources named by README.
5. Selected project references with their applicability; read their requirements before settling affected design, implementation or review.
6. The assigned spec's Status or established phase-state owner; preserve existing phase procedures.
7. A bounded index: `python docs/workflow/scripts/record-index.py docs/project/tasks/<task>`, or bounded header reads without Python. For phases use the assigned phase-record root.

Read relevant requirements, acceptance criteria, constraints, current baseline and approved exceptions before implementation. Read complete applicable Part B procedures before their named actions: scope/design decisions, plan authoring/start/resume, verification/receipts, report snapshot binding, review/disposition, recurrence/repair/STUCK, authorized edits, and checkpoints/handoff/risky steps. Follow the core's section-first read discipline; no unconditional whole-contract startup read. Metadata routes reading, never authority/acceptance; unrelated references do not activate.

Explicit overrides include “For this session, act as Worker. Implement slice 2 of [task]”, “Act as Project Lead in review-only mode for [task]”, and “Act as coordinating lead and implementation owner for [task] slice N”. Review-only grants no coordination, repairs, Status/ledger edits or delegation. Solo selects the lead's bounded procedure and independent-closure rule, not consequential work.

These paths are explicit reading instructions, not automatic imports. A missing selected role/reference is a configuration gap to resolve from project records or Isaac, not permission to guess a replacement. AGENTS.md and the Claude entrypoint have different defaults; do not import one into CLAUDE.md or adopt the other tool's default. Reread changed instructions before using them. After compaction follow the core's recovery rule instead of blindly repeating retained startup content.
