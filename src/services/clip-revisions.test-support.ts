// Test seam for the revision save service: a fake exact renderer that
// reproduces the accepted renderer's publication shape (an exclusively
// created `<stem>-<op>/` group beneath the requested output_dir, staged then
// renamed to `final/`) and its exact v1 receipt, without FFmpeg. The receipt
// follows backend/services/exact_render.py and clip_generator.py: the same
// time-domain map, word retention and projection, caption fields, bridge fade
// default and bookend regions. Fault injection options let tests drive every
// refusal branch. Used by the vitest suites and the child-process worker
// fixture only; never by production code.
import { randomBytes } from "crypto";
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync, cpSync } from "fs";
import { join } from "path";
import type { ClipResult, RenderTimeline, RenderTimelineBookend, RenderTimelineWord, WordTimestamp } from "../models/index.js";
import type { MediaProbe, ProbeFn, RenderFn } from "./clip-revisions.js";

export interface FakeRenderOptions {
  /** Composition branch reported for any requested bookend. */
  branch?: RenderTimelineBookend["branch"];
  /** Report the opening card as applied (a receipt the service must refuse). */
  cardApplied?: boolean;
  /** Throw instead of rendering: the renderer failed and published nothing. */
  failWith?: Error;
  /** Publish the group beneath this directory instead of the requested output_dir. */
  publishUnder?: string;
  /** Report a wrong file size in the receipt. */
  sizeMismatch?: boolean;
  /** Leave the staging directory beside final/ (an incomplete group). */
  leaveStaging?: boolean;
  /** Seconds each bookend asset contributes. */
  bookendSeconds?: number;
  onRender?: (params: Record<string, unknown>, result: ClipResult) => void;
}

export interface FakeRender extends RenderFn {
  calls: number;
  lastParams: Record<string, unknown> | null;
}

