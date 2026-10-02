import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { stripTypeScriptTypes } from "node:module";
import { createHash } from "crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";

// Writing Studio 1B.2b.3: the entry fence ahead of the legacy write routes
// (B2B3-1, B2B3-4); 1B.2b.4a: finishing actions pass a tracked clip on to their
// adapting handler (B2B4A-1, B2B4A-5). The guards are driven directly with the local policy off,
// which is how the routes the local profile blocks (POST thumbnail and
// thumbnail/select) are exercised; this project's vitest harness blocks
// sockets, and real HTTP for the served routes is proved by
// scripts/verification/check-revision-fence.mjs.

const tmp = mkdtempSync(join(tmpdir(), "podcli-fence-route-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = join(tmp, "data");
process.env.PODCLI_OUTPUT = join(tmp, "exports");
delete process.env.PODCLI_LOCAL_ONLY;

const { registerClipWriteFence, FENCED_ROUTES, cliFenceRefusal, sendFenceRefusal, checkedClip, adaptedClip, sendAdapterRefusal, bridgeFenceRefusal } =
  await import("./clip-write-fence-route.js");
const { LegacyAdapterError, ADAPTER_MESSAGES } = await import("../services/clip-legacy-adapters.js");
const { FENCE_MESSAGES } = await import("../services/clip-write-fence.js");
const { ClipsHistory } = await import("../services/clips-history.js");
const { ClipRevisionService } = await import("../services/clip-revisions.js");
const { localRequestError } = await import("../config/policy.js");

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const historyDir = join(tmp, "history");
const historyPath = join(historyDir, "clips.json");
const exportsDir = join(tmp, "exports");
const nsFile = join(exportsDir, "writing-studio", "clip-z", "main.mp4");
const docFile = join(historyDir, "revisions", "clip-z", "rev.json");

const sha256 = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
function tree(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const item of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, item.name);
      if (item.name.endsWith(".lock") || item.isSymbolicLink()) continue;
      if (item.isDirectory()) walk(p);
      else out[relative(tmp, p)] = sha256(p);
    }
  };
  walk(tmp);
  return out;
}

const clip = (id: string, output: string, over: Record<string, unknown> = {}) => ({
  id, source_video: join(tmp, "source.mp4"), start_second: 1, end_second: 5, caption_style: "karaoke", crop_strategy: "center",
  format: "vertical", title: `Clip ${id}`, output_path: output, file_size_mb: 0.01, duration: 4, created_at: "2026-09-01T00:00:00.000Z",
  thumbnail_config: { preview_path: join(exportsDir, "thumbnails", id, "t.png"), variations: [join(exportsDir, "thumbnails", id, "t.png")], card_seconds: 1.5 },
  ...over,
});

let history: InstanceType<typeof ClipsHistory>;
const registered: Array<{ verb: string; path: string; handler: (req: any, res: any, next: () => void) => Promise<unknown> }> = [];

async function seed() {
  rmSync(historyDir, { recursive: true, force: true });
  rmSync(exportsDir, { recursive: true, force: true });
  for (const p of [nsFile, docFile]) {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, "owned");
  }
  const list = [
    clip("tracked-v0", join(exportsDir, "v0_short.mp4")),
    clip("tracked-bad", join(exportsDir, "bad_short.mp4"), { revisions: "malformed" }),
    clip("plain", join(exportsDir, "plain_short.mp4")),
    clip("ptr-ns", nsFile),
    clip("ptr-doc", docFile),
  ];
  for (const e of list) {
    mkdirSync(dirname(e.output_path), { recursive: true });
    if (!e.output_path.includes("writing-studio") && !e.output_path.includes("revisions")) writeFileSync(e.output_path, `media ${e.id}`);
    mkdirSync(join(exportsDir, "thumbnails", e.id), { recursive: true });
    writeFileSync(join(exportsDir, "thumbnails", e.id, "t.png"), "png");
  }
  mkdirSync(historyDir, { recursive: true });
  writeFileSync(historyPath, JSON.stringify(list, null, 2));
  history = new ClipsHistory();
  await new ClipRevisionService({ history }).ensureTracked("tracked-v0");
  registered.length = 0;
  const app: any = new Proxy({}, {
    get: (_t, verb: string) => (path: string, handler: any) => { registered.push({ verb, path, handler }); },
  });
  registerClipWriteFence(app, history);
}
beforeEach(seed);
afterEach(() => { delete process.env.PODCLI_DEMO; });

