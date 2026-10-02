---
record: "self-audit"
task: "writing-studio"
cycle: "1b-2b-4a"
spec_revision: "lead-26"
snapshot: "_local/project/evidence/writing-studio/1b-2b-4a/snapshot/manifest.json"
author: "agent"
date: "2026-09-23"
state: "active"
summary: "PASS-WITH-FINDINGS on snapshot 6391643c: no blocker; nine nonblocking observations disposed, including reader wording drift, probe diagnostics and pre-existing Windows test flakes."
read_when: "Reviewing 1B.2b.4a adapters, WS-23 sink checks, or deciding follow-ups for 1B.2b.4b, 1B.2b.5 and 1B.3."
evidence: "_local/project/evidence/writing-studio/1b-2b-4a/"
workflow_version: "5.0.0"
instruction_inventory: "docs/workflow/inventories/5.0.0-local-1.md"
---

# Self-audit: writing-studio / 1b-2b-4a

## Identity and scope

- Author/session and context: the 1B.2b.4a implementation writer (Claude Code desktop, claude-opus-5-5), auditing its own code; continued context. Not an independent review.
- Spec revision and assessed snapshot: lead-26; base `fed8ed13dcb2aade06bee341953d6b10d58bff13` plus `snapshot/manifest.json` (sha256 `6391643cd9c6c49bc0ca1bd0052bcfdb425cad13252be37974eb5146a5b4c5c0`).
- Changed paths and relevant dependencies: the slice delta `snapshot/1b-2b-4a-slice-delta.patch` (15 modified files against verified pre-edit copies, 3 added), which includes the D-2 update of `src/ui/editor-context-route.test.ts`; callers and neighbours read: `clip-write-fence.ts`, `clips-history.ts`, the reader, `python-executor.ts`, `backend/main.py`, `opening_card.py`, `exact_render.py`, `ClipDetail.tsx`, `policy.ts`/`policy.py`, `ai_cli.py`/`strict_ai.py`.
- Environment/target and evidence: Windows 11 Home 10.0.26200, Node v24.21.0, Python 3.14.3, FFmpeg 8.1.1; built `dist`; evidence under `_local/project/evidence/writing-studio/1b-2b-4a/`.
- Scope limits: no browser or Studio client run (none claimed); dependency advisories not assessed because no dependency changed.

## Cleanup sweep

| Location/snapshot | Classification | Evidence and consequence | Proposed outcome |
|---|---|---|---|
| Changed TS files | none | `tsc --noEmit --noUnusedLocals --noUnusedParameters` reports nothing in them | none |
| `check-legacy-adapters.mjs`, `clip-write-fence-route.test.ts` | none | unused helpers removed before the final run (`isBlack`, a dead assert); two escapes the editing tools had stored as literal em dashes rewritten as escapes (superseded-2) | none |
| `web-server.ts` logo handler DEMO arm (O-1) | needs decision | the unreachable `DEMO ?` arm remains; removing it changes a wiring test expectation for no behavior gain | leave; optional |
| `clip_generator.py` `_refuse_revision_sinks` | none | single-use helper; isolates the lazy import and states the WS-23 rule | keep |

## Audit lenses

