# Worker assignment: Writing Studio 1B.1 — exact render result

Read the installed Worker startup, spec lead-4, `plan-1b.md`, `baseline-1b.json`,
and the accepted 1A reports. Isaac's manual relay activates the sole implementation
ownership recorded in spec Status. Implement this substep only, then hand back.

## Outcome and boundaries

Make the renderer produce exactly the supplied editorial sequence and return a
truthful versioned timing result for a future saved revision. Today it may sort,
snap, shorten or extend that sequence without returning what actually happened.

Expected areas: `backend/services/clip_generator.py`, its timing helpers and media
cut/composition dependencies where necessary; `backend/main.py` create_clip bridge;
additive `src/models/index.ts` result types; focused tests and one disposable
verification script. Helper names/internal organization remain delegated.

Do not implement history revisions/drafts/migration/retention, fix Library routes,
move UI controls, change navigation, add writing persistence or edit Cleanup.
Do not alter the accepted 1A locking/metrics/encoding behavior. Do not add a new
renderer framework, dependency or AI call. Existing callers and defaults remain
compatible; this mode is internal and opt-in until revision integration is ready.

## Contract

**B1-1 — explicit exact-edit mode.** Add an opt-in `timing_mode: "exact"` parameter
to the internal create_clip request and renderer. Absence retains legacy behavior;
do not repurpose `preserve_timing`. Exact mode takes a nonempty ordered
`keep_segments` list of source-absolute `{start,end}` intervals as authoritative.
Validate finite numeric values, positive durations and probed source bounds before
rendering; reject malformed/unsupported inputs clearly. Do not silently sort,
merge, widen, clamp or discard requests. Preserve supplied order, including when
source times run backward between intervals. Never mutate the caller's arrays.
Legacy bounding fields may remain compatibility summaries; they are not a way to
replace the ordered sequence. Document their exact-mode meaning without changing
default callers. All invalid requests must leave source/previous outputs untouched.

Exact mode disables all editorial heuristics: weak-opening trim, sentence-end
extension, automatic silence/filler interval construction, boundary reversion and
transition autofix that changes content. Caption-only filler cleaning may still
change displayed caption words when explicitly requested; it cannot cut speech.
No omitted interval returns merely because a later caller supplies wider bounds.

**B1-2 — explicit timing result.** Add optional `render_timeline` version 1 to the
result/types for exact mode. It must identify source-absolute intervals in output
order and their edited-content offsets, content duration, actual rendered-output
duration, content-to-output offset and bookend transition regions/actual overlap.
Keep existing top-level `duration` semantics compatible; future revision code uses
the explicit output duration. Return immutable-by-convention JSON data, no paths
chosen by clients and no success receipt for a failed/incomplete render.

Use one consistent mapping for single and multi-segment content. Preserve the
source timed-word input; derive ordered, boundary-clipped content-relative words
and full content text without excluded intervals. Keep editorial transcript words
distinct from caption-only cleaned words. Preserve word metadata such as speakers.
Clearly distinguish an explicitly supplied empty words array from unavailable
transcript input; do not silently claim a full transcript when none was supplied.
No fallback to current episode/cache belongs in this renderer contract. Reject an
exact request whose requested caption result cannot be produced from its inputs,
or explicitly represent the unavailable capability; never claim captions exist.

For exact mode, `crop_keyframes[].t` uses edited-content-relative seconds, matching
the already-cut video passed to the cropper. Validate its time/position domain and
report that convention. Preserve supplied keyframes/framing settings without
applying a source-bound subtraction a second time. Future Library draft conversion
from `tAbs` is 1B.2 scope, not permission to change today's editor payload now.

**B1-3 — actual composition and media proof.** Probe completed video/audio and
duration/size after all renderer-owned processing. Distinguish intended segment
boundaries from codec/frame quantization; choose and document a measured tolerance
based on the fixture's frame/sample timing. Do not claim sample-perfect cuts from
rounded duration metadata alone. Missing/unreadable/invalid output is a failure.

