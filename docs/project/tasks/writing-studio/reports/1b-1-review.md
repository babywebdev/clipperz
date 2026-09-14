# Review: writing-studio / 1B.1 exact render result

## Review identity and coverage

- Task and spec revision: `spec.md` lead-4, `plan-1b.md`, `handoff-1b-1.md`, B1-1 through B1-4 (AC-3/AC-9/AC-11 subsets).
- Installed workflow provenance: 4.0.6 project mode; installed contract and Project Lead role, customized workflow README, retained CLAUDE.md with unknown original provenance reconciled for 4.0.6. No selected domain references.
- Code snapshot reviewed: HEAD `8cf6b82039381e62b0f1dac1953c0c8c279e86f1` plus `_local/project/writing-studio/1b-1-snapshot/1b-1-tracked.patch`, SHA-256 `b7f9f7825ae618ada238a113bfac2273930e7ec3a78e8d85289829006cb26a34`, and its manifest. Independently inspected Git status/diff and checked all 43 manifest entries including patch. Only `spec.md` Status and `findings-ledger.md` differ, as separately announced by the coordinating lead; implementation, evidence and workflow hashes match. Requirements are unchanged. Accepted 1A repairs are predecessor work, not new 1B.1 edits.
- Reviewer session/role: Codex `/root/review_1b1`, Project Lead in review-only mode, 2026-09-12 America/Chicago.
- Review independence: fresh subagent without inherited planning/implementation conversation or authorship. Requirements and actual renderer changes/dependencies inspected before Worker justifications. No implementation writes, delegation, commits or release. This is the only durable reviewer output.
- Review depth: independent review of exact planning, timing/word/keyframe mapping, composition telemetry/verification, publication failure boundaries, bridge compatibility and meaningful media evidence.
- Files inspected: `backend/services/exact_render.py`, changed portions and relevant pipeline in `clip_generator.py`, `video_processor.concat_outro`, `backend/main.py`, `video_cut.py`, audio normalization, media probe interfaces, TypeScript result types and PythonExecutor, exact-render tests and bridge script; local runtime/test harness, baseline and snapshot records, predecessor repair-2 review/Worker report, 1B.1 Worker report/logs and findings ledger.
- Coverage limits: no UI, live AI, user Library, migration or release checks; these are outside this slice. Face/speaker tracking on real faces, exact-mode foreground framing with real media and VFR precision remain unproven as disclosed by the Worker. Full suites/build/types/default preview parity assessed from receipts rather than independently rerun. Reviewer failure reproductions below use stubbed media stages and explicit injected failures; they are not claimed as decoded-media reproductions.

## Verification assessment

- Required evidence: **fail for acceptance**, because R1-R3 violate explicit contracts despite passing existing checks.
- Evidence inspected: Worker report, source of all 52 exact tests and bridge assertions, bound manifest, logs and output JSON. Full Python receipt confirms **952 passed, 6 skipped, 204 subtests passed**, start `09:38:27.284Z`, exit 0 `09:39:14.921Z`. Worker reports Node **266 passed**; build and client-type logs end with exit 0 at `09:32:38.864Z` and `09:39:30.836Z`. Saved `preview-render-4Ij2kw/result.json` records matching preview/export metadata and identical decoded video/audio; relevant default code remains compatible on inspection.
- Human assistance: none. Initial sandbox execution of configured Python was denied before tests started. Approved outside-sandbox execution of the same configured runtime succeeded; this is an environment restriction, not a product failure.

Independent executions on the unchanged implementation:

| Command | Actual result | Evidence |
|---|---|---|
| `node scripts/verification/run-tests.mjs python -k exact_render` | Initial sandbox startup exit 1; approved rerun exit 0, **52 passed, 906 deselected, 47 subtests passed in 36.94s** | `step-4-python-tests.log`, start `2026-09-12T09:54:08.622Z`, fixture `python-jQZ1uv`, exit `09:54:46.186Z` |
| `node scripts/installation/run.mjs python review-1b-1-repro _local/project/writing-studio/1b-1-review-repro.py` | Exit 0; confirms all three defects below | `_local/installation/logs/review-1b-1-repro.log`, start `09:55:19.621Z`; disposable fixture `review-1b-1-mzq67e1x` |
| `node scripts/verification/check-exact-render.mjs` | Exit 0, **Passed** | `_local/clipperz/tmp/exact-render-XmUpAS/result.json`; fresh synthetic media through compiled PythonExecutor, FFmpeg and Remotion |
| SHA-256 comparison of manifest entries and patch | 41 unchanged; two announced lead bookkeeping changes | 33 files, three local evidence inputs, six workflow files and one patch checked |

