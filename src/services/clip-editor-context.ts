// === Writing Studio read-only editor context (slice 1B.2b.2) ===
//
// Resolves one saved clip into the typed response in
// src/models/clip-editor-context.ts, for GET /api/clips/:id/editor-context.
//
// What this service is:
//
//  * A reader. It creates no history, revision, draft, media or migration
//    record, it never adopts a legacy clip into revision tracking, and it
//    deliberately does not import the revision save service — only its erased
//    types — so no save operation can reach the web server through this route.
//  * Snapshot-consistent. The clip list is read strictly once. Every pointer,
//    version and identity in one response comes from that read, and the
//    documents those pointers name are immutable, so a concurrent save cannot
//    mix a new revision with an old draft. The response says it is a captured
//    view rather than claiming to still be current.
//  * Honest about legacy data. An untracked clip and the legacy version zero
//    keep their own media and metadata. Their sidecars are read strictly, and
//    absent, supplied-empty, malformed and unreadable stay four different
//    answers. A stored range or keep_segments array is reported as *requested*;
//    the legacy renderer never returned the cuts it actually made, so this
//    service never presents one as an effective map. Bounded words are shown
//    with their domain and never counted as full source coverage.
//
// What it refuses:
//
//  * Silent degradation. If a tracked clip's own state or document is corrupt,
//    unreadable or describes another clip or version, the request fails with a
//    stable code. It never quietly answers from legacy sidecars instead, and a
//    corrupt clips.json is an error rather than an empty Library or a 404.
//  * Arbitrary reads. The clip id is validated before any path is built. The
//    app-owned sidecar and revision documents must resolve inside their real
//    configured directories with no link anywhere in the chain. Media and
//    source paths already stored on legacy entries may legitimately sit outside
//    the export root, so those are stat-ed where they are but never read,
//    served, searched for or returned as paths.
//  * Expensive work. No hashing and no decoding: sizes come from stat and the
//    recorded probe, and the response marks integrity explicitly unverified.

import { realpath } from "fs";
import { readFile, lstat, stat } from "fs/promises";
import { basename, isAbsolute, join, relative, resolve, sep } from "path";
import { promisify } from "util";
import { paths } from "../config/paths.js";
import { readHistoryStrict, HistoryReadError } from "./clips-history.js";
import { isDemoMode, demoClips } from "../ui/demo-fixtures.js";
import { childLogger } from "../utils/logger.js";
import {
  describeValue,
  firstInvalidWord,
  isFiniteNumber,
  isNonEmptyString,
  isPlainObject,
  validateEditorRecord,
  validateRevisionState,
  type MediaSummaryClass,
  type ServedFileFact,
  type ValidatedDraftDocument,
  type ValidatedEditorRecord,
} from "./clip-editor-read-contract.js";
import type { ClipHistoryEntry, Format } from "../models/index.js";
import type {
  ClipRevisionDocument,
  ClipRevisionState,
  DraftPointer,
  ExactRenderRecipe,
  OperationState,
  RevisionPointer,
} from "../models/clip-revisions.js";
import {
  EDITOR_CONTEXT_VERSION,
  EditorContextError,
  type EditorCapabilityId,
  type EditorContextBookend,
  type EditorContextCapability,
  type EditorContextCard,
  type EditorContextClip,
  type EditorContextConflict,
  type EditorContextDiagnostic,
  type EditorContextDraft,
  type EditorContextFile,
  type EditorContextLegacy,
  type EditorContextLegacyRecipe,
  type EditorContextMedia,
  type EditorContextMediaSummary,
  type EditorContextOperations,
  type EditorContextRecipe,
  type EditorContextResponse,
  type EditorContextRevision,
  type EditorContextRevisionDocument,
  type EditorContextSegment,
  type EditorContextSidecar,
  type EditorContextTiming,
  type EditorContextTranscript,
  type EditorFileState,
  type EditorReasonCode,
  type EditorWord,
} from "../models/clip-editor-context.js";

export { EditorContextError } from "../models/clip-editor-context.js";

const log = childLogger("clip-editor-context");

/** Same identifier shape the revision service accepts, checked before any path
 * is constructed from it. */
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/** Name of the sidecar directory beneath the history directory, matching the
 * revision service's layout. Duplicated as a constant rather than imported so
 * this read path has no runtime edge to the save service. */
const REVISION_SIDECARS = "revisions";

const IDENTITY_NOTE =
  "Captured from one strict history read. A concurrent save may have advanced these versions since; " +
  "re-read before acting on them.";

const URL_NOTE =
  "These resolve by clip id and follow the clip's current pointer: after a later save they serve the new revision.";

const OPERATIONS_NOTE =
  "Summary only. The operations archive, request hashes, residual paths and raw error text are not served.";

// ---------------------------------------------------------------------------
// Strict reading helpers
// ---------------------------------------------------------------------------

/** A byte sequence that is not valid UTF-8 is a corrupt file, not a string with
 * replacement characters. Mirrors the history reader's decoding rule. */
const strictUtf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

type JsonRead =
  | { state: "ok"; value: unknown }
  | { state: "absent" }
  | { state: "malformed"; detail: string }
  | { state: "unreadable"; detail: string }
  | { state: "escape"; detail: string };

function errno(err: unknown): string | undefined {
  return (err as NodeJS.ErrnoException | undefined)?.code;
}


const normalize = (p: string) => (process.platform === "win32" ? resolve(p).toLowerCase() : resolve(p));

/**
 * Resolve one app-owned file for reading.
 *
 * Two separate boundaries, because one cannot stand in for the other:
 *
 *  * `containment` is the specific owned directory the recorded path must sit
 *    beneath — this clip's sidecar directory, or the words/recipes/reframe
 *    directory — so one clip's pointer cannot name another's document.
 *  * `chainRoot` is the **configured** history root, where the physical walk
 *    starts. The configured root itself and every directory between it and the
 *    file must be a real directory, and the file a real file. Starting the walk
 *    at a derived root such as `<history>/revisions/<clipId>` would step over
 *    its own ancestors, so a junction at `revisions` — or at the configured
 *    root — would be followed silently. A link anywhere in the chain is refused
 *    and never resolved: its target is not adopted as a new trusted root.
 *
 * A missing component is simply absent. Its parents above the configured root
 * are the user's chosen location and are not inspected. This is a static check
 * of the chain as it exists now, not a defence against a component being
 * swapped concurrently. It is the read-only counterpart of the write-side
 * ownership check in clip-revisions.ts; it creates nothing.
 */
async function inspectOwnedFile(
  chainRoot: string,
  containment: string,
  target: string,
): Promise<{ state: "ok" | "absent" | "escape" | "not-a-file"; detail?: string }> {
  const owner = resolve(containment);
  const contained = relative(normalize(owner), normalize(target));
  if (!contained || contained.startsWith("..") || isAbsolute(contained)) {
    return { state: "escape", detail: "the recorded path is not beneath its configured directory" };
  }
  const base = resolve(chainRoot);
  const rel = relative(normalize(base), normalize(target));
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
    return { state: "escape", detail: "the recorded path is not beneath the configured history root" };
  }
  let current = base;
  const parts = rel.split(sep);
  for (let i = 0; i <= parts.length; i++) {
    if (i > 0) current = join(current, parts[i - 1]);
    let st;
    try {
      st = await lstat(current);
    } catch (err) {
      const code = errno(err);
      if (code === "ENOENT" || code === "ENOTDIR") return { state: "absent" };
      return { state: "not-a-file", detail: `could not inspect the path (${code ?? "unknown error"})` };
    }
    if (st.isSymbolicLink()) {
      return {
        state: "escape",
        detail: i === 0
          ? "the configured history root is a link or junction; refusing to read through it"
          : "a link or junction is in the path; refusing to read through it",
      };
    }
    const last = i === parts.length;
    if (last ? !st.isFile() : !st.isDirectory()) {
      return { state: "not-a-file", detail: last ? "the recorded path is not a regular file" : "a path component is not a directory" };
    }
  }
  return { state: "ok" };
}

