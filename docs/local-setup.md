# Windows local installation

This fork supports local media processing with Whisper base, FFmpeg, and Remotion,
plus strict Codex → Claude → error AI routing. Media stays local; transcript text
used for AI analysis goes to the official AI provider. Optional cloud features,
remote media downloads, speaker labeling, and additional models are disabled by
this profile. These controls require the configured launcher below.

## Repository layout

- `scripts/local/`: shared environment loader, Studio/MCP launcher, executable
  preflight, and Node/Python path checks.
- `scripts/installation/`: isolated command runner, dependency inspection,
  checksummed downloads, native dependency checks, and environment inventory.
- `scripts/verification/`: offline Node/Python test harnesses, read-only client
  checks, and disposable Studio/MCP smoke tests.
- `config/windows/`: literal environment template, public wheel manifest, pinned
  dependencies and hashes, and empty npm configuration files.
- `tests/`: tracked Python regression tests, including strict AI policy tests.
- `_local/`: ignored machine settings, virtual environment, caches, media, logs,
  verification output, and historical installation records.

Existing installations may retain tiny `_local` compatibility entry points so an
existing MCP registration keeps working. New registrations use the tracked path.

## 1. Verify prerequisites

The installation snapshot was validated on Windows x64 with Node 24.15.0,
Python 3.14.3, FFmpeg/ffprobe 8.1.1, Chrome, and an NVIDIA GPU using PyTorch
2.14.0+cu126. The checked-in Python wheels target CPython 3.14 on Windows x64;
they are not cross-platform locks. Other platforms or Python versions need a new
dependency resolution. The GPU smoke check intentionally fails without CUDA.

Install the official Codex and Claude clients and sign in through their own
interfaces. Claude fallback requires its own valid sign-in. Never put credentials
in repository configuration. AI client flags can change; rerun the client check
after upgrades.

## 2. Configure storage

From the repository root, copy `config/windows/clipperz.env.example` to
`_local/clipperz/config/clipperz.env`. Create the parent directory first. Replace
every placeholder with an absolute path. The file uses literal values, not shell
variable expansion. Both Python executable names must point to the same venv.

Create `_local/clipperz/home`, `data`, `data/cache`, `tmp`, `exports`, and
`inference`. The loader deliberately requires this layout. Keep original recordings
outside managed folders. Startup no longer deletes old working folders or uploaded
copies automatically; use **Workspace → Cleanup** to review storage instead.

```powershell
node scripts/local/runtime.mjs check
```

This checks configuration only; it does not install anything or prove executables
can run. Use the selected Node executable if it is not on PATH.

## 3. Install reviewed dependencies

Set `CLIPPERZ_BASE_PYTHON` to your absolute base Python executable when creating
the dedicated venv. This variable is needed only for `base-python` mode.

```powershell
node scripts/installation/run.mjs base-python create-venv -m venv _local/clipperz/venv
node scripts/installation/run.mjs npm node-install ci --ignore-scripts --no-audit --no-fund
node scripts/installation/run.mjs node node-check scripts/installation/check-node.mjs
```

Use the root Node lockfile. Review lifecycle scripts and permit only prerequisites
that are actually needed. The installation check verifies installed versions,
esbuild operation and binary integrity, matching Remotion versions, and npm's tree.

For the recorded Python environment, `download-wheels.ps1` downloads the public
artifacts in `config/windows/wheels.json` and verifies SHA-256 before use:

```powershell
& scripts/installation/download-wheels.ps1
node scripts/installation/run.mjs python inspect-wheels scripts/installation/review-wheels.py
node scripts/installation/run.mjs python install-wheels -m pip install --no-index --find-links _local/clipperz/data/cache/wheels --require-hashes --only-binary=:all: -r config/windows/python-wheels.lock
```