function responder() {
  const captured = { status: 200, body: undefined as any, sent: false };
  const res = {
    locals: {} as Record<string, unknown>,
    status: (code: number) => { captured.status = code; return res; },
    json: (body: unknown) => { captured.body = body; captured.sent = true; return res; },
  };
  return { captured, res };
}
async function call(verb: string, path: string, id: string, body: Record<string, unknown> = {}) {
  const route = registered.find((r) => r.verb === verb && r.path === path);
  if (!route) throw new Error(`no guard for ${verb} ${path}`);
  const { captured, res } = responder();
  let passed = false;
  await route.handler({ params: { id }, body, method: verb.toUpperCase() }, res, () => { passed = true; });
  return { ...captured, passed, checked: checkedClip(res as any), adapted: adaptedClip(res as any) };
}

type FencedRequest = [string, string, Record<string, unknown>];
const nullish = (field: string, title: string): FencedRequest[] =>
  [null, "", false, 0, undefined].flatMap((value): FencedRequest[] => [
    ["patch", "/api/clips/:id", { [field]: value }],
    ["patch", "/api/clips/:id", { title, [field]: value }],
  ]);

/** Fenced requests a tracked clip still refuses (1B.2b.4a keeps them). */
const REFUSED: FencedRequest[] = [
  ["patch", "/api/clips/:id", { thumbnail_config: { text: "x" } }],
  ["patch", "/api/clips/:id", { caption_style: "hormozi", thumbnail_config: { text: "x" } }],
  ...nullish("thumbnail_config", "Whole request refuses"),
  ["delete", "/api/clips/:id", {}],
  ["post", "/api/clips/:id/rerender", { trim: { inSec: 1, outSec: 3 } }],
];

/** Finishing actions whose handler adapts a tracked clip (1B.2b.4a); invalid styles
 * reach the handler too, which answers them 400. */
const ADAPTED: FencedRequest[] = [
  ["patch", "/api/clips/:id", { caption_style: "hormozi" }],
  ["patch", "/api/clips/:id", { title: "Title after the style", caption_style: "subtle" }],
  ...nullish("caption_style", "Title after the style"),
  ["post", "/api/clips/:id/thumbnail", {}],
  ["post", "/api/clips/:id/thumbnail/select", { path: "t.png" }],
  ["post", "/api/clips/:id/thumbnail/render", { frame_path: "f.png", line1: "A", line2: "B" }],
  ["post", "/api/clips/:id/logo", { action: "apply", logo_path: "logo.png" }],
  ["post", "/api/clips/:id/logo", { action: "remove" }],
];

/** Every fenced request, with a body that engages the fence. */
const REQUESTS: FencedRequest[] = [...REFUSED, ...ADAPTED];

