import { describe, it, expect, beforeEach } from "vitest";
import { createHash } from "crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

// Writing Studio 1B.2b.4a: finishing-action adapters over the real history file and
// save service, with the fake exact renderer, composer and probes (no FFmpeg). The
// real bridge, HTTP routes and decoded media are proved by
// scripts/verification/check-legacy-adapters.mjs. Expected values come from the
// lead-26 contract and the fixture recipe, not from adapter output.

const tmp = mkdtempSync(join(tmpdir(), "podcli-adapters-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = join(tmp, "data");
process.env.PODCLI_OUTPUT = join(tmp, "exports");

const { ClipsHistory } = await import("./clips-history.js");
const { ClipRevisionService, REVISION_NAMESPACE } = await import("./clip-revisions.js");
const { ClipLegacyAdapters, CAPTION_STYLES, LegacyAdapterError } = await import("./clip-legacy-adapters.js");
const { fakeCompose, fakeExactRender, fakeProbe, fakeStreams } = await import("./clip-revisions.test-support.js");
type ServiceOptions = NonNullable<ConstructorParameters<typeof ClipRevisionService>[0]>;
type Adapters = InstanceType<typeof ClipLegacyAdapters>;

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const historyDir = join(tmp, "history");
const historyPath = join(historyDir, "clips.json");
const exportsDir = join(tmp, "exports");
const namespace = join(exportsDir, REVISION_NAMESPACE, "clip-a");
const source = join(tmp, "source.mp4");
const logo = join(tmp, "logo.png");
const imageA = join(tmp, "card-a.png");
const imageB = join(tmp, "card-b.png");
const backup = join(exportsDir, "legacy_short.mp4.pre-logo.mp4");
const legacyThumb = join(exportsDir, "thumbnails", "clip-a", "thumb_v1.png");
const legacyOutput = join(exportsDir, "legacy_short.mp4");

const WORDS = ["red", "green", "blue", "yellow", "cyan", "magenta"].map((word, i) => ({ word, start: i + 0.2, end: i + 0.7, confidence: 1, speaker: `S${i % 2}` }));
const RECIPE = {
  source_video: source, title: "Adapter clip", keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }],
  caption_style: "karaoke", crop_strategy: "center", format: "vertical" as const, clean_fillers: false,
};
/** The fake renderer's recorded source facts for RECIPE: the latest segment end, 1280x720, audio. */
const SOURCE_FACTS = { duration: 5, width: 1280, height: 720, has_audio: true };

const sha256 = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const entries = () => JSON.parse(readFileSync(historyPath, "utf-8")) as any[];
const entry = () => entries().find((e) => e.id === "clip-a");
const historyBytes = () => readFileSync(historyPath).toString("hex");
const docOf = (e: any) => JSON.parse(readFileSync(e.revisions.current.path, "utf-8"));
function hashes(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const item of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, item.name);
      if (item.isDirectory()) walk(p);
      else out[p] = sha256(p);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}
/** Edit the stored entry directly, as another writer or an earlier commit would have left it. */
function plant(change: (e: any) => void) {
  const list = entries();
  change(list.find((e) => e.id === "clip-a"));
  writeFileSync(historyPath, JSON.stringify(list, null, 2));
}

let history: InstanceType<typeof ClipsHistory>;
let render: ReturnType<typeof fakeExactRender>;
let compose: ReturnType<typeof fakeCompose>;

function reset() {
  rmSync(historyDir, { recursive: true, force: true });
  rmSync(exportsDir, { recursive: true, force: true });
  mkdirSync(historyDir, { recursive: true });
  mkdirSync(dirname(legacyThumb), { recursive: true });
  for (const [p, bytes] of [[source, "source-bytes"], [logo, "logo-bytes"], [imageA, "png-card-a"], [imageB, "png-card-b"], [backup, "stale pre-logo backup"], [legacyThumb, "legacy thumbnail"], [legacyOutput, "legacy output"]]) {
    rmSync(p, { recursive: true, force: true });
    writeFileSync(p, bytes);
  }
  writeFileSync(historyPath, JSON.stringify([{
    id: "clip-a", source_video: source, start_second: 1, end_second: 5, caption_style: "karaoke", crop_strategy: "center", format: "vertical",
    title: "Adapter clip", output_path: legacyOutput, file_size_mb: 0.01, duration: 4, created_at: "2026-09-01T00:00:00.000Z",
    thumbnail_config: { text: "Fixed text", line1: "LINE ONE", line2: "LINE TWO", preview_path: legacyThumb, card_seconds: 1.5 },
    unknown_field: { kept: true },
  }], null, 2));
  history = new ClipsHistory();
  render = fakeExactRender();
  compose = fakeCompose();
}
beforeEach(reset);

