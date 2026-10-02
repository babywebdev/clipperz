// === Writing Studio editor-context read contract (slice 1B.2b.2 repair-3) ===
//
// One pure boundary between the bytes a saved clip stores and the claims
// `src/services/clip-editor-context.ts` publishes about them. It performs no
// I/O: the service reads the clip list, the documents and the sidecars, hands
// the parsed values here, and projects only what comes back validated.
//
// Why it exists. Repair-1 and repair-2 validated each stored object on its own
// and let the response builders quote them side by side. Individually valid
// records can still contradict each other: a card that ends after the file it
// sits in, a hard cut that overlaps half a minute, an artifact that says it is
// measured in source seconds, a document that reports no card beside a
// composition that applied one. Each of those became an authoritative field of
// the response. So this module validates the *aggregate* — pointer, document,
// recipe, raw receipt, final composition, producer receipt, card, artifacts and
// the clip entry's own output summary — before anything is projected.
//
// What it is not:
//
//  * Not the save-time validator. It is a read schema for documents that were
//    already admitted. Structures later saves added (`final_composition`,
//    bookend `join_inputs`, pointer `groups`) stay optional; an accepted older
//    document is read exactly as saved, its absence is a diagnostic, and
//    nothing is rewritten or upgraded.
//  * Not proof of bytes. Every comparison below is between values the writer
//    itself recorded. No file is hashed, opened or probed here, and a document
//    whose numbers agree with each other but not with the media on disk is
//    still served. `integrity_verified` stays false throughout the response.
//  * Not a runtime edge to the save service. The constants and the two pieces
//    of renderer arithmetic below are duplicated deliberately, exactly as
//    repair-2 duplicated the schema and rounding constants, so this read path
//    imports only erased types from the revision service's models.
//
// Every relationship cites the accepted producer that establishes it, and the
// tolerance each one uses is the tolerance that producer recorded — the raw
// receipt's own `tolerance` for the render, the composition's own
// `card_seconds` and `audio_seconds` for the card, never one large allowance
// applied to every comparison.
//
// Repair-4 (lead-22) derives rather than inspects. The editorial transcript is
// re-projected from the retained source words and the recipe's ordered
// intervals exactly as `exact_render` projected it; a document with no final
// composition has its raw probe and receipt bytes bound to the file it serves,
// as the save's admission did; the two stored copies of each bookend must be
// one join, whose transition and final measured output follow from it. The
// served container is judged from the resolved file the service reports,
// because that is what the by-id routes check.

import { resolve } from "path";
import { EditorContextError } from "../models/clip-editor-context.js";
import type { RenderTimeline } from "../models/index.js";
import type {
  ClipRevisionDocument,
  ClipRevisionState,
  DraftPointer,
  ExactRenderRecipe,
  OperationRecord,
  OperationState,
  RevisionPointer,
} from "../models/clip-revisions.js";

