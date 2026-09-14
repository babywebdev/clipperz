# Review: writing-studio / 1B.1 repair 1

## Review identity and coverage

- Task/spec: `spec.md` lead-5, `handoff-1b-1.md`, `handoff-1b-1-repair-1.md`; follow-up on prior review R1-R3 and repair design/regressions, B1-2/B1-3/B1-4 and relevant AC-3/AC-9/AC-11 subsets.
- Workflow: installed 4.0.6 project mode, contract and Project Lead role; customized README and retained CLAUDE.md with unknown original provenance reconciled for 4.0.6. No selected domain references. Read startup, local setup, review template and findings ledger.
- Snapshot: HEAD `8cf6b82039381e62b0f1dac1953c0c8c279e86f1` plus `_local/project/writing-studio/1b-1-repair-1-snapshot/1b-1-repair-1-tracked.patch`, SHA-256 `6544206139108b6ebd02a68822116fca5b2d4c893eeb8513698f3bc3c4a48db1`, and its manifest. Independently derived inventory from Git status/diff and checked all 49 manifest entries, including patch: only `spec.md` differs, matching the coordinating lead's announced Status-only update. Implementation, evidence inputs and workflow hashes match. Accepted 1A remains predecessor work, not this repair.
- Reviewer: Codex `/root/review_1b1_repair1`, Project Lead, review-only, 2026-09-12 America/Chicago (executions 2026-09-13 UTC).
- Independence: fresh subagent without inherited planning/implementation history or authorship. Read requirements and actual changes before the Worker's justifications. No implementation/shared-record edits, delegation, commit, acceptance or release authority; this report is the only durable reviewer output.
- Depth/files: risk-based follow-up covering `backend/main.py`, `clip_generator.py` planning/composition/publication/result paths, `exact_render.py`, `video_processor.concat_outro`, `tests/test_exact_render.py`, bridge verification script, result types, PythonExecutor/caller dependencies, format and runtime/test harness definitions, snapshot/prior review/Worker receipts.
- Limits: no user media, Library, UI, providers, migration, crash-recovery or release checks. Publication reproductions below use actual disposable files and injected I/O failures with stubbed media stages; they are not actual disk failure or Windows sharing-lock reproductions. Full Python, exact bridge and preview parity receipts inspected rather than rerun in full; focused suite includes real encoded-media tests. Existing disclosed VFR precision and real-face tracking limits remain.

## Verification assessment

- Required evidence: **fail for acceptance** because the complete-operation preservation contract still fails on the schedules below. Passing tests support R1/R2 and the narrower transient-failure publication paths, not unconditional R3 closure.
- Inspected Worker evidence: full Python log, started `03:27:01.696Z`, exit 0 `03:27:39.651Z`, **962 passed, 6 skipped, 224 subtests passed**; exact bridge result `_local/clipperz/tmp/exact-render-5Wmr8U/result.json`; preview parity `_local/clipperz/tmp/preview-render-OIlm5t/result.json` records identical decoded video/audio. Bridge assertions exercise omitted/null/empty provenance, decoded markers, captions, synchronized branch allowlist and refusal. Node/build/client-type inputs are unchanged from the prior bound snapshot, so retaining those receipts is proportionate for this Python repair. The actual broad suites were not independently repeated.
- Independent commands on the unchanged repair implementation:

| Command | Actual result | Evidence |
|---|---|---|
| `node scripts/verification/run-tests.mjs python -k exact_render` | Sandbox startup denied before tests; approved configured-runtime rerun exit 0, **62 passed, 906 deselected, 67 subtests passed in 26.65s** | `_local/installation/logs/step-4-python-tests.log`, successful start `03:35:28.772Z`, fixture `python-u5jBHN`, exit `03:35:55.885Z` |
| `node scripts/installation/run.mjs python review-1b-1-repair-1-repro _local/project/writing-studio/1b-1-repair-1-review-repro.py` | Exit 0: assertions confirm both remaining failure paths below | `_local/installation/logs/review-1b-1-repair-1-repro.log`; `_local/clipperz/tmp/review-repair1-yc_cey2h/result.json` |
| SHA-256 manifest comparison | 49 checked; only announced spec bookkeeping differs | Repair manifest and patch named above |

The independent reproduction script hash is `0dc2b3577f443e052125b635b0152eb9971a5eb2459fd5be3e1f9ebccb678d26`. It imports the existing publication test fixture, invokes production `generate_clip`, captures actual directory contents, and cleans its disposable publication fixtures after recording results. Its assertions encode the observed defects, not desired passing behavior.

Human assistance: none. Approved execution outside the sandbox was needed for the configured venv; initial denial is an environmental limitation, not a product failure. Harness stdout initially surfaced exit 1 while its appended child log records exit 101; both precede test execution.

## Findings

