// Finishing-action adapters (Writing Studio 1B.2b.4a).
//
// On a tracked clip, the legacy caption style, logo and opening-card actions no
// longer rewrite media in place: they save a new exact revision through the save
// service (src/services/clip-revisions.ts). This is the only production path that
// imports that service; nothing here starts tracking a clip.
//
// - Base. An adapter acts only when the clip's current pointer is an exact revision
//   whose document the service loads and whose recipe validates. Version zero, no
//   current revision, a malformed `revisions` value or an unusable document answer
//   REVISION_BASE_UNAVAILABLE: their effective cuts were never recorded, and
//   rebuilding from requested inputs would silently change content. A draft or a
//   pending operation answers REVISION_BUSY.
// - Derivation. The next recipe is the current document's recipe with only the
//   requested change, with its retained source words. An applied opening card
//   carries forward as the committed owned copy with its recorded SHA-256 unless
//   the action replaces it. Expected state comes from the entry the fence checked;
//   every request gets a new server-generated operation ID.
// - Unchanged requests. When the next recipe and card equal the current
//   revision's, nothing renders and the request succeeds; supplied thumbnail
//   settings are still stored. A retried legacy request is therefore harmless.
// - Inputs. Before a save, the source must still be the file the current revision
//   was rendered from (a regular file whose probe matches the renderer's recorded
//   duration, frame size and audio presence), each logo, intro and outro a regular
//   file, and the card image a regular file with its recorded SHA-256; anything else
//   answers REVISION_INPUT_MISSING. The renderer records no identity for the logo,
//   intro or outro beyond the path, so only a missing or non-regular file counts as
//   changed for them.
// - Failures. A render, composition, probe or commit failure answers
//   REVISION_SAVE_FAILED while the previous revision keeps serving. The error
//   message carries no path; the operation record in history keeps the detail.

import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { lstat } from "fs/promises";
import { promisify } from "util";
import { paths } from "../config/paths.js";
import { ClipsHistory } from "./clips-history.js";
import { ClipRevisionError, ClipRevisionService, revisionInputs, sameRecipe, sha256File } from "./clip-revisions.js";
import type { ClipHistoryEntry, RenderTimeline, WordTimestamp } from "../models/index.js";
import {
  OPENING_CARD_DURATION,
  type ClipRevisionDocument,
  type ClipRevisionState,
  type ExactRenderRecipe,
  type ExpectedState,
  type ThumbnailCardDescriptor,
} from "../models/clip-revisions.js";

const execFileAsync = promisify(execFile);

export type LegacyAdapterCode =
  | "REVISION_BASE_UNAVAILABLE"
  | "REVISION_BUSY"
  | "REVISION_INPUT_MISSING"
  | "REVISION_SAVE_FAILED"
  | "INVALID_CAPTION_STYLE";

/** Plain, path-free messages; clients show `error` as is. */
export const ADAPTER_MESSAGES: Readonly<Record<LegacyAdapterCode, string>> = {
  REVISION_BASE_UNAVAILABLE:
    "This clip has no exact saved Writing Studio revision to build on, so nothing was changed.",
  REVISION_BUSY:
    "This clip is being saved elsewhere or has unsaved Writing Studio edits, so nothing was changed. Try again when that finishes.",
  REVISION_INPUT_MISSING:
    "A file this clip is rebuilt from (its source video, logo, intro, outro or opening card image) is missing or has changed, so nothing was changed. " +
    "Restore the file, then try again.",
  REVISION_SAVE_FAILED:
    "The new version of this clip could not be saved, so the previous version is still in use. Try again.",
  INVALID_CAPTION_STYLE: "Choose a caption style of branded, hormozi, karaoke or subtle. Nothing was changed.",
};

const STATUS: Readonly<Record<LegacyAdapterCode, number>> = {
  REVISION_BASE_UNAVAILABLE: 409,
  REVISION_BUSY: 409,
  REVISION_INPUT_MISSING: 409,
  REVISION_SAVE_FAILED: 500,
  INVALID_CAPTION_STYLE: 400,
};

