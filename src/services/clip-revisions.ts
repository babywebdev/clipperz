// Writing Studio saved revisions: the internal revision commit core (1B.2a).
//
// What this service guarantees
// - A clip's draft, current and previous revision pointers, its legacy summary
//   fields and its operation records change together in one locked, atomic
//   history commit (ClipsHistory.transaction: strict read, shared TS/Python
//   lock, atomic replacement). No second collection, lock or writer.
// - Immutable dependencies are published first: the renderer's own output
//   group under the export namespace and the revision document under the
//   history directory. Only then does one history transaction move the
//   pointers. A failure before that transaction leaves the last save
//   unchanged; after it, the operation record answers a replay.
// - Every request is captured as a detached copy before the first
//   asynchronous step; validation, hashing, rendering and persistence use
//   only that copy, so a caller mutating its objects during a save changes
//   nothing.
// - Every mutation names its expected state (record incarnation, draft and
//   revision versions) and every operation mutation, including failure,
//   cancellation, supersession and residual bookkeeping, first establishes
//   that the record belongs to the same incarnation and the same captured
//   request. A render commits only if the clip still exists with the same
//   incarnation, the same draft and current revision, and its own operation
//   still pending. Deleted, recreated, superseded or cancelled work cannot
//   publish a late pointer, and a late completion for an earlier incarnation
//   leaves a recreated clip's same-ID operation untouched.
// - Operation IDs are durable for the record incarnation's lifetime: nothing
//   here expires. Replaying an operation with the same request returns its
//   complete recorded result without rendering again, before any check that
//   only a new render needs (source or asset existence); reusing an ID with a
//   different request is a conflict; a second operation while one is pending
//   is busy. A pending operation stays pending across restarts until it
//   completes or is explicitly invalidated: nothing here infers death from
//   time or directory shape.
// - Writes stay physically inside the owned trees. The configured export and
//   history roots themselves, and every directory from them down to a draft
//   document, revision document, namespace or returned artifact, must be real
//   directories; a symbolic link or junction anywhere in that chain, the root
//   included, is refused before anything is written and is never followed or
//   swapped for its target. This is a static check of the chain as it exists
//   at that moment.
// - A renderer receipt is accepted only when it is a complete, well-typed
//   exact v1 receipt whose values are finite and add up against the captured
//   request within the renderer's own stated tolerance, and whose semantic
//   relationships match the accepted renderer: its time-domain map, the
//   captured words it retained and projected, its caption settings, and each
//   bookend's asset, overlap, branch, region and transition. Anything else is
//   refused as a failed operation without moving a pointer.
// - Earlier outputs, flat or grouped, are never renamed, replaced or deleted.
//   Failed or superseded work may leave unreferenced files; they are reported
//   as residuals, never collected.
//
// What it does not do (successor work): no route, CLI, MCP or UI adapter
// opts into it; no legacy import; no unchanged-input render avoidance; no
// opening thumbnail card (requests naming one are rejected); no Cleanup
// eligibility for anything it creates.

import { execFile } from "child_process";
import { createHash, randomUUID } from "crypto";
import { createReadStream, existsSync } from "fs";
import { lstat, mkdir, readFile, rm, stat } from "fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "path";
import { promisify } from "util";
import { paths } from "../config/paths.js";
import { writeFileAtomic } from "../utils/atomic-file.js";
import { ClipsHistory } from "./clips-history.js";
import { PythonExecutor } from "./python-executor.js";
import type { ClipHistoryEntry, ClipResult, RenderTimeline, WordTimestamp } from "../models/index.js";
import {
  CLIP_REVISIONS_SCHEMA,
  ClipRevisionError,
  type ClipDraft,
  type ClipRevisionDocument,
  type ClipRevisionState,
  type ExactRenderRecipe,
  type ExpectedState,
  type InvalidateOperationRequest,
  type InvalidateOperationResult,
  type OperationRecord,
  type RevisionFile,
  type RevisionPointer,
  type SaveDraftRequest,
  type SaveDraftResult,
  type SaveRevisionRequest,
  type SaveRevisionResult,
  type SavedBookend,
  type SupportedBookendBranch,
} from "../models/clip-revisions.js";

export { ClipRevisionError } from "../models/clip-revisions.js";

const execFileAsync = promisify(execFile);

/** Name of the app-owned namespace directory beneath the configured export root. */
export const REVISION_NAMESPACE = "writing-studio";
/** Name of the sidecar directory beneath the history directory. */
export const REVISION_SIDECARS = "revisions";
const SUPPORTED_BRANCHES: ReadonlySet<string> = new Set<SupportedBookendBranch>([
  "xfade_acrossfade",
  "hardcut_soft_audio",
  "hardcut",
]);
const FORMATS = new Set(["vertical", "horizontal", "square"]);
/** The renderer rounds receipt seconds to three decimals; relationships that
 * are exact arithmetic in the renderer may differ by that rounding. */
const RECEIPT_ROUNDING = 0.002;
/** The legacy top-level `duration` is the content duration rounded to two decimals. */
const LEGACY_DURATION_ROUNDING = 0.011;

export interface MediaProbe {
  duration: number | null;
  bytes: number;
  has_video: boolean;
  has_audio: boolean;
}

export type RenderFn = (params: Record<string, unknown>) => Promise<ClipResult>;
export type ProbeFn = (path: string) => Promise<MediaProbe>;

export interface OperationContext {
  clip_id: string;
  operation_id: string;
  namespace_root: string;
  /** Set once the renderer has returned its group. */
  group_root: string | null;
}

/** Deterministic barriers for tests: each hook runs at the named point in a
 * save and may await, throw or end the process. Production wiring passes none. */
export interface ClipRevisionHooks {
  beforeRender?: (ctx: OperationContext) => Promise<void> | void;
  afterRender?: (ctx: OperationContext, result: ClipResult) => Promise<void> | void;
  beforeCommit?: (ctx: OperationContext) => Promise<void> | void;
  afterCommit?: (ctx: OperationContext) => Promise<void> | void;
}

export interface ClipRevisionServiceOptions {
  history?: ClipsHistory;
  render?: RenderFn;
  probe?: ProbeFn;
  /** Defaults to the configured export root (PODCLI_OUTPUT). */
  exportRoot?: string;
  /** Defaults to the configured history directory. */
  historyRoot?: string;
  hooks?: ClipRevisionHooks;
}

// ---------------------------------------------------------------------------
// Request capture and validation helpers
// ---------------------------------------------------------------------------

/**
 * Detach a caller's request before anything asynchronous happens. The copy is
 * plain data: later mutation of the caller's objects, nested or not, cannot
 * reach validation, the request hash, the renderer or the persisted document.
 */