The independent real-media checks cover reversed/noncontiguous and single intervals, widening using unchanged source words, boundary clipping, all three formats, content-relative manual keyframes, no-audio video, 25 fps content, captions, intro/outro fades and forced hard-cut fallback. The bridge rerun decodes the requested cyan/green sequence and caption/audio markers, returns a 3.135s composed output with truthful `hardcut`/zero-overlap telemetry, preserves source bytes, and refuses the mixed-rate output (`3.731s` versus expected `3.111s`, tolerance `0.126s`). Default bridge and invalid-request cases also pass.

The review reproduction script SHA-256 is `e6ec1f6d127300a10600b4f8e699bbdcb7c181a40b0552880f45587ac2277a1b`. It imports the existing `_StubPipeline`, runs production bridge/planning/receipt/publication code, uses real disposable output bytes, and stubs expensive media stages. R2 deliberately supplies the exact telemetry of the existing mismatched-transition branch; it proves missing rejection logic, not the frequency of that fallback on this machine. R3 injects an overlay-copy I/O failure and proves the previous file changes despite an exception.

## Findings

| ID / importance | Location and snapshot | Failure condition and impact | Evidence | Required outcome / status |
|---|---|---|---|---|
| **R1 / P2 — omitted transcript becomes a supplied empty transcript** | `backend/main.py:213`, reviewed snapshot | An internal exact `create_clip` request omits `transcript_words`. The bridge passes `[]`, so the renderer emits `words.input: supplied`, `source_count: 0`, `source: []`. It cannot distinguish unavailable transcript input from a known empty transcript, contrary to B1-2/B1-4. Future capability decisions receive false provenance. | Real handler plus renderer planning/receipt in reviewer reproduction: `omitted_words_bridge` contains the incorrect values. Existing bridge test supplies `[]` explicitly and misses omission. | Preserve omission as unavailable in exact mode while retaining legacy defaults. Add a bridge-level omitted/null/empty distinction regression. **Open.** |
| **R2 / P2 — mismatched composition branch can receive a valid exact receipt** | `clip_generator.py:907-929`; `exact_render.py:398-425`; producer `video_processor.py:3232-3256` | `xfade_audio_concat` overlaps video but concatenates audio without overlap. Exact mode records the branch but only compares durations against tolerance. At 25 fps, one segment/intro and 0.1s fade, video 3.9s/audio 4.0s passes both 0.1264s checks. Receipt claims one content offset of 0.9s even though audio content starts at 1.0s. B1-3 explicitly forbids success when video/audio transitions disagree, independently of quantization tolerance. | Reviewer controlled branch/probe reproduction returns success, `branch: xfade_audio_concat`, `applied_overlap: 0.1`, offset 0.9, output duration 4.0. Production helper's filter graph confirms audio is hard-concatenated. Existing tests cover full mismatch beyond tolerance, not this branch inside tolerance. | Exact mode must reject this semantically incompatible branch, or produce a synchronized composition before success. Keep legacy compatibility; do not enlarge tolerances to mask the disagreement. Exercise the small-overlap case for both bookend positions. **Open.** |
| **R3 / P1 — failure after video publication replaces the previous output** | `clip_generator.py:1689`, `1733-1742`, cleanup at `1745-1747` | With `keep_caption_overlay` enabled, verified main video is published first, then overlay/source copies run. A later copy error raises a failed operation after the previous successful same-title file has already been replaced. Cleanup removes only the work directory. New partial sidecars can also remain. This violates B1-4's failure preservation, regardless of later 1B.2 revision design. | Reviewer creates `overlay-failure_short.mp4` containing `previous-success`, clears the process-local reservation cache to model an earlier process, then injects failure copying `_captions.mov`. `generate_clip` raises `OSError`, but previous output now contains `video`. These are real file writes with stubbed render bytes, not actual encoded media. Existing test proves only `_publish_verified_output` atomicity, not the enclosing operation. | Complete requested sidecar work before committing an exact operation, or otherwise guarantee all failure paths preserve prior output and clean only newly owned artifacts. Include failures at overlay and cropped-source persistence with existing and absent output. This does not require implementing the whole revision protocol. **Open.** |