Preserve captions, logo, existing format/framing, intro/outro and requested bookend
fade. If a composition helper clamps a fade or falls back to hard cut, report the
actual branch/overlap, not the requested one. Do not report a valid exact result
when video/audio transitions disagree or media sync falls outside the justified
tolerance. Keep helper compatibility for legacy callers; additive result/telemetry
is preferable to changing their return type blindly. The Library's 1.5s thumbnail
card is applied later by the server: explicitly report that it is absent from this
renderer result, not an implicit offset or a second baked card. 1B.2 must compose
it once and probe again before committing.

The supported scope here is video sources (with or without an audio track). Keep
the existing audio-only/audiogram branch unchanged for legacy calls. If exact mode
cannot support that separate renderer faithfully, return an explicit unsupported
exact-mode error rather than falling through and claiming the requested segments
were honored. That does not remove its existing render/playback capability.

**B1-4 — safe integration and compatibility.** Carry exact-mode inputs and the
result through `backend/main.py` / PythonExecutor create_clip JSON without dropping
fields. It must be reachable through the internal bridge in the disposable check;
do not add a public endpoint or enable it in existing UI/CLI/batch paths yet.
Keep default New Episode, preview, batch and existing render behavior unchanged.
Failures clean only operation-owned temporary artifacts; no mutation of source,
history or a previously successful output. Rendering remains outside history locks.

## Verification planned before edits

Map planned checks to B1-1 through B1-4 / task AC-3, AC-9, AC-11 subsets in the
Worker report. Extend existing tests for actual gaps; do not duplicate adequate
coverage or rely only on mocked calls into FFmpeg.

- Unit/contract cases: ordered noncontiguous and reversed-source-order segments;
  one segment; boundary-straddling words; known-empty/unavailable words; malformed
  timestamps/out-of-duration ranges; source arrays unchanged; keyframe domain;
  exact mode cannot invoke editorial heuristics; legacy mode retains defaults.
- Render synthetic media with visually distinct intervals, recognizable audio
  markers and known words. Demonstrate requested order and absence of discarded
  intervals in decoded media, words/captions and timing JSON. Exercise a narrower
  then wider exact request using retained source words so omitted words are not
  permanently lost by mutation of the input.
- Verify portrait/horizontal/square and at least one manual crop-keyframe change;
  verify actual dimensions, expected framing markers, captions and A/V sync.
  Include silent/no-audio video and a non-30fps case. Where VFR precision is not
  established, report that limit rather than labeling a nominal frame step exact.
- Include intro/outro and a requested fade, plus a forced composition-fallback
  contract test proving actual overlap reporting. Check source hash unchanged and
  that failures/missing required assets do not return a successful timing receipt.
- Exercise the real internal create_clip bridge with synthetic media and inspect
  the returned JSON. Render assertions should inspect known frame/audio/word
  markers as well as probe metadata. Use an isolated home/data/output/temp and
  record runtime/probe details; no real Library migration or external AI request.

Candidate commands (select targeted filters initially; record actual invocations):

```powershell
node scripts/verification/run-tests.mjs python
node scripts/verification/run-tests.mjs node
node scripts/installation/run.mjs npm build run build
node scripts/verification/check-preview-render.mjs
```

Add a disposable `scripts/verification/check-exact-render.mjs` or equivalent
configured-runtime check for the new behavior. Reuse preview-render parity to
prove unchanged default flow; unit tests alone do not establish media correctness.
Run affected syntax/types and relevant full suites before handback. Never replace
a failed media check with a build pass. For tool restrictions, use the workflow's
human-assistance fallback with safe setup and evidence; record incomplete checks.

## Handback

Write `reports/1b-1-worker.md` using the installed report template. Preserve earlier
work/reports; compare baseline before starting/resuming and report relevant drift.
Bind all checks to a Git-derived base plus staged/unstaged patch and hashes for
untracked/binary inputs, under `_local/project/writing-studio/1b-1-snapshot/`.
Record API/result contract, limitations and all deviations. Do not edit lead-owned
Status/spec/ledger or self-approve. Stop after this substep and hand writes back
for fresh independent review. 1B.2 is not authorized by this prompt.

No agent dispatch, commit, push or release. Two unsuccessful review/repair rounds
on an issue require lead reassessment; three identical failed attempts require a
changed approach. No automatic implementation or repair loop.