Whisper 20250625 is built separately from its verified source archive.
`review-sources.py` downloads and inspects that source without executing package
code. After reviewing it, build the archive with `pip wheel --no-index --no-deps
--no-build-isolation`, using the installed build tooling and the local wheelhouse
as output. Review the resulting wheel and its SHA-256 before installing it.
`whisper-wheel.lock` records the original local build: a rebuild can have a
different hash because of archive timestamps. Do not silently substitute its hash.

`python-complete.lock` restores all application/build packages only when the
matching original Whisper wheel is available. `python-download.lock` records
public dependency URLs; `requirements-core.in` and `constraints-step-1.txt` record
the original resolution inputs. Pytest dependencies are pinned in `pytest.lock`:

```powershell
node scripts/installation/run.mjs python install-tests -m pip install --require-hashes --only-binary=:all: -r config/windows/pytest.lock
& scripts/installation/download-whisper-model.ps1
node scripts/installation/run.mjs python native-check scripts/installation/check-python.py
node scripts/installation/run.mjs python record-environment scripts/installation/finalize-python.py
node scripts/local/preflight.mjs
node scripts/local/check-paths.mjs
```

The native check uses cached Whisper base and synthetic audio, not user media.
Package reports, inventories and logs are written under `_local`, not beside code.

## 4. Build and verify offline

```powershell
node scripts/installation/run.mjs npm build run build
node scripts/installation/run.mjs node client-types node_modules/typescript/bin/tsc --noEmit -p src/ui/client/tsconfig.json
node scripts/installation/run.mjs npm prebundle run remotion:prebundle
node scripts/verification/check-build.mjs
node scripts/verification/run-tests.mjs node
node scripts/verification/run-tests.mjs python
node scripts/verification/check-step-5-smoke.mjs
node scripts/installation/run.mjs python clients scripts/verification/check-step-5-clients.py
```

Tests isolate application data and block unexpected network access. The Studio
smoke test uses a disposable server on port 3891, then checks the actual MCP
launcher without AI inference. Keep that port free. Client checks read help,
configuration support, and sign-in status; they do not submit prompts.

## 5. Launch Studio and register MCP

```powershell
node scripts/local/launch.mjs studio
```

Open `http://127.0.0.1:3847`. Stop the foreground server with Ctrl+C. Reuse an
existing configured instance; identify the owner of an occupied port before
stopping anything. The launcher checks Python, FFmpeg, and ffprobe before opening
Studio. On Windows, run under the account that owns the Python installation. If
a sandbox denies executable access, use the normal terminal or approved execution
context rather than copying the venv or changing filesystem permissions.

For MCP, configure server name `clipperz`, command = absolute Node executable,
arguments = absolute `scripts/local/launch.mjs` path followed by `mcp`, working
directory = absolute `_local/clipperz/home` path, startup timeout = 30 seconds,
tool timeout = 3600 seconds. Use the 14 allowed tools in `src/config/policy.ts`.
Do not commit the user's global MCP configuration. Studio and MCP are separate
processes; MCP does not automatically launch Studio.

`node scripts/local/prepare-mcp.mjs` writes a ready-to-review registration snippet
under `_local/verification/clipperz-mcp.toml`. Merge that server entry into the
user's MCP configuration without replacing their other settings.

## 6. Validate real processing

Studio's **Settings → Framing preset → Larger foreground · blurred background**
reproduces the reviewed vertical recipe: 1080×1920, 13% trimmed from each side
of the sharp foreground, full-source blurred background, foreground bottom at
65.8%, and karaoke captions at their automatic position and 100% size. Sliders
adjust side trim (0–15%) and the foreground bottom (50–85%). Save as preset to
reuse the values. The live preview and clip exports use the same crop geometry;
browser blur and caption typography are approximate. Full-episode exports use
these framing settings too. Switching to horizontal or square disables this recipe.

Review the entire selected clip for people or content cut off at the sides. This
layout does not automatically verify people; reduce trim when needed. Layouts
that would overflow the top of the frame are flagged in preview and rejected by
the renderer.

