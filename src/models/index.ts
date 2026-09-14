// === Task Communication Models ===

export interface TaskRequest {
  task_id: string;
  task_type: "transcribe" | "parse_transcript" | "create_clip" | "batch_clips" | "analyze_energy" | "detect_highlights" | "manage_reel" | "pack_transcript" | "detect_encoder" | "presets" | "ping" | "suggest_clips" | "find_moment" | "generate_content" | "generate_custom" | "corrections" | "manage_integrations" | "run_integration_tool" | "manage_config" | "manage_env" | "ai_cli_status" | "ai_provider_status" | "analyze_silence" | "render_silence_removed" | "export_full_episode";
  params: Record<string, unknown>;
}

export interface TaskResult<T = Record<string, unknown>> {
  task_id: string;
  status: "success" | "error";
  data?: T;
  error?: string;
}

export interface ProgressEvent {
  task_id: string;
  stage: string;
  percent: number;
  message: string;
  clip_result?: BatchClipsResult["results"][number];
  partial?: Record<string, unknown>;
  ai?: { status: string; provider: string; label: string; fallback_reason: string; attempts: string[] };
}

// === Transcript Models ===

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string | null;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string | null;
}

export interface SpeakerInfo {
  total_time: number;
  segments: number;
  label: string;
}

export interface SpeakerSummary {
  num_speakers: number;
  speakers: Record<string, SpeakerInfo>;
}

export interface SpeakerSegment {
  speaker: string;
  start: number;
  end: number;
}

export interface TranscriptResult {
  transcript: string;
  segments: TranscriptSegment[];
  words: WordTimestamp[];
  duration: number;
  language: string;
  speakers: SpeakerSummary;
  speaker_segments: SpeakerSegment[];
  engine?: string;
}

// === Clip Models ===

export type CaptionStyle = "branded" | "hormozi" | "karaoke" | "subtle";
export type CropStrategy = "center" | "face" | "speaker";
export type Format = "vertical" | "horizontal" | "square";

export interface ClipRequest {
  video_path: string;
  start_second: number;
  end_second: number;
  caption_style: CaptionStyle;
  crop_strategy: CropStrategy;
  title?: string;
  transcript_words: WordTimestamp[];
}

export interface ClipResult {
  output_path: string;
  duration: number;
  file_size_mb: number;
  format?: Format;
  caption_overlay_path?: string;
  cropped_source_path?: string;
  /** Present only for an exact-edit render (internal create_clip `timing_mode: "exact"`). */
  timing_mode?: TimingMode;
  render_timeline?: RenderTimeline;
}

// === Exact render result (Writing Studio 1B.1) ===
//
// Internal create_clip contract. `timing_mode: "exact"` renders the ordered
// `keep_segments` exactly as supplied and returns `render_timeline` version 1
// describing what was actually produced. Absent timing_mode keeps the legacy
// renderer behavior and result shape. Not exposed through any public route yet.

export type TimingMode = "legacy" | "exact";

/** A source-absolute interval, in the order it is rendered. */
export interface RenderTimelineSegment {
  index: number;
  source_start: number;
  source_end: number;
  /** Content-relative seconds: kept intervals concatenated from 0 in supplied order. */
  content_start: number;
  content_end: number;
  duration: number;
}

export interface RenderTimelineBookend {
  kind: "intro" | "outro";
  /** Output seconds occupied by the bookend outside the transition. */
  output_start: number;
  output_end: number;
  asset_duration: number;
  requested_fade: number | null;
  /** Seconds of video the join really overlaps; 0 for a hard cut. */
  applied_overlap: number;
  /** Composition branch the helper actually took. */
  branch: "xfade_acrossfade" | "xfade_audio_concat" | "hardcut_soft_audio" | "hardcut";
  transition: { output_start: number; output_end: number };
  measured_output_duration: number | null;
}

export interface RenderTimelineTolerance {
  content_seconds: number;
  composition_seconds: number;
  av_sync_seconds: number;
  basis: string;
}

/** A content-relative word; carries whatever metadata the source word had (speaker, confidence). */
export interface RenderTimelineWord {
  word: string;
  start: number;
  end: number;
  speaker?: string | null;
  confidence?: number;
  [extra: string]: unknown;
}