/** Approximates backend/utils/text.py safe_filename for the group stem. */
export function fakeStem(title: string): string {
  const cleaned = title.replace(/[^A-Za-z0-9\s_-]+/g, "").trim().replace(/\s+/g, "_") || "clip";
  return `${cleaned}_short`;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** clip_generator._exact_render_timeline's time_domains, verbatim. */
const TIME_DOMAINS: Record<string, string> = {
  "segments.source_*": "source-absolute seconds in the original file",
  "segments.content_*, words.content[], captions.words[], framing.crop_keyframes[].t":
    "content-relative seconds: kept intervals concatenated in supplied order from 0",
  "bookends.*.output_*, content_to_output_offset, output_duration":
    "output seconds in the rendered file, bookends included",
};

/** clip_generator._EXACT_HEURISTICS_DISABLED. */
const HEURISTICS_DISABLED = ["weak_opening_trim", "sentence_end_extension", "automatic_pause_and_filler_cuts", "boundary_revert", "transition_autofix"];

/** exact_render.words_in_intervals: supplied words touching any kept interval, in supplied order, once, unmodified. */
function wordsInIntervals(words: WordTimestamp[], segments: Array<{ start: number; end: number }>): RenderTimelineWord[] {
  return words.filter((w) => segments.some((s) => w.end > s.start && w.start < s.end)).map((w) => structuredClone(w) as RenderTimelineWord);
}

/** exact_render.map_words_to_content: per interval in supplied order, every touching word
 * clipped to the interval and shifted to content seconds, metadata carried. */
function contentWords(words: WordTimestamp[], segments: Array<{ start: number; end: number }>): RenderTimelineWord[] {
  const out: RenderTimelineWord[] = [];
  let cursor = 0;
  for (const seg of segments) {
    for (const w of words) {
      if (w.end <= seg.start || w.start >= seg.end) continue;
      const clippedStart = Math.max(w.start, seg.start);
      const clippedEnd = Math.min(w.end, seg.end);
      if (clippedEnd <= clippedStart) continue;
      out.push({ ...(structuredClone(w) as RenderTimelineWord), start: round(cursor + (clippedStart - seg.start)), end: round(cursor + (clippedEnd - seg.start)) });
    }
    cursor += seg.end - seg.start;
  }
  return out;
}

export function fakeExactRender(options: FakeRenderOptions = {}): FakeRender {
  const render = (async (params: Record<string, unknown>): Promise<ClipResult> => {
    render.calls++;
    render.lastParams = params;
    if (options.failWith) throw options.failWith;
    if (params.timing_mode !== "exact") throw new Error("fake renderer only supports exact mode");
    const segments = params.keep_segments as Array<{ start: number; end: number }>;
    const title = String(params.title);
    const stem = fakeStem(title);
    const root = options.publishUnder ?? String(params.output_dir);
    mkdirSync(root, { recursive: true });
    const opId = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 15)}Z-${process.pid}-${randomBytes(4).toString("hex")}`;
    const parent = join(root, `${stem}-${opId}`);
    const staging = join(parent, "staging");
    const finalDir = join(parent, "final");
    mkdirSync(parent);
    mkdirSync(staging);

    const contentDuration = round(segments.reduce((sum, s) => sum + (s.end - s.start), 0));
    const bookendSeconds = options.bookendSeconds ?? 1;
    // backend/main.py forwards bookend_fade with a 0.0 default.
    const fade = typeof params.bookend_fade === "number" ? params.bookend_fade : 0;
    const branch = options.branch ?? "hardcut";
    // concat_outro joins (main, appended): the intro is main before the content;
    // the outro is appended after everything so far.
    const intro = params.intro_path ? bookend("intro", bookendSeconds, contentDuration, 0, branch, fade) : null;
    const offset = intro ? intro.output_end : 0;
    const outro = params.outro_path ? bookend("outro", offset + contentDuration, bookendSeconds, offset + contentDuration, branch, fade) : null;
    const outputDuration = round(offset + contentDuration + (outro ? outro.asset_duration - outro.applied_overlap : 0));

    const mainPath = join(finalDir, `${stem}.mp4`);
    const header = JSON.stringify({ fake: true, duration: outputDuration, has_audio: true, op: opId, segments });
    writeFileSync(join(staging, `${stem}.mp4`), `${header}\n${randomBytes(2048).toString("base64")}`);
    let overlay: string | null = null;
    let cropped: string | null = null;
    if (params.keep_caption_overlay) {
      overlay = join(finalDir, `${stem}_captions.mov`);
      cropped = join(finalDir, `${stem}_source.mp4`);
      writeFileSync(join(staging, `${stem}_captions.mov`), `${header}\noverlay`);
      writeFileSync(join(staging, `${stem}_source.mp4`), `${header}\nsource`);
    }
    if (options.leaveStaging) cpSync(staging, finalDir, { recursive: true });
    else renameSync(staging, finalDir);
    const bytes = statSync(mainPath).size;

    const supplied = "transcript_words" in params;
    const sourceWords = supplied ? (params.transcript_words as WordTimestamp[]) : null;
    const content = sourceWords ? contentWords(sourceWords, segments) : [];
    // The fixtures carry no filler words, so the caption words drawn are the content words.
    const drawn = content.length > 0;
    let contentStart = 0;
    const timeline: RenderTimeline = {
      version: 1,
      timing_mode: "exact",
      time_domains: { ...TIME_DOMAINS },
      source: { path: String(params.video_path), duration: Math.max(...segments.map((s) => s.end)), fps: 25, frame_rate_variable: false, width: 1280, height: 720, has_audio: true },
      segment_count: segments.length,
      segments: segments.map((s, index) => {
        const seg = { index, source_start: s.start, source_end: s.end, content_start: round(contentStart), content_end: round(contentStart + s.end - s.start), duration: round(s.end - s.start) };
        contentStart += s.end - s.start;
        return seg;
      }),
      content_duration: contentDuration,
      content_duration_measured: contentDuration,
      content_to_output_offset: offset,
      output_duration: outputDuration,
      output: { path: mainPath, width: 1080, height: 1920, fps: 25, frame_rate_variable: false, has_audio: true, video_duration: outputDuration, audio_duration: outputDuration, file_size_bytes: options.sizeMismatch ? bytes + 1 : bytes },
      tolerance: { content_seconds: 0.05, composition_seconds: 0.1, av_sync_seconds: 0.05, basis: "fake renderer" },
      frame_precision: { source_variable_frame_rate: false, note: "fake" },
      bookends: { requested_fade: fade, intro, outro },
      thumbnail_card: options.cardApplied ? ({ applied: true, note: "fake card" } as unknown as RenderTimeline["thumbnail_card"]) : { applied: false, note: "applied by the server later" },
      framing: { format: params.format as RenderTimeline["framing"]["format"], width: 1080, height: 1920, crop_strategy: String(params.crop_strategy), foreground_framing: null, crop_keyframes: { time_domain: "content", keyframes: (params.crop_keyframes as Array<{ t: number; x_pct: number }>) ?? null } },
      words: {
        input: supplied ? "supplied" : "unavailable",
        source_count: sourceWords ? sourceWords.length : null,
        source: sourceWords ? wordsInIntervals(sourceWords, segments) : null,
        content,
        content_text: content.map((w) => String(w.word).trim()).filter(Boolean).join(" "),
      },
      captions: {
        requested: true,
        style: String(params.caption_style),
        rendered: drawn,
        renderer: drawn ? "remotion" : null,
        filler_cleaning: Boolean(params.clean_fillers),
        words: drawn ? content.map((w) => structuredClone(w)) : [],
        unavailable_reason: drawn ? null : supplied ? "no caption words to draw" : "transcript unavailable",
      },
      heuristics_disabled: [...HEURISTICS_DISABLED],
    };
    const result: ClipResult = {
      output_path: mainPath,
      duration: contentDuration,
      file_size_mb: Math.round((bytes / (1024 * 1024)) * 100) / 100,
      format: params.format as ClipResult["format"],
      timing_mode: "exact",
      render_timeline: timeline,
      ...(overlay ? { caption_overlay_path: overlay } : {}),
      ...(cropped ? { cropped_source_path: cropped } : {}),
    } as ClipResult & { start_second: number; end_second: number; title: string };
    Object.assign(result, { start_second: Math.min(...segments.map((s) => s.start)), end_second: Math.max(...segments.map((s) => s.end)), title });
    options.onRender?.(params, result);
    return result;
  }) as FakeRender;
  render.calls = 0;
  render.lastParams = null;
  return render;
}

/** Mirrors video_processor.concat_outro's report and exact_render.bookend_region.
 * A crossfade overlaps by the requested fade clamped to each input (hard cuts
 * overlap nothing); an intro occupies [0, asset - overlap] and hands over during
 * [asset - overlap, asset]; an outro starts one overlap before the content ends
 * (`contentEnd`) and runs for its asset length. */
function bookend(kind: "intro" | "outro", main: number, appended: number, contentEnd: number, branch: RenderTimelineBookend["branch"], fade: number): RenderTimelineBookend {
  let overlap = 0;
  if (branch.startsWith("xfade") && fade > 0) {
    overlap = Math.min(fade, Math.max(0.05, main - 0.05));
    if (appended > 0) overlap = Math.min(overlap, Math.max(0.05, appended - 0.05));
  }
  const asset = kind === "intro" ? main : appended;
  const regionStart = kind === "intro" ? 0 : Math.max(0, contentEnd - overlap);
  const regionEnd = kind === "intro" ? Math.max(0, main - overlap) : contentEnd - overlap + appended;
  const transition = kind === "intro"
    ? { output_start: round(regionEnd), output_end: round(main) }
    : { output_start: round(regionStart), output_end: round(contentEnd) };
  return {
    kind,
    output_start: round(regionStart),
    output_end: round(regionEnd),
    asset_duration: round(asset),
    requested_fade: fade,
    applied_overlap: round(overlap),
    branch,
    transition,
    measured_output_duration: round(main + appended - overlap),
  };
}

/** Reads the fake renderer's header line; a real probe is ffprobe. */
export const fakeProbe: ProbeFn = async (path: string): Promise<MediaProbe> => {
  const text = readFileSync(path, "utf-8");
  const header = JSON.parse(text.split("\n")[0]) as { duration: number; has_audio: boolean };
  return { duration: header.duration, bytes: statSync(path).size, has_video: true, has_audio: header.has_audio };
};