function captureRequest<T>(request: T, label: string): T {
  if (!request || typeof request !== "object") invalidRecipe(`${label} must be an object`);
  try {
    return structuredClone(request);
  } catch (err) {
    return invalidRecipe(`${label} could not be captured as plain data: ${(err as Error).message}`);
  }
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function validateId(value: unknown, label: string): string {
  if (typeof value !== "string" || !ID_RE.test(value) || value.includes("..")) {
    throw new ClipRevisionError("INVALID_IDENTIFIER", `${label} must be a short identifier of letters, digits, dot, underscore or hyphen`, { [label]: value });
  }
  return value;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function invalidRecipe(message: string, details: Record<string, unknown> = {}): never {
  throw new ClipRevisionError("INVALID_RECIPE", message, details);
}

function requirePathShape(path: unknown, label: string): string {
  if (typeof path !== "string" || !path.trim()) invalidRecipe(`${label} must be a non-empty path`, { [label]: path });
  if (!isAbsolute(path)) invalidRecipe(`${label} must be an absolute path`, { [label]: path });
  return path;
}

async function requireFile(path: string, label: string): Promise<void> {
  try {
    const st = await lstat(path);
    if (!st.isFile()) invalidRecipe(`${label} is not a regular file`, { [label]: path });
  } catch (err) {
    if (err instanceof ClipRevisionError) throw err;
    invalidRecipe(`${label} does not exist: ${path}`, { [label]: path });
  }
}

function validateWords(words: unknown, label: string): WordTimestamp[] | null {
  if (words === null) return null;
  if (!Array.isArray(words)) invalidRecipe(`${label} must be an array of words or null (unavailable)`, { [label]: typeof words });
  words.forEach((w, i) => {
    if (!isPlainObject(w)) invalidRecipe(`${label}[${i}] is not a word object`);
    const { word, start, end } = w;
    if (typeof word !== "string") invalidRecipe(`${label}[${i}].word must be a string`);
    if (!isFiniteNumber(start) || !isFiniteNumber(end) || start < 0 || end < start) invalidRecipe(`${label}[${i}] has invalid timing`, { start, end });
  });
  return words as WordTimestamp[];
}

/** Shape validation only, synchronous and free of filesystem access: the
 * renderer owns bounds, framing and media semantics; file existence is a
 * separate step that only a new render needs. */
function validateRecipeShape(recipe: unknown): ExactRenderRecipe {
  if (!isPlainObject(recipe)) invalidRecipe("recipe must be an object");
  const r = recipe;
  requirePathShape(r.source_video, "source_video");
  if (typeof r.title !== "string" || !r.title.trim() || /[\\/\0]/.test(r.title) || r.title === "." || r.title === "..") {
    invalidRecipe("title must be a non-empty string without path separators", { title: r.title });
  }
  if (!Array.isArray(r.keep_segments) || r.keep_segments.length === 0) invalidRecipe("keep_segments must be a non-empty ordered list");
  r.keep_segments.forEach((s, i) => {
    if (!isPlainObject(s) || !isFiniteNumber(s.start) || !isFiniteNumber(s.end) || s.start < 0 || s.end <= s.start) {
      invalidRecipe(`keep_segments[${i}] must have finite start < end`, { segment: s });
    }
  });
  if (typeof r.caption_style !== "string" || !r.caption_style) invalidRecipe("caption_style must be a string");
  if (typeof r.crop_strategy !== "string" || !r.crop_strategy) invalidRecipe("crop_strategy must be a string");
  if (typeof r.format !== "string" || !FORMATS.has(r.format)) invalidRecipe("format must be vertical, horizontal or square", { format: r.format });
  if (r.crop_keyframes !== undefined && r.crop_keyframes !== null) {
    if (!Array.isArray(r.crop_keyframes)) invalidRecipe("crop_keyframes must be a list or null");
    r.crop_keyframes.forEach((k, i) => {
      if (!isPlainObject(k) || !isFiniteNumber(k.t) || k.t < 0 || !isFiniteNumber(k.x_pct) || k.x_pct < 0 || k.x_pct > 100) {
        invalidRecipe(`crop_keyframes[${i}] must have content-relative t >= 0 and x_pct in 0..100`, { keyframe: k });
      }
    });
  }
  for (const key of ["logo_path", "intro_path", "outro_path"] as const) {
    if (r[key] !== undefined && r[key] !== null) requirePathShape(r[key], key);
  }
  if (r.bookend_fade !== undefined && r.bookend_fade !== null && (!isFiniteNumber(r.bookend_fade) || r.bookend_fade < 0)) {
    invalidRecipe("bookend_fade must be a finite non-negative number or null", { bookend_fade: r.bookend_fade });
  }
  for (const key of ["caption_position", "logo_position"] as const) {
    if (r[key] !== undefined && typeof r[key] !== "string") invalidRecipe(`${key} must be a string`);
  }
  if (r.caption_font_scale !== undefined && !isFiniteNumber(r.caption_font_scale)) invalidRecipe("caption_font_scale must be a number");
  for (const key of ["clean_fillers", "keep_caption_overlay", "allow_ass_fallback"] as const) {
    if (r[key] !== undefined && typeof r[key] !== "boolean") invalidRecipe(`${key} must be a boolean`);
  }
  if (r.foreground_framing !== undefined && r.foreground_framing !== null && !isPlainObject(r.foreground_framing)) {
    invalidRecipe("foreground_framing must be an object or null");
  }
  return r as unknown as ExactRenderRecipe;
}

/** The source and any requested assets must exist as regular files: a check
 * that only a new render needs, so it runs after a replay has been answered. */
async function requireRecipeFiles(recipe: ExactRenderRecipe): Promise<void> {
  await requireFile(recipe.source_video, "source_video");
  for (const key of ["logo_path", "intro_path", "outro_path"] as const) {
    if (typeof recipe[key] === "string") await requireFile(recipe[key] as string, key);
  }
}

function validateExpected(expected: unknown): ExpectedState {
  const e = expected as Record<string, unknown> | null;
  if (!e || typeof e !== "object" || typeof e.incarnation !== "string" || !e.incarnation ||
      !Number.isInteger(e.draft_version) || !Number.isInteger(e.revision_version)) {
    throw new ClipRevisionError("EXPECTED_STATE_MISMATCH", "expected state must name incarnation, draft_version and revision_version", { expected });
  }
  return { incarnation: e.incarnation, draft_version: e.draft_version as number, revision_version: e.revision_version as number };
}

function validateIncarnation(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) {
    throw new ClipRevisionError("EXPECTED_STATE_MISMATCH", `${label} must name the record incarnation the caller observed`, { [label]: value });
  }
  return value;
}

// Stable JSON with sorted keys so equal requests hash equally regardless of
// property order; arrays keep their order (segment order is meaningful).
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).filter((k) => (value as Record<string, unknown>)[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((res, rej) => {
    createReadStream(path).on("data", (chunk) => hash.update(chunk)).on("end", res).on("error", rej);
  });
  return hash.digest("hex");
}

const normalize = (p: string) => (process.platform === "win32" ? resolve(p).toLowerCase() : resolve(p));
function contains(parent: string, child: string): boolean {
  const rel = relative(normalize(parent), normalize(child));
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Physical ownership of write targets
// ---------------------------------------------------------------------------

function ownershipEscape(message: string, details: Record<string, unknown>): never {
  throw new ClipRevisionError("OWNERSHIP_ESCAPE", message, details);
}

async function lstatOrNull(path: string) {
  return lstat(path).catch((err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") return null;
    throw err;
  });
}

/**
 * The configured `root` itself and every directory from it down to `target`
 * (inclusive) must be real directories. A symbolic link or junction anywhere
 * in that chain, the root included, would let a write land outside the owned
 * tree or inside another clip's, so the chain is refused before anything is
 * written through it; a linked root is never followed or swapped for its
 * target. With `create`, a missing root is created (its parents are the
 * user's configured location and are not inspected) and missing components
 * below it are created one level at a time, each re-checked after creation;
 * without it, missing components are simply absent (a later write creates
 * them under the same rule). This inspects the chain as it exists now; it
 * does not defend against a component being replaced concurrently.
 */
async function assertOwnedDirectory(root: string, target: string, label: string, create: boolean): Promise<void> {
  const base = resolve(root);
  const rel = relative(base, resolve(target));
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) ownershipEscape(`${label} ${target} is not beneath ${root}`, { path: target, root });
  const check = (path: string, st: Awaited<ReturnType<typeof lstat>>, what: string) => {
    if (st.isSymbolicLink()) ownershipEscape(`${label}: ${what} ${path} is a symbolic link or junction; refusing to write through it`, { path, root });
    if (!st.isDirectory()) ownershipEscape(`${label}: ${what} ${path} is not a directory`, { path, root });
  };
  let rootStat = await lstatOrNull(base);
  if (!rootStat) {
    if (!create) return;
    await mkdir(base, { recursive: true });
    rootStat = await lstat(base);
  }
  check(base, rootStat, "configured root");
  let current = base;
  for (const part of rel.split(sep)) {
    current = join(current, part);
    let st = await lstatOrNull(current);
    if (!st) {
      if (!create) continue;
      await mkdir(current).catch((err: NodeJS.ErrnoException) => {
        if (err.code !== "EEXIST") throw err;
      });
      st = await lstat(current);
    }
    check(current, st, "directory");
  }
}

// ---------------------------------------------------------------------------
// Receipt validation
// ---------------------------------------------------------------------------

// The accepted renderer's contract, from backend/services/exact_render.py and
// clip_generator.py (read, never re-run): the receipt is checked against these,
// not against whatever a receipt claims about itself.

/** clip_generator._exact_render_timeline's exact v1 time-domain map, verbatim. */
const EXACT_V1_TIME_DOMAINS: Readonly<Record<string, string>> = {
  "segments.source_*": "source-absolute seconds in the original file",
  "segments.content_*, words.content[], captions.words[], framing.crop_keyframes[].t":
    "content-relative seconds: kept intervals concatenated in supplied order from 0",
  "bookends.*.output_*, content_to_output_offset, output_duration":
    "output seconds in the rendered file, bookends included",
};
/** video_processor.concat_outro branches that cut the video: they overlap nothing. */
const HARD_CUT_BRANCHES: ReadonlySet<string> = new Set(["hardcut_soft_audio", "hardcut"]);
/** concat_outro crossfades only by at least this much, and at most this much inside each input. */
const MIN_CROSSFADE = 0.05;
/** Python's str.strip() whitespace, which content_text applies to each word. */
const PY_WHITESPACE: ReadonlySet<number> = new Set([
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x85, 0xa0, 0x1680,
  ...Array.from({ length: 11 }, (_, i) => 0x2000 + i), 0x2028, 0x2029, 0x202f, 0x205f, 0x3000,
]);
function pyStrip(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && PY_WHITESPACE.has(text.charCodeAt(start))) start++;
  while (end > start && PY_WHITESPACE.has(text.charCodeAt(end - 1))) end--;
  return text.slice(start, end);
}

/** exact_render.words_in_intervals: the supplied words touching any kept interval, in supplied order, once. */
function wordsInIntervals(words: WordTimestamp[], segments: Array<{ start: number; end: number }>): WordTimestamp[] {
  return words.filter((w) => segments.some((s) => w.end > s.start && w.start < s.end));
}

