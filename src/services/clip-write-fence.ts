// The tracked-clip write fence (Writing Studio 1B.2b.3).
//
// A clip whose history entry carries a non-null `revisions` value is tracked:
// its media, sidecars and summary fields belong to the revision save service.
// Legacy writers refuse to remove it or to change any field a revision commit
// owns, and no legacy operation writes inside the revision export namespace or
// sidecar tree, whatever entry or path points there. Untracked clips behave
// exactly as before.
//
// backend/services/clips_history.py fences the same field set; a test proves
// the two lists agree and that every field a revision commit writes is here.
// The two directory names repeat the save service's constants rather than
// importing them, so legacy writers keep no runtime edge to the save service;
// a test ties them together.

import { lstat, realpath } from "fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "path";
import { paths } from "../config/paths.js";

export type ClipWriteFenceCode = "CLIP_REVISION_TRACKED" | "REVISION_PATH_PROTECTED";

/** Fields a legacy writer may not change on a tracked clip: the identity and
 * provenance fields, and every field the revision commit projects. */
export const REVISION_OWNED_FIELDS: readonly string[] = [
  "revisions",
  "id",
  "created_at",
  "source_video",
  "logo_backup_path",
  "output_path",
  "duration",
  "file_size_mb",
  "start_second",
  "end_second",
  "caption_style",
  "crop_strategy",
  "format",
  "keep_segments",
  "logo_path",
  "intro_path",
  "outro_path",
  "logo_position",
  "transcript_slice",
  "thumbnail_config",
];
const OWNED = new Set(REVISION_OWNED_FIELDS);

/** `<export root>/writing-studio/`, as the save service names it. */
export const FENCE_NAMESPACE_DIR = "writing-studio";
/** `<history>/revisions/`, as the save service names it. */
export const FENCE_SIDECAR_DIR = "revisions";

/** Why a path was refused: it resolves into an owned tree, or it exists but
 * could not be resolved, so it cannot be confirmed to be outside one. */
export type RevisionPathReason = "owned" | "unresolvable";

/** Every refusal message. backend/services/clips_history.py holds the same
 * strings; a test proves they agree, and the web server recognises the
 * unresolvable one in CLI output. */
export const FENCE_MESSAGES = {
  tracked:
    "This clip is saved with Writing Studio revisions, so this legacy action cannot change it. " +
    "Rerender, delete, thumbnail settings and command-line caption or thumbnail edits are not available for it; " +
    "its title and other details can still be edited.",
  owned:
    "This action would change a file in the Writing Studio revision folders, which legacy tools cannot modify. " +
    "Use a clip file outside those folders.",
  unresolvable:
    "Clipperz could not confirm that this file is outside the Writing Studio revision folders, so the action was stopped and nothing was changed. " +
    "Check that the file, its drive and any link to it are available, then try again.",
  start: "Revision tracking can only be started by Writing Studio, not by a legacy edit.",
} as const;

/** A refused legacy write. The message is plain and carries no path; `reason`
 * and `errorCode` (an error code name such as ENOENT) are path-free log detail. */
export class ClipWriteFenceError extends Error {
  readonly code: ClipWriteFenceCode;
  readonly status = 409;
  readonly clipId?: string;
  readonly reason?: RevisionPathReason;
  readonly errorCode?: string;
  constructor(
    code: ClipWriteFenceCode,
    options: { clipId?: string; message?: string; reason?: RevisionPathReason; errorCode?: string } = {},
  ) {
    const fallback = code === "CLIP_REVISION_TRACKED" ? FENCE_MESSAGES.tracked
      : options.reason === "unresolvable" ? FENCE_MESSAGES.unresolvable : FENCE_MESSAGES.owned;
    super(options.message ?? fallback);
    this.name = "ClipWriteFenceError";
    this.code = code;
    this.clipId = options.clipId;
    this.reason = code === "REVISION_PATH_PROTECTED" ? options.reason ?? "owned" : undefined;
    this.errorCode = options.errorCode;
  }
}

/** Present and not null, as the reader and `ensureTracked` decide. A malformed
 * value counts as tracked, so the fence fails safe. */
export function isRevisionTracked(entry: object): boolean {
  const value = (entry as { revisions?: unknown }).revisions;
  return value !== undefined && value !== null;
}

/** Keys of `patch` a legacy writer may not apply to `entry`. Every own key is a
 * write, including one set to undefined (Object.assign would drop the field). */
export function fencedPatchKeys(entry: object, patch: object): string[] {
  const keys = Object.keys(patch);
  return isRevisionTracked(entry) ? keys.filter((k) => OWNED.has(k)) : keys.filter((k) => k === "revisions");
}