describe("entry fence on the legacy write routes", () => {
  it("guards exactly the fenced routes and no read route", () => {
    expect(registered.map((r) => `${r.verb.toUpperCase()} ${r.path}`).sort()).toEqual([
      "DELETE /api/clips/:id",
      "PATCH /api/clips/:id",
      "POST /api/clips/:id/logo",
      "POST /api/clips/:id/rerender",
      "POST /api/clips/:id/thumbnail",
      "POST /api/clips/:id/thumbnail/render",
      "POST /api/clips/:id/thumbnail/select",
    ]);
    expect(FENCED_ROUTES).toHaveLength(registered.length);
  });

  for (const id of ["tracked-v0", "tracked-bad"]) {
    it(`${id}: still-fenced requests answer 409 CLIP_REVISION_TRACKED before any side effect; finishing actions pass on adapted, policy off`, async () => {
      expect(process.env.PODCLI_LOCAL_ONLY).toBeUndefined();
      const before = tree();
      for (const [verb, path, body] of REFUSED) {
        const r = await call(verb, path, id, body);
        expect(r.passed, `${verb} ${path} ${JSON.stringify(body)}`).toBe(false);
        expect(r.status).toBe(409);
        expect(Object.keys(r.body).sort()).toEqual(["code", "error"]);
        expect(r.body.code).toBe("CLIP_REVISION_TRACKED");
        expect(JSON.stringify(r.body)).not.toContain(tmp);
        expect(JSON.stringify(r.body)).not.toMatch(/[A-Za-z]:\\\\|\u2014/);
      }
      // The adapting handler decides the base (version zero and malformed ones refuse there).
      const entry = JSON.parse(readFileSync(historyPath, "utf-8")).find((e: any) => e.id === id);
      for (const [verb, path, body] of ADAPTED) {
        const r = await call(verb, path, id, body);
        expect([r.passed, r.sent], `${verb} ${path} ${JSON.stringify(body)}`).toEqual([true, false]);
        expect([r.checked, r.adapted], `${verb} ${path}`).toEqual([entry, entry]);
      }
      expect(tree()).toEqual(before);
    });

    it(`${id}: a title-only PATCH is not fenced`, async () => {
      const r = await call("patch", "/api/clips/:id", id, { title: "Only the title" });
      expect([r.passed, r.sent]).toEqual([true, false]);
    });
  }

  it("untracked and DEMO requests pass through; missing media clips answer 404", async () => {
    const before = tree();
    const plainEntry = JSON.parse(readFileSync(historyPath, "utf-8")).find((e: any) => e.id === "plain");
    for (const [verb, path, body] of REQUESTS) {
      const plain = await call(verb, path, "plain", body);
      expect(plain.passed, `plain ${verb} ${path}`).toBe(true);
      // The handler receives the very entry that was checked, not a later read, and never adapts it.
      expect([plain.checked, plain.adapted], `plain ${verb} ${path}`).toEqual([plainEntry, undefined]);
      const unknown = await call(verb, path, "no-such-clip", body);
      expect([unknown.passed, unknown.checked], `unknown ${verb} ${path}`).toEqual([verb !== "post", undefined]);
      if (verb === "post") expect([unknown.status, unknown.body]).toEqual([404, { error: "clip not found" }]);
    }
    process.env.PODCLI_DEMO = "1";
    for (const [verb, path, body] of REQUESTS) {
      const demo = await call(verb, path, "tracked-v0", body);
      expect([demo.passed, demo.checked, demo.adapted], `demo ${verb} ${path}`).toEqual([true, undefined, undefined]);
    }
    expect(tree()).toEqual(before);
  });

  it("hands no entry to the handler when it refuses", async () => {
    for (const [verb, path, body] of REFUSED) {
      const r = await call(verb, path, "tracked-v0", body);
      expect([r.checked, r.adapted], `${verb} ${path}`).toEqual([undefined, undefined]);
    }
  });

  it("still path-checks the thumbnail folder an adapting handler writes itself (1B.2b.4a)", async () => {
    // The tracked clip's thumbnail folder is a junction into the namespace.
    const thumbs = join(exportsDir, "thumbnails", "tracked-v0");
    rmSync(thumbs, { recursive: true, force: true });
    symlinkSync(dirname(nsFile), thumbs, "junction");
    const before = tree();
    for (const [path, body] of [["/api/clips/:id/thumbnail", {}], ["/api/clips/:id/thumbnail/render", { frame_path: "f.png" }]] as const) {
      const r = await call("post", path, "tracked-v0", body);
      expect([r.passed, r.status, r.body?.code, r.adapted], path).toEqual([false, 409, "REVISION_PATH_PROTECTED", undefined]);
    }
    // Select and logo write nothing themselves, so the junction does not concern them.
    for (const [path, body] of [["/api/clips/:id/thumbnail/select", { path: "t.png" }], ["/api/clips/:id/logo", { action: "remove" }]] as const) {
      expect((await call("post", path, "tracked-v0", body)).passed, path).toBe(true);
    }
    expect(tree()).toEqual(before);
    rmSync(thumbs, { recursive: true, force: true });
  });

  it("PATCH follows the CLI's exact-first, unique-prefix identity before dropping nulls", async () => {
    const list = JSON.parse(readFileSync(historyPath, "utf8"));
    list.push(clip("prefix", join(exportsDir, "plain.mp4")));
    list.push(clip("prefix-tracked", nsFile, { revisions: {} }));
    writeFileSync(historyPath, JSON.stringify(list));
    const before = tree();
    for (const field of ["caption_style", "thumbnail_config"]) {
      const body = { title: "Refused", [field]: null };
      const tracked = await call("patch", "/api/clips/:id", "tracked-v", body);
      // A caption style, null included, reaches the adapting handler (which answers 400);
      // a thumbnail_config still refuses.
      if (field === "caption_style") expect([tracked.passed, tracked.adapted?.id]).toEqual([true, "tracked-v0"]);
      else expect([tracked.passed, tracked.status, tracked.body?.code]).toEqual([false, 409, "CLIP_REVISION_TRACKED"]);
      // Exact untracked id wins over the tracked id sharing its prefix.
      expect((await call("patch", "/api/clips/:id", "prefix", body)).passed).toBe(true);
      // Ambiguous and unknown identifiers retain the CLI's existing response.
      for (const id of ["tracked-", "pref", "", "absent"]) {
        expect((await call("patch", "/api/clips/:id", id, body)).passed).toBe(true);
      }
    }
    expect(tree()).toEqual(before);
  });

  it("an untracked entry pointing into the namespace or sidecar tree answers 409 REVISION_PATH_PROTECTED (B2B3-4)", async () => {
    const before = tree();
    for (const id of ["ptr-ns", "ptr-doc"]) {
      for (const [verb, path, body] of REQUESTS) {
        const r = await call(verb, path, id, body);
        if (verb === "patch") {
          // Caption and thumbnail-config edits write only the history file.
          expect(r.passed, `${id} ${verb}`).toBe(true);
          continue;
        }
        expect([r.passed, r.status, r.body?.code], `${id} ${verb} ${path}`).toEqual([false, 409, "REVISION_PATH_PROTECTED"]);
      }
    }
    expect(tree()).toEqual(before);
  });
});