The same Framing preset menu also offers **Fit entire video** and **Manual zoom
& position**. Fit preserves every source edge in vertical, horizontal, or square
output. Manual starts from that fitted image and provides zoom (50–400%),
horizontal and vertical position (50% is centered), and a reset button. Both
support blurred-source or black backgrounds, saved presets, and restored session
settings. These settings apply to all selected clips.

Source preview controls include play/pause, mute, volume, and a clip-relative
timeline. Static framing and output aspect ratio update immediately. Face/speaker
tracking is shown by **Render preview**: select a clip, then render it using the
same pipeline and settings as batch export, including captions, audio processing,
and editorial segments. This creates a temporary working file without adding a
library entry. Changing the selected clip or settings returns to the live preview
so an outdated render is not presented as current. Browser caption typography and
blur are approximate; use the rendered preview for final review.

`node scripts/verification/check-preview-render.mjs` compares decoded video and
audio between a disposable preview and batch export and checks that previews stay
out of history. It uses an isolated server on port 3893 and synthetic local media.

First render a short synthetic clip with fixed captions. Then transcribe a short
local sample, supply selected moments, and render with Remotion. Review framing,
caption timing, audio alignment, and decoding. Test persistence after restart and
cleanup using disposable files only. Finally test Studio AI after mocked routing
tests pass. Synthetic success does not establish long-recording performance,
face tracking quality, or exact loudness compliance.

## Library thumbnails

Open a Library clip and choose **Thumbnail → Get options** for headline suggestions
and candidate face frames from that clip's source interval. Headline text uses the
same strict Codex → Claude → error provider chain as clip suggestions; it sends
the title and thumbnail/brand instructions, not video or images. Frame extraction
and image rendering run locally. Rendering uses the configured `PODCLI_BROWSER`
with external browser requests blocked and never downloads a replacement browser.

Choose a headline and frame, or enter your own text and use **Upload frame**.
Screen recordings and small multi-person layouts may have no suitable face frames;
uploading a frame works in that case. **Generate** saves the thumbnail and adds a
1.5-second opening card to the rendered clip. Regenerating replaces the previous
card. Keep a separate copy if you also need the clip without the opening card.
Standalone thumbnail studio and thumbnail configuration endpoints remain disabled
in this local profile.

## Transcript corrections and full-episode export

In **New episode → Full transcript → Edit transcript**, correct the timed passages
and press **Save transcript**. Timestamp buttons play that part of the source.
Unchanged words retain their timing; replaced or added words share the edited
span's timing. Clearing one passage removes its captions without deleting audio.
Edits update the readable transcript, moment-search text, live captions, future
clip renders, and full-episode export. They persist in the per-video cache and
survive reloads. An original transcript backup is kept beside the cache. Existing
rendered videos must be exported again to include corrections.

**Export full episode** now uses the selected vertical (1080×1920), horizontal
(1920×1080), or square (1080×1080) format, framing preset and manual controls,
caption style/position/size, logo, intro, and outro. It keeps the complete source
timeline, normalizes audio using the clip pipeline, and renders captions in short
sections to bound temporary overlay disk use. Clean fillers only cleans caption
text here; **Remove silence** remains the explicit way to shorten the episode.
No clip suggestions or selections are required. Each export gets a separate file.

**Preview source frame** shows the source framing with live caption text.
**Preview rendered** plays the completed export at its actual dimensions.
`node scripts/verification/check-episode-edit-export.mjs` checks corrected cache
reloads and real captioned exports in all three formats, with audio and bookends,
in a disposable Studio on port 3897.

## Recent sources

Use **Clear** beside **Recent sources** in New episode or Highlights to empty the
shared history list. It does not delete videos or change the current episode/reel.
The cleared list stays empty after restarting; newly used files appear again.
Missing local files are removed from the saved history, and the dropdown refreshes
when opened or when returning to the browser.

## Storage cleanup and startup

