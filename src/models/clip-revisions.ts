// === Writing Studio saved revisions (slices 1B.2a, 1B.2b.1) ===
//
// Types for the internal revision save service (src/services/clip-revisions.ts).
// A clip entry in history/clips.json may carry `revisions`: the authoritative
// draft/current/previous pointers and operation records. The bulky, immutable
// draft and revision documents live in sidecars beneath the history directory
// and are referenced by path. The finishing-action adapters (1B.2b.4a,
// src/services/clip-legacy-adapters.ts) are the service's only production caller,
// and they act only on clips already tracked; nothing in production starts tracking.

import type { Format, RenderTimeline, RenderTimelineBookend, WordTimestamp } from "./index.js";

export const CLIP_REVISIONS_SCHEMA = 1;

/** Composition branches a saved revision may carry. The exact renderer refuses
 * `xfade_audio_concat` (video crossfades while audio concatenates), so the
 * consumer type excludes it: a receipt naming it is rejected before commit. */
export type SupportedBookendBranch = Exclude<RenderTimelineBookend["branch"], "xfade_audio_concat">;

/** `join_inputs` stays optional: revisions saved before 1B.2a repair-3 lack it. */
export interface SavedBookend extends Omit<RenderTimelineBookend, "branch"> {
  branch: SupportedBookendBranch;
}

/** Everything the exact renderer needs, captured verbatim at save time.
 * `keep_segments` are source-absolute in output order; `crop_keyframes.t` is
 * content-relative (the renderer's exact-mode convention). */
export interface ExactRenderRecipe {
  source_video: string;
  title: string;
  keep_segments: Array<{ start: number; end: number }>;
  caption_style: string;
  caption_position?: string;
  caption_font_scale?: number;
  clean_fillers?: boolean;
  crop_strategy: string;
  crop_keyframes?: Array<{ t: number; x_pct: number }> | null;
  foreground_framing?: Record<string, unknown> | null;
  format: Format;
  logo_path?: string | null;
  logo_position?: string;
  intro_path?: string | null;
  outro_path?: string | null;
  bookend_fade?: number | null;
  keep_caption_overlay?: boolean;
  allow_ass_fallback?: boolean;
}

/** The one supported opening card length, in seconds. */
export const OPENING_CARD_DURATION = 1.5;

/** An opening thumbnail card choice (1B.2b.1): the selected image and the
 * SHA-256 it must still have, with the fixed opening placement and 1.5-second
 * requested duration. Any other placement, duration or field is refused, never
 * coerced. */
export interface ThumbnailCardDescriptor {
  image_path: string;
  image_sha256: string;
  placement: "opening";
  duration: typeof OPENING_CARD_DURATION;
}

/** A draft is the editable state ahead of the committed revision. `source_words`
 * is the full caller-supplied source-absolute transcript: `null` means no
 * transcript is available, `[]` means one was supplied and is empty. */
export interface ClipDraft {
  recipe: ExactRenderRecipe;
  source_words: WordTimestamp[] | null;
  /** The chosen opening card, persisted without rendering; absent or null for none. */
  thumbnail_card?: ThumbnailCardDescriptor | null;
  note?: string;
}

export interface DraftPointer {
  version: number;
  path: string;
  saved_at: string;
}

export interface RevisionPointer {
  revision_id: string;
  version: number;
  /** Immutable revision document; null only for the legacy version zero. */
  path: string | null;
  /** The file served for this revision: the composed output when a card was applied. */
  output_path: string;
  /** The operation-owned group holding `output_path`; null for legacy. */
  group_root: string | null;
  /** Every operation group this revision's files live in: the renderer's and, with
   * a card, the composer's. Pointers committed before 1B.2b.1 lack it; their
   * `group_root` is their only group. */
  groups?: string[];
  operation_id: string | null;
  /** "exact" for a renderer-proven revision, "legacy-unversioned" for version zero. */
  provenance: "exact" | "legacy-unversioned";
  committed_at: string;
}

