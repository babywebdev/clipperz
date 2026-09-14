# Worker assignment: Writing Studio 1B.1 repair round 1

Act as Worker under installed workflow 4.0.6. Read AGENTS.md, the workflow README,
contract, Worker role, CLAUDE.md and docs/local-setup.md. Read spec lead-5,
handoff-1b-1.md, reports/1b-1-worker.md and reports/1b-1-review.md including the
coordinating lead disposition. Isaac's manual relay activates sole implementation
ownership for this repair only. No automatic dispatch or later-slice authority.

## Bound baseline and outcome

Base HEAD is 8cf6b82039381e62b0f1dac1953c0c8c279e86f1 plus the uncommitted 1B.1
snapshot at _local/project/writing-studio/1b-1-snapshot/manifest.json and
1b-1-tracked.patch (SHA-256
b7f9f7825ae618ada238a113bfac2273930e7ec3a78e8d85289829006cb26a34).
The accepted 1A repairs remain in that tree. Subsequent spec/ledger/report/handoff
changes are lead/reviewer records only. Compare implementation and relevant inputs
before writing; reconcile relevant drift instead of overwriting existing work.

Close R1-R3 without weakening the exact result or failure-preservation contracts.
Expected areas: backend/main.py, clip_generator.py, exact_render.py as needed,
their tests and the exact bridge verification script. Necessary narrowly scoped
helpers/documentation are allowed. Preserve accepted 1A behavior, legacy render
defaults, original ordered-cut behavior and passing media evidence.

## Required corrections

**R1: transcript availability at the bridge.** Preserve omitted/null input as
unavailable in exact mode, an explicit [] as supplied-empty, and a supplied list
as supplied. Keep legacy defaults compatible. Do not substitute a cache or episode
transcript. Verify the result through handle_create_clip and the real internal
bridge, not only a helper that already distinguishes None from [].

**R2: composition semantics before success.** A reported xfade_audio_concat branch
has different audio/video transitions; codec tolerance cannot authorize that known
disagreement. Exact mode must reject it or obtain a synchronized composition before
returning success. Check intro and outro independently, including a small overlap
inside the numeric tolerance. Do not increase tolerances or change legacy behavior
to make the check pass. Correct crossfade and compatible hard-cut receipts must
remain supported. Broad legacy encoder/frame-rate fixes under WS-09 are deferred.

**R3: the complete exact operation must preserve prior outputs on failure.**
Requested caption overlay and cropped-source persistence is part of the operation,
not work that may fail after replacing a prior successful main video. Complete
fallible preparation before the main publication boundary and avoid overwriting
prior sidecars during that preparation. Use operation-owned artifacts and clean
only newly owned files if preparation or final publication fails. Retain successful
overlay/source output capability and returned paths. Audit the remaining fallible
post-publication bookkeeping/callbacks so a failed operation cannot be reported
after destroying a prior success. Internal staging/naming choices are delegated;
do not implement the future history/revision protocol to solve this local boundary.

## Verification before handback

Name checks and map them to R1-R3 and B1-2/B1-3/B1-4 before edits. Inspect the
reviewer's reproduction and demonstrate defects before the repair where feasible:
_local/project/writing-studio/1b-1-review-repro.py, hash
e6ec1f6d127300a10600b4f8e699bbdcb7c181a40b0552880f45587ac2277a1b.
Its assertions encode the defective behavior; preserve the original and use a
separate corrected demonstration rather than misreporting its expected failures.

- Bridge regressions for omitted/null/empty/nonempty transcript, including truthful
  caption availability and retained legacy defaults. Extend the disposable bridge
  check for the missing-input boundary with real JSON/result evidence.
- Intro/outro small-overlap mismatched-branch schedules must not return a receipt
  or publish an output. Retain synchronized crossfade/hard-cut coverage and decoded
  media proof. Distinguish injected branch/probe tests from actual encoded media.
- Inject overlay-copy, cropped-source-copy and final-main-publication failures with
  existing and absent outputs. Assert prior main and sidecar bytes remain intact;
  no successful receipt or incomplete newly published artifacts survive a failure.
  Verify successful returned artifacts remain available after work-directory cleanup.
- Run focused exact/composition/bridge tests early, affected Python syntax and the
  full Python suite after repair. Refresh check-exact-render.mjs and default
  preview/export parity because shared renderer paths are involved. Run build,
  types/Node suites where inputs change; otherwise justify retained evidence by
  relevant hashes and dependency inspection, not just by unchanged file counts.

Use configured runtime, isolated storage and synthetic media. No real Library,
provider or user media operations. Record actual commands, exits, failed attempts,
coverage limits and evidence. Tool restrictions are not product failures; use the
workflow's safe fallback when needed without claiming an incomplete check passed.

## Handback and protected boundaries

Write reports/1b-1-repair-1-worker.md with Git-derived inventory and a refreshed
base/patch/hash snapshot under _local/project/writing-studio/1b-1-repair-1-snapshot/.
Bind changed and retained evidence to its inputs. Do not rewrite prior reports or
edit lead-owned spec, Status, ledger or handoffs. Stop implementation writes and
return ownership to the lead for a fresh independent follow-up review.

No 1B.2, revisions/migration/Cleanup, UI, legacy composition repair campaign,
dependency change, agent dispatch, commit, push or release. Two unsuccessful
repair/review rounds on one issue require reassessment; three identical failed
attempts require a changed approach. This prompt authorizes one repair handoff only.