describe("unresolvable targets (lead-24 F-2)", () => {
  it("an untracked entry through a dangling junction is refused with the could-not-confirm message; owned targets keep theirs", async () => {
    // The junction lives outside `tmp` so the byte walker never meets it.
    const links = mkdtempSync(join(tmpdir(), "podcli-fence-route-links-"));
    const doomed = join(links, "doomed");
    mkdirSync(doomed);
    symlinkSync(doomed, join(links, "dangling"), "junction");
    rmSync(doomed, { recursive: true, force: true });
    const list = JSON.parse(readFileSync(historyPath, "utf-8"));
    list.push(clip("ptr-dangling", join(links, "dangling", "x_short.mp4")));
    writeFileSync(historyPath, JSON.stringify(list, null, 2));
    const before = tree();
    for (const [verb, path, body] of REQUESTS) {
      if (verb === "patch") continue; // history-only edits have no path targets
      const r = await call(verb, path, "ptr-dangling", body);
      expect([r.passed, r.status, r.body?.code], `${verb} ${path}`).toEqual([false, 409, "REVISION_PATH_PROTECTED"]);
      expect(r.body.error, `${verb} ${path}`).toBe(FENCE_MESSAGES.unresolvable);
      const owned = await call(verb, path, "ptr-ns", body);
      expect(owned.body.error, `owned ${verb} ${path}`).toBe(FENCE_MESSAGES.owned);
    }
    expect(tree()).toEqual(before);
    // The wording the spec requires, independent of the constant.
    expect(FENCE_MESSAGES.unresolvable).toMatch(/could not confirm/i);
    expect(FENCE_MESSAGES.unresolvable).toMatch(/outside the Writing Studio revision folders/);
    expect(FENCE_MESSAGES.unresolvable).toMatch(/nothing was changed/i);
    for (const word of ["file", "drive", "link"]) expect(FENCE_MESSAGES.unresolvable).toContain(word);
    expect(FENCE_MESSAGES.unresolvable).not.toMatch(/[\\/]|\u2014/);
  });
});