/** exact_render.map_words_to_content before its 3-decimal rounding: per interval in
 * supplied order, each word touching it clipped to the interval and shifted to content seconds. */
function mapWordsToContent(words: WordTimestamp[], segments: Array<{ start: number; end: number }>): Array<{ word: WordTimestamp; start: number; end: number }> {
  const mapped: Array<{ word: WordTimestamp; start: number; end: number }> = [];
  let cursor = 0;
  for (const seg of segments) {
    for (const word of words) {
      if (word.end <= seg.start || word.start >= seg.end) continue;
      const start = Math.max(word.start, seg.start);
      const end = Math.min(word.end, seg.end);
      if (end <= start) continue;
      mapped.push({ word, start: cursor + (start - seg.start), end: cursor + (end - seg.start) });
    }
    cursor += seg.end - seg.start;
  }
  return mapped;
}

/** exact_render.content_text. */
function contentText(words: Array<{ word: string }>): string {
  return words.map((w) => pyStrip(w.word)).filter(Boolean).join(" ");
}

/** A word's identity apart from its timing: text and every metadata field, compared exactly. */
function wordIdentity(word: object): string {
  return canonical({ ...word, start: undefined, end: undefined });
}

/**
 * The renderer's result must be a complete exact v1 receipt: required fields
 * present with the right types, every number finite, enums within the
 * accepted contract, and the source/content mapping, offsets, durations,
 * composition, words and artifact provenance consistent with the captured
 * request within the renderer's own stated tolerance. Everything is checked
 * before any arithmetic depends on it; a missing value or NaN refuses.
 */
