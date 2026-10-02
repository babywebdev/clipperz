import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash } from "crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, symlinkSync, utimesSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, dirname, join } from "path";

// Writing Studio 1B.2b.1: opening thumbnail card saves through the revision
// service, with the fake exact renderer and the fake composer, which reproduce
// the accepted renderer's and backend/services/opening_card.py's group
// publication and receipts without FFmpeg. Real media composition is covered by
// tests/test_opening_card.py and clip-revisions.card-producer.test.ts, the real
// bridge by scripts/verification/check-saved-revision.mjs and real process
// interruption by clip-revisions.process.test.ts.

const tmp = mkdtempSync(join(tmpdir(), "podcli-card-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = join(tmp, "data");
process.env.PODCLI_OUTPUT = join(tmp, "exports");

const atomicState = vi.hoisted(() => ({ failMatching: null as string | null }));
vi.mock("../utils/atomic-file.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/atomic-file.js")>();
  return {
    ...actual,
    writeFileAtomic: async (p: string, d: string) => {
      if (atomicState.failMatching && p.includes(atomicState.failMatching)) {
        atomicState.failMatching = null;
        throw new Error("disk full (injected)");
      }
      return actual.writeFileAtomic(p, d);
    },
  };
});

const { ClipsHistory } = await import("./clips-history.js");
const { ClipRevisionService, REVISION_NAMESPACE } = await import("./clip-revisions.js");
const { fakeCompose, fakeExactRender, fakeProbe, fakeStreams } = await import("./clip-revisions.test-support.js");
const { StorageCleanup } = await import("./storage-cleanup.js");
type FakeComposeOptions = import("./clip-revisions.test-support.js").FakeComposeOptions;
type ServiceOptions = NonNullable<ConstructorParameters<typeof ClipRevisionService>[0]>;
type Service = InstanceType<typeof ClipRevisionService>;

const historyDir = join(tmp, "history");
const historyPath = join(historyDir, "clips.json");
const exportsDir = join(tmp, "exports");
const namespace = join(exportsDir, REVISION_NAMESPACE, "clip-c");
const sidecars = join(historyDir, "revisions", "clip-c");
const source = join(tmp, "source.mp4");
const intro = join(tmp, "intro.mp4");
const outro = join(tmp, "outro.mp4");
const logo = join(tmp, "logo.png");
const imageA = join(tmp, "card-a.png");
const imageB = join(tmp, "card-b.jpg");
const legacyOutput = join(exportsDir, "legacy_short.mp4");

const WORDS = ["red", "green", "blue", "yellow", "cyan", "magenta"].map((word, i) => ({ word, start: i + 0.2, end: i + 0.7, confidence: 1, speaker: `S${i % 2}` }));
const seedClip = {
  id: "clip-c", source_video: source, start_second: 1, end_second: 2, caption_style: "karaoke", crop_strategy: "center", format: "vertical",
  title: "Card clip", output_path: legacyOutput, file_size_mb: 0.01, duration: 1, created_at: "2026-09-01T00:00:00.000Z", extra: { keep: true },
};

const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const cardOf = (path: string) => ({ image_path: path, image_sha256: sha256(path), placement: "opening" as const, duration: 1.5 as const });
const entries = () => JSON.parse(readFileSync(historyPath, "utf-8")) as any[];
const entry = () => entries().find((e) => e.id === "clip-c");
const historyBytes = () => readFileSync(historyPath);
const groups = () => (existsSync(namespace) ? readdirSync(namespace).sort() : []);
const recipe = (over: Record<string, unknown> = {}) => ({
  source_video: source, title: "Card clip", keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }],
  caption_style: "karaoke", crop_strategy: "center", format: "vertical" as const, clean_fillers: false, ...over,
});
const expectedOf = (s: { incarnation: string; draft_version: number; revision_version: number }) => ({ incarnation: s.incarnation, draft_version: s.draft_version, revision_version: s.revision_version });

/** Every file beneath `dir` with its SHA-256: earlier outputs must stay byte-identical. */
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
function expectKept(before: Record<string, string>) {
  for (const [path, hash] of Object.entries(before)) expect(sha256(path), path).toBe(hash);
}

let history: InstanceType<typeof ClipsHistory>;