export interface RenderTimeline {
  version: 1;
  timing_mode: "exact";
  time_domains: Record<string, string>;
  source: {
    path: string;
    duration: number | null;
    fps: number | null;
    frame_rate_variable: boolean;
    width: number | null;
    height: number | null;
    has_audio: boolean;
  };
  segment_count: number;
  segments: RenderTimelineSegment[];
  /** Requested content seconds (sum of intervals); the legacy top-level `duration`. */
  content_duration: number;
  /** Probed content seconds after cut, framing, captions and loudness. */
  content_duration_measured: number;
  /** Output second at which content starts (intro contribution, 0 without one). */
  content_to_output_offset: number;
  /** Probed length of the rendered file, bookends included. */
  output_duration: number;
  output: {
    path: string;
    width: number | null;
    height: number | null;
    fps: number | null;
    frame_rate_variable: boolean;
    has_audio: boolean;
    video_duration: number | null;
    /** null when the output has no audio stream. */
    audio_duration: number | null;
    file_size_bytes: number;
  };
  tolerance: RenderTimelineTolerance;
  frame_precision: { source_variable_frame_rate: boolean; note: string };
  bookends: {
    requested_fade: number | null;
    intro: RenderTimelineBookend | null;
    outro: RenderTimelineBookend | null;
  };
  /** The Library's opening card is applied by the server later; always absent here. */
  thumbnail_card: { applied: false; note: string };
  framing: {
    format: Format;
    width: number;
    height: number;
    crop_strategy: string;
    foreground_framing: import('../services/foreground-framing.js').ForegroundFraming | null;
    crop_keyframes: { time_domain: "content"; keyframes: Array<{ t: number; x_pct: number }> | null };
  };
  words: {
    /** "unavailable" when no transcript_words list was supplied; "supplied" otherwise, even if empty. */
    input: "supplied" | "unavailable";
    source_count: number | null;
    /** Supplied source-absolute words touching any kept interval, unmodified. */
    source: RenderTimelineWord[] | null;
    /** Content-relative, boundary-clipped, in output order; the editorial transcript. */
    content: RenderTimelineWord[];
    content_text: string;
  };
  captions: {
    requested: boolean;
    style: string;
    /** True only when a caption renderer actually drew words. */
    rendered: boolean;
    renderer: "remotion" | "ass" | null;
    filler_cleaning: boolean;
    /** The caption-cleaned words that were drawn; distinct from words.content. */
    words: RenderTimelineWord[];
    unavailable_reason: string | null;
  };
  heuristics_disabled: string[];
}

export interface SuggestedClip {
  clip_id: string;
  title: string;
  start_second: number;
  end_second: number;
  duration: number;
  payoff?: string;
  standalone?: string;
  context_line?: string;
  reasoning: string;
  preview_text: string;
  segments?: Array<{ start: number; end: number }>;
  suggested_caption_style?: string;
  timestamp_display?: string;
  content_type?: string;
  score?: number;
  rank?: number;
}

export interface UIState {
  videoPath?: string;
  filePath?: string;
  activeExportJobId?: string | null;
  transcript?: TranscriptResult | null;
  rawTranscriptText?: string;
  silenceOriginal?: { videoPath: string; transcript: TranscriptResult } | null;
  silencePlan?: Record<string, unknown> | null;
  suggestions?: SuggestedClip[];
  deselectedIndices?: number[];
  settings?: {
    captionStyle?: string;
    foregroundFraming?: import('../services/foreground-framing.js').ForegroundFraming | null;
    cropStrategy?: string;
    format?: Format;
    logoPath?: string;
    outroPath?: string;
    introPath?: string;
    cleanFillers?: boolean;
    captionPosition?: string;
    captionFontScale?: number;
    logoPosition?: string;
    onboardingDismissed?: boolean;
    silenceThreshold?: number;
    silenceMinPause?: number;
    silencePadding?: number;
  };
  phase?: string;
  lastUpdated?: number;
}

/** Who is speaking, shown as a lower third for the first seconds of a clip. */
export interface NameCard {
  title: string;
  subtitle?: string;
  seconds?: number;
  accent?: string;
}

/**
 * How a part of a clip arrives and leaves.
 *
 * Omitted, each caption style uses the motion it has always had.
 */
export interface Motion {
  enter?: "none" | "fade" | "rise" | "pop";
  exit?: "none" | "fade" | "sink";
  /** Frames, at the render's fps. */
  duration?: number;
  feel?: "snap" | "soft" | "linear";
}

export interface ClipMotion {
  captions?: Motion;
  nameCard?: Motion;
}