function service(over: Partial<ServiceOptions> = {}) {
  return new ClipRevisionService({ history, render, probe: fakeProbe, compose, streams: fakeStreams, ...over });
}
function adapters(over: Partial<ServiceOptions> = {}, sourceProbe = async () => ({ ...SOURCE_FACTS })): Adapters & { ids: string[] } {
  const ids: string[] = [];
  const a = new ClipLegacyAdapters({ history, service: service(over), sourceProbe, operationId: () => { const id = `legacy-op-${ids.length}`; ids.push(id); return id; } });
  return Object.assign(a, { ids });
}

/** Track the clip and commit an exact revision directly through the service, as Writing Studio would. */
async function committed(card: string | null = imageA, extra: Record<string, unknown> = {}) {
  const svc = service();
  const v0 = await svc.ensureTracked("clip-a");
  const r = await svc.saveRevision({
    clip_id: "clip-a", operation_id: "op-fixture", expected: { incarnation: v0.incarnation, draft_version: 0, revision_version: 0 },
    recipe: { ...RECIPE, ...extra }, source_words: WORDS,
    thumbnail_card: card ? { image_path: card, image_sha256: sha256(card), placement: "opening", duration: 1.5 } : null,
  });
  expect(r.outcome, JSON.stringify((r as any).operation)).toBe("committed");
  // An earlier commit left the legacy pointers stale; the adapters' commits must clear them.
  plant((e) => { e.logo_backup_path = backup; e.thumbnail_config = { ...e.thumbnail_config, preview_path: legacyThumb }; });
  render.calls = 0;
  compose.calls = 0;
  return entry();
}

const refusal = (code: string) => expect.objectContaining({ name: "LegacyAdapterError", code });

