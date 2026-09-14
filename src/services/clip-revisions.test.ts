import { describe, it, expect, beforeEach, vi } from "vitest";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync, utimesSync } from "fs";
import { tmpdir } from "os";
import { basename, dirname, join } from "path";

// Writing Studio 1B.2a: the revision save service against an isolated home,
// export root and history file, with the fake exact renderer that reproduces
// the accepted renderer's group publication and receipt. Real-bridge coverage
// is scripts/verification/check-saved-revision.mjs; real process interruption
// is clip-revisions.process.test.ts.

const tmp = mkdtempSync(join(tmpdir(), "podcli-revisions-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = join(tmp, "data");
process.env.PODCLI_OUTPUT = join(tmp, "exports");

// Failure injection for the atomic replacement, targeted by path fragment so
// a sidecar write or the history commit can each be made to fail once.
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

const { ClipsHistory, HistoryReadError } = await import("./clips-history.js");
const { ClipRevisionService, ClipRevisionError, REVISION_NAMESPACE } = await import("./clip-revisions.js");
const { fakeExactRender, fakeProbe } = await import("./clip-revisions.test-support.js");
const { StorageCleanup } = await import("./storage-cleanup.js");
const { paths } = await import("../config/paths.js");

const historyDir = join(tmp, "history");
const historyPath = join(historyDir, "clips.json");
const exportsDir = join(tmp, "exports");
const namespace = join(exportsDir, REVISION_NAMESPACE, "clip-a");
const sidecars = join(historyDir, "revisions", "clip-a");
const source = join(tmp, "source.mp4");
const outro = join(tmp, "outro.mp4");
const legacyOutput = join(exportsDir, "legacy_short.mp4");

const WORDS = ["red", "green", "blue", "yellow", "cyan", "magenta"].map((word, i) => ({ word, start: i + 0.2, end: i + 0.7, confidence: 1, speaker: `S${i % 2}` }));

const seedClip = {
  id: "clip-a",
  source_video: source,
  start_second: 1,
  end_second: 2,
  caption_style: "karaoke",
  crop_strategy: "center",
  format: "vertical",
  title: "Legacy clip",
  output_path: legacyOutput,
  file_size_mb: 0.01,
  duration: 1,
  created_at: "2026-09-01T00:00:00.000Z",
  transcript_slice: "green",
  extra: { keep: [1, 2, { deep: true }] },
  py_flag: "from-python",
};
const seedOther = { id: "clip-b", title: "other", source_video: source, output_path: join(exportsDir, "other.mp4"), legacy_flag: "yes" };

const entries = () => JSON.parse(readFileSync(historyPath, "utf-8")) as any[];
const entry = (id = "clip-a") => entries().find((e) => e.id === id);
const historyBytes = () => readFileSync(historyPath);
const recipe = (over: Record<string, unknown> = {}) => ({
  source_video: source, title: "Saved clip", keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }],
  caption_style: "karaoke", crop_strategy: "center", format: "vertical" as const, clean_fillers: false, ...over,
});
const expectedOf = (state: { incarnation: string; draft_version: number; revision_version: number }) => ({
  incarnation: state.incarnation, draft_version: state.draft_version, revision_version: state.revision_version,
});
function gate() {
  let open!: () => void;
  let arrive!: () => void;
  const opened = new Promise<void>((r) => (open = r));
  const arrived = new Promise<void>((r) => (arrive = r));
  return { hook: async () => { arrive(); await opened; }, arrived, open };
}
const groups = () => (existsSync(namespace) ? readdirSync(namespace).sort() : []);

let history: InstanceType<typeof ClipsHistory>;

beforeEach(() => {
  rmSync(historyDir, { recursive: true, force: true });
  rmSync(exportsDir, { recursive: true, force: true });
  mkdirSync(historyDir, { recursive: true });
  mkdirSync(exportsDir, { recursive: true });
  writeFileSync(source, "source-bytes");
  writeFileSync(outro, "outro-bytes");
  writeFileSync(legacyOutput, "legacy-output-bytes");
  writeFileSync(join(exportsDir, "other.mp4"), "other");
  writeFileSync(historyPath, JSON.stringify([seedClip, seedOther], null, 2));
  atomicState.failMatching = null;
  history = new ClipsHistory();
});

function service(over: Partial<ConstructorParameters<typeof ClipRevisionService>[0]> = {}) {
  return new ClipRevisionService({ history, render: fakeExactRender(), probe: fakeProbe, ...over });
}

describe("tracking and drafts", () => {
  it("ensureTracked labels the existing output as legacy version zero and is idempotent", async () => {
    const svc = service();
    const first = await svc.ensureTracked("clip-a");
    expect(first.current).toMatchObject({ version: 0, provenance: "legacy-unversioned", output_path: legacyOutput, path: null, group_root: null });
    expect(first.previous).toBeNull();
    expect(first.draft_version).toBe(0);
    expect(first.roots).toEqual({ namespace, sidecars });
    const again = await svc.ensureTracked("clip-a");
    expect(again).toEqual(first);
    expect(entry().extra).toEqual(seedClip.extra);
    expect(entry().py_flag).toBe("from-python");
    await expect(svc.ensureTracked("missing")).rejects.toMatchObject({ code: "CLIP_NOT_FOUND" });
    for (const bad of ["../x", "a/b", "", "..", "a\\b", "x".repeat(200)]) {
      await expect(svc.ensureTracked(bad)).rejects.toMatchObject({ code: "INVALID_IDENTIFIER" });
    }
    expect(await svc.getState("clip-b")).toBeNull();
  });

  it("a draft save advances the draft version only; committed paths, summaries and media are untouched", async () => {
    const svc = service();
    const state = await svc.ensureTracked("clip-a");
    const before = { ...entry() };
    const legacyBytes = readFileSync(legacyOutput);
    const saved = await svc.saveDraft({ clip_id: "clip-a", expected: expectedOf(state), draft: { recipe: recipe(), source_words: WORDS, note: "first" } });
    expect(saved.draft.version).toBe(1);
    expect(saved.state.draft_version).toBe(1);
    expect(saved.state.revision_version).toBe(0);
    expect(saved.state.current).toEqual(state.current);
    expect(saved.superseded_operation).toBeNull();
    const doc = JSON.parse(readFileSync(saved.draft.path, "utf-8"));
    expect(doc.draft.source_words).toEqual(WORDS);
    expect(doc.draft.recipe.keep_segments).toEqual([{ start: 4, end: 5 }, { start: 1, end: 2 }]);
    const after = entry();
    for (const key of ["output_path", "duration", "file_size_mb", "start_second", "end_second", "transcript_slice", "extra", "py_flag"]) {
      expect(after[key]).toEqual(before[key]);
    }
    expect(readFileSync(legacyOutput)).toEqual(legacyBytes);
    expect(groups()).toEqual([]);

    // Stale expected state: refused, the unreferenced draft document is removed.
    await expect(svc.saveDraft({ clip_id: "clip-a", expected: expectedOf(state), draft: { recipe: recipe(), source_words: null } }))
      .rejects.toMatchObject({ code: "EXPECTED_STATE_MISMATCH" });
    expect(readdirSync(sidecars)).toEqual([basename(saved.draft.path)]);
    expect(entry().revisions.draft_version).toBe(1);
    // Supplied-empty and unavailable are kept apart.
    const s2 = await svc.saveDraft({ clip_id: "clip-a", expected: expectedOf(saved.state), draft: { recipe: recipe(), source_words: [] } });
    expect(JSON.parse(readFileSync(s2.draft.path, "utf-8")).draft.source_words).toEqual([]);
    const s3 = await svc.saveDraft({ clip_id: "clip-a", expected: expectedOf(s2.state), draft: { recipe: recipe(), source_words: null } });
    expect(JSON.parse(readFileSync(s3.draft.path, "utf-8")).draft.source_words).toBeNull();
    await expect(svc.saveDraft({ clip_id: "clip-b", expected: expectedOf(state), draft: { recipe: recipe(), source_words: null } }))
      .rejects.toMatchObject({ code: "CLIP_NOT_TRACKED" });
  });

  it("recipe and identifier validation refuses malformed, escaping or missing inputs before any state change", async () => {
    const svc = service();
    const state = await svc.ensureTracked("clip-a");
    const before = historyBytes();
    const cases: Array<[string, Record<string, unknown>]> = [
      ["missing source", { source_video: join(tmp, "nope.mp4") }],
      ["relative source", { source_video: "source.mp4" }],
      ["title with separator", { title: "a/b" }],
      ["title dotdot", { title: ".." }],
      ["empty segments", { keep_segments: [] }],
      ["segment end before start", { keep_segments: [{ start: 2, end: 1 }] }],
      ["non-finite segment", { keep_segments: [{ start: 0, end: Number.NaN }] }],
      ["bad format", { format: "portrait" }],
      ["keyframe outside domain", { crop_keyframes: [{ t: -1, x_pct: 50 }] }],
      ["keyframe x out of range", { crop_keyframes: [{ t: 0, x_pct: 120 }] }],
      ["missing outro", { outro_path: join(tmp, "no-outro.mp4") }],
      ["negative fade", { bookend_fade: -1 }],
    ];
    for (const [label, over] of cases) {
      await expect(svc.saveRevision({ clip_id: "clip-a", operation_id: `op-${label.replace(/\W+/g, "-")}`, expected: expectedOf(state), recipe: recipe(over) as any, source_words: null }), label)
        .rejects.toMatchObject({ code: "INVALID_RECIPE" });
    }
    await expect(svc.saveRevision({ clip_id: "clip-a", operation_id: "op", expected: expectedOf(state), recipe: recipe(), source_words: [{ word: "x", start: 2, end: 1 }] as any }))
      .rejects.toMatchObject({ code: "INVALID_RECIPE" });
    await expect(svc.saveRevision({ clip_id: "clip-a", operation_id: "../escape", expected: expectedOf(state), recipe: recipe(), source_words: null }))
      .rejects.toMatchObject({ code: "INVALID_IDENTIFIER" });
    await expect(svc.saveRevision({ clip_id: "clip-a", operation_id: "op", expected: { incarnation: "", draft_version: 0, revision_version: 0 }, recipe: recipe(), source_words: null }))
      .rejects.toMatchObject({ code: "EXPECTED_STATE_MISMATCH" });
    expect(historyBytes()).toEqual(before);
    expect(groups()).toEqual([]);
    expect(existsSync(sidecars)).toBe(false);
  });
});