export type OperationState = "pending" | "committed" | "failed" | "cancelled" | "superseded";

export interface OperationRecord {
  operation_id: string;
  kind: "save-revision";
  state: OperationState;
  request_hash: string;
  expected: { incarnation: string; draft_version: number; revision_version: number };
  started_at: string;
  ended_at: string | null;
  /** The namespace root this operation renders into; the group is created by the renderer. */
  group_root: string | null;
  revision_id: string | null;
  error: string | null;
  /** Paths left on disk by a failed, cancelled or superseded operation; never collected here. */
  residuals: string[];
  reason: string | null;
  /** The complete committed result, retained so a replay of any age answers
   * without rendering and without depending on the current/previous pointers
   * or on the source still existing. Null until committed. */
  revision: RevisionPointer | null;
}

export interface ClipRevisionState {
  schema: typeof CLIP_REVISIONS_SCHEMA;
  /** Random identity of this record; a deleted-and-recreated clip gets a new one. */
  incarnation: string;
  draft_version: number;
  revision_version: number;
  draft: DraftPointer | null;
  current: RevisionPointer | null;
  previous: RevisionPointer | null;
  /** Newest last; at most one pending. Records are retained for the record
   * incarnation's lifetime: identity, request hash and terminal result never
   * expire here, so a retry of any age is answered from this list. */
  operations: OperationRecord[];
  roots: { namespace: string; sidecars: string };
}

export interface RevisionFile {
  path: string;
  bytes: number;
  sha256: string;
}

/** A container-level probe of one file. */
export interface SavedProbe {
  duration: number | null;
  bytes: number;
  has_video: boolean;
  has_audio: boolean;
}

// --- Opening card composition (1B.2b.1) --------------------------------------

/** Video stream facts backend/services/opening_card.py measures. Ticks are units of `time_base`. */
export interface CompositionVideoSummary {
  width: number;
  height: number;
  sample_aspect_ratio: string;
  time_base: string;
  frame_rate: string | null;
  packets: number;
  first_pts: number;
  start: number | null;
  duration: number | null;
}

export interface CompositionAudioSummary {
  sample_rate: number;
  channels: number;
  channel_layout: string | null;
  start: number | null;
  duration: number | null;
}

/** The composer's receipt, as backend/services/opening_card.py returns it. The
 * service checks every claim against the captured request and its own probes. */
export interface OpeningCardReceipt {
  version: 1;
  kind: "opening_card";
  placement: "opening";
  transition: "hardcut";
  overlap: 0;
  requested_duration: typeof OPENING_CARD_DURATION;
  raw: {
    path: string;
    sha256: string;
    file_size_bytes: number;
    duration: number | null;
    video: CompositionVideoSummary;
    audio: CompositionAudioSummary | null;
  };
  card: {
    image_path: string;
    image_sha256: string;
    image_bytes: number;
    frames: number;
    frame_ticks: number;
    frame_duration: number;
    measured_ticks: number;
    measured_duration: number;
    audio_samples: number | null;
    output_start: 0;
    output_end: number;
    audio_note: string | null;
  };
  output: {
    path: string;
    file_size_bytes: number;
    duration: number | null;
    video: CompositionVideoSummary;
    audio: CompositionAudioSummary | null;
  };
  time_domains: Record<string, string>;
  tolerance: { video_ticks: 0; card_seconds: number; audio_seconds: number | null; basis: string };
}

/** backend/services/opening_card.py's v1 TIME_DOMAINS, verbatim: the only time-domain
 * map a version 1 receipt may declare. */
export const OPENING_CARD_TIME_DOMAINS: Readonly<Record<string, string>> = {
  "output.*, card.output_start, card.output_end": "seconds in the composed file, the opening card included",
  "raw.*": "seconds in the raw exact render, which has no card; add card.measured_duration to place them in the composed file",
  "*.first_pts, card.frame_ticks, card.measured_ticks": "ticks of the video time base the raw render and the composed file share",
};

