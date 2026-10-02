// Entry fence for the legacy clip write routes (Writing Studio 1B.2b.3, 1B.2b.4a).
//
// Registered ahead of the existing handlers, after the studio's host, origin
// and local-policy middleware, so policy refusals still come first. On a
// tracked clip (or one whose targets lie in a revision-owned tree) each fenced
// route answers 409 before any media, sidecar, thumbnail, history or ui-state
// write and before any renderer, FFmpeg or provider call. Otherwise it passes
// the request on with the entry it checked, which the media handlers act on
// (`checkedClip`). The locked checks in ClipsHistory and the Python history
// writer remain the commit-time guarantee; the handlers map those refusals
// through `sendFenceRefusal` and `cliFenceRefusal`.
//
// Since 1B.2b.4a the finishing actions (a caption-style PATCH, logo apply and
// remove, and thumbnail generate, select and render) pass a tracked clip on to
// their handler as well (`adaptedClip`), which saves a revision through
// src/services/clip-legacy-adapters.ts instead of rewriting media; only the
// thumbnail folder those handlers write themselves is path-checked here. DELETE,
// rerender and a `thumbnail_config` PATCH still refuse a tracked clip.

import type { Express, Request, Response } from "express";
import { dirname, join } from "path";
import { paths } from "../config/paths.js";
import { ClipsHistory } from "../services/clips-history.js";
import {
  ClipWriteFenceError,
  FENCE_MESSAGES,
  assertOutsideRevisionTrees,
  isRevisionTracked,
  type ClipWriteFenceCode,
} from "../services/clip-write-fence.js";
import { LegacyAdapterError } from "../services/clip-legacy-adapters.js";
import type { ClipHistoryEntry } from "../models/index.js";
import { isDemoMode } from "./demo-fixtures.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("clip-write-fence");

/** Answer a refusal with a plain message and a stable code. The log carries the
 * clip, operation and code, and for a path refusal its path-free reason
 * (`owned` or `unresolvable`) and any error code name; never a path. */
export function sendFenceRefusal(res: Response, refusal: ClipWriteFenceError | ClipWriteFenceCode, clipId: string, operation: string): void {
  const error = typeof refusal === "string" ? new ClipWriteFenceError(refusal) : refusal;
  log.warn("Legacy clip write refused", {
    clip: clipId, operation, code: error.code,
    ...(error.reason && { reason: error.reason }),
    ...(error.errorCode && { error_code: error.errorCode }),
  });
  res.status(error.status).json({ error: error.message, code: error.code });
}

/**
 * The entry the fence checked for this request. Handlers act on it rather than
 * reading the clip again, so a clip tracked after the check cannot hand them a
 * path inside the revision trees; that change is refused at the locked commit.
 * Undefined when no entry was checked. Non-DEMO media misses are answered here.
 */
export function checkedClip(res: Response): ClipHistoryEntry | undefined {
  return res.locals?.fenceCheckedClip as ClipHistoryEntry | undefined;
}

/** The checked entry when it is tracked and the request is a finishing action its
 * handler adapts (1B.2b.4a); undefined otherwise, including for untracked clips. */
export function adaptedClip(res: Response): ClipHistoryEntry | undefined {
  return res.locals?.fenceAdapted === true ? checkedClip(res) : undefined;
}

/** Answer a finishing action that was not saved with its status, plain message and
 * code; true when `error` was such a refusal. The log carries the clip, operation,
 * code and any operation ID; never a path. */
export function sendAdapterRefusal(res: Response, error: unknown, clipId: string, operation: string): boolean {
  if (!(error instanceof LegacyAdapterError)) return false;
  log.warn("Legacy clip action not saved", {
    clip: clipId, operation, code: error.code,
    ...(error.operationId && { operation_id: error.operationId }),
  });
  res.status(error.status).json({ error: error.message, code: error.code });
  return true;
}

const BRIDGE_REFUSAL = /^ClipRevisionFenceError: (CLIP_REVISION_TRACKED|REVISION_PATH_PROTECTED):[ \t]*([^\r\n]*)/;

/** A refusal the Python renderer raised through the bridge (WS-23: a legacy output
 * sink inside the revision trees), or null. The bridge reports it as its error's
 * first line. */
export function bridgeFenceRefusal(error: unknown): ClipWriteFenceError | null {
  const match = BRIDGE_REFUSAL.exec(String((error as Error | undefined)?.message ?? ""));
  if (!match) return null;
  const code = match[1] as ClipWriteFenceCode;
  const unresolvable = code === "REVISION_PATH_PROTECTED" && match[2].trim().startsWith(FENCE_MESSAGES.unresolvable);
  return new ClipWriteFenceError(code, unresolvable ? { reason: "unresolvable" } : {});
}

const CLI_REFUSAL = /^\s*(?:✗\s+)?(CLIP_REVISION_TRACKED|REVISION_PATH_PROTECTED):[ \t]*(.*)$/m;
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

/** A refusal the Python CLI reported (its locked or path check), or null. The
 * CLI prints the shared messages, so its unresolvable-path wording carries
 * that reason through to the response and the log. */