describe("refusal mapping", () => {
  it("reads the stable code, and the unresolvable reason, from a CLI refusal and nothing else", () => {
    const red = "\x1b[38;2;248;113;113m";
    const tracked = cliFenceRefusal({ stdout: "", stderr: `\n  ${red}✗\x1b[0m CLIP_REVISION_TRACKED: ${FENCE_MESSAGES.tracked}\r\n` });
    expect([tracked?.code, tracked?.reason, tracked?.message]).toEqual(["CLIP_REVISION_TRACKED", undefined, FENCE_MESSAGES.tracked]);
    const owned = cliFenceRefusal({ stdout: "", stderr: `  ✗ REVISION_PATH_PROTECTED: ${FENCE_MESSAGES.owned}\n` });
    expect([owned?.code, owned?.reason, owned?.message]).toEqual(["REVISION_PATH_PROTECTED", "owned", FENCE_MESSAGES.owned]);
    const unresolvable = cliFenceRefusal({ stdout: "", stderr: `\n  ${red}✗\x1b[0m REVISION_PATH_PROTECTED: ${FENCE_MESSAGES.unresolvable}\r\n` });
    expect([unresolvable?.code, unresolvable?.reason, unresolvable?.message]).toEqual(["REVISION_PATH_PROTECTED", "unresolvable", FENCE_MESSAGES.unresolvable]);
    expect(cliFenceRefusal({ stdout: "", stderr: "\n  ✗ Clip not found: CLIP_REVISION_TRACKED: spoof\n" })).toBeNull();
    expect(cliFenceRefusal({ stdout: "", stderr: "History file is not valid JSON. No changes were written." })).toBeNull();
    expect(cliFenceRefusal({ stdout: "", stderr: "" })).toBeNull();
  });

  it("answers an adapter refusal with its status and exactly { error, code }, and nothing else (1B.2b.4a)", () => {
    const expected: Record<string, number> = {
      REVISION_BASE_UNAVAILABLE: 409, REVISION_BUSY: 409, REVISION_INPUT_MISSING: 409, REVISION_SAVE_FAILED: 500, INVALID_CAPTION_STYLE: 400,
    };
    expect(Object.keys(ADAPTER_MESSAGES).sort()).toEqual(Object.keys(expected).sort());
    for (const [code, status] of Object.entries(expected)) {
      const { captured, res } = responder();
      expect(sendAdapterRefusal(res as any, new LegacyAdapterError(code as any, "legacy-op"), "clip-1", "logo")).toBe(true);
      expect([captured.status, captured.body]).toEqual([status, { error: (ADAPTER_MESSAGES as any)[code], code }]);
      expect(captured.body.error).not.toMatch(/[\\/:]|\u2014/);
    }
    const { captured, res } = responder();
    expect(sendAdapterRefusal(res as any, new Error("not an adapter refusal"), "clip-1", "logo")).toBe(false);
    expect(captured.sent).toBe(false);
  });

  it("reads a renderer's sink refusal (WS-23) from the first line of a bridge error only", () => {
    const traceback = "\nTraceback (most recent call last):\n  File \"x.py\", line 1\nservices.clips_history.ClipRevisionFenceError: REVISION_PATH_PROTECTED: spoof\n";
    const owned = bridgeFenceRefusal(new Error(`ClipRevisionFenceError: REVISION_PATH_PROTECTED: ${FENCE_MESSAGES.owned}${traceback}`));
    expect([owned?.code, owned?.reason, owned?.message]).toEqual(["REVISION_PATH_PROTECTED", "owned", FENCE_MESSAGES.owned]);
    const unresolvable = bridgeFenceRefusal(new Error(`ClipRevisionFenceError: REVISION_PATH_PROTECTED: ${FENCE_MESSAGES.unresolvable}${traceback}`));
    expect([unresolvable?.code, unresolvable?.reason, unresolvable?.message]).toEqual(["REVISION_PATH_PROTECTED", "unresolvable", FENCE_MESSAGES.unresolvable]);
    expect(bridgeFenceRefusal(new Error(`RuntimeError: render failed${traceback}`))).toBeNull();
    expect(bridgeFenceRefusal(new Error("Video not found: REVISION_PATH_PROTECTED: x"))).toBeNull();
    expect(bridgeFenceRefusal("ClipRevisionFenceError: REVISION_PATH_PROTECTED: not an Error")).toBeNull();
  });

  it("answers 409 with exactly { error, code } and a plain message", () => {
    for (const code of ["CLIP_REVISION_TRACKED", "REVISION_PATH_PROTECTED"] as const) {
      const { captured, res } = responder();
      sendFenceRefusal(res as any, code, "clip-1", "edit");
      expect(captured.status).toBe(409);
      expect(Object.keys(captured.body).sort()).toEqual(["code", "error"]);
      expect(captured.body.code).toBe(code);
      expect(captured.body.error).not.toMatch(/[\\/]|\u2014/);
    }
  });
});