export const FINAL_COMPOSITION_VERSION = 1;

/** Where an artifact's own second 0 plays in the composed file, and whether it holds the card. */
export interface ArtifactPlacement {
  path: string;
  time_domain: string;
  contains_card: boolean;
  placed_at: number;
}

/**
 * What the served file is, recorded beside the renderer's unmodified receipt.
 * `render_timeline` keeps describing the raw exact render (no card); this record
 * places that render, its optional artifacts and any opening card in the final
 * file. Additive since 1B.2b.1: earlier documents lack it and are read as saved,
 * with no composition proof invented for them.
 */
export interface FinalCompositionRecord {
  version: typeof FINAL_COMPOSITION_VERSION;
  raw_render: {
    file: RevisionFile;
    group_root: string;
    output_duration: number;
    content_to_output_offset: number;
    probe: SavedProbe;
  };
  card: null | {
    descriptor: ThumbnailCardDescriptor;
    image: RevisionFile;
    group_root: string;
    placement: "opening";
    transition: "hardcut";
    overlap: 0;
    requested_duration: typeof OPENING_CARD_DURATION;
    frames: number;
    frame_duration: number;
    measured_duration: number;
    audio_samples: number | null;
    output_start: 0;
    output_end: number;
    producer: OpeningCardReceipt;
  };
  output: {
    file: RevisionFile;
    /** Probed length of the served file; also the legacy `duration` projection. */
    duration: number;
    probe: SavedProbe;
    video: CompositionVideoSummary | null;
    audio: CompositionAudioSummary | null;
  };
  /** Output second at which the raw render's second 0 plays: the measured card length, 0 without a card. */
  card_offset: number;
  /** Output second at which the edited content starts: card_offset plus the raw content_to_output_offset. */
  content_offset: number;
  /** Edited content seconds, unchanged by any card. */
  content_duration: number;
  artifacts: {
    main: ArtifactPlacement;
    raw_render: ArtifactPlacement;
    caption_overlay: ArtifactPlacement | null;
    cropped_source: ArtifactPlacement | null;
    card_image: (ArtifactPlacement & { sha256: string; until: number }) | null;
  };
  time_domains: Record<string, string>;
  tolerance: { video_ticks: 0; card_seconds: number | null; audio_seconds: number | null; basis: string };
}

export type SavedThumbnailCard =
  | { requested: false; applied: false; note: string }
  | { requested: true; applied: true; descriptor: ThumbnailCardDescriptor; image: RevisionFile; group_root: string; note: string };

/** The immutable document written for a committed revision. */
export interface ClipRevisionDocument {
  schema: typeof CLIP_REVISIONS_SCHEMA;
  revision_id: string;
  clip_id: string;
  incarnation: string;
  operation_id: string;
  version: number;
  created_at: string;
  recipe: ExactRenderRecipe;
  /** Full caller-supplied source-absolute words; null when unavailable. */
  source_words: WordTimestamp[] | null;
  words_input: "supplied" | "unavailable";
  /** The renderer's exact v1 receipt, unmodified: it describes the raw render, never a card. */
  render_timeline: RenderTimeline;
  /** `main` is the served file (the composed output when a card was applied);
   * the sidecars are the renderer's content-domain artifacts. */
  files: { main: RevisionFile; caption_overlay: RevisionFile | null; cropped_source: RevisionFile | null };
  /** The group holding `files.main`. */
  group_root: string;
  /** Probe of `files.main`. */
  probe: SavedProbe;
  /** Truthful card provenance. Documents saved before 1B.2b.1 always say absent. */
  thumbnail_card: SavedThumbnailCard;
  /** Bookends saved since 1B.2a repair-3 carry `join_inputs`, required and checked
   * at save. Documents saved before then lack them and are read as saved, never
   * rewritten or upgraded. */
  bookends: { intro: SavedBookend | null; outro: SavedBookend | null };
  /** Present on documents saved since 1B.2b.1; see FinalCompositionRecord. */
  final_composition?: FinalCompositionRecord;
}

