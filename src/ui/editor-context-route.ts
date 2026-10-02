// The GET /api/clips/:id/editor-context adapter (Writing Studio 1B.2b.2).
//
// Kept in its own module so the adapter can be exercised over real HTTP in a
// test without starting the whole studio. It registers one read route and
// nothing else: no write verb, no file-serving endpoint, no change to any
// existing route. The studio's own middleware (local host and origin policy,
// the local feature gate) runs ahead of it unchanged.

import type { Express } from "express";
import { ClipEditorContextService, EditorContextError } from "../services/clip-editor-context.js";
import { childLogger } from "../utils/logger.js";
import { errMsg } from "../utils/errors.js";

const log = childLogger("editor-context-route");

/**
 * Register the read route. Failures answer with a stable `code`; a raw
 * exception is logged and never returned, because it can carry a path or a
 * stack. The response is uncacheable: it is a captured view of mutable state.
 */
export function registerEditorContextRoute(app: Express, service = new ClipEditorContextService()): void {
  app.get("/api/clips/:id/editor-context", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json(await service.read(req.params.id));
    } catch (error) {
      if (error instanceof EditorContextError) {
        res.status(error.status).json({ code: error.code, error: error.message });
        return;
      }
      log.error("Editor context failed", { clip: req.params.id, err: errMsg(error) });
      res.status(500).json({ code: "EDITOR_CONTEXT_FAILED", error: "The clip's editor context could not be built." });
    }
  });
}