function validateReceipt(result: unknown, recipe: ExactRenderRecipe, sourceWords: WordTimestamp[] | null): RenderTimeline {
  const bad = (message: string, details: Record<string, unknown> = {}): never => {
    throw new ClipRevisionError("INVALID_RECEIPT", message, details);
  };
  const obj = (v: unknown, label: string): Record<string, unknown> => (isPlainObject(v) ? v : bad(`receipt ${label} must be an object`, { [label]: v }));
  const arr = (v: unknown, label: string): unknown[] => (Array.isArray(v) ? v : bad(`receipt ${label} must be a list`, { [label]: v }));
  const str = (v: unknown, label: string): string => (typeof v === "string" ? v : bad(`receipt ${label} must be a string`, { [label]: v }));
  const bool = (v: unknown, label: string): boolean => (typeof v === "boolean" ? v : bad(`receipt ${label} must be a boolean`, { [label]: v }));
  const num = (v: unknown, label: string, min = Number.NEGATIVE_INFINITY): number =>
    isFiniteNumber(v) && v >= min ? v : bad(`receipt ${label} must be a finite number${min > Number.NEGATIVE_INFINITY ? ` >= ${min}` : ""}`, { [label]: v });
  const numOrNull = (v: unknown, label: string, min?: number): number | null => (v === null ? null : num(v, label, min));
  const int = (v: unknown, label: string, min?: number): number => (Number.isInteger(num(v, label, min)) ? (v as number) : bad(`receipt ${label} must be an integer`, { [label]: v }));
  const intOrNull = (v: unknown, label: string, min?: number): number | null => (v === null ? null : int(v, label, min));
  const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
  const word = (v: unknown, label: string) => {
    const w = obj(v, label);
    str(w.word, `${label}.word`);
    const start = num(w.start, `${label}.start`, 0);
    const end = num(w.end, `${label}.end`, start);
    return { start, end };
  };

  const r = obj(result, "result");
  if (r.timing_mode !== "exact") bad("renderer did not return an exact receipt", { timing_mode: r.timing_mode });
  const tl = obj(r.render_timeline, "render_timeline");
  if (tl.version !== 1 || tl.timing_mode !== "exact") bad("renderer did not return an exact v1 receipt", { version: tl.version, timing_mode: tl.timing_mode });
  const outputPath = str(r.output_path, "output_path");
  if (!isAbsolute(outputPath)) bad("receipt output_path must be absolute", { output_path: outputPath });
  const legacyDuration = num(r.duration, "duration", 0);
  num(r.file_size_mb, "file_size_mb", 0);
  if (r.format !== recipe.format) bad("receipt format differs from the request", { got: r.format, want: recipe.format });
  for (const key of ["caption_overlay_path", "cropped_source_path"] as const) {
    if (r[key] === undefined) continue;
    if (!isAbsolute(str(r[key], key))) bad(`receipt ${key} must be absolute`, { [key]: r[key] });
    if (!recipe.keep_caption_overlay) bad(`receipt names an unrequested ${key}`, { [key]: r[key] });
  }

  const tolerance = obj(tl.tolerance, "tolerance");
  const contentTolerance = num(tolerance.content_seconds, "tolerance.content_seconds", 0);
  const compositionTolerance = num(tolerance.composition_seconds, "tolerance.composition_seconds", 0);
  const avTolerance = num(tolerance.av_sync_seconds, "tolerance.av_sync_seconds", 0);
  str(tolerance.basis, "tolerance.basis");
  const domains = obj(tl.time_domains, "time_domains");
  for (const [key, value] of Object.entries(domains)) str(value, `time_domains.${key}`);
  if (canonical(domains) !== canonical(EXACT_V1_TIME_DOMAINS)) bad("receipt time_domains are not the exact v1 time-domain map", { time_domains: domains });

  const source = obj(tl.source, "source");
  if (normalize(str(source.path, "source.path")) !== normalize(recipe.source_video)) bad("receipt source path differs from the request", { got: source.path, want: recipe.source_video });
  numOrNull(source.duration, "source.duration", 0);
  numOrNull(source.fps, "source.fps", 0);
  bool(source.frame_rate_variable, "source.frame_rate_variable");
  intOrNull(source.width, "source.width", 1);
  intOrNull(source.height, "source.height", 1);
  bool(source.has_audio, "source.has_audio");

  const segments = arr(tl.segments, "segments");
  const segmentCount = int(tl.segment_count, "segment_count", 0);
  if (segmentCount !== recipe.keep_segments.length || segments.length !== recipe.keep_segments.length) {
    bad("receipt segment count differs from the request", { segment_count: segmentCount, segments: segments.length, requested: recipe.keep_segments.length });
  }
  let cursor = 0;
  let requestedContent = 0;
  segments.forEach((raw, i) => {
    const s = obj(raw, `segments[${i}]`);
    if (s.index !== i) bad(`receipt segment ${i} carries index ${String(s.index)}`, { index: s.index });
    const sourceStart = num(s.source_start, `segments[${i}].source_start`, 0);
    const sourceEnd = num(s.source_end, `segments[${i}].source_end`, 0);
    if (sourceEnd <= sourceStart) bad(`receipt segment ${i} ends before it starts`, { source_start: sourceStart, source_end: sourceEnd });
    const want = recipe.keep_segments[i];
    if (!near(sourceStart, want.start, 1e-6) || !near(sourceEnd, want.end, 1e-6)) bad(`receipt segment ${i} differs from the requested interval`, { got: s, want });
    const contentStart = num(s.content_start, `segments[${i}].content_start`, 0);
    const contentEnd = num(s.content_end, `segments[${i}].content_end`, 0);
    const duration = num(s.duration, `segments[${i}].duration`, 0);
    if (!near(duration, sourceEnd - sourceStart, RECEIPT_ROUNDING)) bad(`receipt segment ${i} duration disagrees with its source interval`, { duration, source_start: sourceStart, source_end: sourceEnd });
    if (!near(contentStart, cursor, RECEIPT_ROUNDING)) bad(`receipt segment ${i} content_start ${contentStart} does not continue the previous segment at ${cursor}`, { content_start: contentStart, expected: cursor });
    if (!near(contentEnd, contentStart + duration, RECEIPT_ROUNDING)) bad(`receipt segment ${i} content_end disagrees with content_start plus duration`, { content_start: contentStart, content_end: contentEnd, duration });
    cursor = contentEnd;
    requestedContent += sourceEnd - sourceStart;
  });
  const contentDuration = num(tl.content_duration, "content_duration", 0);
  if (!near(contentDuration, requestedContent, RECEIPT_ROUNDING)) bad("receipt content_duration disagrees with the requested intervals", { content_duration: contentDuration, requested: requestedContent });
  if (!near(cursor, contentDuration, RECEIPT_ROUNDING)) bad("receipt segments do not end at content_duration", { last_content_end: cursor, content_duration: contentDuration });
  const measuredContent = num(tl.content_duration_measured, "content_duration_measured", 0);
  if (!near(measuredContent, contentDuration, contentTolerance)) bad("receipt measured content duration is outside the renderer's content tolerance", { measured: measuredContent, content_duration: contentDuration, tolerance: contentTolerance });
  if (!near(legacyDuration, contentDuration, LEGACY_DURATION_ROUNDING)) bad("receipt legacy duration disagrees with content_duration", { duration: legacyDuration, content_duration: contentDuration });

  // Bookends as video_processor.concat_outro reports them and exact_render.bookend_region
  // places them. backend/main.py forwards bookend_fade with a 0.0 default and
  // buildRenderParams sends only a number, so the fade the renderer saw is known.
  const bookends = obj(tl.bookends, "bookends");
  const sentFade = typeof recipe.bookend_fade === "number" ? recipe.bookend_fade : 0;
  const requestedFade = num(bookends.requested_fade, "bookends.requested_fade", 0);
  if (!near(requestedFade, sentFade, 1e-6)) bad("receipt requested_fade differs from the request", { got: requestedFade, want: sentFade });
  const regions: Partial<Record<"intro" | "outro", { end: number; asset: number; overlap: number; contentEnd: number }>> = {};
  for (const [kind, requested] of [["intro", recipe.intro_path], ["outro", recipe.outro_path]] as const) {
    const raw = bookends[kind];
    if (requested && (raw === null || raw === undefined)) bad(`receipt lacks the requested ${kind} composition`);
    if (!requested && raw !== null && raw !== undefined) bad(`receipt reports an unrequested ${kind}`);
    if (raw === null || raw === undefined) continue;
    const b = obj(raw, `bookends.${kind}`);
    if (b.kind !== kind) bad(`receipt bookends.${kind}.kind is ${String(b.kind)}`);
    const start = num(b.output_start, `bookends.${kind}.output_start`, 0);
    const end = num(b.output_end, `bookends.${kind}.output_end`, start);
    const asset = num(b.asset_duration, `bookends.${kind}.asset_duration`, 0);
    const overlap = num(b.applied_overlap, `bookends.${kind}.applied_overlap`, 0);
    if (typeof b.branch !== "string" || !SUPPORTED_BRANCHES.has(b.branch)) bad(`unsupported ${kind} composition branch ${String(b.branch)}`, { branch: b.branch });
    const branch = b.branch as string;
    const fade = num(b.requested_fade, `bookends.${kind}.requested_fade`, 0);
    if (!near(fade, sentFade, 1e-6)) bad(`receipt ${kind} requested_fade differs from the request`, { got: fade, want: sentFade });
    const transition = obj(b.transition, `bookends.${kind}.transition`);
    const tStart = num(transition.output_start, `bookends.${kind}.transition.output_start`, 0);
    const tEnd = num(transition.output_end, `bookends.${kind}.transition.output_end`, tStart);
    numOrNull(b.measured_output_duration, `bookends.${kind}.measured_output_duration`, 0);
    // A branch name alone proves no join: a hard cut overlaps nothing; a crossfade
    // needs a requested fade and overlaps by it, clamped inside each input.
    if (HARD_CUT_BRANCHES.has(branch)) {
      if (overlap !== 0) bad(`receipt ${kind} ${branch} claims ${overlap}s of video overlap; a hard cut overlaps nothing`, { branch, applied_overlap: overlap });
    } else if (sentFade <= 0 || overlap < MIN_CROSSFADE || overlap > sentFade + RECEIPT_ROUNDING || (asset > 0 && overlap > Math.max(MIN_CROSSFADE, asset - MIN_CROSSFADE) + RECEIPT_ROUNDING)) {
      bad(`receipt ${kind} crossfade overlap ${overlap}s is not the requested fade ${sentFade}s clamped inside the ${asset}s asset`, { branch, applied_overlap: overlap, requested_fade: sentFade, asset_duration: asset });
    }
    if (kind === "intro") {
      if (!near(start, 0, RECEIPT_ROUNDING)) bad("receipt intro does not start at output 0", { output_start: start });
      if (!near(end, Math.max(0, asset - overlap), RECEIPT_ROUNDING)) bad("receipt intro region does not end one overlap before its asset ends", { output_end: end, asset_duration: asset, applied_overlap: overlap });
      if (!near(tStart, end, RECEIPT_ROUNDING) || !near(tEnd, asset, RECEIPT_ROUNDING)) bad("receipt intro transition is not the overlap at the end of its asset", { transition: { output_start: tStart, output_end: tEnd }, output_end: end, asset_duration: asset });
    } else {
      // The outro's transition ends where the content ends; the outro starts one overlap earlier.
      if (!near(start, Math.max(0, tEnd - overlap), RECEIPT_ROUNDING) || !near(tStart, start, RECEIPT_ROUNDING)) {
        bad("receipt outro region and transition do not start one overlap before the content ends", { output_start: start, transition: { output_start: tStart, output_end: tEnd }, applied_overlap: overlap });
      }
      if (!near(end, tEnd - overlap + asset, RECEIPT_ROUNDING)) bad("receipt outro region does not run for its asset length", { output_end: end, content_end: tEnd, applied_overlap: overlap, asset_duration: asset });
    }
    regions[kind] = { end, asset, overlap, contentEnd: tEnd };
  }
  const offset = num(tl.content_to_output_offset, "content_to_output_offset", 0);
  if (regions.intro) {
    if (!near(offset, regions.intro.end, RECEIPT_ROUNDING)) bad("receipt content_to_output_offset disagrees with the intro's end", { offset, intro_end: regions.intro.end });
  } else if (!near(offset, 0, RECEIPT_ROUNDING)) bad("receipt reports a content offset without an intro", { offset });
  const outputDuration = num(tl.output_duration, "output_duration", 0);
  if (outputDuration <= 0) bad("receipt output_duration must be positive", { output_duration: outputDuration });
  const joinTolerance = compositionTolerance + avTolerance;
  const expectedOutput = offset + measuredContent + (regions.outro ? regions.outro.asset - regions.outro.overlap : 0);
  if (!near(outputDuration, expectedOutput, joinTolerance)) bad("receipt output_duration does not add up from offset, measured content and outro", { output_duration: outputDuration, expected: expectedOutput, tolerance: joinTolerance });
  if (regions.outro) {
    if (!near(regions.outro.contentEnd, offset + measuredContent, joinTolerance)) bad("receipt outro does not start where the content ends", { content_end: regions.outro.contentEnd, measured_content_end: offset + measuredContent, tolerance: joinTolerance });
    if (!near(regions.outro.end, outputDuration, joinTolerance)) bad("receipt outro does not end at output_duration", { output_end: regions.outro.end, output_duration: outputDuration });
  }

  const output = obj(tl.output, "output");
  if (output.path !== outputPath) bad("receipt output path is missing or inconsistent", { output_path: outputPath, receipt_path: output.path });
  const outWidth = intOrNull(output.width, "output.width", 1);
  const outHeight = intOrNull(output.height, "output.height", 1);
  numOrNull(output.fps, "output.fps", 0);
  bool(output.frame_rate_variable, "output.frame_rate_variable");
  bool(output.has_audio, "output.has_audio");
  numOrNull(output.video_duration, "output.video_duration", 0);
  numOrNull(output.audio_duration, "output.audio_duration", 0);
  int(output.file_size_bytes, "output.file_size_bytes", 1);

  const framing = obj(tl.framing, "framing");
  if (framing.format !== recipe.format) bad("receipt framing format differs from the request", { got: framing.format, want: recipe.format });
  if (framing.crop_strategy !== recipe.crop_strategy) bad("receipt framing crop_strategy differs from the request", { got: framing.crop_strategy, want: recipe.crop_strategy });
  const width = int(framing.width, "framing.width", 1);
  const height = int(framing.height, "framing.height", 1);
  if ((outWidth !== null && outWidth !== width) || (outHeight !== null && outHeight !== height)) bad("receipt output dimensions differ from the framing", { output: [outWidth, outHeight], framing: [width, height] });
  if (framing.foreground_framing !== null && !isPlainObject(framing.foreground_framing)) bad("receipt framing.foreground_framing must be an object or null");
  const keyframes = obj(framing.crop_keyframes, "framing.crop_keyframes");
  if (keyframes.time_domain !== "content") bad("receipt crop keyframes are not in the content domain", { time_domain: keyframes.time_domain });
  const requestedKeyframes = recipe.crop_keyframes ?? null;
  if (requestedKeyframes && requestedKeyframes.length > 0) {
    const got = arr(keyframes.keyframes, "framing.crop_keyframes.keyframes");
    if (got.length !== requestedKeyframes.length) bad("receipt keyframe count differs from the request", { got: got.length, want: requestedKeyframes.length });
    got.forEach((raw, i) => {
      const k = obj(raw, `framing.crop_keyframes.keyframes[${i}]`);
      const t = num(k.t, `framing.crop_keyframes.keyframes[${i}].t`, 0);
      const x = num(k.x_pct, `framing.crop_keyframes.keyframes[${i}].x_pct`, 0);
      if (t > contentDuration + RECEIPT_ROUNDING || x > 100) bad(`receipt keyframe ${i} is outside the content domain`, { keyframe: k });
      if (!near(t, requestedKeyframes[i].t, 1e-6) || !near(x, requestedKeyframes[i].x_pct, 1e-6)) bad(`receipt keyframe ${i} differs from the request`, { got: k, want: requestedKeyframes[i] });
    });
  } else if (keyframes.keyframes !== null && !(Array.isArray(keyframes.keyframes) && keyframes.keyframes.length === 0)) {
    bad("receipt reports unrequested crop keyframes", { keyframes: keyframes.keyframes });
  }

  const words = obj(tl.words, "words");
  const expectedInput = sourceWords === null ? "unavailable" : "supplied";
  if (words.input !== expectedInput) bad(`receipt reports transcript input ${String(words.input)}, request was ${expectedInput}`);
  if (sourceWords === null) {
    if (words.source_count !== null) bad("receipt reports a source word count for an unavailable transcript", { source_count: words.source_count });
    if (words.source !== null) bad("receipt reports source words for an unavailable transcript");
  } else {
    if (int(words.source_count, "words.source_count", 0) !== sourceWords.length) bad("receipt source word count differs from the supplied transcript", { source_count: words.source_count, supplied: sourceWords.length });
    const retained = arr(words.source, "words.source");
    retained.forEach((w, i) => word(w, `words.source[${i}]`));
    // exact_render.words_in_intervals: the recovery input for a later widening edit.
    if (canonical(retained) !== canonical(wordsInIntervals(sourceWords, recipe.keep_segments))) {
      bad("receipt source words are not the supplied words touching the kept intervals, unmodified and in supplied order", { source: retained });
    }
  }
  const content = arr(words.content, "words.content");
  content.forEach((w, i) => {
    const { end } = word(w, `words.content[${i}]`);
    if (end > contentDuration + RECEIPT_ROUNDING) bad(`receipt content word ${i} ends after the content`, { end, content_duration: contentDuration });
  });
  if (sourceWords === null && content.length > 0) bad("receipt reports content words for an unavailable transcript");
  // exact_render.map_words_to_content: the editorial transcript of exactly the kept intervals.
  const projected = sourceWords === null ? [] : mapWordsToContent(sourceWords, recipe.keep_segments);
  if (content.length !== projected.length) {
    bad(`receipt has ${content.length} content words; the supplied words projected onto the kept intervals give ${projected.length}`, { content: content.length, projected: projected.length });
  }
  projected.forEach((p, i) => {
    const got = content[i] as { start: number; end: number };
    if (wordIdentity(got) !== wordIdentity(p.word) || !near(got.start, p.start, RECEIPT_ROUNDING) || !near(got.end, p.end, RECEIPT_ROUNDING)) {
      bad(`receipt content word ${i} is not supplied word "${p.word.word}" clipped and placed at ${p.start}..${p.end} content seconds`, { got, want: { ...p.word, start: p.start, end: p.end } });
    }
  });
  const text = str(words.content_text, "words.content_text");
  if (text !== contentText(content as Array<{ word: string }>)) bad("receipt content_text is not the text of its content words", { content_text: text });

  // Caption settings as the exact bridge sends them: backend/main.py forwards no
  // captions flag (generate_clip draws captions by default), the requested style,
  // filler cleaning as buildRenderParams sends it, and ASS only when allowed.
  const captions = obj(tl.captions, "captions");
  if (bool(captions.requested, "captions.requested") !== true) bad("receipt reports captions as not requested; the exact bridge always requests them");
  if (str(captions.style, "captions.style") !== recipe.caption_style) bad("receipt caption style differs from the request", { got: captions.style, want: recipe.caption_style });
  const cleaning = bool(captions.filler_cleaning, "captions.filler_cleaning");
  if (cleaning !== (recipe.clean_fillers ?? false)) bad("receipt filler cleaning differs from the request", { got: cleaning, want: recipe.clean_fillers ?? false });
  const rendered = bool(captions.rendered, "captions.rendered");
  if (rendered ? captions.renderer !== "remotion" && captions.renderer !== "ass" : captions.renderer !== null) bad("receipt caption renderer is inconsistent with rendered", { rendered, renderer: captions.renderer });
  if (captions.renderer === "ass" && recipe.allow_ass_fallback !== true) bad("receipt reports the ASS caption fallback, which the request did not allow", { renderer: captions.renderer });
  const drawn = arr(captions.words, "captions.words");
  drawn.forEach((w, i) => word(w, `captions.words[${i}]`));
  if (rendered ? captions.unavailable_reason !== null : typeof captions.unavailable_reason !== "string") bad("receipt caption unavailable_reason is inconsistent with rendered", { rendered, unavailable_reason: captions.unavailable_reason });
  if (!rendered && drawn.length > 0) bad("receipt reports caption words although no captions were rendered", { words: drawn.length });
  if (rendered) {
    // The drawn words are the content words less any filler words the cleaner
    // dropped; the cleaner never alters a word it keeps. They stay a separate list.
    if (drawn.length === 0) bad("receipt reports captions rendered without any caption words");
    const contentKeys = content.map((w) => canonical(w));
    let next = 0;
    drawn.forEach((w, i) => {
      const key = canonical(w);
      while (next < contentKeys.length && contentKeys[next] !== key) next++;
      if (next === contentKeys.length) bad(`receipt caption word ${i} is not one of the content words in order`, { word: w });
      next++;
    });
    if (!cleaning && drawn.length !== content.length) bad("receipt caption words differ from the content words although filler cleaning was off", { captions: drawn.length, content: content.length });
  }

  const card = obj(tl.thumbnail_card, "thumbnail_card");
  if (card.applied !== false) bad("receipt does not report the opening card as absent", { applied: card.applied });
  str(card.note, "thumbnail_card.note");
  const precision = obj(tl.frame_precision, "frame_precision");
  bool(precision.source_variable_frame_rate, "frame_precision.source_variable_frame_rate");
  str(precision.note, "frame_precision.note");
  arr(tl.heuristics_disabled, "heuristics_disabled").forEach((h, i) => str(h, `heuristics_disabled[${i}]`));

  return tl as unknown as RenderTimeline;
}