export interface ExpectedState {
  incarnation: string;
  draft_version: number;
  revision_version: number;
}

export interface SaveDraftRequest {
  clip_id: string;
  expected: ExpectedState;
  draft: ClipDraft;
}

export interface SaveDraftResult {
  state: ClipRevisionState;
  draft: DraftPointer;
  /** A pending render whose draft this save superseded, if any. */
  superseded_operation: string | null;
}

export interface SaveRevisionRequest {
  clip_id: string;
  operation_id: string;
  expected: ExpectedState;
  recipe: ExactRenderRecipe;
  source_words: WordTimestamp[] | null;
  /** An opening card to compose onto the render. Absent, null or false saves
   * without one, with the same request identity as before cards existed. */
  thumbnail_card?: ThumbnailCardDescriptor | null | false;
  /** Legacy thumbnail settings a finishing action stores with its commit (1B.2b.4a):
   * they replace the entry's `thumbnail_config` keys in the same locked commit, except
   * the projected `preview_path` and `card_seconds`, which are dropped here. Absent or
   * null stores none, with the same request identity as before this field existed. */
  thumbnail_metadata?: Record<string, unknown> | null;
}

/** Store legacy thumbnail settings without rendering (1B.2b.4a), for a finishing action
 * whose recipe and card equal the current revision's. Same expected-state rules as a save. */
export interface ThumbnailMetadataRequest {
  clip_id: string;
  expected: ExpectedState;
  thumbnail_metadata: Record<string, unknown>;
}

export interface ThumbnailMetadataResult {
  /** False when the stored settings already equalled the request: nothing was written. */
  changed: boolean;
  state: ClipRevisionState;
}

export type SaveRevisionResult =
  | { outcome: "committed"; replayed: boolean; revision: RevisionPointer; operation: OperationRecord; state: ClipRevisionState }
  | { outcome: "pending"; replayed: true; operation: OperationRecord; state: ClipRevisionState }
  | { outcome: "failed" | "cancelled" | "superseded"; replayed: boolean; operation: OperationRecord; state: ClipRevisionState | null };

export interface InvalidateOperationRequest {
  clip_id: string;
  operation_id: string;
  /** The record incarnation the caller observed; a recreated clip's same-ID
   * operation is never touched by a cancellation aimed at an earlier one. */
  expected_incarnation: string;
  reason: string;
}

export type InvalidateOperationResult =
  | { outcome: "invalidated"; operation: OperationRecord }
  | { outcome: "already-terminal"; operation: OperationRecord }
  | { outcome: "not-owned"; reason: string }
  | { outcome: "unknown" };

export type ClipRevisionErrorCode =
  | "INVALID_IDENTIFIER"
  | "INVALID_RECIPE"
  | "INVALID_THUMBNAIL_CARD"
  | "CARD_IMAGE_MISMATCH"
  | "CLIP_NOT_FOUND"
  | "CLIP_NOT_TRACKED"
  | "EXPECTED_STATE_MISMATCH"
  | "OPERATION_BUSY"
  | "OPERATION_ID_REUSED"
  | "INVALID_RECEIPT"
  | "INVALID_COMPOSITION"
  | "OWNERSHIP_ESCAPE"
  | "ARTIFACT_OUTSIDE_NAMESPACE"
  | "ARTIFACT_INVALID"
  | "SIDECAR_WRITE_FAILED";

export class ClipRevisionError extends Error {
  readonly code: ClipRevisionErrorCode;
  readonly details: Record<string, unknown>;
  constructor(code: ClipRevisionErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ClipRevisionError";
    this.code = code;
    this.details = details;
  }
}