The additive module and result types serve the required time-domain contract; the isolated exact planning branch is justified by compatibility. Ordered intervals, clipped editorial words, separate caption words and keyframe time convention are sound on inspected/tested paths. Rejecting exact audio-only sources and explicitly representing unavailable captions are allowed by the handoff. Keeping only touching source words in the receipt is acceptable for this substep provided 1B.2 retains the original recovery input; the renderer does not mutate it. Successful same-title replacement after a process restart is not raised as a standalone new finding here; R3 concerns a **failed** operation replacing a prior success.

## Recurrence and prevention

Read [findings ledger](../../../findings-ledger.md), including the coordinating lead's new WS-09 row. Suggested reconciliation:

- R1 is an additional transcript-provenance occurrence related to **WS-06**. Prevent at the internal bridge boundary with omitted/null/empty contract coverage.
- R2 is an exact-mode occurrence of **WS-09**, related to WS-03/WS-06. Prevent by checking composition semantics as well as measured durations; retain small-fade branch coverage.
- R3 is an additional failure-publication occurrence related to **WS-04** (and AC-3). Prevent at the full `generate_clip` operation boundary, rather than only unit-testing atomic replacement. The lead may choose a separate class if it distinguishes post-publication artifact failure from stale-media restoration.
- The Worker's two legacy composition observations are supported: the independent bridge rerun takes hard cut despite requested fade, and rejects the same mixed-rate inconsistent output; the saved legacy repro log shows video duration 3.623984s versus audio 3.064898s, with format 3.646953s. Those are pre-existing helper defects, not new changes to the legacy algorithm. Telemetry-only additions preserve the old return type and render branches. Exact reporting/refusal does not repair legacy behavior. Keep WS-09 open with separate legacy repair disposition. The reported native encoder failure and unusual SAR are diagnostic evidence; SAR as the precise cause has not been independently isolated here.
- Accepted 1A WS-01/WS-02/WS-07/WS-08 closures remain unaffected. No new history-lock defect observed.

Proposed durable corrections belong in the existing exact renderer/bridge tests and composition tests, with ledger links to this report. No universal skill/workflow change is needed. Ledger and Status edits remain the coordinating lead's responsibility.

## Reviewer recommendation

- Recommendation: **request-changes** for R1-R3.
- Required corrections: preserve transcript availability through the bridge; refuse incompatible A/V composition semantics; preserve previous outputs and clean owned artifacts when post-render persistence fails.
- Next action for the coordinating lead: assess and dispose these findings, record their ledger relationship, and scope one bounded repair handoff. Preserve the successful media and compatibility evidence where inputs remain unchanged, and refresh affected checks/review after repair. Do not accept 1B.1 or start dependent 1B.2 on this recommendation alone.

## Coordinating lead disposition and next action

2026-09-12, coordinating Project Lead (Codex): accept R1-R3 as supported findings;
1B.1 is **changes-requested**, not accepted. Reviewed the requirements, production
bridge/publication/verification paths and reviewer reproduction/log. R1 loses an
explicit availability distinction; R2 admits known transition disagreement rather
than ordinary quantization; R3 violates failure preservation at the enclosing
operation boundary. Passing suites do not close these untested paths.

One bounded manual repair is prepared in ../handoff-1b-1-repair-1.md (spec lead-5).
No implementation edits or Worker dispatch by this lead. After Worker handback,
arrange fresh independent follow-up on the repaired snapshot. Two unsuccessful
repair/review rounds on an issue require reassessment. 1B.2 remains pending.

Ledger: R1 indexed with WS-06; R2 with WS-09; R3 indexed separately as WS-10,
related to WS-04. Legacy WS-09 remains open outside this repair. The precise cause
of the native encoder crash is not established by the observed SAR correlation.
Receipt source words cover only retained intervals: 1B.2 must preserve the full
caller-supplied recovery transcript for widening, as already required by the plan.