/** A finishing action that was not saved. `operationId` names the save it started, if any. */
export class LegacyAdapterError extends Error {
  readonly code: LegacyAdapterCode;
  readonly status: number;
  readonly operationId: string | null;
  constructor(code: LegacyAdapterCode, operationId: string | null = null) {
    super(ADAPTER_MESSAGES[code]);
    this.name = "LegacyAdapterError";
    this.code = code;
    this.status = STATUS[code];
    this.operationId = operationId;
  }
}

/** The caption styles `clips edit` accepts. */
export const CAPTION_STYLES: readonly string[] = ["branded", "hormozi", "karaoke", "subtle"];

/** The current revision a finishing action builds on, checked before any work. */
export interface AdapterBase {
  clipId: string;
  expected: ExpectedState;
  doc: ClipRevisionDocument;
  recipe: ExactRenderRecipe;
  sourceWords: WordTimestamp[] | null;
  /** The applied card as its committed owned copy, or null. */
  card: ThumbnailCardDescriptor | null;
}

export interface AdapterChange {
  /** Edits a copy of the current recipe. */
  recipe?: (recipe: ExactRenderRecipe) => void;
  /** Replaces the card; omitted carries the current one. */
  card?: ThumbnailCardDescriptor | null;
  /** Legacy thumbnail settings to store with the result. */
  thumbnailMetadata?: Record<string, unknown>;
}

export interface AdapterOutcome {
  /** False when the request equalled the current revision and nothing rendered. */
  committed: boolean;
  operationId: string | null;
  /** The clip entry after the action. */
  entry: ClipHistoryEntry | undefined;
}

/** Source facts the renderer records in its receipt. */
export interface SourceFacts {
  duration: number | null;
  width: number | null;
  height: number | null;
  has_audio: boolean;
}
export type SourceProbeFn = (path: string) => Promise<SourceFacts>;

export interface LegacyAdapterOptions {
  history?: ClipsHistory;
  /** Defaults to a service over the same history. */
  service?: ClipRevisionService;
  sourceProbe?: SourceProbeFn;
  operationId?: () => string;
}

/** Durations are compared within this many seconds; both sides come from ffprobe's container duration. */
const SOURCE_DURATION_TOLERANCE = 0.01;

const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** A `revisions` value this adapter can read; anything else is malformed. */
function readableState(value: unknown): value is ClipRevisionState {
  if (!isPlainObject(value)) return false;
  return value.schema === 1 && typeof value.incarnation === "string" && value.incarnation !== ""
    && isCount(value.draft_version) && isCount(value.revision_version)
    && (value.draft === null || isPlainObject(value.draft))
    && (value.current === null || isPlainObject(value.current))
    && Array.isArray(value.operations) && value.operations.every(isPlainObject);
}

async function isRegularFile(path: unknown): Promise<boolean> {
  if (typeof path !== "string" || !path) return false;
  const st = await lstat(path).catch(() => null);
  return !!st && st.isFile();
}

/** A regular file's SHA-256, or null when it is missing, not a regular file or unreadable. */
async function hashOf(path: string): Promise<string | null> {
  return (await isRegularFile(path)) ? sha256File(path).catch(() => null) : null;
}

/** The same fields backend/services/exact_render.probe_media records for the source. */
export async function ffprobeSource(path: string): Promise<SourceFacts> {
  const { stdout } = await execFileAsync(paths.ffprobePath, ["-v", "error", "-show_streams", "-show_format", "-of", "json", path], {
    windowsHide: true,
    maxBuffer: 16 << 20,
  });
  const parsed = JSON.parse(stdout) as { format?: { duration?: string }; streams?: Array<{ codec_type?: string; width?: number; height?: number }> };
  const streams = parsed.streams ?? [];
  const video = streams.find((s) => s.codec_type === "video");
  const duration = Number(parsed.format?.duration);
  return {
    duration: Number.isFinite(duration) && duration > 0 ? duration : null,
    width: Number(video?.width ?? 0) || null,
    height: Number(video?.height ?? 0) || null,
    has_audio: streams.some((s) => s.codec_type === "audio"),
  };
}