describe("saving a revision", () => {
  it("commits pointer, legacy summary and operation receipt together; retains full source words apart from edited words", async () => {
    const render = fakeExactRender();
    const svc = service({ render });
    const state = await svc.ensureTracked("clip-a");
    const legacyBytes = readFileSync(legacyOutput);
    const result = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state), recipe: recipe({ outro_path: outro, bookend_fade: 0.25 }), source_words: WORDS });
    expect(result.outcome).toBe("committed");
    if (result.outcome !== "committed") return;
    expect(result.replayed).toBe(false);
    expect(render.calls).toBe(1);
    expect(render.lastParams).toMatchObject({ timing_mode: "exact", output_dir: namespace, keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }], transcript_words: WORDS, outro_path: outro, bookend_fade: 0.25 });
    expect(render.lastParams).not.toHaveProperty("thumbnail_card");

    const e = entry();
    const st = e.revisions;
    expect(st.revision_version).toBe(1);
    expect(st.current).toMatchObject({ version: 1, provenance: "exact", operation_id: "op-1", revision_id: result.revision.revision_id });
    expect(st.previous).toMatchObject({ version: 0, provenance: "legacy-unversioned", output_path: legacyOutput });
    expect(dirname(dirname(st.current.output_path))).toBe(st.current.group_root);
    expect(dirname(st.current.group_root)).toBe(namespace);
    expect(st.operations).toHaveLength(1);
    expect(st.operations[0]).toMatchObject({ operation_id: "op-1", state: "committed", revision_id: result.revision.revision_id, group_root: st.current.group_root });
    // Legacy summary fields describe the new revision; unknown fields survive.
    expect(e.output_path).toBe(st.current.output_path);
    expect([e.start_second, e.end_second]).toEqual([1, 5]);
    expect(e.keep_segments).toEqual([{ start: 4, end: 5 }, { start: 1, end: 2 }]);
    expect(e.duration).toBe(2);
    expect(e.outro_path).toBe(outro);
    expect(e.transcript_slice).toBe("cyan green");
    expect(e.extra).toEqual(seedClip.extra);
    expect(e.py_flag).toBe("from-python");
    expect(entry("clip-b")).toEqual(seedOther);
    // The immutable document keeps every supplied source word; the receipt's
    // content words are the clipped, reordered editorial transcript.
    const doc = JSON.parse(readFileSync(st.current.path, "utf-8"));
    expect(doc.source_words).toEqual(WORDS);
    expect(doc.words_input).toBe("supplied");
    expect(doc.render_timeline.words.content.map((w: any) => [w.word, w.start, w.speaker])).toEqual([["cyan", 0.2, "S0"], ["green", 1.2, "S1"]]);
    expect(doc.render_timeline.words.source.map((w: any) => w.word)).toEqual(["green", "cyan"]);
    expect(doc.thumbnail_card).toMatchObject({ requested: false, applied: false });
    expect(doc.bookends.outro.branch).toBe("hardcut");
    expect(doc.files.main.bytes).toBeGreaterThan(0);
    expect(doc.files.main.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await svc.verifyRevisionFiles(await svc.loadRevision("clip-a", doc.revision_id))).toEqual([{ path: st.current.output_path, ok: true, reason: undefined }]);
    // Nothing earlier moved.
    expect(readFileSync(legacyOutput)).toEqual(legacyBytes);
    expect(readdirSync(st.current.group_root)).toEqual(["final"]);
  });

  it("replaying an operation returns its durable state without rendering; reusing its id for another request conflicts", async () => {
    const render = fakeExactRender();
    const svc = service({ render });
    const state = await svc.ensureTracked("clip-a");
    const req = { clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state), recipe: recipe(), source_words: WORDS };
    const first = await svc.saveRevision(req);
    expect(first.outcome).toBe("committed");
    const bytes = historyBytes();
    const replay = await svc.saveRevision(JSON.parse(JSON.stringify(req)));
    expect(replay).toMatchObject({ outcome: "committed", replayed: true, revision: { revision_id: (first as any).revision.revision_id } });
    expect(render.calls).toBe(1);
    expect(historyBytes()).toEqual(bytes);
    expect(groups()).toHaveLength(1);
    await expect(svc.saveRevision({ ...req, recipe: recipe({ keep_segments: [{ start: 0, end: 1 }] }) })).rejects.toMatchObject({ code: "OPERATION_ID_REUSED" });
    expect(historyBytes()).toEqual(bytes);
    expect(render.calls).toBe(1);
  });

  it("a second save while one is pending is busy; a draft saved meanwhile supersedes the pending render, which then cannot commit", async () => {
    const g = gate();
    const svc = service({ hooks: { beforeCommit: g.hook } });
    const state = await svc.ensureTracked("clip-a");
    const pending = svc.saveRevision({ clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state), recipe: recipe(), source_words: WORDS });
    await g.arrived;
    expect(entry().revisions.operations[0].state).toBe("pending");
    await expect(svc.saveRevision({ clip_id: "clip-a", operation_id: "op-2", expected: expectedOf(state), recipe: recipe(), source_words: WORDS }))
      .rejects.toMatchObject({ code: "OPERATION_BUSY" });
    const draft = await svc.saveDraft({ clip_id: "clip-a", expected: expectedOf(state), draft: { recipe: recipe({ title: "Edited" }), source_words: WORDS } });
    expect(draft.superseded_operation).toBe("op-1");
    g.open();
    const late = await pending;
    expect(late.outcome).toBe("superseded");
    const e = entry();
    expect(e.output_path).toBe(legacyOutput);
    expect(e.revisions.current.version).toBe(0);
    expect(e.revisions.revision_version).toBe(0);
    expect(e.revisions.draft_version).toBe(1);
    expect(e.revisions.operations[0]).toMatchObject({ operation_id: "op-1", state: "superseded" });
    // The rendered group stays on disk, unreferenced and reported, never collected.
    expect(groups()).toHaveLength(1);
    expect(late.operation.residuals).toEqual([join(namespace, groups()[0]), expect.stringMatching(/\.json$/)]);
  });

  it("explicit invalidation cancels a pending operation so its late completion is refused", async () => {
    const g = gate();
    const svc = service({ hooks: { beforeCommit: g.hook } });
    const state = await svc.ensureTracked("clip-a");
    const pending = svc.saveRevision({ clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state), recipe: recipe(), source_words: WORDS });
    await g.arrived;
    expect(await svc.invalidateOperation({ clip_id: "clip-a", operation_id: "op-1", expected_incarnation: state.incarnation, reason: "user cancelled" })).toMatchObject({ outcome: "invalidated", operation: { state: "cancelled", reason: "user cancelled" } });
    g.open();
    const late = await pending;
    expect(late.outcome).toBe("cancelled");
    expect(late.operation.residuals).toEqual([join(namespace, groups()[0]), expect.stringMatching(/\.json$/)]);
    expect(entry().revisions.operations[0]).toMatchObject({ state: "cancelled", residuals: late.operation.residuals });
    expect(entry().revisions.current.version).toBe(0);
    expect(entry().output_path).toBe(legacyOutput);
    expect(await svc.invalidateOperation({ clip_id: "clip-a", operation_id: "op-1", expected_incarnation: state.incarnation, reason: "again" })).toMatchObject({ outcome: "already-terminal" });
    expect(await svc.invalidateOperation({ clip_id: "clip-a", operation_id: "op-x", expected_incarnation: state.incarnation, reason: "x" })).toEqual({ outcome: "unknown" });
    // A replay of the cancelled operation reports cancelled and renders nothing.
    const render = fakeExactRender({ failWith: new Error("must not render") });
    const replay = await new ClipRevisionService({ history, render, probe: fakeProbe }).saveRevision({ clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state), recipe: recipe(), source_words: WORDS });
    expect(replay).toMatchObject({ outcome: "cancelled", replayed: true });
    expect(render.calls).toBe(0);
    // The next operation, with a new id, commits normally.
    const next = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-2", expected: expectedOf(state), recipe: recipe(), source_words: WORDS });
    expect(next.outcome).toBe("committed");
  });

  it("a clip deleted or recreated during the render cannot be revived or overwritten by the late commit", async () => {
    for (const recreate of [false, true]) {
      writeFileSync(historyPath, JSON.stringify([seedClip, seedOther], null, 2));
      writeFileSync(legacyOutput, "legacy-output-bytes");
      const g = gate();
      const svc = service({ hooks: { beforeCommit: g.hook } });
      const state = await svc.ensureTracked("clip-a");
      const pending = svc.saveRevision({ clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state), recipe: recipe(), source_words: WORDS });
      await g.arrived;
      expect((await history.remove("clip-a"))?.id).toBe("clip-a");
      let recreated: any = null;
      if (recreate) {
        await history.transaction((list) => { list.push({ ...seedClip, title: "recreated" } as any); });
        recreated = await svc.ensureTracked("clip-a");
        expect(recreated.incarnation).not.toBe(state.incarnation);
      }
      g.open();
      const late = await pending;
      expect(late.outcome).toBe("superseded");
      if (!recreate) {
        expect(entries().map((e) => e.id)).toEqual(["clip-b"]);
      } else {
        const e = entry();
        expect(e.title).toBe("recreated");
        expect(e.revisions.incarnation).toBe(recreated.incarnation);
        expect(e.revisions.current.version).toBe(0);
        expect(e.output_path).toBe(legacyOutput);
        expect(e.revisions.operations).toEqual([]);
      }
      rmSync(namespace, { recursive: true, force: true });
      rmSync(sidecars, { recursive: true, force: true });
    }
  });

  it("refuses receipts that claim a card, take the mismatched-audio branch, escape the namespace, or disagree with the file", async () => {
    const outside = join(tmp, "outside");
    const cases: Array<[string, Parameters<typeof fakeExactRender>[0], RegExp]> = [
      ["card applied", { cardApplied: true }, /opening card/],
      ["mismatched branch", { branch: "xfade_audio_concat" }, /unsupported outro composition branch/],
      ["escaping path", { publishUnder: outside }, /not inside an operation group/],
      ["size mismatch", { sizeMismatch: true }, /size disagrees/],
      ["staging left", { leaveStaging: true }, /still holds staging/],
      ["renderer failure", { failWith: new Error("ffmpeg exploded") }, /ffmpeg exploded/],
    ];
    let n = 0;
    for (const [label, opts, message] of cases) {
      const svc = service({ render: fakeExactRender(opts) });
      const state = await svc.ensureTracked("clip-a");
      const before = { ...entry() };
      const groupsBefore = new Set(groups());
      const result = await svc.saveRevision({ clip_id: "clip-a", operation_id: `op-${++n}`, expected: expectedOf(state), recipe: recipe({ outro_path: outro }), source_words: WORDS });
      expect(result.outcome, label).toBe("failed");
      expect(result.operation.error, label).toMatch(message);
      const e = entry();
      expect(e.output_path, label).toBe(legacyOutput);
      expect(e.revisions.current.version, label).toBe(0);
      expect(e.revisions.revision_version, label).toBe(0);
      expect(e.revisions.operations.at(-1), label).toMatchObject({ operation_id: `op-${n}`, state: "failed" });
      for (const key of ["start_second", "end_second", "duration", "transcript_slice"]) expect(e[key], label).toEqual(before[key]);
      // A refused-but-published group is reported, never removed.
      if (label === "escaping path") expect(result.operation.residuals[0]).toContain(outside);
      else if (label === "renderer failure") expect(result.operation.residuals).toEqual([]);
      else {
        const created = groups().filter((g) => !groupsBefore.has(g));
        expect(created, label).toHaveLength(1);
        expect(result.operation.residuals).toEqual([join(namespace, created[0])]);
      }
    }
    expect(existsSync(join(outside))).toBe(true);
  });

  it("rejects an opening thumbnail-card request outright and records the card-absent receipt otherwise", async () => {
    const svc = service();
    const state = await svc.ensureTracked("clip-a");
    await history.update("clip-a", { thumbnail_config: { preview_path: join(tmp, "thumb.png"), card_seconds: 1.5 } });
    const before = historyBytes();
    for (const card of [true, {}, { preview_path: "x" }, "card"]) {
      await expect(svc.saveRevision({ clip_id: "clip-a", operation_id: "op-card", expected: expectedOf(state), recipe: recipe(), source_words: WORDS, thumbnail_card: card }))
        .rejects.toMatchObject({ code: "UNSUPPORTED_THUMBNAIL_CARD" });
    }
    expect(historyBytes()).toEqual(before);
    expect(groups()).toEqual([]);
    const ok = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state), recipe: recipe(), source_words: WORDS, thumbnail_card: null });
    expect(ok.outcome).toBe("committed");
    const e = entry();
    expect(e.thumbnail_config).toEqual({ preview_path: join(tmp, "thumb.png"), card_seconds: 0 });
    expect(JSON.parse(readFileSync(e.revisions.current.path, "utf-8")).thumbnail_card).toEqual({ requested: false, applied: false, note: expect.any(String) });
  });

  it("keeps transcript availability truthful: unavailable, supplied-empty and supplied", async () => {
    const svc = service();
    let state = await svc.ensureTracked("clip-a");
    const r1 = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state), recipe: recipe(), source_words: null });
    expect(r1.outcome).toBe("committed");
    expect(entry()).not.toHaveProperty("transcript_slice");
    let doc = JSON.parse(readFileSync(entry().revisions.current.path, "utf-8"));
    expect([doc.words_input, doc.source_words, doc.render_timeline.words.input, doc.render_timeline.words.source_count]).toEqual(["unavailable", null, "unavailable", null]);
    state = entry().revisions;
    const r2 = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-2", expected: expectedOf(state), recipe: recipe(), source_words: [] });
    expect(r2.outcome).toBe("committed");
    expect(entry().transcript_slice).toBe("");
    doc = JSON.parse(readFileSync(entry().revisions.current.path, "utf-8"));
    expect([doc.words_input, doc.source_words, doc.render_timeline.words.input, doc.render_timeline.words.source_count]).toEqual(["supplied", [], "supplied", 0]);
    expect(entry().revisions.previous.revision_id).toBe((r1 as any).revision.revision_id);
  });

  it("narrow then widen: the retained source words let a later revision recover words the first one excluded", async () => {
    const svc = service();
    const state = await svc.ensureTracked("clip-a");
    const narrow = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-narrow", expected: expectedOf(state), recipe: recipe({ keep_segments: [{ start: 2, end: 3 }] }), source_words: WORDS });
    expect(narrow.outcome).toBe("committed");
    const narrowDoc = await svc.loadRevision("clip-a", (narrow as any).revision.revision_id);
    expect(narrowDoc.render_timeline.words.content.map((w) => w.word)).toEqual(["blue"]);
    expect(narrowDoc.source_words).toHaveLength(6);
    const narrowBytes = readFileSync(narrowDoc.files.main.path);
    // Widen from the document's own retained words, not from any cache or legacy bounds.
    const wide = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-wide", expected: expectedOf(entry().revisions), recipe: recipe({ keep_segments: [{ start: 1, end: 4 }] }), source_words: narrowDoc.source_words });
    expect(wide.outcome).toBe("committed");
    const wideDoc = await svc.loadRevision("clip-a", (wide as any).revision.revision_id);
    expect(wideDoc.render_timeline.words.content.map((w) => [w.word, w.start])).toEqual([["green", 0.2], ["blue", 1.2], ["yellow", 2.2]]);
    expect(entry().transcript_slice).toBe("green blue yellow");
    const st = entry().revisions;
    expect(st.current.revision_id).toBe(wideDoc.revision_id);
    expect(st.previous.revision_id).toBe(narrowDoc.revision_id);
    expect(st.revision_version).toBe(2);
    expect(readFileSync(narrowDoc.files.main.path)).toEqual(narrowBytes);
    expect(readFileSync(legacyOutput, "utf-8")).toBe("legacy-output-bytes");
    expect(groups()).toHaveLength(2);
  });

  it("failure at the history commit leaves the last save unchanged and the operation pending for explicit recovery; a sidecar failure fails the operation", async () => {
    const render = fakeExactRender();
    let armCommitFailure = false;
    const svc = service({ render, hooks: { beforeCommit: () => { if (armCommitFailure) { armCommitFailure = false; atomicState.failMatching = "clips.json"; } } } });
    const state = await svc.ensureTracked("clip-a");
    // Sidecar write fails: the operation fails, the rendered group is a reported residual.
    atomicState.failMatching = join("revisions", "clip-a");
    const r1 = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state), recipe: recipe(), source_words: WORDS });
    expect(r1.outcome).toBe("failed");
    expect(r1.operation.error).toMatch(/could not write revision document/);
    expect(r1.operation.residuals).toEqual([join(namespace, groups()[0])]);
    expect(entry().revisions.current.version).toBe(0);
    // History commit fails: the error surfaces, the operation stays pending, nothing moved.
    armCommitFailure = true;
    const before = historyBytes();
    await expect(svc.saveRevision({ clip_id: "clip-a", operation_id: "op-2", expected: expectedOf(state), recipe: recipe(), source_words: WORDS })).rejects.toThrow("disk full (injected)");
    expect(historyBytes()).not.toEqual(before); // the pending record was written at begin
    const e = entry();
    expect(e.output_path).toBe(legacyOutput);
    expect(e.revisions.current.version).toBe(0);
    expect(e.revisions.operations.at(-1)).toMatchObject({ operation_id: "op-2", state: "pending" });
    expect(render.calls).toBe(2);
    // Replay renders nothing and reports pending; invalidation then frees the clip.
    const replay = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-2", expected: expectedOf(state), recipe: recipe(), source_words: WORDS });
    expect(replay).toMatchObject({ outcome: "pending", replayed: true });
    expect(render.calls).toBe(2);
    expect(await svc.invalidateOperation({ clip_id: "clip-a", operation_id: "op-2", expected_incarnation: state.incarnation, reason: "restart: render not coming back" })).toMatchObject({ outcome: "invalidated" });
    const r3 = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-3", expected: expectedOf(state), recipe: recipe(), source_words: WORDS });
    expect(r3.outcome).toBe("committed");
    expect(render.calls).toBe(3);
    expect(readdirSync(namespace)).toHaveLength(3);
  });

  it("corrupt history blocks every mutation without rewriting a byte", async () => {
    const svc = service();
    await svc.ensureTracked("clip-a");
    const state = entry().revisions;
    writeFileSync(historyPath, "{ not json", "utf-8");
    const before = historyBytes();
    await expect(svc.saveDraft({ clip_id: "clip-a", expected: expectedOf(state), draft: { recipe: recipe(), source_words: null } })).rejects.toBeInstanceOf(HistoryReadError);
    await expect(svc.saveRevision({ clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state), recipe: recipe(), source_words: null })).rejects.toBeInstanceOf(HistoryReadError);
    await expect(svc.ensureTracked("clip-a")).rejects.toBeInstanceOf(HistoryReadError);
    expect(historyBytes()).toEqual(before);
    expect(groups()).toEqual([]);
    expect(readdirSync(historyDir).filter((f) => f !== "clips.json" && f !== "revisions")).toEqual([]);
  });

  it("unrelated metadata written by another mutation during the render survives the commit", async () => {
    const g = gate();
    const svc = service({ hooks: { beforeCommit: g.hook } });
    const state = await svc.ensureTracked("clip-a");
    const pending = svc.saveRevision({ clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state), recipe: recipe(), source_words: WORDS });
    await g.arrived;
    await history.update("clip-a", { generated_titles: ["A title"], metrics: { views: 7 } } as any);
    await history.update("clip-b", { title: "renamed meanwhile" });
    g.open();
    expect((await pending).outcome).toBe("committed");
    const e = entry();
    expect(e.generated_titles).toEqual(["A title"]);
    expect(e.metrics).toEqual({ views: 7 });
    expect(e.revisions.current.version).toBe(1);
    expect(entry("clip-b").title).toBe("renamed meanwhile");
  });

  it("operation records never expire: any older operation replays its complete original result without rendering; a reused id still conflicts", async () => {
    const render = fakeExactRender();
    const svc = service({ render });
    let state = await svc.ensureTracked("clip-a");
    const requests: any[] = [];
    for (let i = 0; i < 34; i++) {
      const req = { clip_id: "clip-a", operation_id: `op-${i}`, expected: expectedOf(state), recipe: recipe(), source_words: null };
      requests.push(JSON.parse(JSON.stringify(req)));
      const r = await svc.saveRevision(req);
      expect(r.outcome).toBe("committed");
      state = entry().revisions;
    }
    expect(render.calls).toBe(34);
    expect(state.operations).toHaveLength(34);
    expect(state.operations.map((o: any) => o.state)).toEqual(Array(34).fill("committed"));
    expect(state.revision_version).toBe(34);
    const bytes = historyBytes();
    // op-0 is far older than current/previous: its own record answers completely.
    const first = await svc.saveRevision(requests[0]);
    expect(first).toMatchObject({ outcome: "committed", replayed: true, revision: { version: 1, operation_id: "op-0", provenance: "exact" } });
    if (first.outcome !== "committed") return;
    expect(first.revision.output_path).toBe(JSON.parse(readFileSync(first.revision.path!, "utf-8")).files.main.path);
    expect(existsSync(first.revision.output_path)).toBe(true);
    expect(dirname(first.revision.group_root!)).toBe(namespace);
    const third = await svc.saveRevision(requests[2]);
    expect(third).toMatchObject({ outcome: "committed", replayed: true, revision: { version: 3, operation_id: "op-2" } });
    expect(render.calls).toBe(34);
    expect(historyBytes()).toEqual(bytes);
    // The same id with a different captured request is a conflict, however old the record.
    await expect(svc.saveRevision({ ...requests[0], recipe: recipe({ title: "other" }) })).rejects.toMatchObject({ code: "OPERATION_ID_REUSED" });
    await expect(svc.saveRevision({ ...requests[0], expected: expectedOf(state) })).rejects.toMatchObject({ code: "OPERATION_ID_REUSED" });
    expect(render.calls).toBe(34);
    expect(historyBytes()).toEqual(bytes);
  });

  it("a failed operation's result is durable too: after 34 failures with unchanged state, the first id replays as failed without rendering", async () => {
    const render = fakeExactRender({ failWith: new Error("render failed") });
    const svc = service({ render });
    const state = await svc.ensureTracked("clip-a");
    const requests: any[] = [];
    for (let i = 0; i < 34; i++) {
      const req = { clip_id: "clip-a", operation_id: `failure-${i}`, expected: expectedOf(state), recipe: recipe(), source_words: WORDS };
      requests.push(JSON.parse(JSON.stringify(req)));
      const r = await svc.saveRevision(req);
      expect(r.outcome).toBe("failed");
    }
    expect(render.calls).toBe(34);
    expect(entry().revisions.operations).toHaveLength(34);
    const replay = await svc.saveRevision(requests[0]);
    expect(replay).toMatchObject({ outcome: "failed", replayed: true, operation: { operation_id: "failure-0", state: "failed", error: "render failed" } });
    expect(render.calls).toBe(34);
    expect(entry().revisions.current.version).toBe(0);
  });

  it("replay precedes source and asset existence: a committed operation replays after its source is gone; only a new render is refused", async () => {
    const render = fakeExactRender();
    const svc = service({ render });
    const state = await svc.ensureTracked("clip-a");
    const req = { clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state), recipe: recipe({ outro_path: outro }), source_words: WORDS };
    const first = await svc.saveRevision(JSON.parse(JSON.stringify(req)));
    expect(first.outcome).toBe("committed");
    const bytes = historyBytes();
    rmSync(source);
    rmSync(outro);
    const replay = await svc.saveRevision(JSON.parse(JSON.stringify(req)));
    expect(replay).toMatchObject({ outcome: "committed", replayed: true, revision: { revision_id: (first as any).revision.revision_id } });
    expect(render.calls).toBe(1);
    expect(historyBytes()).toEqual(bytes);
    await expect(svc.saveRevision({ ...JSON.parse(JSON.stringify(req)), operation_id: "op-2", expected: expectedOf(entry().revisions) })).rejects.toMatchObject({ code: "INVALID_RECIPE" });
    expect(render.calls).toBe(1);
    expect(historyBytes()).toEqual(bytes);
    // A different request under the old id still conflicts rather than rendering.
    await expect(svc.saveRevision({ ...JSON.parse(JSON.stringify(req)), recipe: recipe() })).rejects.toMatchObject({ code: "OPERATION_ID_REUSED" });
    expect(render.calls).toBe(1);
  });
});

