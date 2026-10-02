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
//   bookend's asset, overlap, branch, region and transition. Each bookend of a
//   new save must also carry the join inputs concat_outro recorded, and its
//   branch and overlap must be the renderer's clamp and crossfade eligibility
//   for those inputs and the captured fade. Anything else is refused as a
//   failed operation without moving a pointer. Stored revision documents are
//   read and replayed as saved, without re-validation or upgrade.
// - An opening thumbnail card (1B.2b.1) is one validated descriptor: the image,
//   the SHA-256 it must still have, placement "opening" and 1.5 seconds. It is
//   part of the request identity; a request without one hashes exactly as it
//   did before cards existed. After replay is ruled out, the image must still
//   hash to the captured value. The exact render is obtained and validated
//   first, unchanged and still card-free in its receipt; the card is then
//   composed from that fresh render by backend/services/opening_card.py into
//   a second operation group. Its receipt is accepted only when it is a
//   complete version 1 receipt (every declared field present, typed and in
//   range, nothing else, its time-domain map verbatim), the composed group and
//   files are this call's, the image copy hashes to the captured value, and
//   this service's own probe of every video packet shows whole card frames at
//   the raw frame duration nearest 1.5 s followed by every raw frame shifted by
//   exactly the card, with dimensions, sample aspect ratio, time base and audio
//   parameters unchanged and the audio end moved by the card within one AAC
//   frame. Every retained claim (container durations, stream summaries, card
//   timing, audio nullability, tolerances) must equal that probe or the timing
//   derived from it. The document keeps the raw receipt as
//   `render_timeline` and adds a versioned `final_composition` record holding
//   the checked receipt; the pointer, served paths and legacy duration and size
//   describe the composed file. Documents saved earlier are read as saved.
// - Earlier outputs, flat or grouped, are never renamed, replaced or deleted.
//   Failed or superseded work may leave unreferenced files; every group it
//   published, the renderer's and the composer's, is reported as a residual,
//   never collected.
// - A commit projects the legacy summary fields from the new revision (1B.2b.4a):
//   no stale `logo_backup_path` survives it, `thumbnail_config.preview_path` is the
//   committed card image's owned copy (removed without a card), and legacy thumbnail
//   settings a finishing action supplies land in the same locked transaction. A
//   request without them keeps its earlier identity; a replay rewrites nothing.
//
// What it does not do (successor work): the finishing-action adapters
// (src/services/clip-legacy-adapters.ts) are its only route caller; no CLI, MCP
// or UI adapter opts into it; no legacy import; no unchanged-input render
// avoidance here (an adapter answers an unchanged request without saving); no
// Cleanup eligibility for anything it creates.