// ---------------------------------------------------------------------------
// Default collaborators
// ---------------------------------------------------------------------------

async function defaultRender(params: Record<string, unknown>): Promise<ClipResult> {
  const result = await new PythonExecutor().execute<ClipResult>("create_clip", params);
  if (!result.data) throw new Error("create_clip returned no data");
  return result.data;
}

export async function ffprobeMedia(path: string): Promise<MediaProbe> {
  const { stdout } = await execFileAsync(paths.ffprobePath, ["-v", "error", "-show_streams", "-show_format", "-of", "json", path], {
    windowsHide: true,
    maxBuffer: 16 << 20,
  });
  const parsed = JSON.parse(stdout) as { format?: { duration?: string; size?: string }; streams?: Array<{ codec_type?: string }> };
  const streams = parsed.streams ?? [];
  const duration = Number(parsed.format?.duration);
  return {
    duration: Number.isFinite(duration) ? duration : null,
    bytes: Number(parsed.format?.size ?? 0),
    has_video: streams.some((s) => s.codec_type === "video"),
    has_audio: streams.some((s) => s.codec_type === "audio"),
  };
}

// ---------------------------------------------------------------------------
// The service
// ---------------------------------------------------------------------------

export class ClipRevisionService {
  private readonly history: ClipsHistory;
  private readonly render: RenderFn;
  private readonly probe: ProbeFn;
  private readonly exportRoot: string;
  private readonly historyRoot: string;
  private readonly hooks: ClipRevisionHooks;

  constructor(options: ClipRevisionServiceOptions = {}) {
    this.history = options.history ?? new ClipsHistory();
    this.render = options.render ?? defaultRender;
    this.probe = options.probe ?? ffprobeMedia;
    this.exportRoot = resolve(options.exportRoot ?? paths.output);
    this.historyRoot = resolve(options.historyRoot ?? paths.history);
    this.hooks = options.hooks ?? {};
  }

  /** `<exportRoot>/writing-studio/<clipId>`: every operation of this clip renders beneath it. */
  namespaceRoot(clipId: string): string {
    return join(this.exportRoot, REVISION_NAMESPACE, validateId(clipId, "clip_id"));
  }

  /** `<history>/revisions/<clipId>`: immutable draft and revision documents. */
  sidecarRoot(clipId: string): string {
    return join(this.historyRoot, REVISION_SIDECARS, validateId(clipId, "clip_id"));
  }

  /**
   * Start tracking revisions for an existing clip entry. Idempotent: an already
   * tracked clip returns its state unchanged. The existing rendered output, if
   * any, becomes version zero labelled `legacy-unversioned`: no exact
   * provenance is claimed for it and nothing is rendered or moved.
   */
  async ensureTracked(clipId: string): Promise<ClipRevisionState> {
    validateId(clipId, "clip_id");
    const namespace = this.namespaceRoot(clipId);
    const sidecars = this.sidecarRoot(clipId);
    return this.history.transaction((entries) => {
      const entry = this.findEntry(entries, clipId);
      if (entry.revisions) return clone(entry.revisions);
      const legacy: RevisionPointer | null = entry.output_path
        ? {
            revision_id: "v0-legacy",
            version: 0,
            path: null,
            output_path: entry.output_path,
            group_root: null,
            operation_id: null,
            provenance: "legacy-unversioned",
            committed_at: entry.created_at || nowIso(),
          }
        : null;
      entry.revisions = {
        schema: CLIP_REVISIONS_SCHEMA,
        incarnation: randomUUID(),
        draft_version: 0,
        revision_version: 0,
        draft: null,
        current: legacy,
        previous: null,
        operations: [],
        roots: { namespace, sidecars },
      };
      return clone(entry.revisions);
    });
  }