describe("deriving the next revision", () => {
  it("changes only the requested field, keeps the retained words and carries the card as its owned copy", async () => {
    const before = await committed();
    const prev = docOf(before);
    const kept = hashes(exportsDir);
    rmSync(imageA); // the original upload need not survive
    const a = adapters();
    const out = await a.commit(await a.prepare(before), { recipe: (r) => { r.caption_style = "hormozi"; } });
    expect([out.committed, out.operationId, render.calls, compose.calls]).toEqual([true, "legacy-op-0", 1, 1]);
    const e = entry();
    const doc = docOf(e);
    expect(doc.recipe).toEqual({ ...prev.recipe, caption_style: "hormozi" });
    expect(doc.source_words).toEqual(prev.source_words);
    expect(doc.operation_id).toBe("legacy-op-0");
    expect(render.lastParams).toMatchObject({ timing_mode: "exact", caption_style: "hormozi", keep_segments: RECIPE.keep_segments });
    // The carried card is the committed owned copy with its recorded hash.
    expect(compose.lastParams).toMatchObject({ image_path: prev.thumbnail_card.image.path, image_sha256: prev.thumbnail_card.image.sha256 });
    expect(doc.thumbnail_card.descriptor).toEqual({ image_path: prev.thumbnail_card.image.path, image_sha256: prev.thumbnail_card.image.sha256, placement: "opening", duration: 1.5 });
    expect(e.revisions.previous.revision_id).toBe(prev.revision_id);
    // Projection: no stale backup, the preview is the new owned card copy, legacy files untouched.
    expect(e.logo_backup_path).toBeUndefined();
    expect(e.thumbnail_config).toEqual({ text: "Fixed text", line1: "LINE ONE", line2: "LINE TWO", preview_path: doc.thumbnail_card.image.path, card_seconds: doc.final_composition.card.measured_duration });
    expect(sha256(e.thumbnail_config.preview_path)).toBe(prev.thumbnail_card.image.sha256);
    expect(e.unknown_field).toEqual({ kept: true });
    for (const [p, h] of Object.entries(kept)) expect(sha256(p), p).toBe(h);
    // A second request gets its own operation ID.
    await a.commit(await a.prepare(entry()), { recipe: (r) => { r.caption_style = "subtle"; } });
    expect(entry().revisions.current.operation_id).toBe("legacy-op-1");
  });

  it("applies and removes a logo as a recipe change the renderer draws; the card stays the carried one", async () => {
    const before = await committed();
    const a = adapters();
    await a.commit(await a.prepare(before), { recipe: (r) => { r.logo_path = logo; r.logo_position = "bottom-left"; } });
    const withLogo = docOf(entry());
    expect(withLogo.recipe).toEqual({ ...RECIPE, logo_path: logo, logo_position: "bottom-left" });
    expect(render.lastParams).toMatchObject({ logo_path: logo, logo_position: "bottom-left" });
    expect([entry().logo_path, entry().logo_position]).toEqual([logo, "bottom-left"]);
    await a.commit(await a.prepare(entry()), { recipe: (r) => { delete r.logo_path; } });
    const without = docOf(entry());
    expect(without.recipe).toEqual({ ...RECIPE, logo_position: "bottom-left" });
    expect(render.lastParams).not.toHaveProperty("logo_path");
    expect(entry().logo_path).toBeUndefined();
    expect(without.thumbnail_card.image.sha256).toBe(sha256(imageA));
    // Logo removal copies no backup: the stale backup is untouched and unreferenced.
    expect(readFileSync(backup, "utf-8")).toBe("stale pre-logo backup");
    expect(entry().logo_backup_path).toBeUndefined();
  });

  it("a new card replaces the carried one, and its thumbnail settings land in the same commit", async () => {
    const before = await committed();
    const a = adapters();
    const settings = { ...before.thumbnail_config, line1: "NEW", variations: [imageB], preview_path: "ignored", card_seconds: 9 };
    await a.commit(await a.prepare(before), { card: await a.cardFrom(imageB), thumbnailMetadata: settings });
    const e = entry();
    const doc = docOf(e);
    expect(doc.recipe).toEqual(RECIPE);
    expect(doc.thumbnail_card.descriptor).toEqual({ image_path: imageB, image_sha256: sha256(imageB), placement: "opening", duration: 1.5 });
    expect(e.thumbnail_config).toEqual({
      text: "Fixed text", line1: "NEW", line2: "LINE TWO", variations: [imageB],
      preview_path: doc.thumbnail_card.image.path, card_seconds: doc.final_composition.card.measured_duration,
    });
    expect(sha256(e.thumbnail_config.preview_path)).toBe(sha256(imageB));
  });

  it("a failed save stores none of its thumbnail settings", async () => {
    const before = await committed();
    const a = adapters({ render: fakeExactRender({ failWith: new Error("render crashed (injected)") }) });
    await expect(a.commit(await a.prepare(before), { card: await a.cardFrom(imageB), thumbnailMetadata: { variations: [imageB] } }))
      .rejects.toEqual(refusal("REVISION_SAVE_FAILED"));
    expect(entry().thumbnail_config).toEqual(before.thumbnail_config);
  });
});

describe("unchanged requests", () => {
  it("render nothing and leave history and groups byte-identical", async () => {
    const before = await committed();
    const bytes = historyBytes();
    const groups = hashes(namespace);
    const a = adapters();
    const same = await a.commit(await a.prepare(before), { recipe: (r) => { r.caption_style = "karaoke"; } });
    // A card with the current card's bytes, chosen from another file, is the same card.
    copyFileSync(imageA, imageB);
    const sameCard = await a.commit(await a.prepare(before), { card: await a.cardFrom(imageB) });
    expect([same.committed, sameCard.committed, same.operationId, render.calls, compose.calls]).toEqual([false, false, null, 0, 0]);
    expect(historyBytes()).toBe(bytes);
    expect(hashes(namespace)).toEqual(groups);
  });

  it("still store supplied thumbnail settings, keeping the projected keys, and rewrite nothing when they already match", async () => {
    const before = await committed();
    const a = adapters();
    const settings = { ...before.thumbnail_config, variations: [imageA], preview_path: "ignored", card_seconds: 9 };
    const out = await a.commit(await a.prepare(before), { card: await a.cardFrom(imageA), thumbnailMetadata: settings });
    expect([out.committed, render.calls]).toEqual([false, 0]);
    expect(entry().thumbnail_config).toEqual({ ...before.thumbnail_config, variations: [imageA] });
    expect(entry().revisions).toEqual(before.revisions);
    const bytes = historyBytes();
    await a.commit(await a.prepare(entry()), { card: await a.cardFrom(imageA), thumbnailMetadata: settings });
    expect(historyBytes()).toBe(bytes);
  });
});