export interface CreateClipInput {
  clip_number?: number;
  video_path?: string;
  start_second?: number;
  end_second?: number;
  title?: string;
  caption_style?: string;
  crop_strategy?: string;
  format?: Format;
  logo_path?: string;
  outro_path?: string;
  intro_path?: string;
  name_card?: NameCard;
  motion?: ClipMotion;
  transcript_words?: WordTimestamp[];
  clean_fillers?: boolean;
  allow_ass_fallback?: boolean;
  keep_caption_overlay?: boolean;
}

export interface BatchClipSpec {
  start_second: number;
  end_second: number;
  title?: string;
  caption_style?: string;
  crop_strategy?: string;
  format?: Format;
  logo_path?: string | null;
  intro_path?: string | null;
  allow_ass_fallback?: boolean;
  keep_caption_overlay?: boolean;
  keep_segments?: Array<{ start: number; end: number }>;
}

export interface BatchClipsInput {
  video_path?: string;
  transcript_words?: WordTimestamp[];
  clip_numbers?: number[];
  clips?: BatchClipSpec[];
  export_selected?: boolean;
  format?: Format;
  clean_fillers?: boolean;
  allow_ass_fallback?: boolean;
  keep_caption_overlay?: boolean;
  /**
   * When true, POST to the Web UI's /api/batch-clips and return a job_id
   * immediately so the caller can poll job_status and emit live progress.
   * Requires the Web UI to be running (npm run ui).
   */
  async_mode?: boolean;
}

export interface BatchClipsResult {
  total_clips: number;
  successful_clips: number;
  results: Array<{
    clip_index?: number;
    status: "success" | "error";
    output_path?: string;
    start_second?: number;
    end_second?: number;
    /** Bounds of the clip as submitted; the renderer may trim start_second. */
    source_start_second?: number;
    source_end_second?: number;
    caption_style?: string;
    crop_strategy?: string;
    format?: Format;
    title?: string;
    file_size_mb?: number;
    duration?: number;
    error?: string;
  }>;
}

// === Asset Models ===

export type AssetType =
  | "logo"
  | "outro"
  | "intro"
  | "music"
  | "video"
  | "image"
  | "audio"
  | "other";

export interface Asset {
  name: string;
  type: AssetType;
  path: string;
  addedAt: string;
  default?: boolean;
}

export const ASSETS_SCHEMA_VERSION = 2;

export interface AssetRegistry {
  schemaVersion?: number;
  assets: Asset[];
}

// === Clip History Models ===

export interface ClipPerformanceMetrics {
  views?: number;
  retention?: number; // averageViewPercentage, 0-100
  ctr?: number; // impressionsClickThroughRate, 0-100
  impressions?: number;
  fetched_at?: string;
}

export interface ClipThumbnailConfig {
  text?: string;
  line1?: string; // explicit first line (overrides the AI split)
  line2?: string; // explicit second line
  image_path?: string; // user-supplied background image
  timestamp?: number; // absolute second in the source video for the frame
  preview_path?: string; // chosen thumbnail PNG
  variations?: string[]; // all generated thumbnail PNGs to pick from
  card_seconds?: number; // duration of the thumbnail card baked into the clip start
}

export interface ClipHistoryEntry {
  id: string;
  source_video: string;
  start_second: number;
  end_second: number;
  caption_style: string;
  crop_strategy: string;
  format?: Format;
  logo_path?: string;
  outro_path?: string;
  intro_path?: string;
  title: string;
  output_path: string;
  file_size_mb: number;
  duration: number;
  created_at: string;
  content_type?: string;
  transcript_slice?: string;
  logo_backup_path?: string;
  logo_position?: string;
  keep_segments?: Array<{ start: number; end: number }>;
  thumbnail_config?: ClipThumbnailConfig;
  youtube_video_id?: string;
  metrics?: ClipPerformanceMetrics;
  // AI-generated publishing metadata (titles/description/tags/hashtags), persisted
  // so it survives a page reload instead of vanishing after generation.
  generated_titles?: string[];
  description?: string;
  tags?: string;
  hashtags?: string;
  // Set for signed-in users once the clip is mirrored to the workspace. A false
  // cloud_synced marks a clip a later sweep should backfill; the local file
  // stays the source of truth either way.
  cloud_id?: string;
  cloud_synced?: boolean;
  cloud_video_uploaded?: boolean;
  // Writing Studio saved revisions (1B.2a): authoritative draft/current/previous
  // pointers and operation records. Absent on unversioned clips; unknown to the
  // Python writer, which preserves it as an opaque field.
  revisions?: import("./clip-revisions.js").ClipRevisionState;
}

// === Knowledge Base Models ===

export interface KnowledgeFile {
  filename: string;
  content: string;
  updatedAt: string;
}