function sameSource(now: SourceFacts, recorded: RenderTimeline["source"]): boolean {
  if (recorded.duration !== null && (now.duration === null || Math.abs(now.duration - recorded.duration) > SOURCE_DURATION_TOLERANCE)) return false;
  if (recorded.width !== null && now.width !== recorded.width) return false;
  if (recorded.height !== null && now.height !== recorded.height) return false;
  return now.has_audio === recorded.has_audio;
}

const sameCard = (a: ThumbnailCardDescriptor | null, b: ThumbnailCardDescriptor | null) =>
  a === null || b === null ? a === b : a.image_sha256 === b.image_sha256;

/** Map a save-service refusal that started no operation, or an unexpected throw. */
function refusalOf(err: unknown, operationId: string | null): LegacyAdapterError {
  if (err instanceof LegacyAdapterError) return err;
  if (err instanceof ClipRevisionError) {
    switch (err.code) {
      case "EXPECTED_STATE_MISMATCH":
      case "OPERATION_BUSY":
      case "CLIP_NOT_FOUND":
      case "CLIP_NOT_TRACKED":
        return new LegacyAdapterError("REVISION_BUSY", operationId);
      // Only the inputs are rechecked there: the recipe shape was validated here first.
      case "INVALID_RECIPE":
      case "INVALID_THUMBNAIL_CARD":
      case "CARD_IMAGE_MISMATCH":
        return new LegacyAdapterError("REVISION_INPUT_MISSING", operationId);
      default:
        break;
    }
  }
  return new LegacyAdapterError("REVISION_SAVE_FAILED", operationId);
}

export class ClipLegacyAdapters {
  private readonly history: ClipsHistory;
  private readonly service: ClipRevisionService;
  private readonly sourceProbe: SourceProbeFn;
  private readonly newOperationId: () => string;

  constructor(options: LegacyAdapterOptions = {}) {
    this.history = options.history ?? new ClipsHistory();
    this.service = options.service ?? new ClipRevisionService({ history: this.history });
    this.sourceProbe = options.sourceProbe ?? ffprobeSource;
    this.newOperationId = options.operationId ?? (() => `legacy-${randomUUID()}`);
  }

  /**
   * Check the base of a tracked entry before any work, as the fence checked it.
   * With `inputs`, also check the files every derived recipe keeps (source, logo,
   * intro, outro), for actions that write a new card image before saving.
   */
  async prepare(entry: ClipHistoryEntry, options: { inputs?: boolean } = {}): Promise<AdapterBase> {
    const state: unknown = entry.revisions;
    if (!readableState(state)) throw new LegacyAdapterError("REVISION_BASE_UNAVAILABLE");
    const current = state.current;
    if (!current || current.provenance !== "exact" || typeof current.revision_id !== "string" || typeof current.path !== "string"
        || !Number.isInteger(current.version) || current.version < 1 || current.version !== state.revision_version) {
      throw new LegacyAdapterError("REVISION_BASE_UNAVAILABLE");
    }
    let doc: ClipRevisionDocument;
    let inputs: ReturnType<typeof revisionInputs>;
    try {
      doc = await this.service.loadRevision(entry.id, current.revision_id);
      if (doc.version !== current.version || doc.incarnation !== state.incarnation || !isPlainObject(doc.render_timeline?.source)) {
        throw new Error("the revision document does not describe the current revision");
      }
      inputs = revisionInputs(doc);
    } catch {
      throw new LegacyAdapterError("REVISION_BASE_UNAVAILABLE");
    }
    if (state.draft !== null || state.operations.some((o) => o.state === "pending")) throw new LegacyAdapterError("REVISION_BUSY");
    const base: AdapterBase = {
      clipId: entry.id,
      expected: { incarnation: state.incarnation, draft_version: state.draft_version, revision_version: state.revision_version },
      doc,
      recipe: inputs.recipe,
      sourceWords: inputs.source_words,
      card: inputs.thumbnail_card,
    };
    if (options.inputs) await this.checkInputs(base, base.recipe, null);
    return base;
  }