describe("physical ownership of write targets", () => {
  const outsideRoot = join(tmp, "outside");
  function link(at: string, target: string) {
    mkdirSync(dirname(at), { recursive: true });
    mkdirSync(target, { recursive: true });
    symlinkSync(target, at, "junction");
    expect(lstatSync(at).isSymbolicLink()).toBe(true);
  }
  function unlink(at: string) {
    try { rmdirSync(at); } catch { unlinkSync(at); }
  }
  const listing = (dir: string) => (existsSync(dir) ? readdirSync(dir).sort() : []);

  beforeEach(() => {
    rmSync(outsideRoot, { recursive: true, force: true });
    mkdirSync(outsideRoot);
  });

  it("a linked sidecar intermediate or clip root refuses draft and revision writes before anything is written", async () => {
    for (const [label, at] of [["intermediate", join(historyDir, "revisions")], ["clip root", sidecars]] as const) {
      const target = join(outsideRoot, `sidecars-${label.replace(/\W/g, "-")}`);
      link(at, target);
      const render = fakeExactRender();
      const svc = service({ render });
      const state = await svc.ensureTracked("clip-a");
      const bytes = historyBytes();
      await expect(svc.saveDraft({ clip_id: "clip-a", expected: expectedOf(state), draft: { recipe: recipe(), source_words: WORDS } }), label).rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE" });
      await expect(svc.saveRevision({ clip_id: "clip-a", operation_id: "op-link", expected: expectedOf(state), recipe: recipe(), source_words: WORDS }), label).rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE" });
      expect(listing(target), label).toEqual([]);
      expect(render.calls, label).toBe(0);
      expect(historyBytes(), label).toEqual(bytes);
      expect(groups(), label).toEqual([]);
      unlink(at);
    }
  });

  it("a linked export namespace intermediate or clip root refuses a new render before anything is written", async () => {
    for (const [label, at] of [["intermediate", join(exportsDir, REVISION_NAMESPACE)], ["clip root", namespace]] as const) {
      const target = join(outsideRoot, `exports-${label.replace(/\W/g, "-")}`);
      link(at, target);
      const render = fakeExactRender();
      const svc = service({ render });
      const state = await svc.ensureTracked("clip-a");
      const bytes = historyBytes();
      await expect(svc.saveRevision({ clip_id: "clip-a", operation_id: "op-link", expected: expectedOf(state), recipe: recipe(), source_words: WORDS }), label).rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE" });
      expect(listing(target), label).toEqual([]);
      expect(render.calls, label).toBe(0);
      expect(historyBytes(), label).toEqual(bytes);
      expect(existsSync(sidecars), label).toBe(false);
      unlink(at);
    }
  });

  it("a link that appears after the operation began fails it without writing through the link; a linked returned group is refused as an artifact", async () => {
    const target = join(outsideRoot, "late-sidecars");
    const render = fakeExactRender();
    const svc = service({ render, hooks: { beforeRender: () => link(sidecars, target) } });
    const state = await svc.ensureTracked("clip-a");
    const r1 = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-late", expected: expectedOf(state), recipe: recipe(), source_words: WORDS });
    expect(r1.outcome).toBe("failed");
    expect(r1.operation.error).toMatch(/symbolic link or junction/);
    expect(listing(target)).toEqual([]);
    expect(r1.operation.residuals).toEqual([join(namespace, groups()[0])]);
    expect(entry().revisions.current.version).toBe(0);
    expect(entry().output_path).toBe(legacyOutput);
    unlink(sidecars);

    // The renderer's group replaced by a junction to a directory outside the namespace.
    const moved = join(outsideRoot, "moved-group");
    const svc2 = service({
      render: fakeExactRender({
        onRender: (_p, result) => {
          const group = dirname(dirname(result.output_path));
          renameSync(group, moved);
          symlinkSync(moved, group, "junction");
        },
      }),
    });
    const r2 = await svc2.saveRevision({ clip_id: "clip-a", operation_id: "op-linked-group", expected: expectedOf(entry().revisions), recipe: recipe(), source_words: WORDS });
    expect(r2.outcome).toBe("failed");
    expect(r2.operation.error).toMatch(/symbolic link or junction/);
    expect(entry().revisions.current.version).toBe(0);
    expect(existsSync(sidecars)).toBe(false);
    expect(readdirSync(join(moved, "final"))).toHaveLength(1);
    for (const g of groups()) if (lstatSync(join(namespace, g)).isSymbolicLink()) unlink(join(namespace, g));
  });

  // The configured export and history roots are owned too: a junction there is
  // refused, never followed or swapped for its target.
  function rootsCase(name: string) {
    const base = join(outsideRoot, name);
    const physical = { exports: join(base, "physical-exports"), history: join(base, "physical-history") };
    for (const [kind, dir] of Object.entries(physical)) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "sentinel.txt"), `outside ${kind}`);
    }
    return { physical, roots: { exports: join(base, "exports"), history: join(base, "history") } };
  }
  const contents = (dir: string) => listing(dir).map((f) => [f, lstatSync(join(dir, f)).isFile() ? readFileSync(join(dir, f), "utf-8") : "<dir>"]);

  it("a configured history or export root that is itself a junction refuses drafts and revisions before anything is written through it", async () => {
    for (const linked of [["exports", "history"], ["exports"], ["history"]] as Array<Array<"exports" | "history">>) {
      const label = linked.join("+");
      const { physical, roots } = rootsCase(`roots-${label}`);
      for (const kind of ["exports", "history"] as const) {
        if (linked.includes(kind)) link(roots[kind], physical[kind]);
        else mkdirSync(roots[kind], { recursive: true });
      }
      const outside = { exports: contents(physical.exports), history: contents(physical.history) };
      const render = fakeExactRender();
      const svc = service({ render, exportRoot: roots.exports, historyRoot: roots.history });
      const state = await svc.ensureTracked("clip-a");
      let bytes = historyBytes();
      if (linked.includes("history")) {
        await expect(svc.saveDraft({ clip_id: "clip-a", expected: expectedOf(state), draft: { recipe: recipe(), source_words: WORDS } }), label)
          .rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE", details: { path: roots.history } });
        expect(historyBytes(), label).toEqual(bytes);
      }
      const current = await svc.ensureTracked("clip-a");
      bytes = historyBytes();
      const refusal = await svc.saveRevision({ clip_id: "clip-a", operation_id: `op-${linked.join("-")}`, expected: expectedOf(current), recipe: recipe(), source_words: WORDS }).catch((err) => err);
      expect(refusal, label).toMatchObject({ code: "OWNERSHIP_ESCAPE", message: expect.stringMatching(/configured root .* symbolic link or junction/) });
      expect(linked.map((kind) => roots[kind]), label).toContain(refusal.details.path);
      expect(render.calls, label).toBe(0);
      expect(historyBytes(), label).toEqual(bytes);
      expect(entry().revisions.operations, label).toEqual([]);
      expect(entry().revisions.revision_version, label).toBe(0);
      expect(contents(physical.exports), label).toEqual(outside.exports);
      expect(contents(physical.history), label).toEqual(outside.history);
      for (const kind of linked) unlink(roots[kind]);
    }
  });

  it("a configured root replaced by a junction after the operation began fails it without writing through the link", async () => {
    // Export root: the returned artifacts would be reached through the link.
    {
      const { roots } = rootsCase("late-export-root");
      mkdirSync(roots.exports, { recursive: true });
      mkdirSync(roots.history, { recursive: true });
      const moved = join(outsideRoot, "late-export-root", "moved-exports");
      const render = fakeExactRender({ onRender: () => { renameSync(roots.exports, moved); symlinkSync(moved, roots.exports, "junction"); } });
      const svc = service({ render, exportRoot: roots.exports, historyRoot: roots.history });
      const state = await svc.ensureTracked("clip-a");
      const result = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-late-export", expected: expectedOf(state), recipe: recipe(), source_words: WORDS });
      expect(result.outcome).toBe("failed");
      expect(result.operation.error).toMatch(/configured root .* symbolic link or junction/);
      expect(entry().revisions.current.version).toBe(0);
      expect(entry().output_path).toBe(legacyOutput);
      expect(listing(roots.history)).toEqual([]);
      // Only what the renderer itself published sits behind the link.
      const published = join(moved, REVISION_NAMESPACE, "clip-a");
      expect(listing(published)).toHaveLength(1);
      expect(listing(join(published, listing(published)[0]))).toEqual(["final"]);
      unlink(roots.exports);
    }
    // History root: the revision document would be written through the link.
    {
      const { physical, roots } = rootsCase("late-history-root");
      mkdirSync(roots.exports, { recursive: true });
      mkdirSync(roots.history, { recursive: true });
      const svc = service({
        exportRoot: roots.exports,
        historyRoot: roots.history,
        hooks: { afterRender: () => { rmdirSync(roots.history); symlinkSync(physical.history, roots.history, "junction"); } },
      });
      const outside = contents(physical.history);
      const state = await svc.ensureTracked("clip-a");
      const result = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-late-history", expected: expectedOf(state), recipe: recipe(), source_words: WORDS });
      expect(result.outcome).toBe("failed");
      expect(result.operation.error).toMatch(/configured root .* symbolic link or junction/);
      expect(entry().revisions.current.version).toBe(0);
      expect(contents(physical.history)).toEqual(outside);
      unlink(roots.history);
    }
  });

  it("missing configured roots are created as real directories and a draft and revision commit beneath them", async () => {
    const base = join(outsideRoot, "missing");
    const roots = { exports: join(base, "a", "exports"), history: join(base, "b", "history") };
    const svc = service({ exportRoot: roots.exports, historyRoot: roots.history });
    const state = await svc.ensureTracked("clip-a");
    const draft = await svc.saveDraft({ clip_id: "clip-a", expected: expectedOf(state), draft: { recipe: recipe(), source_words: WORDS } });
    const saved = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-missing", expected: expectedOf(draft.state), recipe: recipe(), source_words: WORDS });
    expect(saved.outcome).toBe("committed");
    for (const root of Object.values(roots)) {
      expect(lstatSync(root).isDirectory()).toBe(true);
      expect(lstatSync(root).isSymbolicLink()).toBe(false);
    }
    expect(entry().revisions.current.output_path.startsWith(join(roots.exports, REVISION_NAMESPACE, "clip-a"))).toBe(true);
    expect(entry().revisions.current.path.startsWith(join(roots.history, "revisions", "clip-a"))).toBe(true);
  });
});