function reset() {
  rmSync(historyDir, { recursive: true, force: true });
  rmSync(exportsDir, { recursive: true, force: true });
  mkdirSync(historyDir, { recursive: true });
  mkdirSync(exportsDir, { recursive: true });
  for (const [p, bytes] of [[source, "source-bytes"], [intro, "intro-bytes"], [outro, "outro-bytes"], [logo, "logo-bytes"], [imageA, "png-card-a"], [imageB, "jpg-card-b"], [legacyOutput, "legacy-output-bytes"]]) writeFileSync(p, bytes);
  writeFileSync(historyPath, JSON.stringify([seedClip], null, 2));
  atomicState.failMatching = null;
  history = new ClipsHistory();
}
beforeEach(reset);

function service(over: Partial<ServiceOptions> = {}): Service {
  return new ClipRevisionService({ history, render: fakeExactRender(), probe: fakeProbe, compose: fakeCompose(), streams: fakeStreams, ...over });
}
async function tracked(over: Partial<ServiceOptions> = {}) {
  const svc = service(over);
  const state = await svc.ensureTracked("clip-c");
  return { svc, state };
}
/** A save against the clip's current expected state. */
function save(svc: Service, operationId: string, over: Record<string, unknown> = {}): Promise<any> {
  return svc.saveRevision({ clip_id: "clip-c", operation_id: operationId, expected: expectedOf(entry().revisions), recipe: recipe(), source_words: WORDS, ...over } as any);
}

describe("opening card drafts", () => {
  it("a draft persists the card choice without rendering, composing or touching served media; a changed, missing or malformed card is refused", async () => {
    const render = fakeExactRender();
    const compose = fakeCompose();
    const { svc, state } = await tracked({ render, compose });
    const legacyHash = sha256(legacyOutput);
    const saved = await svc.saveDraft({ clip_id: "clip-c", expected: expectedOf(state), draft: { recipe: recipe(), source_words: WORDS, thumbnail_card: cardOf(imageA) } });
    expect(JSON.parse(readFileSync(saved.draft.path, "utf-8")).draft.thumbnail_card).toEqual(cardOf(imageA));
    expect([render.calls, compose.calls, groups()]).toEqual([0, 0, []]);
    expect([sha256(legacyOutput), entry().output_path, entry().revisions.draft_version, entry().revisions.revision_version]).toEqual([legacyHash, legacyOutput, 1, 0]);

    const before = historyBytes();
    const draft = (card: unknown) => svc.saveDraft({ clip_id: "clip-c", expected: expectedOf(entry().revisions), draft: { recipe: recipe(), source_words: WORDS, thumbnail_card: card as any } });
    await expect(draft({ ...cardOf(imageA), duration: 3 })).rejects.toMatchObject({ code: "INVALID_THUMBNAIL_CARD" });
    const chosen = cardOf(imageA);
    writeFileSync(imageA, "png-card-a-edited");
    await expect(draft(chosen)).rejects.toMatchObject({ code: "CARD_IMAGE_MISMATCH" });
    await expect(draft({ ...chosen, image_path: join(tmp, "gone.png") })).rejects.toMatchObject({ code: "CARD_IMAGE_MISMATCH" });
    expect(historyBytes()).toEqual(before);
    expect(readdirSync(sidecars)).toHaveLength(1);
  });
});