| ID / importance | Location in repair snapshot | Failure condition and impact | Evidence | Required outcome / status |
|---|---|---|---|---|
| **R1 / closed recommendation** | `backend/main.py:193-202`; bridge tests | Exact omitted/null input now reaches the renderer as unavailable, while `[]` remains supplied-empty. Legacy omission retains `[]`. | Inspected handler and real-renderer bridge assertions; independent focused suite passes; real bridge receipt confirms missing/empty distinctions and captions absent. | Prior R1 closure supported. |
| **R2 / closed recommendation** | `clip_generator.py:957-964`, `1686-1698`; `exact_render.py:450`; `video_processor.py:3231-3250` | Exact calls request synchronized joins for each bookend and independently reject `xfade_audio_concat` before receipt/publication, even inside tolerance. Legacy fallback order stays default. | Small-overlap intro/outro refusal tests, helper fallback-order tests and synchronized controls pass independently, along with existing actual encoded-media cases. Tolerances unchanged. | Prior exact R2 closure supported; legacy WS-09 remains separate/open. |
| **R3a / P1 — rollback depends on the failed destination becoming writable** | `clip_generator.py:897-917`, publication cleanup `1796-1803`; tests `846-875` | When a final sidecar destination remains unavailable, its previous file has already moved to `.previous`; publication and restoration to that path both fail. The operation raises and the previously valid returned sidecar path is now missing. The bytes surviving at a backup name do not preserve the prior successful artifact at its original path. | `persistent_destination_failure`: all replacements whose destination equals `overlay_short_captions.mov` raise `PermissionError`; other filesystem calls run normally. Result contains prior main/source, but only `overlay_short_captions.mov.52908.previous` for the prior overlay. No success receipt. Worker also disclosed this limitation and changed tests to fail only once. | Keep previous successful main and sidecars available at their original paths on persistent publication failure, without relying on a successful compensating rename to the same failed destination. Include a persistent-failure regression. **Prior R3 remains open.** |
| **R3b / P1 — completion-error logging can still fail after destructive publication** | `clip_generator.py:916-921`, `1804-1812` | The final callback is guarded, but its exception handler prints to stderr without protection. If the reporting channel is unavailable, that print raises after all replacements and backup deletion, converting a complete publication into a failed render after losing the previous outputs. | `failed_completion_logging`: callback raises `OSError` only at 100%; injected stderr writer raises `OSError`. Production `generate_clip` raises `stderr unavailable`; directory contains new `video`/`overlay`/`stub` bytes and no previous backups. | A post-publication reporting failure must not escape as an operation failure after prior output replacement. Audit error-reporting paths themselves, and verify the full operation under unavailable completion logging. **Prior R3 remains open.** |

The staging step closes the original overlay/source-copy failure, and rollback works for the tested one-shot rename failures. That is useful progress, but changing the failing injection to a transient fault does not close the broader approved guarantee. R3a is one persistent destination fault, even though two rename calls encounter it; it is not evidence of two unrelated failures. The report's statement that an existing Windows-open destination fails before backup movement does not cover the demonstrated failure boundary after that movement. No broader OS-failure claim is necessary to establish this gap.

The new staging/rollback complexity addresses a real requirement but is not yet sufficient. The lead should reassess whether exact-mode operation-owned final names can preserve earlier artifacts without first moving them; such a choice need not implement the future history/revision protocol. This is a design option for lead assessment, not a reviewer implementation assignment.

The `RenderTimelineBookend.branch` union still includes `xfade_audio_concat`, although successful exact results now exclude it. This is a harmless over-broad type for current consumers, not evidence of runtime receipt leakage or a blocking defect. Narrowing/commenting it can accompany the future consumer contract. The Worker report also says `emit_progress` writes stdout; actual code writes stderr and `emit_result` writes stdout. A dated report correction should preserve that distinction; it does not independently change the verdict.

## Recurrence and prevention

Read [findings ledger](../../../findings-ledger.md) before finalizing. Proposed reconciliation:

- Mark the exact bridge occurrence in **WS-06** and exact semantic-transition occurrence in **WS-09** as resolved on this snapshot, while retaining their other open scope and the legacy composition defect.
- Keep **WS-10** open and link R3a/R3b as continued occurrences of complete-operation failure preservation. Existing transient tests do not cover persistent destination failure or failed logging after publication. Prevention belongs in `tests/test_exact_render.py` at the enclosing operation boundary, paired with a publication design that satisfies these schedules.
- Accepted 1A closures are unaffected. No universal workflow/skill change is proposed. Lead owns ledger and Status reconciliation.

Proposed durable corrections: dated Worker-report clarification of the stderr/stdout distinction and preservation limits; tests/design in the existing renderer and its tests. No reviewer edits to those records.

## Reviewer recommendation

- **Request changes**: R1/R2 closure supported; R3 remains open through R3a/R3b. Exact-operation acceptance is not established.
- Required outcome: persistent publication failures leave every previous successful artifact usable at its existing path; post-publication notification/logging cannot convert a completed replacement into an operation error. Refresh affected tests/evidence and independent review after the design correction.
- Next action for coordinating lead: dispose these findings, retain R1/R2 evidence while inputs remain unchanged, and reassess the publication design before another bounded repair. Apply the existing repair/review budget; no automatic loop or dependent 1B.2 acceptance follows from this report.

## Coordinating lead disposition and next action

2026-09-12, coordinating Project Lead (Codex): R1/R2 closed on the bound repair-1
snapshot; R3a/R3b supported and still blocking acceptance. Read the implementation,
review reproduction/log and original B1-4/repair contract. Keeping old bytes under
a backup name does not preserve the old usable path. A persistent destination
failure is a single continuing fault, not necessarily two independent faults.
The secondary stderr exception is also confirmed in the enclosing renderer path.

Spec lead-6 selects new operation-owned exact output groups with a single directory
publication rename, replacing the backup/rollback design. Earlier successful files
are never moved or replaced; legacy behavior remains compatible. This is a bounded
technical adjustment within the original preservation intent, not a revision store.
Repair 2 is prepared in ../handoff-1b-1-repair-2.md for Isaac's manual relay.
No application edits or Worker dispatch by this lead. Fresh independent review is
required after handback; a second unsuccessful R3 repair/review requires reassessment.

WS-06 exact R1 and WS-09 exact R2 are closed; other legacy scope remains open.
WS-10 retains R3a/R3b. Broader TypeScript branch union is non-blocking and recorded
for the 1B.2 consumer-contract refresh. Source confirms progress uses stderr and
results use stdout; the Worker report receives a dated clarification addendum.
No 1B.2 acceptance, commit or release follows from this disposition.