export function assertLegacyPatchAllowed(entry: { id?: unknown }, patch: object): void {
  if (fencedPatchKeys(entry, patch).length === 0) return;
  const clipId = typeof entry.id === "string" ? entry.id : undefined;
  throw new ClipWriteFenceError("CLIP_REVISION_TRACKED", isRevisionTracked(entry) ? { clipId } : { clipId, message: FENCE_MESSAGES.start });
}

export function assertLegacyRemovalAllowed(entry: { id?: unknown }): void {
  if (isRevisionTracked(entry)) {
    throw new ClipWriteFenceError("CLIP_REVISION_TRACKED", { clipId: typeof entry.id === "string" ? entry.id : undefined });
  }
}

/** Only the save service creates revision state: a new legacy record may not
 * carry a `revisions` key, whatever its value. */
export function assertLegacyRecordAllowed(entry: object): void {
  if (Object.prototype.hasOwnProperty.call(entry, "revisions")) {
    throw new ClipWriteFenceError("CLIP_REVISION_TRACKED", { message: FENCE_MESSAGES.start });
  }
}

// ---------------------------------------------------------------------------
// Path fence
// ---------------------------------------------------------------------------

const fold = (p: string) => (process.platform === "win32" ? p.toLowerCase() : p);

function within(child: string, root: string): boolean {
  const rel = relative(fold(root), fold(child));
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}

/** A component exists but could not be resolved; `errorCode` names the failure. */
class Unresolvable extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode);
  }
}

const errnoOf = (err: unknown) => (err as NodeJS.ErrnoException | undefined)?.code;
const isMissing = (err: unknown) => errnoOf(err) === "ENOENT" || errnoOf(err) === "ENOTDIR";

/**
 * Resolve every link and junction along `target`. A missing tail stays beneath
 * its deepest existing ancestor. A component that exists but cannot be
 * resolved (a dangling link, a denied lookup) is not missing: it throws, and
 * the caller fails closed.
 */
async function resolveThroughLinks(target: string): Promise<string> {
  let current = resolve(target);
  const tail: string[] = [];
  for (;;) {
    let realpathCode: string;
    try {
      return join(await realpath(current), ...tail.slice().reverse());
    } catch (err) {
      if (!isMissing(err)) throw new Unresolvable(errnoOf(err) ?? "UNKNOWN");
      realpathCode = errnoOf(err) ?? "UNKNOWN";
    }
    try {
      await lstat(current);
    } catch (err) {
      if (!isMissing(err)) throw new Unresolvable(errnoOf(err) ?? "UNKNOWN");
      const parent = dirname(current);
      if (parent === current) return join(current, ...tail.slice().reverse());
      tail.push(basename(current));
      current = parent;
      continue;
    }
    // It exists, yet resolving it failed as if missing: a dangling link.
    throw new Unresolvable(realpathCode);
  }
}

/** The configured namespace and sidecar roots, lexically and through links. */
async function revisionRoots(): Promise<string[]> {
  const lexical = [join(paths.output, FENCE_NAMESPACE_DIR), join(paths.history, FENCE_SIDECAR_DIR)].map((p) => resolve(p));
  const roots = [...lexical];
  for (const root of lexical) {
    try {
      roots.push(await resolveThroughLinks(root));
    } catch {
      // The lexical form still guards it; a target reached through the
      // unresolvable root is itself unresolvable and fails closed.
    }
  }
  return roots;
}

export type RevisionPathVerdict = { reason: "owned" } | { reason: "unresolvable"; errorCode: string } | null;

/** Whether writing, replacing or deleting `target` would touch a revision-owned
 * tree, compared after resolving links and junctions, case-insensitively on
 * Windows: `owned` when it resolves inside one, `unresolvable` when it exists
 * but cannot be resolved (fail closed), null when it is outside both. */
export async function revisionPathVerdict(target: string): Promise<RevisionPathVerdict> {
  const roots = await revisionRoots();
  if (roots.some((root) => within(resolve(target), root))) return { reason: "owned" };
  let real: string;
  try {
    real = await resolveThroughLinks(target);
  } catch (err) {
    return { reason: "unresolvable", errorCode: err instanceof Unresolvable ? err.errorCode : "UNKNOWN" };
  }
  return roots.some((root) => within(real, root)) ? { reason: "owned" } : null;
}

export async function isRevisionOwnedPath(target: string): Promise<boolean> {
  return (await revisionPathVerdict(target)) !== null;
}

/** Refuse, before any work, when a legacy operation would write inside either tree. */
export async function assertOutsideRevisionTrees(targets: ReadonlyArray<unknown>, clipId?: string): Promise<void> {
  for (const target of targets) {
    if (typeof target !== "string" || !target) continue;
    const verdict = await revisionPathVerdict(target);
    if (verdict) {
      throw new ClipWriteFenceError("REVISION_PATH_PROTECTED", {
        clipId, reason: verdict.reason, errorCode: verdict.reason === "unresolvable" ? verdict.errorCode : undefined,
      });
    }
  }
}
