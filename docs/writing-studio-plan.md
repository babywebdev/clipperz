# Writing Studio and Library editing — discussion draft

Status: proposed scope for discussion; implementation has not started. The exact
workflow 4.0.6 source must be identified before adapting its worker process.

## Outcome

Replace Content in navigation with Writing Studio. Make Library the place to edit
a clip, then hand the saved result to Writing Studio for publishing preparation.
Keep every existing Library and Content capability available. No download and
reupload is required between the two views.

## Proposed division

Library clip view retains playback, trimming, reframing, thumbnail selection and
generation, and gains a timeline. Save, download, deletion, and reopening the
episode editor remain available as necessary clip-management actions.

Writing Studio gains a saved-clip selector, the selected clip's rendered preview,
transcript, generated titles, description, tags, and hashtags. Move the existing
caption-style and logo controls here to honor the requested Library scope. Keep
standalone transcript input, Use current episode, episode/Shorts writing modes,
individual-section regeneration with guidance, and custom writing requests.
Provide a link back to Library for trim, reframe, and thumbnail changes.

The real thumbnail stays editable in Library and visible alongside the video in
Writing Studio. Preserve all existing thumbnail actions. The Content tab's title
mockup must be labeled clearly so it is not confused with the saved thumbnail.

Confirm before implementation whether captions and logos belong in Writing Studio
as proposed: both affect the rendered video, although they are publishing-stage
finishing controls.

## Save and handoff

1. Save draft stores Library editing choices without declaring the clip finished.
2. Save & open Writing Studio renders pending video changes, then marks that
   successful revision ready for writing and opens it in Writing Studio.
3. Writing Studio reads the clip by stable ID and saved revision. It uses the
   rendered file with its applied thumbnail card and current transcript.
4. A failed or cancelled render leaves the last successful version available and
   does not mark the draft ready. Display rendering progress and actionable errors.
5. Later Library edits create a draft revision. Existing writing remains available;
   after saving a different revision, identify writing generated for an older one
   and let the user keep or regenerate it. Never silently discard edited writing.
6. Caption/logo changes in Writing Studio also produce a saved render revision.
   Pure visual changes should not unnecessarily invalidate transcript-based copy.

Use explicit readiness rather than guessing from an export or download. Existing
rendered Library clips can be selected directly; avoid requiring a new render
unless their settings actually changed. Readiness means ready for writing, not
published to a social platform.

## Storage and compatibility

Keep original recordings intact. Store draft edit decisions, successful render
revision, readiness, and writing references with stable clip IDs. Preserve existing
clip metadata and saved generated text. Import the existing Content browser draft
without removing it until the new saved draft is confirmed. Persist custom writing
and standalone drafts as well as the main content package.

Use safe render completion before updating saved paths. Cleanup must protect active
renders, saved revisions in use, thumbnails, and their source dependencies. Define
bounded revision retention and user-visible cleanup so this change does not create
unlimited copies. Deleting a clip must make clear what happens to its writing.

Preserve the existing local media processing and strict AI provider routing.
Keep compatible links/API behavior where practical; redirect the old Content route
to Writing Studio. Do not rename legacy settings or saved-data paths unnecessarily.

## Timeline: proposed first release

Implement a single-clip timeline with a scrubber, thumbnail strip, audio waveform,
draggable in/out handles, exact time entry, play/pause, and undo/redo. Preview trim
and framing changes immediately; save/render commits the resulting video.

Clarify how the timeline displays clips assembled from multiple source segments
and the generated 1.5-second thumbnail card. Transcript timing and thumbnail-card
replacement must remain correct after trimming. Do not promise frame-perfect live
effects when final rendering is required; distinguish live and rendered previews.

A multitrack editor with arbitrary split/reorder, transitions, overlays, and
keyframes is a separate expansion, subject to an explicit scope decision.

## Proposed implementation phases

1. Inventory every control and endpoint; create a feature-preservation checklist.
   Finalize layout, readiness, revision storage, and timeline scope.
2. Implement compatible clip/draft/writing persistence and safe save/render handoff.
3. Build Writing Studio using shared components and migrate existing saved writing.
4. Simplify Library and add the agreed timeline without removing editing features.
5. Verify the entire workflow on disposable media, review the UI, and document it.

Adapt these phases to workflow 4.0.6 after reading its actual instructions. Prepare
bounded worker assignments with acceptance criteria and review checkpoints before
dispatching implementation work. Do not start a worker from this discussion draft.

## Acceptance checks

- Every existing Library and Content capability has a working destination.
- Save/open requires no media upload or download; a reload restores the right clip.
- Writing, video, transcript, and thumbnail refer to the intended saved revision.
- Save failures and concurrent edits cannot replace a newer successful revision.
- Trims preserve audio sync and transcript timing, including multi-segment clips.
- Regenerating thumbnails replaces the old card without accumulating cards.
- Captions and logos persist in saved output and preview correctly.
- Existing clips, Content drafts, links, and generated metadata survive migration.
- Cleanup cannot delete files referenced by active work or retained saved revisions.
- Main workflows work with keyboard controls and visible render/error states.

## Decisions still needed

- Location and exact identity of workflow 4.0.6 and its intended worker mechanism.
- Confirm the proposed placement of captions and logos in Writing Studio.
- Confirm single-clip trimming timeline versus a broader split/reorder editor.