describe("operation ownership across clip incarnations", () => {
  async function recreate(svc: ReturnType<typeof service>) {
    await history.transaction((list) => {
      list.splice(list.findIndex((e) => e.id === "clip-a"), 1);
      list.push({ ...seedClip, title: "recreated" } as any);
    });
    return svc.ensureTracked("clip-a");
  }

  it("an old incarnation's late failure leaves the recreated clip's same-id operation untouched, and that operation commits", async () => {
    const g1 = gate();
    const g2 = gate();
    const oldSvc = service({ render: fakeExactRender({ failWith: new Error("old renderer failed") }), hooks: { beforeRender: g1.hook } });
    const newSvc = service({ hooks: { beforeRender: g2.hook } });
    const oldState = await oldSvc.ensureTracked("clip-a");
    const oldPromise = oldSvc.saveRevision({ clip_id: "clip-a", operation_id: "same-op", expected: expectedOf(oldState), recipe: recipe(), source_words: WORDS });
    await g1.arrived;
    const newState = await recreate(newSvc);
    expect(newState.incarnation).not.toBe(oldState.incarnation);
    const newPromise = newSvc.saveRevision({ clip_id: "clip-a", operation_id: "same-op", expected: expectedOf(newState), recipe: recipe(), source_words: WORDS });
    await g2.arrived;
    g1.open();
    const oldResult = await oldPromise;
    expect(oldResult.outcome).toBe("superseded");
    expect(oldResult.operation.reason).toMatch(/incarnation changed/);
    expect(oldResult.operation.reason).toMatch(/old renderer failed/);
    const mid = entry().revisions;
    expect(mid.incarnation).toBe(newState.incarnation);
    expect(mid.operations).toHaveLength(1);
    expect(mid.operations[0]).toMatchObject({ operation_id: "same-op", state: "pending", error: null });
    g2.open();
    const newResult = await newPromise;
    expect(newResult.outcome).toBe("committed");
    expect(entry().revisions.current).toMatchObject({ version: 1, operation_id: "same-op" });
    expect(entry().revisions.operations[0].state).toBe("committed");
  });

  it("an old incarnation's late success cannot commit or mark the recreated clip's same-id operation; its work is reported as residual", async () => {
    const g1 = gate();
    const g2 = gate();
    const oldSvc = service({ hooks: { beforeCommit: g1.hook } });
    const newSvc = service({ hooks: { beforeRender: g2.hook } });
    const oldState = await oldSvc.ensureTracked("clip-a");
    const oldPromise = oldSvc.saveRevision({ clip_id: "clip-a", operation_id: "same-op", expected: expectedOf(oldState), recipe: recipe(), source_words: WORDS });
    await g1.arrived;
    const oldGroup = join(namespace, groups()[0]);
    const newState = await recreate(newSvc);
    const newPromise = newSvc.saveRevision({ clip_id: "clip-a", operation_id: "same-op", expected: expectedOf(newState), recipe: recipe({ title: "New" }), source_words: WORDS });
    await g2.arrived;
    g1.open();
    const oldResult = await oldPromise;
    expect(oldResult.outcome).toBe("superseded");
    expect(oldResult.operation.reason).toMatch(/incarnation changed/);
    expect(oldResult.operation.residuals[0]).toBe(oldGroup);
    expect(oldResult.operation.residuals[1]).toMatch(/\.json$/);
    const mid = entry();
    expect(mid.output_path).toBe(legacyOutput);
    expect(mid.revisions.current.version).toBe(0);
    expect(mid.revisions.operations).toHaveLength(1);
    expect(mid.revisions.operations[0]).toMatchObject({ operation_id: "same-op", state: "pending", residuals: [] });
    g2.open();
    expect((await newPromise).outcome).toBe("committed");
    expect(entry().revisions.current).toMatchObject({ version: 1, operation_id: "same-op" });
    expect(entry().title).toBe("recreated");
    expect(existsSync(oldGroup)).toBe(true);
  });

  it("a stale cancellation for another incarnation changes nothing; the owner's cancellation and late residual reporting still work", async () => {
    const g1 = gate();
    const g2 = gate();
    const oldSvc = service({ hooks: { beforeCommit: g1.hook } });
    const newSvc = service({ hooks: { beforeCommit: g2.hook } });
    const oldState = await oldSvc.ensureTracked("clip-a");
    const oldPromise = oldSvc.saveRevision({ clip_id: "clip-a", operation_id: "same-op", expected: expectedOf(oldState), recipe: recipe(), source_words: WORDS });
    await g1.arrived;
    const newState = await recreate(newSvc);
    const newPromise = newSvc.saveRevision({ clip_id: "clip-a", operation_id: "same-op", expected: expectedOf(newState), recipe: recipe(), source_words: WORDS });
    await g2.arrived;
    expect(await oldSvc.invalidateOperation({ clip_id: "clip-a", operation_id: "same-op", expected_incarnation: oldState.incarnation, reason: "stale" })).toMatchObject({ outcome: "not-owned" });
    expect(entry().revisions.operations[0]).toMatchObject({ state: "pending", reason: null });
    expect(await newSvc.invalidateOperation({ clip_id: "clip-a", operation_id: "same-op", expected_incarnation: newState.incarnation, reason: "owner cancelled" }))
      .toMatchObject({ outcome: "invalidated", operation: { state: "cancelled", reason: "owner cancelled" } });
    g1.open();
    expect((await oldPromise).outcome).toBe("superseded");
    expect(entry().revisions.operations[0]).toMatchObject({ state: "cancelled", reason: "owner cancelled" });
    expect(entry().revisions.operations[0].residuals).toHaveLength(1);
    g2.open();
    const newResult = await newPromise;
    expect(newResult.outcome).toBe("cancelled");
    expect(newResult.operation.residuals).toHaveLength(2);
    expect(entry().revisions.operations[0].residuals).toEqual(newResult.operation.residuals);
    expect(entry().revisions.current.version).toBe(0);
    expect(entry().output_path).toBe(legacyOutput);
    expect(groups()).toHaveLength(2);
  });
});

