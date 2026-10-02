# Local Application Reference

Select for packaged, desktop, PWA and local tools. Read after the contract core, common process orientation and shared project context, before affected design, implementation or review. Combine with other selected references when capabilities overlap. These requirements operate within existing assignment and ownership boundaries; a review-only agent reports evidence and findings and gains no repair or acceptance authority, and a reviewer-owner may accept as task owner but never repairs.

## Establish supported environments

Use the project's actual supported operating systems, runtime versions, installation channels, device capabilities and storage conventions. Do not invent platform support or impose signing and update infrastructure on a tool that does not distribute a package. Record undecided compatibility and release choices with their proper owner. Missing one environment need not stop independently authorized implementation, but required verification remains incomplete.

## Artifact and behavior verification

- Verify the packaged or installed artifact on supported operating systems and runtimes, not only a development server. Identify the exact package/build and environment in the receipt. Exercise entrypoints, bundled resources and changed behavior through the delivered artifact; development success does not prove distribution correctness.
- Where applicable, check signing, installation, update path, first-run behavior and upgrades from supported prior versions. Include failure recovery and retained user settings. A successful clean install does not establish a safe update.
- Exercise offline and reconnect behavior, local storage durability, capacity failures and version-to-version data migration. Use representative independently understood fixtures, preserving compatibility and recovery guarantees. Do not use real client data without the project's existing authorization and safeguards.
- Respect the project's privacy rules for locally stored data, logs, telemetry, export and deletion; verify that errors and diagnostics do not expose private content.
- Validate filesystem and permission boundaries: selected paths, unavailable or read-only locations, denied access, file formats and safe retries. Do not silently overwrite unrelated files. Surface failures and retain enough secret-free evidence to distinguish environment limitations from defects.
- Test external binaries, codecs and runtime dependencies where used, including missing/incompatible versions, cancellation and unsuccessful execution. State which dependency/runtime was actually tested; a binary merely being on PATH is not behavior evidence.
- Capture meaningful crash and log evidence, including the artifact identity, reproduction steps and observed failure. Redact secrets before saving, follow the storage policy and distinguish unobserved outcomes from verified results.
- When native interaction is not reliably automatable, use the contract's human-assisted verification path: the agent prepares concise steps and expected outcomes, captures assessable evidence and retains cleanup/report responsibility. Unavailable interaction leaves a check incomplete; it does not become a pass.

## Release and observation

Record what is released, where, who approves, how success is observed after release, and how failure is recovered. Identify recovery for local data as well as the application artifact where applicable. Implementation authorization remains separate from distribution, release and production actions; preserve all designated approvals and report unsupported or unverified environments honestly.