/** Read one owned JSON document strictly: encoding, syntax and containment are
 * each a distinct outcome, and none of them ever returns file contents. */
async function readOwnedJson(chainRoot: string, containment: string, target: string): Promise<JsonRead> {
  const owned = await inspectOwnedFile(chainRoot, containment, target);
  if (owned.state === "absent") return { state: "absent" };
  if (owned.state === "escape") return { state: "escape", detail: owned.detail ?? "path escapes its configured directory" };
  if (owned.state === "not-a-file") return { state: "unreadable", detail: owned.detail ?? "not a readable file" };
  let bytes: Buffer;
  try {
    bytes = await readFile(target);
  } catch (err) {
    const code = errno(err);
    if (code === "ENOENT") return { state: "absent" };
    return { state: "unreadable", detail: `the file could not be read (${code ?? "unknown error"})` };
  }
  let text: string;
  try {
    text = strictUtf8.decode(bytes).replace(/^﻿/, "");
  } catch {
    return { state: "malformed", detail: "the file is not valid UTF-8" };
  }
  try {
    return { state: "ok", value: JSON.parse(text) };
  } catch {
    return { state: "malformed", detail: "the file is not valid JSON" };
  }
}

// ---------------------------------------------------------------------------
// Projections
// ---------------------------------------------------------------------------

const nameOf = (p: unknown): string | null => (isNonEmptyString(p) ? basename(p) : null);
const stringOr = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const numberOr = (v: unknown): number | null => (isFiniteNumber(v) ? v : null);
const boolOr = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

async function inspectFile(path: unknown, recordedBytes: number | null): Promise<EditorContextFile> {
  if (!isNonEmptyString(path)) {
    return { name: null, state: "unrecorded", bytes: null, recorded_bytes: recordedBytes, size_matches: null, integrity_verified: false, detail: "no path is recorded for this file" };
  }
  const name = basename(path);
  let st;
  try {
    st = await stat(path);
  } catch (err) {
    const code = errno(err);
    const state: EditorFileState = code === "ENOENT" || code === "ENOTDIR" ? "missing" : "unreadable";
    return {
      name,
      state,
      bytes: null,
      recorded_bytes: recordedBytes,
      size_matches: null,
      integrity_verified: false,
      detail: state === "missing" ? "the file is no longer on disk" : `the file could not be inspected (${code ?? "unknown error"})`,
    };
  }
  if (!st.isFile()) {
    return { name, state: "not_a_file", bytes: null, recorded_bytes: recordedBytes, size_matches: null, integrity_verified: false, detail: "the recorded path is not a regular file" };
  }
  return {
    name,
    state: "available",
    bytes: st.size,
    recorded_bytes: recordedBytes,
    size_matches: recordedBytes === null ? null : st.size === recordedBytes,
    integrity_verified: false,
    detail: recordedBytes !== null && st.size !== recordedBytes ? "the file's size differs from the size recorded at save" : null,
  };
}

/** `fs.realpath`, the same resolution `realpathSync` performs for the route;
 * `fs/promises` would use the platform's native resolver instead. */
const resolveLikeRoute = promisify(realpath);

/**
 * The entry summary resolved exactly as `serveClipById` resolves it: follow
 * links to the real path and keep it only when that is a regular file. This is
 * the served media the clip list already names, not an app-owned document, so
 * the owned-path link refusal above does not apply to it and is not bypassed
 * by it. Nothing is opened; a path that does not resolve is reported as such.
 */
async function resolveServedFile(summary: unknown): Promise<ServedFileFact | null> {
  if (!isNonEmptyString(summary)) return null;
  try {
    const real = await resolveLikeRoute(summary);
    return { path: summary, resolvedFile: (await stat(real)).isFile() ? real : null };
  } catch {
    return { path: summary, resolvedFile: null };
  }
}

function projectRecipe(recipe: ExactRenderRecipe): EditorContextRecipe {
  return {
    source_name: nameOf(recipe.source_video),
    title: recipe.title,
    caption_style: recipe.caption_style,
    caption_position: stringOr(recipe.caption_position),
    caption_font_scale: numberOr(recipe.caption_font_scale),
    clean_fillers: boolOr(recipe.clean_fillers),
    crop_strategy: recipe.crop_strategy,
    // Validated at document load, so this maps rather than filters: a recipe
    // holding an unusable keyframe never reaches here as a shorter list.
    crop_keyframes: Array.isArray(recipe.crop_keyframes) ? recipe.crop_keyframes.map((k) => ({ t: k.t, x_pct: k.x_pct })) : null,
    crop_keyframe_domain: Array.isArray(recipe.crop_keyframes) ? "content" : null,
    has_foreground_framing: !!recipe.foreground_framing,
    format: recipe.format,
    logo: { selected: isNonEmptyString(recipe.logo_path), name: nameOf(recipe.logo_path), position: stringOr(recipe.logo_position) },
    intro: { selected: isNonEmptyString(recipe.intro_path), name: nameOf(recipe.intro_path) },
    outro: { selected: isNonEmptyString(recipe.outro_path), name: nameOf(recipe.outro_path) },
    bookend_fade: numberOr(recipe.bookend_fade),
    keep_caption_overlay: boolOr(recipe.keep_caption_overlay),
    allow_ass_fallback: boolOr(recipe.allow_ass_fallback),
  };
}

/** Validated at document load: every number below is a recorded number, never
 * a wrong type coerced to zero. */
function projectBookend(kind: "intro" | "outro", raw: unknown): EditorContextBookend | null {
  if (!isPlainObject(raw)) return null;
  const join = raw.join_inputs as { main_duration: number; appended_duration: number } | undefined;
  return {
    kind,
    output_start: raw.output_start as number,
    output_end: raw.output_end as number,
    asset_duration: raw.asset_duration as number,
    requested_fade: numberOr(raw.requested_fade),
    applied_overlap: raw.applied_overlap as number,
    branch: raw.branch as string,
    measured_output_duration: numberOr(raw.measured_output_duration),
    join_inputs: join ? { main_duration: join.main_duration, appended_duration: join.appended_duration } : null,
  };
}

/** The card record is validated at document load, so an applied card always
 * carries the composed image this reads. */
function projectCard(doc: ClipRevisionDocument): EditorContextCard {
  const card = doc.thumbnail_card;
  if (card && card.applied) {
    return {
      requested: true,
      applied: true,
      image: { sha256: card.image.sha256, bytes: card.image.bytes, name: basename(card.image.path) },
      note: card.note,
    };
  }
  return {
    requested: !!card?.requested,
    applied: false,
    image: null,
    note: card?.note ?? "no opening card is recorded for this revision",
  };
}

/** Projects an already validated list. `total` is the true stored count, which
 * stays truthful even when the served array is capped. */
function projectWords(words: readonly unknown[], limit: number): { words: EditorWord[]; total: number; truncated: boolean } {
  const out: EditorWord[] = [];
  for (const raw of words.slice(0, limit)) {
    const w = raw as Record<string, unknown>;
    const word: EditorWord = { word: w.word as string, start: w.start as number, end: w.end as number };
    if (typeof w.speaker === "string" || w.speaker === null) word.speaker = w.speaker as string | null;
    if (isFiniteNumber(w.confidence)) word.confidence = w.confidence;
    out.push(word);
  }
  return { words: out, total: words.length, truncated: words.length > limit };
}

