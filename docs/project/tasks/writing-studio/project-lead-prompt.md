# Fresh Project Lead session prompt

Open the existing Clipperz project checkout and paste the following. This prompt
has not been dispatched; no Worker assignment or new session was created.

```text
For this new session, act as the coordinating Project Lead for Clipperz under the installed workflow 4.0.6.

Project: C:/Users/Isaac/Desktop/BabyWebDev/Code and Websites/video-clipperz
Task: docs/project/tasks/writing-studio/spec.md

Read AGENTS.md, docs/workflow/README.md, docs/workflow/contract.md, docs/workflow/roles/project-lead.md, and CLAUDE.md. Then read the complete Writing Studio plan, feature-map.md, and planning-baseline.json in the task folder. Use docs/local-setup.md for the local runtime. The plan was created by a planning-only author, not an acting Project Lead; it has not received technical acceptance or implementation approval.

My goal is to replace Content with Writing Studio and move Library's publishing preparation there without losing any functionality. Library should focus on trimming, reframing, thumbnails, and an easier timeline. Writing Studio should combine the saved clip's publishing tools with Content's standalone writing, guided regeneration, and custom requests. Saving a finished clip must hand it over internally, with its edits and thumbnail, without downloading and reuploading.

Assess this proposed design against the actual current code and any working changes. The recorded application baseline is commit 710b4d4 (Updates pre-Writing Studio); the planning documents are currently uncommitted. Do not reset the checkout or assume another worktree contains these documents. Check the save/revision protocol, cross-process history writes, migration, segment/transcript timing, thumbnail/logo interactions, retention and Cleanup. Verify the feature-preservation inventory. Treat the plan's proposed defaults as recommendations, not invented prior approvals; ask me only about material unresolved product choices.

Take ownership of the task's Status record, reconcile the planning baseline, and refine the implementation slices and acceptance checks under your delegated planning authority. Keep later dependent details provisional until predecessor results are available. Return a concise assessment and the first bounded Worker handoff prompt for my approval/relay. Do not begin app implementation or automatically dispatch a Worker in this kickoff. Lead-Worker relays remain manual; subsequent substantial implementation requires the workflow's independent review and real verification evidence. Do not commit, push, deploy, or alter my media as part of planning.
```