describe("wiring in the studio", () => {
  it("registers the fence once, after the host, origin and local-policy middleware and before every fenced handler", () => {
    const server = readFileSync(join(projectRoot, "src/ui/web-server.ts"), "utf-8");
    expect(server.match(/registerClipWriteFence\(app, clipsHistory\)/g)).toHaveLength(1);
    const fenceAt = server.indexOf("registerClipWriteFence(app, clipsHistory)");
    const policyAt = server.indexOf("const error = localRequestError(req.method, req.path");
    expect(policyAt).toBeGreaterThan(0);
    expect(policyAt).toBeLessThan(fenceAt);
    for (const route of FENCED_ROUTES) {
      const handlerAt = server.indexOf(`app.${route.verb}("${route.path}", async`);
      expect(handlerAt, `${route.verb} ${route.path}`).toBeGreaterThan(fenceAt);
    }
  });

  it("makes every fenced handler that reads the clip act on the checked entry", () => {
    const server = readFileSync(join(projectRoot, "src/ui/web-server.ts"), "utf-8");
    for (const path of ["/api/clips/:id/thumbnail", "/api/clips/:id/thumbnail/select", "/api/clips/:id/thumbnail/render", "/api/clips/:id/logo", "/api/clips/:id/rerender"]) {
      const at = server.indexOf(`app.post("${path}", async (req, res) => {`);
      const firstRead = server.slice(at).match(/const clip = [^\n]*/)?.[0];
      expect(firstRead, path).toBe("const clip = DEMO ? await clipsHistory.findById(req.params.id) : checkedClip(res);");
    }
    // PATCH and DELETE read nothing here: the Python writer re-checks the entry it holds under the lock.
    for (const [verb, path] of [["patch", "/api/clips/:id"], ["delete", "/api/clips/:id"]]) {
      const at = server.indexOf(`app.${verb}("${path}", async (req, res) => {`);
      const body = server.slice(at, server.indexOf("\n});", at));
      expect(body, `${verb} ${path}`).not.toMatch(/findById/);
    }
  });

  it("leaves the local policy for the blocked thumbnail routes unchanged, so it still answers first", () => {
    process.env.PODCLI_LOCAL_ONLY = "1";
    try {
      expect(localRequestError("POST", "/api/clips/x/thumbnail", {})).toMatch(/disabled/);
      expect(localRequestError("POST", "/api/clips/x/thumbnail/select", {})).toMatch(/disabled/);
      expect(localRequestError("POST", "/api/clips/x/thumbnail/render", {})).toBeNull();
    } finally {
      delete process.env.PODCLI_LOCAL_ONLY;
    }
  });
});