  /** Save the change as a new revision, or answer an unchanged request without rendering. */
  async commit(base: AdapterBase, change: AdapterChange): Promise<AdapterOutcome> {
    const recipe = clone(base.recipe);
    change.recipe?.(recipe);
    const card = change.card === undefined ? base.card : change.card;
    const metadata = change.thumbnailMetadata;
    if (sameRecipe(recipe, base.recipe) && sameCard(card, base.card)) {
      if (metadata) {
        try {
          await this.service.updateThumbnailMetadata({ clip_id: base.clipId, expected: base.expected, thumbnail_metadata: metadata });
        } catch (err) {
          throw refusalOf(err, null);
        }
      }
      return { committed: false, operationId: null, entry: await this.history.findById(base.clipId) };
    }
    await this.checkInputs(base, recipe, card);
    const operationId = this.newOperationId();
    let outcome: string;
    try {
      const result = await this.service.saveRevision({
        clip_id: base.clipId,
        operation_id: operationId,
        expected: base.expected,
        recipe,
        source_words: base.sourceWords,
        thumbnail_card: card,
        ...(metadata ? { thumbnail_metadata: metadata } : {}),
      });
      outcome = result.outcome;
    } catch (err) {
      throw refusalOf(err, operationId);
    }
    if (outcome === "committed") return { committed: true, operationId, entry: await this.history.findById(base.clipId) };
    // Failed work leaves the previous revision serving; superseded, cancelled or
    // pending work means the clip changed or another save owns it.
    throw new LegacyAdapterError(outcome === "failed" ? "REVISION_SAVE_FAILED" : "REVISION_BUSY", operationId);
  }

  /** A new opening card from `imagePath`, hashed now, as the chosen card of the next revision. */
  async cardFrom(imagePath: string): Promise<ThumbnailCardDescriptor> {
    const hash = await hashOf(imagePath);
    if (!hash) throw new LegacyAdapterError("REVISION_INPUT_MISSING");
    return { image_path: imagePath, image_sha256: hash, placement: "opening", duration: OPENING_CARD_DURATION };
  }

  /**
   * The file a tracked clip's logo previews are drawn from: the current revision's
   * raw render, which has no opening card, when its document loads and the file
   * exists; otherwise the served file. Never the legacy `logo_backup_path`.
   */
  async previewBase(entry: ClipHistoryEntry): Promise<string> {
    const state: unknown = entry.revisions;
    const current = readableState(state) ? state.current : null;
    if (current?.provenance === "exact" && typeof current.revision_id === "string") {
      try {
        const raw = (await this.service.loadRevision(entry.id, current.revision_id)).final_composition?.raw_render.file.path;
        if (typeof raw === "string" && existsSync(raw)) return raw;
      } catch {
        // The served file still previews.
      }
    }
    return entry.output_path;
  }

  private async checkInputs(base: AdapterBase, recipe: ExactRenderRecipe, card: ThumbnailCardDescriptor | null): Promise<void> {
    const missing = () => new LegacyAdapterError("REVISION_INPUT_MISSING");
    if (!(await isRegularFile(recipe.source_video))) throw missing();
    let facts: SourceFacts;
    try {
      facts = await this.sourceProbe(recipe.source_video);
    } catch {
      throw missing();
    }
    if (!sameSource(facts, base.doc.render_timeline.source)) throw missing();
    for (const key of ["logo_path", "intro_path", "outro_path"] as const) {
      if (recipe[key] !== undefined && recipe[key] !== null && !(await isRegularFile(recipe[key]))) throw missing();
    }
    if (card && (await hashOf(card.image_path)) !== card.image_sha256) throw missing();
  }
}
