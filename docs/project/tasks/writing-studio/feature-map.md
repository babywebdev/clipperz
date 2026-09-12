# Feature-preservation checklist

Planning inventory, 2026-09-11. All implementation checks below remain unchecked.
Reviewed against baseline by coordinating lead in spec lead-2. Isaac confirmed
caption/logo placement and writing retention; no runtime capability is checked off.
The incoming lead/worker should add any missed controls found during implementation.
Moving a button does not demonstrate its underlying behavior works.

## Library editing and clip management

| Existing capability | Destination / required behavior | Checked |
|---|---|---|
| Open saved clips from Library | Same Library listing and stable `/clip/:id` link | [ ] |
| Video playback, audio, scrub, duration | Library and Writing Studio use the committed revision; draft preview labeled separately | [ ] |
| Trim handles, shorter/longer selection | Library timeline; source/kept-segment bounds validated | [ ] |
| Reframe by horizontal crop position | Library; match stored output format and framing | [ ] |
| Add/select/delete crop keyframes | Library timeline; preserved through saves and reopening | [ ] |
| Camera-cut detection/markers, previous/next cut | Library timeline; failures do not block editing | [ ] |
| Previous/next frame controls | Library timeline with correct or explicitly approximate timing | [ ] |
| Apply & re-render, error/cancel states | Unified save path; draft and committed results remain distinct | [ ] |
| Reopen in New Episode editor | Clip-management link; retains existing behavior and source/settings | [ ] |
| Download | Download current committed clip in both relevant views | [ ] |
| Delete clip | Management action; invalidate jobs, detach writing, preserve original source | [ ] |
| Source name, timing, size, format/content metadata | Library details; preserve visibility without extra writing panels | [ ] |
| Conditional DaVinci export | Preserve existing integration conditional/link where enabled; local policy stays blocked | [ ] |

## Thumbnail workflow

| Existing capability | Destination / required behavior | Checked |
|---|---|---|
| Get/refresh headline and frame options | Library Thumbnail panel using existing AI policy/local extraction | [ ] |
| Select suggested two-line text or enter own | Library; pending text saved with draft | [ ] |
| Pick frame, cycle New frame, upload image | Library; preserve allowed local image formats and validation | [ ] |
| Generate/regenerate with automatic text if empty | Library; explicit status for AI/image/card work | [ ] |
| Thumbnail preview and saved video poster | Library and Writing Studio display the actual selected/saved thumbnail | [ ] |
| 1.5s opening card, replacement instead of stacking | Save/commit pipeline, including reframe/trim/logo/caption operations | [ ] |
| No suitable face candidates / unavailable AI | Actionable feedback and existing manual text/upload options | [ ] |

## Writing and finishing

| Existing capability | Destination / required behavior | Checked |
|---|---|---|
| Clip title editing and Save | Writing Studio; selecting a generated title can apply it to the clip | [ ] |
| Generate/regenerate clip titles, description, tags, hashtags | Writing Studio linked to that clip's transcript/content revision | [ ] |
| Persist clip-generated metadata | Per-clip writing document and compatible legacy fields; reload-safe | [ ] |
| Copy description, tags, hashtags, transcript | Writing Studio; preserve clipboard feedback | [ ] |
| Full clip transcript display | Writing Studio; reflects ordered edited content, not removed intervals | [ ] |
| Caption-style selector | Writing Studio finishing section; Apply & save video actually renders it | [ ] |
| Select logo, preview placements, choose position | Writing Studio finishing section | [ ] |
| Apply and remove logo / restore without logo | Same current edit revision; do not restore an obsolete pre-logo video | [ ] |
| Optional title/working topic and pasted transcript | Standalone Writing Studio document, no clip required | [ ] |
| Use current episode transcript | Explicit import into standalone writing, with source shown | [ ] |
| Full episode and Short/clip writing modes | Both available for standalone and appropriate selected-clip writing | [ ] |
| Generate complete content package | Writing Studio; preserve title options and top pick when supplied | [ ] |
| Copy title options (Content) | Preserve copy as well as per-clip apply-title action | [ ] |
| Per-section regeneration and optional extra guidance | Titles, description, tags, hashtags; save only affected document/section | [ ] |
| Ask for anything else/custom output and Copy | Writing Studio; preserve requests/results durably | [ ] |
| Generation progress and partial content | Correlated by document/request; do not overwrite newer edits | [ ] |
| Browser-restored main Content result | Idempotent migration to standalone writing; no loss on failure | [ ] |
| Content title/thumbnail mockup | Optional clearly labeled text-layout preview; not a rendered image | [ ] |

## New outcomes required by this plan

- [ ] Content navigation becomes Writing Studio; old links continue to resolve.
- [ ] Select a finished Library clip directly in Writing Studio without file transfer.
- [ ] Save draft and Save & open Writing Studio have distinct, truthful effects.
- [ ] Final preview/download remain tied to one successful saved revision.
- [ ] Thumbnail strip, waveform, exact trim inputs, timeline zoom and undo/redo work.
- [ ] Noncontiguous segments, words, keyframes, and card/intro/outro offsets stay aligned.
- [ ] Concurrent tabs, late AI results, cancellations, restart and missing media are safe.
- [ ] Cleanup protects live references and offers retired app-created revisions.
- [ ] Writing survives clip deletion as an explicitly detached standalone document.
- [ ] New Episode and Highlights retain their existing capabilities.

Source anchors: `src/ui/client/ClipDetail.tsx`, `ContentStudio.tsx`,
`ReframeEditor.tsx`, `ClipPlayer.tsx`, `main.tsx`, `Layout.tsx`, and their routes in
`src/ui/web-server.ts`. This inventory describes the inspected source, not runtime
verification. Source references in this paragraph are relative to the repository
root or, for the abbreviated component names, `src/ui/client/`.