export function cliFenceRefusal(result: { stdout: string; stderr: string }): ClipWriteFenceError | null {
  const match = CLI_REFUSAL.exec(stripAnsi(`${result.stderr}\n${result.stdout}`));
  if (!match) return null;
  const code = match[1] as ClipWriteFenceCode;
  const unresolvable = code === "REVISION_PATH_PROTECTED" && match[2].trim().startsWith(FENCE_MESSAGES.unresolvable);
  return new ClipWriteFenceError(code, unresolvable ? { reason: "unresolvable" } : {});
}

const thumbnailsDir = (id: string) => join(paths.output, "thumbnails", id);
const sidecars = (id: string) => ["words", "recipes", "reframe"].map((dir) => join(paths.history, dir, `${id}.json`));
const siblings = (output: unknown, ...suffixes: string[]) =>
  typeof output === "string" && output ? suffixes.map((suffix) => `${output}${suffix}`) : [];

/** PATCH delegates to clips edit, which accepts an exact or unique prefix id.
 * Resolve the same entry before the handler discards explicit null fields. */
async function editClip(history: ClipsHistory, id: string): Promise<ClipHistoryEntry | undefined> {
  if (!id) return undefined;
  const entries = await history.load();
  const exact = entries.find((entry) => entry.id === id);
  if (exact) return exact;
  const matches = entries.filter((entry) => entry.id.startsWith(id));
  return matches.length === 1 ? matches[0] : undefined;
}

interface FencedRoute {
  verb: "patch" | "delete" | "post";
  path: string;
  operation: string;
  /** Only some requests on the route are fenced (a title-only PATCH is not). */
  applies?: (req: Request) => boolean;
  /** Every path the handler can write, replace or delete for this clip. */
  targets: (clip: ClipHistoryEntry) => unknown[];
  /** Requests whose handler adapts a tracked clip (1B.2b.4a), with the paths that
   * handler writes itself; the save service writes everything else. Absent: a
   * tracked clip is refused. */
  adapted?: { applies: (req: Request) => boolean; targets: (clip: ClipHistoryEntry) => unknown[] };
}

const always = () => true;

export const FENCED_ROUTES: readonly FencedRoute[] = [
  {
    verb: "patch", path: "/api/clips/:id", operation: "edit",
    applies: (req) => Object.hasOwn(req.body ?? {}, "caption_style") || Object.hasOwn(req.body ?? {}, "thumbnail_config"),
    targets: () => [],
    // A caller-chosen thumbnail_config has no revision meaning, so it keeps refusing.
    adapted: { applies: (req) => !Object.hasOwn(req.body ?? {}, "thumbnail_config"), targets: () => [] },
  },
  {
    verb: "delete", path: "/api/clips/:id", operation: "delete",
    targets: (c) => [c.output_path, ...sidecars(c.id), thumbnailsDir(c.id)],
  },
  {
    verb: "post", path: "/api/clips/:id/thumbnail", operation: "thumbnail", targets: (c) => [thumbnailsDir(c.id), c.output_path],
    adapted: { applies: always, targets: (c) => [thumbnailsDir(c.id)] },
  },
  {
    verb: "post", path: "/api/clips/:id/thumbnail/select", operation: "thumbnail-select", targets: (c) => [c.output_path],
    adapted: { applies: always, targets: () => [] },
  },
  {
    verb: "post", path: "/api/clips/:id/thumbnail/render", operation: "thumbnail-render", targets: (c) => [thumbnailsDir(c.id), c.output_path],
    adapted: { applies: always, targets: (c) => [thumbnailsDir(c.id)] },
  },
  {
    verb: "post", path: "/api/clips/:id/logo", operation: "logo",
    targets: (c) => [c.output_path, ...siblings(c.output_path, ".pre-logo.mp4", `.logo-${process.pid}.mp4`)],
    adapted: { applies: always, targets: () => [] },
  },
  {
    verb: "post", path: "/api/clips/:id/rerender", operation: "rerender",
    targets: (c) => [
      c.output_path,
      typeof c.output_path === "string" && c.output_path ? dirname(c.output_path) : null,
      join(paths.history, "reframe", `${c.id}.json`),
    ],
  },
];

/** Register the entry fence ahead of the legacy write handlers. */
export function registerClipWriteFence(app: Express, history: ClipsHistory = new ClipsHistory()): void {
  for (const route of FENCED_ROUTES) {
    app[route.verb](route.path, async (req: Request, res: Response, next: () => void) => {
      // DEMO fixtures are read-only and answered by the handlers as before.
      if (isDemoMode() || (route.applies && !route.applies(req))) return next();
      const id = String(req.params.id);
      const clip = route.verb === "patch" ? await editClip(history, id) : await history.findById(id);
      if (!clip) {
        if (route.verb === "post") { res.status(404).json({ error: "clip not found" }); return; }
        return next(); // PATCH and DELETE retain the CLI's id-prefix resolution.
      }
      const tracked = isRevisionTracked(clip);
      try {
        if (tracked && !route.adapted?.applies(req)) throw new ClipWriteFenceError("CLIP_REVISION_TRACKED", { clipId: clip.id });
        await assertOutsideRevisionTrees(tracked ? route.adapted!.targets(clip) : route.targets(clip), clip.id);
      } catch (error) {
        if (error instanceof ClipWriteFenceError) return sendFenceRefusal(res, error, clip.id, route.operation);
        throw error;
      }
      res.locals.fenceCheckedClip = clip;
      if (tracked) res.locals.fenceAdapted = true;
      next();
    });
  }
}
