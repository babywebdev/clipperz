---
record: "implementation-report"
task: "writing-studio"
cycle: "1b-2b-3-repair-1"
spec_revision: "lead-25"
snapshot: "_local/project/evidence/writing-studio/1b-2b-3/repair-1/snapshot/manifest.json"
author: "agent"
date: "2026-09-23"
state: "historical"
summary: "WS-22 and WS-20 repaired; final HTTP/CLI, Node, Python, build, types, compile and protected-source checks pass. Snapshot has no drift; fresh follow-up remains."
read_when: "Reviewing repair-1 for WS-22 and WS-20."
evidence: "_local/project/evidence/writing-studio/1b-2b-3/repair-1/"
workflow_version: "5.0.0"
instruction_inventory: "docs/workflow/inventories/5.0.0-local-1.md"
---

# Implementation Report: writing-studio / 1b-2b-3-repair-1

## Identity and freshness

- Author: fresh Codex implementation session, not the author of lead-23/correction-1. Existing checkout reclaimed after the recorded stopped handback; task-state ownership stays with the lead-25 owner. No execution-profile difference from README; no delegation.
- Bound requirements: spec.md lead-25 and spec-log lead-25. Base fed8ed13dcb2aade06bee341953d6b10d58bff13 plus correction-1 manifest a7048a8bc353bc06a573d265014d51eb74c573a9a455a6775bf01b1100c180cd.
- Freshness: exactly eight expected drift lines; per-file binary patch differs only in the three task-state records, and all four lead-25 record hashes match. Seven potential repair files copied byte-for-byte against the correction manifest. Evidence: `binding/freshness.json`, `binding/pre-edit-snapshot-check.log`, `binding/pre-edit-tracked.patch`.
- Startup: Python absent on PATH; configured venv denied in sandbox, then ran with approved escalation. brief.py refused inconsistent repair-report/final-snapshot pointers; completed direct-read fallback without changing task state.
- Final snapshot: `repair-1/snapshot/manifest.json`, SHA-256 `43ffa1ebea7a4cd52f35fd459d5a5ec6c8b0684227ea08b63edeca843d151c9a`; full tracked patch, 73 untracked copies, 80 contract inputs including rebuilt dist, and six-file repair delta against verified pre-edit bytes.
- Environment: Windows x64, Node 24.21.0, Python 3.14.3, FFmpeg 8.1.1 (`final/runtime.json`); built local server, real CLI, isolated storage and verified free loopback port. Model/effort not exposed.
- Implementation: implemented. Verification: pass. Review: pending; integration/release unauthorized.

## Execution Receipt

Paths below are relative to the evidence root. Every row executed by this Codex session on Windows in the configured local runtime, without delegation. Final rows bind the manifest above.

| Acceptance ID or check | Exact command/runtime steps; expected result | Exit code or actual one-line result | Evidence path | Snapshot | Executor |
|---|---|---|---|---|---|
| Freshness | `node _local/project/evidence/writing-studio/1b-2b-3/repair-1/prepare.mjs`; compare correction helper check, per-file `git diff HEAD --binary`, lead-25 hashes and seven source copies | 0; exact expected bookkeeping drift only | `binding/` | a7048a8b plus lead-25 records | self |
| WS-22 before | `node _local/project/evidence/writing-studio/1b-2b-3/repair-1/null-field-repro.mjs`; mixed null PATCHes 200 and CLI null exit 0, title changed | 0; both null PATCHes 200 and CLI exit 0, title changed | `before/null-field.log` | unchanged dist a7048a8b | self |
| WS-20 before | `node _local/project/evidence/writing-studio/1b-2b-3/repair-1/guard-miss-repro.mjs`; logo remove overwrites owned output before 409 | 0; owned media overwritten, then 409; history unchanged | `before/guard-miss.log` | unchanged dist a7048a8b | self |
| WS-20 / B2B3-1,4 | deterministic route tests: each of five media routes, logo apply/remove, tracked and untracked namespace entry planted after missing guard lookup; 404, one lookup, unchanged bytes, no CLI/FFmpeg; DEMO and found controls | 0; 33 route tests; twelve interleavings and six DEMO controls; final full run covers all 15 focused suites (378 tests) | `final/node-full.log`, `final/focused-final-coverage.json` | final | self |
| WS-22 / B2B3-1,3 | `node scripts/verification/run-tests.mjs python tests/test_revision_fence.py`; thumbnail null/empty and caption empty with/without title; tracked refusal and unchanged history; untracked fed8ed1 outcomes | 0; all twelve new cases passed; file selection also ran the full suite | `final/python-focused.log`, `final/python-full.junit.xml` | final | self |
| B2B3-1..4 | `node scripts/verification/check-revision-fence.mjs --controls _local/project/evidence/writing-studio/1b-2b-3/pre-change/controls.json --result _local/project/evidence/writing-studio/1b-2b-3/repair-1/final/check-final-result.json`; earlier assertions and new null/empty rows pass | 0; 72 HTTP and 48 CLI tracked refusals; 10 null/empty controls and 14 original controls pass; earlier path/barrier/log assertions pass | `final/check-final.log`, `final/check-final-result.json` | final | self |
| Focused Node | `node scripts/verification/run-tests.mjs node` with the 15 paths in `final/node-focused-serial.receipt.json`; final coverage refreshed by the full Node command (same 15 files); exit 0 | 0; initial serial 377/377; final full run refreshes all 15 focused suites, 378/378 | `final/node-focused-serial.log`, `final/node-full.log`, `final/focused-final-coverage.json` | final | self |
| B2B3-5 full Node | `node scripts/verification/run-tests.mjs node`; exit 0 | 0; 47 files, 795 tests passed | `final/node-full.log` | final | self |
| B2B3-5 full Python | `node scripts/verification/run-tests.mjs python`; exit 0; read JUnit counts | 0; JUnit 1356 tests, 0 errors/failures, 6 skipped; pytest 1001 passed + 349 subtests | `final/python-full.log`, `final/python-full.junit.xml` | final | self |
| B2B3-5 build | `node scripts/installation/run.mjs npm build run build`; exit 0 | 0 | `final/build-final.log` | final | self |
| B2B3-5 client types | `node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json`; exit 0 | 0 | `final/client-types-final.log` | final | self |
| B2B3-5 compile | `node scripts/installation/run.mjs python py-compile -m py_compile backend/cli.py tests/test_revision_fence.py`; exit 0 | 0; both changed Python files | `final/py-compile.log` | final | self |
| B2B3-5 protected sources | `node scripts/installation/run.mjs python protected-sources _local/project/evidence/writing-studio/1b-2b-3/repair-1/protected-sources.py`; compare 13 non-test sources and clip_generator; DR-1 equals proposal | 0; all 13 non-test sources match; DR-1 equals proposal | `final/protected-sources.json` | final | self |
| B2B3-5 snapshot | `node _local/project/evidence/writing-studio/1b-2b-3/repair-1/snapshot-capture.mjs .` then the same command with `--check`; expect No drift after all checks | 0; No drift. | `snapshot/`, `final/snapshot-check.log` | final | self |

