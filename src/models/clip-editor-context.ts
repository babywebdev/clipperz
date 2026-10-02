// === Writing Studio read-only editor context (slice 1B.2b.2) ===
//
// The response types for GET /api/clips/:id/editor-context, served by
// src/services/clip-editor-context.ts. This is a read contract: it describes
// one saved clip as the editor would need to open it, and it describes what is
// *not* known rather than guessing. Nothing here authorises a write. The route
// advertises no save or adoption support, and the service that fills these
// types never imports the revision save service.
//
// Two rules shape every field below:
//
//  * Identities are captured from one history read. The response says what it
//    saw, not that the clip is still in that state now.
//  * A value is either recorded or absent. Legacy requested ranges are labelled
//    requested; they are never presented as the effective cuts of a rendered
//    file, and bounded words are never presented as full source coverage.

import type { Format } from "./index.js";
import type { OperationState } from "./clip-revisions.js";

export const EDITOR_CONTEXT_VERSION = 1;

// --- codes -------------------------------------------------------------------

/** Why a capability is or is not available. Stable; clients may switch on these. */
export type EditorReasonCode =
  | "AVAILABLE"
  /** No write route exists in this build; nothing here promises one will. */
  | "WRITE_ROUTE_NOT_AVAILABLE"
  | "MEDIA_MISSING"
  | "MEDIA_NOT_A_FILE"
  | "MEDIA_UNREADABLE"
  | "MEDIA_PATH_UNRECORDED"
  | "SOURCE_MISSING"
  | "SOURCE_NOT_A_FILE"
  | "SOURCE_UNREADABLE"
  | "SOURCE_PATH_UNRECORDED"
  | "TRANSCRIPT_UNAVAILABLE"
  | "TRANSCRIPT_EMPTY"
  | "TRANSCRIPT_BOUNDED_ONLY"
  | "TRANSCRIPT_MALFORMED"
  /** The clip entry's own output summary, which the existing by-id preview and
   * download routes serve, is absent, unusable, or names a file other than the
   * current revision's. The revision is still described, but no url here
   * serves it. */
  | "COMMITTED_MEDIA_SUMMARY_DRIFT"
  /** The file the by-id routes would resolve is not a container they stream:
   * `serveClipById` answers 400 for anything outside mp4, mov, mkv and webm,
   * so the media may exist and still not be playable through those urls. */
  | "MEDIA_KIND_UNSUPPORTED"
  /** The stored inputs describe a requested range, not the cuts the renderer made. */
  | "LEGACY_TIMING_UNPROVEN";

/** Observations worth showing the operator. Stable; never a substitute for a field. */
export type EditorDiagnosticCode =
  | "LEGACY_TIMING_UNPROVEN"
  | "LEGACY_FIELD_CONFLICT"
  | "LEGACY_WORDS_BOUNDED"
  | "SIDECAR_MALFORMED"
  | "SIDECAR_UNREADABLE"
  | "SIDECAR_EMPTY"
  /** A value stored on the legacy clip entry is unusable, so it is reported
   * rather than quietly dropped. The clip's other fields stay available. */
  | "LEGACY_ENTRY_MALFORMED"
  /** More words are stored than this response serves; `word_count` stays the
   * true stored count so the served list is never mistaken for all of them. */
  | "TRANSCRIPT_TRUNCATED"
  | "DOCUMENT_PREDATES_FINAL_COMPOSITION"
  | "BOOKEND_JOIN_INPUTS_ABSENT"
  /** The clip entry's output summary is absent, unusable, or names a file
   * other than the current revision's. What is stored is reported; neither
   * file is guessed to be right, and the committed play/download capabilities
   * go false because the existing by-id urls do not serve the revision
   * described here. */
  | "COMMITTED_MEDIA_SUMMARY_DRIFT"
  /** The file the by-id urls would resolve is not one they can stream. */
  | "MEDIA_KIND_UNSUPPORTED"
  | "MEDIA_MISSING"
  | "SOURCE_MISSING"
  | "PENDING_OPERATION"
  | "OPERATION_FAILED"
  | "THUMBNAIL_BAKE_UNKNOWN"
  | "DEMO_FIXTURE";