  /** Lenient read of the current revision state; null when absent or untracked. */
  async getState(clipId: string): Promise<ClipRevisionState | null> {
    validateId(clipId, "clip_id");
    const entry = await this.history.findById(clipId);
    return entry?.revisions ? clone(entry.revisions) : null;
  }

  /**
   * Save a draft: write its immutable document, then advance the draft version
   * under expected state. Committed pointers and legacy summaries are untouched.
   * A pending render captured the previous draft, so it is marked superseded
   * here and its eventual commit is refused.
   */
  async saveDraft(rawRequest: SaveDraftRequest): Promise<SaveDraftResult> {
    const request = captureRequest(rawRequest, "draft request");
    const clipId = validateId(request.clip_id, "clip_id");
    const expected = validateExpected(request.expected);
    if (!isPlainObject(request.draft)) invalidRecipe("draft must be an object");
    const recipe = validateRecipeShape(request.draft.recipe);
    const sourceWords = validateWords(request.draft.source_words, "source_words");
    const draft: ClipDraft = { recipe, source_words: sourceWords, ...(request.draft.note !== undefined ? { note: String(request.draft.note) } : {}) };
    await requireRecipeFiles(recipe);
    const sidecars = this.sidecarRoot(clipId);
    const version = expected.draft_version + 1;
    const path = join(sidecars, `draft-${version}-${randomUUID()}.json`);
    const saved_at = nowIso();
    await assertOwnedDirectory(this.historyRoot, sidecars, "draft sidecar directory", true);
    try {
      await writeFileAtomic(path, JSON.stringify({ schema: CLIP_REVISIONS_SCHEMA, clip_id: clipId, incarnation: expected.incarnation, version, saved_at, draft }, null, 2));
    } catch (err) {
      throw new ClipRevisionError("SIDECAR_WRITE_FAILED", `could not write draft document ${path}: ${(err as Error).message}`, { path });
    }
    try {
      return await this.history.transaction((entries) => {
        const state = this.trackedState(this.findEntry(entries, clipId));
        this.assertExpected(state, expected);
        state.draft_version = version;
        state.draft = { version, path, saved_at };
        let superseded: string | null = null;
        const pending = state.operations.find((o) => o.state === "pending");
        if (pending) {
          pending.state = "superseded";
          pending.ended_at = saved_at;
          pending.reason = `draft changed to version ${version} while the render was pending`;
          superseded = pending.operation_id;
        }
        return { state: clone(state), draft: clone(state.draft), superseded_operation: superseded };
      });
    } catch (err) {
      // The document was written for this call only and is referenced by nothing.
      await rm(path, { force: true }).catch(() => {});
      throw err;
    }
  }

  /**
   * Render an exact revision and commit it. See the module comment for the
   * transaction contract. Returns the operation's outcome; typed errors are
   * thrown only for requests that never start an operation (validation,
   * unsupported card, ownership escape, busy, ID reuse, expected-state
   * mismatch at start).
   */
  async saveRevision(rawRequest: SaveRevisionRequest): Promise<SaveRevisionResult> {
    const request = captureRequest(rawRequest, "save request");
    const clipId = validateId(request.clip_id, "clip_id");
    const operationId = validateId(request.operation_id, "operation_id");
    if (request.thumbnail_card !== undefined && request.thumbnail_card !== null && request.thumbnail_card !== false) {
      throw new ClipRevisionError(
        "UNSUPPORTED_THUMBNAIL_CARD",
        "opening thumbnail cards are not supported by the revision save service yet; remove thumbnail_card from the request",
        { thumbnail_card: request.thumbnail_card },
      );
    }
    const expected = validateExpected(request.expected);
    const recipe = validateRecipeShape(request.recipe);
    const sourceWords = validateWords(request.source_words, "source_words");
    const requestHash = sha256Text(canonical({ clip_id: clipId, expected, recipe, source_words: sourceWords }));
    const namespace = this.namespaceRoot(clipId);
    const sidecars = this.sidecarRoot(clipId);
    const ctx: OperationContext = { clip_id: clipId, operation_id: operationId, namespace_root: namespace, group_root: null };

    // Replay first: a recorded operation is answered from history alone,
    // before any check that only a new render needs. A reused ID with a
    // different captured request conflicts here as well.
    const seen = await this.history.transaction((entries) => {
      const state = this.trackedState(this.findEntry(entries, clipId));
      const existing = ownedOperation(state, operationId, requestHash);
      return existing ? { replay: clone(existing), state: clone(state) } : null;
    });
    if (seen) return this.replayResult(seen.replay, seen.state);

    // A new render: the owned trees must be physically ours before anything
    // is written, and the source and assets must exist.
    await assertOwnedDirectory(this.exportRoot, namespace, "export namespace", false);
    await assertOwnedDirectory(this.historyRoot, sidecars, "revision sidecar directory", false);
    await requireRecipeFiles(recipe);

    // Begin: record the pending operation under expected state, or answer a
    // replay that appeared meanwhile.
    const begin = await this.history.transaction((entries) => {
      const state = this.trackedState(this.findEntry(entries, clipId));
      const existing = ownedOperation(state, operationId, requestHash);
      if (existing) return { replay: clone(existing), state: clone(state) };
      const pending = state.operations.find((o) => o.state === "pending");
      if (pending) {
        throw new ClipRevisionError("OPERATION_BUSY", `operation ${pending.operation_id} is still pending for clip ${clipId}; complete or invalidate it first`, { operation_id: pending.operation_id });
      }
      this.assertExpected(state, expected);
      const op: OperationRecord = {
        operation_id: operationId,
        kind: "save-revision",
        state: "pending",
        request_hash: requestHash,
        expected,
        started_at: nowIso(),
        ended_at: null,
        group_root: null,
        revision_id: null,
        error: null,
        residuals: [],
        reason: null,
        revision: null,
      };
      state.operations.push(op);
      return { replay: null, state: clone(state) };
    });
    if (begin.replay) return this.replayResult(begin.replay, begin.state);

    // Render, validate, probe and publish the revision document outside the lock.
    let result: ClipResult;
    let groupRoot: string;
    let doc: ClipRevisionDocument;
    let docPath: string;
    try {
      await this.hooks.beforeRender?.(ctx);
      await assertOwnedDirectory(this.exportRoot, namespace, "export namespace", true);
      result = await this.render(buildRenderParams(recipe, sourceWords, namespace));
      // Whatever the receipt says, a group the renderer published beneath the
      // namespace is on disk now; remember it so a refusal reports it truthfully.
      ctx.group_root = inferGroupRoot(namespace, (result as ClipResult | undefined)?.output_path);
      const timeline = validateReceipt(result, recipe, sourceWords);
      groupRoot = await this.validateArtifacts(namespace, result);
      ctx.group_root = groupRoot;
      await this.hooks.afterRender?.(ctx, result);
      const probe = await this.probe(result.output_path);
      const mainBytes = (await stat(result.output_path)).size;
      if (!probe.has_video) throw new ClipRevisionError("ARTIFACT_INVALID", `rendered output has no video stream: ${result.output_path}`);
      if (probe.bytes !== mainBytes || timeline.output.file_size_bytes !== mainBytes) {
        throw new ClipRevisionError("ARTIFACT_INVALID", `rendered output size disagrees with its receipt: ${result.output_path}`, { probe: probe.bytes, receipt: timeline.output.file_size_bytes, file: mainBytes });
      }
      const tolerance = Math.max(0.05, timeline.tolerance.composition_seconds);
      if (probe.duration === null || Math.abs(probe.duration - timeline.output_duration) > tolerance) {
        throw new ClipRevisionError("ARTIFACT_INVALID", `rendered duration ${probe.duration} disagrees with receipt output_duration ${timeline.output_duration}`, { tolerance });
      }
      const revisionId = randomUUID();
      docPath = join(sidecars, `${revisionId}.json`);
      doc = {
        schema: CLIP_REVISIONS_SCHEMA,
        revision_id: revisionId,
        clip_id: clipId,
        incarnation: expected.incarnation,
        operation_id: operationId,
        version: expected.revision_version + 1,
        created_at: nowIso(),
        recipe,
        source_words: sourceWords,
        words_input: sourceWords === null ? "unavailable" : "supplied",
        render_timeline: timeline,
        files: {
          main: await fileRecord(result.output_path),
          caption_overlay: result.caption_overlay_path ? await fileRecord(result.caption_overlay_path) : null,
          cropped_source: result.cropped_source_path ? await fileRecord(result.cropped_source_path) : null,
        },
        group_root: groupRoot,
        probe,
        thumbnail_card: { requested: false, applied: false, note: "no opening card is composed by the revision save service; the renderer reported none" },
        bookends: { intro: timeline.bookends.intro as SavedBookend | null, outro: timeline.bookends.outro as SavedBookend | null },
      };
      await assertOwnedDirectory(this.historyRoot, sidecars, "revision sidecar directory", true);
      try {
        await writeFileAtomic(docPath, JSON.stringify(doc, null, 2));
      } catch (err) {
        throw new ClipRevisionError("SIDECAR_WRITE_FAILED", `could not write revision document ${docPath}: ${(err as Error).message}`, { path: docPath });
      }
    } catch (err) {
      // A group the renderer published but this service refused stays on disk
      // unreferenced; name it. A renderer failure published nothing, and an
      // ownership refusal wrote nothing through the linked path it names.
      const refusedPath = err instanceof ClipRevisionError && err.code !== "OWNERSHIP_ESCAPE" && typeof err.details.path === "string" ? err.details.path : null;
      const residuals = ctx.group_root ? [ctx.group_root] : refusedPath ? [refusedPath] : [];
      const finished = await this.finishOperation(clipId, operationId, expected, requestHash, (err as Error).message, residuals);
      return { outcome: finished.operation.state === "failed" ? "failed" : finished.operation.state === "cancelled" ? "cancelled" : "superseded", replayed: false, operation: finished.operation, state: finished.state };
    }

    await this.hooks.beforeCommit?.(ctx);

    // Commit: one atomic history replacement moves the pointers, summaries and
    // the operation's success receipt, only if the record is still this
    // incarnation's, the operation is still this request's, and the expected
    // state still holds. Nothing belonging to another incarnation is touched.
    const commit = await this.history.transaction((entries) => {
      const entry = entries.find((e) => e.id === clipId);
      const state = entry?.revisions;
      const residuals = [groupRoot, docPath];
      const disowned = (reason: string) => ({ ok: false as const, operation: orphanOperation(operationId, requestHash, expected, reason, residuals), state: state ? clone(state) : null });
      if (!entry || !state) return disowned("clip was deleted or is no longer tracked");
      if (state.incarnation !== expected.incarnation) return disowned(`clip record incarnation changed (expected ${expected.incarnation}, now ${state.incarnation}); this render belongs to the earlier incarnation`);
      const op = state.operations.find((o) => o.operation_id === operationId);
      if (!op) return disowned("operation record is missing");
      if (op.request_hash !== requestHash) return disowned("operation record belongs to a different request");
      if (op.state !== "pending") {
        // Cancelled or superseded meanwhile: the published group and document
        // are this operation's unreferenced residuals; record them, commit nothing.
        op.group_root = groupRoot;
        op.residuals = residuals;
        return { ok: false as const, operation: clone(op), state: clone(state) };
      }
      const mismatch = describeMismatch(state, expected);
      if (mismatch) {
        op.state = "superseded";
        op.ended_at = nowIso();
        op.reason = mismatch;
        op.group_root = groupRoot;
        op.residuals = residuals;
        return { ok: false as const, operation: clone(op), state: clone(state) };
      }
      const committed_at = nowIso();
      const pointer: RevisionPointer = {
        revision_id: doc.revision_id,
        version: doc.version,
        path: docPath,
        output_path: result.output_path,
        group_root: groupRoot,
        operation_id: operationId,
        provenance: "exact",
        committed_at,
      };
      state.previous = state.current;
      state.current = pointer;
      state.revision_version = doc.version;
      op.state = "committed";
      op.ended_at = committed_at;
      op.revision_id = doc.revision_id;
      op.group_root = groupRoot;
      op.revision = clone(pointer);
      applyLegacySummary(entry, recipe, result, sourceWords);
      return { ok: true as const, operation: clone(op), state: clone(state), pointer };
    });
    if (!commit.ok) {
      return { outcome: commit.operation.state === "cancelled" ? "cancelled" : "superseded", replayed: false, operation: commit.operation, state: commit.state };
    }
    await this.hooks.afterCommit?.(ctx);
    return { outcome: "committed", replayed: false, revision: commit.pointer, operation: commit.operation, state: commit.state };
  }