No real-HTTP race proof is required; deterministic route tests compare bytes immediately after the external fixture insertion. No browser claim or provider calls; no human assistance. Fixtures are isolated; cleanup is recorded in `final/cleanup.json`. No required check omitted. No implementation input changed after the final snapshot; earlier affected receipts were refreshed.

## Change inventory

Git-derived repair delta (full checkout inventory is in the manifest; six files changed by this repair):

- src/ui/clip-write-fence-route.ts: own-key PATCH refusal, CLI-compatible exact/unique-prefix lookup, and media-miss 404.
- src/ui/web-server.ts: five live media handlers consume only checked entries; DEMO retains prior lookup behavior.
- backend/cli.py: raw option-presence refusal and delayed caption choice validation with legacy untracked parser errors.
- src/ui/clip-write-fence-route.test.ts: presence values, prefix precedence/ambiguity and deterministic guard-miss regressions.
- tests/test_revision_fence.py: twelve tracked/untracked CLI null/empty cases.
- scripts/verification/check-revision-fence.mjs: four-state HTTP/CLI null/empty rows, prefix coverage and independent fed8ed1 controls.

No backend history-writer change. Reports are the two new repair-1 reports; evidence helpers stay inside repair-1.

## Deviations and decision requests

No scope change or decision request. The demonstrated unique-prefix PATCH bypass is the same WS-22 null-field defect. `before/prefix-null-field-result.json` binds the preserved pre-prefix snapshot `4af89b1a…` in `pre-prefix-snapshot/` (its original snapshot paths map to this copy). The repair resolves the same exact-first/unambiguous prefix as Python, without changing POST lookup semantics.

## Limitations and findings

WS-22 (R1) and WS-20 repaired; propose their closure after the mandated follow-up review. WS-23 remains Open and deferred before adoption; clip_generator is unchanged. No spec requirement change proposed.

Reused, not rerun: original pre-change capture and the unfenced-seam audit from [lead-23 implementation](1b-2b-3-implementation.md) and [self-audit](1b-2b-3-self-audit.md). No seam caller or mutation field changed. Retained bridge/composer/reader evidence follows [correction-1 implementation](1b-2b-3-correction-1-implementation.md) and [self-audit](1b-2b-3-correction-1-self-audit.md): protected inputs match; final Node rechecks DR-1 tests. All affected fence checks are refreshed.

Earlier attempts: first route loader failed because TypeScript 7 exposes no transpileModule; Node's built-in stripper fixed the test harness. One focused run timed out during concurrent rendering; serial rerun passed 377/377, then the final full suite refreshed all 378 focused tests after the prefix repair. Full logs retained. No product test weakened.

## Handoff

- Actual handoff 2026-09-23: this Codex implementation writer stops writes after final report/cleanup validation. Snapshot and SHA-256 above.
- Outcome: implemented; verification pass; fresh non-author review pending. No acceptance, commit, push or release.
- Unfinished: task-state owner reconciles these reports and arranges `reports/1b-2b-3-repair-1-review.md` for WS-22/WS-20, retained B2B3-1..5, F-2 and record() refusal.
- Last failed approach: resolved loader issue and concurrent-run timeout are preserved above; no unresolved failed approach or Isaac decision.