describe("saving an opening card", () => {
  it("commits the card once before a fresh exact render; the raw receipt, raw group and final composition record stay truthful", async () => {
    const render = fakeExactRender();
    const compose = fakeCompose();
    const { svc } = await tracked({ render, compose });
    const legacyHash = sha256(legacyOutput);
    const r = await save(svc, "op-1", { recipe: recipe({ intro_path: intro, outro_path: outro, keep_caption_overlay: true }), thumbnail_card: cardOf(imageA) });
    expect(r.outcome, r.operation?.error).toBe("committed");
    expect([render.calls, compose.calls]).toEqual([1, 1]);

    const st = entry().revisions;
    const [rawGroup, cardGroup] = st.current.groups;
    expect(groups()).toEqual([basename(rawGroup), basename(cardGroup)].sort());
    expect([dirname(rawGroup), dirname(cardGroup), st.current.group_root, dirname(dirname(st.current.output_path))]).toEqual([namespace, namespace, cardGroup, cardGroup]);
    expect(readdirSync(join(cardGroup, "final")).sort()).toEqual(["Card_clip_short.mp4", "card-image.png"]);
    expect(readdirSync(rawGroup)).toEqual(["final"]);

    const doc = JSON.parse(readFileSync(st.current.path, "utf-8"));
    const rawPath = doc.final_composition.raw_render.file.path;
    expect(dirname(dirname(rawPath))).toBe(rawGroup);
    expect(compose.lastParams).toEqual({
      raw_video_path: rawPath, raw_sha256: sha256(rawPath), image_path: imageA, image_sha256: sha256(imageA), output_dir: namespace,
      group_stem: expect.stringMatching(/^Card_clip_short_card-[0-9a-f]{8}$/), placement: "opening", duration: 1.5,
    });
    // The renderer's receipt is kept unmodified: it describes the raw render, which has no card.
    expect([doc.render_timeline.thumbnail_card.applied, doc.render_timeline.output.path, doc.render_timeline.output_duration]).toEqual([false, rawPath, 4]);
    expect(doc.thumbnail_card).toMatchObject({ requested: true, applied: true, descriptor: cardOf(imageA), group_root: cardGroup, image: { path: join(cardGroup, "final", "card-image.png"), sha256: sha256(imageA) } });
    expect(doc.files.main).toEqual({ path: st.current.output_path, bytes: expect.any(Number), sha256: sha256(st.current.output_path) });
    expect(dirname(dirname(doc.files.caption_overlay.path))).toBe(rawGroup);

    const fc = doc.final_composition;
    expect(fc).toMatchObject({
      version: 1,
      card: { placement: "opening", transition: "hardcut", overlap: 0, requested_duration: 1.5, frames: 38, measured_duration: 1.52, output_start: 0, output_end: 1.52, group_root: cardGroup, audio_samples: 67032 },
      card_offset: 1.52,
      content_duration: 2,
      raw_render: { group_root: rawGroup, output_duration: 4, content_to_output_offset: 1, file: { path: rawPath } },
      output: { file: doc.files.main, probe: { has_video: true, has_audio: true } },
      artifacts: {
        main: { path: st.current.output_path, contains_card: true, placed_at: 0 },
        raw_render: { path: rawPath, contains_card: false, placed_at: 1.52 },
        caption_overlay: { path: doc.files.caption_overlay.path, contains_card: false },
        cropped_source: { path: doc.files.cropped_source.path, contains_card: false },
        card_image: { path: doc.thumbnail_card.image.path, contains_card: true, placed_at: 0, until: 1.52 },
      },
    });
    // Content starts after the card and the 1 s intro; every offset is the card plus a raw offset.
    expect(fc.content_offset).toBeCloseTo(2.52, 9);
    expect(fc.artifacts.caption_overlay.placed_at).toBeCloseTo(2.52, 9);
    expect(fc.output.duration).toBeCloseTo(5.52, 9);
    expect(doc.probe.duration).toBeCloseTo(5.52, 9);
    expect(fc.card.producer).toMatchObject({ version: 1, kind: "opening_card" });
    expect(Object.keys(fc.time_domains).length).toBeGreaterThan(2);

    // Legacy readers see the served file: its path, probed duration, size and card length,
    // and (1B.2b.4a) the committed card image's owned copy as the thumbnail preview.
    const e = entry();
    expect([e.output_path, e.duration, e.thumbnail_config]).toEqual([st.current.output_path, 5.52, { card_seconds: 1.52, preview_path: doc.thumbnail_card.image.path }]);
    expect(sha256(e.thumbnail_config.preview_path)).toBe(doc.thumbnail_card.descriptor.image_sha256);
    expect(e.file_size_mb).toBe(Math.round((doc.files.main.bytes / (1024 * 1024)) * 100) / 100);
    expect(st.operations[0]).toMatchObject({ state: "committed", group_root: cardGroup, revision: { groups: [rawGroup, cardGroup] } });
    const checks = await svc.verifyRevisionFiles(await svc.loadRevision("clip-c", doc.revision_id));
    expect(checks.map((c) => [c.path, c.ok])).toEqual([
      [st.current.output_path, true], [doc.files.caption_overlay.path, true], [doc.files.cropped_source.path, true], [rawPath, true], [doc.thumbnail_card.image.path, true],
    ]);
    expect(sha256(legacyOutput)).toBe(legacyHash);
  });

  it("replay answers from history without rendering or composing, even with the image and source gone; the same id with another card or none conflicts", async () => {
    const render = fakeExactRender();
    const compose = fakeCompose();
    const { svc, state } = await tracked({ render, compose });
    const request = { clip_id: "clip-c", operation_id: "op-1", expected: expectedOf(state), recipe: recipe(), source_words: WORDS, thumbnail_card: cardOf(imageA) };
    const first: any = await svc.saveRevision(structuredClone(request));
    expect(first.outcome).toBe("committed");
    rmSync(imageA);
    rmSync(source);
    const bytes = historyBytes();
    const before = groups();
    const replay: any = await svc.saveRevision(structuredClone(request));
    expect([replay.outcome, replay.replayed, replay.revision.revision_id, replay.revision.output_path, render.calls, compose.calls])
      .toEqual(["committed", true, first.revision.revision_id, first.revision.output_path, 1, 1]);
    expect(replay.revision.groups).toEqual(first.revision.groups);
    expect([historyBytes(), groups()]).toEqual([bytes, before]);
    writeFileSync(source, "source-bytes");
    await expect(svc.saveRevision({ ...structuredClone(request), thumbnail_card: cardOf(imageB) })).rejects.toMatchObject({ code: "OPERATION_ID_REUSED" });
    await expect(svc.saveRevision({ ...structuredClone(request), thumbnail_card: null })).rejects.toMatchObject({ code: "OPERATION_ID_REUSED" });
    expect([render.calls, compose.calls, historyBytes()]).toEqual([1, 1, bytes]);
  });

  it("changing, removing and restoring the card or changing content and logo composes from each fresh render and never alters an earlier file", async () => {
    const render = fakeExactRender();
    const compose = fakeCompose();
    const { svc } = await tracked({ render, compose });
    const legacyHash = sha256(legacyOutput);
    const steps: Array<[string, Record<string, any>]> = [
      ["card A", { thumbnail_card: cardOf(imageA) }],
      ["card B", { thumbnail_card: cardOf(imageB) }],
      ["card removed", { thumbnail_card: null }],
      ["content and logo with card A", { recipe: recipe({ keep_segments: [{ start: 2, end: 4 }], logo_path: logo }), thumbnail_card: cardOf(imageA) }],
    ];
    let kept: Record<string, string> = {};
    const seen = new Set<string>();
    for (const [i, [label, over]] of steps.entries()) {
      const before = entry().revisions.current;
      const r = await save(svc, `op-${i + 1}`, over);
      expect(r.outcome, `${label}: ${r.operation?.error}`).toBe("committed");
      expectKept(kept);
      const st = entry().revisions;
      expect(st.previous.revision_id, label).toBe(before.revision_id);
      for (const g of st.current.groups) {
        expect(seen.has(g), `${label} reused ${g}`).toBe(false);
        seen.add(g);
      }
      const doc = JSON.parse(readFileSync(st.current.path, "utf-8"));
      if (over.thumbnail_card) {
        // Composed from this operation's own fresh render, never from an earlier revision's file.
        expect(dirname(dirname(String(compose.lastParams!.raw_video_path))), label).toBe(st.current.groups[0]);
        expect(doc.thumbnail_card.descriptor, label).toEqual(over.thumbnail_card);
        expect(sha256(doc.thumbnail_card.image.path), label).toBe(over.thumbnail_card.image_sha256);
        expect([st.current.groups.length, entry().thumbnail_config], label).toEqual([2, { card_seconds: 1.52, preview_path: doc.thumbnail_card.image.path }]);
      } else {
        expect([doc.final_composition.card, st.current.groups, entry().thumbnail_config, entry().duration], label)
          .toEqual([null, [st.current.group_root], { card_seconds: 0 }, 2]);
      }
      kept = hashes(namespace);
    }
    expect([render.calls, compose.calls, entry().logo_path, sha256(legacyOutput)]).toEqual([4, 3, logo, legacyHash]);
  });

  it("an image that changed or vanished after it was chosen is refused before an operation begins or anything renders", async () => {
    const render = fakeExactRender();
    const compose = fakeCompose();
    const { svc } = await tracked({ render, compose });
    const chosen = cardOf(imageA);
    writeFileSync(imageA, "png-card-a-replaced");
    const before = historyBytes();
    await expect(save(svc, "op-1", { thumbnail_card: chosen })).rejects.toMatchObject({ code: "CARD_IMAGE_MISMATCH" });
    rmSync(imageA);
    await expect(save(svc, "op-1", { thumbnail_card: chosen })).rejects.toMatchObject({ code: "CARD_IMAGE_MISMATCH" });
    expect(historyBytes()).toEqual(before);
    expect([render.calls, compose.calls, groups().length, entry().revisions.operations.length]).toEqual([0, 0, 0, 0]);
  });
});