  /**
   * Explicitly invalidate a pending operation (cancellation, or recovery after a
   * restart when the operator decides the render is not coming back). The
   * caller names the record incarnation it observed; a recreated clip's
   * same-ID operation is never touched by a stale cancellation. The renderer,
   * if still alive, finishes into its own group and then fails the commit's
   * ownership and expected-state checks. Nothing on disk is removed here.
   */
  async invalidateOperation(rawRequest: InvalidateOperationRequest): Promise<InvalidateOperationResult> {
    const request = captureRequest(rawRequest, "invalidation request");
    const clipId = validateId(request.clip_id, "clip_id");
    const operationId = validateId(request.operation_id, "operation_id");
    const incarnation = validateIncarnation(request.expected_incarnation, "expected_incarnation");
    const reason = String(request.reason || "invalidated");
    return this.history.transaction((entries) => {
      const entry = entries.find((e) => e.id === clipId);
      const state = entry?.revisions;
      if (!state) return { outcome: "unknown" as const };
      if (state.incarnation !== incarnation) {
        return { outcome: "not-owned" as const, reason: `clip record incarnation changed (expected ${incarnation}, now ${state.incarnation}); nothing was invalidated` };
      }
      const op = state.operations.find((o) => o.operation_id === operationId);
      if (!op) return { outcome: "unknown" as const };
      if (op.state !== "pending") return { outcome: "already-terminal" as const, operation: clone(op) };
      op.state = "cancelled";
      op.ended_at = nowIso();
      op.reason = reason;
      op.group_root = op.group_root ?? state.roots.namespace;
      op.residuals = [`${op.group_root} (any group this operation rendered remains unreferenced)`];
      return { outcome: "invalidated" as const, operation: clone(op) };
    });
  }

  /** Read an immutable revision document and check it belongs to the clip. */
  async loadRevision(clipId: string, revisionId: string): Promise<ClipRevisionDocument> {
    validateId(clipId, "clip_id");
    validateId(revisionId, "revision_id");
    const path = join(this.sidecarRoot(clipId), `${revisionId}.json`);
    const doc = JSON.parse(await readFile(path, "utf-8")) as ClipRevisionDocument;
    if (doc.schema !== CLIP_REVISIONS_SCHEMA || doc.clip_id !== clipId || doc.revision_id !== revisionId) {
      throw new ClipRevisionError("INVALID_RECEIPT", `revision document ${path} does not describe ${clipId}/${revisionId}`);
    }
    return doc;
  }

  /** Recompute the recorded files' hashes; the caller decides what a mismatch means. */
  async verifyRevisionFiles(doc: ClipRevisionDocument): Promise<Array<{ path: string; ok: boolean; reason?: string }>> {
    const checks: Array<{ path: string; ok: boolean; reason?: string }> = [];
    for (const file of [doc.files.main, doc.files.caption_overlay, doc.files.cropped_source]) {
      if (!file) continue;
      try {
        const size = (await stat(file.path)).size;
        const hash = await sha256File(file.path);
        checks.push({ path: file.path, ok: size === file.bytes && hash === file.sha256, reason: size !== file.bytes ? "size changed" : hash !== file.sha256 ? "content changed" : undefined });
      } catch (err) {
        checks.push({ path: file.path, ok: false, reason: (err as Error).message });
      }
    }
    return checks;
  }

  // -- internals -----------------------------------------------------------

  private findEntry(entries: ClipHistoryEntry[], clipId: string): ClipHistoryEntry {
    const entry = entries.find((e) => e.id === clipId);
    if (!entry) throw new ClipRevisionError("CLIP_NOT_FOUND", `clip ${clipId} does not exist`, { clip_id: clipId });
    return entry;
  }

  private trackedState(entry: ClipHistoryEntry): ClipRevisionState {
    if (!entry.revisions) throw new ClipRevisionError("CLIP_NOT_TRACKED", `clip ${entry.id} has no revision tracking; call ensureTracked first`, { clip_id: entry.id });
    return entry.revisions;
  }

  private assertExpected(state: ClipRevisionState, expected: ExpectedState): void {
    const mismatch = describeMismatch(state, expected);
    if (mismatch) {
      throw new ClipRevisionError("EXPECTED_STATE_MISMATCH", `${mismatch}; reload the clip and retry`, {
        expected,
        actual: { incarnation: state.incarnation, draft_version: state.draft_version, revision_version: state.revision_version },
      });
    }
  }