describe("captured requests", () => {
  it("a save uses the request captured before its first await: caller mutation afterwards or during the render changes nothing", async () => {
    const g = gate();
    const render = fakeExactRender();
    const svc = service({ render, hooks: { beforeRender: g.hook } });
    const state = await svc.ensureTracked("clip-a");
    const req: any = {
      clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state),
      recipe: recipe({ crop_keyframes: [{ t: 0, x_pct: 50 }], foreground_framing: { mode: "auto" }, outro_path: outro, bookend_fade: 0.25 }),
      source_words: WORDS.map((w) => ({ ...w })),
    };
    const original = JSON.parse(JSON.stringify(req));
    const pending = svc.saveRevision(req);
    // Mutate synchronously after the call, before any await inside the service has resumed.
    req.recipe.keep_segments[0].start = 7;
    req.source_words[0].word = "changed";
    req.expected.revision_version = 99;
    await g.arrived;
    // Mutate again while the render is awaited: nested replacement, additions and removals.
    req.recipe.keep_segments = [{ start: 0, end: 6 }];
    req.recipe.crop_keyframes.push({ t: 1, x_pct: 10 });
    req.recipe.foreground_framing.mode = "manual";
    req.recipe.outro_path = null;
    req.source_words.length = 1;
    req.clip_id = "clip-b";
    g.open();
    const result = await pending;
    expect(result.outcome).toBe("committed");
    expect(render.lastParams).toMatchObject({ keep_segments: original.recipe.keep_segments, transcript_words: original.source_words, crop_keyframes: original.recipe.crop_keyframes, foreground_framing: { mode: "auto" }, outro_path: outro });
    const doc = JSON.parse(readFileSync(entry().revisions.current.path, "utf-8"));
    expect(doc.recipe).toEqual(original.recipe);
    expect(doc.source_words).toEqual(original.source_words);
    expect(doc.render_timeline.segments.map((s: any) => s.source_start)).toEqual([4, 1]);
    expect(entry("clip-b")).toEqual(seedOther);
    const replay = await svc.saveRevision(JSON.parse(JSON.stringify(original)));
    expect(replay).toMatchObject({ outcome: "committed", replayed: true, revision: { revision_id: (result as any).revision.revision_id } });
    await expect(svc.saveRevision({ ...req, clip_id: "clip-a" })).rejects.toMatchObject({ code: "OPERATION_ID_REUSED" });
    expect(render.calls).toBe(1);
  });

  it("a draft and an invalidation use their captured requests too", async () => {
    const svc = service();
    const state = await svc.ensureTracked("clip-a");
    const req: any = { clip_id: "clip-a", expected: expectedOf(state), draft: { recipe: recipe(), source_words: WORDS.map((w) => ({ ...w })), note: "first" } };
    const original = JSON.parse(JSON.stringify(req));
    const p = svc.saveDraft(req);
    req.draft.recipe.keep_segments[0].end = 9;
    req.draft.source_words.splice(0, 3);
    req.draft.note = "changed";
    const saved = await p;
    expect(JSON.parse(readFileSync(saved.draft.path, "utf-8")).draft).toEqual(original.draft);

    const g = gate();
    const svc2 = service({ hooks: { beforeCommit: g.hook } });
    const pending = svc2.saveRevision({ clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(saved.state), recipe: recipe(), source_words: WORDS });
    await g.arrived;
    const inv: any = { clip_id: "clip-a", operation_id: "op-1", expected_incarnation: state.incarnation, reason: "captured reason" };
    const ip = svc2.invalidateOperation(inv);
    inv.reason = "changed reason";
    inv.operation_id = "op-other";
    inv.expected_incarnation = "other";
    expect(await ip).toMatchObject({ outcome: "invalidated", operation: { operation_id: "op-1", reason: "captured reason" } });
    g.open();
    expect((await pending).outcome).toBe("cancelled");
  });
});

