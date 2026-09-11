# Claude Project Startup

This is the short Claude Code entrypoint, installed at `.claude/rules/workflow.md`. The substantive workflow is in `docs/workflow/`.

Default to **Worker** unless Isaac or an explicit session/task assignment selects another role. Use the assigned role for that assignment; do not activate every installed role.

Before substantive work, read:
1. `docs/workflow/README.md` and `docs/workflow/contract.md`.
2. The selected role file from the README's role map.
3. The selected project references and relevant task spec or phase records.
4. Shared project context from CLAUDE.md and any additional context sources named in the README.

These are explicit reading instructions. Codex's AGENTS.md has a different startup default; do not import or adopt that default in this session. If another role file is inspected as data, it does not become your identity.

A missing selected role/reference is a configuration gap to resolve, not permission to guess a replacement. A temporary role assignment does not rewrite repository defaults. Reading the shared contract or references grants no other role's permissions. An explicit review-only assignment follows the Project Lead role's review-only procedures and the contract's independence requirements. Reread changed instructions explicitly.