/** Clip-bounded transcripts are small; this only caps the served array when a
 * sidecar or receipt holds an unusually long list. The count stays exact. */
const WORD_LIMIT = 20000;

type ProjectedWords = ReturnType<typeof projectWords>;

// ---------------------------------------------------------------------------
// Legacy recovery inputs
// ---------------------------------------------------------------------------
//
// Legacy data is never an error — an old clip's text and media stay usable — but
// the same honesty rule applies: a stored value this response reports must be
// usable, or the recovery input it came from is reported as malformed. Nothing
// here repairs, rewrites or removes a bad sidecar, and unknown stored fields
// are left untouched on disk and out of the response.

const isBool = (v: unknown): v is boolean => typeof v === "boolean";

/** An optional nullable field: absent or explicitly null is fine. */
const optionalOrNull = (v: unknown, ok: (x: unknown) => boolean): boolean => v === undefined || v === null || ok(v);

/** A requested interval as a legacy writer stored it, in the order it was stored. */
function validRequestedSegment(s: unknown): s is { start: number; end: number } {
  return isPlainObject(s) && isFiniteNumber(s.start) && isFiniteNumber(s.end) && s.start >= 0 && s.end >= s.start;
}

/** Name of the first consumed legacy recipe field that is present but unusable. */
function invalidLegacyRecipeField(raw: Record<string, unknown>): string | null {
  for (const key of ["caption_style", "caption_position", "crop_strategy", "format", "logo_path", "logo_position", "intro_path", "outro_path"] as const) {
    if (!optionalOrNull(raw[key], (v) => typeof v === "string")) return key;
  }
  if (!optionalOrNull(raw.caption_font_scale, isFiniteNumber)) return "caption_font_scale";
  if (!optionalOrNull(raw.clean_fillers, isBool)) return "clean_fillers";
  if (!optionalOrNull(raw.transcript_words, Array.isArray)) return "transcript_words";
  if (raw.keep_segments !== undefined && raw.keep_segments !== null) {
    if (!Array.isArray(raw.keep_segments)) return "keep_segments";
    const bad = raw.keep_segments.findIndex((s) => !validRequestedSegment(s));
    if (bad !== -1) return `keep_segments[${bad}]`;
  }
  return null;
}