/** Stable failure codes. The message never carries file contents or a raw exception. */
export type EditorContextErrorCode =
  | "INVALID_CLIP_ID"
  | "CLIP_NOT_FOUND"
  | "HISTORY_UNREADABLE"
  | "HISTORY_INVALID_ENCODING"
  | "HISTORY_INVALID_JSON"
  | "HISTORY_INVALID_SHAPE"
  | "REVISION_STATE_INVALID"
  | "REVISION_DOCUMENT_UNAVAILABLE"
  | "REVISION_DOCUMENT_INVALID"
  | "DRAFT_DOCUMENT_UNAVAILABLE"
  | "DRAFT_DOCUMENT_INVALID"
  | "OWNERSHIP_ESCAPE";

export class EditorContextError extends Error {
  readonly code: EditorContextErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown>;
  constructor(code: EditorContextErrorCode, status: number, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "EditorContextError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// --- identity ----------------------------------------------------------------

export interface EditorContextIdentity {
  /** The full stored clip id. Never resolved from a prefix or a file basename. */
  clip_id: string;
  /** When the single history snapshot behind this response was read. */
  captured_at: string;
  tracked: boolean;
  /** Record identity of a tracked clip; a deleted-and-recreated clip has a new one. */
  incarnation: string | null;
  revision_version: number | null;
  draft_version: number | null;
  /** Says plainly that these are captured values, not a claim about now. */
  note: string;
}

// --- clip text and publishing metadata ---------------------------------------

/** Available whether or not any media survives. */
export interface EditorContextClip {
  title: string;
  created_at: string | null;
  content_type: string | null;
  format: Format | null;
  caption_style: string | null;
  crop_strategy: string | null;
  /** The entry's legacy summary of the served file, as stored. */
  recorded_duration: number | null;
  recorded_size_mb: number | null;
  /** Display names only; this response never returns a filesystem path. */
  source_name: string | null;
  output_name: string | null;
  transcript_slice: string | null;
  publishing: {
    generated_titles: string[] | null;
    description: string | null;
    tags: string | null;
    hashtags: string | null;
    youtube_video_id: string | null;
  };
}

// --- media -------------------------------------------------------------------

export type EditorFileState = "available" | "missing" | "not_a_file" | "unreadable" | "unrecorded";

export interface EditorContextFile {
  name: string | null;
  state: EditorFileState;
  /** Size on disk now; null unless the file is available. */
  bytes: number | null;
  /** Size the saved revision document recorded; null for legacy entries. */
  recorded_bytes: number | null;
  /** True only when both sizes are known and equal. Agreement is not integrity. */
  size_matches: boolean | null;
  /** Always false: this read never hashes a file and never decodes media. */
  integrity_verified: false;
  detail: string | null;
}

/** How the clip entry's own `output_path` summary relates to the current
 * revision's file, and whether the by-id routes could stream what it names.
 * These are three separate facts: a file can be on disk, named by a usable
 * summary, and still be a container those routes refuse. */
export interface EditorContextMediaSummary {
  /** `untracked` when there is no current revision to compare against. */
  state: "untracked" | "absent" | "invalid" | "different" | "equal";
  /** Uses the resolved regular file when available; otherwise retains the
   * recorded-name classification. File availability is reported separately. */
  served_kind: "supported" | "unsupported" | "unknown";
  detail: string;
}

export interface EditorContextMedia {
  /** The served file for the captured current revision. */
  output: EditorContextFile;
  /** The original recording the recipe or the entry names. */
  source: EditorContextFile;
  /** What the existing by-id urls would actually resolve through. */
  summary: EditorContextMediaSummary;
  urls: {
    preview: string;
    download: string;
    /** These resolve by clip id: a later save changes what they serve. */
    note: string;
  };
  /** What those urls served at the captured snapshot. Null when the clip is
   * untracked, and also when the clip entry's own output summary — which those
   * urls resolve through — no longer names the current revision's file, since
   * the response cannot then say the urls serve the revision it describes. */
  serves: { revision_id: string; version: number; provenance: "exact" | "legacy-unversioned" } | null;
}

// --- the committed revision ---------------------------------------------------

export interface EditorContextRecipe {
  source_name: string | null;
  title: string;
  caption_style: string;
  caption_position: string | null;
  caption_font_scale: number | null;
  clean_fillers: boolean | null;
  crop_strategy: string;
  crop_keyframes: Array<{ t: number; x_pct: number }> | null;
  /** Content-relative, the exact renderer's convention for crop_keyframes.t. */
  crop_keyframe_domain: "content" | null;
  has_foreground_framing: boolean;
  format: Format;
  logo: { selected: boolean; name: string | null; position: string | null };
  intro: { selected: boolean; name: string | null };
  outro: { selected: boolean; name: string | null };
  bookend_fade: number | null;
  keep_caption_overlay: boolean | null;
  allow_ass_fallback: boolean | null;
}

export interface EditorContextCard {
  requested: boolean;
  applied: boolean;
  /** Identity of the composed card image, when one was applied. */
  image: { sha256: string; bytes: number; name: string } | null;
  note: string;
}

export interface EditorContextBookend {
  kind: "intro" | "outro";
  output_start: number;
  output_end: number;
  asset_duration: number;
  requested_fade: number | null;
  applied_overlap: number;
  branch: string;
  measured_output_duration: number | null;
  /** Recorded only since 1B.2a repair-3; older accepted documents have none. */
  join_inputs: { main_duration: number; appended_duration: number } | null;
}

export interface EditorContextRevisionDocument {
  schema: number;
  created_at: string;
  operation_id: string;
  words_input: "supplied" | "unavailable";
  recipe: EditorContextRecipe;
  thumbnail_card: EditorContextCard;
  bookends: { intro: EditorContextBookend | null; outro: EditorContextBookend | null };
  /** Written since 1B.2b.1; false for accepted documents saved before it. */
  has_final_composition: boolean;
  /** Probe of the served file recorded at save; existence, not current integrity. */
  recorded_probe: { duration: number | null; bytes: number; has_video: boolean; has_audio: boolean };
  /** Optional renderer artifacts recorded beside the served file. */
  artifacts: {
    caption_overlay: { present: boolean; bytes: number | null; time_domain: string | null; contains_card: boolean | null; placed_at: number | null };
    cropped_source: { present: boolean; bytes: number | null; time_domain: string | null; contains_card: boolean | null; placed_at: number | null };
    card_image: { present: boolean; bytes: number | null; sha256: string | null; placed_at: number | null; until: number | null };
  };
  /** Operation-owned dependency groups this revision's files live in. */
  dependency_group_count: number;
}

export interface EditorContextRevision {
  revision_id: string;
  version: number;
  provenance: "exact" | "legacy-unversioned";
  committed_at: string;
  operation_id: string | null;
  /** Null for the legacy version zero, which has no document by design. */
  document: EditorContextRevisionDocument | null;
}

// --- the draft ----------------------------------------------------------------

export interface EditorContextDraft {
  version: number;
  saved_at: string;
  recipe: EditorContextRecipe;
  /** Chosen without rendering; identity only, never proof of a composed file. */
  thumbnail_card: { selected: boolean; image_sha256: string | null; image_name: string | null };
  words_input: "supplied" | "unavailable";
  source_word_count: number | null;
  note: string | null;
}

// --- operations ----------------------------------------------------------------

/** A summary. The operations archive, request hashes, residual paths and raw
 * error text are deliberately not served. */
export interface EditorContextOperations {
  total: number;
  by_state: Record<OperationState, number>;
  pending: { operation_id: string; started_at: string } | null;
  latest: { operation_id: string; state: OperationState; started_at: string; ended_at: string | null; has_error: boolean } | null;
  note: string;
}

// --- timing --------------------------------------------------------------------

export interface EditorContextSegment {
  index: number;
  source_start: number;
  source_end: number;
  content_start: number;
  content_end: number;
  duration: number;
}

export interface EditorContextTiming {
  provenance: "exact-revision" | "legacy-entry";
  /** True only for a validated exact revision whose renderer returned its map. */
  effective_cuts_known: boolean;
  /** The cuts the renderer actually made, in output order; null when unproven. */
  effective_segments: EditorContextSegment[] | null;
  /** Labelled requested: a stored range, never an effective map of legacy output. */
  requested_range: { start_second: number; end_second: number; label: "requested" } | null;
  requested_keep_segments: {
    segments: Array<{ start: number; end: number }>;
    label: "requested";
    sources: Array<"history-entry" | "legacy-recipe">;
  } | null;
  /** The raw exact render, which never contains an opening card. */
  raw_render: {
    content_duration: number;
    content_duration_measured: number;
    content_to_output_offset: number;
    output_duration: number;
  } | null;
  /** Where the raw render and the content sit in the served file. */
  final_composition: {
    card_offset: number;
    content_offset: number;
    content_duration: number;
    output_duration: number;
  } | null;
  frame_precision: { source_variable_frame_rate: boolean; note: string } | null;
  /** The producers' own recorded maps, verbatim and attributed; never rewritten. */
  time_domains: Array<{ scope: "render_timeline" | "final_composition"; map: Record<string, string> }>;
}

// --- transcript ------------------------------------------------------------------

export interface EditorWord {
  word: string;
  start: number;
  end: number;
  speaker?: string | null;
  confidence?: number;
}

export interface EditorContextTranscript {
  availability: "available" | "empty" | "unavailable" | "malformed" | "unreadable";
  provenance: "saved-content-words" | "legacy-words-sidecar" | "legacy-recipe-words" | "none";
  /** The domain of `words`, as the producing code recorded it. */
  domain: "source-absolute" | "content-relative" | null;
  /** Clip-bounded words only. The full source list is described, never dumped.
   * Every element is validated; a list holding an unusable record is reported
   * as malformed rather than filtered down to the usable ones. */
  words: EditorWord[] | null;
  /** The true stored count, even when `words` is capped for size. */
  word_count: number | null;
  /** The editorial text of a saved revision; the entry's slice for legacy clips. */
  text: string | null;
  /** Whether a full source-absolute transcript is retained for widening a trim. */
  widening_input: { available: boolean; reason: EditorReasonCode; word_count: number | null };
  detail: string | null;
}

// --- legacy recovery inputs --------------------------------------------------------

export type EditorSidecarState = "absent" | "empty" | "present" | "malformed" | "unreadable";

export interface EditorContextSidecar {
  state: EditorSidecarState;
  detail: string | null;
}

export interface EditorContextConflict {
  code: "LEGACY_FIELD_CONFLICT";
  field: string;
  values: Array<{ source: "history-entry" | "legacy-recipe" | "legacy-reframe"; value: string }>;
  detail: string;
}

export interface EditorContextLegacyRecipe {
  caption_style: string | null;
  caption_position: string | null;
  caption_font_scale: number | null;
  crop_strategy: string | null;
  format: string | null;
  clean_fillers: boolean | null;
  logo: { selected: boolean; name: string | null; position: string | null };
  intro: { selected: boolean; name: string | null };
  outro: { selected: boolean; name: string | null };
  has_foreground_framing: boolean;
  /** Requested intervals as stored. The legacy renderer never returned its own map. */
  requested_keep_segments: Array<{ start: number; end: number }> | null;
  transcript_word_count: number | null;
}

export interface EditorContextLegacy {
  reason: "untracked" | "legacy-unversioned-revision" | "tracked-without-revision";
  sidecars: { words: EditorContextSidecar; recipe: EditorContextSidecar; reframe: EditorContextSidecar };
  /** Known validated fields only; unknown stored fields are left untouched on disk. */
  recipe: EditorContextLegacyRecipe | null;
  reframe: { in_second: number | null; out_second: number | null; keyframe_count: number | null } | null;
  /** Describable as a selected asset; when and how it was baked is not recorded. */
  thumbnail: {
    selected: boolean;
    state: EditorFileState;
    card_seconds: number | null;
    baked_provenance: "unknown";
    detail: string;
  } | null;
  conflicts: EditorContextConflict[];
  recovery: { effective_cuts_known: false; reason: EditorReasonCode; needs: string[] };
}

// --- capabilities -----------------------------------------------------------------

export type EditorCapabilityId =
  | "play_committed_media"
  | "download_committed_media"
  | "edit_writing_metadata"
  | "known_effective_cuts"
  | "widen_from_source_words"
  | "reopen_source_media"
  | "save_revision"
  | "adopt_for_revision_tracking";

export interface EditorContextCapability {
  id: EditorCapabilityId;
  available: boolean;
  reason: EditorReasonCode;
  detail: string;
}

export interface EditorContextDiagnostic {
  code: EditorDiagnosticCode;
  scope: string;
  detail: string;
}

// --- the response ------------------------------------------------------------------

export interface EditorContextResponse {
  version: typeof EDITOR_CONTEXT_VERSION;
  identity: EditorContextIdentity;
  clip: EditorContextClip;
  media: EditorContextMedia;
  revision: EditorContextRevision | null;
  draft: EditorContextDraft | null;
  operations: EditorContextOperations;
  timing: EditorContextTiming;
  transcript: EditorContextTranscript;
  legacy: EditorContextLegacy | null;
  capabilities: EditorContextCapability[];
  diagnostics: EditorContextDiagnostic[];
}
