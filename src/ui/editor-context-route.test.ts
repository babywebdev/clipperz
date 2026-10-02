import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { createHash } from "crypto";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";

// Writing Studio 1B.2b.2: the GET adapter's own behaviour, plus the policy and
// module-graph boundaries the slice must keep.
//
// The adapter is driven directly here rather than over a socket: this project's
// vitest harness (scripts/verification/node-offline.mjs) is a tripwire that
// blocks fetch, http.request and outbound TCP, and weakening it to make a test
// convenient would remove a real check. Actual HTTP — the studio's host and
// origin middleware, a real dist server on a free port, and a restart — is
// proved by scripts/verification/check-editor-context.mjs.

const tmp = mkdtempSync(join(tmpdir(), "podcli-editor-route-"));
/** Junction fixtures live outside `tmp` so the byte-preservation walkers that
 * read every entry beneath it never meet a link. */
const linkTmp = mkdtempSync(join(tmpdir(), "podcli-editor-route-links-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = join(tmp, "data");
process.env.PODCLI_OUTPUT = join(tmp, "exports");

const { registerEditorContextRoute } = await import("./editor-context-route.js");
const { ClipEditorContextService } = await import("../services/clip-editor-context.js");
const { localRequestError } = await import("../config/policy.js");

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const historyDir = join(tmp, "history");
const historyPath = join(historyDir, "clips.json");
const exportsDir = join(tmp, "exports");
const source = join(tmp, "source.mp4");
const output = join(exportsDir, "legacy_short.mp4");

const seed = {
  id: "clip-http",
  source_video: source,
  start_second: 1,
  end_second: 5,
  caption_style: "karaoke",
  crop_strategy: "center",
  format: "vertical",
  title: "Route clip",
  output_path: output,
  file_size_mb: 0.01,
  duration: 4,
  created_at: "2026-09-01T00:00:00.000Z",
  transcript_slice: "green blue",
};

// Capture the handler the module actually registers, and the path and verb it
// registers it under.
const registered: Array<{ verb: string; path: string; handler: (req: any, res: any) => unknown }> = [];
const app: any = new Proxy(
  {},
  {
    get: (_t, verb: string) => (path: string, handler: (req: any, res: any) => unknown) => {
      registered.push({ verb, path, handler });
    },
  },
);
registerEditorContextRoute(app, new ClipEditorContextService());

function responder() {
  const captured = { status: 200, body: undefined as any, headers: {} as Record<string, string> };
  const res = {
    setHeader: (name: string, value: string) => { captured.headers[name.toLowerCase()] = value; return res; },
    status: (code: number) => { captured.status = code; return res; },
    json: (body: unknown) => { captured.body = body; return res; },
  };
  return { captured, res };
}

async function call(id: string, query: Record<string, string> = {}) {
  const { captured, res } = responder();
  await registered[0].handler({ params: { id }, query, method: "GET" }, res);
  return captured;
}

beforeEach(() => {
  rmSync(historyDir, { recursive: true, force: true });
  rmSync(exportsDir, { recursive: true, force: true });
  mkdirSync(historyDir, { recursive: true });
  mkdirSync(exportsDir, { recursive: true });
  writeFileSync(source, "source-bytes");
  writeFileSync(output, "output-bytes");
  writeFileSync(historyPath, JSON.stringify([seed], null, 2));
});

describe("the read adapter", () => {
  it("registers exactly one handler, a GET on the editor-context path", () => {
    expect(registered).toHaveLength(1);
    expect(registered[0].verb).toBe("get");
    expect(registered[0].path).toBe("/api/clips/:id/editor-context");
  });

  it("answers 200 with an uncacheable, path-free context", async () => {
    const { status, headers, body } = await call("clip-http");
    expect(status).toBe(200);
    expect(headers["cache-control"]).toBe("no-store");
    expect(body.version).toBe(1);
    expect(body.identity).toMatchObject({ clip_id: "clip-http", tracked: false });
    expect(body.clip).toMatchObject({ title: "Route clip", source_name: "source.mp4", output_name: "legacy_short.mp4" });
    expect(body.media.urls).toMatchObject({ preview: "/api/clips/clip-http/preview", download: "/api/clips/clip-http/download" });
    expect(JSON.stringify(body)).not.toContain(tmp);
    expect(JSON.stringify(body)).not.toMatch(/[A-Za-z]:[\\/]{1,2}[A-Za-z0-9]/);
  });

  it.each([
    ["a missing clip", "clip-nope", 404, "CLIP_NOT_FOUND"],
    ["a traversal attempt", "../clip-http", 400, "INVALID_CLIP_ID"],
    ["a separator", "clip/http", 400, "INVALID_CLIP_ID"],
    ["an empty id", "", 400, "INVALID_CLIP_ID"],
  ])("answers a stable code for %s", async (_label, id, status, code) => {
    const captured = await call(id);
    expect([captured.status, captured.body.code]).toEqual([status, code]);
    expect(captured.body.error).toBeTypeOf("string");
    expect(JSON.stringify(captured.body)).not.toContain(tmp);
  });

  it("reports a corrupt history as a server-side failure, never as an empty answer", async () => {
    writeFileSync(historyPath, "{not json");
    const { status, body } = await call("clip-http");
    expect([status, body.code]).toEqual([500, "HISTORY_INVALID_JSON"]);
    expect(body.error).toMatch(/could not be read/i);
    // No stack, no path, no file contents.
    expect(JSON.stringify(body)).not.toMatch(/at .*\(|\.ts:\d+|not json/);
    expect(Object.keys(body).sort()).toEqual(["code", "error"]);
  });

  it("turns an unexpected failure into a stable code without leaking it", async () => {
    const boom = new Error(`ENOENT: secret detail at ${historyPath}`);
    const failing: any = { read: async () => { throw boom; } };
    const captured = { status: 200, body: undefined as any };
    const res: any = { setHeader: () => res, status: (c: number) => { captured.status = c; return res; }, json: (b: unknown) => { captured.body = b; return res; } };
    const local: Array<(req: any, res: any) => unknown> = [];
    registerEditorContextRoute({ get: (_p: string, h: any) => local.push(h) } as any, failing);
    await local[0]({ params: { id: "clip-http" }, query: {} }, res);
    expect([captured.status, captured.body.code]).toEqual([500, "EDITOR_CONTEXT_FAILED"]);
    expect(JSON.stringify(captured.body)).not.toContain(historyPath);
    expect(JSON.stringify(captured.body)).not.toContain("secret detail");
  });

  // Writing Studio 1B.2b.2 repair-2 (lead-17): the refusals added for the
  // history boundary, the consumed ranges and the pointer invariants must
  // reach the client as their own stable codes, not as the catch-all and not
  // as a raw exception.
  it("answers a stable ownership code when the configured history root is a junction", async () => {
    // Kept outside `tmp` on purpose: the byte-preservation walkers below read
    // every entry beneath `tmp`, and a junction is precisely the thing nothing
    // in this slice should follow.
    const outside = join(linkTmp, "outside-route-history");
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(outside, "clips.json"), JSON.stringify([{ id: "clip-http", title: "outside owned root" }]));
    const linked = join(linkTmp, "linked-route-history");
    symlinkSync(outside, linked, "junction");
    const local: Array<(req: any, res: any) => unknown> = [];
    registerEditorContextRoute(
      { get: (_p: string, h: any) => local.push(h) } as any,
      new ClipEditorContextService({ historyRoot: linked, historyPath: join(linked, "clips.json") }),
    );
    const { captured, res } = responder();
    await local[0]({ params: { id: "clip-http" }, query: {} }, res);
    expect([captured.status, captured.body.code]).toEqual([500, "OWNERSHIP_ESCAPE"]);
    expect(Object.keys(captured.body).sort()).toEqual(["code", "error"]);
    expect(JSON.stringify(captured.body)).not.toContain("outside owned root");
    expect(JSON.stringify(captured.body)).not.toContain(linkTmp);
  });

  it.each([
    ["a positive revision counter with no pointer", (e: any) => { e.revisions.current = null; }, "REVISION_STATE_INVALID"],
    ["a positive draft counter with no pointer", (e: any) => { e.revisions.draft = null; }, "REVISION_STATE_INVALID"],
  ])("answers a stable state code for %s", async (_label, mutate, code) => {
    const entries = JSON.parse(readFileSync(historyPath, "utf-8"));
    entries[0].revisions = {
      schema: 1,
      incarnation: "11111111-1111-4111-8111-111111111111",
      draft_version: 1,
      revision_version: 1,
      draft: { version: 1, path: join(historyDir, "revisions", "clip-http", "draft-1.json"), saved_at: "2026-09-01T00:00:00.000Z" },
      current: { revision_id: "r1", version: 1, path: join(historyDir, "revisions", "clip-http", "r1.json"), output_path: output, group_root: join(exportsDir, "g"), operation_id: "op-1", provenance: "exact", committed_at: "2026-09-01T00:00:00.000Z" },
      previous: null,
      operations: [],
    };
    mutate(entries[0]);
    writeFileSync(historyPath, JSON.stringify(entries));
    const captured = await call("clip-http");
    expect([captured.status, captured.body.code]).toEqual([500, code]);
    expect(captured.body.error).toBeTypeOf("string");
    expect(Object.keys(captured.body).sort()).toEqual(["code", "error"]);
    expect(JSON.stringify(captured.body)).not.toContain(tmp);
  });

  it("answers a stable document code when the pointer and the document name different files", async () => {
    const entries = JSON.parse(readFileSync(historyPath, "utf-8"));
    const docPath = join(historyDir, "revisions", "clip-http", "r1.json");
    mkdirSync(dirname(docPath), { recursive: true });
    // A shape the reader reaches the document with; the identity mismatch is
    // what it must refuse, before any projection can quote it.
    writeFileSync(docPath, JSON.stringify({ schema: 1, revision_id: "r1", clip_id: "clip-http", version: 1, incarnation: "11111111-1111-4111-8111-111111111111", operation_id: "op-1", created_at: "2026-09-01T00:00:00.000Z", files: { main: { path: join(exportsDir, "somewhere-else.mp4"), bytes: 12, sha256: "a".repeat(64) } } }));
    entries[0].revisions = {
      schema: 1,
      incarnation: "11111111-1111-4111-8111-111111111111",
      draft_version: 0,
      revision_version: 1,
      draft: null,
      current: { revision_id: "r1", version: 1, path: docPath, output_path: output, group_root: join(exportsDir, "g"), operation_id: "op-1", provenance: "exact", committed_at: "2026-09-01T00:00:00.000Z" },
      previous: null,
      operations: [],
    };
    writeFileSync(historyPath, JSON.stringify(entries));
    const captured = await call("clip-http");
    expect([captured.status, captured.body.code]).toEqual([500, "REVISION_DOCUMENT_INVALID"]);
    expect(Object.keys(captured.body).sort()).toEqual(["code", "error"]);
    expect(JSON.stringify(captured.body)).not.toContain(tmp);
  });

  it("ignores query parameters: nothing selects a read target but the id", async () => {
    const withQuery = await call("clip-http", { path: historyPath, file: "../../secrets" });
    expect(withQuery.status).toBe(200);
    expect(JSON.stringify(withQuery.body)).not.toContain(tmp);
    const plain = await call("clip-http");
    expect({ ...withQuery.body, identity: { ...withQuery.body.identity, captured_at: "" } })
      .toEqual({ ...plain.body, identity: { ...plain.body.identity, captured_at: "" } });
  });

  it("writes nothing while serving requests, including failures", async () => {
    const snapshot = () => {
      const out: Record<string, string> = {};
      const walk = (dir: string) => {
        for (const item of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, item.name);
          if (item.isDirectory()) walk(p);
          else out[p] = createHash("sha256").update(readFileSync(p)).digest("hex");
        }
      };
      walk(tmp);
      return out;
    };
    const before = snapshot();
    await call("clip-http");
    await call("clip-nope");
    await call("../escape");
    expect(snapshot()).toEqual(before);
  });
});

describe("policy and module boundaries", () => {
  it("leaves the local feature gate unchanged for this route and its neighbours", () => {
    const previous = process.env.PODCLI_LOCAL_ONLY;
    process.env.PODCLI_LOCAL_ONLY = "1";
    try {
      // The read is a local feature; it is not gated.
      expect(localRequestError("GET", "/api/clips/clip-http/editor-context", {})).toBeNull();
      // Neighbouring gates keep their existing behaviour: nothing was widened.
      expect(localRequestError("GET", "/api/clips/clip-http/davinci", {})).toMatch(/disabled in the local installation/);
      expect(localRequestError("POST", "/api/clips/clip-http/thumbnail", {})).toMatch(/disabled in the local installation/);
      expect(localRequestError("GET", "/api/clips/clip-http/thumbnail/options", {})).toBeNull();
      // A remote path in a request is still refused wherever bodies are inspected.
      expect(localRequestError("GET", "/api/clips/clip-http/editor-context", { video_path: "https://example.com/a.mp4" }))
        .toMatch(/local media files/);
    } finally {
      if (previous === undefined) delete process.env.PODCLI_LOCAL_ONLY;
      else process.env.PODCLI_LOCAL_ONLY = previous;
    }
  });

  it("registers the route once in the studio and adds no write verb", () => {
    const server = readFileSync(join(projectRoot, "src/ui/web-server.ts"), "utf-8");
    expect(server.match(/registerEditorContextRoute\(app\)/g)).toHaveLength(1);
    expect(server).not.toMatch(/app\.(post|put|patch|delete)\([^)]*editor-context/);
    const route = readFileSync(join(projectRoot, "src/ui/editor-context-route.ts"), "utf-8");
    expect(route.match(/app\.(get|post|put|patch|delete|use|all)\(/g)).toEqual(["app.get("]);
  });

  it("keeps the revision save service out of the reader's module graph; the studio reaches it only through the finishing-action adapters", () => {
    // B2B2-4: the reader adds no write API and imports no save operations; it uses
    // only erased types from the revision models. Since lead-26 (1B.2b.4a) the
    // studio's finishing actions save revisions, and only the adapter module may
    // import the save service.
    const service = "src/services/clip-revisions.ts";
    /** Every module reachable from `entry` by value imports, with the modules each imports. */
    function graph(entry: string): Map<string, string[]> {
      const seen = new Map<string, string[]>();
      const stack = [resolve(projectRoot, entry)];
      while (stack.length) {
        const file = stack.pop()!;
        if (seen.has(file) || !existsSync(file)) continue;
        const code = readFileSync(file, "utf-8");
        const imports: string[] = [];
        // Value imports only: `import type { ... }` and an all-`type` clause are erased.
        for (const [, clause, specifier] of code.matchAll(/^import\s+(?!type\s)([^;]*?)\s*from\s*["'](\.[^"']+)["']/gm)) {
          if (/^\{\s*type\s[^,}]+(,\s*type\s[^,}]+)*\s*,?\s*\}$/.test(clause.trim())) continue;
          imports.push(resolve(dirname(file), specifier.replace(/\.js$/, ".ts")));
        }
        seen.set(file, imports);
        stack.push(...imports);
      }
      return new Map([...seen].map(([f, deps]) => [rel(f), deps.map(rel)]));
    }
    const rel = (f: string) => relative(projectRoot, f).replace(/\\/g, "/");
    const studio = graph("src/ui/web-server.ts");
    expect([...studio.keys()]).toEqual(expect.arrayContaining([
      "src/ui/editor-context-route.ts", "src/services/clip-editor-context.ts", "src/services/clip-editor-read-contract.ts",
    ]));
    expect([...studio].filter(([, deps]) => deps.includes(service)).map(([f]) => f)).toEqual(["src/services/clip-legacy-adapters.ts"]);
    for (const reader of ["src/ui/editor-context-route.ts", "src/services/clip-editor-context.ts", "src/services/clip-editor-read-contract.ts"]) {
      expect([...graph(reader).keys()], reader).not.toContain(service);
    }
  });

  it("leaves the lenient listing and the existing sidecar readers alone", () => {
    const history = readFileSync(join(projectRoot, "src/services/clips-history.ts"), "utf-8");
    // The lenient load() and the three tolerant sidecar readers are untouched:
    // this slice adds a strict reader beside them instead of tightening them.
    expect(history).toContain("async load(): Promise<ClipHistoryEntry[]> {");
    for (const reader of ["loadWords", "loadRecipe", "loadReframe"]) {
      expect(history).toMatch(new RegExp(`async ${reader}\\(`));
    }
    expect(history).not.toContain("editor-context");
  });
});