  /**
   * Record a failure on the operation this call owns: same clip incarnation,
   * same ID, same captured request. Any other record, including a recreated
   * clip's same-ID operation, is left untouched and the failure is returned
   * as an unpersisted description. An owned operation that was already
   * cancelled or superseded keeps its state and gains the late residuals.
   */
  private async finishOperation(clipId: string, operationId: string, expected: ExpectedState, requestHash: string, error: string, residuals: string[]) {
    return this.history.transaction((entries) => {
      const entry = entries.find((e) => e.id === clipId);
      const st = entry?.revisions;
      const disowned = (reason: string) => ({ operation: orphanOperation(operationId, requestHash, expected, `${reason}; the failed render belongs to an earlier incarnation or request: ${error}`, residuals), state: st ? clone(st) : null });
      if (!st) return disowned("clip was deleted or is no longer tracked");
      if (st.incarnation !== expected.incarnation) return disowned(`clip record incarnation changed (expected ${expected.incarnation}, now ${st.incarnation})`);
      const op = st.operations.find((o) => o.operation_id === operationId);
      if (!op) return disowned("operation record is missing");
      if (op.request_hash !== requestHash) return disowned("operation record belongs to a different request");
      if (op.state === "pending") {
        op.state = "failed";
        op.ended_at = nowIso();
        op.error = error;
        op.residuals = residuals;
        op.group_root = residuals[0] ?? op.group_root;
      } else if (op.state !== "committed") {
        op.residuals = [...new Set([...op.residuals, ...residuals])];
        op.group_root = op.group_root ?? residuals[0] ?? null;
      }
      return { operation: clone(op), state: clone(st) };
    });
  }

  /** The recorded outcome of an existing operation, complete and without rendering. */
  private replayResult(op: OperationRecord, state: ClipRevisionState): SaveRevisionResult {
    if (op.state === "pending") return { outcome: "pending", replayed: true, operation: op, state };
    if (op.state === "committed") {
      const pointer = op.revision ?? [state.current, state.previous].find((p) => p?.revision_id === op.revision_id) ?? null;
      if (!pointer) throw new ClipRevisionError("INVALID_RECEIPT", `operation ${op.operation_id} is recorded as committed without its result`, { operation_id: op.operation_id });
      return { outcome: "committed", replayed: true, revision: pointer, operation: op, state };
    }
    return { outcome: op.state, replayed: true, operation: op, state };
  }

  /**
   * The receipt's files must exist, be complete regular files, and live in a
   * group the renderer created directly beneath this clip's namespace, with
   * no link anywhere from the configured export root down to the files.
   * Anything else is refused before the commit.
   */
  private async validateArtifacts(namespace: string, result: ClipResult): Promise<string> {
    const outside = (p: string): never => {
      throw new ClipRevisionError("ARTIFACT_OUTSIDE_NAMESPACE", `returned path ${p} is not inside an operation group under ${namespace}`, { path: p, namespace });
    };
    const finalDir = dirname(result.output_path);
    const groupRoot = dirname(finalDir);
    if (basename(finalDir) !== "final" || basename(groupRoot).startsWith(".") || normalize(dirname(groupRoot)) !== normalize(namespace) || !contains(namespace, result.output_path)) outside(result.output_path);
    await assertOwnedDirectory(this.exportRoot, finalDir, "returned artifact directory", false);
    for (const p of [result.output_path, result.caption_overlay_path, result.cropped_source_path]) {
      if (!p) continue;
      if (normalize(dirname(p)) !== normalize(finalDir)) outside(p);
      let st;
      try {
        st = await lstat(p);
      } catch {
        throw new ClipRevisionError("ARTIFACT_INVALID", `returned artifact does not exist: ${p}`, { path: p });
      }
      if (!st.isFile() || st.size === 0) throw new ClipRevisionError("ARTIFACT_INVALID", `returned artifact is not a complete regular file: ${p}`, { path: p });
    }
    const groupStat = await lstat(groupRoot).catch(() => null);
    if (!groupStat || !groupStat.isDirectory()) throw new ClipRevisionError("ARTIFACT_INVALID", `operation group is not a directory: ${groupRoot}`);
    if (existsSync(join(groupRoot, "staging"))) throw new ClipRevisionError("ARTIFACT_INVALID", `operation group still holds staging: ${groupRoot}`);
    return groupRoot;
  }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function describeMismatch(state: ClipRevisionState, expected: ExpectedState): string | null {
  if (state.incarnation !== expected.incarnation) return `clip record incarnation changed (expected ${expected.incarnation}, now ${state.incarnation})`;
  if (state.draft_version !== expected.draft_version) return `draft version changed (expected ${expected.draft_version}, now ${state.draft_version})`;
  if (state.revision_version !== expected.revision_version) return `current revision changed (expected version ${expected.revision_version}, now ${state.revision_version})`;
  return null;
}

/** The operation record with this ID, if it belongs to the same captured
 * request; an ID already used for a different request is a conflict. */
function ownedOperation(state: ClipRevisionState, operationId: string, requestHash: string): OperationRecord | null {
  const existing = state.operations.find((o) => o.operation_id === operationId);
  if (!existing) return null;
  if (existing.request_hash !== requestHash) {
    throw new ClipRevisionError("OPERATION_ID_REUSED", `operation ${operationId} already exists for a different request`, { operation_id: operationId, state: existing.state });
  }
  return existing;
}

/** `<namespace>/<group>/final/<file>` names a group beneath the namespace; anything else is null. */
function inferGroupRoot(namespace: string, outputPath: unknown): string | null {
  if (typeof outputPath !== "string" || !isAbsolute(outputPath)) return null;
  const finalDir = dirname(outputPath);
  const group = dirname(finalDir);
  if (basename(finalDir) !== "final" || normalize(dirname(group)) !== normalize(namespace)) return null;
  return group;
}

/** An unpersisted description of work that no longer owns a record. */
function orphanOperation(operationId: string, requestHash: string, expected: ExpectedState, reason: string, residuals: string[]): OperationRecord {
  return {
    operation_id: operationId,
    kind: "save-revision",
    state: "superseded",
    request_hash: requestHash,
    expected,
    started_at: "",
    ended_at: nowIso(),
    group_root: residuals[0] ?? null,
    revision_id: null,
    error: null,
    residuals,
    reason,
    revision: null,
  };
}

async function fileRecord(path: string): Promise<RevisionFile> {
  return { path, bytes: (await stat(path)).size, sha256: await sha256File(path) };
}

/** The exact create_clip request. A null transcript is omitted so the bridge
 * sees it as unavailable; an empty array is sent as supplied and empty. */
export function buildRenderParams(recipe: ExactRenderRecipe, sourceWords: WordTimestamp[] | null, namespace: string): Record<string, unknown> {
  const params: Record<string, unknown> = {
    timing_mode: "exact",
    video_path: recipe.source_video,
    title: recipe.title,
    keep_segments: recipe.keep_segments.map((s) => ({ start: s.start, end: s.end })),
    start_second: 0,
    end_second: 0,
    caption_style: recipe.caption_style,
    caption_position: recipe.caption_position ?? "auto",
    caption_font_scale: recipe.caption_font_scale ?? 100,
    crop_strategy: recipe.crop_strategy,
    format: recipe.format,
    clean_fillers: recipe.clean_fillers ?? false,
    logo_position: recipe.logo_position ?? "top-left",
    output_dir: namespace,
  };
  if (recipe.crop_keyframes) params.crop_keyframes = recipe.crop_keyframes.map((k) => ({ ...k }));
  if (recipe.foreground_framing) params.foreground_framing = clone(recipe.foreground_framing);
  for (const key of ["logo_path", "intro_path", "outro_path"] as const) {
    if (typeof recipe[key] === "string") params[key] = recipe[key];
  }
  if (typeof recipe.bookend_fade === "number") params.bookend_fade = recipe.bookend_fade;
  if (recipe.keep_caption_overlay !== undefined) params.keep_caption_overlay = recipe.keep_caption_overlay;
  if (recipe.allow_ass_fallback !== undefined) params.allow_ass_fallback = recipe.allow_ass_fallback;
  if (sourceWords !== null) params.transcript_words = sourceWords.map((w) => ({ ...w }));
  return params;
}

/** Legacy summary fields describe the current revision for existing readers. */
function applyLegacySummary(entry: ClipHistoryEntry, recipe: ExactRenderRecipe, result: ClipResult, sourceWords: WordTimestamp[] | null): void {
  const tl = result.render_timeline!;
  entry.output_path = result.output_path;
  entry.duration = result.duration;
  entry.file_size_mb = result.file_size_mb;
  const starts = recipe.keep_segments.map((s) => s.start);
  const ends = recipe.keep_segments.map((s) => s.end);
  entry.start_second = Math.min(...starts);
  entry.end_second = Math.max(...ends);
  entry.caption_style = recipe.caption_style;
  entry.crop_strategy = recipe.crop_strategy;
  entry.format = recipe.format;
  entry.keep_segments = recipe.keep_segments.map((s) => ({ start: s.start, end: s.end }));
  for (const key of ["logo_path", "intro_path", "outro_path"] as const) {
    if (typeof recipe[key] === "string") entry[key] = recipe[key];
    else delete entry[key];
  }
  if (recipe.logo_position !== undefined) entry.logo_position = recipe.logo_position;
  if (sourceWords === null) delete entry.transcript_slice;
  else entry.transcript_slice = tl.words.content_text;
  // The new output carries no opening card; a stale card duration would claim one.
  if (entry.thumbnail_config && entry.thumbnail_config.card_seconds) entry.thumbnail_config = { ...entry.thumbnail_config, card_seconds: 0 };
}