| Lens | Assessment and evidence, or N/A reason | Finding/uncertainty and required outcome |
|---|---|---|
| Critical correctness | Traced each adapted route: fence passes the checked tracked entry (`adaptedClip`), `prepare` checks base and busy state, `commit` derives from the loaded document, `saveRevision` re-checks expected state under the lock. Concurrent requests: the second answers `REVISION_BUSY` (pending or version changed). Equal requests write nothing (history bytes identical in the check). | Nonblocking: A-4 title write is a second step after the style commit; A-5 an unchanged request keeps a pre-slice stale `preview_path` until the next commit. |
| Security attack paths | Actor: a local Studio client. Inputs: style (allowlist), logo path (resolved asset, policy refuses URLs, renderer requires a regular file; same trust as the legacy route), thumbnail pick (must be a stored variation), frame (allowed roots). Writes: only the save service's owned groups and the path-fenced thumbnail folder. WS-23: planted symlink, junction and dangling link at derived and suffixed names refused before any sink write (`final/legacy-adapters-result.json`, Python `LegacySinks`). Bodies and logs path-free. | None. U-1 (hard links, post-check swaps) remains the accepted static limit. |
| Test coverage | 39 adapter tests, route dispatch tests, 5 Python sink tests (link kinds as subtests), the real HTTP check. Pre-existing timing and lock flakes on this Windows host made default two-worker Node runs fail on unchanged tests; serialized runs pass (A-9). The web-server glue (`patchTrackedClip`, `logoTrackedClip`, `saveTrackedCard`) is covered only by the real check; HTTP `REVISION_SAVE_FAILED` bodies by the `sendAdapterRefusal` unit test while failures were injected in-process. | Nonblocking limit, recorded in the report. |
| Dependencies and supply chain | `package.json`, lockfile and Python requirements unchanged (snapshot contract inputs). | N/A |
| Failure paths | Render, composition, probe and commit failures keep the previous revision serving; an interrupted commit leaves a pending operation that answers `REVISION_BUSY` until invalidated (carried to 1B.2b.5). Thumbnail images written before a failed save remain in the thumbnail folder, as legacy failures leave them. | A-2: an unavailable `ffprobe` would answer `REVISION_INPUT_MISSING` (misleading; the save would fail anyway). |
| Breaking changes and migrations | Untracked controls equal the 1B.2b.3 capture (`final/revision-fence-result.json`). Response keys unchanged; `backup_path` and `restored_from` null for tracked clips. Commit projection now clears `logo_backup_path` and sets or removes `preview_path` for every commit; request identity without settings unchanged (test). No data migrates; tracked clips exist only where tests plant them. | None blocking; 1B.3 must update the Library logo-remove button (carried). |
| Documentation drift | Module headers updated (`clip-revisions.ts`, models, fence route, Python sink helper). `docs/local-setup.md` lists no Writing Studio checks, as before. | A-1: the protected reader's `save_revision` detail says "No route commits a revision", now inaccurate for finishing actions. |
| Accessibility | N/A: no UI change. | none |
| Observability | Refusals log clip, operation, code and operation ID; failure detail stays in the operation record. | A-2 above. |
| Engineering invariants | One production importer of the save service, no production `ensureTracked` (`final/import-audit.txt`, tests); reader, composer, exact renderer, video processor and Cleanup byte-identical; `clip_generator.py` changed only in its legacy sinks (`final/protected-sources.json`); policy first; DEMO unchanged; CLI and MCP still refuse; no provider call. | none |

## Confidence and blind spot

- Material uncertainties and investigation: whether decoded frames prove "no logo on the card" regardless of logo geometry: the sampled patch lies inside both the Remotion and the FFmpeg-fallback logo boxes, and the orange reading with the logo (254, 164, 0) against cyan without it confirms the patch is the logo's. Whether the upstream-profile phase could reach a provider: strict routing reads only the two configured command paths, which point at missing files (`ai_cli.py`, `strict_ai.py`).
- Biggest blind spot: the real Studio client against tracked clips (the logo-remove button, a style change that now renders during a PATCH), which no production path can reach until adoption.

## Verdict and next action

- Verdict: PASS-WITH-FINDINGS
- Findings and dispositions (all nonblocking, none a defect in a stated requirement):
  - A-1 reader wording drift (`src/services/clip-editor-context.ts:1323`, protected in lead-26): the task-state owner decides whether 1B.2b.5 rewords it.
  - A-2 an `ffprobe` failure maps to `REVISION_INPUT_MISSING`: acceptable because the save cannot proceed either way; a later slice may map a missing binary to `REVISION_SAVE_FAILED`.
  - A-3 tracked logo previews use the raw render, which already carries an applied logo: preview-only; 1B.3 UI.
  - A-4 title after style is two steps: a title failure answers 400 after the style committed; spec order requires the style first.
  - A-5 unchanged thumbnail requests keep an earlier stale `preview_path`: only commits made before this slice have one.
  - A-6 WS-23 refuses at publication, after the legacy render finished in its temp folder: nothing is written to any sink.
  - A-7 a refused sink keeps its in-process reservation, so a later same-title clip in the batch takes the next suffix and is checked itself.
  - A-8 logo, intro and outro "changed" means missing or not a regular file: the renderer records no other identity for them.
  - A-9 pre-existing Windows flakes, not in this slice's code: two save-service tests in `src/services/clip-revisions.test.ts` run near vitest's 5 s default under two workers (the whole file takes 4.4 s alone), and `src/utils/mutation-lock.ts` `tryCreate` rethrows `EPERM` that Windows can raise while another process deletes the lock file. Candidate ledger entry for the task-state owner.
- Next action and owner: the fresh non-author review (B2B4A-6), arranged by the task-state owner.
- Record size: slightly over the 600-word narrative cap so that each of the nine dispositions keeps its location and reason.
- Evidence validity after changes: current for snapshot `6391643c...` (no drift after checks); any code change invalidates the final receipts.