describe("unavailable bases", () => {
  const cases: Array<[string, () => Promise<void>]> = [
    ["version zero", async () => { await service().ensureTracked("clip-a"); }],
    ["no current revision", async () => { plant((e) => { delete e.output_path; }); await service().ensureTracked("clip-a"); }],
    ...(["not-a-state", 0, [], {}, { schema: 1 }, { schema: 2, incarnation: "i", draft_version: 0, revision_version: 1, draft: null, current: null, operations: [] }] as unknown[])
      .map((value): [string, () => Promise<void>] => [`malformed revisions ${JSON.stringify(value)}`, async () => { plant((e) => { e.revisions = value; }); }]),
    ["unreadable document", async () => { await committed(); rmSync(entry().revisions.current.path); }],
    ["invalid document JSON", async () => { await committed(); writeFileSync(entry().revisions.current.path, "{ not json"); }],
    ["document of another clip", async () => { await committed(); const p = entry().revisions.current.path; writeFileSync(p, JSON.stringify({ ...JSON.parse(readFileSync(p, "utf-8")), clip_id: "clip-b" })); }],
    ["document with an invalid recipe", async () => { await committed(); const p = entry().revisions.current.path; const d = JSON.parse(readFileSync(p, "utf-8")); d.recipe.keep_segments = []; writeFileSync(p, JSON.stringify(d)); }],
    ["document of another version", async () => { await committed(); const p = entry().revisions.current.path; writeFileSync(p, JSON.stringify({ ...JSON.parse(readFileSync(p, "utf-8")), version: 7 })); }],
    ["applied card without its image", async () => { await committed(); const p = entry().revisions.current.path; const d = JSON.parse(readFileSync(p, "utf-8")); delete d.thumbnail_card.image; writeFileSync(p, JSON.stringify(d)); }],
  ];
  for (const [label, arrange] of cases) {
    it(`${label}: REVISION_BASE_UNAVAILABLE before any write or render`, async () => {
      await arrange();
      const bytes = historyBytes();
      const files = hashes(tmp);
      const a = adapters();
      await expect(a.prepare(entry())).rejects.toEqual(refusal("REVISION_BASE_UNAVAILABLE"));
      expect([historyBytes() === bytes, render.calls, a.ids]).toEqual([true, 0, []]);
      expect(hashes(tmp)).toEqual(files);
    });
  }
});

describe("busy clips", () => {
  it("a draft or a pending operation answers REVISION_BUSY before any work", async () => {
    await committed();
    const svc = service();
    const st = entry().revisions;
    await svc.saveDraft({ clip_id: "clip-a", expected: { incarnation: st.incarnation, draft_version: 0, revision_version: 1 }, draft: { recipe: RECIPE, source_words: WORDS } });
    let bytes = historyBytes();
    await expect(adapters().prepare(entry())).rejects.toEqual(refusal("REVISION_BUSY"));
    expect(historyBytes()).toBe(bytes);
    plant((e) => { e.revisions.draft = null; e.revisions.operations.push({ ...e.revisions.operations[0], operation_id: "op-stale", state: "pending", revision: null }); });
    bytes = historyBytes();
    await expect(adapters().prepare(entry())).rejects.toEqual(refusal("REVISION_BUSY"));
    expect([historyBytes() === bytes, render.calls]).toEqual([true, 0]);
  });

  it("an expected state changed between the guard and the pending record answers REVISION_BUSY and records nothing", async () => {
    const before = await committed();
    const a = adapters();
    const base = await a.prepare(before);
    // Another editor saves a draft after the guard, before this save records its pending operation.
    const original = history.transaction.bind(history);
    let calls = 0;
    history.transaction = (async (fn: any) => {
      if (++calls === 2) {
        await original((list: any[]) => { const s = list.find((e) => e.id === "clip-a").revisions; s.draft_version += 1; s.draft = { version: s.draft_version, path: "elsewhere.json", saved_at: "now" }; });
      }
      return original(fn);
    }) as any;
    const groups = hashes(namespace);
    await expect(a.commit(base, { recipe: (r) => { r.caption_style = "hormozi"; } })).rejects.toEqual(refusal("REVISION_BUSY"));
    history.transaction = original;
    const e = entry();
    expect([render.calls, e.revisions.operations.length, e.revisions.current.revision_id]).toEqual([0, 1, before.revisions.current.revision_id]);
    expect(hashes(namespace)).toEqual(groups);
  });

  it("an unchanged request with thumbnail settings still answers REVISION_BUSY when the clip changed meanwhile", async () => {
    const before = await committed();
    const a = adapters();
    const base = await a.prepare(before);
    plant((e) => { e.revisions.draft_version += 1; });
    const bytes = historyBytes();
    await expect(a.commit(base, { card: await a.cardFrom(imageA), thumbnailMetadata: { variations: [imageA] } })).rejects.toEqual(refusal("REVISION_BUSY"));
    expect(historyBytes()).toBe(bytes);
  });
});