// ---------------------------------------------------------------------------
// 1B.2b.2 repair-1: the repaired refusals must reach the client as stable
// domain codes over the adapter, not as EDITOR_CONTEXT_FAILED or a TypeError.

describe("repaired refusals map to stable codes (R2 / R3, B2B2-3)", () => {
  /** Track `clip-http` with a committed-looking state and document on disk. */
  function track(mutateState: (state: any) => void = () => {}, mutateDoc: (doc: any) => void = () => {}) {
    const sidecars = join(historyDir, "revisions", "clip-http");
    mkdirSync(sidecars, { recursive: true });
    const docPath = join(sidecars, "revision.json");
    const groupRoot = join(exportsDir, "writing-studio", "clip-http", "group-1");
    const doc: any = {
      schema: 1, revision_id: "rev-1", clip_id: "clip-http", incarnation: "inc-1",
      operation_id: "op-1", version: 1, created_at: "2026-09-02T00:00:00.000Z",
      recipe: { source_video: source, title: "Route clip", keep_segments: [{ start: 1, end: 2 }], caption_style: "karaoke", crop_strategy: "center", format: "vertical" },
      source_words: [{ word: "green", start: 1, end: 1.5, confidence: 1 }],
      words_input: "supplied",
      render_timeline: {
        version: 1, timing_mode: "exact",
        // The exact v1 map `clip_generator._exact_render_timeline` writes,
        // verbatim: this fixture stood in for a supported writer state with a
        // one-key map no producer emits.
        time_domains: {
          "segments.source_*": "source-absolute seconds in the original file",
          "segments.content_*, words.content[], captions.words[], framing.crop_keyframes[].t":
            "content-relative seconds: kept intervals concatenated in supplied order from 0",
          "bookends.*.output_*, content_to_output_offset, output_duration":
            "output seconds in the rendered file, bookends included",
        },
        tolerance: { content_seconds: 0.1032, composition_seconds: 0.0632, av_sync_seconds: 0.1264, basis: "1 cut(s) @ 25.0 fps" },
        segment_count: 1,
        segments: [{ index: 0, source_start: 1, source_end: 2, content_start: 0, content_end: 1, duration: 1 }],
        content_duration: 1, content_duration_measured: 1, content_to_output_offset: 0, output_duration: 1,
        output: { path: output, file_size_bytes: 12 }, framing: {}, bookends: { requested_fade: null, intro: null, outro: null },
        frame_precision: { source_variable_frame_rate: false, note: "constant" },
        // What `exact_render` retains and projects from the one supplied word:
        // unmodified in the source list, clipped and shifted in the content.
        words: { input: "supplied", source_count: 1, source: [{ word: "green", start: 1, end: 1.5, confidence: 1 }], content: [{ word: "green", start: 0, end: 0.5, confidence: 1 }], content_text: "green" },
      },
      files: { main: { path: output, bytes: 12, sha256: "a".repeat(64) }, caption_overlay: null, cropped_source: null },
      group_root: groupRoot,
      probe: { duration: 1, bytes: 12, has_video: true, has_audio: true },
      thumbnail_card: { requested: false, applied: false, note: "none" },
      bookends: { intro: null, outro: null },
    };
    mutateDoc(doc);
    writeFileSync(docPath, JSON.stringify(doc));
    const state: any = {
      schema: 1, incarnation: "inc-1", draft_version: 0, revision_version: 1, draft: null,
      current: { revision_id: "rev-1", version: 1, path: docPath, output_path: output, group_root: groupRoot, operation_id: "op-1", provenance: "exact", committed_at: "2026-09-02T00:00:00.000Z" },
      previous: null, operations: [], roots: { namespace: dirname(groupRoot), sidecars },
    };
    mutateState(state);
    writeFileSync(historyPath, JSON.stringify([{ ...seed, revisions: state }], null, 2));
  }

  it("serves a well-formed tracked clip, so the refusals below are about the defect", async () => {
    track();
    const { status, body } = await call("clip-http");
    expect([status, body.identity.tracked, body.timing.effective_cuts_known]).toEqual([200, true, true]);
    expect(JSON.stringify(body)).not.toMatch(/[A-Za-z]:[\\/]{1,2}[A-Za-z0-9]/);
  });

  it.each([
    ["an exact pointer with no document", () => track((s) => { s.current.path = null; }), "REVISION_STATE_INVALID"],
    ["a pointer that disagrees with its counter", () => track((s) => { s.revision_version = 4; }), "REVISION_STATE_INVALID"],
    ["a malformed segment", () => track(() => {}, (d) => { d.render_timeline.segments = [{ index: 0, source_start: { o: 1 }, source_end: -5 }]; }), "REVISION_DOCUMENT_INVALID"],
    ["an unusable retained source word", () => track(() => {}, (d) => { d.source_words = [null]; }), "REVISION_DOCUMENT_INVALID"],
    ["an arbitrary nested time-domain object", () => track(() => {}, (d) => { d.render_timeline.time_domains.extra = { nested: "object" }; }), "REVISION_DOCUMENT_INVALID"],
    ["an applied card with no image", () => track(() => {}, (d) => { d.thumbnail_card = { requested: true, applied: true, note: "card" }; }), "REVISION_DOCUMENT_INVALID"],
  ])("answers a stable code for %s", async (_label, setup, code) => {
    setup();
    const { status, body } = await call("clip-http");
    expect([status, body.code]).toEqual([500, code]);
    expect(Object.keys(body).sort()).toEqual(["code", "error"]);
    // Not the adapter's catch-all, and no stack, path or file contents.
    expect(body.code).not.toBe("EDITOR_CONTEXT_FAILED");
    expect(JSON.stringify(body)).not.toContain(tmp);
    expect(JSON.stringify(body)).not.toMatch(/at .*\(|\.ts:\d+/);
    // A tracked failure never mentions the legacy data beside it.
    expect(JSON.stringify(body)).not.toMatch(/legacy|sidecar/i);
  });

  it("answers 200 with a malformed legacy word list marked unusable", async () => {
    mkdirSync(join(historyDir, "words"), { recursive: true });
    writeFileSync(join(historyDir, "words", "clip-http.json"), JSON.stringify([null, { word: "bad", start: 9, end: 1 }]));
    const { status, body } = await call("clip-http");
    // Legacy recovery input is described, not an error: the clip stays usable.
    expect(status).toBe(200);
    expect(body.legacy.sidecars.words.state).toBe("malformed");
    expect(body.transcript).toMatchObject({ availability: "malformed", words: null, word_count: null });
    expect(body.clip.title).toBe("Route clip");
    expect(body.transcript.text).toBe("green blue");
    expect(body.capabilities.find((c: any) => c.id === "edit_writing_metadata").available).toBe(true);
  });

  it("writes nothing while refusing a repaired case", async () => {
    track(() => {}, (d) => { d.source_words = [null]; });
    const before: Record<string, string> = {};
    const walk = (dir: string) => {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, item.name);
        if (item.isDirectory()) walk(p);
        else before[p] = createHash("sha256").update(readFileSync(p)).digest("hex");
      }
    };
    walk(tmp);
    const { status } = await call("clip-http");
    expect(status).toBe(500);
    const after: Record<string, string> = {};
    const walkAfter = (dir: string) => {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, item.name);
        if (item.isDirectory()) walkAfter(p);
        else after[p] = createHash("sha256").update(readFileSync(p)).digest("hex");
      }
    };
    walkAfter(tmp);
    expect(after).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// 1B.2b.2 repair-3: the aggregate refusals and the degraded committed-media
// capabilities must also reach the client through the adapter.

describe("aggregate refusals and summary honesty reach the client (R2 / WS-16, B2B2-3)", () => {
  /** The same committed-looking clip the block above builds. */
  function track(mutateState: (state: any) => void = () => {}, mutateDoc: (doc: any) => void = () => {}) {
    const sidecars = join(historyDir, "revisions", "clip-http");
    mkdirSync(sidecars, { recursive: true });
    const docPath = join(sidecars, "revision.json");
    const groupRoot = join(exportsDir, "writing-studio", "clip-http", "group-1");
    const doc: any = {
      schema: 1, revision_id: "rev-1", clip_id: "clip-http", incarnation: "inc-1",
      operation_id: "op-1", version: 1, created_at: "2026-09-02T00:00:00.000Z",
      recipe: { source_video: source, title: "Route clip", keep_segments: [{ start: 1, end: 2 }], caption_style: "karaoke", crop_strategy: "center", format: "vertical" },
      source_words: [{ word: "green", start: 1, end: 1.5, confidence: 1 }],
      words_input: "supplied",
      render_timeline: {
        version: 1, timing_mode: "exact",
        time_domains: {
          "segments.source_*": "source-absolute seconds in the original file",
          "segments.content_*, words.content[], captions.words[], framing.crop_keyframes[].t":
            "content-relative seconds: kept intervals concatenated in supplied order from 0",
          "bookends.*.output_*, content_to_output_offset, output_duration":
            "output seconds in the rendered file, bookends included",
        },
        tolerance: { content_seconds: 0.1032, composition_seconds: 0.0632, av_sync_seconds: 0.1264, basis: "1 cut(s) @ 25.0 fps" },
        segment_count: 1,
        segments: [{ index: 0, source_start: 1, source_end: 2, content_start: 0, content_end: 1, duration: 1 }],
        content_duration: 1, content_duration_measured: 1, content_to_output_offset: 0, output_duration: 1,
        output: { path: output, file_size_bytes: 12 }, framing: {}, bookends: { requested_fade: null, intro: null, outro: null },
        frame_precision: { source_variable_frame_rate: false, note: "constant" },
        // What `exact_render` retains and projects from the one supplied word:
        // unmodified in the source list, clipped and shifted in the content.
        words: { input: "supplied", source_count: 1, source: [{ word: "green", start: 1, end: 1.5, confidence: 1 }], content: [{ word: "green", start: 0, end: 0.5, confidence: 1 }], content_text: "green" },
      },
      files: { main: { path: output, bytes: 12, sha256: "a".repeat(64) }, caption_overlay: null, cropped_source: null },
      group_root: groupRoot,
      probe: { duration: 1, bytes: 12, has_video: true, has_audio: true },
      thumbnail_card: { requested: false, applied: false, note: "none" },
      bookends: { intro: null, outro: null },
    };
    mutateDoc(doc);
    writeFileSync(docPath, JSON.stringify(doc));
    const state: any = {
      schema: 1, incarnation: "inc-1", draft_version: 0, revision_version: 1, draft: null,
      current: { revision_id: "rev-1", version: 1, path: docPath, output_path: output, group_root: groupRoot, operation_id: "op-1", provenance: "exact", committed_at: "2026-09-02T00:00:00.000Z" },
      previous: null, operations: [], roots: { namespace: dirname(groupRoot), sidecars },
    };
    mutateState(state);
    const entry: any = { ...seed, revisions: state };
    return { entry, write: () => writeFileSync(historyPath, JSON.stringify([entry], null, 2)) };
  }

  it.each([
    ["a hard cut that claims an overlap", (d: any) => {
      d.bookends.outro = { kind: "outro", output_start: 900, output_end: 901, asset_duration: 500, applied_overlap: 500, branch: "hardcut", requested_fade: 0 };
    }],
    ["a receipt cut that is not the interval its recipe asked for", (d: any) => {
      d.render_timeline.segments[0].source_start = 11;
      d.render_timeline.segments[0].source_end = 12;
    }],
    ["a relabelled time domain", (d: any) => {
      d.render_timeline.time_domains["segments.source_*"] = "content-relative seconds";
    }],
    ["an applied card on a document that records no composition", (d: any) => {
      d.thumbnail_card = {
        requested: true, applied: true, note: "card",
        image: { path: output, bytes: 12, sha256: "b".repeat(64) },
        group_root: d.group_root,
        descriptor: { image_path: output, image_sha256: "b".repeat(64), placement: "opening", duration: 1.5 },
      };
    }],
  ])("answers a stable document code for %s", async (_label, mutate) => {
    track(() => {}, mutate).write();
    const { status, body } = await call("clip-http");
    expect([status, body.code]).toEqual([500, "REVISION_DOCUMENT_INVALID"]);
    expect(Object.keys(body).sort()).toEqual(["code", "error"]);
    expect(body.code).not.toBe("EDITOR_CONTEXT_FAILED");
    expect(JSON.stringify(body)).not.toContain(tmp);
  });

  it("answers 200 but disowns the urls when the entry summary is absent", async () => {
    const tracked = track();
    delete tracked.entry.output_path;
    tracked.write();
    const { status, body } = await call("clip-http");
    expect(status).toBe(200);
    expect(body.media.summary).toMatchObject({ state: "absent", served_kind: "unknown" });
    expect(body.media.serves).toBeNull();
    for (const id of ["play_committed_media", "download_committed_media"]) {
      expect(body.capabilities.find((c: any) => c.id === id)).toMatchObject({ available: false, reason: "COMMITTED_MEDIA_SUMMARY_DRIFT" });
    }
    // The revision is still described, and the writing stays editable.
    expect(body.revision.version).toBe(1);
    expect(body.capabilities.find((c: any) => c.id === "edit_writing_metadata").available).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/[A-Za-z]:[\\/]{1,2}[A-Za-z0-9]/);
  });

  it("answers 200 but disowns the urls for a container the routes will not stream", async () => {
    const unsupported = join(exportsDir, "route_short.avi");
    writeFileSync(unsupported, "output-bytes");
    const tracked = track((s) => { s.current.output_path = unsupported; }, (d) => { d.files.main.path = unsupported; });
    tracked.entry.output_path = unsupported;
    tracked.write();
    const { status, body } = await call("clip-http");
    expect(status).toBe(200);
    expect(body.media.summary).toMatchObject({ state: "equal", served_kind: "unsupported" });
    expect(body.media.output.state).toBe("available");
    expect(body.media.serves).toBeNull();
    for (const id of ["play_committed_media", "download_committed_media"]) {
      expect(body.capabilities.find((c: any) => c.id === id)).toMatchObject({ available: false, reason: "MEDIA_KIND_UNSUPPORTED" });
    }
  });

  it("answers 200 but claims nothing for a supported name linked to a container the routes refuse", async () => {
    // serveClipById resolves the summary and judges the file it reaches, so a
    // `.mp4` link to an `.avi` file answers 400 there and is claimed nowhere here.
    const target = join(linkTmp, "real_short.avi");
    const link = join(linkTmp, "linked_short.mp4");
    writeFileSync(target, "output-bytes");
    rmSync(link, { force: true });
    symlinkSync(target, link, "file");
    writeFileSync(historyPath, JSON.stringify([{ ...seed, output_path: link }], null, 2));
    const { status, body } = await call("clip-http");
    expect(status).toBe(200);
    expect(body.media.summary).toMatchObject({ state: "untracked", served_kind: "unsupported" });
    expect(body.media.output.state).toBe("available");
    for (const id of ["play_committed_media", "download_committed_media"]) {
      expect(body.capabilities.find((c: any) => c.id === id)).toMatchObject({ available: false, reason: "MEDIA_KIND_UNSUPPORTED" });
    }
    expect(JSON.stringify(body)).not.toContain(linkTmp);
  });
});