describe("opening card faults", () => {
  const outside = join(tmp, "outside-compose");
  const cases: Array<{ label: string; compose?: FakeComposeOptions; over?: Partial<ServiceOptions>; message: RegExp; cardGroup: boolean; extra?: string }> = [
    { label: "composer failed before creating anything", compose: { failWith: new Error("encoder exploded") }, message: /encoder exploded/, cardGroup: false },
    { label: "composer cleanup denied", compose: { leaveGroupAndFail: new Error("cleanup denied (injected)") }, message: /cleanup denied/, cardGroup: true },
    { label: "composer failed after publishing", compose: { failAfterPublish: new Error("late composer failure") }, message: /late composer failure/, cardGroup: true },
    { label: "composer copied other image bytes", compose: { imageBytes: Buffer.from("not the captured image") }, message: /composed card image hashes to/, cardGroup: true },
    { label: "image hash claim", compose: { alterReceipt: (r) => { r.card.image_sha256 = "0".repeat(64); } }, message: /card\.image_sha256/, cardGroup: true },
    { label: "raw hash claim", compose: { alterReceipt: (r) => { r.raw.sha256 = "f".repeat(64); } }, message: /raw\.sha256/, cardGroup: true },
    { label: "another raw render", compose: { alterReceipt: (r) => { r.raw.path = source; } }, message: /not made from this operation's validated render/, cardGroup: true },
    { label: "frame count claim", compose: { alterReceipt: (r) => { r.card.frames = 37; } }, message: /card\.frames/, cardGroup: true },
    { label: "measured duration claim", compose: { alterReceipt: (r) => { r.card.measured_duration = 1.5; } }, message: /measured_duration/, cardGroup: true },
    { label: "overlap claim", compose: { alterReceipt: (r) => { (r as any).overlap = 0.1; } }, message: /composition overlap/, cardGroup: true },
    { label: "closing placement", compose: { alterReceipt: (r) => { (r as any).placement = "closing"; } }, message: /composition placement/, cardGroup: true },
    { label: "crossfade transition", compose: { alterReceipt: (r) => { (r as any).transition = "xfade"; } }, message: /composition transition/, cardGroup: true },
    { label: "audio samples claim", compose: { alterReceipt: (r) => { r.card.audio_samples = (r.card.audio_samples ?? 0) + 1; } }, message: /card\.audio_samples/, cardGroup: true },
    { label: "one card frame missing", compose: { alterStreams: (s) => { s.video.pts.splice(37, 1); s.video.durations.splice(37, 1); } }, message: /video frames/, cardGroup: true },
    { label: "uneven card frame", compose: { alterStreams: (s) => { s.video.pts[5] += 1; } }, message: /card frame 5 is at/, cardGroup: true },
    { label: "raw render starts late", compose: { alterStreams: (s) => { for (let i = 38; i < s.video.pts.length; i++) s.video.pts[i] += 512; } }, message: /starts 19968 ticks later/, cardGroup: true },
    { label: "raw frames quantized after the first", compose: { alterStreams: (s) => { for (let i = 39; i < s.video.pts.length; i++) s.video.pts[i] += 1; } }, message: /raw frame 1 is at/, cardGroup: true },
    { label: "dimensions changed", compose: { alterStreams: (s) => { s.video.width = 720; } }, message: /width 720 is not the raw render's 1080/, cardGroup: true },
    { label: "sample aspect ratio changed", compose: { alterStreams: (s) => { s.video.sample_aspect_ratio = "4:3"; } }, message: /sample_aspect_ratio/, cardGroup: true },
    { label: "time base changed", compose: { alterStreams: (s) => { s.video.time_base = "1/25"; } }, message: /time_base/, cardGroup: true },
    { label: "audio lost", compose: { alterStreams: (s) => { s.audio = null; } }, message: /audio presence differs/, cardGroup: true },
    { label: "audio start moved", compose: { alterStreams: (s) => { s.audio!.start = 0.05; } }, message: /audio starts at/, cardGroup: true },
    { label: "audio end drifted past one AAC frame", compose: { alterStreams: (s) => { s.audio!.duration = (s.audio!.duration ?? 0) + 0.03; } }, message: /composed audio ends at/, cardGroup: true },
    { label: "audio rate changed", compose: { alterStreams: (s) => { s.audio!.sample_rate = 48000; } }, message: /48000 Hz/, cardGroup: true },
    { label: "staging left", compose: { leaveStaging: true }, message: /holds more than final/, cardGroup: true },
    { label: "extra file in final", compose: { alterReceipt: (r) => { writeFileSync(join(dirname(r.output.path), "extra.txt"), "x"); } }, message: /final\/ holds other files/, cardGroup: true },
    { label: "published outside the namespace", compose: { publishUnder: outside }, message: /not in this operation's own composition group/, cardGroup: false, extra: outside },
    { label: "stream probe failed", over: { streams: async () => { throw new Error("ffprobe exploded"); } }, message: /ffprobe exploded/, cardGroup: true },
    {
      label: "container and stream probes disagree",
      over: { probe: async (p: string) => { const m = await fakeProbe(p); return p.includes("_card-") ? { ...m, has_audio: false } : m; } },
      message: /container and stream probes disagree/, cardGroup: true,
    },
  ];

  it("every composer failure, contradictory receipt or mismeasured file fails the operation without moving a pointer and names every group it published", async () => {
    let n = 0;
    for (const c of cases) {
      reset();
      rmSync(outside, { recursive: true, force: true });
      const svc = service({ compose: fakeCompose(c.compose), ...c.over });
      await svc.ensureTracked("clip-c");
      const r = await save(svc, `op-${++n}`, { thumbnail_card: cardOf(imageA) });
      expect(r.outcome, c.label).toBe("failed");
      expect(r.operation.error, c.label).toMatch(c.message);
      const e = entry();
      expect([e.output_path, e.revisions.current.version, e.revisions.revision_version, e.thumbnail_config], c.label).toEqual([legacyOutput, 0, 0, undefined]);
      const onDisk = groups().map((g) => join(namespace, g));
      const rawGroups = onDisk.filter((g) => !basename(g).includes("_card-"));
      const cardGroups = onDisk.filter((g) => basename(g).includes("_card-"));
      expect([rawGroups.length, cardGroups.length], c.label).toEqual([1, c.cardGroup ? 1 : 0]);
      expect(r.operation.residuals, c.label).toEqual([...rawGroups, ...cardGroups, ...(c.extra ? [expect.stringContaining(c.extra)] : [])]);
      expect(existsSync(sidecars) ? readdirSync(sidecars) : [], c.label).toEqual([]);
      expect(readFileSync(legacyOutput, "utf-8"), c.label).toBe("legacy-output-bytes");
    }
  });

  it("a revision document or history commit failure after composition leaves the last save unchanged; its groups are named, or kept for a pending replay", async () => {
    let armCommitFailure = false;
    const render = fakeExactRender();
    const compose = fakeCompose();
    const { svc, state } = await tracked({ render, compose, hooks: { beforeCommit: () => { if (armCommitFailure) { armCommitFailure = false; atomicState.failMatching = "clips.json"; } } } });
    atomicState.failMatching = join("revisions", "clip-c");
    const r1 = await save(svc, "op-1", { thumbnail_card: cardOf(imageA) });
    expect(r1.outcome).toBe("failed");
    expect(r1.operation.error).toMatch(/could not write revision document/);
    expect(r1.operation.residuals).toEqual(groups().map((g) => join(namespace, g)));
    expect(r1.operation.residuals).toHaveLength(2);

    armCommitFailure = true;
    const request = { clip_id: "clip-c", operation_id: "op-2", expected: expectedOf(state), recipe: recipe(), source_words: WORDS, thumbnail_card: cardOf(imageA) };
    await expect(svc.saveRevision(structuredClone(request))).rejects.toThrow("disk full (injected)");
    expect(entry().revisions.operations.at(-1)).toMatchObject({ operation_id: "op-2", state: "pending" });
    expect([entry().output_path, entry().revisions.current.version, groups().length]).toEqual([legacyOutput, 0, 4]);
    rmSync(imageA);
    expect(await svc.saveRevision(structuredClone(request))).toMatchObject({ outcome: "pending", replayed: true });
    expect([render.calls, compose.calls]).toEqual([2, 2]);
  });

  it("cancellation, a draft change or clip recreation while the card composes cannot commit; the groups and document are reported", async () => {
    const control = service();
    const state = await control.ensureTracked("clip-c");
    const cancelling = service({ hooks: { afterCompose: async (ctx) => {
      expect(ctx.card_groups).toHaveLength(1);
      await control.invalidateOperation({ clip_id: "clip-c", operation_id: ctx.operation_id, expected_incarnation: state.incarnation, reason: "cancelled while composing" });
    } } });
    const r1 = await save(cancelling, "op-1", { thumbnail_card: cardOf(imageA) });
    expect(r1.outcome).toBe("cancelled");
    expect(r1.operation.residuals.slice(0, 2)).toEqual(groups().map((g) => join(namespace, g)));
    expect(r1.operation.residuals[2]).toMatch(/revisions[\\/]clip-c[\\/][0-9a-f-]+\.json$/);

    const drafting = service({ hooks: { beforeCompose: async () => {
      await control.saveDraft({ clip_id: "clip-c", expected: expectedOf(entry().revisions), draft: { recipe: recipe({ title: "Changed" }), source_words: WORDS, thumbnail_card: cardOf(imageB) } });
    } } });
    const r2 = await save(drafting, "op-2", { thumbnail_card: cardOf(imageA) });
    expect(r2.outcome).toBe("superseded");
    expect(r2.operation.residuals).toHaveLength(3);

    const recreating = service({ hooks: { afterCompose: async () => {
      await history.transaction((list) => { list.splice(list.findIndex((e) => e.id === "clip-c"), 1); });
      await history.transaction((list) => { list.push({ ...seedClip } as any); });
      await control.ensureTracked("clip-c");
    } } });
    const r3 = await save(recreating, "op-3", { thumbnail_card: cardOf(imageA) });
    expect(r3.outcome).toBe("superseded");
    expect(r3.operation.reason).toMatch(/incarnation changed/);
    expect(r3.operation.residuals).toHaveLength(3);
    const e = entry();
    expect([e.output_path, e.revisions.current.version, e.revisions.operations, e.thumbnail_config]).toEqual([legacyOutput, 0, [], undefined]);
  });

  it("a namespace replaced by a junction before composition, or a composed group linked elsewhere, is refused without writing through the link", async () => {
    const compose = fakeCompose();
    const real = join(tmp, "namespace-real");
    const linking = service({ compose, hooks: { beforeCompose: () => { renameSync(namespace, real); symlinkSync(real, namespace, "junction"); } } });
    await linking.ensureTracked("clip-c");
    const r1 = await save(linking, "op-1", { thumbnail_card: cardOf(imageA) });
    expect(r1.outcome).toBe("failed");
    expect(r1.operation.error).toMatch(/symbolic link or junction/);
    expect(compose.calls).toBe(0);
    expect(lstatSync(namespace).isSymbolicLink()).toBe(true);
    expect(readdirSync(real)).toHaveLength(1);
    rmdirSync(namespace);
    renameSync(real, namespace);

    const outsideFinal = join(tmp, "outside-final");
    const relinking = service({ compose: fakeCompose({ alterReceipt: (r) => { const fin = dirname(r.output.path); renameSync(fin, outsideFinal); symlinkSync(outsideFinal, fin, "junction"); } }) });
    const r2 = await save(relinking, "op-2", { thumbnail_card: cardOf(imageA) });
    expect(r2.outcome).toBe("failed");
    expect(r2.operation.error).toMatch(/symbolic link or junction/);
    expect(r2.operation.residuals).toHaveLength(2);
    // Nothing was read into the revision or written through the link: the target holds only what the composer made.
    expect(readdirSync(outsideFinal).sort()).toEqual(["Card_clip_short.mp4", "card-image.png"]);
    expect(existsSync(sidecars) ? readdirSync(sidecars) : []).toEqual([]);
    expect([entry().output_path, entry().revisions.current.version]).toEqual([legacyOutput, 0]);
  });

  it("documents and pointers saved before cards are read and replayed as saved; a later card save leaves them untouched", async () => {
    const render = fakeExactRender();
    const { svc, state } = await tracked({ render });
    const request = { clip_id: "clip-c", operation_id: "op-older", expected: expectedOf(state), recipe: recipe(), source_words: WORDS };
    const saved: any = await svc.saveRevision(structuredClone(request));
    expect(saved.outcome).toBe("committed");
    // Store the document, pointers and operation as 1B.2a wrote them: no composition record, no groups.
    const path = saved.revision.path;
    const doc = JSON.parse(readFileSync(path, "utf-8"));
    delete doc.final_composition;
    doc.thumbnail_card = { requested: false, applied: false, note: "no opening card is composed by the revision save service; the renderer reported none" };
    writeFileSync(path, JSON.stringify(doc, null, 2));
    await history.transaction((list) => {
      const st = list.find((e) => e.id === "clip-c")!.revisions!;
      delete st.current!.groups;
      delete st.operations[0].revision!.groups;
    });
    const older = readFileSync(path);
    const loaded = await svc.loadRevision("clip-c", saved.revision.revision_id);
    expect(loaded).not.toHaveProperty("final_composition");
    expect(await svc.verifyRevisionFiles(loaded)).toEqual([{ path: saved.revision.output_path, ok: true, reason: undefined }]);
    const replay: any = await svc.saveRevision(structuredClone(request));
    expect([replay.outcome, replay.replayed, replay.revision.groups, render.calls]).toEqual(["committed", true, undefined, 1]);
    const next = await save(svc, "op-card", { thumbnail_card: cardOf(imageA) });
    expect(next.outcome).toBe("committed");
    expect(entry().revisions.previous).not.toHaveProperty("groups");
    expect(entry().revisions.previous.revision_id).toBe(saved.revision.revision_id);
    expect(readFileSync(path)).toEqual(older);
  });
});

describe("cleanup protection for card revisions", () => {
  it("the real scanner offers nothing from card revisions, composer residuals or card images", async () => {
    const { svc } = await tracked();
    expect((await save(svc, "op-1", { thumbnail_card: cardOf(imageA) })).outcome).toBe("committed");
    const failing = service({ compose: fakeCompose({ leaveGroupAndFail: new Error("cleanup denied (injected)") }) });
    expect((await save(failing, "op-2", { thumbnail_card: cardOf(imageB) })).outcome).toBe("failed");
    const old = new Date(Date.now() - 3 * 3600_000);
    for (const p of Object.keys(hashes(namespace))) utimesSync(p, old, old);
    for (const g of groups()) utimesSync(join(namespace, g), old, old);
    const working = join(tmp, "data", "working");
    const temporary = join(tmp, "tmp");
    mkdirSync(working, { recursive: true });
    mkdirSync(temporary, { recursive: true });
    const unused = join(tmp, "reel_unused");
    mkdirSync(unused, { recursive: true });
    writeFileSync(join(unused, "highlights.mp4"), "unused");
    const cleanup = new StorageCleanup({ home: tmp, working, temporary, cache: join(tmp, "data", "cache"), output: exportsDir, currentState: () => ({}) });
    const report = cleanup.scan();
    expect(report.warnings).toEqual([]);
    expect(report.items.filter((i) => i.eligible).map((i) => i.path)).toEqual([unused]);
    expect(report.items.some((i) => i.path.startsWith(exportsDir))).toBe(false);
    const kept = hashes(namespace);
    await cleanup.remove(report.scanId, report.items.filter((i) => i.eligible).map((i) => i.id));
    expectKept(kept);
    expect(groups()).toHaveLength(4);
  });
});