describe("guard-miss interleavings (WS-20)", () => {
  // Execute the actual route bodies without starting the whole server or sockets.
  // Unreached CLI/FFmpeg calls are sentinels, never media work or provider calls.
  const server = readFileSync(join(projectRoot, "src/ui/web-server.ts"), "utf8");
  function handler(path: string, demo: boolean, runCli: any, runFfmpeg: any) {
    const marker = `app.post("${path}", `;
    const start = server.indexOf(marker) + marker.length;
    const end = server.indexOf("\n});", start) + 2;
    expect(start).toBeGreaterThan(marker.length);
    const compiled = stripTypeScriptTypes(`const handler = ${server.slice(start, end)};`);
    return new Function("DEMO", "checkedClip", "clipsHistory", "runCli", "runFfmpeg", `${compiled}; return handler;`)(
      demo, checkedClip, history, runCli, runFfmpeg,
    );
  }
  for (const [, path, body] of REQUESTS.filter(([verb]) => verb === "post")) {
    for (const tracked of [true, false]) {
      it(`${path} ${body.action ?? ""}: missing then ${tracked ? "tracked" : "untracked"} namespace entry`, async () => {
        const backup = join(exportsDir, "logo-backup.mp4");
        writeFileSync(backup, "different backup bytes");
        const planted = clip("appearing", nsFile, {
          logo_backup_path: backup, ...(tracked ? { revisions: { malformed: true } } : {}),
        });
        const original = history.findById.bind(history);
        let afterPlant: Record<string, string>;
        const lookup = vi.spyOn(history, "findById").mockImplementation(async (id) => {
          const found = await original(id);
          const entries = JSON.parse(readFileSync(historyPath, "utf8"));
          entries.push(planted);
          writeFileSync(historyPath, JSON.stringify(entries));
          afterPlant = tree();
          return found;
        });
        const cli = vi.fn(() => { throw new Error("unexpected CLI call"); });
        const ffmpeg = vi.fn(() => { throw new Error("unexpected FFmpeg call"); });
        const runHandler = handler(path, false, cli, ffmpeg);
        const req = { params: { id: "appearing" }, body };
        const { captured, res } = responder();
        let next = false;
        await registered.find(r => r.path === path)!.handler(req, res, () => { next = true; });
        if (next) await runHandler(req, res);
        expect([captured.status, captured.body]).toEqual([404, { error: "clip not found" }]);
        expect(lookup).toHaveBeenCalledTimes(1);
        expect(tree()).toEqual(afterPlant!);
        expect([cli.mock.calls.length, ffmpeg.mock.calls.length]).toEqual([0, 0]);
        lookup.mockRestore();
      });
    }
    it(`${path} ${body.action ?? ""}: DEMO preserves the original missing-clip answer`, async () => {
      process.env.PODCLI_DEMO = "1";
      const lookup = vi.spyOn(history, "findById");
      const cli = vi.fn(); const ffmpeg = vi.fn();
      const { captured, res } = responder();
      const req = { params: { id: "no-such-clip" }, body };
      let next = false;
      const before = tree();
      await registered.find(r => r.path === path)!.handler(req, res, () => { next = true; });
      expect(next).toBe(true);
      await handler(path, true, cli, ffmpeg)(req, res);
      const logo = path.endsWith("/logo");
      expect([captured.status, captured.body]).toEqual(logo ? [200, { ok: true }] : [404, { error: "clip not found" }]);
      expect(lookup).toHaveBeenCalledTimes(logo ? 0 : 1);
      expect(tree()).toEqual(before);
      expect([cli.mock.calls.length, ffmpeg.mock.calls.length]).toEqual([0, 0]);
      lookup.mockRestore();
    });
  }
});