import { execFile } from "child_process";
import { createHash, randomUUID } from "crypto";
import { createReadStream, existsSync } from "fs";
import { lstat, mkdir, readFile, readdir, rm, stat } from "fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "path";
import { promisify } from "util";
import { paths } from "../config/paths.js";
import { writeFileAtomic } from "../utils/atomic-file.js";
import { ClipsHistory } from "./clips-history.js";
import { PythonExecutor } from "./python-executor.js";
import type { ClipHistoryEntry, ClipResult, ClipThumbnailConfig, RenderTimeline, WordTimestamp } from "../models/index.js";
import {
  CLIP_REVISIONS_SCHEMA,
  ClipRevisionError,
  FINAL_COMPOSITION_VERSION,
  OPENING_CARD_DURATION,
  OPENING_CARD_TIME_DOMAINS,
  type ClipDraft,
  type CompositionAudioSummary,
  type CompositionVideoSummary,
  type FinalCompositionRecord,
  type OpeningCardReceipt,
  type SavedProbe,
  type ThumbnailCardDescriptor,
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
  type SavedThumbnailCard,
  type SupportedBookendBranch,
  type ThumbnailMetadataRequest,
  type ThumbnailMetadataResult,
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

/** One video stream, as opening card composition is checked against it. */
export interface VideoStreamProbe {
  width: number;
  height: number;
  /** Reduced "num:den"; square pixels when the file leaves it unset. */
  sample_aspect_ratio: string;
  /** Reduced "num/den"; timestamps below are whole units of it. */
  time_base: string;
  frame_rate: string | null;
  start: number | null;
  duration: number | null;
  /** Every packet's presentation timestamp, ascending, in time-base ticks. */
  pts: number[];
  /** Packet durations in the same order, 0 where the file records none. */
  durations: number[];
}

export interface AudioStreamProbe {
  sample_rate: number;
  channels: number;
  channel_layout: string | null;
  start: number | null;
  duration: number | null;
}

export interface StreamProbe {
  bytes: number;
  duration: number | null;
  video: VideoStreamProbe | null;
  audio: AudioStreamProbe | null;
}

export type RenderFn = (params: Record<string, unknown>) => Promise<ClipResult>;
export type ProbeFn = (path: string) => Promise<MediaProbe>;
export type StreamProbeFn = (path: string) => Promise<StreamProbe>;
export type ComposeFn = (params: Record<string, unknown>) => Promise<OpeningCardReceipt>;

export interface OperationContext {
  clip_id: string;
  operation_id: string;
  namespace_root: string;
  /** Set once the renderer has returned its group. */
  group_root: string | null;
  /** Groups the composer created under this operation's card stem, once it has returned or failed. */
  card_groups: string[];
}

/** Deterministic barriers for tests: each hook runs at the named point in a
 * save and may await, throw or end the process. Production wiring passes none. */
export interface ClipRevisionHooks {
  beforeRender?: (ctx: OperationContext) => Promise<void> | void;
  afterRender?: (ctx: OperationContext, result: ClipResult) => Promise<void> | void;
  beforeCompose?: (ctx: OperationContext) => Promise<void> | void;
  afterCompose?: (ctx: OperationContext, receipt: OpeningCardReceipt) => Promise<void> | void;
  beforeCommit?: (ctx: OperationContext) => Promise<void> | void;
  afterCommit?: (ctx: OperationContext) => Promise<void> | void;
}

export interface ClipRevisionServiceOptions {
  history?: ClipsHistory;
  render?: RenderFn;
  probe?: ProbeFn;
  /** Opening card composer; defaults to the compose_opening_card bridge task. */
  compose?: ComposeFn;
  /** Stream and packet probe for composition checks; defaults to ffprobe. */
  streams?: StreamProbeFn;
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

const SHA256_RE = /^[0-9a-f]{64}$/;
const CARD_IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const CARD_KEYS = ["duration", "image_path", "image_sha256", "placement"];

function invalidCard(message: string, details: Record<string, unknown> = {}): never {
  throw new ClipRevisionError("INVALID_THUMBNAIL_CARD", message, details);
}

/**
 * The one supported opening card, or null for none. Absent, null and false all
 * mean no card, as before cards were supported. Anything else must be exactly
 * the descriptor's four fields with the fixed placement and duration: other
 * values are refused, never coerced. Shape only; no filesystem access.
 */
function validateCardDescriptor(value: unknown): ThumbnailCardDescriptor | null {
  if (value === undefined || value === null || value === false) return null;
  if (!isPlainObject(value)) invalidCard("thumbnail_card must name image_path, image_sha256, placement and duration, or be null for no card", { thumbnail_card: value });
  const keys = Object.keys(value).sort();
  if (keys.length !== CARD_KEYS.length || keys.some((k, i) => k !== CARD_KEYS[i])) {
    invalidCard(`thumbnail_card must have exactly image_path, image_sha256, placement and duration; it has ${keys.join(", ") || "no fields"}`, { keys });
  }
  const { image_path, image_sha256, placement, duration } = value;
  if (placement !== "opening") invalidCard(`thumbnail_card placement ${JSON.stringify(placement)} is not supported; only "opening" is`, { placement });
  if (duration !== OPENING_CARD_DURATION) invalidCard(`thumbnail_card duration ${JSON.stringify(duration)} is not supported; only ${OPENING_CARD_DURATION} seconds is`, { duration });
  if (typeof image_path !== "string" || !image_path.trim() || !isAbsolute(image_path)) invalidCard("thumbnail_card image_path must be an absolute path", { image_path });
  if (!CARD_IMAGE_EXTENSIONS.has(extname(image_path).toLowerCase())) invalidCard(`thumbnail_card image_path must be a ${[...CARD_IMAGE_EXTENSIONS].join(", ")} image`, { image_path });
  if (typeof image_sha256 !== "string" || !SHA256_RE.test(image_sha256)) invalidCard("thumbnail_card image_sha256 must be a lowercase hexadecimal SHA-256", { image_sha256 });
  return { image_path, image_sha256, placement: "opening", duration: OPENING_CARD_DURATION };
}

/** The selected image must still be the captured one: a check only new work needs. */
async function requireCardImage(card: ThumbnailCardDescriptor): Promise<void> {
  const mismatch = (message: string): never => {
    throw new ClipRevisionError("CARD_IMAGE_MISMATCH", message, { image_path: card.image_path, image_sha256: card.image_sha256 });
  };
  const st = await lstat(card.image_path).catch(() => null);
  if (!st) return mismatch(`thumbnail card image does not exist: ${card.image_path}`);
  if (!st.isFile()) mismatch(`thumbnail card image is not a regular file: ${card.image_path}`);
  const actual = await sha256File(card.image_path);
  if (actual !== card.image_sha256) mismatch(`thumbnail card image ${card.image_path} now hashes to ${actual}, not the captured ${card.image_sha256}; choose the card again`);
}

/** `thumbnail_config` keys a commit projects from the revision itself. */
const PROJECTED_THUMBNAIL_KEYS = ["preview_path", "card_seconds"];

/** Legacy thumbnail settings to store with a commit, or null for none. Projected keys
 * are dropped: the revision decides them. Shape only; no filesystem access. */
function validateThumbnailMetadata(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return null;
  if (!isPlainObject(value)) invalidRecipe("thumbnail_metadata must be an object or null");
  const settings = { ...value };
  for (const key of PROJECTED_THUMBNAIL_KEYS) delete settings[key];
  return settings;
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

export async function sha256File(path: string): Promise<string> {
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
/** concat_outro's crossfade floor: its least overlap, the margin it keeps inside each input and its least crossfade offset. */
const MIN_CROSSFADE = 0.05;
/** video_processor.concat_outro for a numeric fade request: the fade (0 unless positive)
 * clamped inside each input it joined, and whether it crossfades at all. The same IEEE
 * arithmetic as the renderer, so a threshold the renderer lands just below is decided
 * identically here (0.4 - 0.35 is 0.04999999999999999: no crossfade). */
function concatJoin(fade: number, main: number, appended: number): { overlap: number; crossfades: boolean } {
  let overlap = fade > 0 ? fade : 0;
  overlap = Math.min(overlap, Math.max(MIN_CROSSFADE, main - MIN_CROSSFADE));
  if (appended > 0) overlap = Math.min(overlap, Math.max(MIN_CROSSFADE, appended - MIN_CROSSFADE));
  return { overlap, crossfades: Math.max(0, main - overlap) >= MIN_CROSSFADE && overlap >= MIN_CROSSFADE };
}
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
  const regions: Partial<Record<"intro" | "outro", { end: number; asset: number; overlap: number; contentEnd: number; branch: string; measured: number | null; joinInputs: unknown }>> = {};
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
    const measured = numOrNull(b.measured_output_duration, `bookends.${kind}.measured_output_duration`, 0);
    // A branch name alone proves no join: a hard cut overlaps nothing. A crossfade's
    // overlap is checked against the renderer's clamp of its join inputs below.
    if (HARD_CUT_BRANCHES.has(branch) && overlap !== 0) bad(`receipt ${kind} ${branch} claims ${overlap}s of video overlap; a hard cut overlaps nothing`, { branch, applied_overlap: overlap });
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
    regions[kind] = { end, asset, overlap, contentEnd: tEnd, branch, measured, joinInputs: b.join_inputs };
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
  // Join provenance (lead-12). Each bookend of a new save carries the two input
  // durations concat_outro actually joined; its branch and overlap must follow from
  // them and the captured fade by the renderer's own clamp. Documents saved before
  // this provenance existed are read as saved and never pass through here.
  for (const kind of ["intro", "outro"] as const) {
    const region = regions[kind];
    if (!region) continue;
    if (region.joinInputs === undefined || region.joinInputs === null) {
      bad(`receipt ${kind} lacks join_inputs: a new save needs the main_duration and appended_duration concat_outro joined, which this renderer did not record; update the renderer and render again`, { missing: `bookends.${kind}.join_inputs` });
    }
    const inputs = obj(region.joinInputs, `bookends.${kind}.join_inputs`);
    const main = num(inputs.main_duration, `bookends.${kind}.join_inputs.main_duration`, 0);
    const appended = num(inputs.appended_duration, `bookends.${kind}.join_inputs.appended_duration`, 0);
    // bookend_region rounds the asset from the input it describes: an intro is the join's first input, an outro its second.
    const assetInput = kind === "intro" ? main : appended;
    if (!near(region.asset, assetInput, RECEIPT_ROUNDING)) bad(`receipt ${kind} asset_duration ${region.asset}s is not its joined input ${assetInput}s`, { asset_duration: region.asset, join_inputs: inputs });
    // concat_outro probes the intro join's output for its report and again as the outro's first input.
    if (kind === "outro" && regions.intro && regions.intro.measured !== null && !near(main, regions.intro.measured, RECEIPT_ROUNDING)) {
      bad("receipt outro join_inputs.main_duration is not the intro join's measured output", { main_duration: main, intro_measured_output_duration: regions.intro.measured });
    }
    // A hard cut overlaps nothing (checked above) and is a supported fallback whether or not a crossfade was eligible.
    if (HARD_CUT_BRANCHES.has(region.branch)) continue;
    const clamp = concatJoin(sentFade, main, appended);
    if (!clamp.crossfades) {
      bad(`receipt ${kind} ${region.branch} cannot have crossfaded: concat_outro clamps the ${sentFade}s fade to ${clamp.overlap}s for these join inputs and crossfades only when that and the offset before it are both at least ${MIN_CROSSFADE}s`, { branch: region.branch, requested_fade: sentFade, clamped: clamp.overlap, join_inputs: inputs });
    }
    if (!near(region.overlap, clamp.overlap, RECEIPT_ROUNDING)) {
      bad(`receipt ${kind} crossfade overlap ${region.overlap}s is not the requested fade ${sentFade}s clamped by its join inputs to ${clamp.overlap}s`, { applied_overlap: region.overlap, requested_fade: sentFade, clamped: clamp.overlap, join_inputs: inputs });
    }
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

async function defaultCompose(params: Record<string, unknown>): Promise<OpeningCardReceipt> {
  const result = await new PythonExecutor().execute<OpeningCardReceipt>("compose_opening_card", params);
  if (!result.data) throw new Error("compose_opening_card returned no data");
  return result.data;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** "num<sep>den" of positive integers, reduced; null otherwise. */
function ratio(value: unknown, separator: string): { num: number; den: number } | null {
  if (typeof value !== "string") return null;
  const parts = value.split(separator);
  if (parts.length !== 2 || !parts.every((p) => /^\d+$/.test(p))) return null;
  const [num, den] = parts.map(Number);
  if (!(num > 0 && den > 0)) return null;
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

function finiteOrNull(value: unknown): number | null {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

/** Stream parameters and every video packet timestamp, for opening card checks. */
export async function ffprobeStreams(path: string): Promise<StreamProbe> {
  const options = { windowsHide: true, maxBuffer: 64 << 20 };
  const [info, packets] = await Promise.all([
    execFileAsync(paths.ffprobePath, ["-v", "error", "-show_streams", "-show_format", "-of", "json", path], options),
    execFileAsync(paths.ffprobePath, ["-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts,duration", "-of", "csv=p=0", path], options),
  ]);
  type Stream = Record<string, unknown> & { codec_type?: string };
  const parsed = JSON.parse(info.stdout) as { format?: { duration?: string; size?: string }; streams?: Stream[] };
  const streams = parsed.streams ?? [];
  const v = streams.find((s) => s.codec_type === "video");
  const a = streams.find((s) => s.codec_type === "audio");
  let video: VideoStreamProbe | null = null;
  if (v) {
    const tb = ratio(v.time_base, "/");
    if (!tb) throw new Error(`ffprobe reported no usable video time base for ${path}`);
    const sar = ratio(v.sample_aspect_ratio, ":") ?? { num: 1, den: 1 };
    const pairs = packets.stdout.split(/\r?\n/).map((line) => line.trim().split(",")).filter((f) => f[0] !== "").map((f) => {
      if (!/^-?\d+$/.test(f[0])) throw new Error(`a video packet of ${path} has no usable timestamp: ${f.join(",")}`);
      return [Number(f[0]), /^\d+$/.test(f[1] ?? "") ? Number(f[1]) : 0] as [number, number];
    });
    pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    video = {
      width: Number(v.width ?? 0),
      height: Number(v.height ?? 0),
      sample_aspect_ratio: `${sar.num}:${sar.den}`,
      time_base: `${tb.num}/${tb.den}`,
      frame_rate: typeof v.avg_frame_rate === "string" ? v.avg_frame_rate : null,
      start: finiteOrNull(v.start_time),
      duration: finiteOrNull(v.duration),
      pts: pairs.map((p) => p[0]),
      durations: pairs.map((p) => p[1]),
    };
  }
  return {
    bytes: Number(parsed.format?.size ?? 0),
    duration: finiteOrNull(parsed.format?.duration),
    video,
    audio: a
      ? {
          sample_rate: Number(a.sample_rate ?? 0),
          channels: Number(a.channels ?? 0),
          channel_layout: typeof a.channel_layout === "string" ? a.channel_layout : null,
          start: finiteOrNull(a.start_time),
          duration: finiteOrNull(a.duration),
        }
      : null,
  };
}

// Opening card timing, as backend/services/opening_card.py composes it. The card
// continues the frame duration of the raw render's first frames (a later join
// such as an outro may carry a longer gap), in whole frames nearest 1.5 s.
const LEADING_PACKETS = 60;
/** AAC codes whole 1024-sample frames: an encode may pad its end by up to one. */
const AAC_FRAME_SAMPLES = 1024;

/** The raw render's leading frame duration in ticks: the lower median of its first
 * packet durations, or of their timestamp spacing when durations are unrecorded. */
function leadingFrameTicks(video: VideoStreamProbe): number | null {
  let values = video.durations.slice(0, LEADING_PACKETS).filter((d) => d > 0);
  if (values.length === 0) {
    const lead = video.pts.slice(0, LEADING_PACKETS + 1);
    values = lead.slice(1).map((p, i) => p - lead[i]).filter((d) => d > 0);
  }
  if (values.length === 0) return null;
  values.sort((x, y) => x - y);
  return values[Math.floor((values.length - 1) / 2)];
}

/** Whole frames nearest 1.5 s at `ticks` of time base num/den, ties rounding up:
 * floor(1.5 / (ticks·num/den) + 1/2) in integers. */
function cardFrameCount(ticks: number, tb: { num: number; den: number }): number {
  return Math.max(1, Math.floor((3 * tb.den + ticks * tb.num) / (2 * ticks * tb.num)));
}

function summarizeVideo(video: VideoStreamProbe): CompositionVideoSummary {
  return {
    width: video.width,
    height: video.height,
    sample_aspect_ratio: video.sample_aspect_ratio,
    time_base: video.time_base,
    frame_rate: video.frame_rate,
    packets: video.pts.length,
    first_pts: video.pts[0],
    start: video.start,
    duration: video.duration,
  };
}

function summarizeAudio(audio: AudioStreamProbe | null): CompositionAudioSummary | null {
  return audio ? { sample_rate: audio.sample_rate, channels: audio.channels, channel_layout: audio.channel_layout, start: audio.start, duration: audio.duration } : null;
}

function savedProbe(probe: MediaProbe): SavedProbe {
  return { duration: probe.duration, bytes: probe.bytes, has_video: probe.has_video, has_audio: probe.has_audio };
}

/** Directories directly beneath `namespace` named `<stem>-...`: what one composer call created. */
async function groupsWithStem(namespace: string, stem: string): Promise<string[]> {
  const names = await readdir(namespace).catch(() => [] as string[]);
  return names.filter((name) => name.startsWith(`${stem}-`)).sort().map((name) => join(namespace, name));
}

/** Seconds by which the composer's and this service's arithmetic on the same whole ticks or
 * samples may differ in floating-point representation: far below one tick of any time base. */
const DERIVED_SECONDS = 1e-9;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const POSITIVE_COLON_RATIO = /^[1-9]\d*:[1-9]\d*$/;
const POSITIVE_SLASH_RATIO = /^[1-9]\d*\/[1-9]\d*$/;
const VIDEO_SUMMARY_FIELDS = ["width", "height", "sample_aspect_ratio", "time_base", "frame_rate", "packets", "first_pts", "start", "duration"] as const;
const AUDIO_SUMMARY_FIELDS = ["sample_rate", "channels", "channel_layout", "start", "duration"] as const;

/**
 * The composer's receipt against the complete version 1 OpeningCardReceipt schema:
 * every declared field present and no other field at any level, literals exact,
 * numbers finite, counts and sizes integers in range, hashes lowercase SHA-256,
 * ratios positive, and null only where the schema allows it. The time-domain map
 * must be backend/services/opening_card.py's v1 map verbatim. Prose (the audio
 * note and the tolerance basis) is checked for its type only and is never read as
 * a measurement. Returns a new object built from the checked values alone;
 * validateComposition compares them with the captured request and measured files.
 */
function parseOpeningCardReceipt(value: unknown): OpeningCardReceipt {
  const bad = (message: string, details: Record<string, unknown> = {}): never => {
    throw new ClipRevisionError("INVALID_COMPOSITION", message, details);
  };
  const fields = <K extends string>(v: unknown, label: string, keys: readonly K[]): Record<K, unknown> => {
    const name = label || "receipt";
    if (!isPlainObject(v)) return bad(`composition ${name} must be an object`, { [name]: v });
    for (const key of Object.keys(v)) {
      if (!(keys as readonly string[]).includes(key)) bad(`composition ${name} has an unsupported field ${JSON.stringify(key)}`, { [name]: key });
    }
    for (const key of keys) if (v[key] === undefined) bad(`composition ${label ? `${label}.${key}` : key} is required`);
    return v as Record<K, unknown>;
  };
  const literal = <T extends string | number>(v: unknown, want: T, label: string): T =>
    v === want ? want : bad(`composition ${label} is ${JSON.stringify(v)}; expected ${JSON.stringify(want)}`, { [label]: v, expected: want });
  const string = (v: unknown, label: string): string => (typeof v === "string" ? v : bad(`composition ${label} must be a string`, { [label]: v }));
  const text = (v: unknown, label: string): string => (typeof v === "string" && v.trim() !== "" ? v : bad(`composition ${label} must be a non-empty string`, { [label]: v }));
  const matching = (v: unknown, label: string, re: RegExp, what: string): string => (re.test(string(v, label)) ? (v as string) : bad(`composition ${label} must be ${what}`, { [label]: v }));
  const number = (v: unknown, label: string, min?: number, exclusive = false): number =>
    isFiniteNumber(v) && (min === undefined || (exclusive ? v > min : v >= min))
      ? v
      : bad(`composition ${label} must be a finite number${min === undefined ? "" : ` ${exclusive ? ">" : ">="} ${min}`}`, { [label]: v });
  const integer = (v: unknown, label: string, min?: number): number =>
    Number.isSafeInteger(v) && (min === undefined || (v as number) >= min) ? (v as number) : bad(`composition ${label} must be an integer${min === undefined ? "" : ` >= ${min}`}`, { [label]: v });
  const orNull = <T>(v: unknown, check: (v: unknown) => T): T | null => (v === null ? null : check(v));
  const sha = (v: unknown, label: string) => matching(v, label, SHA256_HEX, "a lowercase hexadecimal SHA-256");

  const video = (v: unknown, label: string): CompositionVideoSummary => {
    const o = fields(v, label, VIDEO_SUMMARY_FIELDS);
    return {
      width: integer(o.width, `${label}.width`, 1),
      height: integer(o.height, `${label}.height`, 1),
      sample_aspect_ratio: matching(o.sample_aspect_ratio, `${label}.sample_aspect_ratio`, POSITIVE_COLON_RATIO, "a positive num:den ratio"),
      time_base: matching(o.time_base, `${label}.time_base`, POSITIVE_SLASH_RATIO, "a positive num/den ratio"),
      frame_rate: orNull(o.frame_rate, (x) => string(x, `${label}.frame_rate`)),
      packets: integer(o.packets, `${label}.packets`, 1),
      first_pts: integer(o.first_pts, `${label}.first_pts`),
      start: orNull(o.start, (x) => number(x, `${label}.start`)),
      duration: orNull(o.duration, (x) => number(x, `${label}.duration`, 0)),
    };
  };
  const audio = (v: unknown, label: string): CompositionAudioSummary | null => {
    if (v === null) return null;
    const o = fields(v, label, AUDIO_SUMMARY_FIELDS);
    return {
      sample_rate: integer(o.sample_rate, `${label}.sample_rate`, 1),
      channels: integer(o.channels, `${label}.channels`, 1),
      channel_layout: orNull(o.channel_layout, (x) => string(x, `${label}.channel_layout`)),
      start: orNull(o.start, (x) => number(x, `${label}.start`)),
      duration: orNull(o.duration, (x) => number(x, `${label}.duration`, 0)),
    };
  };

  const r = fields(value, "", ["version", "kind", "placement", "transition", "overlap", "requested_duration", "raw", "card", "output", "time_domains", "tolerance"] as const);
  const head = {
    version: literal(r.version, 1 as const, "version"),
    kind: literal(r.kind, "opening_card" as const, "kind"),
    placement: literal(r.placement, "opening" as const, "placement"),
    transition: literal(r.transition, "hardcut" as const, "transition"),
    overlap: literal(r.overlap, 0 as const, "overlap"),
    requested_duration: literal(r.requested_duration, OPENING_CARD_DURATION, "requested_duration"),
  };
  const rawIn = fields(r.raw, "raw", ["path", "sha256", "file_size_bytes", "duration", "video", "audio"] as const);
  const raw = {
    path: string(rawIn.path, "raw.path"),
    sha256: sha(rawIn.sha256, "raw.sha256"),
    file_size_bytes: integer(rawIn.file_size_bytes, "raw.file_size_bytes", 1),
    duration: orNull(rawIn.duration, (x) => number(x, "raw.duration", 0)),
    video: video(rawIn.video, "raw.video"),
    audio: audio(rawIn.audio, "raw.audio"),
  };
  const cardIn = fields(r.card, "card", [
    "image_path", "image_sha256", "image_bytes", "frames", "frame_ticks", "frame_duration",
    "measured_ticks", "measured_duration", "audio_samples", "output_start", "output_end", "audio_note",
  ] as const);
  const card = {
    image_path: string(cardIn.image_path, "card.image_path"),
    image_sha256: sha(cardIn.image_sha256, "card.image_sha256"),
    image_bytes: integer(cardIn.image_bytes, "card.image_bytes", 1),
    frames: integer(cardIn.frames, "card.frames", 1),
    frame_ticks: integer(cardIn.frame_ticks, "card.frame_ticks", 1),
    frame_duration: number(cardIn.frame_duration, "card.frame_duration", 0, true),
    measured_ticks: integer(cardIn.measured_ticks, "card.measured_ticks", 1),
    measured_duration: number(cardIn.measured_duration, "card.measured_duration", 0, true),
    audio_samples: orNull(cardIn.audio_samples, (x) => integer(x, "card.audio_samples", 0)),
    output_start: literal(cardIn.output_start, 0 as const, "card.output_start"),
    output_end: number(cardIn.output_end, "card.output_end", 0, true),
    audio_note: orNull(cardIn.audio_note, (x) => text(x, "card.audio_note")),
  };
  const outIn = fields(r.output, "output", ["path", "file_size_bytes", "duration", "video", "audio"] as const);
  const output = {
    path: string(outIn.path, "output.path"),
    file_size_bytes: integer(outIn.file_size_bytes, "output.file_size_bytes", 1),
    duration: orNull(outIn.duration, (x) => number(x, "output.duration", 0)),
    video: video(outIn.video, "output.video"),
    audio: audio(outIn.audio, "output.audio"),
  };
  if (!isPlainObject(r.time_domains)) bad("composition time_domains must be an object", { time_domains: r.time_domains });
  const timeDomains: Record<string, string> = {};
  for (const [key, description] of Object.entries(r.time_domains as Record<string, unknown>)) timeDomains[key] = string(description, `time_domains[${JSON.stringify(key)}]`);
  if (canonical(timeDomains) !== canonical(OPENING_CARD_TIME_DOMAINS)) bad("composition time_domains are not the opening card v1 time-domain map", { time_domains: timeDomains });
  const tolIn = fields(r.tolerance, "tolerance", ["video_ticks", "card_seconds", "audio_seconds", "basis"] as const);
  const tolerance = {
    video_ticks: literal(tolIn.video_ticks, 0 as const, "tolerance.video_ticks"),
    card_seconds: number(tolIn.card_seconds, "tolerance.card_seconds", 0, true),
    audio_seconds: orNull(tolIn.audio_seconds, (x) => number(x, "tolerance.audio_seconds", 0, true)),
    basis: text(tolIn.basis, "tolerance.basis"),
  };
  return { ...head, raw, card, output, time_domains: timeDomains, tolerance };
}

/** A composition this service has checked, with the facts the revision records. */
interface ValidatedComposition {
  receipt: OpeningCardReceipt;
  group_root: string;
  output: RevisionFile;
  image: RevisionFile;
  probe: MediaProbe;
  video: CompositionVideoSummary;
  audio: CompositionAudioSummary | null;
  frames: number;
  frame_duration: number;
  measured_duration: number;
  audio_samples: number | null;
  tolerance: FinalCompositionRecord["tolerance"];
}

const FINAL_TIME_DOMAINS: Readonly<Record<string, string>> = {
  "final_composition.output.*, card_offset, content_offset, card.output_*, artifacts.*.placed_at, artifacts.card_image.until":
    "seconds in the served file (files.main), the opening card included",
  "render_timeline bookends.*.output_*, content_to_output_offset and output_duration; final_composition.raw_render.*":
    "seconds in the raw exact render, which has no card; add card_offset to place them in the served file",
  "render_timeline segments.content_*, words.content[], captions.words[], framing.crop_keyframes[].t; content_duration":
    "content-relative seconds, unchanged by the card; add content_offset to place them in the served file",
  "render_timeline segments.source_*, words.source[]; recipe keep_segments; source_words": "source-absolute seconds in the original file",
};

/** The served file, described against the raw receipt: card or not, every new save records one. */
function buildFinalComposition(args: {
  raw: FinalCompositionRecord["raw_render"];
  timeline: RenderTimeline;
  result: ClipResult;
  probe: MediaProbe;
  card: ThumbnailCardDescriptor | null;
  composed: ValidatedComposition | null;
}): FinalCompositionRecord {
  const { raw, timeline, result, composed } = args;
  const cardOffset = composed ? composed.measured_duration : 0;
  const contentOffset = cardOffset + timeline.content_to_output_offset;
  const sidecar = (path: string | undefined) =>
    path ? { path, time_domain: "content-relative seconds of the edited content; it holds no card", contains_card: false, placed_at: contentOffset } : null;
  const mainFile = composed ? composed.output : raw.file;
  const mainProbe = composed ? composed.probe : args.probe;
  return {
    version: FINAL_COMPOSITION_VERSION,
    raw_render: raw,
    card:
      composed && args.card
        ? {
            descriptor: args.card,
            image: composed.image,
            group_root: composed.group_root,
            placement: "opening",
            transition: "hardcut",
            overlap: 0,
            requested_duration: OPENING_CARD_DURATION,
            frames: composed.frames,
            frame_duration: composed.frame_duration,
            measured_duration: composed.measured_duration,
            audio_samples: composed.audio_samples,
            output_start: 0,
            output_end: composed.measured_duration,
            producer: composed.receipt,
          }
        : null,
    output: {
      file: mainFile,
      duration: mainProbe.duration as number,
      probe: savedProbe(mainProbe),
      video: composed ? composed.video : null,
      audio: composed ? composed.audio : null,
    },
    card_offset: cardOffset,
    content_offset: contentOffset,
    content_duration: timeline.content_duration,
    artifacts: {
      main: { path: mainFile.path, time_domain: "seconds in the served file", contains_card: !!composed, placed_at: 0 },
      raw_render: { path: raw.file.path, time_domain: "seconds in the raw exact render (render_timeline output seconds); it holds no card", contains_card: false, placed_at: cardOffset },
      caption_overlay: sidecar(result.caption_overlay_path),
      cropped_source: sidecar(result.cropped_source_path),
      card_image: composed
        ? { path: composed.image.path, sha256: composed.image.sha256, time_domain: "a still image shown from the start of the served file", contains_card: true, placed_at: 0, until: cardOffset }
        : null,
    },
    time_domains: { ...FINAL_TIME_DOMAINS },
    tolerance: composed
      ? composed.tolerance
      : { video_ticks: 0, card_seconds: null, audio_seconds: null, basis: "no card: the served file is the raw exact render, checked against its receipt and probe" },
  };
}

// ---------------------------------------------------------------------------
// The service
// ---------------------------------------------------------------------------

export class ClipRevisionService {
  private readonly history: ClipsHistory;
  private readonly render: RenderFn;
  private readonly probe: ProbeFn;
  private readonly compose: ComposeFn;
  private readonly streams: StreamProbeFn;
  private readonly exportRoot: string;
  private readonly historyRoot: string;
  private readonly hooks: ClipRevisionHooks;

  constructor(options: ClipRevisionServiceOptions = {}) {
    this.history = options.history ?? new ClipsHistory();
    this.render = options.render ?? defaultRender;
    this.probe = options.probe ?? ffprobeMedia;
    this.compose = options.compose ?? defaultCompose;
    this.streams = options.streams ?? ffprobeStreams;
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
    const card = validateCardDescriptor(request.draft.thumbnail_card);
    const draft: ClipDraft = {
      recipe,
      source_words: sourceWords,
      ...(card ? { thumbnail_card: card } : {}),
      ...(request.draft.note !== undefined ? { note: String(request.draft.note) } : {}),
    };
    await requireRecipeFiles(recipe);
    // The chosen card is persisted, never rendered here; it must still be the image the caller chose.
    if (card) await requireCardImage(card);
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
    const card = validateCardDescriptor(request.thumbnail_card);
    const expected = validateExpected(request.expected);
    const recipe = validateRecipeShape(request.recipe);
    const sourceWords = validateWords(request.source_words, "source_words");
    const metadata = validateThumbnailMetadata(request.thumbnail_metadata);
    // canonical() omits undefined keys: a request without a card or thumbnail settings
    // hashes exactly as it did before they existed, so earlier operations still replay.
    const requestHash = sha256Text(canonical({
      clip_id: clipId, expected, recipe, source_words: sourceWords, thumbnail_card: card ?? undefined, thumbnail_metadata: metadata ?? undefined,
    }));
    const namespace = this.namespaceRoot(clipId);
    const sidecars = this.sidecarRoot(clipId);
    const ctx: OperationContext = { clip_id: clipId, operation_id: operationId, namespace_root: namespace, group_root: null, card_groups: [] };

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
    if (card) await requireCardImage(card);

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

    // Render, validate, compose, probe and publish the revision document outside the lock.
    let result: ClipResult;
    let groupRoot: string;
    let doc: ClipRevisionDocument;
    let docPath: string;
    let dependencyGroups: string[];
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
      const rawFile = await fileRecord(result.output_path);
      const raw: FinalCompositionRecord["raw_render"] = {
        file: rawFile,
        group_root: groupRoot,
        output_duration: timeline.output_duration,
        content_to_output_offset: timeline.content_to_output_offset,
        probe: savedProbe(probe),
      };
      let composed: ValidatedComposition | null = null;
      if (card) {
        // The card is composed once, from this fresh validated render, into a group of
        // its own; the renderer's group and receipt stay exactly as they are.
        await this.hooks.beforeCompose?.(ctx);
        await assertOwnedDirectory(this.exportRoot, namespace, "export namespace", false);
        const groupStem = `${basename(result.output_path, extname(result.output_path))}_card-${randomUUID().slice(0, 8)}`;
        let receipt: unknown;
        try {
          receipt = await this.compose({
            raw_video_path: result.output_path,
            raw_sha256: rawFile.sha256,
            image_path: card.image_path,
            image_sha256: card.image_sha256,
            output_dir: namespace,
            group_stem: groupStem,
            placement: card.placement,
            duration: card.duration,
          });
        } finally {
          // Whatever the composer reports, a group under this call's unique stem is on
          // disk (published, or kept by a denied cleanup); remember it for residuals.
          ctx.card_groups = await groupsWithStem(namespace, groupStem);
        }
        composed = await this.validateComposition(receipt, { card, namespace, groupStem, rawGroup: groupRoot, rawFile, timeline, cardGroups: ctx.card_groups });
        await this.hooks.afterCompose?.(ctx, composed.receipt);
      }
      dependencyGroups = composed ? [groupRoot, composed.group_root] : [groupRoot];
      const finalComposition = buildFinalComposition({ raw, timeline, result, probe, card, composed });
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
          main: finalComposition.output.file,
          caption_overlay: result.caption_overlay_path ? await fileRecord(result.caption_overlay_path) : null,
          cropped_source: result.cropped_source_path ? await fileRecord(result.cropped_source_path) : null,
        },
        group_root: composed ? composed.group_root : groupRoot,
        probe: finalComposition.output.probe,
        thumbnail_card:
          composed && card
            ? { requested: true, applied: true, descriptor: card, image: composed.image, group_root: composed.group_root, note: "one opening card composed before the exact render by backend/services/opening_card.py; render_timeline describes the render without it" }
            : { requested: false, applied: false, note: "no opening card was requested; the served file is the exact render" },
        bookends: { intro: timeline.bookends.intro as SavedBookend | null, outro: timeline.bookends.outro as SavedBookend | null },
        final_composition: finalComposition,
      };
      await assertOwnedDirectory(this.historyRoot, sidecars, "revision sidecar directory", true);
      try {
        await writeFileAtomic(docPath, JSON.stringify(doc, null, 2));
      } catch (err) {
        throw new ClipRevisionError("SIDECAR_WRITE_FAILED", `could not write revision document ${docPath}: ${(err as Error).message}`, { path: docPath });
      }
    } catch (err) {
      // Groups the renderer or the composer published but this service refused stay
      // on disk unreferenced; name them all. A renderer failure published nothing,
      // and an ownership refusal wrote nothing through the linked path it names.
      const refusedPath = err instanceof ClipRevisionError && err.code !== "OWNERSHIP_ESCAPE" && typeof err.details.path === "string" ? err.details.path : null;
      const published = [...new Set([ctx.group_root, ...ctx.card_groups].filter((p): p is string => !!p))];
      const residuals = published.length ? published : refusedPath ? [refusedPath] : [];
      // A composer that published outside the namespace left that path too.
      if (published.length && refusedPath && err instanceof ClipRevisionError && err.code === "ARTIFACT_OUTSIDE_NAMESPACE" && !published.some((g) => contains(g, refusedPath))) {
        residuals.push(refusedPath);
      }
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
      const residuals = [...dependencyGroups, docPath];
      const disowned = (reason: string) => ({ ok: false as const, operation: orphanOperation(operationId, requestHash, expected, reason, residuals), state: state ? clone(state) : null });
      if (!entry || !state) return disowned("clip was deleted or is no longer tracked");
      if (state.incarnation !== expected.incarnation) return disowned(`clip record incarnation changed (expected ${expected.incarnation}, now ${state.incarnation}); this render belongs to the earlier incarnation`);
      const op = state.operations.find((o) => o.operation_id === operationId);
      if (!op) return disowned("operation record is missing");
      if (op.request_hash !== requestHash) return disowned("operation record belongs to a different request");
      if (op.state !== "pending") {
        // Cancelled or superseded meanwhile: the published group and document
        // are this operation's unreferenced residuals; record them, commit nothing.
        op.group_root = doc.group_root;
        op.residuals = residuals;
        return { ok: false as const, operation: clone(op), state: clone(state) };
      }
      const mismatch = describeMismatch(state, expected);
      if (mismatch) {
        op.state = "superseded";
        op.ended_at = nowIso();
        op.reason = mismatch;
        op.group_root = doc.group_root;
        op.residuals = residuals;
        return { ok: false as const, operation: clone(op), state: clone(state) };
      }
      const committed_at = nowIso();
      const pointer: RevisionPointer = {
        revision_id: doc.revision_id,
        version: doc.version,
        path: docPath,
        output_path: doc.files.main.path,
        group_root: doc.group_root,
        groups: dependencyGroups,
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
      op.group_root = doc.group_root;
      op.revision = clone(pointer);
      applyLegacySummary(entry, recipe, sourceWords, doc, metadata);
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

  /**
   * Store legacy thumbnail settings without rendering (1B.2b.4a), for a finishing action
   * whose recipe and card equal the current revision's. Same lock and expected state as
   * a save, and refused while an operation is pending. The projected `preview_path` and
   * `card_seconds` stay as the current revision set them. Nothing is written when the
   * stored settings already equal the request.
   */
  async updateThumbnailMetadata(rawRequest: ThumbnailMetadataRequest): Promise<ThumbnailMetadataResult> {
    const request = captureRequest(rawRequest, "thumbnail settings request");
    const clipId = validateId(request.clip_id, "clip_id");
    const expected = validateExpected(request.expected);
    const metadata = validateThumbnailMetadata(request.thumbnail_metadata) ?? invalidRecipe("thumbnail_metadata must be an object");
    return this.history.transaction((entries) => {
      const entry = this.findEntry(entries, clipId);
      const state = this.trackedState(entry);
      const pending = state.operations.find((o) => o.state === "pending");
      if (pending) {
        throw new ClipRevisionError("OPERATION_BUSY", `operation ${pending.operation_id} is still pending for clip ${clipId}; complete or invalidate it first`, { operation_id: pending.operation_id });
      }
      this.assertExpected(state, expected);
      const current = (entry.thumbnail_config ?? {}) as Record<string, unknown>;
      const next: Record<string, unknown> = { ...metadata };
      for (const key of PROJECTED_THUMBNAIL_KEYS) if (current[key] !== undefined) next[key] = current[key];
      // Compared by content: reassigning equal settings in another key order would still rewrite the file.
      const changed = canonical(next) !== canonical(current);
      if (changed) entry.thumbnail_config = next as ClipThumbnailConfig;
      return { changed, state: clone(state) };
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

  /** Recompute the recorded files' hashes, including a card revision's raw render and
   * card image; the caller decides what a mismatch means. */
  async verifyRevisionFiles(doc: ClipRevisionDocument): Promise<Array<{ path: string; ok: boolean; reason?: string }>> {
    const checks: Array<{ path: string; ok: boolean; reason?: string }> = [];
    const files = [doc.files.main, doc.files.caption_overlay, doc.files.cropped_source, doc.final_composition?.raw_render.file, doc.final_composition?.card?.image];
    const seen = new Set<string>();
    for (const file of files) {
      if (!file || seen.has(file.path)) continue;
      seen.add(file.path);
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
   * An opening card composition is accepted only when its receipt is a complete
   * version 1 receipt (parseOpeningCardReceipt: every declared field, nothing else),
   * its files are this call's, and every retained claim agrees with the captured
   * request, with this service's own probes of the raw render and the composed file,
   * or with the card timing this service derives from those probes. Files: one new
   * group directly beneath the namespace under this call's stem, not the renderer's,
   * holding only `final/` with the composed file and the card image; the image copy
   * hashes to the captured value; the raw file is the one validated and hashed
   * before composition. Media: the raw render's dimensions, sample aspect ratio and
   * time base; whole card frames at its leading frame duration nearest 1.5 s from
   * tick 0; every raw frame at its raw timestamp plus exactly the card; audio with
   * the same parameters and start, ending later by the card. Claims: container
   * durations and every video and audio summary field equal this service's probe of
   * the same file exactly, because both sides read the same ffprobe fields without
   * arithmetic; card frames, ticks, audio samples and audio presence equal what it
   * measures; frame duration, measured duration, card end and the card and audio
   * tolerances equal its own whole-tick and sample arithmetic up to floating-point
   * representation (DERIVED_SECONDS); the audio note is null exactly when the raw
   * render has audio. Tolerance basis, from frame and sample timing: video compares
   * whole ticks with no slack; the card may differ from 1.5 s by half a frame
   * because it is whole frames; the audio end may move by one 1024-sample AAC frame
   * of encoder padding plus one sample of silence flooring. Anything else is refused
   * before commit, and the revision keeps the checked copy, not the composer's object.
   */
  private async validateComposition(
    value: unknown,
    ctx: { card: ThumbnailCardDescriptor; namespace: string; groupStem: string; rawGroup: string; rawFile: RevisionFile; timeline: RenderTimeline; cardGroups: string[] },
  ): Promise<ValidatedComposition> {
    const bad = (message: string, details: Record<string, unknown> = {}): never => {
      throw new ClipRevisionError("INVALID_COMPOSITION", message, details);
    };
    const invalid = (message: string, path: string): never => {
      throw new ClipRevisionError("ARTIFACT_INVALID", message, { path });
    };
    const same = (got: unknown, want: unknown, label: string): void => {
      if (got !== want) bad(`composition ${label} is ${JSON.stringify(got)}; expected ${JSON.stringify(want)}`, { [label]: got, expected: want });
    };
    /** Seconds the composer and this service each compute from the same whole ticks or samples. */
    const derived = (got: number | null, want: number | null, label: string): void => {
      if (want === null ? got !== null : got === null || Math.abs(got - want) > DERIVED_SECONDS) {
        bad(`composition ${label} is ${JSON.stringify(got)}; derived ${JSON.stringify(want)}`, { [label]: got, expected: want });
      }
    };
    /** A stream summary claim against this service's probe of the same file, field by field. */
    const measuredAs = <T extends object>(got: T, want: T, label: string): void => {
      for (const key of Object.keys(want) as Array<keyof T>) same(got[key], want[key], `${label}.${String(key)}`);
    };

    const receipt = parseOpeningCardReceipt(value);
    const { raw: rawClaim, card: cardClaim, output: outClaim } = receipt;
    if (normalize(rawClaim.path) !== normalize(ctx.rawFile.path)) {
      bad("the composition was not made from this operation's validated render", { raw: rawClaim.path, expected: ctx.rawFile.path });
    }
    same(rawClaim.sha256, ctx.rawFile.sha256, "raw.sha256");
    same(rawClaim.file_size_bytes, ctx.rawFile.bytes, "raw.file_size_bytes");
    same(cardClaim.image_sha256, ctx.card.image_sha256, "card.image_sha256");

    // Files: one new group under this call's stem, beside the renderer's, holding only final/.
    const outputPath = outClaim.path;
    const imagePath = cardClaim.image_path;
    const finalDir = dirname(outputPath);
    const group = dirname(finalDir);
    if (!isAbsolute(outputPath) || !isAbsolute(imagePath) || basename(finalDir) !== "final" || normalize(dirname(group)) !== normalize(ctx.namespace) ||
        !basename(group).startsWith(`${ctx.groupStem}-`) || normalize(group) === normalize(ctx.rawGroup) || normalize(dirname(imagePath)) !== normalize(finalDir)) {
      throw new ClipRevisionError("ARTIFACT_OUTSIDE_NAMESPACE", `composed artifacts ${outputPath} and ${imagePath} are not in this operation's own composition group under ${ctx.namespace}`, { path: outputPath, namespace: ctx.namespace });
    }
    if (ctx.cardGroups.length !== 1 || normalize(ctx.cardGroups[0]) !== normalize(group)) {
      bad(`the composer left ${ctx.cardGroups.length} group(s) under its stem; exactly the one it published was expected`, { groups: ctx.cardGroups, published: group });
    }
    same(basename(outputPath), basename(ctx.rawFile.path), "output file name");
    same(basename(imagePath), `card-image${extname(ctx.card.image_path).toLowerCase()}`, "card image file name");
    await assertOwnedDirectory(this.exportRoot, finalDir, "composed artifact directory", false);
    if (canonical((await readdir(group)).sort()) !== canonical(["final"])) invalid(`composition group holds more than final/: ${group}`, group);
    if (canonical((await readdir(finalDir)).sort()) !== canonical([basename(outputPath), basename(imagePath)].sort())) invalid(`composition final/ holds other files: ${finalDir}`, finalDir);
    for (const p of [outputPath, imagePath]) {
      const st = await lstat(p).catch(() => null);
      if (!st || !st.isFile() || st.size === 0) invalid(`composed artifact is not a complete regular file: ${p}`, p);
    }
    const image = await fileRecord(imagePath);
    if (image.sha256 !== ctx.card.image_sha256) bad(`the composed card image hashes to ${image.sha256}, not the captured ${ctx.card.image_sha256}`, { path: imagePath });
    same(cardClaim.image_bytes, image.bytes, "card.image_bytes");
    const output = await fileRecord(outputPath);
    same(outClaim.file_size_bytes, output.bytes, "output.file_size_bytes");

    // Media: this service's own probe of both files, packet by packet.
    const rawStreams = await this.streams(ctx.rawFile.path);
    const outStreams = await this.streams(outputPath);
    const rv = rawStreams.video ?? bad("the raw render has no video stream to compose onto");
    const ov = outStreams.video ?? bad("the composed output has no video stream");
    if (rv.width !== ctx.timeline.framing.width || rv.height !== ctx.timeline.framing.height) {
      bad(`the raw render measures ${rv.width}x${rv.height}; its receipt frames ${ctx.timeline.framing.width}x${ctx.timeline.framing.height}`);
    }
    for (const key of ["width", "height", "sample_aspect_ratio", "time_base"] as const) {
      if (ov[key] !== rv[key]) bad(`the composed output's ${key} ${ov[key]} is not the raw render's ${rv[key]}`, { [key]: ov[key], raw: rv[key] });
    }
    const tb = ratio(rv.time_base, "/") ?? bad(`the raw render's time base ${rv.time_base} is unusable`);
    const frameTicks = leadingFrameTicks(rv) ?? bad("the raw render's leading frame duration could not be measured");
    const frames = cardFrameCount(frameTicks, tb);
    same(cardClaim.frame_ticks, frameTicks, "card.frame_ticks");
    same(cardClaim.frames, frames, "card.frames");
    if (rv.pts.length === 0 || ov.pts.length !== rv.pts.length + frames) {
      bad(`the composed output has ${ov.pts.length} video frames; the raw render's ${rv.pts.length} plus ${frames} card frames were expected`);
    }
    for (let i = 0; i < frames; i++) {
      if (ov.pts[i] !== i * frameTicks) bad(`card frame ${i} is at ${ov.pts[i]} ticks, not ${i * frameTicks}`);
    }
    const shift = ov.pts[frames] - rv.pts[0];
    if (shift !== frames * frameTicks) bad(`the raw render starts ${shift} ticks later in the composed output; ${frames} card frames are ${frames * frameTicks} ticks`);
    for (let i = 0; i < rv.pts.length; i++) {
      if (ov.pts[frames + i] !== rv.pts[i] + shift) bad(`raw frame ${i} is at ${ov.pts[frames + i] - shift} ticks after the card, not at its raw ${rv.pts[i]}`);
    }
    same(cardClaim.measured_ticks, shift, "card.measured_ticks");
    const frameDuration = (frameTicks * tb.num) / tb.den;
    const measured = (shift * tb.num) / tb.den;
    if (Math.abs(measured - OPENING_CARD_DURATION) > frameDuration / 2 + DERIVED_SECONDS) bad(`the card runs ${measured}s, more than half a frame from ${OPENING_CARD_DURATION}s`);
    derived(cardClaim.frame_duration, frameDuration, "card.frame_duration");
    derived(cardClaim.measured_duration, measured, "card.measured_duration");
    derived(cardClaim.output_end, measured, "card.output_end");
    const video = summarizeVideo(ov);
    const rawVideo = summarizeVideo(rv);
    measuredAs(rawClaim.video, rawVideo, "raw.video");
    measuredAs(outClaim.video, video, "output.video");
    same(rawClaim.duration, rawStreams.duration, "raw.duration");
    same(outClaim.duration, outStreams.duration, "output.duration");

    const ra = rawStreams.audio;
    const oa = outStreams.audio;
    if (!ra !== !oa) bad("the composed output's audio presence differs from the raw render's", { raw: !!ra, composed: !!oa });
    if ((rawClaim.audio === null) !== !ra || (outClaim.audio === null) !== !oa) bad("the composition's audio claims differ from the measured files");
    let audioSamples: number | null = null;
    let audioTolerance: number | null = null;
    if (ra && oa) {
      if (oa.sample_rate !== ra.sample_rate || oa.channels !== ra.channels || !(ra.sample_rate > 0)) {
        bad(`the composed audio is ${oa.sample_rate} Hz x${oa.channels}; the raw render's is ${ra.sample_rate} Hz x${ra.channels}`);
      }
      if (ra.start === null || ra.duration === null || oa.start === null || oa.duration === null) bad("the audio start or duration could not be measured");
      const rate = ra.sample_rate;
      if (Math.abs((oa.start as number) - (ra.start as number)) > 1 / rate) bad(`the audio starts at ${oa.start}s in the composed output and ${ra.start}s in the raw render`);
      audioTolerance = (AAC_FRAME_SAMPLES + 1) / rate;
      const expectedEnd = (ra.start as number) + (ra.duration as number) + measured;
      const end = (oa.start as number) + (oa.duration as number);
      if (Math.abs(end - expectedEnd) > audioTolerance) bad(`the composed audio ends at ${end}s; the raw audio moved by the ${measured}s card ends at ${expectedEnd}s (one AAC frame allowed)`);
      audioSamples = Math.floor((shift * tb.num * rate) / tb.den);
    }
    same(cardClaim.audio_samples, audioSamples, "card.audio_samples");
    if (rawClaim.audio && ra) measuredAs(rawClaim.audio, summarizeAudio(ra)!, "raw.audio");
    if (outClaim.audio && oa) measuredAs(outClaim.audio, summarizeAudio(oa)!, "output.audio");
    if (ra && cardClaim.audio_note !== null) bad(`composition card.audio_note is ${JSON.stringify(cardClaim.audio_note)}; expected null when the raw render has audio`);
    if (!ra && cardClaim.audio_note === null) bad("composition card.audio_note is null; a raw render without audio needs its silent-card note");
    derived(receipt.tolerance.card_seconds, frameDuration / 2, "tolerance.card_seconds");
    derived(receipt.tolerance.audio_seconds, audioTolerance, "tolerance.audio_seconds");
    const probe = await this.probe(outputPath);
    if (!probe.has_video || probe.bytes !== output.bytes || probe.duration === null) invalid(`composed output does not probe as a complete video of its size: ${outputPath}`, outputPath);
    if (probe.has_audio !== !!oa || probe.duration !== outStreams.duration) {
      bad("the composed output's container and stream probes disagree about audio or duration", { container: [probe.has_audio, probe.duration], streams: [!!oa, outStreams.duration] });
    }
    return {
      receipt,
      group_root: group,
      output,
      image,
      probe,
      video,
      audio: summarizeAudio(oa),
      frames,
      frame_duration: frameDuration,
      measured_duration: measured,
      audio_samples: audioSamples,
      tolerance: {
        video_ticks: 0,
        card_seconds: frameDuration / 2,
        audio_seconds: audioTolerance,
        basis: `frames compared in whole ticks of ${rv.time_base}; ${frames} card frames of ${frameTicks} ticks may differ from ${OPENING_CARD_DURATION}s by half a frame; ${audioTolerance === null ? "no audio" : `audio end within one ${AAC_FRAME_SAMPLES}-sample AAC frame plus one sample`}`,
      },
    };
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

/**
 * The inputs a follow-up save of a committed revision reuses (1B.2b.4a): its recipe and
 * retained source words, validated as a new request's would be, and its applied opening
 * card as a descriptor of the committed owned copy with its recorded SHA-256, so the
 * original upload need not survive (null without a card). Throws INVALID_RECIPE or
 * INVALID_THUMBNAIL_CARD for a document that cannot be built on. No filesystem access.
 */
export function revisionInputs(doc: ClipRevisionDocument): { recipe: ExactRenderRecipe; source_words: WordTimestamp[] | null; thumbnail_card: ThumbnailCardDescriptor | null } {
  const saved = doc && typeof doc === "object" ? doc : invalidRecipe("revision document must be an object");
  const recipe = validateRecipeShape(clone(saved.recipe));
  const words = saved.source_words;
  const sourceWords = validateWords(words === undefined || words === null ? words : clone(words), "source_words");
  const card = saved.thumbnail_card as Partial<Extract<SavedThumbnailCard, { applied: true }>> | undefined;
  if (!card || card.applied !== true) return { recipe, source_words: sourceWords, thumbnail_card: null };
  const image = card.image;
  const descriptor = validateCardDescriptor({
    image_path: image?.path, image_sha256: image?.sha256, placement: "opening", duration: OPENING_CARD_DURATION,
  }) ?? invalidCard("the revision's applied card has no owned image");
  return { recipe, source_words: sourceWords, thumbnail_card: descriptor };
}

/** Whether two recipes request the same render: equal by content, key order aside. */
export function sameRecipe(a: ExactRenderRecipe, b: ExactRenderRecipe): boolean {
  return canonical(a) === canonical(b);
}

/**
 * Legacy summary fields describe the current revision's served file for existing
 * readers. No stale legacy media pointer survives (1B.2b.4a): the pre-logo backup of an
 * older file is dropped, and the thumbnail preview is the committed card image's owned
 * copy, removed without a card. Supplied thumbnail settings replace the other
 * `thumbnail_config` keys; `card_seconds` keeps its rule.
 */
function applyLegacySummary(entry: ClipHistoryEntry, recipe: ExactRenderRecipe, sourceWords: WordTimestamp[] | null, doc: ClipRevisionDocument, metadata: Record<string, unknown> | null): void {
  const final = doc.final_composition as FinalCompositionRecord;
  entry.output_path = doc.files.main.path;
  // The served file's probed length and size; the edited content length stays in the document.
  entry.duration = Math.round(final.output.duration * 100) / 100;
  entry.file_size_mb = Math.round((doc.files.main.bytes / (1024 * 1024)) * 100) / 100;
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
  else entry.transcript_slice = doc.render_timeline.words.content_text;
  delete entry.logo_backup_path;
  const current = entry.thumbnail_config;
  const config: ClipThumbnailConfig | undefined = metadata ? { ...metadata } : current ? { ...current } : undefined;
  // Legacy readers use card_seconds as the card baked into the served file: it must describe this one.
  if (final.card) {
    entry.thumbnail_config = { ...(config ?? {}), preview_path: final.card.image.path, card_seconds: final.card.measured_duration };
  } else if (config) {
    delete config.preview_path;
    if (current?.card_seconds !== undefined) config.card_seconds = current.card_seconds ? 0 : current.card_seconds;
    entry.thumbnail_config = config;
  }
}