**Workspace → Cleanup** scans uploaded copies, highlight renders, and managed
temporary files. Nothing is preselected. Unused render versions and videos left by
deleted Highlights batches can be removed here. Temporary items must be at least
one hour old. Uploaded copies require a separate, explicit selection.

The scanner protects paths referenced by the current episode, saved reels, Library
clip records and recipes, or registered assets. Exports, caches/models, settings,
and application dependencies are kept. Corrupt/unreadable saved-work metadata
blocks cleanup; linked directories cannot be selected. File sizes can overstate
space freed where render versions share hard links.

**Review deletion** lists the exact selection. The final button permanently
deletes files, bypassing the Recycle Bin. Files are rechecked before removal;
changed or newly referenced items are skipped. Scans expire after 15 minutes.
Cleanup is blocked during uploads, edits, and renders. Recent sources is pruned
afterward. To remove a saved Library clip, use its Library delete action first.

`node scripts/local/launch.mjs studio` now detects an existing healthy instance
of this installation and prints its URL and PID without starting another copy.
`node scripts/local/launch.mjs status` reports whether it is running. An unknown
occupant of the port is left alone. Local startup skips the disabled legacy
configuration migration instead of printing a policy traceback.

`node scripts/verification/check-storage-cleanup.mjs` uses a disposable Studio on
port 3899 to check startup retention, selected deletion, source protection, and
blocking during uploads. Unit tests cover stale scans, corrupt metadata, and links.

## Highlights batches

Open a saved reel in **Highlights**, set **Moments → Custom** for a count and
minimum/maximum length, then press **Find different moments**. The next strongest
unused moments are appended to the open reel by default. Existing trims, exclusions,
and manual order stay in place. **New moments → Create a new batch** saves a separate
reel instead; earlier batches remain under **All highlights**. Download the whole
reel to import into New episode for editing.

Under **All moments**, drag a grip to place a moment before or after another row,
or use its up/down arrows (the grip also supports Alt+Up/Down). The order saves
automatically and is used for downloads in every format. Excluded moments stay
available for review but are omitted from the combined reel. Append and reorder
reuse unchanged clip renders and only publish the saved cut after rebuilding
successfully. Older saved batches gain stable moment identities automatically.

Each batch remembers earlier suggestions in its series, including ranges that were
trimmed, excluded, or dropped. Reopening an earlier batch still skips suggestions
from its later batches. Detection uses the original source videos and retains the
reel's format and logo. It may return fewer than the requested maximum count, and
reports when no unused peaks fit. Selection ranks reactions and audio energy; it
does not choose random timestamps. A fresh **Find highlights** search starts a new
series and can select the strongest moments again.

Custom duration limits take precedence over sentence or silence boundaries, which
can require cutting inside a sentence. **Auto** uses its own limits (5–120 seconds,
up to 50 moments). Length settings govern detection; later manual edits can extend
a moment. Existing sessions remain compatible, but edits made before this feature
was installed have no recorded exclusion history.

`node scripts/verification/check-highlight-batches.mjs` checks real audio detection,
separate saved batches, append preserving edits, manual order in all three download
formats, duration bounds, stale edits, and error cases on an isolated Studio on port 3896.

## Migration record

The app is branded **Clipperz**. The original `PODCLI_*` environment settings,
`.podcli` paths, browser storage keys, and native `podcli` commands are retained
for compatibility with existing installations and saved work. Upstream URLs and
module identifiers still refer to their original locations.

The supplied logo and icon live in `public/clipperz-badge.png` and
`public/clipperz-icon.png`. Vite serves these same files during development and
copies them into the built Studio, including the favicon and touch icon. Run the
normal build after replacing either asset. No image generation or conversion is
needed.

Reusable setup code and dependency inputs were promoted from `_local` into these
tracked folders. Historical machine-specific completion reports, downloaded
sources, one-off repair/cleanup scripts, personal clip recipes, and generated media
remain local. New Python tests and documentation are no longer broadly ignored.
