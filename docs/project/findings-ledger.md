# Findings ledger

Coordinating Project Lead owns this index. Source findings below were identified
on 2026-09-11 at application baseline 710b4d4; runtime reproduction is pending.
Occurrence details: [Writing Studio kickoff](tasks/writing-studio/reports/kickoff-assessment.md).

| Class / first occurrence | Location | Status | Evidence / prevention destination |
|---|---|---|---|
| Cross-process lost history update — WS-01 | TS/Python history; Python YouTube sync writers | Open, slice 1A | Kickoff WS-01; real cross-process mutation regression |
| Read failure converted to empty writable state — WS-02 | TS/Python history loaders | Open, slice 1A | Kickoff WS-02; corrupt/unreadable fixture byte-preservation tests |
| Requested timing diverges from saved content — WS-03 | rerender route, transcript slicing, clip_generator | Open, slice 1B | Kickoff WS-03; effective-segment contract and marked media fixtures |
| Mutable media restores stale edit — WS-04 | logo/rerender routes | Open, slice 1B adapters / slice 3 UI | Kickoff WS-04; revision commit and operation-order regression |
| Retired revision collection incompatible with planned storage — WS-05 | Cleanup reference collector / exports exclusion | Plan corrected; implementation pending | Kickoff WS-05; live-root retention/deletion fixtures before eligibility |
| Saved metadata differs from final render — WS-06 | caption PATCH/CLI edit, rerender metadata | Open, slice 1B / slice 3 | Kickoff WS-06; explicit rendering and post-composition probe |
| Windows sharing violation leaves owned lock behind — WS-07 (2026-09-11) | New TS/Python mutation-lock release, intermediate Worker state | Worker reports fixed; independent review pending | [1A Worker report](tasks/writing-studio/reports/1a-worker.md), failed cross-process run 21:23:24Z and subsequent passes; bounded retry / process regression |
| No-op mutation changes storage — WS-08 (2026-09-11) | New TS/Python mutate implementations, intermediate Worker state | Worker reports fixed; independent review pending | [1A Worker report](tasks/writing-studio/reports/1a-worker.md), initial unit failures and final no-op tests; preserve absent/unchanged files |