describe("missing or changed inputs", () => {
  const cases: Array<[string, (e: any) => void, ((a: Adapters) => Promise<unknown>)?]> = [
    ["source missing", () => rmSync(source)],
    ["source no longer a regular file", () => { rmSync(source); mkdirSync(source); }],
    ["logo missing", (e) => rmSync(docOf(e).recipe.logo_path)],
    ["card image copy missing", (e) => rmSync(docOf(e).thumbnail_card.image.path)],
    ["card image copy changed", (e) => writeFileSync(docOf(e).thumbnail_card.image.path, "other bytes")],
  ];
  for (const [label, arrange] of cases) {
    it(`${label}: REVISION_INPUT_MISSING before any render`, async () => {
      const before = await committed(imageA, { logo_path: logo, logo_position: "top-right" });
      arrange(before);
      const bytes = historyBytes();
      const a = adapters();
      await expect(a.commit(await a.prepare(before), { recipe: (r) => { r.caption_style = "hormozi"; } })).rejects.toEqual(refusal("REVISION_INPUT_MISSING"));
      expect([historyBytes() === bytes, render.calls, a.ids]).toEqual([true, 0, []]);
    });
  }

  it("a source whose probe differs from the rendered one is changed; so is an unreadable probe", async () => {
    const before = await committed();
    for (const probe of [
      async () => ({ ...SOURCE_FACTS, duration: 7 }), async () => ({ ...SOURCE_FACTS, width: 640 }),
      async () => ({ ...SOURCE_FACTS, has_audio: false }), async () => { throw new Error("ffprobe failed"); },
    ]) {
      const a = adapters({}, probe);
      await expect(a.commit(await a.prepare(before), { recipe: (r) => { r.caption_style = "hormozi"; } })).rejects.toEqual(refusal("REVISION_INPUT_MISSING"));
    }
    expect(render.calls).toBe(0);
  });

  it("an action that writes a new image first checks the kept inputs before any work, and a vanished new image is missing", async () => {
    const before = await committed();
    rmSync(source);
    await expect(adapters().prepare(before, { inputs: true })).rejects.toEqual(refusal("REVISION_INPUT_MISSING"));
    await expect(adapters().cardFrom(join(tmp, "no-such.png"))).rejects.toEqual(refusal("REVISION_INPUT_MISSING"));
  });
});

describe("save failures", () => {
  const failures: Array<[string, Partial<ServiceOptions>]> = [
    ["render", { render: fakeExactRender({ failWith: new Error("render crashed (injected)") }) }],
    ["composition", { compose: fakeCompose({ failWith: new Error("composer crashed (injected)") }) }],
    ["probe", { probe: async () => { throw new Error("probe failed (injected)"); } }],
    ["commit", { hooks: { beforeCommit: () => { throw new Error("commit interrupted (injected)"); } } }],
  ];
  for (const [label, over] of failures) {
    it(`${label} failure: REVISION_SAVE_FAILED with its operation ID, and the previous revision keeps serving`, async () => {
      const before = await committed();
      const served = sha256(before.output_path);
      const a = adapters(over);
      const err = await a.commit(await a.prepare(before), { recipe: (r) => { r.caption_style = "hormozi"; } }).catch((e) => e);
      expect(err).toBeInstanceOf(LegacyAdapterError);
      expect([err.code, err.status, err.operationId]).toEqual(["REVISION_SAVE_FAILED", 500, "legacy-op-0"]);
      expect(err.message).not.toMatch(/[\\/]|injected/);
      const e = entry();
      for (const key of ["output_path", "duration", "file_size_mb", "caption_style", "thumbnail_config", "keep_segments"]) expect(e[key], key).toEqual(before[key]);
      expect(e.revisions.current).toEqual(before.revisions.current);
      expect(sha256(e.output_path)).toBe(served);
      // The failed operation keeps its detail in history, not in the refusal.
      const op = e.revisions.operations.find((o: any) => o.operation_id === "legacy-op-0");
      expect(op.state).toBe(label === "commit" ? "pending" : "failed");
    });
  }

  it("a commit that fails inside its history transaction is a save failure too", async () => {
    const before = await committed();
    const a = adapters();
    const base = await a.prepare(before);
    const original = history.transaction.bind(history);
    let calls = 0;
    history.transaction = (async (fn: any) => {
      // replay check, begin, commit
      if (++calls === 3) throw new Error("history write failed (injected)");
      return original(fn);
    }) as any;
    await expect(a.commit(base, { recipe: (r) => { r.caption_style = "hormozi"; } })).rejects.toEqual(refusal("REVISION_SAVE_FAILED"));
    history.transaction = original;
    expect(entry().revisions.current).toEqual(before.revisions.current);
  });
});

