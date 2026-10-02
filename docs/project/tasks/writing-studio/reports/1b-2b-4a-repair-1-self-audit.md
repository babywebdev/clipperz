---
record: "self-audit"
task: "writing-studio"
cycle: "1b-2b-4a-repair-1"
spec_revision: "lead-27"
snapshot: "_local/project/evidence/writing-studio/1b-2b-4a/repair-1/snapshot/manifest.json"
author: "agent"
date: "2026-09-23"
state: "active"
summary: "PASS-WITH-FINDINGS: the audio-only road now refuses revision-tree sinks before any write; three nonblocking observations on shared-temp scratch names and temp-folder parity."
read_when: "Assessing the WS-23 audio-only repair of Writing Studio 1B.2b.4a or planning shared-temp hardening."
evidence: "_local/project/evidence/writing-studio/1b-2b-4a/repair-1/"
workflow_version: "5.0.0"
instruction_inventory: "docs/workflow/inventories/5.0.0-local-1.md"
---

# Self-audit: writing-studio / 1b-2b-4a-repair-1

## Identity and scope

- Author/session and context: the repair-1 implementation writer (Claude Code desktop, claude-opus-5-5), fresh context; auditing its own repair. This is not independent review.
- Spec revision and assessed snapshot: lead-27; base `fed8ed13...` plus `repair-1/snapshot/manifest.json` (`84c74067...`).
- Changed paths and relevant dependencies: the four files of `snapshot/1b-2b-4a-repair-1-delta.patch`; dependencies read: `clips_history.revision_path_verdict` and `assert_outside_revision_trees`, `audio_events._read_waveform_16k_mono`, `remotion/render-audiogram.mjs`, `backend/main.py` create and batch handlers, the rerender handler and `bridgeFenceRefusal` in `src/ui/web-server.ts` and `src/ui/clip-write-fence-route.ts`.
- Environment/target and evidence: as in the implementation report; `final/` receipts.
- Scope limits: no browser run (no UI change); Linux and macOS behavior of junction fixtures not exercised (Windows is the supported profile).

## Cleanup sweep

| Location/snapshot | Classification | Evidence and consequence | Proposed outcome |
|---|---|---|---|
| `audiogram.py`, `clip_generator.py` delta | none | `Callable` is used; no dead branch, debug output or duplicated naming rule; the hook is the only new abstraction and keeps one derivation | none |
| `tests/test_revision_fence.py`, `check-legacy-adapters.mjs` delta | none | new helpers used by every new test or row; no leftover probes | none |

## Audit lenses

| Lens | Assessment and evidence, or N/A reason | Finding/uncertainty and required outcome |
|---|---|---|
| Critical correctness | The hook runs after `out_dir` and `final_path` are computed and before `os.makedirs`, the waveform read, `mkdtemp` and Remotion; the checked values are the same objects later written. Exact audio-only still raises `ExactRenderError` before the hook. The unit tests prove no stubbed stage ran on refusal; the real probe shows no namespace change. | none |
| Security attack paths | Actor: a local process or caller able to plant links in an outside output folder or pass an `output_dir` through the bridge, MCP `create_clip`, batch or rerender after a title change. Sink: owned revision media. Now refused after link resolution, case-insensitively, fail-closed on unresolvable targets (verdict helper reused). Residual: names written directly in the shared temp folder are not knowable before the write (A-1); post-check swaps and hard links stay U-1. | A-1, A-2 observations |
| Test coverage | Unit: derived-name links (3 kinds plus a renamed title), folder junction, case variant, namespace, missing root, default `<cwd>/output`, temp folder, control. Real: 3 callers plus controls; tests shown to fail on pre-edit code. The temp-folder and default-folder refusals are unit-only; no real row plants the process temp folder in the trees. | nonblocking; a real temp-folder row would need a server started with its temp inside the namespace |
| Dependencies and supply chain | N/A: no dependency, lockfile or pinned executable changed. | none |
| Failure paths | Refusal raises before any write, so nothing needs cleanup; batch records a per-clip error and continues; rerender answers 409 and leaves history untouched (hash-tree assertion). "No audio to draw" still raises after the folder exists, as before. | none |
| Breaking changes and migrations | `render_audiogram` gains an optional keyword with default `None`; its only production caller is `generate_clip`; existing tests call it without the keyword and pass. An audio-only render whose temp folder lies in the trees now refuses, which is intended. | none |
| Documentation drift | Docstrings updated; no user-facing doc describes audio-only output paths. | none |
| Accessibility | N/A: no UI change. | none |
| Observability | Same `ClipRevisionFenceError` code and wording as the video road; rerender logs the fence refusal path-free (check asserts every refusal line). | none |
| Engineering invariants | Exact mode, reader, composer, Cleanup, `backend/main.py`, all TS and `dist` unchanged (protected-sources row); CLI and MCP behavior unchanged apart from the refusal; the video road's rows still pass. | none |

## Confidence and blind spot

- Material uncertainties and investigation: whether another legacy hand-off exists. Resolved by the inventory: `output_dir` and `title` reach disk only through the audio-only hand-off and the publication block (`sink-inventory.md`). Whether Node's temp folder matches the checked Python folder: in the supported profile `scripts/local/runtime.mjs` sets TMP, TEMP and TMPDIR together (A-3).
- Biggest blind spot: shared-temp scratch across both roads. A folder-level check cannot stop a link pre-planted at a Remotion scratch name that is derived from the output path and a process ID.

Observations (nonblocking, for the task-state owner):
- A-1: the Remotion silent video (`os.tmpdir()/audiogram_<md5(output:pid)>.mp4`) and the waveform WAV are written directly in the shared temp folder under names unknown before the write. The folder is checked; the WAV is created exclusively; a planted pid-named link is the U-1 post-check class.
- A-2: the video road's shared-temp scratch (caption `.ass`/`.png`, encoder temporaries, Remotion overlay `.mov`) stays unchecked when an output folder is given, as lead-26 accepted. The audio road now checks the temp folder, which is stricter.
- A-3: the checked temp folder is Python's `tempfile.gettempdir()` (TMPDIR first); Node's `os.tmpdir()` on Windows reads TEMP. They differ only if the environment sets them apart, which the supported profile does not.

## Verdict and next action

- Verdict: PASS-WITH-FINDINGS
- Findings and dispositions: A-1..A-3 nonblocking: they are residual classes the lead-26 WS-23 requirement did not cover or that U-1 already accepts; none lets the reproduced F-1 triggers write. The task-state owner decides whether to index A-1/A-2 as a later hardening item.
- Next action and owner: the task-state owner arranges the focused fresh non-author assessment on `84c74067...`.
- Evidence validity after changes: no change after the final checks; the snapshot is current.
