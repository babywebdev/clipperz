---
record: "external"
author: "coordinating-lead"
date: "2026-09-16"
state: "active"
summary: "Restored generation by refreshing the obsolete local Codex executable pin and restarting idle Studio."
read_when: "Diagnosing missing AI executables after desktop client updates."
---

# AI client pin repair

Codex coordinating lead owned this bounded configuration repair at Isaac's request.
No application implementation or Writing Studio task files were changed.

The configured Codex directory `7ac07f4ce733f89a` no longer existed. The installed
client was in `12219cbfbcbddde7` and reported `codex-cli 0.154.0-alpha.6.2`.
Only `PODCLI_CODEX_PATH` in the ignored local configuration was replaced with
the verified absolute executable path. No credentials were copied or changed.

Verification performed by the lead under the normal Windows account:

- Installed executable `login status`: exit 0, signed in using ChatGPT.
- Configured Python runner invoked the existing `services.strict_ai.run_client`
  with the synthetic prompt `Return exactly CLIPPERZ_OK`: exit 0, exact answer
  `CLIPPERZ_OK`. Receipt: `_local/installation/logs/ai-pin-smoke.log`.
- Verified Studio PID 28620 belonged to this installation, was idle, had no active
  export and no child processes; restarted using the configured launcher.
- Health returned Studio PID 52492. `/api/ai-cli-status` returned the corrected
  pin and `available: true`. The session retained all 2,736 transcript words.

Implementation: implemented (local configuration). Verification: pass for Codex
generation and running Studio configuration. Review: not-required for this small
reversible configuration correction; no independent review performed. Integration:
applied to the local running instance. Claude fallback sign-in remains unavailable
as originally reported; restoring Codex did not require changing Claude credentials.

Prevention: the client-update procedure in `docs/local-setup.md` explains explicit
repinning and idle restart. Automatic executable discovery remains disabled.