describe("receipt validation", () => {
  const cases: Array<[string, (r: any) => void, RegExp]> = [
    ["missing output_duration", (r) => { delete r.render_timeline.output_duration; }, /output_duration must be a finite number/],
    ["NaN output_duration", (r) => { r.render_timeline.output_duration = Number.NaN; }, /output_duration must be a finite number/],
    ["segment without source_start", (r) => { delete r.render_timeline.segments[0].source_start; }, /source_start must be a finite number/],
    ["segment content_start out of place", (r) => { r.render_timeline.segments[0].content_start = 999; }, /content_start 999 does not continue/],
    ["review schedule: no output_duration, no source_start, content_start 999", (r) => { delete r.render_timeline.output_duration; delete r.render_timeline.segments[0].source_start; r.render_timeline.segments[0].content_start = 999; }, /must be a finite number/],
    ["segment count disagrees", (r) => { r.render_timeline.segment_count = 1; }, /segment count differs/],
    ["segment interval differs", (r) => { r.render_timeline.segments[1].source_end += 0.5; r.render_timeline.segments[1].duration += 0.5; r.render_timeline.segments[1].content_end += 0.5; }, /differs from the requested interval/],
    ["content_duration disagrees", (r) => { r.render_timeline.content_duration = 5; }, /content_duration disagrees/],
    ["measured content outside tolerance", (r) => { r.render_timeline.content_duration_measured = 3; }, /outside the renderer's content tolerance/],
    ["output_duration does not add up", (r) => { r.render_timeline.output_duration = 9; }, /does not add up/],
    ["offset without intro", (r) => { r.render_timeline.content_to_output_offset = 1; }, /content offset without an intro/],
    ["unrequested intro", (r) => { r.render_timeline.bookends.intro = { ...r.render_timeline.bookends.outro, kind: "intro" }; }, /unrequested intro/],
    ["missing outro", (r) => { r.render_timeline.bookends.outro = null; }, /lacks the requested outro/],
    ["words input wrong", (r) => { r.render_timeline.words.input = "unavailable"; }, /transcript input unavailable/],
    ["source word count wrong", (r) => { r.render_timeline.words.source_count = 2; }, /source word count differs/],
    ["content word beyond content", (r) => { r.render_timeline.words.content.push({ word: "late", start: 5, end: 6 }); }, /ends after the content/],
    ["content word non-finite", (r) => { r.render_timeline.words.content[0].start = "0.2"; }, /words\.content\[0\]\.start must be a finite number/],
    ["caption renderer inconsistent", (r) => { r.render_timeline.captions.renderer = null; }, /caption renderer is inconsistent/],
    ["framing format differs", (r) => { r.render_timeline.framing.format = "square"; }, /framing format differs/],
    ["output dimensions differ from framing", (r) => { r.render_timeline.output.width = 720; }, /output dimensions differ/],
    ["file size not an integer", (r) => { r.render_timeline.output.file_size_bytes = 1.5; }, /file_size_bytes must be an integer/],
    ["output path inconsistent", (r) => { r.render_timeline.output.path = `${r.output_path}.x`; }, /output path is missing or inconsistent/],
    ["unrequested keyframes", (r) => { r.render_timeline.framing.crop_keyframes.keyframes = [{ t: 0, x_pct: 1 }]; }, /unrequested crop keyframes/],
    ["keyframes not in content domain", (r) => { r.render_timeline.framing.crop_keyframes.time_domain = "source"; }, /not in the content domain/],
    ["missing tolerance", (r) => { delete r.render_timeline.tolerance; }, /tolerance must be an object/],
    ["legacy duration disagrees", (r) => { r.duration = 7; }, /legacy duration disagrees/],
    ["format differs", (r) => { r.format = "square"; }, /format differs from the request/],
    ["unrequested sidecar", (r) => { r.caption_overlay_path = r.output_path; }, /unrequested caption_overlay_path/],
    ["source path differs", (r) => { r.render_timeline.source.path = `${r.render_timeline.source.path}.other`; }, /source path differs/],
    ["not exact", (r) => { r.timing_mode = "legacy"; }, /did not return an exact receipt/],
    ["wrong version", (r) => { r.render_timeline.version = 2; }, /exact v1 receipt/],
    // Semantic relationships against the accepted renderer (repair-2, WS-16).
    ["time_domains empty", (r) => { r.render_timeline.time_domains = {}; }, /time_domains are not the exact v1/],
    ["time_domains invented map", (r) => { r.render_timeline.time_domains = { keep_segments: "source", segments: "source->content", words: "content", crop_keyframes: "content" }; }, /time_domains are not the exact v1/],
    ["time_domains value changed", (r) => { r.render_timeline.time_domains["segments.source_*"] = "source"; }, /time_domains are not the exact v1/],
    ["time_domains extra key", (r) => { r.render_timeline.time_domains.extra = "seconds"; }, /time_domains are not the exact v1/],
    ["source words invented", (r) => { r.render_timeline.words.source[0] = { word: "invented", start: 90, end: 91 }; }, /source words are not the supplied words/],
    ["source words missing a touching word", (r) => { r.render_timeline.words.source.pop(); }, /source words are not the supplied words/],
    ["source words reordered", (r) => { r.render_timeline.words.source.reverse(); }, /source words are not the supplied words/],
    ["source word metadata altered", (r) => { r.render_timeline.words.source[0].speaker = "S9"; }, /source words are not the supplied words/],
    ["source words include an untouched word", (r) => { r.render_timeline.words.source.push({ ...WORDS[0] }); }, /source words are not the supplied words/],
    ["content word invented", (r) => { r.render_timeline.words.content[0] = { word: "invented", start: 0.2, end: 0.7, confidence: 1, speaker: "S0" }; }, /content word 0 is not supplied word "cyan"/],
    ["content word moved", (r) => { r.render_timeline.words.content[1].start = 0.7; r.render_timeline.words.content[1].end = 0.9; }, /content word 1 is not supplied word "green"/],
    ["content words in source order instead of interval order", (r) => { r.render_timeline.words.content.reverse(); }, /content word 0 is not supplied word "cyan"/],
    ["content word metadata dropped", (r) => { delete r.render_timeline.words.content[0].speaker; }, /content word 0 is not supplied word "cyan"/],
    ["content word missing", (r) => { r.render_timeline.words.content.pop(); }, /1 content words; the supplied words projected onto the kept intervals give 2/],
    ["content_text invented", (r) => { r.render_timeline.words.content_text = "invented"; }, /content_text is not the text of its content words/],
    ["caption style changed", (r) => { r.render_timeline.captions.style = "other"; }, /caption style differs/],
    ["captions not requested", (r) => { r.render_timeline.captions.requested = false; }, /captions as not requested/],
    ["filler cleaning claimed", (r) => { r.render_timeline.captions.filler_cleaning = true; }, /filler cleaning differs/],
    ["ASS fallback not allowed", (r) => { r.render_timeline.captions.renderer = "ass"; }, /ASS caption fallback/],
    ["caption words invented", (r) => { r.render_timeline.captions.words = [{ word: "invented", start: 0.2, end: 0.7 }]; }, /caption word 0 is not one of the content words/],
    ["caption word dropped with cleaning off", (r) => { r.render_timeline.captions.words.pop(); }, /differ from the content words although filler cleaning was off/],
    ["caption words without rendering", (r) => { Object.assign(r.render_timeline.captions, { rendered: false, renderer: null, unavailable_reason: "none" }); }, /caption words although no captions were rendered/],
    ["requested_fade differs", (r) => { r.render_timeline.bookends.requested_fade = 0.5; }, /requested_fade differs from the request/],
    ["outro requested_fade missing", (r) => { r.render_timeline.bookends.outro.requested_fade = null; }, /outro\.requested_fade must be a finite number/],
    ["hard cut claims overlap", (r) => { r.render_timeline.bookends.outro.applied_overlap = 0.25; }, /a hard cut overlaps nothing/],
    ["crossfade claimed without a fade", (r) => { r.render_timeline.bookends.outro.branch = "xfade_acrossfade"; }, /crossfade overlap 0s is not the requested fade 0s/],
    ["outro transition unrelated", (r) => { r.render_timeline.bookends.outro.transition = { output_start: 500, output_end: 600 }; }, /outro region and transition do not start/],
    ["outro region shorter than its asset", (r) => { r.render_timeline.bookends.outro.output_end -= 0.5; }, /outro region does not run for its asset length/],
    ["outro asset disagrees with its region", (r) => { r.render_timeline.bookends.outro.asset_duration = 999; }, /outro region does not run for its asset length/],
  ];

  it("refuses every malformed or inconsistent receipt as a failed operation without moving a pointer", async () => {
    let n = 0;
    for (const [label, mutate, message] of cases) {
      const svc = service({ render: fakeExactRender({ onRender: (_p, r) => mutate(r) }) });
      const state = await svc.ensureTracked("clip-a");
      const before = { ...entry() };
      const groupsBefore = new Set(groups());
      const result = await svc.saveRevision({ clip_id: "clip-a", operation_id: `bad-${++n}`, expected: expectedOf(state), recipe: recipe({ outro_path: outro }), source_words: WORDS });
      expect(result.outcome, label).toBe("failed");
      expect(result.operation.error, label).toMatch(message);
      const e = entry();
      expect(e.revisions.current.version, label).toBe(0);
      expect(e.revisions.revision_version, label).toBe(0);
      expect(e.output_path, label).toBe(legacyOutput);
      for (const key of ["start_second", "end_second", "duration", "transcript_slice"]) expect(e[key], label).toEqual(before[key]);
      expect(e.revisions.operations.at(-1), label).toMatchObject({ operation_id: `bad-${n}`, state: "failed" });
      const created = groups().filter((g) => !groupsBefore.has(g));
      expect(created, label).toHaveLength(1);
      expect(result.operation.residuals, label).toEqual([join(namespace, created[0])]);
      expect(existsSync(sidecars) ? readdirSync(sidecars) : [], label).toEqual([]);
    }
  });

  it("accepts a complete receipt with intro, outro, crossfade and keyframes; a NaN anywhere refuses", async () => {
    const intro = join(tmp, "intro.mp4");
    writeFileSync(intro, "intro-bytes");
    const svc = service({ render: fakeExactRender({ branch: "xfade_acrossfade" }) });
    const state = await svc.ensureTracked("clip-a");
    const ok = await svc.saveRevision({
      clip_id: "clip-a", operation_id: "op-ok", expected: expectedOf(state),
      recipe: recipe({ intro_path: intro, outro_path: outro, bookend_fade: 0.25, crop_keyframes: [{ t: 0, x_pct: 40 }, { t: 1.5, x_pct: 60 }] }), source_words: WORDS,
    });
    expect(ok.outcome, JSON.stringify(ok.operation)).toBe("committed");
    const doc = JSON.parse(readFileSync(entry().revisions.current.path, "utf-8"));
    expect([doc.bookends.intro.branch, doc.bookends.outro.branch]).toEqual(["xfade_acrossfade", "xfade_acrossfade"]);
    expect(doc.render_timeline.content_to_output_offset).toBe(0.75);
    expect(doc.render_timeline.output_duration).toBe(3.5);
    const nan = service({ render: fakeExactRender({ onRender: (_p, r) => { r.render_timeline!.content_to_output_offset = Number.NaN; } }) });
    const bad = await nan.saveRevision({ clip_id: "clip-a", operation_id: "op-nan", expected: expectedOf(entry().revisions), recipe: recipe(), source_words: null });
    expect(bad.outcome).toBe("failed");
    expect(bad.operation.error).toMatch(/content_to_output_offset must be a finite number/);
    expect(entry().revisions.current.version).toBe(1);
    expect(entry().revisions.current.revision_id).toBe(doc.revision_id);
  });

  it("refuses the review's contradictory receipts: invented words and caption style, an impossible intro, empty time domains", async () => {
    const intro = join(tmp, "intro.mp4");
    writeFileSync(intro, "intro-bytes");
    const schedule: Array<[string, (t: any) => void, Record<string, unknown>, RegExp]> = [
      ["words", (t) => { t.words.source = [{ word: "invented", start: 90, end: 91 }]; t.words.content = [{ word: "invented", start: 0.7, end: 0.9 }]; t.words.content_text = "invented"; t.captions.style = "other"; }, {}, /source words are not the supplied words/],
      ["composition", (t) => { t.bookends.intro.asset_duration = 999; t.bookends.intro.applied_overlap = 888; t.bookends.intro.transition = { output_start: 500, output_end: 600 }; }, { intro_path: intro }, /intro hardcut claims 888s of video overlap/],
      ["domains", (t) => { t.time_domains = {}; }, {}, /time_domains are not the exact v1/],
    ];
    let n = 0;
    for (const [label, alter, over, message] of schedule) {
      const svc = service({ render: fakeExactRender({ onRender: (_p, r) => alter(r.render_timeline) }) });
      const state = await svc.ensureTracked("clip-a");
      const result = await svc.saveRevision({ clip_id: "clip-a", operation_id: `review-${++n}`, expected: expectedOf(state), recipe: recipe({ keep_segments: [{ start: 0, end: 1 }], ...over }), source_words: [{ word: "actual", start: 0.1, end: 0.4 }] as any });
      expect(result.outcome, label).toBe("failed");
      expect(result.operation.error, label).toMatch(message);
      expect(entry().revisions.current.version, label).toBe(0);
      expect(entry().revisions.revision_version, label).toBe(0);
      expect(entry().output_path, label).toBe(legacyOutput);
      expect(existsSync(sidecars) ? readdirSync(sidecars) : [], label).toEqual([]);
    }
  });

  it("accepts valid receipts near the boundaries: clipped, excluded and zero-length words over reversed and repeated intervals, renderer rounding, supplied-empty and unavailable words, clamped crossfades, hard-cut fallback and filler cleaning", async () => {
    const intro = join(tmp, "intro.mp4");
    writeFileSync(intro, "intro-bytes");
    const meta = { speaker: "S1", confidence: 0.93, tags: ["kept", { nested: true }] };
    const boundaryWords = [
      { word: "before", start: 0.2, end: 1.0, ...meta }, // ends where an interval starts: excluded
      { word: "straddle-in", start: 3.8, end: 4.3, ...meta }, // clipped to the interval start
      { word: "inside", start: 4.4, end: 4.6, ...meta },
      { word: "straddle-out", start: 4.9, end: 5.25, ...meta }, // clipped to the interval end
      { word: "zero", start: 1.5, end: 1.5, ...meta }, // zero length inside: retained, not projected
      { word: "edge", start: 2.5, end: 2.8, ...meta }, // starts where an interval ends: excluded
      { word: " padded\t", start: 1.2, end: 1.23456, speaker: "S0" }, // rounding and Python strip
    ];
    const boundary = [{ start: 4, end: 5 }, { start: 1, end: 2.5 }, { start: 4, end: 5 }];
    const um = [{ word: "um", start: 0.1, end: 0.2 }, { word: "actual", start: 0.3, end: 0.6 }];
    const valid: Array<[string, Record<string, unknown>, unknown, Parameters<typeof fakeExactRender>[0]]> = [
      ["boundary words", { keep_segments: boundary }, boundaryWords, {}],
      ["renderer rounding within 0.001", { keep_segments: boundary }, boundaryWords, { onRender: (_p, r) => { const t = r.render_timeline!; t.words.content[1].end = Math.round((t.words.content[1].end + 0.001) * 1000) / 1000; t.captions.words[1].end = t.words.content[1].end; } }],
      ["supplied empty", {}, [], {}],
      ["unavailable", {}, null, {}],
      ["clamped crossfades", { intro_path: intro, outro_path: outro, bookend_fade: 0.5 }, WORDS, { branch: "xfade_acrossfade", bookendSeconds: 0.3 }],
      ["hard-cut fallback with a fade", { intro_path: intro, outro_path: outro, bookend_fade: 0.25 }, WORDS, { branch: "hardcut_soft_audio" }],
      ["filler cleaning dropped a caption word", { keep_segments: [{ start: 0, end: 1 }], clean_fillers: true }, um, { onRender: (_p, r) => { r.render_timeline!.captions.words.splice(0, 1); } }],
    ];
    let n = 0;
    for (const [label, over, words, fake] of valid) {
      const svc = service({ render: fakeExactRender(fake) });
      const result = await svc.saveRevision({ clip_id: "clip-a", operation_id: `valid-${++n}`, expected: expectedOf(await svc.ensureTracked("clip-a")), recipe: recipe(over), source_words: words as any });
      expect(result.outcome, `${label}: ${result.operation.error}`).toBe("committed");
    }
    expect(entry().revisions.revision_version).toBe(valid.length);
    const timeline = (id: string) => JSON.parse(readFileSync(entry().revisions.operations.find((o: any) => o.operation_id === id).revision.path, "utf-8")).render_timeline;
    const first = timeline("valid-1");
    expect(first.words.source.map((w: any) => w.word)).toEqual(["straddle-in", "inside", "straddle-out", "zero", " padded\t"]);
    expect(first.words.content.map((w: any) => [w.word, w.start, w.end])).toEqual([
      ["straddle-in", 0, 0.3], ["inside", 0.4, 0.6], ["straddle-out", 0.9, 1], [" padded\t", 1.2, 1.235],
      ["straddle-in", 2.5, 2.8], ["inside", 2.9, 3.1], ["straddle-out", 3.4, 3.5],
    ]);
    expect(first.words.content[0].tags).toEqual(meta.tags);
    expect(first.words.content_text).toBe("straddle-in inside straddle-out padded straddle-in inside straddle-out");
    const empty = timeline("valid-3");
    expect([empty.words.input, empty.words.source, empty.words.content, empty.words.content_text, empty.captions.rendered]).toEqual(["supplied", [], [], "", false]);
    const unavailable = timeline("valid-4");
    expect([unavailable.words.input, unavailable.words.source, unavailable.words.content, unavailable.captions.words]).toEqual(["unavailable", null, [], []]);
    const crossfade = timeline("valid-5").bookends;
    expect([crossfade.intro.applied_overlap, crossfade.outro.applied_overlap, crossfade.intro.transition, crossfade.outro.transition]).toEqual([0.25, 0.25, { output_start: 0.05, output_end: 0.3 }, { output_start: 1.8, output_end: 2.05 }]);
    const cleaned = timeline("valid-7").captions;
    expect([cleaned.filler_cleaning, cleaned.words.map((w: any) => w.word)]).toEqual([true, ["actual"]]);
  });
});

describe("cleanup protection", () => {
  it("the real scanner offers nothing under the export namespace while still finding an unused reel", async () => {
    const svc = service();
    const state = await svc.ensureTracked("clip-a");
    const r1 = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-1", expected: expectedOf(state), recipe: recipe(), source_words: WORDS });
    const r2 = await svc.saveRevision({ clip_id: "clip-a", operation_id: "op-2", expected: expectedOf(entry().revisions), recipe: recipe(), source_words: WORDS });
    expect([r1.outcome, r2.outcome]).toEqual(["committed", "committed"]);
    // An interrupted group (staging only) and a superseded group beside the live ones.
    const interrupted = join(namespace, "Saved_clip_short-interrupted-1-abcd");
    mkdirSync(join(interrupted, "staging"), { recursive: true });
    writeFileSync(join(interrupted, "staging", "Saved_clip_short.mp4"), "partial");
    const old = new Date(Date.now() - 3 * 3600_000);
    for (const p of [interrupted, join(interrupted, "staging"), join(interrupted, "staging", "Saved_clip_short.mp4")]) utimesSync(p, old, old);
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
    const result = await cleanup.remove(report.scanId, report.items.filter((i) => i.eligible).map((i) => i.id));
    expect(result.deleted.map((d) => d.path)).toEqual([unused]);
    // Every revision artifact, the legacy output and the interrupted residual are still there.
    const st = entry().revisions;
    for (const p of [legacyOutput, st.current.output_path, st.previous.output_path, join(interrupted, "staging", "Saved_clip_short.mp4")]) expect(existsSync(p), p).toBe(true);
    expect(readdirSync(namespace)).toHaveLength(3);
    // A linked namespace root is never traversed and never offered.
    expect(paths.output).toBe(exportsDir);
  });
});
