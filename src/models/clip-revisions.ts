// === Writing Studio saved revisions (slice 1B.2a) ===
//
// Types for the internal revision save service (src/services/clip-revisions.ts).
// A clip entry in history/clips.json may carry `revisions`: the authoritative
// draft/current/previous pointers and operation records. The bulky, immutable
// draft and revision documents live in sidecars beneath the history directory
// and are referenced by path. Nothing here is exposed through a route, CLI or
// MCP tool yet; only explicit tests and the disposable check invoke the service.

import type { Format, RenderTimeline, RenderTimelineBookend, WordTimestamp } from "./index.js";

export const CLIP_REVISIONS_SCHEMA = 1;

/** Composition branches a saved revision may carry. The exact renderer refuses
 * `xfade_audio_concat` (video crossfades while audio concatenates), so the
 * consumer type excludes it: a receipt naming it is rejected before commit. */
export type SupportedBookendBranch = Exclude<RenderTimelineBookend["branch"], "xfade_audio_concat">;

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

/** A draft is the editable state ahead of the committed revision. `source_words`
 * is the full caller-supplied source-absolute transcript: `null` means no
 * transcript is available, `[]` means one was supplied and is empty. */
export interface ClipDraft {
  recipe: ExactRenderRecipe;
  source_words: WordTimestamp[] | null;
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
  output_path: string;
  /** The operation-owned group directory under the export namespace; null for legacy. */
  group_root: string | null;
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
  /** The renderer's exact v1 receipt, unmodified. */
  render_timeline: RenderTimeline;
  files: { main: RevisionFile; caption_overlay: RevisionFile | null; cropped_source: RevisionFile | null };
  group_root: string;
  probe: { duration: number | null; bytes: number; has_video: boolean; has_audio: boolean };
  /** Truthful card provenance: this service composes no opening card. */
  thumbnail_card: { requested: false; applied: false; note: string };
  bookends: { intro: SavedBookend | null; outro: SavedBookend | null };
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
  /** Any value here is an opening thumbnail-card request, which this service rejects. */
  thumbnail_card?: unknown;
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
  | "UNSUPPORTED_THUMBNAIL_CARD"
  | "CLIP_NOT_FOUND"
  | "CLIP_NOT_TRACKED"
  | "EXPECTED_STATE_MISMATCH"
  | "OPERATION_BUSY"
  | "OPERATION_ID_REUSED"
  | "INVALID_RECEIPT"
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