/** Name of the first consumed legacy reframe field that is present but unusable. */
function invalidLegacyReframeField(raw: Record<string, unknown>): string | null {
  for (const key of ["inSec", "outSec"] as const) {
    if (!optionalOrNull(raw[key], isFiniteNumber)) return key;
  }
  return optionalOrNull(raw.keyframes, Array.isArray) ? null : "keyframes";
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface ClipEditorContextOptions {
  /** Defaults to the configured clips.json. */
  historyPath?: string;
  /** Defaults to the configured history directory; owns sidecars and documents. */
  historyRoot?: string;
}

export class ClipEditorContextService {
  private readonly historyPath: string;
  private readonly historyRoot: string;

  constructor(options: ClipEditorContextOptions = {}) {
    this.historyPath = resolve(options.historyPath ?? paths.clipsHistory);
    this.historyRoot = resolve(options.historyRoot ?? paths.history);
  }

  /** `<history>/revisions/<clipId>`: the only directory this read opens documents in. */
  private sidecarRoot(clipId: string): string {
    return join(this.historyRoot, REVISION_SIDECARS, clipId);
  }

  /**
   * Resolve one clip into its editor context. Throws EditorContextError with a
   * stable code; every other failure is a programming error, not a response.
   */
  async read(rawClipId: unknown): Promise<EditorContextResponse> {
    const clipId = this.validateClipId(rawClipId);
    const captured_at = new Date().toISOString();
    const diagnostics: EditorContextDiagnostic[] = [];

    const entry = await this.captureEntry(clipId, diagnostics);
    const state = entry.revisions === undefined || entry.revisions === null ? null : validateRevisionState(entry.revisions);

    const current = state?.current ?? null;
    // Provenance decides, and a validated "exact" pointer always names its
    // document. Only a valid legacy version zero takes the recovery branch: a
    // pointer claiming an exact render without a document was already refused
    // as corrupt state, rather than quietly answering from legacy sidecars.
    const isExactRevision = !!current && current.provenance === "exact";

    // Reading is this service's job; deciding what may be claimed about what
    // was read is the read contract's. Both documents are parsed here and then
    // validated together with the pointer and the clip entry's own summary, so
    // no response builder below re-decides a cross-record fact for itself.
    const revisionDocument = isExactRevision ? await this.readRevisionDocument(clipId, current!) : null;
    const draftDocument = state?.draft ? await this.readDraftDocument(clipId, state.draft) : null;
    const record = validateEditorRecord({
      clipId,
      entrySummary: entry.output_path,
      servedFile: await resolveServedFile(entry.output_path),
      state,
      revisionDocument,
      draftDocument,
    });
    const document = record.document;
    const draft = record.draft ? this.projectDraft(record.draft) : null;

    const legacyReason = !state ? "untracked" : current ? "legacy-unversioned-revision" : "tracked-without-revision";
    const recovered = document ? null : await this.buildLegacy(clipId, entry, legacyReason, diagnostics);
    const legacy = recovered?.legacy ?? null;

    const media = await this.buildMedia(clipId, entry, document, current, record, diagnostics);
    const timing = this.buildTiming(entry, document, legacy, diagnostics);
    const transcript = this.buildTranscript(entry, document, legacy, recovered?.words ?? null, diagnostics);
    const operations = this.buildOperations(state, diagnostics);

    if (media.output.state === "missing" || media.output.state === "not_a_file") {
      diagnostics.push({ code: "MEDIA_MISSING", scope: "media.output", detail: "The clip's video is not on disk; its text and publishing metadata remain editable." });
    }
    if (media.source.state === "missing" || media.source.state === "not_a_file") {
      diagnostics.push({ code: "SOURCE_MISSING", scope: "media.source", detail: "The original recording is not at its recorded location; no search for it is made." });
    }

    return {
      version: EDITOR_CONTEXT_VERSION,
      identity: {
        clip_id: clipId,
        captured_at,
        tracked: !!state,
        incarnation: state?.incarnation ?? null,
        revision_version: state?.revision_version ?? null,
        draft_version: state?.draft_version ?? null,
        note: IDENTITY_NOTE,
      },
      clip: this.buildClip(entry, diagnostics),
      media,
      revision: current ? this.buildRevision(current, document) : null,
      draft,
      operations,
      timing,
      transcript,
      legacy,
      capabilities: this.buildCapabilities(media, document, transcript, timing, record),
      diagnostics,
    };
  }

  // -- inputs ---------------------------------------------------------------

  private validateClipId(value: unknown): string {
    if (typeof value !== "string" || !ID_RE.test(value) || value.includes("..")) {
      throw new EditorContextError("INVALID_CLIP_ID", 400, "The clip id must be a short identifier of letters, digits, dot, underscore or hyphen.");
    }
    return value;
  }

  /**
   * The first owned read of all, proved before `clips.json` is opened.
   *
   * Everything this service reads afterwards hangs off the clip list, so
   * checking the revision, draft and sidecar chains while the list itself came
   * through a linked root protects nothing: the clip's own title and transcript
   * have already been serialised out of a file outside the configured storage.
   * The physical walk therefore starts at the configured history root itself
   * and covers every component down to the history file, the file included, and
   * a link anywhere in that chain is refused without being resolved.
   *
   * Ordinary semantics are untouched. A missing root or missing file is absent,
   * which reads as an empty Library and answers 404 for a specific clip, and a
   * file that exists but is the wrong kind stays a distinguishable unreadable
   * history. No ancestor above the configured root is inspected, and this stays
   * a static check: a component swapped between the check and the read is not
   * defended against, and external legacy media paths are unaffected.
   */
  private async assertHistoryOwned(): Promise<void> {
    const owned = await inspectOwnedFile(this.historyRoot, this.historyRoot, this.historyPath);
    if (owned.state === "escape") {
      throw new EditorContextError("OWNERSHIP_ESCAPE", 500, `The clip history is not inside its configured storage: ${owned.detail}. Nothing was read from it.`);
    }
    if (owned.state === "not-a-file") {
      throw new EditorContextError("HISTORY_UNREADABLE", 500, `The clip history file could not be used: ${owned.detail}. It was not modified.`);
    }
  }

  /**
   * One strict read of the clip list, then a detached copy. Reads are not taken
   * under the mutation lock: the history file is replaced atomically, so a
   * single read always observes one whole version of it, and holding the lock
   * would queue every editor open behind a running save.
   */
  private async captureEntry(clipId: string, diagnostics: EditorContextDiagnostic[]): Promise<ClipHistoryEntry> {
    if (isDemoMode()) {
      const demo = demoClips().find((e) => e.id === clipId);
      if (!demo) throw new EditorContextError("CLIP_NOT_FOUND", 404, "No clip with that id exists.");
      diagnostics.push({ code: "DEMO_FIXTURE", scope: "identity", detail: "Demo mode serves fixture clips; no history file, document or sidecar is read." });
      return structuredClone(demo);
    }
    await this.assertHistoryOwned();
    let entries: ClipHistoryEntry[];
    try {
      entries = (await readHistoryStrict(this.historyPath)).entries;
    } catch (err) {
      if (err instanceof HistoryReadError) {
        // The file exists but cannot be used. Answering 404 or an empty Library
        // here would look exactly like a deleted clip.
        log.warn(`editor context refused a corrupt clip history: ${err.code}`);
        throw new EditorContextError(err.code, 500, "The clip history file exists but could not be read; it was not modified.", { code: err.code });
      }
      throw err;
    }
    const found = entries.find((e) => e.id === clipId);
    if (!found) throw new EditorContextError("CLIP_NOT_FOUND", 404, "No clip with that id exists.");
    return structuredClone(found);
  }

  // -- tracked documents ----------------------------------------------------

  /** Read the immutable document. Nothing is judged here beyond whether the
   * file is inside its owned directory and holds JSON at all. */
  private async readRevisionDocument(clipId: string, pointer: RevisionPointer): Promise<unknown> {
    // Guaranteed by the pointer contract for an exact revision; re-checked
    // rather than cast, so no path is ever built from null.
    if (!isNonEmptyString(pointer.path)) {
      throw new EditorContextError("REVISION_STATE_INVALID", 500, "The clip's revision state is not usable: the current revision is marked exact but names no document.", { detail: "the current revision is marked exact but names no document" });
    }
    const read = await readOwnedJson(this.historyRoot, this.sidecarRoot(clipId), pointer.path);
    if (read.state === "escape") {
      throw new EditorContextError("OWNERSHIP_ESCAPE", 500, `The saved revision document is not inside this clip's storage: ${read.detail}.`);
    }
    if (read.state === "absent") {
      throw new EditorContextError("REVISION_DOCUMENT_UNAVAILABLE", 500, "The clip's current revision names a document that is no longer on disk.");
    }
    if (read.state === "unreadable") {
      throw new EditorContextError("REVISION_DOCUMENT_UNAVAILABLE", 500, `The clip's current revision document could not be read: ${read.detail}.`);
    }
    if (read.state === "malformed") {
      throw new EditorContextError("REVISION_DOCUMENT_INVALID", 500, `The clip's saved revision document is not usable: ${read.detail}.`, { detail: read.detail });
    }
    return read.value;
  }

  private async readDraftDocument(clipId: string, pointer: DraftPointer): Promise<unknown> {
    const read = await readOwnedJson(this.historyRoot, this.sidecarRoot(clipId), pointer.path);
    if (read.state === "escape") {
      throw new EditorContextError("OWNERSHIP_ESCAPE", 500, `The saved draft document is not inside this clip's storage: ${read.detail}.`);
    }
    if (read.state === "absent") {
      throw new EditorContextError("DRAFT_DOCUMENT_UNAVAILABLE", 500, "The clip's draft names a document that is no longer on disk.");
    }
    if (read.state === "unreadable") {
      throw new EditorContextError("DRAFT_DOCUMENT_UNAVAILABLE", 500, `The clip's draft document could not be read: ${read.detail}.`);
    }
    if (read.state === "malformed") {
      throw new EditorContextError("DRAFT_DOCUMENT_INVALID", 500, `The clip's saved draft document is not usable: ${read.detail}.`, { detail: read.detail });
    }
    return read.value;
  }

  /** Projects a draft the read contract already validated. */
  private projectDraft(doc: ValidatedDraftDocument): EditorContextDraft {
    const words = doc.draft.source_words;
    const card = isPlainObject(doc.draft.thumbnail_card) ? doc.draft.thumbnail_card : null;
    return {
      version: doc.version,
      saved_at: doc.saved_at,
      recipe: projectRecipe(doc.draft.recipe),
      thumbnail_card: {
        selected: !!card,
        image_sha256: card && isNonEmptyString(card.image_sha256) ? card.image_sha256 : null,
        image_name: card ? nameOf(card.image_path) : null,
      },
      words_input: Array.isArray(words) ? "supplied" : "unavailable",
      source_word_count: Array.isArray(words) ? words.length : null,
      note: typeof doc.draft.note === "string" ? doc.draft.note : null,
    };
  }

  // -- legacy recovery ------------------------------------------------------

  private async buildLegacy(
    clipId: string,
    entry: ClipHistoryEntry,
    reason: EditorContextLegacy["reason"],
    diagnostics: EditorContextDiagnostic[],
  ): Promise<{ legacy: EditorContextLegacy; words: ProjectedWords | null }> {
    const demo = isDemoMode();
    const readSidecar = async (dir: string): Promise<{ sidecar: EditorContextSidecar; value: unknown }> => {
      if (demo) return { sidecar: { state: "absent", detail: "demo mode reads no sidecars" }, value: null };
      const read = await readOwnedJson(this.historyRoot, join(this.historyRoot, dir), join(this.historyRoot, dir, `${clipId}.json`));
      if (read.state === "ok") return { sidecar: { state: "present", detail: null }, value: read.value };
      if (read.state === "absent") return { sidecar: { state: "absent", detail: null }, value: null };
      // A link in an app-owned sidecar directory is an ownership escape and
      // says so. Collapsing it into "unreadable" would hide the one sidecar
      // state that is about the boundary rather than about the file, and would
      // read exactly like a permission error on an ordinary sidecar. Genuinely
      // unreadable regular sidecars keep their own state below.
      if (read.state === "escape") {
        throw new EditorContextError("OWNERSHIP_ESCAPE", 500, `The clip's ${dir} recovery input is not inside its configured directory: ${read.detail}.`);
      }
      return { sidecar: { state: read.state, detail: read.detail }, value: null };
    };

    const wordsRead = await readSidecar("words");
    const recipeRead = await readSidecar("recipes");
    const reframeRead = await readSidecar("reframe");

    // The whole list is validated before it is called a usable transcript. A
    // list holding an invalid element, or one whose timing runs backwards, is
    // malformed recovery input: filtering the bad records away would leave a
    // shorter list that reads like a real transcript, and a wholly filtered one
    // would be indistinguishable from a transcript that was saved empty. A
    // valid explicit [] stays supplied-empty. Nothing on disk is touched.
    const words = { ...wordsRead.sidecar };
    let wordValues: readonly unknown[] | null = null;
    if (words.state === "present") {
      if (!Array.isArray(wordsRead.value)) {
        words.state = "malformed";
        words.detail = "the words sidecar does not contain a list";
      } else if (wordsRead.value.length === 0) {
        words.state = "empty";
        words.detail = "a words list was saved and is empty";
      } else {
        const bad = firstInvalidWord(wordsRead.value);
        if (bad !== -1) {
          words.state = "malformed";
          words.detail = `word ${bad} is not a usable record: each needs text with finite start and end seconds that do not run backwards`;
        } else {
          wordValues = wordsRead.value;
        }
      }
    }
    const recipeSidecar = { ...recipeRead.sidecar };
    let recipeValue: Record<string, unknown> | null = null;
    if (recipeSidecar.state === "present") {
      if (!isPlainObject(recipeRead.value)) {
        recipeSidecar.state = "malformed";
        recipeSidecar.detail = "the recipe sidecar does not contain an object";
      } else if (Object.keys(recipeRead.value).length === 0) {
        recipeSidecar.state = "empty";
        recipeSidecar.detail = "a recipe was saved and is empty";
      } else {
        // Same rule as the words above: a present but unusable consumed field
        // makes the recovery input malformed. Coercing it to null would drop
        // the disagreement silently and leave a recipe that looks trustworthy.
        const bad = invalidLegacyRecipeField(recipeRead.value);
        if (bad) {
          recipeSidecar.state = "malformed";
          recipeSidecar.detail = `its ${bad} is not a usable value`;
        } else {
          recipeValue = recipeRead.value;
        }
      }
    }
    const reframeSidecar = { ...reframeRead.sidecar };
    let reframeValue: Record<string, unknown> | null = null;
    if (reframeSidecar.state === "present") {
      if (!isPlainObject(reframeRead.value)) {
        reframeSidecar.state = "malformed";
        reframeSidecar.detail = "the reframe sidecar does not contain an object";
      } else if (Object.keys(reframeRead.value).length === 0) {
        reframeSidecar.state = "empty";
        reframeSidecar.detail = "reframe state was saved and is empty";
      } else {
        const bad = invalidLegacyReframeField(reframeRead.value);
        if (bad) {
          reframeSidecar.state = "malformed";
          reframeSidecar.detail = `its ${bad} is not a usable value`;
        } else {
          reframeValue = reframeRead.value;
        }
      }
    }

    for (const [name, sidecar] of [["words", words], ["recipe", recipeSidecar], ["reframe", reframeSidecar]] as const) {
      if (sidecar.state === "malformed") diagnostics.push({ code: "SIDECAR_MALFORMED", scope: `legacy.sidecars.${name}`, detail: `The ${name} recovery input is unusable: ${sidecar.detail}.` });
      if (sidecar.state === "unreadable") diagnostics.push({ code: "SIDECAR_UNREADABLE", scope: `legacy.sidecars.${name}`, detail: `The ${name} recovery input could not be read: ${sidecar.detail}.` });
      if (sidecar.state === "empty") diagnostics.push({ code: "SIDECAR_EMPTY", scope: `legacy.sidecars.${name}`, detail: `The ${name} recovery input was saved empty; that is distinct from never having been saved.` });
    }

    const recipe = recipeValue ? this.projectLegacyRecipe(recipeValue) : null;
    const reframe = reframeValue
      ? {
          in_second: numberOr(reframeValue.inSec),
          out_second: numberOr(reframeValue.outSec),
          keyframe_count: Array.isArray(reframeValue.keyframes) ? reframeValue.keyframes.length : null,
        }
      : null;

    const conflicts = this.findConflicts(entry, recipe, reframe);
    for (const conflict of conflicts) {
      diagnostics.push({ code: "LEGACY_FIELD_CONFLICT", scope: `legacy.${conflict.field}`, detail: conflict.detail });
    }

    const thumbnail = await this.buildLegacyThumbnail(entry, diagnostics);
    if (thumbnail?.selected) {
      diagnostics.push({ code: "THUMBNAIL_BAKE_UNKNOWN", scope: "legacy.thumbnail", detail: "A thumbnail is selected for this clip; nothing records whether or when it was baked into the video." });
    }

    const needs: string[] = ["the effective cuts the legacy renderer made, which it never returned"];
    if (words.state !== "present") needs.push("a usable word-level transcript for this clip");
    else needs.push("a full source-absolute transcript, since the saved words cover only the requested range");
    if (entry.source_video) needs.push("the original recording, to re-establish exact timing");

    return {
      legacy: {
        reason,
        sidecars: { words, recipe: recipeSidecar, reframe: reframeSidecar },
        recipe,
        reframe,
        thumbnail,
        conflicts,
        recovery: {
          effective_cuts_known: false,
          reason: "LEGACY_TIMING_UNPROVEN",
          needs,
        },
      },
      // Projected once, from the same read that classified the sidecar, so the
      // transcript below cannot describe a different file than the one above.
      words: wordValues ? projectWords(wordValues, WORD_LIMIT) : null,
    };
  }

  /** Validated by invalidLegacyRecipeField before it gets here, so this maps
   * rather than filters. */
  private projectLegacyRecipe(raw: Record<string, unknown>): EditorContextLegacyRecipe {
    const segments = Array.isArray(raw.keep_segments)
      ? (raw.keep_segments as Array<{ start: number; end: number }>).map((s) => ({ start: s.start, end: s.end }))
      : null;
    return {
      caption_style: stringOr(raw.caption_style),
      caption_position: stringOr(raw.caption_position),
      caption_font_scale: numberOr(raw.caption_font_scale),
      crop_strategy: stringOr(raw.crop_strategy),
      format: stringOr(raw.format),
      clean_fillers: boolOr(raw.clean_fillers),
      logo: { selected: isNonEmptyString(raw.logo_path), name: nameOf(raw.logo_path), position: stringOr(raw.logo_position) },
      intro: { selected: isNonEmptyString(raw.intro_path), name: nameOf(raw.intro_path) },
      outro: { selected: isNonEmptyString(raw.outro_path), name: nameOf(raw.outro_path) },
      has_foreground_framing: !!raw.foreground_framing,
      requested_keep_segments: segments && segments.length ? segments : null,
      transcript_word_count: Array.isArray(raw.transcript_words) ? raw.transcript_words.length : null,
    };
  }

  /** Disagreement is reported, never resolved into a guessed faithful recipe. */
  private findConflicts(entry: ClipHistoryEntry, recipe: EditorContextLegacyRecipe | null, reframe: { in_second: number | null; out_second: number | null } | null): EditorContextConflict[] {
    const conflicts: EditorContextConflict[] = [];
    const add = (field: string, entryValue: unknown, otherSource: "legacy-recipe" | "legacy-reframe", otherValue: unknown, detail: string) => {
      conflicts.push({
        code: "LEGACY_FIELD_CONFLICT",
        field,
        values: [
          { source: "history-entry", value: describeValue(entryValue) },
          { source: otherSource, value: describeValue(otherValue) },
        ],
        detail,
      });
    };
    if (recipe) {
      const pairs: Array<[string, unknown, unknown]> = [
        ["caption_style", entry.caption_style, recipe.caption_style],
        ["crop_strategy", entry.crop_strategy, recipe.crop_strategy],
        ["format", entry.format ?? null, recipe.format],
        ["logo", nameOf(entry.logo_path), recipe.logo.name],
        ["intro", nameOf(entry.intro_path), recipe.intro.name],
        ["outro", nameOf(entry.outro_path), recipe.outro.name],
      ];
      for (const [field, a, b] of pairs) {
        if (b === null || a === null || a === undefined) continue;
        if (a !== b) add(field, a, "legacy-recipe", b, `The clip entry and the saved recipe disagree about ${field}; neither is treated as authoritative.`);
      }
      const entrySegments = Array.isArray(entry.keep_segments) ? entry.keep_segments : null;
      if (entrySegments && recipe.requested_keep_segments && JSON.stringify(entrySegments) !== JSON.stringify(recipe.requested_keep_segments)) {
        add("requested_keep_segments", entrySegments, "legacy-recipe", recipe.requested_keep_segments, "The clip entry and the saved recipe record different requested segments; no effective map is inferred from either.");
      }
    }
    if (reframe) {
      if (reframe.in_second !== null && isFiniteNumber(entry.start_second) && Math.abs(reframe.in_second - entry.start_second) > 0.001) {
        add("start_second", entry.start_second, "legacy-reframe", reframe.in_second, "The clip entry and the saved reframe state disagree about the trim start.");
      }
      if (reframe.out_second !== null && isFiniteNumber(entry.end_second) && Math.abs(reframe.out_second - entry.end_second) > 0.001) {
        add("end_second", entry.end_second, "legacy-reframe", reframe.out_second, "The clip entry and the saved reframe state disagree about the trim end.");
      }
    }
    return conflicts;
  }

  private async buildLegacyThumbnail(entry: ClipHistoryEntry, diagnostics: EditorContextDiagnostic[]): Promise<EditorContextLegacy["thumbnail"]> {
    const config = entry.thumbnail_config;
    if (!config) return null;
    const selected = isNonEmptyString(config.preview_path);
    const file = selected ? await inspectFile(config.preview_path, null) : null;
    if (config.card_seconds !== undefined && config.card_seconds !== null && !isFiniteNumber(config.card_seconds)) {
      diagnostics.push({
        code: "LEGACY_ENTRY_MALFORMED",
        scope: "legacy.thumbnail.card_seconds",
        detail: "The clip entry records an unusable thumbnail card length, so none is reported.",
      });
    }
    return {
      selected,
      state: file?.state ?? "unrecorded",
      card_seconds: numberOr(config.card_seconds),
      baked_provenance: "unknown",
      detail: "A selected legacy thumbnail asset. Nothing records when or how it was baked into the rendered file.",
    };
  }

  // -- assembled sections ---------------------------------------------------

  /** Clip text and publishing metadata, which stay available whatever else is
   * missing. A list that is not wholly usable is reported rather than quietly
   * shortened, so a dropped title cannot pass for one that was never saved. */
  private buildClip(entry: ClipHistoryEntry, diagnostics: EditorContextDiagnostic[]): EditorContextClip {
    let titles: string[] | null = null;
    if (Array.isArray(entry.generated_titles)) {
      if (entry.generated_titles.every((t) => typeof t === "string")) {
        titles = entry.generated_titles as string[];
      } else {
        diagnostics.push({
          code: "LEGACY_ENTRY_MALFORMED",
          scope: "clip.publishing.generated_titles",
          detail: "The clip entry's generated titles are not all text, so none of them are reported; the stored list is left untouched.",
        });
      }
    }
    const format = entry.format;
    return {
      title: typeof entry.title === "string" ? entry.title : "",
      created_at: stringOr(entry.created_at),
      content_type: stringOr(entry.content_type),
      format: format === "vertical" || format === "horizontal" || format === "square" ? (format as Format) : null,
      caption_style: stringOr(entry.caption_style),
      crop_strategy: stringOr(entry.crop_strategy),
      recorded_duration: numberOr(entry.duration),
      recorded_size_mb: numberOr(entry.file_size_mb),
      source_name: nameOf(entry.source_video),
      output_name: nameOf(entry.output_path),
      transcript_slice: stringOr(entry.transcript_slice),
      publishing: {
        generated_titles: titles,
        description: stringOr(entry.description),
        tags: stringOr(entry.tags),
        hashtags: stringOr(entry.hashtags),
        youtube_video_id: stringOr(entry.youtube_video_id),
      },
    };
  }

  private async buildMedia(
    clipId: string,
    entry: ClipHistoryEntry,
    document: ClipRevisionDocument | null,
    current: RevisionPointer | null,
    record: ValidatedEditorRecord,
    diagnostics: EditorContextDiagnostic[],
  ): Promise<EditorContextMedia> {
    // The current pointer owns the revision's file, so `media.output` keeps
    // describing it: that is the media the rest of this response is about, and
    // it stays useful context. What a summary other than `equal` removes is the
    // claim that the urls reach it — the capabilities go false and `serves`
    // goes null — because the by-id routes resolve through that summary and
    // answer 404 when it is absent or unusable.
    const servedPath = current?.output_path ?? entry.output_path;
    const summary = this.describeSummary(record);
    if (record.summary !== "equal" && record.summary !== "untracked") {
      diagnostics.push({ code: "COMMITTED_MEDIA_SUMMARY_DRIFT", scope: "media.urls", detail: summary.detail });
    }
    if (record.servedKind === "unsupported") {
      diagnostics.push({
        code: "MEDIA_KIND_UNSUPPORTED",
        scope: "media.urls",
        detail: "The file the existing preview and download urls resolve is not a container they stream; those routes refuse it whether or not the file is on disk.",
      });
    }
    const output = await inspectFile(servedPath, document ? document.files.main.bytes : null);
    const sourcePath = document ? document.recipe.source_video : entry.source_video;
    const source = await inspectFile(sourcePath, null);
    return {
      output,
      source,
      summary,
      urls: {
        preview: `/api/clips/${encodeURIComponent(clipId)}/preview`,
        download: `/api/clips/${encodeURIComponent(clipId)}/download`,
        note: URL_NOTE,
      },
      // What the urls served at the captured snapshot. A summary that is absent,
      // unusable or names another file leaves that unknown; a container those
      // routes refuse leaves it unreachable however readable the file is. A
      // file that is merely missing keeps its identity here, because the route
      // would serve exactly this revision again once it is back at that path.
      serves: current && record.summary === "equal" && record.servedKind !== "unsupported"
        ? { revision_id: current.revision_id, version: current.version, provenance: current.provenance }
        : null,
    };
  }

  /** The three separate facts behind a committed-media claim: what the entry
   * summary is, how it relates to the revision, and whether the by-id routes
   * could stream what it names. */
  private describeSummary(record: ValidatedEditorRecord): EditorContextMediaSummary {
    const detail: Record<MediaSummaryClass, string> = {
      untracked: "This clip has no saved revision, so the existing urls serve whatever its own output summary names.",
      absent: "The clip entry records no output summary. The existing preview and download urls resolve through it, so they answer 404 and nothing in this response serves the revision described.",
      invalid: "The clip entry's output summary is present but is not a usable path. The existing preview and download urls resolve through it, so they answer 404 and nothing in this response serves the revision described.",
      different: "The clip entry's own output summary no longer names the current revision's file. The revision and its timing are still described here, but the existing preview and download urls resolve through that summary, so nothing in this response serves the revision described; neither file is treated as the right one.",
      equal: "The clip entry's output summary names the current revision's file, which is what the existing preview and download urls resolve.",
    };
    return { state: record.summary, served_kind: record.servedKind, detail: detail[record.summary] };
  }

  private buildRevision(pointer: RevisionPointer, document: ClipRevisionDocument | null): EditorContextRevision {
    return {
      revision_id: pointer.revision_id,
      version: pointer.version,
      provenance: pointer.provenance,
      committed_at: pointer.committed_at,
      operation_id: pointer.operation_id,
      document: document ? this.projectDocument(document, pointer) : null,
    };
  }

  private projectDocument(doc: ClipRevisionDocument, pointer: RevisionPointer): EditorContextRevisionDocument {
    const final = doc.final_composition ?? null;
    const artifactOf = (file: { bytes: number } | null | undefined, placement: { time_domain: string; contains_card: boolean; placed_at: number } | null | undefined) => ({
      present: !!file,
      bytes: file ? file.bytes : null,
      time_domain: placement ? placement.time_domain : null,
      contains_card: placement ? placement.contains_card : null,
      placed_at: placement ? placement.placed_at : null,
    });
    const cardImage = final?.card ?? null;
    const cardPlacement = final?.artifacts?.card_image ?? null;
    return {
      schema: doc.schema,
      created_at: doc.created_at,
      operation_id: doc.operation_id,
      words_input: doc.words_input,
      recipe: projectRecipe(doc.recipe),
      thumbnail_card: projectCard(doc),
      bookends: {
        intro: projectBookend("intro", doc.bookends?.intro),
        outro: projectBookend("outro", doc.bookends?.outro),
      },
      has_final_composition: !!final,
      recorded_probe: {
        duration: doc.probe.duration,
        bytes: doc.probe.bytes,
        has_video: doc.probe.has_video,
        has_audio: doc.probe.has_audio,
      },
      artifacts: {
        caption_overlay: artifactOf(doc.files.caption_overlay, final?.artifacts?.caption_overlay ?? null),
        cropped_source: artifactOf(doc.files.cropped_source, final?.artifacts?.cropped_source ?? null),
        card_image: {
          present: !!cardImage,
          bytes: cardImage ? cardImage.image.bytes : null,
          sha256: cardImage ? cardImage.image.sha256 : null,
          placed_at: cardPlacement ? cardPlacement.placed_at : null,
          until: cardPlacement ? cardPlacement.until : null,
        },
      },
      dependency_group_count: Array.isArray(pointer.groups) ? pointer.groups.length : pointer.group_root ? 1 : 0,
    };
  }

  private buildTiming(
    entry: ClipHistoryEntry,
    document: ClipRevisionDocument | null,
    legacy: EditorContextLegacy | null,
    diagnostics: EditorContextDiagnostic[],
  ): EditorContextTiming {
    const requested_range = isFiniteNumber(entry.start_second) && isFiniteNumber(entry.end_second)
      ? { start_second: entry.start_second, end_second: entry.end_second, label: "requested" as const }
      : null;

    if (document) {
      const timeline = document.render_timeline;
      const final = document.final_composition ?? null;
      if (!final) {
        diagnostics.push({
          code: "DOCUMENT_PREDATES_FINAL_COMPOSITION",
          scope: "revision.document",
          detail: "This accepted revision was saved before final composition records existed; its raw render timing is read exactly as saved and no composition is inferred for it.",
        });
      }
      for (const kind of ["intro", "outro"] as const) {
        const bookend = document.bookends?.[kind];
        if (bookend && !bookend.join_inputs) {
          diagnostics.push({ code: "BOOKEND_JOIN_INPUTS_ABSENT", scope: `revision.document.bookends.${kind}`, detail: `The ${kind} was saved before join inputs were recorded; the join's own inputs are not available for it.` });
        }
      }
      // Validated at document load: each index is its own position, and the
      // content chain adds up, so this copies rather than repairs.
      const segments: EditorContextSegment[] = timeline.segments.map((s) => ({
        index: s.index,
        source_start: s.source_start,
        source_end: s.source_end,
        content_start: s.content_start,
        content_end: s.content_end,
        duration: s.duration,
      }));
      // Both maps are validated label-to-explanation strings, so quoting them
      // verbatim cannot carry an arbitrary nested object out to the client.
      const time_domains: EditorContextTiming["time_domains"] = [{ scope: "render_timeline", map: { ...timeline.time_domains } }];
      if (final?.time_domains) time_domains.push({ scope: "final_composition", map: { ...final.time_domains } });
      return {
        provenance: "exact-revision",
        effective_cuts_known: true,
        effective_segments: segments,
        requested_range,
        requested_keep_segments: null,
        raw_render: {
          content_duration: timeline.content_duration,
          content_duration_measured: timeline.content_duration_measured,
          content_to_output_offset: timeline.content_to_output_offset,
          output_duration: timeline.output_duration,
        },
        final_composition: final
          ? {
              card_offset: final.card_offset,
              content_offset: final.content_offset,
              content_duration: final.content_duration,
              output_duration: final.output.duration,
            }
          : null,
        frame_precision: timeline.frame_precision
          ? { source_variable_frame_rate: timeline.frame_precision.source_variable_frame_rate, note: timeline.frame_precision.note }
          : null,
        time_domains,
      };
    }

    const sources: Array<"history-entry" | "legacy-recipe"> = [];
    let segments: Array<{ start: number; end: number }> | null = null;
    if (Array.isArray(entry.keep_segments) && entry.keep_segments.length) {
      // Reported as requested inputs, so every element must be a real interval.
      // An unusable one is named rather than mapped into the response or
      // filtered out of it; the clip's other fields stay available.
      const bad = entry.keep_segments.findIndex((s) => !validRequestedSegment(s));
      if (bad === -1) {
        segments = (entry.keep_segments as Array<{ start: number; end: number }>).map((s) => ({ start: s.start, end: s.end }));
        sources.push("history-entry");
      } else {
        diagnostics.push({
          code: "LEGACY_ENTRY_MALFORMED",
          scope: "timing.requested_keep_segments",
          detail: `The clip entry's requested segment ${bad} is not a usable interval, so the entry's segments are not reported.`,
        });
      }
    }
    const legacySegments = legacy?.recipe?.requested_keep_segments ?? null;
    if (legacySegments) {
      if (!segments) segments = legacySegments;
      sources.push("legacy-recipe");
    }
    diagnostics.push({
      code: "LEGACY_TIMING_UNPROVEN",
      scope: "timing",
      detail: "These are the requested inputs stored for this clip. The legacy renderer sorts, snaps and can drop intervals without returning its effective map, so they do not describe the cuts in the rendered file.",
    });
    return {
      provenance: "legacy-entry",
      effective_cuts_known: false,
      effective_segments: null,
      requested_range,
      requested_keep_segments: segments ? { segments, label: "requested", sources } : null,
      raw_render: null,
      final_composition: null,
      frame_precision: null,
      time_domains: [],
    };
  }

  private buildTranscript(
    entry: ClipHistoryEntry,
    document: ClipRevisionDocument | null,
    legacy: EditorContextLegacy | null,
    legacyWords: ProjectedWords | null,
    diagnostics: EditorContextDiagnostic[],
  ): EditorContextTranscript {
    if (document) {
      const timeline = document.render_timeline;
      const supplied = document.words_input === "supplied";
      const sourceCount = Array.isArray(document.source_words) ? document.source_words.length : null;
      const content = projectWords(timeline.words.content, WORD_LIMIT);
      if (supplied && content.truncated) {
        diagnostics.push({
          code: "TRANSCRIPT_TRUNCATED",
          scope: "transcript.words",
          detail: `This revision records ${content.total} editorial words; the first ${content.words.length} are served and word_count stays the full figure.`,
        });
      }
      return {
        availability: !supplied ? "unavailable" : content.total === 0 ? "empty" : "available",
        provenance: supplied ? "saved-content-words" : "none",
        domain: supplied ? "content-relative" : null,
        words: supplied ? content.words : null,
        word_count: supplied ? content.total : null,
        text: timeline.words.content_text,
        widening_input: supplied && sourceCount
          ? { available: true, reason: "AVAILABLE", word_count: sourceCount }
          : { available: false, reason: supplied ? "TRANSCRIPT_EMPTY" : "TRANSCRIPT_UNAVAILABLE", word_count: sourceCount },
        detail: supplied
          ? "Content-relative editorial words from the saved receipt. The full source-absolute list retained for widening is described by word count, not served here."
          : "No transcript was supplied when this revision was saved; that is distinct from an empty one.",
      };
    }

    const unavailable = (availability: EditorContextTranscript["availability"], reason: EditorReasonCode, detail: string): EditorContextTranscript => ({
      availability,
      provenance: "none",
      domain: null,
      words: null,
      word_count: null,
      text: stringOr(entry.transcript_slice),
      widening_input: { available: false, reason, word_count: null },
      detail,
    });

    const sidecar = legacy?.sidecars.words;
    if (!sidecar || sidecar.state === "absent") {
      return unavailable("unavailable", "TRANSCRIPT_UNAVAILABLE", "No word-level transcript is stored for this clip.");
    }
    if (sidecar.state === "malformed") return unavailable("malformed", "TRANSCRIPT_MALFORMED", `The stored words are not usable: ${sidecar.detail}.`);
    if (sidecar.state === "unreadable") return unavailable("unreadable", "TRANSCRIPT_MALFORMED", `The stored words could not be read: ${sidecar.detail}.`);
    if (sidecar.state === "empty") return unavailable("empty", "TRANSCRIPT_EMPTY", "A words list was saved for this clip and is empty.");

    // Present and fully validated: the legacy writer sliced these to the clip's
    // requested range, so they are bounded source-absolute words, never proof
    // of full-source coverage.
    const words = legacyWords ?? { words: [], total: 0, truncated: false };
    diagnostics.push({
      code: "LEGACY_WORDS_BOUNDED",
      scope: "transcript",
      detail: "These words were sliced to the clip's requested range when it was rendered. They cannot establish full-source coverage, and no range is inferred from their first and last timestamps.",
    });
    if (words.truncated) {
      diagnostics.push({
        code: "TRANSCRIPT_TRUNCATED",
        scope: "transcript.words",
        detail: `This clip stores ${words.total} words; the first ${words.words.length} are served and word_count stays the full figure.`,
      });
    }
    return {
      availability: words.total ? "available" : "empty",
      provenance: "legacy-words-sidecar",
      domain: "source-absolute",
      words: words.words,
      word_count: words.total,
      text: stringOr(entry.transcript_slice),
      widening_input: { available: false, reason: "TRANSCRIPT_BOUNDED_ONLY", word_count: null },
      detail: "Bounded source-absolute words saved beside the legacy render. Widening a trim needs a full source transcript, which is not stored for this clip.",
    };
  }

  private buildOperations(state: ClipRevisionState | null, diagnostics: EditorContextDiagnostic[]): EditorContextOperations {
    const by_state: Record<OperationState, number> = { pending: 0, committed: 0, failed: 0, cancelled: 0, superseded: 0 };
    const operations = state?.operations ?? [];
    for (const op of operations) by_state[op.state]++;
    const pendingOp = operations.find((o) => o.state === "pending") ?? null;
    const last = operations.length ? operations[operations.length - 1] : null;
    if (pendingOp) {
      diagnostics.push({ code: "PENDING_OPERATION", scope: "operations", detail: "A save is recorded as still running for this clip; what it commits is not part of this captured view." });
    }
    if (last && last.state === "failed") {
      diagnostics.push({ code: "OPERATION_FAILED", scope: "operations", detail: "The most recent save for this clip did not commit; the previous revision is still the one served." });
    }
    return {
      total: operations.length,
      by_state,
      pending: pendingOp ? { operation_id: pendingOp.operation_id, started_at: pendingOp.started_at } : null,
      latest: last
        ? { operation_id: last.operation_id, state: last.state, started_at: last.started_at, ended_at: last.ended_at, has_error: !!last.error }
        : null,
      note: OPERATIONS_NOTE,
    };
  }

  private buildCapabilities(
    media: EditorContextMedia,
    document: ClipRevisionDocument | null,
    transcript: EditorContextTranscript,
    timing: EditorContextTiming,
    record: ValidatedEditorRecord,
  ): EditorContextCapability[] {
    const fileReason = (file: EditorContextFile, kind: "MEDIA" | "SOURCE"): EditorReasonCode => {
      switch (file.state) {
        case "available": return "AVAILABLE";
        case "missing": return `${kind}_MISSING` as EditorReasonCode;
        case "not_a_file": return `${kind}_NOT_A_FILE` as EditorReasonCode;
        case "unreadable": return `${kind}_UNREADABLE` as EditorReasonCode;
        default: return `${kind}_PATH_UNRECORDED` as EditorReasonCode;
      }
    };
    const outputReason = fileReason(media.output, "MEDIA");
    const sourceReason = fileReason(media.source, "SOURCE");
    // Both committed-media capabilities are claims about a url: that it serves
    // the revision described here, and that the route behind it will stream it.
    // `serveClipById` decides that in three steps — it needs the clip entry's
    // own summary, it needs that file to resolve, and it needs a container it
    // streams — so all three have to hold, in that order, and the file state
    // alone cannot decide them.
    const summaryOk = media.summary.state === "equal" || media.summary.state === "untracked";
    const fileOk = media.output.state === "available";
    const kindOk = media.summary.served_kind === "supported";
    const outputOk = summaryOk && fileOk && kindOk;
    const committedReason: EditorReasonCode = !summaryOk
      ? "COMMITTED_MEDIA_SUMMARY_DRIFT"
      : !fileOk ? outputReason : kindOk ? "AVAILABLE" : "MEDIA_KIND_UNSUPPORTED";
    const unavailableDetail = !summaryOk
      ? media.summary.detail
      : !fileOk ? "The saved video is not available to play or download."
        : "The file the existing urls resolve is not a container those routes stream, so they refuse it.";

    const capability = (id: EditorCapabilityId, available: boolean, reason: EditorReasonCode, detail: string): EditorContextCapability => ({ id, available, reason, detail });

    return [
      capability("play_committed_media", outputOk, committedReason, outputOk ? "The saved video is on disk and the existing preview url serves it." : unavailableDetail),
      capability("download_committed_media", outputOk, committedReason, outputOk ? "The existing download url serves the saved video." : unavailableDetail),
      capability("edit_writing_metadata", true, "AVAILABLE", "Title, transcript text and publishing metadata stay available whether or not any media survives."),
      capability(
        "known_effective_cuts",
        timing.effective_cuts_known,
        timing.effective_cuts_known ? "AVAILABLE" : "LEGACY_TIMING_UNPROVEN",
        timing.effective_cuts_known
          ? "This revision's receipt records the cuts the renderer actually made."
          : "Only requested inputs are stored; the cuts in the rendered file were never recorded.",
      ),
      capability(
        "widen_from_source_words",
        transcript.widening_input.available,
        transcript.widening_input.reason,
        transcript.widening_input.available
          ? "A full source-absolute transcript was retained when this revision was saved."
          : "No full source transcript is retained for this clip, so a trim cannot be widened from stored words.",
      ),
      capability("reopen_source_media", media.source.state === "available", sourceReason, media.source.state === "available" ? "The original recording is at its recorded location." : "The original recording is not at its recorded location; no search is made for it."),
      capability("save_revision", false, "WRITE_ROUTE_NOT_AVAILABLE", "This build serves editor context only. No route commits a revision, and nothing here should be read as a promise that one exists."),
      capability("adopt_for_revision_tracking", false, "WRITE_ROUTE_NOT_AVAILABLE", document ? "This clip is already tracked; adoption is not offered by this read." : "Reading a legacy clip never adopts it into revision tracking, and no route does so yet."),
    ];
  }
}