describe("request identity and replay", () => {
  // The pre-slice request identity: SHA-256 of the sorted-key JSON of these fields, undefined ones omitted.
  const stable = (v: unknown): string => Array.isArray(v) ? `[${v.map(stable).join(",")}]`
    : v && typeof v === "object" ? `{${Object.keys(v).filter((k) => (v as any)[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable((v as any)[k])}`).join(",")}}`
    : JSON.stringify(v);
  it("a save without thumbnail settings keeps the pre-slice identity and its replay rewrites nothing", async () => {
    const svc = service();
    const v0 = await svc.ensureTracked("clip-a");
    const expected = { incarnation: v0.incarnation, draft_version: 0, revision_version: 0 };
    const request = { clip_id: "clip-a", operation_id: "op-1", expected, recipe: RECIPE, source_words: WORDS };
    await svc.saveRevision(request);
    const op = entry().revisions.operations[0];
    expect(op.request_hash).toBe(createHash("sha256").update(stable({ clip_id: "clip-a", expected, recipe: RECIPE, source_words: WORDS })).digest("hex"));
    const bytes = historyBytes();
    expect(await svc.saveRevision({ ...request, thumbnail_metadata: null })).toMatchObject({ outcome: "committed", replayed: true });
    expect(historyBytes()).toBe(bytes);
    // Settings are part of a request's identity when present.
    await expect(svc.saveRevision({ ...request, thumbnail_metadata: { variations: [] } })).rejects.toMatchObject({ code: "OPERATION_ID_REUSED" });
  });
});

describe("production boundaries", () => {
  it("only the adapter module imports the save service, and no production code starts tracking", () => {
    const service = resolve(projectRoot, "src", "services", "clip-revisions.ts");
    const importers: string[] = [];
    const callers: string[] = [];
    const walk = (dir: string) => {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, item.name);
        if (item.isDirectory()) { walk(p); continue; }
        if (!/\.tsx?$/.test(item.name) || /\.test\.tsx?$|test-support\.ts$/.test(item.name)) continue;
        const code = readFileSync(p, "utf-8");
        for (const m of code.matchAll(/(?:from\s+|import\(\s*)["'](\.[^"']+)["']/g)) {
          if (resolve(dirname(p), m[1]).replace(/\.js$/, ".ts") === service) importers.push(p.slice(projectRoot.length + 1).split("\\").join("/"));
        }
        if (p !== service && /\bensureTracked\s*\(/.test(code)) callers.push(p);
      }
    };
    walk(join(projectRoot, "src"));
    expect([...new Set(importers)]).toEqual(["src/services/clip-legacy-adapters.ts"]);
    expect(callers).toEqual([]);
  });
});

describe("previews and styles", () => {
  it("a tracked clip previews from its current raw render, never the legacy backup; version zero from its served file", async () => {
    const e = await committed();
    const base = await adapters().previewBase(e);
    expect(base).toBe(docOf(e).final_composition.raw_render.file.path);
    expect(base).not.toBe(e.logo_backup_path);
    reset();
    await service().ensureTracked("clip-a");
    plant((x) => { x.logo_backup_path = backup; });
    expect(await adapters().previewBase(entry())).toBe(legacyOutput);
  });

  it("accepts exactly the caption styles clips edit accepts", () => {
    const cli = readFileSync(join(projectRoot, "backend", "cli.py"), "utf-8");
    const choices = /choices = \[([^\]]+)\]\s*\r?\n\s*if args\.caption_style is not None/.exec(cli)?.[1];
    expect(choices, "clips edit caption-style choices").toBeTruthy();
    expect([...CAPTION_STYLES].sort()).toEqual(JSON.parse(`[${choices}]`).sort());
  });
});