// ---------------------------------------------------------------------------
// Predicates shared with the service's own projections
// ---------------------------------------------------------------------------

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export function isCount(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** A finite number that cannot be negative: a length, an offset or a position. */
const isNonNegative = (v: unknown): v is number => isFiniteNumber(v) && v >= 0;

/** A finite number that must be greater than zero: a duration of real media. */
const isPositive = (v: unknown): v is number => isFiniteNumber(v) && v > 0;

const isBool = (v: unknown): v is boolean => typeof v === "boolean";

/** A whole number above zero: a frame count or a tick length. */
const isWholePositive = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;

/** An optional field: absent is fine, present must be valid. */
const optional = (v: unknown, ok: (x: unknown) => boolean): boolean => v === undefined || ok(v);

/** An optional nullable field: absent or explicitly null is fine. */
const optionalOrNull = (v: unknown, ok: (x: unknown) => boolean): boolean => v === undefined || v === null || ok(v);

const near = (a: number, b: number, tolerance: number): boolean => Math.abs(a - b) <= tolerance;

/** Compact, length-capped rendering of an app-owned value for a message. */
export function describeValue(value: unknown): string {
  if (value === undefined) return "absent";
  if (value === null) return "null";
  if (typeof value === "string") return value.length > 120 ? `${value.slice(0, 117)}...` : value;
  const text = JSON.stringify(value) ?? String(value);
  return text.length > 300 ? `${text.slice(0, 297)}...` : text;
}

/**
 * One word record this reader is willing to serve. Elements are validated, not
 * filtered: a list holding an unusable record is malformed input, never a
 * shorter usable transcript. Order and overlap are left exactly as stored —
 * words may legitimately overlap or follow reordered segments — so nothing here
 * sorts, clamps or normalises them.
 */
export function validWord(v: unknown): boolean {
  if (!isPlainObject(v)) return false;
  if (typeof v.word !== "string") return false;
  if (!isFiniteNumber(v.start) || !isFiniteNumber(v.end)) return false;
  if (v.start < 0 || v.end < v.start) return false;
  if (v.speaker !== undefined && v.speaker !== null && typeof v.speaker !== "string") return false;
  if (v.confidence !== undefined && v.confidence !== null && !isFiniteNumber(v.confidence)) return false;
  return true;
}

/** Position of the first unusable word, or -1 when every element is usable. */
export function firstInvalidWord(words: readonly unknown[]): number {
  return words.findIndex((w) => !validWord(w));
}

// ---------------------------------------------------------------------------
// The producer's word projection, duplicated so this read path keeps no
// runtime edge (`backend/services/exact_render.py`, as the save service
// re-derives it at admission)
// ---------------------------------------------------------------------------

interface SourceWord { word: string; start: number; end: number }
interface Interval { start: number; end: number }

/** Python's str.strip() whitespace, which `content_text` applies to each word. */
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

/** `exact_render.content_text`: each word stripped, empty ones dropped, joined by one space. */
function contentText(words: readonly SourceWord[]): string {
  return words.map((w) => pyStrip(w.word)).filter(Boolean).join(" ");
}

/** Key-sorted JSON, ignoring undefined members: the save service's comparison form. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).filter((k) => record[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(record[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** A word apart from its timing: its text and every metadata field, exactly. */
function wordIdentity(word: object): string {
  return canonical({ ...word, start: undefined, end: undefined });
}

/** `exact_render.words_in_intervals`: supplied words touching any kept interval,
 * unmodified, in supplied order, each once. A word that only touches a boundary
 * touches nothing. */
function wordsInIntervals(words: readonly SourceWord[], intervals: readonly Interval[]): SourceWord[] {
  return words.filter((w) => intervals.some((s) => w.end > s.start && w.start < s.end));
}

/** `exact_render.map_words_to_content` before its three-decimal rounding: per
 * interval in supplied order, every word touching it clipped to the interval and
 * shifted into content seconds. A word two intervals share appears twice. */
function mapWordsToContent(words: readonly SourceWord[], intervals: readonly Interval[]): Array<{ word: SourceWord; start: number; end: number }> {
  const mapped: Array<{ word: SourceWord; start: number; end: number }> = [];
  let cursor = 0;
  for (const seg of intervals) {
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

// ---------------------------------------------------------------------------
// Producer constants, duplicated so this read path keeps no runtime edge
// ---------------------------------------------------------------------------

const CLIP_REVISIONS_SCHEMA = 1;

const OPERATION_STATES: readonly OperationState[] = ["pending", "committed", "failed", "cancelled", "superseded"];

/** The renderer's own rounding allowance, as the save service applies it. */
const RECEIPT_ROUNDING = 0.002;

/** Written by the composer since 1B.2b.1. */
const FINAL_COMPOSITION_VERSION = 1;

/** The save service's floor on the composition tolerance it accepts a rendered
 * duration within, when it compares its probe with the receipt. */
const PROBE_DURATION_FLOOR = 0.05;

/** Seconds by which the composer's and the save service's arithmetic on the
 * same whole ticks or samples may differ in floating-point representation. */
const DERIVED_SECONDS = 1e-9;

/** AAC codes whole 1024-sample frames; an encode may pad its end by up to one. */
const AAC_FRAME_SAMPLES = 1024;

/** The composition branches `video_processor.concat_outro` can report and the
 * save service accepts. A branch outside this set never produced a saved
 * bookend, so it cannot describe one. */
const SUPPORTED_BOOKEND_BRANCHES: ReadonlySet<string> = new Set(["xfade_acrossfade", "hardcut_soft_audio", "hardcut"]);

/** The branches that cut the video: they overlap nothing. */
const HARD_CUT_BRANCHES: ReadonlySet<string> = new Set(["hardcut_soft_audio", "hardcut"]);

/** concat_outro's crossfade floor: its least overlap, the margin it keeps
 * inside each input and its least crossfade offset. */
const MIN_CROSSFADE = 0.05;

/** `video_processor.concat_outro` for a numeric fade request: the fade clamped
 * inside each input it joined, and whether it crossfades at all. The same IEEE
 * arithmetic as the renderer and the save service. */
function concatJoin(fade: number, main: number, appended: number): { overlap: number; crossfades: boolean } {
  let overlap = fade > 0 ? fade : 0;
  overlap = Math.min(overlap, Math.max(MIN_CROSSFADE, main - MIN_CROSSFADE));
  if (appended > 0) overlap = Math.min(overlap, Math.max(MIN_CROSSFADE, appended - MIN_CROSSFADE));
  return { overlap, crossfades: Math.max(0, main - overlap) >= MIN_CROSSFADE && overlap >= MIN_CROSSFADE };
}

/** Whole frames nearest the requested card length at `ticks` of time base
 * num/den, ties rounding up: the composer's own frame count. */
function cardFrameCount(ticks: number, tb: { num: number; den: number }, requested: number): number {
  return Math.max(1, Math.floor((2 * requested * tb.den + ticks * tb.num) / (2 * ticks * tb.num)));
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** "num/den" of positive integers, reduced; null otherwise. */
function ratio(value: unknown): { num: number; den: number } | null {
  if (typeof value !== "string") return null;
  const parts = value.split("/");
  if (parts.length !== 2 || !parts.every((p) => /^\d+$/.test(p))) return null;
  const [num, den] = parts.map(Number);
  if (!(num > 0 && den > 0)) return null;
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

/** `clip_generator._exact_render_timeline`'s time_domains, verbatim: the only
 * map an exact v1 receipt declares, and the meaning this response quotes. */
const EXACT_V1_TIME_DOMAINS: Readonly<Record<string, string>> = {
  "segments.source_*": "source-absolute seconds in the original file",
  "segments.content_*, words.content[], captions.words[], framing.crop_keyframes[].t":
    "content-relative seconds: kept intervals concatenated in supplied order from 0",
  "bookends.*.output_*, content_to_output_offset, output_duration":
    "output seconds in the rendered file, bookends included",
};

/** `backend/services/opening_card.py`'s v1 TIME_DOMAINS, verbatim. */
const OPENING_CARD_TIME_DOMAINS: Readonly<Record<string, string>> = {
  "output.*, card.output_start, card.output_end": "seconds in the composed file, the opening card included",
  "raw.*": "seconds in the raw exact render, which has no card; add card.measured_duration to place them in the composed file",
  "*.first_pts, card.frame_ticks, card.measured_ticks": "ticks of the video time base the raw render and the composed file share",
};

/** The save service's own `FINAL_TIME_DOMAINS`, verbatim. */
const FINAL_TIME_DOMAINS: Readonly<Record<string, string>> = {
  "final_composition.output.*, card_offset, content_offset, card.output_*, artifacts.*.placed_at, artifacts.card_image.until":
    "seconds in the served file (files.main), the opening card included",
  "render_timeline bookends.*.output_*, content_to_output_offset and output_duration; final_composition.raw_render.*":
    "seconds in the raw exact render, which has no card; add card_offset to place them in the served file",
  "render_timeline segments.content_*, words.content[], captions.words[], framing.crop_keyframes[].t; content_duration":
    "content-relative seconds, unchanged by the card; add content_offset to place them in the served file",
  "render_timeline segments.source_*, words.source[]; recipe keep_segments; source_words": "source-absolute seconds in the original file",
};

/** The domain each artifact placement declares, as `buildFinalComposition`
 * writes it. The response serves these strings as the meaning of the numbers
 * beside them, so a placement that relabels itself is refused. */
const ARTIFACT_DOMAINS = {
  main: "seconds in the served file",
  raw_render: "seconds in the raw exact render (render_timeline output seconds); it holds no card",
  sidecar: "content-relative seconds of the edited content; it holds no card",
  card_image: "a still image shown from the start of the served file",
} as const;

/** Media containers `serveClipById` will stream or download by clip id. Any
 * other extension answers 400 there, so this response cannot advertise it. */
const SERVABLE_MEDIA = /\.(mp4|mov|mkv|webm)$/i;

// ---------------------------------------------------------------------------
// Comparison helpers
// ---------------------------------------------------------------------------

interface ReceiptTolerance { content_seconds: number; composition_seconds: number; av_sync_seconds: number }

/** The renderer's own stated allowances. Every exact v1 receipt the accepted
 * producer wrote carries them (`clip_generator._exact_render_timeline`), and
 * the save service refused a receipt without them, so they are required here
 * rather than optional: an absent tolerance is a document this reader cannot
 * check, not a document written before the rule. */
function readTolerance(value: unknown): ReceiptTolerance | null {
  if (!isPlainObject(value)) return null;
  const { content_seconds, composition_seconds, av_sync_seconds } = value;
  if (!isNonNegative(content_seconds) || !isNonNegative(composition_seconds) || !isNonNegative(av_sync_seconds)) return null;
  return { content_seconds, composition_seconds, av_sync_seconds };
}

interface StoredFile { path: string; bytes: number; sha256: string }

function validFile(value: unknown): value is StoredFile {
  return isPlainObject(value) && isNonEmptyString(value.path) && isCount(value.bytes) && isNonEmptyString(value.sha256);
}

/** Two file records for the same file, compared lexically and by the size and
 * hash already stored. No bytes are read and nothing is hashed: this is
 * identity consistency, not integrity. */
function sameFile(a: StoredFile, b: StoredFile): boolean {
  return samePath(a.path, b.path) && a.bytes === b.bytes && a.sha256 === b.sha256;
}

/** The same lexical path comparison the reader's ownership checks and the save
 * service use: resolved, and case-insensitive on Windows. No link is followed
 * and no file is opened. */
function samePath(a: string, b: string): boolean {
  return canonicalPath(a) === canonicalPath(b);
}

const canonicalPath = (p: string): string => (process.platform === "win32" ? resolve(p).toLowerCase() : resolve(p));

/** A producer's own time-domain map, compared with the map that producer
 * declares. The response quotes these strings as the meaning of its numbers. */
function sameMap(value: unknown, expected: Readonly<Record<string, string>>): boolean {
  if (!isPlainObject(value)) return false;
  const want = Object.keys(expected);
  if (Object.keys(value).length !== want.length) return false;
  return want.every((key) => value[key] === expected[key]);
}

// ---------------------------------------------------------------------------
// Tracked state
// ---------------------------------------------------------------------------

function stateInvalid(detail: string): never {
  throw new EditorContextError("REVISION_STATE_INVALID", 500, `The clip's revision state is not usable: ${detail}.`, { detail });
}

/**
 * Pointer rules are provenance-aware, because the two kinds are different
 * facts: "exact" is a rendered revision that always names its immutable
 * document, its dependency group and the operation that committed it, and
 * "legacy-unversioned" is the untouched version zero, which by design has none
 * of those. A pointer mixing the two is corrupt state, not a licence to answer
 * this clip from the legacy sidecars sitting beside it.
 */
function validPointer(value: unknown): value is RevisionPointer {
  if (!isPlainObject(value)) return false;
  if (!isNonEmptyString(value.revision_id) || !isCount(value.version)) return false;
  if (!isNonEmptyString(value.output_path) || !isNonEmptyString(value.committed_at)) return false;
  if (value.provenance === "exact") {
    // `groups` arrived with 1B.2b.1; pointers committed before it have only
    // `group_root`, so its absence stays valid.
    if (value.groups !== undefined && !(Array.isArray(value.groups) && value.groups.length > 0 && value.groups.every(isNonEmptyString))) return false;
    return value.version >= 1
      && isNonEmptyString(value.path)
      && isNonEmptyString(value.group_root)
      && isNonEmptyString(value.operation_id);
  }
  if (value.provenance === "legacy-unversioned") {
    return value.version === 0
      && value.path === null
      && value.group_root === null
      && value.operation_id === null
      && value.groups === undefined;
  }
  return false;
}

function validDraftPointer(value: unknown): value is DraftPointer {
  return isPlainObject(value) && isCount(value.version) && isNonEmptyString(value.path) && isNonEmptyString(value.saved_at);
}

function validOperation(value: unknown): value is OperationRecord {
  if (!isPlainObject(value)) return false;
  if (!isNonEmptyString(value.operation_id) || !isNonEmptyString(value.started_at)) return false;
  if (!OPERATION_STATES.includes(value.state as OperationState)) return false;
  return value.ended_at === null || isNonEmptyString(value.ended_at);
}

/** The revision block is written by this app and read by the Python history
 * writer as an opaque field. A shape it cannot describe is corruption, not a
 * reason to fall back to legacy data. */
export function validateRevisionState(raw: unknown): ClipRevisionState {
  if (!isPlainObject(raw)) stateInvalid("it is not an object");
  if (raw.schema !== CLIP_REVISIONS_SCHEMA) stateInvalid(`schema ${describeValue(raw.schema)} is not supported`);
  if (!isNonEmptyString(raw.incarnation)) stateInvalid("the record incarnation is missing");
  if (!isCount(raw.draft_version) || !isCount(raw.revision_version)) stateInvalid("the version counters are not whole numbers");
  if (raw.draft !== null && !validDraftPointer(raw.draft)) stateInvalid("the draft pointer is malformed");
  if (raw.current !== null && !validPointer(raw.current)) stateInvalid("the current revision pointer is malformed");
  if (raw.previous !== null && !validPointer(raw.previous)) stateInvalid("the previous revision pointer is malformed");
  if (!Array.isArray(raw.operations) || !raw.operations.every(validOperation)) stateInvalid("the operation records are malformed");
  const state = raw as unknown as ClipRevisionState;
  // A pointer and the counter naming its version are published together, so a
  // disagreement would let this response report one version and serve another.
  if (state.draft && state.draft.version !== state.draft_version) {
    stateInvalid("the draft pointer and the draft counter disagree");
  }
  if (state.current && state.current.version !== state.revision_version) {
    stateInvalid("the current revision pointer and the revision counter disagree");
  }
  // The counters are published with their pointers and nothing clears either
  // one. `ensureTracked` is the only writer of a null `current`, and it does so
  // only for an entry with no rendered output, with `revision_version` zero; a
  // commit publishes the pointer and its positive counter in one transaction.
  // `saveDraft` is the only writer of `draft` and writes `draft_version` in the
  // same transaction. So a positive counter beside an absent pointer is a
  // record this reader cannot describe.
  if (!state.current && state.revision_version > 0) {
    stateInvalid(`it counts ${state.revision_version} committed revision(s) but no current revision pointer names one`);
  }
  if (!state.draft && state.draft_version > 0) {
    stateInvalid(`it counts ${state.draft_version} saved draft(s) but no draft pointer names one`);
  }
  return state;
}

// ---------------------------------------------------------------------------
// The immutable revision document
// ---------------------------------------------------------------------------

function documentInvalid(code: "REVISION_DOCUMENT_INVALID" | "DRAFT_DOCUMENT_INVALID", detail: string): never {
  const what = code === "REVISION_DOCUMENT_INVALID" ? "revision" : "draft";
  throw new EditorContextError(code, 500, `The clip's saved ${what} document is not usable: ${detail}.`, { detail });
}

/** Every recipe field this response reports. A present but wrong-typed optional
 * field is refused rather than coerced to null, because the response shows each
 * of them as a recorded choice. */
function validRecipe(value: unknown): value is ExactRenderRecipe {
  if (!isPlainObject(value)) return false;
  if (!isNonEmptyString(value.source_video) || typeof value.title !== "string") return false;
  if (!isNonEmptyString(value.caption_style) || !isNonEmptyString(value.crop_strategy)) return false;
  if (value.format !== "vertical" && value.format !== "horizontal" && value.format !== "square") return false;
  if (!Array.isArray(value.keep_segments) || value.keep_segments.length === 0) return false;
  // Order is the renderer's output order and is preserved, not sorted.
  if (!value.keep_segments.every((s) => isPlainObject(s) && isFiniteNumber(s.start) && isFiniteNumber(s.end) && s.start >= 0 && s.start < s.end)) return false;
  if (!optional(value.caption_position, isNonEmptyString)) return false;
  // The recipe contract bounds a scale only to a finite number, so no bound is
  // invented for it here.
  if (!optional(value.caption_font_scale, isFiniteNumber)) return false;
  if (!optional(value.clean_fillers, isBool)) return false;
  // Crop keyframes are content-relative positions with a percentage across the
  // frame: `t` cannot precede the content and `x_pct` cannot leave the frame.
  // A rendered revision additionally bounds `t` by its own content duration,
  // which is checked where that duration is in hand.
  if (!optionalOrNull(value.crop_keyframes, (k) => Array.isArray(k) && k.every((p) => isPlainObject(p) && isNonNegative(p.t) && isFiniteNumber(p.x_pct) && p.x_pct >= 0 && p.x_pct <= 100))) return false;
  if (!optionalOrNull(value.foreground_framing, isPlainObject)) return false;
  for (const key of ["logo_path", "intro_path", "outro_path"] as const) {
    if (!optionalOrNull(value[key], isNonEmptyString)) return false;
  }
  if (!optional(value.logo_position, isNonEmptyString)) return false;
  if (!optionalOrNull(value.bookend_fade, isNonNegative)) return false;
  if (!optional(value.keep_caption_overlay, isBool)) return false;
  if (!optional(value.allow_ass_fallback, isBool)) return false;
  return true;
}

/**
 * The cuts this response publishes as the ones the renderer actually made.
 * Each interval must be real, its duration must match it, and the content
 * chain must still concatenate from zero, because the response serves the
 * segments and the raw content durations together. Supplied order is kept
 * exactly as stored: kept intervals may legitimately run out of source order.
 *
 * Returns the content second the last segment ends at, or null when the list
 * cannot support an effective-cuts claim.
 */
function checkSegments(value: unknown): number | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  let cursor = 0;
  for (let i = 0; i < value.length; i++) {
    const s = value[i];
    if (!isPlainObject(s) || s.index !== i) return null;
    const { source_start, source_end, content_start, content_end, duration } = s;
    if (![source_start, source_end, content_start, content_end, duration].every(isFiniteNumber)) return null;
    if ((source_start as number) < 0 || (source_end as number) <= (source_start as number)) return null;
    if (!near(duration as number, (source_end as number) - (source_start as number), RECEIPT_ROUNDING)) return null;
    if (!near(content_start as number, cursor, RECEIPT_ROUNDING)) return null;
    if (!near(content_end as number, (content_start as number) + (duration as number), RECEIPT_ROUNDING)) return null;
    cursor = content_end as number;
  }
  return cursor;
}

/** The timeline fields this response consumes, with the ranges the renderer's
 * own contract gives them. Cross-record relationships live in the aggregate
 * below, where the bookends, the recipe and the composition are all in hand. */
function validTimeline(value: unknown): value is RenderTimeline {
  if (!isPlainObject(value)) return false;
  if (value.version !== 1 || value.timing_mode !== "exact") return false;
  // The map is quoted verbatim as the meaning of every timing number in the
  // response, so it must be the producer's map rather than any set of strings.
  if (!sameMap(value.time_domains, EXACT_V1_TIME_DOMAINS)) return false;
  if (!isPlainObject(value.words) || !isPlainObject(value.output)) return false;
  if (!isPlainObject(value.framing) || !isPlainObject(value.bookends)) return false;
  // Lengths and offsets in seconds. A finite number is not enough: this
  // response publishes these as the timing of a file that was really rendered,
  // so none of them can run backwards and the rendered file has real length.
  if (!isNonNegative(value.content_duration) || !isNonNegative(value.content_duration_measured)) return false;
  if (!isNonNegative(value.content_to_output_offset) || !isPositive(value.output_duration)) return false;
  const contentDuration = value.content_duration;
  const tolerance = readTolerance(value.tolerance);
  if (!tolerance) return false;
  // Measured content is the same content, probed: the renderer states the
  // allowance itself, and the save refused a receipt outside it.
  if (!near(value.content_duration_measured, contentDuration, tolerance.content_seconds)) return false;
  const contentEnd = checkSegments(value.segments);
  if (contentEnd === null || !near(contentEnd, contentDuration, RECEIPT_ROUNDING)) return false;
  const words = value.words as Record<string, unknown>;
  if (words.input !== "supplied" && words.input !== "unavailable") return false;
  if (typeof words.content_text !== "string") return false;
  if (!Array.isArray(words.content)) return false;
  for (const w of words.content) {
    if (!validWord(w)) return false;
    // Editorial words are content-relative, so none can end after the content
    // it was cut from. Order and overlap are left exactly as stored.
    if ((w as { end: number }).end > contentDuration + RECEIPT_ROUNDING) return false;
  }
  // "Unavailable" means no transcript was supplied at save. A receipt that
  // says so while still carrying editorial words or their text describes two
  // different saves. A transcript saved empty is a separate, valid state:
  // `supplied` with an empty content list.
  if (words.input === "unavailable" && (words.content.length > 0 || words.content_text !== "")) return false;
  if (!optionalOrNull(value.frame_precision, (f) => isPlainObject(f) && isBool(f.source_variable_frame_rate) && typeof f.note === "string")) return false;
  return true;
}

/**
 * A saved bookend's own shape: an interval of the rendered file, the asset that
 * fills it and the overlap the join really used. `join_inputs` arrived with
 * 1B.2a repair-3; absent is an honest diagnostic, present must be valid. The
 * interval equations and the branch's relationship to its inputs are checked in
 * the aggregate, where the receipt's offsets and tolerance are in hand.
 */
function validBookendShape(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (!isPlainObject(value)) return false;
  if (!isNonNegative(value.output_start) || !isFiniteNumber(value.output_end)) return false;
  if (value.output_end < value.output_start) return false;
  if (!isNonNegative(value.asset_duration) || !isNonNegative(value.applied_overlap)) return false;
  if (!isNonEmptyString(value.branch) || !SUPPORTED_BOOKEND_BRANCHES.has(value.branch)) return false;
  if (!optionalOrNull(value.requested_fade, isNonNegative)) return false;
  if (!optionalOrNull(value.measured_output_duration, isNonNegative)) return false;
  // `bookend_region` has always written the join's transition interval, and
  // the save has always required it.
  const t = value.transition;
  if (!isPlainObject(t) || !isNonNegative(t.output_start) || !isFiniteNumber(t.output_end) || t.output_end < t.output_start) return false;
  return optional(value.join_inputs, (j) => isPlainObject(j) && isNonNegative(j.main_duration) && isNonNegative(j.appended_duration));
}

interface SavedBookendShape {
  output_start: number;
  output_end: number;
  asset_duration: number;
  applied_overlap: number;
  branch: string;
  transition: { output_start: number; output_end: number };
  requested_fade?: number | null;
  measured_output_duration?: number | null;
  join_inputs?: { main_duration: number; appended_duration: number };
}

/** The producer fields of one join that both stored copies carry. */
const BOOKEND_FIELDS = ["kind", "output_start", "output_end", "asset_duration", "requested_fade", "applied_overlap", "branch", "measured_output_duration"] as const;

/** The document's and the receipt's copies of one join, compared on the fields
 * `bookend_region` writes. Presence counts: a field one copy records and the
 * other lacks is a disagreement. Anything else either copy carries is ignored. */
function sameBookend(saved: Record<string, unknown>, stored: unknown): boolean {
  if (!isPlainObject(stored)) return false;
  if (!BOOKEND_FIELDS.every((key) => saved[key] === stored[key])) return false;
  const pairOf = (a: unknown, b: unknown, keys: readonly string[]): boolean => {
    if (!isPlainObject(a) || !isPlainObject(b)) return a === b;
    return keys.every((key) => a[key] === b[key]);
  };
  return pairOf(saved.transition, stored.transition, ["output_start", "output_end"])
    && pairOf(saved.join_inputs, stored.join_inputs, ["main_duration", "appended_duration"]);
}

/** Truthful card provenance, exactly as the two saved shapes allow: absent, or
 * applied with the composed image's identity. An "applied" card that names no
 * image is corrupt provenance, not a card to project. */
function validSavedCard(value: unknown): boolean {
  if (!isPlainObject(value) || !isBool(value.applied) || typeof value.note !== "string") return false;
  if (!value.applied) return value.requested === false;
  if (value.requested !== true || !validFile(value.image) || !isNonEmptyString(value.group_root)) return false;
  const d = value.descriptor;
  // The chosen card runs for a real length; the save service pins that length
  // to its one supported card duration, which is not re-pinned here so a later
  // supported duration is not refused retroactively.
  return isPlainObject(d) && isNonEmptyString(d.image_path) && isNonEmptyString(d.image_sha256) && d.placement === "opening" && isPositive(d.duration);
}

/** The probe recorded at save. A duration of zero or less is not a length this
 * response can report for a file that was probed as complete media. */
function validProbe(value: unknown): boolean {
  return isPlainObject(value)
    && (value.duration === null || isPositive(value.duration))
    && isCount(value.bytes)
    && isBool(value.has_video)
    && isBool(value.has_audio);
}

interface SavedProbeShape { duration: number | null; bytes: number; has_video: boolean; has_audio: boolean }

/** One stream summary as `opening_card.py` measures it and the save service
 * compared with its own probe, field by field. */
function validVideoSummary(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  if (!isWholePositive(value.width) || !isWholePositive(value.height)) return false;
  if (!isNonEmptyString(value.sample_aspect_ratio) || ratio(value.time_base) === null) return false;
  if (value.frame_rate !== null && !isNonEmptyString(value.frame_rate)) return false;
  if (!isCount(value.packets) || !Number.isInteger(value.first_pts as number)) return false;
  if (value.start !== null && !isFiniteNumber(value.start)) return false;
  return value.duration === null || isFiniteNumber(value.duration);
}

function validAudioSummary(value: unknown): boolean {
  if (value === null) return true;
  if (!isPlainObject(value)) return false;
  if (!isWholePositive(value.sample_rate) || !isWholePositive(value.channels)) return false;
  if (value.channel_layout !== null && !isNonEmptyString(value.channel_layout)) return false;
  if (value.start !== null && !isFiniteNumber(value.start)) return false;
  return value.duration === null || isFiniteNumber(value.duration);
}

interface VideoSummaryShape {
  width: number; height: number; sample_aspect_ratio: string; time_base: string;
  frame_rate: string | null; packets: number; first_pts: number; start: number | null; duration: number | null;
}
interface AudioSummaryShape {
  sample_rate: number; channels: number; channel_layout: string | null; start: number | null; duration: number | null;
}

/** Where an artifact's own second zero plays in the served file, and whether it
 * holds the card. The domain string is the meaning the response publishes for
 * that number, so it is compared with the domain its producer writes. */
function validPlacementShape(value: unknown, withCardImage: boolean): boolean {
  if (!isPlainObject(value)) return false;
  if (!isNonEmptyString(value.path) || !isNonEmptyString(value.time_domain)) return false;
  if (!isBool(value.contains_card) || !isNonNegative(value.placed_at)) return false;
  if (!withCardImage) return true;
  return isNonEmptyString(value.sha256) && isFiniteNumber(value.until) && (value.until as number) >= value.placed_at;
}

interface PlacementShape { path: string; time_domain: string; contains_card: boolean; placed_at: number; sha256?: string; until?: number }

/**
 * The aggregate. Everything the response publishes about one saved revision is
 * checked here together, because the contradictions that survived repair-2 all
 * lived between two individually valid records.
 */
export function validateRevisionDocument(raw: unknown, clipId: string, pointer: RevisionPointer, incarnation: string): ClipRevisionDocument {
  const fail = (detail: string): never => documentInvalid("REVISION_DOCUMENT_INVALID", detail);
  if (!isPlainObject(raw)) fail("it is not an object");
  const doc = raw as Record<string, unknown>;
  if (doc.schema !== CLIP_REVISIONS_SCHEMA) fail(`schema ${describeValue(doc.schema)} is not supported`);
  if (doc.clip_id !== clipId) fail("it describes a different clip");
  if (doc.revision_id !== pointer.revision_id) fail("it describes a different revision");
  if (doc.version !== pointer.version) fail("its version does not match the pointer");
  if (doc.incarnation !== incarnation) fail("it belongs to an earlier incarnation of this clip record");
  if (!isNonEmptyString(doc.operation_id) || !isNonEmptyString(doc.created_at)) fail("its operation identity is missing");
  if (doc.operation_id !== pointer.operation_id) fail("it names a different save operation than the pointer");
  if (!validRecipe(doc.recipe)) fail("its recipe is missing or has an unusable field");
  const recipe = doc.recipe as unknown as ExactRenderRecipe;
  if (doc.source_words !== null && !Array.isArray(doc.source_words)) fail("its source words are neither a list nor explicitly unavailable");
  if (Array.isArray(doc.source_words)) {
    const bad = firstInvalidWord(doc.source_words);
    // A filtered list would advertise widening from words that are not there.
    if (bad !== -1) fail(`its retained source word ${bad} is not a usable record`);
  }
  if (doc.words_input !== "supplied" && doc.words_input !== "unavailable") fail("its transcript availability is not recorded");
  if (doc.words_input === "unavailable" && doc.source_words !== null) fail("it records no transcript but retains source words");
  if (doc.words_input === "supplied" && !Array.isArray(doc.source_words)) fail("it records a supplied transcript but retains no source words");
  if (!validTimeline(doc.render_timeline)) fail("its render timeline is missing required fields or does not add up");
  const timeline = doc.render_timeline as unknown as RenderTimeline;
  const tolerance = readTolerance(timeline.tolerance) as ReceiptTolerance;
  const join = tolerance.composition_seconds + tolerance.av_sync_seconds;
  if (timeline.words.input !== doc.words_input) fail("its receipt and its record disagree about transcript availability");

  // -- the receipt against the recipe it was rendered from --------------------
  // The response serves the recipe's requested intervals and the receipt's
  // effective cuts as two views of one edit, so they must be the same intervals.
  if (timeline.segments.length !== recipe.keep_segments.length) {
    fail("its receipt reports a different number of cuts than the recipe it records");
  }
  timeline.segments.forEach((s, i) => {
    const want = recipe.keep_segments[i];
    if (!near(s.source_start, want.start, 1e-6) || !near(s.source_end, want.end, 1e-6)) {
      fail(`its receipt cut ${i} is not the interval its recipe asked for`);
    }
  });
  // Crop keyframes are content-relative: a rendered revision knows how much
  // content there is, so none of them can sit past its end.
  const keyframes = recipe.crop_keyframes;
  if (Array.isArray(keyframes) && keyframes.some((k) => k.t > timeline.content_duration + RECEIPT_ROUNDING)) {
    fail("its recipe places a crop keyframe after the end of the content it rendered");
  }
  checkTranscript(fail, doc, recipe, timeline);

  // -- the served file the pointer publishes ----------------------------------
  if (!isPlainObject(doc.files) || !validFile((doc.files as Record<string, unknown>).main)) fail("its served file record is missing");
  const files = doc.files as Record<string, unknown>;
  const main = files.main as StoredFile;
  // The pointer's `output_path` is published from this very record, and the
  // response describes the revision and links to the media in one breath. Two
  // different files here would let it report one revision's exact timing over
  // an unrelated video, so the contradiction is refused rather than reconciled.
  // Lexical comparison only: this proves identity, not the bytes on disk.
  if (!samePath(main.path, pointer.output_path)) {
    fail("the file it records as served is not the file its current revision pointer serves");
  }
  for (const key of ["caption_overlay", "cropped_source"] as const) {
    if (!optionalOrNull(files[key], validFile)) fail(`its ${key.replace("_", " ")} artifact record is malformed`);
    // The renderer returns these only when the recipe asked to keep them; the
    // save service refuses a receipt that names an unrequested one.
    if (files[key] && recipe.keep_caption_overlay !== true) {
      fail(`it records a ${key.replace("_", " ")} artifact although its recipe did not ask to keep one`);
    }
  }
  if (!isNonEmptyString(doc.group_root)) fail("its dependency group is not recorded");
  if (doc.group_root !== pointer.group_root) fail("it names a different dependency group than the pointer");
  if (!validProbe(doc.probe)) fail("its recorded probe is missing or malformed");
  const probe = doc.probe as unknown as SavedProbeShape;
  // The probe is taken of the served file at save, so it describes that file's
  // size. The response shows both beside each other as `recorded_bytes`.
  if (probe.bytes !== main.bytes) fail("its recorded probe and its served file record disagree about the file's size");
  if (!validSavedCard(doc.thumbnail_card)) fail("its card provenance is missing or incomplete");
  const card = doc.thumbnail_card as Record<string, unknown>;
  // The receipt's own size of the file the renderer wrote. The save refused a
  // render whose receipt, probe and file disagreed about it.
  const receiptBytes = (timeline.output as unknown as Record<string, unknown>).file_size_bytes;
  if (!isCount(receiptBytes)) fail("its receipt records no size for the file it rendered");

  // -- the raw render's own intervals ----------------------------------------
  if (!isPlainObject(doc.bookends)) fail("its bookend record is missing");
  const bookends = doc.bookends as Record<string, unknown>;
  const receiptBookends = timeline.bookends as unknown as Record<string, unknown>;
  for (const kind of ["intro", "outro"] as const) {
    if (!validBookendShape(bookends[kind])) fail(`its ${kind} bookend record is malformed`);
    // The save writes the receipt's own region object as the document's copy,
    // so the two are one join. Each producer field the response or a check
    // below consumes must agree; unknown fields are neither compared nor
    // served. Agreement alone proves nothing more, so the relationships that
    // follow are still checked on the copy that is served.
    const saved = bookends[kind] ?? null;
    const stored = receiptBookends[kind] ?? null;
    if ((saved === null) !== (stored === null)) fail(`its document and its receipt disagree about whether an ${kind} was joined`);
    if (saved !== null && !sameBookend(saved as Record<string, unknown>, stored)) {
      fail(`its document and its receipt record different ${kind} joins`);
    }
  }
  const intro = (bookends.intro ?? null) as SavedBookendShape | null;
  const outro = (bookends.outro ?? null) as SavedBookendShape | null;
  const sentFade = typeof recipe.bookend_fade === "number" ? recipe.bookend_fade : 0;
  for (const [kind, region] of [["intro", intro], ["outro", outro]] as const) {
    if (!region) continue;
    // A branch name alone proves no join: a hard cut overlaps nothing, whether
    // or not this document is old enough to record the join's own inputs.
    if (HARD_CUT_BRANCHES.has(region.branch) && region.applied_overlap !== 0) {
      fail(`its ${kind} reports a ${region.branch} join with ${region.applied_overlap}s of overlap; a hard cut overlaps nothing`);
    }
    // The join overlaps the two assets, so it cannot consume more than the one
    // it is trimming into.
    if (region.applied_overlap > region.asset_duration + RECEIPT_ROUNDING) {
      fail(`its ${kind} overlaps ${region.applied_overlap}s of a ${region.asset_duration}s asset`);
    }
    if (typeof region.requested_fade === "number" && !near(region.requested_fade, sentFade, 1e-6)) {
      fail(`its ${kind} records a ${region.requested_fade}s fade request; its recipe asked for ${sentFade}s`);
    }
  }
  if (intro) {
    // `bookend_region` places the intro from output zero and ends its region one
    // overlap before its asset ends.
    if (!near(intro.output_start, 0, RECEIPT_ROUNDING)) fail("its intro does not start at the beginning of the rendered file");
    if (!near(intro.output_end, Math.max(0, intro.asset_duration - intro.applied_overlap), RECEIPT_ROUNDING)) {
      fail("its intro region does not end one overlap before its asset ends");
    }
    // Its transition is the overlap at the end of its own asset.
    if (!near(intro.transition.output_start, intro.output_end, RECEIPT_ROUNDING) || !near(intro.transition.output_end, intro.asset_duration, RECEIPT_ROUNDING)) {
      fail("its intro transition is not the overlap at the end of its own asset");
    }
  }
  // Content starts where the intro region ends, or at zero without one. The
  // response publishes the offset and the intro's own interval together.
  if (!near(timeline.content_to_output_offset, intro ? intro.output_end : 0, RECEIPT_ROUNDING)) {
    fail(intro ? "its content offset disagrees with where its intro ends" : "it reports a content offset without an intro");
  }
  // The rendered length is the intro, the measured content and whatever the
  // outro adds past the overlap. Compared within the renderer's own stated
  // join allowance, which the save service used for the same arithmetic.
  const expectedOutput = timeline.content_to_output_offset + timeline.content_duration_measured
    + (outro ? outro.asset_duration - outro.applied_overlap : 0);
  if (!near(timeline.output_duration, expectedOutput, join)) {
    fail("its rendered length does not add up from its content offset, measured content and outro");
  }
  if (outro) {
    // The outro's region runs for its asset, starting one overlap before the
    // content ends and ending at the end of the rendered file.
    if (!near(outro.output_end, outro.output_start + outro.asset_duration, RECEIPT_ROUNDING)) {
      fail("its outro region does not run for the length of its own asset");
    }
    if (!near(outro.output_start, timeline.content_to_output_offset + timeline.content_duration_measured - outro.applied_overlap, join)) {
      fail("its outro does not begin one overlap before its content ends");
    }
    if (!near(outro.output_end, timeline.output_duration, join)) {
      fail("its outro does not end where the rendered file ends");
    }
    // `bookend_region` places the outro's transition from one overlap before
    // the content ends to where the content ends, and runs the region for its
    // asset from there.
    const t = outro.transition;
    if (!near(t.output_start, outro.output_start, RECEIPT_ROUNDING) || !near(outro.output_start, Math.max(0, t.output_end - outro.applied_overlap), RECEIPT_ROUNDING)) {
      fail("its outro transition does not start one overlap before the content ends");
    }
    if (!near(outro.output_end, t.output_end - outro.applied_overlap + outro.asset_duration, RECEIPT_ROUNDING)) {
      fail("its outro transition and its region disagree about the length of its asset");
    }
    if (!near(t.output_end, timeline.content_to_output_offset + timeline.content_duration_measured, join)) {
      fail("its outro transition does not end where the content ends");
    }
  }
  // The last join performed wrote the rendered file: the outro when there is
  // one, otherwise the intro. An intro before an outro measured an
  // intermediate file, whose use as the outro's input is checked below. An
  // absent or null measurement is an older record's honest gap.
  const lastJoin = outro ?? intro;
  if (lastJoin && typeof lastJoin.measured_output_duration === "number"
    && !near(lastJoin.measured_output_duration, timeline.output_duration, join)) {
    fail(`its ${outro ? "outro" : "intro"} join measured an output other than the file it rendered`);
  }
  // Join provenance (1B.2a repair-3). Present inputs also decide the asset
  // identity, the clamp and which branch could have been taken. Absent inputs
  // are an honest historical gap and disable only these three checks.
  for (const [kind, region] of [["intro", intro], ["outro", outro]] as const) {
    const inputs = region?.join_inputs;
    if (!region || !inputs) continue;
    const assetInput = kind === "intro" ? inputs.main_duration : inputs.appended_duration;
    if (!near(region.asset_duration, assetInput, RECEIPT_ROUNDING)) {
      fail(`its ${kind} asset length is not the input the join recorded for it`);
    }
    if (kind === "outro" && intro && typeof intro.measured_output_duration === "number"
      && !near(inputs.main_duration, intro.measured_output_duration, RECEIPT_ROUNDING)) {
      fail("its outro join did not start from the output its intro join measured");
    }
    if (HARD_CUT_BRANCHES.has(region.branch)) continue;
    const clamp = concatJoin(sentFade, inputs.main_duration, inputs.appended_duration);
    if (!clamp.crossfades) {
      fail(`its ${kind} reports a ${region.branch} join that its recorded inputs and ${sentFade}s fade cannot produce`);
    }
    if (!near(region.applied_overlap, clamp.overlap, RECEIPT_ROUNDING)) {
      fail(`its ${kind} overlap is not the ${sentFade}s fade clamped by the inputs the join recorded`);
    }
  }

  // -- the served file's composition -----------------------------------------
  const finalRaw = doc.final_composition;
  if (finalRaw === undefined || finalRaw === null) {
    // An accepted document saved before 1B.2b.1. The card composer arrived in
    // the same slice as this record, and the save service refused every card
    // request before it, so an applied card here describes a save that never
    // happened and the response would show a card over card-free raw timing.
    if (card.applied === true) {
      fail("it reports an applied opening card but records no composition, a state no save produced");
    }
    // With no composition the served file is the raw render itself, so its
    // recorded probe and the receipt describe one file, exactly as the save
    // admitted them: the size equal, the length within the allowance the save
    // compared it with. Stored claims only; no byte on disk is read.
    if (receiptBytes !== main.bytes) fail("its receipt and its served file record disagree about the rendered file's size");
    if (probe.duration === null || !near(probe.duration, timeline.output_duration, Math.max(PROBE_DURATION_FLOOR, tolerance.composition_seconds))) {
      fail("its recorded probe does not agree with the length its receipt reports for the file it serves");
    }
  } else {
    checkFinalComposition(fail, finalRaw, { timeline, tolerance, join, main, files, card, probe, pointer, groupRoot: doc.group_root as string, receiptBytes: receiptBytes as number });
  }
  return raw as unknown as ClipRevisionDocument;
}

/**
 * The editorial transcript, re-derived. The receipt's retained source words and
 * content words are what `exact_render` projects from the document's full
 * source list onto the recipe's kept intervals, in supplied interval order;
 * the text is that projection's text. Every word is checked, before the
 * service caps what it serves, and nothing is sorted, filtered or cleaned the
 * way captions are. Timing is compared within the receipt's own rounding.
 */
function checkTranscript(fail: (detail: string) => never, doc: Record<string, unknown>, recipe: ExactRenderRecipe, timeline: RenderTimeline): void {
  const words = timeline.words as unknown as Record<string, unknown>;
  const content = words.content as SourceWord[];
  if (doc.words_input === "unavailable") {
    // No transcript was supplied, so nothing was retained from one.
    if (words.source_count !== null || words.source !== null) fail("its receipt retains source words from a transcript that was never supplied");
    return;
  }
  const source = doc.source_words as SourceWord[];
  if (words.source_count !== source.length) fail("its receipt counts a different number of supplied words than it retains");
  if (!Array.isArray(words.source) || canonical(words.source) !== canonical(wordsInIntervals(source, recipe.keep_segments))) {
    fail("its receipt's retained source words are not the supplied words touching its kept intervals, in supplied order");
  }
  const projected = mapWordsToContent(source, recipe.keep_segments);
  if (content.length !== projected.length) {
    fail(`it records ${content.length} editorial words; its supplied words on its kept intervals give ${projected.length}`);
  }
  for (let i = 0; i < projected.length; i++) {
    const want = projected[i];
    const got = content[i];
    if (wordIdentity(got) !== wordIdentity(want.word) || !near(got.start, want.start, RECEIPT_ROUNDING) || !near(got.end, want.end, RECEIPT_ROUNDING)) {
      fail(`its editorial word ${i} is not its supplied word clipped to its kept interval and placed in content seconds`);
    }
  }
  if (words.content_text !== contentText(content)) fail("its editorial text is not the text of its editorial words");
}

interface CompositionContext {
  timeline: RenderTimeline;
  tolerance: ReceiptTolerance;
  join: number;
  main: StoredFile;
  files: Record<string, unknown>;
  card: Record<string, unknown>;
  probe: SavedProbeShape;
  pointer: RevisionPointer;
  groupRoot: string;
  /** The raw receipt's own size of the file the renderer wrote. */
  receiptBytes: number;
}

/**
 * The served file's composition record, present only on documents saved since
 * 1B.2b.1. The response quotes its offsets, its card identity and its artifact
 * domains beside the raw receipt's timing, so all of them have to describe one
 * file: the whole raw render, shifted by the card that was really composed.
 */
function checkFinalComposition(fail: (detail: string) => never, value: unknown, ctx: CompositionContext): void {
  const { timeline, tolerance, join, main, files, card, probe } = ctx;
  if (!isPlainObject(value)) fail("its final composition record is not an object");
  const f = value as Record<string, unknown>;
  if (f.version !== FINAL_COMPOSITION_VERSION) fail("its final composition record is a version this reader does not know");
  // Quoted verbatim beside the raw receipt's map as the meaning of the offsets
  // in this response.
  if (!sameMap(f.time_domains, FINAL_TIME_DOMAINS)) fail("its final composition declares time domains its producer does not write");
  if (!isNonNegative(f.card_offset) || !isNonNegative(f.content_offset)) fail("its final composition offsets are not real positions");
  if (!isFiniteNumber(f.content_duration)) fail("its final composition records no content length");
  const cardOffset = f.card_offset as number;
  const contentOffset = f.content_offset as number;

  // -- the raw render this composition offsets --------------------------------
  const rawRender = f.raw_render;
  if (!isPlainObject(rawRender)) fail("its final composition does not record the raw render it offsets");
  const raw = rawRender as Record<string, unknown>;
  if (!validFile(raw.file)) fail("its final composition records no raw render file");
  const rawFile = raw.file as StoredFile;
  if (!isFiniteNumber(raw.output_duration) || !near(raw.output_duration, timeline.output_duration, RECEIPT_ROUNDING)) {
    fail("its final composition and its receipt disagree about the raw render's length");
  }
  if (!isFiniteNumber(raw.content_to_output_offset) || !near(raw.content_to_output_offset, timeline.content_to_output_offset, RECEIPT_ROUNDING)) {
    fail("its final composition and its receipt disagree about the raw render's content offset");
  }
  if (!validProbe(raw.probe)) fail("its final composition records no usable probe of the raw render");
  const rawProbe = raw.probe as unknown as SavedProbeShape;
  if (rawProbe.bytes !== rawFile.bytes) fail("its raw render probe and file record disagree about the raw file's size");
  // The receipt describes the raw render, never the composed file.
  if (ctx.receiptBytes !== rawFile.bytes) fail("its receipt and its raw render file record disagree about the raw file's size");
  // The save service refused a render whose probe fell outside this allowance
  // of its receipt, so the two are re-derived rather than re-probed.
  const probeAllowance = Math.max(PROBE_DURATION_FLOOR, tolerance.composition_seconds);
  if (!isPositive(rawProbe.duration) || !near(rawProbe.duration, raw.output_duration as number, probeAllowance)) {
    fail("its raw render probe does not agree with the length its receipt reports");
  }
  const rawProbeDuration = rawProbe.duration as number;

  // -- the served file --------------------------------------------------------
  if (!isPlainObject(f.output) || !isPositive((f.output as Record<string, unknown>).duration)) {
    fail("its final composition records no length for the served file");
  }
  const output = f.output as Record<string, unknown>;
  const outputDuration = output.duration as number;
  // The composition record describes the file the document serves, so its own
  // file record has to be that file. Compared lexically and by the size and
  // hash already recorded; nothing is read or re-hashed here.
  if (!validFile(output.file) || !sameFile(output.file as StoredFile, main)) {
    fail("its final composition does not describe the file the document serves");
  }
  if (!validProbe(output.probe)) fail("its final composition records no usable probe of the served file");
  const outputProbe = output.probe as unknown as SavedProbeShape;
  if (outputProbe.bytes !== main.bytes) fail("its served file probe and file record disagree about the file's size");
  // `probe` and `final_composition.output.probe` are the same probe of the same
  // served file, written twice; the response quotes both.
  if (probe.duration !== outputProbe.duration || probe.has_video !== outputProbe.has_video
    || probe.has_audio !== outputProbe.has_audio || probe.bytes !== outputProbe.bytes) {
    fail("its recorded probe and its final composition describe the served file differently");
  }
  if (probe.duration !== outputDuration) {
    fail("its recorded probe and its final composition disagree about the served file's length");
  }
  if (!near(f.content_duration as number, timeline.content_duration, RECEIPT_ROUNDING)) {
    fail("its final composition and its receipt disagree about how much content there is");
  }
  if (!near(contentOffset, cardOffset + timeline.content_to_output_offset, RECEIPT_ROUNDING)) {
    fail("its content offset is not its card offset plus the raw render's own content offset");
  }
  if (!optionalOrNull(output.video, validVideoSummary)) fail("its served file's video summary is malformed");
  if (!optionalOrNull(output.audio, validAudioSummary)) fail("its served file's audio summary is malformed");

  // -- the card, or its absence ----------------------------------------------
  const composed = f.card;
  const hasCard = composed !== null && composed !== undefined;
  // One card, described once. The document's provenance and the composition
  // are written from the same condition by the same commit, so a card the
  // document denies is not a card this response can describe.
  if (hasCard !== (card.applied === true)) {
    fail(hasCard
      ? "it reports no applied opening card beside a composition that applied one"
      : "it reports an applied opening card beside a composition that applied none");
  }
  const tol = f.tolerance;
  if (!isPlainObject(tol) || tol.video_ticks !== 0 || typeof tol.basis !== "string") fail("its composition tolerance is malformed");
  const cardSeconds = (tol as Record<string, unknown>).card_seconds;
  const audioSeconds = (tol as Record<string, unknown>).audio_seconds;
  if (!optionalOrNull(cardSeconds, isNonNegative) || !optionalOrNull(audioSeconds, isNonNegative)) {
    fail("its composition tolerance is not a real allowance");
  }

  let measuredCard = 0;
  if (!hasCard) {
    // With no card the served file *is* the raw exact render: the same file
    // record and the same probe, written twice by `buildFinalComposition`.
    if (cardOffset !== 0) fail("it reports a card offset without a card");
    if (!sameFile(main, rawFile)) fail("it composes no card yet serves a file other than its raw render");
    if (outputProbe.duration !== rawProbe.duration || outputProbe.bytes !== rawProbe.bytes
      || outputProbe.has_video !== rawProbe.has_video || outputProbe.has_audio !== rawProbe.has_audio) {
      fail("it composes no card yet probes the served file differently from the raw render");
    }
    if (output.video !== null || output.audio !== null) fail("it composes no card yet records composed stream summaries");
    if (cardSeconds !== null || audioSeconds !== null) fail("it composes no card yet records card and audio allowances");
  } else {
    measuredCard = checkCard(fail, composed, { ...ctx, f, rawFile, rawProbeDuration, outputDuration, cardOffset, cardSeconds, audioSeconds, output });
  }

  // -- the file holds everything it claims to --------------------------------
  const cardAllowance = (isFiniteNumber(cardSeconds) ? cardSeconds : 0) + (isFiniteNumber(audioSeconds) ? audioSeconds : 0);
  // The composer proved every raw packet is present, shifted by the card, so
  // the served file cannot be shorter than the raw render plus that card.
  if (outputDuration < rawProbeDuration + measuredCard - cardAllowance - DERIVED_SECONDS) {
    fail("its served file is shorter than the raw render and the card it is composed from");
  }
  // And the content the response serves has to fit inside it.
  if (outputDuration < contentOffset + timeline.content_duration_measured - (join + probeAllowance + cardAllowance)) {
    fail("its served file ends before the content this revision records finishes playing");
  }

  // -- artifacts --------------------------------------------------------------
  const artifacts = f.artifacts;
  if (!isPlainObject(artifacts)) fail("its final composition records no artifact placements");
  const a = artifacts as Record<string, unknown>;
  const placement = (key: string, withCardImage: boolean): PlacementShape | null => {
    const v = a[key];
    if (v === null || v === undefined) return null;
    if (!validPlacementShape(v, withCardImage)) fail(`its ${key.replace("_", " ")} placement is malformed`);
    return v as unknown as PlacementShape;
  };
  // The served file itself, at its own second zero.
  const mainPlacement = placement("main", false);
  if (!mainPlacement) fail("its final composition does not place the served file");
  if (!samePath((mainPlacement as PlacementShape).path, main.path)) fail("its main placement names a file other than the one it serves");
  if (!near((mainPlacement as PlacementShape).placed_at, 0, RECEIPT_ROUNDING)) fail("its main placement does not start at the beginning of the served file");
  if ((mainPlacement as PlacementShape).contains_card !== hasCard) fail("its main placement disagrees with its own composition about the card");
  if ((mainPlacement as PlacementShape).time_domain !== ARTIFACT_DOMAINS.main) fail("its main placement declares a time domain its producer does not write");
  // The raw render, which starts where the card ends.
  const rawPlacement = placement("raw_render", false);
  if (!rawPlacement) fail("its final composition does not place the raw render");
  if (!samePath((rawPlacement as PlacementShape).path, rawFile.path)) fail("its raw render placement names a file other than the raw render");
  if (!near((rawPlacement as PlacementShape).placed_at, cardOffset, RECEIPT_ROUNDING)) fail("its raw render placement does not start where the card ends");
  if ((rawPlacement as PlacementShape).contains_card !== false) fail("its raw render placement claims to hold the card");
  if ((rawPlacement as PlacementShape).time_domain !== ARTIFACT_DOMAINS.raw_render) fail("its raw render placement declares a time domain its producer does not write");
  // Both optional sidecars hold the edited content without the card, so each
  // one's second zero is where the content starts in the served file. A
  // placement with no file behind it establishes no artifact.
  for (const key of ["caption_overlay", "cropped_source"] as const) {
    const place = placement(key, false);
    const file = (files[key] ?? null) as StoredFile | null;
    if (!!place !== !!file) {
      fail(place
        ? `it places a ${key.replace("_", " ")} artifact it records no file for`
        : `it records a ${key.replace("_", " ")} artifact file it places nowhere`);
    }
    if (!place || !file) continue;
    if (!samePath(place.path, file.path)) fail(`its ${key.replace("_", " ")} placement names a file other than the one it records`);
    if (!near(place.placed_at, contentOffset, RECEIPT_ROUNDING)) fail(`its ${key.replace("_", " ")} artifact is not placed where the content starts`);
    if (place.contains_card !== false) fail(`its ${key.replace("_", " ")} artifact claims to hold the card`);
    if (place.time_domain !== ARTIFACT_DOMAINS.sidecar) fail(`its ${key.replace("_", " ")} artifact declares a time domain its producer does not write`);
  }
  // The still at the head of the served file.
  const cardPlacement = placement("card_image", true);
  if (!!cardPlacement !== hasCard) fail("its card image placement and its composed card do not agree that there is a card");
  if (cardPlacement && hasCard) {
    const image = (composed as Record<string, unknown>).image as StoredFile;
    if (!samePath(cardPlacement.path, image.path)) fail("its card image placement names a file other than the composed card image");
    if (cardPlacement.sha256 !== image.sha256) fail("its card image placement and its composed card image are different images");
    if (!near(cardPlacement.placed_at, 0, RECEIPT_ROUNDING)) fail("its card image does not start at the beginning of the served file");
    if (!near(cardPlacement.until as number, cardOffset, RECEIPT_ROUNDING)) fail("its card image does not run to the card offset it reports");
    if (cardPlacement.contains_card !== true) fail("its card image placement denies holding the card");
    if (cardPlacement.time_domain !== ARTIFACT_DOMAINS.card_image) fail("its card image placement declares a time domain its producer does not write");
  }
}

interface CardContext extends CompositionContext {
  f: Record<string, unknown>;
  rawFile: StoredFile;
  rawProbeDuration: number;
  outputDuration: number;
  cardOffset: number;
  cardSeconds: unknown;
  audioSeconds: unknown;
  output: Record<string, unknown>;
}

/**
 * The composed opening card, checked against the producer receipt the save
 * service kept beside it: the same image, the same two files, whole card frames
 * of the raw render's own leading frame length, and the audio that moved by
 * exactly that card. Returns the measured card length.
 */
function checkCard(fail: (detail: string) => never, value: unknown, ctx: CardContext): number {
  const { card, main, rawFile, rawProbeDuration, cardOffset, cardSeconds, audioSeconds, output, groupRoot, pointer } = ctx;
  if (!isPlainObject(value)) fail("its composed card record is not an object");
  const c = value as Record<string, unknown>;
  if (!validFile(c.image) || !isPositive(c.measured_duration)) fail("its composed card records no image or no measured length");
  const image = c.image as StoredFile;
  const measured = c.measured_duration as number;
  if (c.placement !== "opening" || c.transition !== "hardcut" || c.overlap !== 0) {
    fail("its composed card is not the opening hard cut the composer produces");
  }
  if (!isPositive(c.requested_duration) || !isPositive(c.frame_duration) || !isWholePositive(c.frames)) {
    fail("its composed card records no usable frame arithmetic");
  }
  if (c.output_start !== 0 || !isFiniteNumber(c.output_end) || !near(c.output_end as number, measured, DERIVED_SECONDS)) {
    fail("its composed card's own interval is not the card it measured");
  }
  if (!near(measured, cardOffset, RECEIPT_ROUNDING)) fail("its card offset is not the length of the card it composed");
  if (c.audio_samples !== null && !isCount(c.audio_samples)) fail("its composed card records an unusable audio sample count");

  // The document's own provenance and the composition describe one applied card.
  const descriptor = card.descriptor as Record<string, unknown>;
  const provenanceImage = card.image as StoredFile;
  if (!sameFile(provenanceImage, image)) fail("its card provenance and its composition record different card images");
  const composedDescriptor = c.descriptor;
  if (!isPlainObject(composedDescriptor)
    || composedDescriptor.image_path !== descriptor.image_path
    || composedDescriptor.image_sha256 !== descriptor.image_sha256
    || composedDescriptor.placement !== descriptor.placement
    || composedDescriptor.duration !== descriptor.duration) {
    fail("its card provenance and its composition record different chosen cards");
  }
  if (image.sha256 !== descriptor.image_sha256) fail("the card image it composed is not the image its descriptor chose");
  if (!near(c.requested_duration as number, descriptor.duration as number, DERIVED_SECONDS)) {
    fail("its composition asked for a card length its descriptor did not choose");
  }
  // The composer publishes into its own group, which the commit then records as
  // the revision's group on the document, its provenance and the pointer.
  if (!isNonEmptyString(c.group_root) || c.group_root !== card.group_root || c.group_root !== groupRoot || c.group_root !== pointer.group_root) {
    fail("its composed card, its card provenance and its pointer name different dependency groups");
  }

  // -- the producer's own receipt --------------------------------------------
  const producer = c.producer;
  if (!isPlainObject(producer)) fail("its composed card keeps no producer receipt");
  const p = producer as Record<string, unknown>;
  if (p.version !== 1 || p.kind !== "opening_card" || p.placement !== "opening" || p.transition !== "hardcut" || p.overlap !== 0) {
    fail("its card producer receipt is not the opening card receipt this reader knows");
  }
  if (!sameMap(p.time_domains, OPENING_CARD_TIME_DOMAINS)) fail("its card producer receipt declares time domains its producer does not write");
  if (!near(p.requested_duration as number, c.requested_duration as number, DERIVED_SECONDS)) {
    fail("its card producer receipt asked for a different card length");
  }
  const pRaw = p.raw;
  const pOut = p.output;
  const pCard = p.card;
  if (!isPlainObject(pRaw) || !isPlainObject(pOut) || !isPlainObject(pCard)) fail("its card producer receipt is incomplete");
  const rawClaim = pRaw as Record<string, unknown>;
  const outClaim = pOut as Record<string, unknown>;
  const cardClaim = pCard as Record<string, unknown>;

  // Files: the composer measured the raw render this document records, and
  // produced the file this document serves.
  if (!isNonEmptyString(rawClaim.path) || !samePath(rawClaim.path, rawFile.path)
    || rawClaim.sha256 !== rawFile.sha256 || rawClaim.file_size_bytes !== rawFile.bytes) {
    fail("its card was not composed from the raw render this revision records");
  }
  if (!isNonEmptyString(outClaim.path) || !samePath(outClaim.path, main.path) || outClaim.file_size_bytes !== main.bytes) {
    fail("its card producer receipt describes a file other than the one this revision serves");
  }
  if (outClaim.duration !== ctx.outputDuration) fail("its card producer receipt and its composition disagree about the served file's length");
  if (!isFiniteNumber(rawClaim.duration) || !near(rawClaim.duration, rawProbeDuration, RECEIPT_ROUNDING)) {
    fail("its card producer receipt and its composition disagree about the raw render's length");
  }
  if (!isNonEmptyString(cardClaim.image_path) || !samePath(cardClaim.image_path, image.path)
    || cardClaim.image_sha256 !== descriptor.image_sha256 || cardClaim.image_bytes !== image.bytes) {
    fail("its card producer receipt describes a different card image");
  }

  // Frames: whole card frames of the raw render's leading frame length, in the
  // time base both files share.
  if (!validVideoSummary(rawClaim.video) || !validVideoSummary(outClaim.video)) fail("its card producer receipt records no usable video summaries");
  const rawVideo = rawClaim.video as unknown as VideoSummaryShape;
  const outVideo = outClaim.video as unknown as VideoSummaryShape;
  for (const key of ["width", "height", "sample_aspect_ratio", "time_base"] as const) {
    if (outVideo[key] !== rawVideo[key]) fail(`its composed file's ${key.replace(/_/g, " ")} is not the raw render's`);
  }
  const tb = ratio(rawVideo.time_base) as { num: number; den: number };
  if (!isWholePositive(cardClaim.frame_ticks) || !isWholePositive(cardClaim.measured_ticks) || !isWholePositive(cardClaim.frames)) {
    fail("its card producer receipt records no whole frame or tick counts");
  }
  const frameTicks = cardClaim.frame_ticks as number;
  const frames = cardClaim.frames as number;
  if (frames !== c.frames) fail("its composed card and its producer receipt count different card frames");
  if (cardClaim.measured_ticks !== frames * frameTicks) fail("its card's measured ticks are not its frames at its own frame length");
  if (frames !== cardFrameCount(frameTicks, tb, c.requested_duration as number)) {
    fail("its card is not the whole number of frames nearest the length it asked for");
  }
  if (rawVideo.packets <= 0) fail("its card producer receipt measured no frames in the raw render");
  if (outVideo.packets !== rawVideo.packets + frames) {
    fail("its composed file does not hold the raw render's frames plus its card's");
  }
  if (outVideo.first_pts !== 0) fail("its composed file does not begin with the card");
  const frameDuration = (frameTicks * tb.num) / tb.den;
  const measuredFromTicks = ((cardClaim.measured_ticks as number) * tb.num) / tb.den;
  if (!near(c.frame_duration as number, frameDuration, DERIVED_SECONDS) || !near(cardClaim.frame_duration as number, frameDuration, DERIVED_SECONDS)) {
    fail("its card's frame length is not its frame ticks in its own time base");
  }
  if (!near(measured, measuredFromTicks, DERIVED_SECONDS) || !near(cardClaim.measured_duration as number, measuredFromTicks, DERIVED_SECONDS)) {
    fail("its card's measured length is not its measured ticks in its own time base");
  }
  if (!near(cardClaim.output_end as number, measured, DERIVED_SECONDS)) fail("its card producer receipt ends its card somewhere else");
  if (Math.abs(measured - (c.requested_duration as number)) > frameDuration / 2 + DERIVED_SECONDS) {
    fail("its card is more than half a frame from the length it asked for");
  }
  if (!isFiniteNumber(cardSeconds) || !near(cardSeconds, frameDuration / 2, DERIVED_SECONDS)) {
    fail("its composition's card allowance is not half a frame of its own time base");
  }
  // The whole raw render is present, shifted by the card: its last frame ends
  // one card later than it did in the raw file.
  if (rawVideo.start !== null && rawVideo.duration !== null && outVideo.start !== null && outVideo.duration !== null
    && !near(outVideo.start + outVideo.duration, rawVideo.start + rawVideo.duration + measured, frameDuration + DERIVED_SECONDS)) {
    fail("its composed video does not end one card after the raw render does");
  }
  // The composition keeps the summaries the producer measured.
  if (!summariesMatch(output.video, outVideo)) fail("its composition and its producer receipt summarise the served file's video differently");

  // Audio: the same stream, starting where it did and ending one card later.
  if (!validAudioSummary(rawClaim.audio) || !validAudioSummary(outClaim.audio)) fail("its card producer receipt records no usable audio summaries");
  const rawAudio = (rawClaim.audio ?? null) as AudioSummaryShape | null;
  const outAudio = (outClaim.audio ?? null) as AudioSummaryShape | null;
  if (!!rawAudio !== !!outAudio) fail("its composed file's audio presence differs from the raw render's");
  if (!summariesMatch(output.audio, outAudio)) fail("its composition and its producer receipt summarise the served file's audio differently");
  if (!rawAudio || !outAudio) {
    if (c.audio_samples !== null || cardClaim.audio_samples !== null) fail("it reports card audio samples for a card composed onto silence");
    if (audioSeconds !== null) fail("it records an audio allowance for a card composed onto silence");
    if (!isNonEmptyString(cardClaim.audio_note)) fail("a card composed onto silence carries no note saying so");
  } else {
    if (cardClaim.audio_note !== null) fail("it notes silent-card handling for a raw render that has audio");
    if (outAudio.sample_rate !== rawAudio.sample_rate || outAudio.channels !== rawAudio.channels) {
      fail("its composed audio is not the raw render's audio stream");
    }
    const rate = rawAudio.sample_rate;
    const allowance = (AAC_FRAME_SAMPLES + 1) / rate;
    if (!isFiniteNumber(audioSeconds) || !near(audioSeconds, allowance, DERIVED_SECONDS)) {
      fail("its composition's audio allowance is not one AAC frame and one sample of its own stream");
    }
    if (rawAudio.start !== null && outAudio.start !== null && Math.abs(outAudio.start - rawAudio.start) > 1 / rate) {
      fail("its composed audio does not start where the raw render's audio starts");
    }
    if (rawAudio.start !== null && rawAudio.duration !== null && outAudio.start !== null && outAudio.duration !== null
      && Math.abs((outAudio.start + outAudio.duration) - (rawAudio.start + rawAudio.duration + measured)) > allowance) {
      fail("its composed audio does not end one card after the raw render's audio does");
    }
    const samples = Math.floor(((cardClaim.measured_ticks as number) * tb.num * rate) / tb.den);
    if (c.audio_samples !== samples || cardClaim.audio_samples !== samples) {
      fail("its card's audio samples are not its measured ticks at its own sample rate");
    }
  }
  return measured;
}

/** The composition keeps the producer's summary of the same stream, so the two
 * must agree field by field; a stored null on one side and a summary on the
 * other describe two different files. */
function summariesMatch(stored: unknown, claim: object | null): boolean {
  if (claim === null) return stored === null || stored === undefined;
  if (!isPlainObject(stored)) return false;
  const want = claim as Record<string, unknown>;
  const keys = Object.keys(want);
  if (Object.keys(stored).length !== keys.length) return false;
  return keys.every((k) => stored[k] === want[k]);
}

// ---------------------------------------------------------------------------
// The draft document
// ---------------------------------------------------------------------------

export interface ValidatedDraftDocument {
  version: number;
  saved_at: string;
  draft: { recipe: ExactRenderRecipe; source_words: unknown; thumbnail_card?: unknown; note?: unknown };
}

export function validateDraftDocument(raw: unknown, clipId: string, pointer: DraftPointer, incarnation: string): ValidatedDraftDocument {
  const fail = (detail: string): never => documentInvalid("DRAFT_DOCUMENT_INVALID", detail);
  if (!isPlainObject(raw)) fail("it is not an object");
  const doc = raw as Record<string, unknown>;
  if (doc.schema !== CLIP_REVISIONS_SCHEMA) fail(`schema ${describeValue(doc.schema)} is not supported`);
  if (doc.clip_id !== clipId) fail("it describes a different clip");
  if (doc.incarnation !== incarnation) fail("it belongs to an earlier incarnation of this clip record");
  if (doc.version !== pointer.version) fail("its version does not match the draft pointer");
  if (!isNonEmptyString(doc.saved_at) || doc.saved_at !== pointer.saved_at) fail("its save time is missing or disagrees with the draft pointer");
  if (!isPlainObject(doc.draft) || !validRecipe((doc.draft as Record<string, unknown>).recipe)) fail("its recipe is missing or has an unusable field");
  const draft = doc.draft as Record<string, unknown>;
  if (!optionalOrNull(draft.source_words, Array.isArray)) fail("its source words are neither a list nor explicitly unavailable");
  if (Array.isArray(draft.source_words)) {
    // The response reports this count; a filtered list would overstate it.
    const bad = firstInvalidWord(draft.source_words);
    if (bad !== -1) fail(`its source word ${bad} is not a usable record`);
  }
  if (!optionalOrNull(draft.thumbnail_card, (c) => isPlainObject(c) && isNonEmptyString(c.image_path) && isNonEmptyString(c.image_sha256) && c.placement === "opening" && isPositive(c.duration))) {
    fail("its chosen opening card is malformed");
  }
  if (!optional(draft.note, (n) => typeof n === "string")) fail("its note is not text");
  return raw as unknown as ValidatedDraftDocument;
}

// ---------------------------------------------------------------------------
// The aggregate the service projects from
// ---------------------------------------------------------------------------

/**
 * How the clip entry's own `output_path` summary relates to the current
 * revision's file. The existing by-id preview and download routes resolve
 * through that summary, so it decides whether any url in this response reaches
 * the revision described beside it:
 *
 *  * `untracked` — no current revision pointer to compare it with.
 *  * `absent`    — the entry records no summary; `serveClipById` answers 404.
 *  * `invalid`   — a summary that is present but not a usable path; 404 as well.
 *  * `different` — a usable summary naming another file; the urls serve that.
 *  * `equal`     — the summary is the revision's own file.
 */
export type MediaSummaryClass = "untracked" | "absent" | "invalid" | "different" | "equal";

export interface ValidatedEditorRecord {
  state: ClipRevisionState | null;
  current: RevisionPointer | null;
  /** The immutable document, when the current revision is an exact render. */
  document: ClipRevisionDocument | null;
  draft: ValidatedDraftDocument | null;
  summary: MediaSummaryClass;
  /** Whether the file the urls would serve is a container `serveClipById`
   * streams. Unknown when no path is recorded to judge. */
  servedKind: "supported" | "unsupported" | "unknown";
}

/**
 * What the service found when it resolved the entry summary the way
 * `serveClipById` does: the path it resolved, and the regular file that path
 * resolves to, or null when it does not resolve to one. Gathered by the
 * service; this module only reads it.
 */
export interface ServedFileFact {
  path: string;
  resolvedFile: string | null;
}

export interface EditorRecordInput {
  clipId: string;
  /** The clip entry's own summary of its served file, exactly as stored. */
  entrySummary: unknown;
  /** The summary resolved as the by-id routes resolve it, or null when no
   * usable summary was resolved. */
  servedFile: ServedFileFact | null;
  state: ClipRevisionState | null;
  /** Raw JSON of the immutable document, or null when there is none to read. */
  revisionDocument: unknown | null;
  /** Raw JSON of the draft document, or null when there is no draft. */
  draftDocument: unknown | null;
}

/**
 * Validate one clip's whole tracked record before anything is projected. The
 * service does the reading; this decides what may be claimed about it.
 */
export function validateEditorRecord(input: EditorRecordInput): ValidatedEditorRecord {
  const { clipId, state } = input;
  const current = state?.current ?? null;
  const document = input.revisionDocument === null || current === null
    ? null
    : validateRevisionDocument(input.revisionDocument, clipId, current, (state as ClipRevisionState).incarnation);
  const draft = input.draftDocument === null || !state?.draft
    ? null
    : validateDraftDocument(input.draftDocument, clipId, state.draft, state.incarnation);

  const raw = input.entrySummary;
  let summary: MediaSummaryClass;
  if (!current) summary = "untracked";
  else if (raw === undefined || raw === null) summary = "absent";
  else if (!isNonEmptyString(raw)) summary = "invalid";
  else summary = samePath(raw, current.output_path) ? "equal" : "different";

  // The urls resolve through the entry summary, so that is the file whose kind
  // decides whether they can serve anything at all. `serveClipById` resolves
  // it and checks the extension of the regular file it reaches, so a link is
  // judged by its target, never its own name. When the summary reaches no
  // regular file the route refuses it before the kind matters, and the
  // availability of the file says so separately; its recorded name is then
  // what the route would judge once a file is back at that path.
  const servedPath = summary === "equal" || summary === "different" ? (raw as string)
    : summary === "untracked" && isNonEmptyString(raw) ? raw
      : null;
  const fact = input.servedFile;
  const judged = servedPath !== null && fact !== null && fact.path === servedPath && fact.resolvedFile !== null
    ? fact.resolvedFile
    : servedPath;
  const servedKind = judged === null ? "unknown" : SERVABLE_MEDIA.test(judged) ? "supported" : "unsupported";

  return { state: state ?? null, current, document, draft, summary, servedKind };
}
