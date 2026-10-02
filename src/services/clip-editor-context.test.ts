import { describe, it, expect, beforeEach } from "vitest";
import { createHash } from "crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, dirname, join } from "path";

// Writing Studio 1B.2b.2: the read-only editor context service, against an
// isolated home/export root. Committed fixtures are produced by the accepted
// revision save service with the fake exact renderer and fake composer, so the
// documents, pointers and operation records read here have the real shape
// rather than a hand-written approximation. Real HTTP, a real server restart
// and the real bridge are scripts/verification/check-editor-context.mjs; the
// route adapter is src/ui/editor-context-route.test.ts.

const tmp = mkdtempSync(join(tmpdir(), "podcli-editor-context-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = join(tmp, "data");
process.env.PODCLI_OUTPUT = join(tmp, "exports");

const { ClipsHistory } = await import("./clips-history.js");
const { ClipRevisionService, REVISION_NAMESPACE } = await import("./clip-revisions.js");
const { fakeCompose, fakeExactRender, fakeProbe, fakeStreams } = await import("./clip-revisions.test-support.js");
const { ClipEditorContextService, EditorContextError } = await import("./clip-editor-context.js");

type Response = Awaited<ReturnType<InstanceType<typeof ClipEditorContextService>["read"]>>;

const historyDir = join(tmp, "history");
const historyPath = join(historyDir, "clips.json");
const exportsDir = join(tmp, "exports");
const sidecars = join(historyDir, "revisions", "clip-e");
const namespace = join(exportsDir, REVISION_NAMESPACE, "clip-e");
const source = join(tmp, "source.mp4");
const outro = join(tmp, "outro.mp4");
const logo = join(tmp, "logo.png");
const cardImage = join(tmp, "card.png");
const legacyOutput = join(exportsDir, "legacy_short.mp4");
const legacyThumb = join(exportsDir, "thumbnails", "clip-e", "poster.png");

const WORDS = ["red", "green", "blue", "yellow", "cyan", "magenta"].map((word, i) => ({ word, start: i + 0.2, end: i + 0.7, confidence: 1, speaker: `S${i % 2}` }));

const seedClip = {
  id: "clip-e",
  source_video: source,
  start_second: 1,
  end_second: 5,
  caption_style: "karaoke",
  crop_strategy: "center",
  format: "vertical",
  title: "Legacy clip",
  output_path: legacyOutput,
  file_size_mb: 0.01,
  duration: 4,
  created_at: "2026-09-01T00:00:00.000Z",
  transcript_slice: "green blue yellow",
  description: "A saved description",
  hashtags: "#one #two",
  generated_titles: ["One", "Two"],
  // Unknown to this app's writers: it must survive a read untouched.
  py_flag: "from-python",
  extra: { keep: [1, 2, { deep: true }] },
};
const seedOther = { id: "clip-f", title: "other", source_video: source, output_path: join(exportsDir, "other.mp4") };

const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const entries = () => JSON.parse(readFileSync(historyPath, "utf-8")) as any[];
const entry = (id = "clip-e") => entries().find((e) => e.id === id);
const cardOf = (path: string) => ({ image_path: path, image_sha256: sha256(path), placement: "opening" as const, duration: 1.5 as const });
const recipe = (over: Record<string, unknown> = {}) => ({
  source_video: source, title: "Saved clip", keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }],
  caption_style: "karaoke", crop_strategy: "center", format: "vertical" as const, clean_fillers: false, ...over,
});
const expectedOf = (s: { incarnation: string; draft_version: number; revision_version: number }) =>
  ({ incarnation: s.incarnation, draft_version: s.draft_version, revision_version: s.revision_version });

/** Every file beneath `dir` with its SHA-256, so a read can be proved to change nothing. */
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
function expectUnchanged(before: Record<string, string>, dir: string) {
  const after = hashes(dir);
  expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
  for (const [path, hash] of Object.entries(before)) expect(sha256(path), path).toBe(hash);
}

/** The response is a projection: no absolute path of this fixture may appear in it. */
function expectNoPaths(response: Response) {
  const text = JSON.stringify(response);
  for (const root of [tmp, historyDir, exportsDir, namespace, sidecars]) {
    expect(text, `leaked ${root}`).not.toContain(root);
    expect(text).not.toContain(root.replace(/\\/g, "/"));
    expect(text).not.toContain(root.replace(/\\/g, "\\\\"));
  }
  expect(text, "leaked a drive-rooted path").not.toMatch(/[A-Za-z]:[\\/]{1,2}[A-Za-z0-9]/);
}

let history: InstanceType<typeof ClipsHistory>;
let reader: InstanceType<typeof ClipEditorContextService>;

function saveService(over: Record<string, unknown> = {}) {
  return new ClipRevisionService({
    history,
    render: fakeExactRender(),
    probe: fakeProbe,
    compose: fakeCompose(),
    streams: fakeStreams,
    ...over,
  } as any);
}

/** A fresh reader stands in for a restarted process: it shares no cached state. */
const freshReader = () => new ClipEditorContextService();

beforeEach(() => {
  rmSync(historyDir, { recursive: true, force: true });
  rmSync(exportsDir, { recursive: true, force: true });
  mkdirSync(historyDir, { recursive: true });
  mkdirSync(exportsDir, { recursive: true });
  mkdirSync(dirname(legacyThumb), { recursive: true });
  writeFileSync(source, "source-bytes");
  writeFileSync(outro, "outro-bytes");
  writeFileSync(logo, "logo-bytes");
  writeFileSync(cardImage, "card-image-bytes");
  writeFileSync(legacyOutput, "legacy-output-bytes");
  writeFileSync(legacyThumb, "poster-bytes");
  writeFileSync(join(exportsDir, "other.mp4"), "other");
  writeFileSync(historyPath, JSON.stringify([seedClip, seedOther], null, 2));
  history = new ClipsHistory();
  reader = new ClipEditorContextService();
});

async function commit(over: Record<string, unknown> = {}, opId = "op-1", svcOver: Record<string, unknown> = {}) {
  const svc = saveService(svcOver);
  const state = entry().revisions ?? (await svc.ensureTracked("clip-e"));
  const result: any = await svc.saveRevision({
    clip_id: "clip-e",
    operation_id: opId,
    expected: expectedOf(state),
    recipe: recipe(),
    source_words: WORDS,
    ...over,
  } as any);
  expect(result.outcome, result.operation?.error).toBe("committed");
  return result;
}

// ---------------------------------------------------------------------------

describe("committed and draft identities (B2B2-1)", () => {
  it("describes a real saved revision coherently and returns the same view after a restart", async () => {
    const saved = await commit();
    const before = hashes(tmp);
    const response = await reader.read("clip-e");

    expect(response.identity).toMatchObject({
      clip_id: "clip-e",
      tracked: true,
      incarnation: entry().revisions.incarnation,
      revision_version: 1,
      draft_version: 0,
    });
    expect(response.identity.note).toMatch(/concurrent save may have advanced/i);
    expect(response.revision).toMatchObject({ revision_id: saved.revision.revision_id, version: 1, provenance: "exact" });
    expect(response.revision!.document).toMatchObject({ words_input: "supplied", has_final_composition: true });
    expect(response.revision!.document!.recipe).toMatchObject({ caption_style: "karaoke", format: "vertical", title: "Saved clip" });
    expect(response.timing.provenance).toBe("exact-revision");
    expect(response.timing.effective_cuts_known).toBe(true);
    // The renderer's own map, in output order, not the requested [1,5] range.
    expect(response.timing.effective_segments).toEqual([
      { index: 0, source_start: 4, source_end: 5, content_start: 0, content_end: 1, duration: 1 },
      { index: 1, source_start: 1, source_end: 2, content_start: 1, content_end: 2, duration: 1 },
    ]);
    expect(response.timing.time_domains.map((d) => d.scope)).toEqual(["render_timeline", "final_composition"]);
    expect(response.media.output).toMatchObject({ state: "available", size_matches: true, integrity_verified: false });
    expect(response.media.serves).toEqual({ revision_id: saved.revision.revision_id, version: 1, provenance: "exact" });
    expect(response.media.urls.preview).toBe("/api/clips/clip-e/preview");
    expect(response.legacy).toBeNull();
    expect(response.draft).toBeNull();
    expectNoPaths(response);

    const again = await freshReader().read("clip-e");
    expect({ ...again, identity: { ...again.identity, captured_at: "" } })
      .toEqual({ ...response, identity: { ...response.identity, captured_at: "" } });
    expectUnchanged(before, tmp);
  });

  it("keeps raw render and final composition offsets distinct for a card revision", async () => {
    await commit({ thumbnail_card: cardOf(cardImage) });
    const response = await reader.read("clip-e");
    const doc = JSON.parse(readFileSync(entry().revisions.current.path, "utf-8"));

    expect(response.revision!.document!.thumbnail_card).toEqual({
      requested: true,
      applied: true,
      image: { sha256: sha256(cardImage), bytes: readFileSync(cardImage).length, name: "card-image.png" },
      note: doc.thumbnail_card.note,
    });
    expect(response.timing.raw_render).toEqual({
      content_duration: doc.render_timeline.content_duration,
      content_duration_measured: doc.render_timeline.content_duration_measured,
      content_to_output_offset: doc.render_timeline.content_to_output_offset,
      output_duration: doc.render_timeline.output_duration,
    });
    expect(response.timing.final_composition).toEqual({
      card_offset: doc.final_composition.card_offset,
      content_offset: doc.final_composition.content_offset,
      content_duration: doc.final_composition.content_duration,
      output_duration: doc.final_composition.output.duration,
    });
    // The card shifts the content; the raw render never contains it.
    expect(response.timing.final_composition!.card_offset).toBeGreaterThan(0);
    expect(response.timing.final_composition!.content_offset)
      .toBeCloseTo(response.timing.final_composition!.card_offset + response.timing.raw_render!.content_to_output_offset, 9);
    expect(response.revision!.document!.artifacts.card_image).toMatchObject({ present: true, sha256: sha256(cardImage) });
    expect(response.revision!.document!.dependency_group_count).toBe(2);
    expectNoPaths(response);
  });

  it("reads an accepted document saved before final composition and join inputs exactly as saved", async () => {
    const saved = await commit(
      { recipe: recipe({ outro_path: outro, bookend_fade: 0.25 }) },
      "op-older",
      { render: fakeExactRender({ branch: "xfade_acrossfade" }) },
    );
    const path = saved.revision.path;
    const doc = JSON.parse(readFileSync(path, "utf-8"));
    delete doc.final_composition;
    delete doc.bookends.outro.join_inputs;
    delete doc.render_timeline.bookends.outro.join_inputs;
    writeFileSync(path, JSON.stringify(doc, null, 2));
    await history.transaction((list) => { delete list.find((e) => e.id === "clip-e")!.revisions!.current!.groups; });
    const older = readFileSync(path);

    const response = await reader.read("clip-e");
    expect(response.revision!.document!.has_final_composition).toBe(false);
    const savedOutro = JSON.parse(readFileSync(path, "utf-8")).bookends.outro;
    expect(response.revision!.document!.bookends.outro).toMatchObject({
      kind: "outro",
      applied_overlap: savedOutro.applied_overlap,
      output_start: savedOutro.output_start,
      output_end: savedOutro.output_end,
      branch: savedOutro.branch,
      join_inputs: null,
    });
    expect(response.timing.final_composition).toBeNull();
    expect(response.timing.raw_render).not.toBeNull();
    expect(response.timing.effective_cuts_known).toBe(true);
    expect(response.timing.time_domains.map((d) => d.scope)).toEqual(["render_timeline"]);
    expect(response.revision!.document!.dependency_group_count).toBe(1);
    expect(response.diagnostics.map((d) => d.code)).toEqual(
      expect.arrayContaining(["DOCUMENT_PREDATES_FINAL_COMPOSITION", "BOOKEND_JOIN_INPUTS_ABSENT"]),
    );
    // Nothing about the older document is rewritten or upgraded by reading it.
    expect(readFileSync(path)).toEqual(older);
    expect(response.legacy).toBeNull();
  });

  it("never mixes a new revision with the captured one while a save is committing", async () => {
    const first = await commit({}, "op-first");
    const views: Response[] = [];
    // The document of the second revision is already on disk at beforeCommit and
    // the pointer has not moved: a reader must still answer with the first.
    await commit({ recipe: recipe({ title: "Second" }) }, "op-second", {
      hooks: {
        afterRender: async () => { views.push(await freshReader().read("clip-e")); },
        beforeCommit: async () => { views.push(await freshReader().read("clip-e")); },
      },
    });
    for (const view of views) {
      expect(view.identity.revision_version).toBe(1);
      expect(view.revision!.revision_id).toBe(first.revision.revision_id);
      expect(view.revision!.document!.recipe.title).toBe("Saved clip");
      expect(view.media.serves!.version).toBe(1);
    }
    const after = await reader.read("clip-e");
    expect(after.identity.revision_version).toBe(2);
    expect(after.revision!.document!.recipe.title).toBe("Second");
  });

  it("reports a draft beside the committed revision without letting it change the saved view", async () => {
    const saved = await commit();
    const svc = saveService();
    const draft = await svc.saveDraft({
      clip_id: "clip-e",
      expected: expectedOf(entry().revisions),
      draft: { recipe: recipe({ title: "Work in progress", logo_path: logo }), source_words: WORDS, thumbnail_card: cardOf(cardImage), note: "trying a logo" },
    } as any);

    const response = await reader.read("clip-e");
    expect(response.identity).toMatchObject({ revision_version: 1, draft_version: draft.draft.version });
    expect(response.draft).toMatchObject({
      version: draft.draft.version,
      words_input: "supplied",
      source_word_count: WORDS.length,
      note: "trying a logo",
    });
    expect(response.draft!.recipe.title).toBe("Work in progress");
    expect(response.draft!.recipe.logo).toEqual({ selected: true, name: "logo.png", position: null });
    expect(response.draft!.thumbnail_card).toEqual({ selected: true, image_sha256: sha256(cardImage), image_name: "card.png" });
    // The committed revision is untouched by the draft.
    expect(response.revision!.revision_id).toBe(saved.revision.revision_id);
    expect(response.revision!.document!.recipe.title).toBe("Saved clip");
    expect(response.revision!.document!.thumbnail_card.applied).toBe(false);
    expectNoPaths(response);
  });

  it("summarises pending and cancelled operations without serving the archive", async () => {
    await commit({}, "op-committed");
    const gate = { open: () => {}, arrived: Promise.resolve() };
    let release!: () => void;
    let arrived!: () => void;
    const opened = new Promise<void>((r) => (release = r));
    const reached = new Promise<void>((r) => (arrived = r));
    const pendingSave = saveService({
      hooks: { beforeRender: async () => { arrived(); await opened; } },
    }).saveRevision({
      clip_id: "clip-e", operation_id: "op-pending", expected: expectedOf(entry().revisions), recipe: recipe({ title: "Pending" }), source_words: WORDS,
    } as any);
    await reached;

    const during = await reader.read("clip-e");
    expect(during.operations.pending).toMatchObject({ operation_id: "op-pending" });
    expect(during.operations.by_state).toMatchObject({ committed: 1, pending: 1 });
    expect(during.operations.latest).toMatchObject({ operation_id: "op-pending", state: "pending", has_error: false });
    expect(during.operations.latest).not.toHaveProperty("request_hash");
    expect(during.operations).not.toHaveProperty("records");
    expect(during.diagnostics.map((d) => d.code)).toContain("PENDING_OPERATION");
    // A pending save does not change what is served.
    expect(during.identity.revision_version).toBe(1);
    expect(during.revision!.document!.recipe.title).toBe("Saved clip");

    release();
    await pendingSave;
    void gate;

    await saveService().invalidateOperation({
      clip_id: "clip-e", operation_id: "op-pending", expected_incarnation: entry().revisions.incarnation, reason: "operator cancelled",
    } as any);
    const after = await reader.read("clip-e");
    expect(after.operations.pending).toBeNull();
    expect(JSON.stringify(after.operations)).not.toContain("operator cancelled");
  });

  it("advertises no save or adoption support and renders nothing", async () => {
    const render = fakeExactRender();
    await commit({}, "op-1", { render });
    const calls = render.calls;
    const response = await reader.read("clip-e");
    const byId = Object.fromEntries(response.capabilities.map((c) => [c.id, c]));
    expect(byId.save_revision).toMatchObject({ available: false, reason: "WRITE_ROUTE_NOT_AVAILABLE" });
    expect(byId.adopt_for_revision_tracking).toMatchObject({ available: false, reason: "WRITE_ROUTE_NOT_AVAILABLE" });
    expect(byId.play_committed_media.available).toBe(true);
    expect(byId.edit_writing_metadata.available).toBe(true);
    expect(render.calls).toBe(calls);
    // No readiness marker is invented: readiness is a saved-revision concept the
    // write side owns, and this read must not imply one.
    expect(JSON.stringify(response)).not.toMatch(/(render[_-]?ready|readiness|ready_to_(save|publish))/i);
    expect(response.capabilities.map((c) => c.id)).not.toContain("render_ready");
  });
});

// ---------------------------------------------------------------------------

describe("legacy recovery describes, never fabricates (B2B2-2)", () => {
  const legacyRecipe = (over: Record<string, unknown> = {}) => ({
    caption_style: "karaoke", crop_strategy: "center", format: "vertical", clean_fillers: false,
    logo_path: logo, logo_position: "top-left", transcript_words: WORDS.slice(1, 4),
    keep_segments: [{ start: 1, end: 2 }, { start: 4, end: 5 }],
    unknown_future_field: { kept: true },
    ...over,
  });
  const writeSidecar = (dir: string, value: unknown, id = "clip-e") => {
    mkdirSync(join(historyDir, dir), { recursive: true });
    writeFileSync(join(historyDir, dir, `${id}.json`), typeof value === "string" ? value : JSON.stringify(value));
  };

  it("labels stored intervals requested and refuses to call them effective cuts", async () => {
    await history.transaction((list) => { list.find((e) => e.id === "clip-e")!.keep_segments = [{ start: 1, end: 2 }, { start: 4, end: 5 }]; });
    writeSidecar("recipes", legacyRecipe());
    writeSidecar("words", WORDS.slice(1, 4));

    const response = await reader.read("clip-e");
    expect(response.identity.tracked).toBe(false);
    expect(response.revision).toBeNull();
    expect(response.timing.provenance).toBe("legacy-entry");
    expect(response.timing.effective_cuts_known).toBe(false);
    expect(response.timing.effective_segments).toBeNull();
    expect(response.timing.requested_range).toEqual({ start_second: 1, end_second: 5, label: "requested" });
    expect(response.timing.requested_keep_segments).toEqual({
      segments: [{ start: 1, end: 2 }, { start: 4, end: 5 }],
      label: "requested",
      sources: ["history-entry", "legacy-recipe"],
    });
    expect(response.legacy!.reason).toBe("untracked");
    expect(response.legacy!.recovery).toMatchObject({ effective_cuts_known: false, reason: "LEGACY_TIMING_UNPROVEN" });
    expect(response.diagnostics.map((d) => d.code)).toContain("LEGACY_TIMING_UNPROVEN");
    const cuts = response.capabilities.find((c) => c.id === "known_effective_cuts")!;
    expect(cuts).toMatchObject({ available: false, reason: "LEGACY_TIMING_UNPROVEN" });
    expectNoPaths(response);
  });

  it("shows bounded words with their domain and never as full source coverage", async () => {
    writeSidecar("words", WORDS.slice(1, 4));
    const response = await reader.read("clip-e");
    expect(response.transcript).toMatchObject({
      availability: "available",
      provenance: "legacy-words-sidecar",
      domain: "source-absolute",
      word_count: 3,
    });
    expect(response.transcript.words!.map((w) => w.word)).toEqual(["green", "blue", "yellow"]);
    expect(response.transcript.widening_input).toEqual({ available: false, reason: "TRANSCRIPT_BOUNDED_ONLY", word_count: null });
    expect(response.capabilities.find((c) => c.id === "widen_from_source_words"))
      .toMatchObject({ available: false, reason: "TRANSCRIPT_BOUNDED_ONLY" });
    expect(response.diagnostics.map((d) => d.code)).toContain("LEGACY_WORDS_BOUNDED");
    // No range is invented from the first and last stored timestamps.
    expect(JSON.stringify(response.timing)).not.toContain("1.2");
  });

  it.each([
    ["absent", null, "absent", "unavailable", "TRANSCRIPT_UNAVAILABLE"],
    ["supplied empty", [], "empty", "empty", "TRANSCRIPT_EMPTY"],
    ["not a list", { words: [] }, "malformed", "malformed", "TRANSCRIPT_MALFORMED"],
    ["invalid json", "{not json", "malformed", "malformed", "TRANSCRIPT_MALFORMED"],
  ])("distinguishes %s words", async (_label, value, sidecarState, availability, reason) => {
    if (value !== null) writeSidecar("words", value);
    const response = await reader.read("clip-e");
    expect(response.legacy!.sidecars.words.state).toBe(sidecarState);
    expect(response.transcript.availability).toBe(availability);
    expect(response.transcript.widening_input.reason).toBe(reason);
    expect(response.transcript.words).toBeNull();
    // The clip's own text survives whatever the sidecar says.
    expect(response.clip.transcript_slice).toBe("green blue yellow");
    expect(response.capabilities.find((c) => c.id === "edit_writing_metadata")!.available).toBe(true);
  });

  it("distinguishes invalid encoding from invalid json", async () => {
    mkdirSync(join(historyDir, "words"), { recursive: true });
    writeFileSync(join(historyDir, "words", "clip-e.json"), Buffer.from([0x5b, 0xff, 0xfe, 0x5d]));
    const response = await reader.read("clip-e");
    expect(response.legacy!.sidecars.words).toMatchObject({ state: "malformed", detail: "the file is not valid UTF-8" });
    expect(response.transcript.availability).toBe("malformed");
  });

  it("reports an unreadable sidecar as unreadable rather than absent", async () => {
    mkdirSync(join(historyDir, "recipes", "clip-e.json"), { recursive: true });
    const response = await reader.read("clip-e");
    expect(response.legacy!.sidecars.recipe.state).toBe("unreadable");
    expect(response.legacy!.recipe).toBeNull();
    expect(response.diagnostics.map((d) => d.code)).toContain("SIDECAR_UNREADABLE");
  });

  it("reports conflicting sidecars instead of guessing a faithful recipe", async () => {
    writeSidecar("recipes", legacyRecipe({ caption_style: "hormozi", format: "square", keep_segments: [{ start: 0, end: 3 }] }));
    writeSidecar("reframe", { inSec: 2.5, outSec: 5, keyframes: [{ tAbs: 3, x_pct: 40 }] });
    await history.transaction((list) => { list.find((e) => e.id === "clip-e")!.keep_segments = [{ start: 1, end: 2 }]; });

    const response = await reader.read("clip-e");
    const fields = response.legacy!.conflicts.map((c) => c.field).sort();
    expect(fields).toEqual(["caption_style", "format", "requested_keep_segments", "start_second"]);
    for (const conflict of response.legacy!.conflicts) {
      expect(conflict.values.map((v) => v.source)).toContain("history-entry");
      expect(conflict.values).toHaveLength(2);
    }
    // Neither side is promoted into a single answer.
    expect(response.legacy!.recipe!.caption_style).toBe("hormozi");
    expect(response.clip.caption_style).toBe("karaoke");
    expect(response.legacy!.reframe).toEqual({ in_second: 2.5, out_second: 5, keyframe_count: 1 });
    expect(response.diagnostics.filter((d) => d.code === "LEGACY_FIELD_CONFLICT")).toHaveLength(4);
  });

  it("describes a legacy thumbnail as a selected asset with unknown bake provenance", async () => {
    await history.transaction((list) => {
      list.find((e) => e.id === "clip-e")!.thumbnail_config = { preview_path: legacyThumb, card_seconds: 1.5, text: "Two lines" } as any;
    });
    const response = await reader.read("clip-e");
    expect(response.legacy!.thumbnail).toMatchObject({ selected: true, state: "available", card_seconds: 1.5, baked_provenance: "unknown" });
    expect(response.diagnostics.map((d) => d.code)).toContain("THUMBNAIL_BAKE_UNKNOWN");
    expectNoPaths(response);
  });

  it("never falls back to an unrelated transcript cache and imports no cache module", async () => {
    const cacheDir = join(tmp, "data", "cache", "transcripts");
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, "whatever.json"), JSON.stringify({ words: WORDS, duration: 6, segments: [] }));
    const response = await reader.read("clip-e");
    expect(response.transcript.availability).toBe("unavailable");
    expect(response.transcript.words).toBeNull();

    const code = readFileSync(join(process.cwd(), "src/services/clip-editor-context.ts"), "utf-8");
    expect(code).not.toMatch(/from "\.\/transcript-cache\.js"/);
    // The read path must not reach the save service at runtime either.
    expect(code).not.toMatch(/from "\.\/clip-revisions\.js"/);
  });

  it("keeps text and metadata usable when the media and source are gone", async () => {
    rmSync(legacyOutput);
    rmSync(source);
    const response = await reader.read("clip-e");
    expect(response.media.output).toMatchObject({ state: "missing", name: "legacy_short.mp4", bytes: null });
    expect(response.media.source.state).toBe("missing");
    expect(response.clip).toMatchObject({ title: "Legacy clip", transcript_slice: "green blue yellow" });
    expect(response.clip.publishing).toMatchObject({ description: "A saved description", hashtags: "#one #two", generated_titles: ["One", "Two"] });
    const byId = Object.fromEntries(response.capabilities.map((c) => [c.id, c]));
    expect(byId.play_committed_media).toMatchObject({ available: false, reason: "MEDIA_MISSING" });
    expect(byId.reopen_source_media).toMatchObject({ available: false, reason: "SOURCE_MISSING" });
    expect(byId.edit_writing_metadata.available).toBe(true);
    expect(response.diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(["MEDIA_MISSING", "SOURCE_MISSING"]));
  });

  it("treats the legacy version zero of a tracked clip as recoverable legacy data", async () => {
    await saveService().ensureTracked("clip-e");
    const response = await reader.read("clip-e");
    expect(response.identity.tracked).toBe(true);
    expect(response.revision).toMatchObject({ version: 0, provenance: "legacy-unversioned", document: null });
    expect(response.legacy!.reason).toBe("legacy-unversioned-revision");
    expect(response.timing.effective_cuts_known).toBe(false);
    expect(response.media.serves).toMatchObject({ version: 0, provenance: "legacy-unversioned" });
  });
});

// ---------------------------------------------------------------------------

describe("invalid state fails safely (B2B2-3)", () => {
  it.each([
    ["invalid json", "{not json", "HISTORY_INVALID_JSON"],
    ["invalid shape", JSON.stringify({ clips: [] }), "HISTORY_INVALID_SHAPE"],
    ["entry without an id", JSON.stringify([{ title: "x" }]), "HISTORY_INVALID_SHAPE"],
  ])("refuses a %s history instead of answering empty", async (_label, contents, code) => {
    writeFileSync(historyPath, contents);
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code, status: 500 });
  });

  it("refuses a history file that is not valid UTF-8", async () => {
    writeFileSync(historyPath, Buffer.from([0x5b, 0xff, 0xfe, 0x5d]));
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "HISTORY_INVALID_ENCODING", status: 500 });
  });

  it.each([
    ["a traversal attempt", "../clip-e"],
    ["a dot segment", "clip..e"],
    ["an empty id", ""],
    ["a separator", "clip-e/words"],
    ["a backslash", "clip-e\\words"],
    ["a leading dot", ".hidden"],
  ])("rejects %s before building any path", async (_label, id) => {
    await expect(reader.read(id)).rejects.toMatchObject({ code: "INVALID_CLIP_ID", status: 400 });
  });

  it("answers 404 for a genuinely absent id and for a missing history file", async () => {
    await expect(reader.read("clip-missing")).rejects.toMatchObject({ code: "CLIP_NOT_FOUND", status: 404 });
    rmSync(historyPath);
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "CLIP_NOT_FOUND", status: 404 });
  });

  it.each([
    ["another clip", (doc: any) => { doc.clip_id = "clip-f"; }],
    ["another revision", (doc: any) => { doc.revision_id = "somebody-else"; }],
    ["another version", (doc: any) => { doc.version = 7; }],
    ["an earlier incarnation", (doc: any) => { doc.incarnation = "00000000-0000-4000-8000-000000000000"; }],
    ["an unsupported schema", (doc: any) => { doc.schema = 2; }],
    ["no render timeline", (doc: any) => { delete doc.render_timeline; }],
    ["no served file record", (doc: any) => { delete doc.files.main; }],
    ["no words availability", (doc: any) => { delete doc.words_input; }],
    ["a recipe without segments", (doc: any) => { doc.recipe.keep_segments = []; }],
  ])("refuses a revision document that describes %s", async (_label, mutate) => {
    await commit();
    const path = entry().revisions.current.path;
    const doc = JSON.parse(readFileSync(path, "utf-8"));
    mutate(doc);
    writeFileSync(path, JSON.stringify(doc, null, 2));
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "REVISION_DOCUMENT_INVALID", status: 500 });
  });

  it("refuses a revision document that is missing or malformed, and never answers from legacy data", async () => {
    await commit();
    // A full set of legacy recovery inputs is available; none of it may be used.
    mkdirSync(join(historyDir, "words"), { recursive: true });
    writeFileSync(join(historyDir, "words", "clip-e.json"), JSON.stringify(WORDS));
    const path = entry().revisions.current.path;

    writeFileSync(path, "{not json");
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "REVISION_DOCUMENT_INVALID" });

    writeFileSync(path, Buffer.from([0x7b, 0xff, 0xfe, 0x7d]));
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "REVISION_DOCUMENT_INVALID" });

    rmSync(path);
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "REVISION_DOCUMENT_UNAVAILABLE" });
  });

  it.each([
    ["not an object", (s: any, e: any) => { e.revisions = "corrupt"; }],
    ["an unsupported schema", (s: any) => { s.schema = 9; }],
    ["no incarnation", (s: any) => { delete s.incarnation; }],
    ["fractional versions", (s: any) => { s.revision_version = 1.5; }],
    ["a malformed current pointer", (s: any) => { s.current = { revision_id: "x" }; }],
    ["a malformed draft pointer", (s: any) => { s.draft = { version: 1 }; }],
    ["malformed operations", (s: any) => { s.operations = [{ state: "weird" }]; }],
  ])("refuses revision state that is %s", async (_label, mutate) => {
    await commit();
    await history.transaction((list) => {
      const e = list.find((x) => x.id === "clip-e")!;
      mutate(e.revisions as any, e);
    });
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "REVISION_STATE_INVALID", status: 500 });
  });

  it("refuses a revision document pointer that escapes the clip's own storage", async () => {
    await commit();
    const outside = join(tmp, "outside-doc.json");
    writeFileSync(outside, readFileSync(entry().revisions.current.path));
    await history.transaction((list) => { list.find((e) => e.id === "clip-e")!.revisions!.current!.path = outside; });
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE", status: 500 });

    // Another clip's sidecar directory is outside this clip's storage too.
    await history.transaction((list) => {
      list.find((e) => e.id === "clip-e")!.revisions!.current!.path = join(historyDir, "revisions", "clip-f", "doc.json");
    });
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE" });
  });

  it("refuses to read a revision document through a junction", async () => {
    await commit();
    const path = entry().revisions.current.path;
    const moved = join(tmp, "moved-sidecars");
    renameSync(sidecars, moved);
    symlinkSync(moved, sidecars, "junction");
    expect(lstatSync(sidecars).isSymbolicLink()).toBe(true);
    try {
      expect(existsSync(path)).toBe(true);
      await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE" });
    } finally {
      try { rmdirSync(sidecars); } catch { unlinkSync(sidecars); }
      renameSync(moved, sidecars);
    }
  });

  // lead-17 / R1: an owned-path link is an ownership escape wherever it sits,
  // including a legacy sidecar. Repair-1 downgraded this one to "unreadable",
  // which reads exactly like a permission error on an ordinary file and hides
  // the only sidecar state that is about the boundary rather than the file.
  it("refuses a legacy sidecar directory that is a junction, with the ownership code", async () => {
    const wordsDir = join(historyDir, "words");
    const moved = join(tmp, "moved-words");
    mkdirSync(moved, { recursive: true });
    writeFileSync(join(moved, "clip-e.json"), JSON.stringify(WORDS));
    const targetBefore = sha256(join(moved, "clip-e.json"));
    symlinkSync(moved, wordsDir, "junction");
    try {
      await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE" });
      // The junction target is never written to, and never read through.
      expect(sha256(join(moved, "clip-e.json"))).toBe(targetBefore);
    } finally {
      try { rmdirSync(wordsDir); } catch { unlinkSync(wordsDir); }
    }
    // The same clip reads normally once the junction is gone: the refusal is
    // about the link, not about this clip.
    expect((await reader.read("clip-e")).clip.title).toBe("Legacy clip");
  });

  it("refuses a draft document that is missing, malformed or from another incarnation", async () => {
    const svc = saveService();
    const state = await svc.ensureTracked("clip-e");
    await svc.saveDraft({ clip_id: "clip-e", expected: expectedOf(state), draft: { recipe: recipe(), source_words: WORDS } } as any);
    const path = entry().revisions.draft.path;

    writeFileSync(path, "{not json");
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "DRAFT_DOCUMENT_INVALID" });

    const doc = JSON.parse(readFileSync(join(sidecars, basename(path)), "utf-8").replace("{not json", "{}") || "{}");
    void doc;
    writeFileSync(path, JSON.stringify({ schema: 1, clip_id: "clip-e", incarnation: "someone-else", version: 1, saved_at: "now", draft: { recipe: recipe(), source_words: null } }));
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "DRAFT_DOCUMENT_INVALID" });

    rmSync(path);
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "DRAFT_DOCUMENT_UNAVAILABLE" });
  });

  it("reports a deleted revision output without inventing another file", async () => {
    await commit();
    const served = entry().revisions.current.output_path;
    rmSync(served);
    const response = await reader.read("clip-e");
    expect(response.media.output).toMatchObject({ state: "missing", bytes: null, size_matches: null });
    expect(response.revision!.document!.recorded_probe.bytes).toBeGreaterThan(0);
    expect(response.capabilities.find((c) => c.id === "play_committed_media")!.available).toBe(false);
    expect(response.timing.effective_cuts_known).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("reads change nothing (B2B2-4)", () => {
  it("leaves every stored byte, the untracked state and unknown fields untouched", async () => {
    mkdirSync(join(historyDir, "recipes"), { recursive: true });
    writeFileSync(join(historyDir, "recipes", "clip-e.json"), JSON.stringify({ caption_style: "karaoke", unknown_future_field: { kept: true } }));
    const before = hashes(tmp);
    const beforeEntry = entry();

    await reader.read("clip-e");
    await freshReader().read("clip-e");

    expectUnchanged(before, tmp);
    expect(entry()).toEqual(beforeEntry);
    expect(entry()).not.toHaveProperty("revisions");
    expect(entry().py_flag).toBe("from-python");
    expect(entry().extra).toEqual({ keep: [1, 2, { deep: true }] });
    expect(JSON.parse(readFileSync(join(historyDir, "recipes", "clip-e.json"), "utf-8")).unknown_future_field).toEqual({ kept: true });
    expect(existsSync(join(historyDir, "revisions"))).toBe(false);
    expect(existsSync(namespace)).toBe(false);
  });

  it("writes nothing when the read fails", async () => {
    await commit();
    const path = entry().revisions.current.path;
    writeFileSync(path, "{not json");
    const before = hashes(tmp);
    await expect(reader.read("clip-e")).rejects.toBeInstanceOf(EditorContextError);
    await expect(reader.read("clip-nope")).rejects.toBeInstanceOf(EditorContextError);
    expectUnchanged(before, tmp);
  });

  it("does not create a revisions field for a clip it reports as untracked", async () => {
    const response = await reader.read("clip-e");
    expect(response.identity).toMatchObject({ tracked: false, incarnation: null, revision_version: null, draft_version: null });
    expect(response.operations).toMatchObject({ total: 0, pending: null, latest: null });
    expect(entry()).not.toHaveProperty("revisions");
    expect(entry("clip-f")).not.toHaveProperty("revisions");
  });
});

// ---------------------------------------------------------------------------
// 1B.2b.2 repair-1: the three reader occurrences the independent review found.
// Each block covers the whole boundary the finding exposed, not just its
// reproduced example.

describe("ownership is checked from the configured root down (R1 / WS-12, B2B2-3)", () => {
  /** Replace `target` with a junction to a copy outside the owned tree. */
  function divert(target: string, label: string) {
    const moved = join(tmp, `diverted-${label}`);
    renameSync(target, moved);
    symlinkSync(moved, target, "junction");
    expect(lstatSync(target).isSymbolicLink()).toBe(true);
    return {
      moved,
      restore: () => {
        try { rmdirSync(target); } catch { unlinkSync(target); }
        renameSync(moved, target);
      },
    };
  }

  it("refuses a junction at the revisions ancestor, not only at the clip's own directory", async () => {
    await commit();
    const path = entry().revisions.current.path;
    const link = divert(join(historyDir, "revisions"), "revisions");
    try {
      // The document is perfectly readable through the junction; being
      // reachable is exactly what must not make it owned.
      expect(existsSync(path)).toBe(true);
      await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE", status: 500 });
    } finally {
      link.restore();
    }
    // Refused, then readable again once the junction is gone: the reader never
    // adopted the junction's target as a new trusted root.
    expect((await reader.read("clip-e")).timing.effective_cuts_known).toBe(true);
  });

  it("refuses a junction at the configured history root itself", async () => {
    await commit();
    const link = divert(historyDir, "history-root");
    try {
      await expect(new ClipEditorContextService({ historyRoot: historyDir, historyPath }).read("clip-e"))
        .rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE" });
    } finally {
      link.restore();
    }
  });

  it("refuses a junction at a legacy sidecar ancestor with the ownership code", async () => {
    mkdirSync(join(historyDir, "recipes"), { recursive: true });
    writeFileSync(join(historyDir, "recipes", "clip-e.json"), JSON.stringify({ caption_style: "karaoke" }));
    mkdirSync(join(historyDir, "reframe"), { recursive: true });
    writeFileSync(join(historyDir, "reframe", "clip-e.json"), JSON.stringify({ inSec: 1, outSec: 5 }));
    const link = divert(join(historyDir, "recipes"), "recipes");
    try {
      await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE" });
    } finally {
      link.restore();
    }
    // With the junction gone the same recovery inputs read normally, so the
    // refusal above was the boundary and not the sidecars' contents.
    const response = await reader.read("clip-e");
    expect(response.legacy!.sidecars.recipe).toMatchObject({ state: "present" });
    expect(response.legacy!.reframe).toMatchObject({ in_second: 1, out_second: 5 });
    expect(response.clip.title).toBe("Legacy clip");
  });

  // lead-17 / R1: an ordinary sidecar that simply cannot be read stays a
  // distinguishable degraded recovery input, not an ownership escape.
  it("keeps a genuinely unreadable regular sidecar as a degraded recovery input", async () => {
    const wordsDir = join(historyDir, "words");
    mkdirSync(join(wordsDir, "clip-e.json"), { recursive: true });
    const response = await reader.read("clip-e");
    expect(response.legacy!.sidecars.words).toMatchObject({ state: "unreadable" });
    expect(response.transcript.availability).toBe("unreadable");
    expect(response.clip.title).toBe("Legacy clip");
    expect(response.diagnostics.map((d) => d.code)).toContain("SIDECAR_UNREADABLE");
  });

  it("refuses a draft document reached through a junction at an ancestor", async () => {
    const svc = saveService();
    const state = await svc.ensureTracked("clip-e");
    await svc.saveDraft({ clip_id: "clip-e", expected: expectedOf(state), draft: { recipe: recipe(), source_words: WORDS } } as any);
    const link = divert(join(historyDir, "revisions"), "revisions-draft");
    try {
      await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE" });
    } finally {
      link.restore();
    }
  });

  it("leaves a diverted junction target untouched", async () => {
    await commit();
    const link = divert(join(historyDir, "revisions"), "untouched");
    const before = hashes(link.moved);
    try {
      await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE" });
      expectUnchanged(before, link.moved);
    } finally {
      link.restore();
    }
  });
});

describe("consumed tracked fields are validated before they become claims (R2 / WS-16, B2B2-1/3)", () => {
  /** One real commit per test, then each mutation is applied to a fresh copy of
   * the pristine document so the cases stay independent. */
  let pristine: { path: string; text: string } | null = null;
  beforeEach(() => { pristine = null; });
  async function withDocument(mutate: (doc: any) => void) {
    if (!pristine) {
      await commit();
      const path = entry().revisions.current.path;
      pristine = { path, text: readFileSync(path, "utf-8") };
    }
    const doc = JSON.parse(pristine.text);
    mutate(doc);
    writeFileSync(pristine.path, JSON.stringify(doc));
    return reader.read("clip-e");
  }
  const rejects = (mutate: (doc: any) => void, code = "REVISION_DOCUMENT_INVALID") =>
    expect(withDocument(mutate)).rejects.toMatchObject({ code, status: 500 });

  it("refuses an exact pointer with no document instead of answering from legacy data", async () => {
    await commit();
    mkdirSync(join(historyDir, "words"), { recursive: true });
    writeFileSync(join(historyDir, "words", "clip-e.json"), JSON.stringify(WORDS));
    await history.transaction((list) => { list.find((e) => e.id === "clip-e")!.revisions!.current!.path = null; });
    // The old behaviour silently reported this clip as a legacy version zero.
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "REVISION_STATE_INVALID", status: 500 });
  });

  it("refuses a pointer whose provenance, version and identity disagree", async () => {
    await commit();
    const saved = JSON.parse(JSON.stringify(entry().revisions));
    const restore = async () => { await history.transaction((list) => { (list.find((e) => e.id === "clip-e") as any)!.revisions = JSON.parse(JSON.stringify(saved)); }); };
    const mutateState = async (mutate: (s: any) => void) => {
      await history.transaction((list) => mutate((list.find((e) => e.id === "clip-e") as any)!.revisions));
      await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "REVISION_STATE_INVALID" });
      await restore();
    };
    await mutateState((s) => { s.current.provenance = "legacy-unversioned"; });
    await mutateState((s) => { s.current.version = 0; });
    await mutateState((s) => { s.revision_version = 9; });
    await mutateState((s) => { s.current.group_root = null; });
    await mutateState((s) => { s.current.operation_id = null; });

    // And the shape it must accept: a legacy version zero with no document.
    await history.transaction((list) => {
      const e = list.find((x) => x.id === "clip-e") as any;
      e.revisions = {
        ...saved,
        revision_version: 0,
        current: { revision_id: "v0-legacy", version: 0, path: null, output_path: legacyOutput, group_root: null, operation_id: null, provenance: "legacy-unversioned", committed_at: "2026-09-01T00:00:00.000Z" },
      };
    });
    const response = await reader.read("clip-e");
    expect(response.revision).toMatchObject({ version: 0, provenance: "legacy-unversioned", document: null });
    expect(response.legacy!.reason).toBe("legacy-unversioned-revision");
    expect(response.timing.effective_cuts_known).toBe(false);
  });

  it("refuses a malformed segment instead of serving it as an effective cut", async () => {
    await rejects((doc) => { doc.render_timeline.segments = [{ index: 0, source_start: { private: "object" }, source_end: -5 }]; });
    await rejects((doc) => { doc.render_timeline.segments[1].content_start += 5; });
    await rejects((doc) => { doc.render_timeline.segments[0].duration += 3; });
    await rejects((doc) => { doc.render_timeline.segments[0].source_end = doc.render_timeline.segments[0].source_start; });
  });

  it("keeps a legitimate out-of-source-order segment list exactly as saved", async () => {
    await commit();
    const response = await reader.read("clip-e");
    // Requested as [4,5] then [1,2]: preserved, not sorted into source order.
    expect(response.timing.effective_segments!.map((s) => s.source_start)).toEqual([4, 1]);
  });

  it("refuses unusable retained source words rather than advertising widening", async () => {
    await rejects((doc) => { doc.source_words = [null]; });
    await rejects((doc) => { doc.source_words = [WORDS[0], { word: "bad", start: 9, end: 1 }]; });
    await rejects((doc) => { doc.source_words = [{ word: 42, start: 1, end: 2 }]; });
    await rejects((doc) => { doc.render_timeline.words.content = [{ word: "x", start: "soon", end: 2 }]; });
  });

  it("keeps an unavailable transcript distinct from an empty one", async () => {
    await commit({ source_words: null }, "op-no-words");
    const response = await reader.read("clip-e");
    expect(response.transcript).toMatchObject({ availability: "unavailable", provenance: "none" });
    expect(response.transcript.widening_input).toMatchObject({ available: false, reason: "TRANSCRIPT_UNAVAILABLE" });
    expect(response.capabilities.find((c) => c.id === "widen_from_source_words")!.available).toBe(false);
  });

  it("refuses an arbitrary nested object hidden in a time-domain map", async () => {
    await rejects((doc) => { doc.render_timeline.time_domains.extra = { unrelated: "stored object" }; });
    await rejects((doc) => { doc.final_composition.time_domains.extra = { unrelated: "stored object" }; });
  });

  it("refuses an applied card with no image instead of throwing", async () => {
    await commit({ thumbnail_card: cardOf(cardImage) }, "op-card");
    const path = entry().revisions.current.path;
    const doc = JSON.parse(readFileSync(path, "utf-8"));
    delete doc.thumbnail_card.image;
    writeFileSync(path, JSON.stringify(doc));
    const error = await reader.read("clip-e").catch((e) => e);
    expect(error).toBeInstanceOf(EditorContextError);
    expect(error).toMatchObject({ code: "REVISION_DOCUMENT_INVALID", status: 500 });
    expect(error.name).not.toBe("TypeError");
  });

  it("refuses a final composition that disagrees with the raw render it offsets", async () => {
    await rejects((doc) => { doc.final_composition.card_offset += 1; });
    await rejects((doc) => { doc.final_composition.content_offset += 1; });
    await rejects((doc) => { doc.final_composition.content_duration += 1; });
    await rejects((doc) => { doc.final_composition.version = 2; });
  });

  it("refuses other malformed consumed records: probe, bookend, keyframes, files and frame precision", async () => {
    await rejects((doc) => { doc.probe.duration = "about three"; });
    await rejects((doc) => { doc.probe.has_audio = "yes"; });
    await rejects((doc) => { doc.bookends.intro = { kind: "intro", output_start: "zero", output_end: 1, asset_duration: 1, requested_fade: null, applied_overlap: 0, branch: "hardcut", transition: { output_start: 0, output_end: 0 }, measured_output_duration: null }; });
    await rejects((doc) => { doc.recipe.crop_keyframes = [{ t: 0, x_pct: 50 }, { t: "later", x_pct: 50 }]; });
    await rejects((doc) => { doc.recipe.caption_position = 7; });
    await rejects((doc) => { doc.files.caption_overlay = { path: "", bytes: -1, sha256: "" }; });
    await rejects((doc) => { doc.render_timeline.frame_precision.note = { text: "nested" }; });
    await rejects((doc) => { doc.words_input = "unavailable"; });
    await rejects((doc) => { doc.operation_id = "another-operation"; });
  });

  it("refuses a draft whose nested inputs are unusable", async () => {
    const svc = saveService();
    const state = await svc.ensureTracked("clip-e");
    await svc.saveDraft({ clip_id: "clip-e", expected: expectedOf(state), draft: { recipe: recipe(), source_words: WORDS } } as any);
    const path = entry().revisions.draft.path;
    const doc = JSON.parse(readFileSync(path, "utf-8"));
    writeFileSync(path, JSON.stringify({ ...doc, draft: { ...doc.draft, source_words: [null] } }));
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "DRAFT_DOCUMENT_INVALID" });
    writeFileSync(path, JSON.stringify({ ...doc, draft: { ...doc.draft, thumbnail_card: { image_path: "", image_sha256: "" } } }));
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "DRAFT_DOCUMENT_INVALID" });
  });

  // lead-17: the older-document control is a real saved revision with its
  // later-added structures removed, not a hand-grafted bookend. Repair-1's
  // fixture pasted an intro onto a render made without one, so its
  // content_to_output_offset was zero while the invented intro claimed to end
  // at one second — a state no renderer or save produces.
  it("still reads an accepted older document that has no final composition or join inputs", async () => {
    await commit({ recipe: recipe({ intro_path: outro, outro_path: outro }) });
    const path = entry().revisions.current.path;
    const doc = JSON.parse(readFileSync(path, "utf-8"));
    expect(doc.bookends.intro.join_inputs).toBeTruthy();
    delete doc.final_composition;
    // An older save wrote the receipt's own region object as the document's
    // copy, so both copies of each join lacked the inputs together.
    for (const kind of ["intro", "outro"] as const) {
      delete doc.bookends[kind].join_inputs;
      delete doc.render_timeline.bookends[kind].join_inputs;
    }
    // The served file is the raw render once the card record is gone, which is
    // exactly what a pre-1B.2b.1 document recorded.
    writeFileSync(path, JSON.stringify(doc));

    const response = await reader.read("clip-e");
    expect(response.revision!.document!.has_final_composition).toBe(false);
    expect(response.timing.final_composition).toBeNull();
    expect(response.timing.effective_cuts_known).toBe(true);
    expect(response.revision!.document!.bookends.intro!.join_inputs).toBeNull();
    const codes = response.diagnostics.map((d) => d.code);
    expect(codes).toContain("DOCUMENT_PREDATES_FINAL_COMPOSITION");
    expect(codes).toContain("BOOKEND_JOIN_INPUTS_ABSENT");
    // Read exactly as saved: no field is added back to the stored document.
    expect(JSON.parse(readFileSync(path, "utf-8"))).not.toHaveProperty("final_composition");
  });
});

describe("invalid legacy word lists are malformed, not usable (R3 / WS-17, B2B2-2)", () => {
  const withWords = async (json: string) => {
    mkdirSync(join(historyDir, "words"), { recursive: true });
    const path = join(historyDir, "words", "clip-e.json");
    writeFileSync(path, json);
    const before = sha256(path);
    const response = await reader.read("clip-e");
    // A bad recovery input is never repaired, rewritten or removed.
    expect(sha256(path)).toBe(before);
    return response;
  };

  it.each([
    ["an invalid element", JSON.stringify([null, { word: "bad", start: 9, end: 1 }])],
    ["a mixed valid and invalid list", JSON.stringify([WORDS[0], { word: "bad", start: 3 }])],
    ["backwards timing", JSON.stringify([{ word: "bad", start: 9, end: 1 }])],
    ["non-finite timing", JSON.stringify([{ word: "bad", start: 1, end: null }])],
    ["a wrong-typed word", JSON.stringify([{ word: 42, start: 1, end: 2 }])],
  ])("reports %s as malformed while keeping the clip's own text", async (_label, json) => {
    const response = await withWords(json);
    expect(response.legacy!.sidecars.words.state).toBe("malformed");
    expect(response.transcript).toMatchObject({ availability: "malformed", words: null, word_count: null });
    expect(response.transcript.widening_input).toMatchObject({ available: false, reason: "TRANSCRIPT_MALFORMED" });
    expect(response.diagnostics.map((d) => d.code)).toContain("SIDECAR_MALFORMED");
    // Independently usable recovery inputs survive.
    expect(response.transcript.text).toBe("green blue yellow");
    expect(response.clip.title).toBe("Legacy clip");
    expect(response.clip.publishing.description).toBe("A saved description");
    expect(response.capabilities.find((c) => c.id === "edit_writing_metadata")!.available).toBe(true);
    expect(response.timing.effective_cuts_known).toBe(false);
  });

  it("keeps a valid explicit empty list supplied-empty", async () => {
    const response = await withWords("[]");
    expect(response.legacy!.sidecars.words).toMatchObject({ state: "empty" });
    expect(response.transcript).toMatchObject({ availability: "empty" });
    expect(response.transcript.widening_input.reason).toBe("TRANSCRIPT_EMPTY");
    expect(response.diagnostics.map((d) => d.code)).toContain("SIDECAR_EMPTY");
  });

  it("serves a wholly valid list with its overlap and order intact, and claims no widening", async () => {
    const response = await withWords(JSON.stringify([{ word: "one", start: 1, end: 1.5 }, { word: "two", start: 1.4, end: 2 }]));
    expect(response.legacy!.sidecars.words).toMatchObject({ state: "present" });
    expect(response.transcript.words!.map((w) => [w.start, w.end])).toEqual([[1, 1.5], [1.4, 2]]);
    expect(response.transcript.word_count).toBe(2);
    expect(response.transcript.widening_input).toMatchObject({ available: false, reason: "TRANSCRIPT_BOUNDED_ONLY" });
    expect(response.diagnostics.map((d) => d.code)).toContain("LEGACY_WORDS_BOUNDED");
  });

  it("reports an unusable recipe or reframe value instead of coercing it away", async () => {
    mkdirSync(join(historyDir, "recipes"), { recursive: true });
    writeFileSync(join(historyDir, "recipes", "clip-e.json"), JSON.stringify({ caption_style: 7, keep_segments: [{ start: 1, end: 2 }] }));
    mkdirSync(join(historyDir, "reframe"), { recursive: true });
    writeFileSync(join(historyDir, "reframe", "clip-e.json"), JSON.stringify({ inSec: "one", outSec: 5 }));
    let response = await reader.read("clip-e");
    expect(response.legacy!.sidecars.recipe).toMatchObject({ state: "malformed" });
    expect(response.legacy!.sidecars.reframe).toMatchObject({ state: "malformed" });
    expect(response.legacy!.recipe).toBeNull();
    expect(response.legacy!.reframe).toBeNull();
    expect(response.clip.title).toBe("Legacy clip");

    writeFileSync(join(historyDir, "recipes", "clip-e.json"), JSON.stringify({ caption_style: "karaoke", keep_segments: [{ start: 1, end: 2 }, { start: "later", end: 4 }] }));
    response = await reader.read("clip-e");
    expect(response.legacy!.sidecars.recipe).toMatchObject({ state: "malformed" });
    expect(response.legacy!.sidecars.recipe.detail).toMatch(/keep_segments\[1\]/);
  });

  it("reports an unusable value on the clip entry rather than mapping or filtering it", async () => {
    await history.transaction((list) => {
      const e = list.find((x) => x.id === "clip-e") as any;
      e.keep_segments = [{ start: 1, end: 2 }, { start: "later", end: 4 }];
      e.generated_titles = ["One", 2];
    });
    const response = await reader.read("clip-e");
    expect(response.timing.requested_keep_segments).toBeNull();
    expect(response.clip.publishing.generated_titles).toBeNull();
    const scopes = response.diagnostics.filter((d) => d.code === "LEGACY_ENTRY_MALFORMED").map((d) => d.scope);
    expect(scopes).toContain("timing.requested_keep_segments");
    expect(scopes).toContain("clip.publishing.generated_titles");
    expect(response.clip.title).toBe("Legacy clip");
  });
});

// ---------------------------------------------------------------------------
// Writing Studio 1B.2b.2 repair-2 (lead-17)
// ---------------------------------------------------------------------------

describe("the history boundary is proved before clips.json is opened (R1 / WS-12, B2B2-3)", () => {
  /** A clip list outside the configured tree, with text that must never be
   * serialised out of it. Nothing here is ever written through a link. */
  function outsideHistory(label: string) {
    const dir = join(tmp, `outside-${label}`);
    mkdirSync(join(dir, "words"), { recursive: true });
    writeFileSync(join(dir, "clips.json"), JSON.stringify([{ id: "clip-e", title: "outside owned root", transcript_slice: "outside text" }]));
    writeFileSync(join(dir, "words", "clip-e.json"), JSON.stringify(WORDS));
    return dir;
  }
  const reads = (root: string) => new ClipEditorContextService({ historyRoot: root, historyPath: join(root, "clips.json") }).read("clip-e");

  it("refuses a linked configured root before any of its text can be read", async () => {
    const outside = outsideHistory("root");
    const linked = join(tmp, "linked-root");
    symlinkSync(outside, linked, "junction");
    let error: any;
    await reads(linked).catch((e) => { error = e; });
    expect(error).toMatchObject({ code: "OWNERSHIP_ESCAPE", status: 500 });
    // The point of the finding: not just a code, but that the clip's title and
    // transcript never leave the directory the read refused to enter.
    expect(JSON.stringify(error)).not.toContain("outside owned root");
    expect(error.message).not.toContain("outside text");
  });

  it("refuses a linked history file inside a real configured root", async () => {
    const outside = outsideHistory("file");
    const root = join(tmp, "real-root-linked-file");
    mkdirSync(root, { recursive: true });
    symlinkSync(join(outside, "clips.json"), join(root, "clips.json"), "file");
    await expect(reads(root)).rejects.toMatchObject({ code: "OWNERSHIP_ESCAPE", status: 500 });
  });

  it("reads the very same clip list normally from a real configured root", async () => {
    // The control for both refusals above: identical bytes, no link.
    const outside = outsideHistory("control");
    const response = await reads(outside);
    expect(response.clip.title).toBe("outside owned root");
    expect(response.transcript.availability).toBe("available");
  });

  it("keeps a missing history a 404 and a wrong-kind history unreadable", async () => {
    const empty = join(tmp, "no-history-at-all");
    await expect(reads(empty)).rejects.toMatchObject({ code: "CLIP_NOT_FOUND", status: 404 });
    const wrongKind = join(tmp, "history-is-a-directory");
    mkdirSync(join(wrongKind, "clips.json"), { recursive: true });
    await expect(reads(wrongKind)).rejects.toMatchObject({ code: "HISTORY_UNREADABLE", status: 500 });
  });
});

describe("consumed ranges and relationships (R2a / WS-16, B2B2-1/3)", () => {
  let pristine: { path: string; text: string } | null = null;
  beforeEach(() => { pristine = null; });
  /** One real card commit, then each case mutates a fresh copy of it. */
  async function withDocument(mutate: (doc: any) => void) {
    if (!pristine) {
      await commit({ thumbnail_card: cardOf(cardImage), recipe: recipe({ intro_path: outro, outro_path: outro }) });
      const path = entry().revisions.current.path;
      pristine = { path, text: readFileSync(path, "utf-8") };
    }
    const doc = JSON.parse(pristine.text);
    mutate(doc);
    writeFileSync(pristine.path, JSON.stringify(doc));
    return reader.read("clip-e");
  }
  const rejects = (mutate: (doc: any) => void) =>
    expect(withDocument(mutate)).rejects.toMatchObject({ code: "REVISION_DOCUMENT_INVALID", status: 500 });

  it("reads the unmutated real card revision as the control", async () => {
    const response = await withDocument(() => {});
    expect(response.timing.effective_cuts_known).toBe(true);
    expect(response.timing.raw_render!.output_duration).toBeGreaterThan(0);
    expect(response.timing.final_composition!.card_offset).toBeGreaterThan(0);
    expect(response.revision!.document!.bookends.intro).toBeTruthy();
    expect(response.revision!.document!.bookends.outro).toBeTruthy();
  });

  it("refuses finite but impossible durations in the raw render", async () => {
    await rejects((d) => { d.render_timeline.output_duration = -12; });
    await rejects((d) => { d.render_timeline.content_duration_measured = -4; });
    await rejects((d) => { d.render_timeline.content_duration = -1; });
    await rejects((d) => { d.render_timeline.output_duration = 0; });
  });

  it("refuses a measured content length outside the renderer's own tolerance", async () => {
    await rejects((d) => { d.render_timeline.content_duration_measured = d.render_timeline.content_duration + 9; });
    await rejects((d) => { d.render_timeline.tolerance.content_seconds = -1; });
  });

  it("refuses a rendered length that does not add up from its offset, content and outro", async () => {
    await rejects((d) => { d.render_timeline.output_duration = d.render_timeline.output_duration + 5; });
    await rejects((d) => { d.render_timeline.content_to_output_offset = d.render_timeline.content_to_output_offset + 3; });
  });

  it("refuses a bookend interval that runs backwards or reports negative lengths", async () => {
    await rejects((d) => { d.bookends.intro.output_end = -3; });
    await rejects((d) => { d.bookends.intro.asset_duration = -1; });
    await rejects((d) => { d.bookends.intro.applied_overlap = -5; });
    await rejects((d) => { d.bookends.outro.join_inputs.main_duration = -6; });
    await rejects((d) => { d.bookends.outro.join_inputs.appended_duration = -9; });
    await rejects((d) => { d.bookends.intro.measured_output_duration = -2; });
  });

  it("refuses a composition branch the join helper cannot take", async () => {
    await rejects((d) => { d.bookends.intro.branch = "crossfade"; });
    await rejects((d) => { d.bookends.outro.branch = ""; });
  });

  it("refuses crop keyframes outside the frame or outside the content", async () => {
    await rejects((d) => { d.recipe.crop_keyframes = [{ t: -50, x_pct: 9999 }]; });
    await rejects((d) => { d.recipe.crop_keyframes = [{ t: 0, x_pct: 101 }]; });
    await rejects((d) => { d.recipe.crop_keyframes = [{ t: d.render_timeline.content_duration + 5, x_pct: 50 }]; });
    await rejects((d) => { d.recipe.bookend_fade = -1; });
  });

  it("refuses an unavailable transcript that still carries editorial words", async () => {
    await rejects((d) => { d.source_words = null; d.words_input = "unavailable"; d.render_timeline.words.input = "unavailable"; });
    await rejects((d) => { d.source_words = null; d.words_input = "unavailable"; d.render_timeline.words.input = "unavailable"; d.render_timeline.words.content = []; });
    await rejects((d) => { d.words_input = "supplied"; d.render_timeline.words.input = "supplied"; d.source_words = null; });
  });

  it("refuses an editorial word that ends after the content it was cut from", async () => {
    await rejects((d) => { d.render_timeline.words.content[0].end = d.render_timeline.content_duration + 5; });
  });

  it("refuses a probe or composition length that cannot describe real media", async () => {
    await rejects((d) => { d.probe.duration = -99; });
    await rejects((d) => { d.probe.duration = 0; });
    await rejects((d) => { d.final_composition.output.duration = -99; });
    await rejects((d) => { d.probe.bytes = d.probe.bytes + 1; });
  });

  it("refuses raw, final and probe timing that describe different files", async () => {
    await rejects((d) => { d.probe.duration = d.final_composition.output.duration + 1; });
    await rejects((d) => { d.final_composition.raw_render.output_duration = d.render_timeline.output_duration + 1; });
    await rejects((d) => { d.final_composition.output.duration = d.final_composition.content_offset - 0.01; });
  });

  it("refuses a card image placed somewhere other than the card offset it reports", async () => {
    await rejects((d) => { d.final_composition.artifacts.card_image.until = d.final_composition.card_offset + 2; });
    await rejects((d) => { d.final_composition.artifacts.card_image.placed_at = 1; });
    await rejects((d) => { d.final_composition.artifacts.card_image.sha256 = "a".repeat(64); });
    await rejects((d) => { d.final_composition.card.measured_duration = 0; });
  });

  it("refuses a composition whose own file record is not the file the document serves", async () => {
    await rejects((d) => { d.final_composition.output.file.bytes = d.final_composition.output.file.bytes + 1; });
    await rejects((d) => { d.final_composition.output.file.path = join(exportsDir, "elsewhere.mp4"); });
  });

  it("keeps legitimate overlapping words and reversed source order exactly as saved", async () => {
    // A genuine save of words that overlap each other, over intervals kept out
    // of source order: the receipt's projection, not a hand-written list.
    const overlapping = [
      { word: "one", start: 4.2, end: 4.9, speaker: "S0" },
      { word: "two", start: 4.5, end: 5.4, speaker: "S1" },
      { word: "three", start: 1.1, end: 1.5, speaker: "S0" },
    ];
    await commit({ source_words: overlapping });
    const saved = JSON.parse(readFileSync(entry().revisions.current.path, "utf-8")).render_timeline.words.content;
    const response = await reader.read("clip-e");
    expect(response.transcript.words).toEqual(saved);
    expect(response.transcript.words!.map((w) => w.word)).toEqual(["one", "two", "three"]);
    expect(response.transcript.words![0].end).toBeGreaterThan(response.transcript.words![1].start);
    const segments = response.timing.effective_segments!;
    expect(segments[0].source_start).toBeGreaterThan(segments[1].source_start);
  });

  // -------------------------------------------------------------------------
  // repair-3: relationships between records that are each individually valid.
  // Every mutation below leaves well-typed values behind and, where the earlier
  // scalar checks would have caught it, compensates the other fields too.

  it("refuses a served file shorter than the raw render and the card composed onto it", async () => {
    // The repair-2 review's short-card-output, with the producer receipt and
    // both probes moved with it so no single-field check can catch it.
    await rejects((d) => {
      const stop = d.final_composition.content_offset;
      d.final_composition.output.duration = stop;
      d.final_composition.output.probe.duration = stop;
      d.final_composition.card.producer.output.duration = stop;
      d.probe.duration = stop;
    });
  });

  it("refuses a hard cut that claims an overlap, however the arithmetic is balanced", async () => {
    // The repair-2 review's hardcut-impossible-overlap: asset minus overlap
    // cancels, so the rendered-length equation still balances.
    await rejects((d) => {
      d.bookends.outro = {
        kind: "outro", output_start: 900, output_end: 901, asset_duration: 500, applied_overlap: 500,
        branch: "hardcut", requested_fade: d.recipe.bookend_fade ?? 0, measured_output_duration: 901,
        join_inputs: { main_duration: 1, appended_duration: 500 },
      };
    });
  });

  it("refuses bookend intervals that do not describe the file they were rendered into", async () => {
    await rejects((d) => { d.bookends.outro.output_start += 100; d.bookends.outro.output_end += 100; });
    await rejects((d) => { d.bookends.intro.output_start = 0.5; });
    await rejects((d) => { d.bookends.outro.output_end = d.bookends.outro.output_start + d.bookends.outro.asset_duration + 3; });
  });

  it("refuses a crossfade its own recorded join inputs could not have produced", async () => {
    await rejects((d) => { d.bookends.outro.branch = "xfade_acrossfade"; d.bookends.outro.applied_overlap = 0; });
    await rejects((d) => { d.bookends.intro.applied_overlap = d.bookends.intro.applied_overlap + 0.2; });
  });

  it("refuses a receipt whose cuts are not the intervals its own recipe asked for", async () => {
    await rejects((d) => { for (const seg of d.render_timeline.segments) { seg.source_start += 10; seg.source_end += 10; } });
    await rejects((d) => { d.render_timeline.segments.pop(); });
  });

  it("refuses a time-domain map that relabels what the response quotes", async () => {
    await rejects((d) => {
      d.render_timeline.time_domains["bookends.*.output_*, content_to_output_offset, output_duration"] = "content-relative seconds";
    });
    await rejects((d) => { delete d.render_timeline.time_domains["segments.source_*"]; });
    await rejects((d) => { for (const k of Object.keys(d.final_composition.time_domains)) d.final_composition.time_domains[k] = "source-absolute seconds in the original file"; });
    await rejects((d) => { d.final_composition.card.producer.time_domains["raw.*"] = "seconds in the composed file"; });
  });

  it("refuses card provenance and composition that describe different cards", async () => {
    // The repair-2 review's contradictory-card-provenance, and its mirror.
    await rejects((d) => { d.thumbnail_card = { requested: false, applied: false, note: "not applied" }; });
    await rejects((d) => { d.final_composition.card = null; d.final_composition.artifacts.card_image = null; });
    await rejects((d) => { d.thumbnail_card.image = { path: d.files.main.path, bytes: 4242, sha256: "a".repeat(64) }; });
    await rejects((d) => { d.thumbnail_card.descriptor = { ...d.thumbnail_card.descriptor, image_sha256: "b".repeat(64) }; });
    await rejects((d) => { d.thumbnail_card.group_root = join(exportsDir, "another-group"); });
  });

  it("refuses card frame arithmetic its own time base cannot produce", async () => {
    // Halving the frames and doubling the tick length keeps the measured ticks,
    // the measured duration, the card offset and the half-frame allowance all
    // consistent; only the frame count and the packet total give it away.
    await rejects((d) => {
      const c = d.final_composition.card;
      c.frames /= 2;
      c.producer.card.frames = c.frames;
      c.producer.card.frame_ticks *= 2;
      c.frame_duration *= 2;
      c.producer.card.frame_duration = c.frame_duration;
      d.final_composition.tolerance.card_seconds = c.frame_duration / 2;
      c.producer.tolerance.card_seconds = c.frame_duration / 2;
    });
    await rejects((d) => { d.final_composition.card.producer.card.measured_ticks += 1; });
    await rejects((d) => { d.final_composition.card.producer.output.video.packets = d.final_composition.card.producer.raw.video.packets; });
    await rejects((d) => { d.final_composition.card.producer.output.video.first_pts = 1; });
    await rejects((d) => { d.final_composition.card.producer.output.video.time_base = "1/600"; });
  });

  it("refuses a producer receipt describing files other than the ones this revision records", async () => {
    await rejects((d) => { d.final_composition.card.producer.raw.sha256 = "c".repeat(64); });
    await rejects((d) => { d.final_composition.card.producer.output.file_size_bytes += 1; });
    await rejects((d) => { d.final_composition.card.producer.raw.path = join(exportsDir, "elsewhere.mp4"); });
    await rejects((d) => { d.final_composition.card.producer.output.duration += 1; });
  });

  it("refuses artifact placements that relabel their domain or claim the card", async () => {
    // The repair-2 review's wrong-artifact-domain, plus the placements the
    // reader used to accept unchecked.
    await rejects((d) => {
      d.final_composition.artifacts.caption_overlay = {
        path: d.files.main.path, time_domain: "source-absolute seconds", contains_card: true,
        placed_at: d.final_composition.content_offset,
      };
    });
    await rejects((d) => { d.final_composition.artifacts.main.contains_card = false; });
    await rejects((d) => { d.final_composition.artifacts.main.time_domain = "seconds in the raw exact render"; });
    await rejects((d) => { d.final_composition.artifacts.main.placed_at = d.final_composition.card_offset; });
    await rejects((d) => { d.final_composition.artifacts.raw_render.placed_at = 0; });
    await rejects((d) => { d.final_composition.artifacts.raw_render.contains_card = true; });
    await rejects((d) => { d.final_composition.artifacts.raw_render.path = d.files.main.path; });
    await rejects((d) => { d.final_composition.artifacts.card_image.path = d.files.main.path; });
    await rejects((d) => { d.final_composition.artifacts.card_image.time_domain = "seconds in the served file"; });
  });

  it("refuses an artifact placed with no file, or a file placed nowhere", async () => {
    await rejects((d) => {
      d.final_composition.artifacts.cropped_source = {
        path: join(exportsDir, "cropped.mp4"),
        time_domain: "content-relative seconds of the edited content; it holds no card",
        contains_card: false, placed_at: d.final_composition.content_offset,
      };
    });
    await rejects((d) => { d.files.caption_overlay = { path: join(exportsDir, "captions.mp4"), bytes: 10, sha256: "d".repeat(64) }; });
    await rejects((d) => { delete d.final_composition.artifacts.main; });
    await rejects((d) => { delete d.final_composition.artifacts.raw_render; });
  });

  it("refuses a raw render record the composition does not actually offset", async () => {
    await rejects((d) => { d.final_composition.raw_render.probe.duration = d.final_composition.raw_render.output_duration + 5; });
    await rejects((d) => { d.final_composition.raw_render.probe.bytes += 1; });
    await rejects((d) => { d.final_composition.raw_render.file.sha256 = "e".repeat(64); });
  });

  it("refuses an applied card on a document that records no composition at all", async () => {
    // The card composer and final_composition arrived in the same slice, so a
    // pre-composition document reporting an applied card is a state no save
    // produced: the response would show a card over card-free raw timing.
    await rejects((d) => { delete d.final_composition; });
  });

  /** The card revision reduced to what a pre-1B.2b.1 save recorded: no
   * composition, no card, no join inputs in either copy of a join. */
  const precomposition = (d: any) => {
    delete d.final_composition;
    d.thumbnail_card = { requested: false, applied: false, note: "no opening card was requested" };
    for (const copy of [d.bookends, d.render_timeline.bookends]) {
      for (const kind of ["intro", "outro"]) if (copy[kind]) delete copy[kind].join_inputs;
    }
  };

  it("reads a pre-composition document with no card exactly as saved", async () => {
    // Before composition the served file was the raw render itself, so the
    // document, its pointer and the entry summary all name that file.
    await withDocument(() => {});
    const doc = JSON.parse(pristine!.text);
    const raw = doc.final_composition.raw_render;
    precomposition(doc);
    doc.files.main = raw.file;
    doc.probe = raw.probe;
    doc.group_root = raw.group_root;
    writeFileSync(pristine!.path, JSON.stringify(doc));
    await history.transaction((list) => {
      const e = list.find((x) => x.id === "clip-e") as any;
      e.output_path = raw.file.path;
      Object.assign(e.revisions.current, { output_path: raw.file.path, group_root: raw.group_root, groups: [raw.group_root] });
    });
    const response = await reader.read("clip-e");
    expect(response.revision!.document!.has_final_composition).toBe(false);
    expect(response.timing.final_composition).toBeNull();
    expect(response.timing.raw_render!.output_duration).toBeGreaterThan(0);
    expect(response.timing.effective_cuts_known).toBe(true);
    expect(response.diagnostics.map((x) => x.code)).toContain("DOCUMENT_PREDATES_FINAL_COMPOSITION");
    expect(response.diagnostics.map((x) => x.code)).toContain("BOOKEND_JOIN_INPUTS_ABSENT");
    expect(response.media.summary.state).toBe("equal");
  });

  it("refuses a pre-composition document whose served file is not its raw render", async () => {
    // The card-inclusive file with the composition record removed: its size
    // and length describe a file the raw receipt never rendered.
    await rejects(precomposition);
  });
});

describe("the entry summary the by-id urls resolve (R2b / WS-16, B2B2-3)", () => {
  const committedCaps = (r: Response) =>
    r.capabilities.filter((c) => c.id === "play_committed_media" || c.id === "download_committed_media");

  async function withSummary(mutate: (e: any) => void): Promise<Response> {
    await commit();
    await history.transaction((list) => { mutate(list.find((x) => x.id === "clip-e") as any); });
    return reader.read("clip-e");
  }

  it("serves the revision only when the summary is the revision's own file", async () => {
    const response = await withSummary(() => {});
    expect(response.media.summary).toMatchObject({ state: "equal", served_kind: "supported" });
    expect(response.media.serves).toMatchObject({ version: 1, provenance: "exact" });
    expect(committedCaps(response).map((c) => [c.available, c.reason])).toEqual([[true, "AVAILABLE"], [true, "AVAILABLE"]]);
  });

  it.each([
    ["absent", (e: any) => { delete e.output_path; }, "absent"],
    ["null", (e: any) => { e.output_path = null; }, "absent"],
    ["empty", (e: any) => { e.output_path = ""; }, "invalid"],
    ["not a string", (e: any) => { e.output_path = { path: "somewhere" }; }, "invalid"],
  ])("disowns the urls for a summary that is %s", async (_label, mutate, state) => {
    const response = await withSummary(mutate);
    // serveClipById answers 404 without a usable summary, so no url here
    // reaches the revision, however readable the revision's own file is.
    expect(response.media.summary.state).toBe(state);
    expect(response.media.serves).toBeNull();
    expect(committedCaps(response).map((c) => [c.available, c.reason]))
      .toEqual([[false, "COMMITTED_MEDIA_SUMMARY_DRIFT"], [false, "COMMITTED_MEDIA_SUMMARY_DRIFT"]]);
    expect(response.diagnostics.map((x) => x.code)).toContain("COMMITTED_MEDIA_SUMMARY_DRIFT");
    // Context the operator still needs is retained.
    expect(response.revision!.document!.has_final_composition).toBe(true);
    expect(response.media.output.state).toBe("available");
    expect(response.capabilities.find((c) => c.id === "edit_writing_metadata")!.available).toBe(true);
  });

  it("disowns the urls for a summary naming a file the routes will not stream", async () => {
    const unsupported = join(exportsDir, "committed.avi");
    const response = await withSummary((e) => {
      writeFileSync(unsupported, readFileSync(e.revisions.current.output_path));
      e.output_path = unsupported;
      e.revisions.current.output_path = unsupported;
      const doc = JSON.parse(readFileSync(e.revisions.current.path, "utf-8"));
      doc.files.main.path = unsupported;
      doc.final_composition.output.file.path = unsupported;
      doc.final_composition.artifacts.main.path = unsupported;
      if (doc.final_composition.card) doc.final_composition.card.producer.output.path = unsupported;
      doc.final_composition.raw_render.file.path = unsupported;
      doc.final_composition.artifacts.raw_render.path = unsupported;
      writeFileSync(e.revisions.current.path, JSON.stringify(doc));
    });
    // The file is on disk and the summary is the revision's own, but
    // serveClipById answers 400 for any container outside its list.
    expect(response.media.summary).toMatchObject({ state: "equal", served_kind: "unsupported" });
    expect(response.media.output.state).toBe("available");
    expect(response.media.serves).toBeNull();
    expect(committedCaps(response).map((c) => [c.available, c.reason]))
      .toEqual([[false, "MEDIA_KIND_UNSUPPORTED"], [false, "MEDIA_KIND_UNSUPPORTED"]]);
    expect(response.diagnostics.map((x) => x.code)).toContain("MEDIA_KIND_UNSUPPORTED");
  });

  it("reports an untracked clip's own summary without inventing a revision", async () => {
    const response = await reader.read("clip-e");
    expect(response.media.summary).toMatchObject({ state: "untracked", served_kind: "supported" });
    expect(response.media.serves).toBeNull();
  });
});

describe("committed media identity is coherent (R2b / WS-16, B2B2-1/4)", () => {
  it("refuses a document whose served file is not the file the pointer serves", async () => {
    await commit();
    const path = entry().revisions.current.path;
    const doc = JSON.parse(readFileSync(path, "utf-8"));
    const unrelated = join(exportsDir, "unrelated.mp4");
    writeFileSync(unrelated, "a different file");
    await history.transaction((list) => {
      const e = list.find((x) => x.id === "clip-e") as any;
      e.revisions.current.output_path = unrelated;
      e.output_path = unrelated;
    });
    // The document still names the real revision file, so the pointer and the
    // document now describe two different videos.
    expect(JSON.parse(readFileSync(path, "utf-8")).files.main.path).toBe(doc.files.main.path);
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "REVISION_DOCUMENT_INVALID", status: 500 });
  });

  it("keeps context but disowns the urls when only the entry summary has moved", async () => {
    const saved = await commit();
    const moved = join(exportsDir, "moved-by-legacy-writer.mp4");
    writeFileSync(moved, "moved file");
    await history.transaction((list) => { (list.find((x) => x.id === "clip-e") as any).output_path = moved; });

    const response = await reader.read("clip-e");
    // Usable context is retained: the revision and its timing are still true.
    expect(response.revision).toMatchObject({ revision_id: saved.revision.revision_id, version: 1 });
    expect(response.timing.effective_cuts_known).toBe(true);
    expect(response.clip.title).toBe("Legacy clip");
    expect(response.revision!.document!.recipe.title).toBe("Saved clip");
    // What is withdrawn is the claim that a url reaches it.
    expect(response.media.serves).toBeNull();
    const byId = Object.fromEntries(response.capabilities.map((c) => [c.id, c]));
    expect(byId.play_committed_media).toMatchObject({ available: false, reason: "COMMITTED_MEDIA_SUMMARY_DRIFT" });
    expect(byId.download_committed_media).toMatchObject({ available: false, reason: "COMMITTED_MEDIA_SUMMARY_DRIFT" });
    expect(response.diagnostics.map((d) => d.code)).toContain("COMMITTED_MEDIA_SUMMARY_DRIFT");
    // Writing stays editable; a drifted summary is not a reason to lock a clip.
    expect(byId.edit_writing_metadata.available).toBe(true);
    expectNoPaths(response);
  });

  it("serves the revision normally while the summary still agrees", async () => {
    await commit();
    const response = await reader.read("clip-e");
    expect(response.media.serves).toMatchObject({ version: 1, provenance: "exact" });
    const byId = Object.fromEntries(response.capabilities.map((c) => [c.id, c]));
    expect(byId.play_committed_media).toMatchObject({ available: true, reason: "AVAILABLE" });
    expect(response.diagnostics.map((d) => d.code)).not.toContain("COMMITTED_MEDIA_SUMMARY_DRIFT");
  });
});

describe("counters and pointers are published together (R2c / WS-16, B2B2-1/3)", () => {
  it("refuses a positive revision counter with no current pointer", async () => {
    await commit();
    // A legacy words sidecar sits beside it, so the old behaviour had somewhere
    // to fall back to: it answered as tracked-without-revision.
    mkdirSync(join(historyDir, "words"), { recursive: true });
    writeFileSync(join(historyDir, "words", "clip-e.json"), JSON.stringify(WORDS));
    await history.transaction((list) => { (list.find((e) => e.id === "clip-e") as any).revisions.current = null; });
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "REVISION_STATE_INVALID", status: 500 });
  });

  it("refuses a positive draft counter with no draft pointer", async () => {
    const svc = saveService();
    const state = await svc.ensureTracked("clip-e");
    await svc.saveDraft({ clip_id: "clip-e", expected: expectedOf(state), draft: { recipe: recipe(), source_words: WORDS } } as any);
    expect(entry().revisions.draft_version).toBe(1);
    await history.transaction((list) => { (list.find((e) => e.id === "clip-e") as any).revisions.draft = null; });
    await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "REVISION_STATE_INVALID", status: 500 });
  });

  it("reads the genuine version-zero state of a tracked clip that has no output", async () => {
    // The real control for the rule above, produced by the writer itself:
    // ensureTracked is the only thing that creates a null current, and only
    // for an entry with nothing rendered.
    await history.transaction((list) => { delete (list.find((e) => e.id === "clip-e") as any).output_path; });
    const state = await saveService().ensureTracked("clip-e");
    expect([state.current, state.revision_version, state.draft, state.draft_version]).toEqual([null, 0, null, 0]);

    const response = await reader.read("clip-e");
    expect(response.identity).toMatchObject({ tracked: true, revision_version: 0, draft_version: 0 });
    expect(response.revision).toBeNull();
    expect(response.legacy!.reason).toBe("tracked-without-revision");
    expect(response.media.serves).toBeNull();
    expect(response.clip.title).toBe("Legacy clip");
    expect(response.capabilities.find((c) => c.id === "edit_writing_metadata")!.available).toBe(true);
  });

  it("reads a real saved draft beside a real committed revision", async () => {
    const svc = saveService();
    await commit();
    const state = entry().revisions;
    await svc.saveDraft({ clip_id: "clip-e", expected: expectedOf(state), draft: { recipe: recipe({ caption_style: "bold" }), source_words: WORDS } } as any);
    const response = await reader.read("clip-e");
    expect(response.identity).toMatchObject({ revision_version: 1, draft_version: 1 });
    expect(response.draft).toMatchObject({ version: 1, words_input: "supplied" });
    expect(response.draft!.recipe.caption_style).toBe("bold");
    expect(response.revision!.version).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Lead-22: relationships the accepted producers establish between records.
// Every fixture below is a real save through the accepted revision service;
// each refusal changes what the producer wrote, and each neighbour is a state
// the producer does write.

describe("producer-derived relationships (lead-22 / WS-16, B2B2-1/3)", () => {
  /** Commit, then read one mutated copy of the committed document. */
  async function readMutated(over: Record<string, unknown>, mutate: (doc: any) => void) {
    await commit(over);
    const path = entry().revisions.current.path;
    const doc = JSON.parse(readFileSync(path, "utf-8"));
    mutate(doc);
    writeFileSync(path, JSON.stringify(doc));
    return reader.read("clip-e");
  }
  const refused = (over: Record<string, unknown>, mutate: (doc: any) => void) =>
    expect(readMutated(over, mutate)).rejects.toMatchObject({ code: "REVISION_DOCUMENT_INVALID", status: 500 });
  const words = (d: any) => d.render_timeline.words;
  const both = (d: any, kind: "intro" | "outro") => [d.bookends[kind], d.render_timeline.bookends[kind]];
  const BOOKENDS = { recipe: recipe({ intro_path: outro, outro_path: outro, bookend_fade: 0.3 }) };
  /** What a save before 1B.2b.1 recorded: no composition and no join inputs.
   * Without a card the served file already is the raw render. */
  const predates = (d: any) => {
    delete d.final_composition;
    for (const kind of ["intro", "outro"] as const) for (const copy of both(d, kind)) if (copy) delete copy.join_inputs;
  };

  describe("the editorial transcript is the producer's projection of the retained words", () => {
    it.each([
      ["text that is not the text of its words", (d: any) => { words(d).content_text = "speech that was never supplied"; }],
      ["editorial words with no retained source to derive them from", (d: any) => {
        d.source_words = [];
        words(d).source = [];
        words(d).source_count = 0;
      }],
      ["an editorial word that was never supplied, with its text to match", (d: any) => {
        words(d).content[0].word = "november";
        words(d).content_text = words(d).content.map((w: any) => w.word).join(" ");
      }],
      ["an editorial word with metadata its supplied word does not carry", (d: any) => { words(d).content[0].speaker = "S9"; }],
      ["an editorial word placed where the producer never mapped it", (d: any) => {
        words(d).content[0].start += 0.2;
        words(d).content[0].end += 0.2;
      }],
      ["retained source words that touch none of the kept intervals", (d: any) => { words(d).source = [WORDS[0]]; }],
      ["editorial words reordered against the interval order", (d: any) => {
        const content = words(d).content;
        words(d).content = [content[content.length - 1], ...content.slice(0, -1)];
      }],
      ["a supplied-word count that is not the list retained", (d: any) => { words(d).source_count += 1; }],
    ])("refuses %s", async (_label, mutate) => {
      await refused({}, mutate);
    });

    it("refuses source words retained from a transcript that was never supplied", async () => {
      await refused({ source_words: null }, (d) => { words(d).source = []; });
    });

    it("keeps an unavailable transcript distinct from a supplied-empty one", async () => {
      await commit({ source_words: null }, "op-none");
      const none = await reader.read("clip-e");
      expect([none.transcript.availability, none.transcript.words]).toEqual(["unavailable", null]);
      await commit({ source_words: [] }, "op-empty");
      const empty = await reader.read("clip-e");
      expect([empty.transcript.availability, empty.transcript.words, empty.transcript.word_count]).toEqual(["empty", [], 0]);
    });

    it("reads clipped, boundary-touching, excluded and twice-mapped words exactly as the producer mapped them", async () => {
      // Intervals out of source order, one inside another's range: a word the
      // two share is projected once per interval, a straddling word keeps only
      // its inside part, and words that only touch a boundary are excluded.
      const supplied = [
        { word: "before", start: 3.5, end: 4.0, speaker: "S0" },
        { word: "shared", start: 4.3, end: 4.5, speaker: "S1", confidence: 0.4 },
        { word: "straddle", start: 1.8, end: 2.6, speaker: "S0" },
        { word: "after", start: 2.0, end: 2.2 },
      ];
      await commit({ source_words: supplied, recipe: recipe({ keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }, { start: 4.2, end: 4.6 }] }) });
      const saved = JSON.parse(readFileSync(entry().revisions.current.path, "utf-8")).render_timeline.words;
      const response = await reader.read("clip-e");
      expect(response.transcript.words).toEqual(saved.content);
      expect(response.transcript.words!.map((w) => w.word)).toEqual(["shared", "straddle", "shared"]);
      expect(response.transcript.text).toBe("shared straddle shared");
      expect(response.transcript.widening_input.word_count).toBe(4);
    });

    it("checks every stored word, not only the served prefix", async () => {
      // 20,001 supplied words inside one kept interval: the producer maps all
      // of them, the response serves 20,000 and keeps the true count and text.
      const many = Array.from({ length: 20001 }, (_, i) => ({ word: i === 20000 ? "TAIL" : `w${i}`, start: 1 + i * 0.00004, end: 1 + i * 0.00004 + 0.00003 }));
      const response = await readMutated({ source_words: many, recipe: recipe({ keep_segments: [{ start: 1, end: 2 }] }) }, () => {});
      expect([response.transcript.words!.length, response.transcript.word_count]).toEqual([20000, 20001]);
      expect(response.transcript.text!.endsWith("TAIL")).toBe(true);
      expect(response.diagnostics.map((x) => x.code)).toContain("TRANSCRIPT_TRUNCATED");
      // The only change is past the served limit, and it is still refused.
      const path = entry().revisions.current.path;
      const doc = JSON.parse(readFileSync(path, "utf-8"));
      words(doc).content[20000].word = "LIAR";
      words(doc).content_text = words(doc).content_text.replace(/TAIL$/, "LIAR");
      writeFileSync(path, JSON.stringify(doc));
      await expect(reader.read("clip-e")).rejects.toMatchObject({ code: "REVISION_DOCUMENT_INVALID" });
    });
  });

  describe("a document with no composition serves its raw render", () => {
    const allowanceOf = (d: any) => Math.max(0.05, d.render_timeline.tolerance.composition_seconds);

    it("reads a probe length inside the save's own admission allowance", async () => {
      const response = await readMutated({}, (d) => {
        predates(d);
        d.probe.duration = d.render_timeline.output_duration + allowanceOf(d) * 0.5;
      });
      expect(response.revision!.document!.has_final_composition).toBe(false);
    });

    it.each([
      ["a probe length outside that allowance", (d: any) => { d.probe.duration = d.render_timeline.output_duration + allowanceOf(d) * 1.5; }],
      ["no probe length at all", (d: any) => { d.probe.duration = null; }],
      ["a receipt size other than the served file record", (d: any) => { d.render_timeline.output.file_size_bytes = d.files.main.bytes + 7; }],
    ])("refuses %s", async (_label, mutate) => {
      await refused({}, (d) => { predates(d); mutate(d); });
    });

    it("keeps the raw and final records distinct when a card was composed", async () => {
      await commit({ thumbnail_card: cardOf(cardImage) });
      const doc = JSON.parse(readFileSync(entry().revisions.current.path, "utf-8"));
      // The receipt describes the raw render, never the card-inclusive file.
      expect(doc.render_timeline.output.file_size_bytes).toBe(doc.final_composition.raw_render.file.bytes);
      expect(doc.render_timeline.output.file_size_bytes).not.toBe(doc.files.main.bytes);
      expect((await reader.read("clip-e")).revision!.document!.has_final_composition).toBe(true);
    });

    it("refuses a raw receipt size other than the composed revision's raw file record", async () => {
      await refused({ thumbnail_card: cardOf(cardImage) }, (d) => { d.render_timeline.output.file_size_bytes += 1; });
    });
  });

  describe("both stored copies describe one join, and the last join wrote the file", () => {
    it.each([
      ["a document copy whose measurement its receipt copy contradicts", (d: any) => { d.bookends.outro.measured_output_duration = 999; }],
      ["a receipt copy whose region the document copy contradicts", (d: any) => { d.render_timeline.bookends.outro.output_end += 5; }],
      ["a receipt copy whose branch the document copy contradicts", (d: any) => {
        const copy = d.render_timeline.bookends.intro;
        copy.branch = copy.branch === "hardcut" ? "hardcut_soft_audio" : "hardcut";
      }],
      ["a receipt copy with join inputs the document copy lacks", (d: any) => { delete d.bookends.intro.join_inputs; }],
      ["a join one copy records and the other does not", (d: any) => { d.render_timeline.bookends.intro = null; }],
      ["an intro transition its own asset and overlap cannot produce", (d: any) => {
        for (const copy of both(d, "intro")) copy.transition = { output_start: copy.transition.output_start + 2, output_end: copy.transition.output_end + 2 };
      }],
      ["an outro transition that does not end where the content ends", (d: any) => {
        for (const copy of both(d, "outro")) copy.transition = { output_start: copy.transition.output_start, output_end: copy.transition.output_end + 2 };
      }],
      ["a paired last-join measurement the raw output contradicts", (d: any) => {
        for (const copy of both(d, "outro")) copy.measured_output_duration = 999;
      }],
    ])("refuses %s", async (_label, mutate) => {
      await refused(BOOKENDS, mutate);
    });

    it("reads an intro measurement that is intermediate, not the rendered file", async () => {
      await commit(BOOKENDS);
      const doc = JSON.parse(readFileSync(entry().revisions.current.path, "utf-8"));
      expect(Math.abs(doc.bookends.intro.measured_output_duration - doc.render_timeline.output_duration)).toBeGreaterThan(0.5);
      const response = await reader.read("clip-e");
      expect(response.revision!.document!.bookends.intro!.measured_output_duration).toBe(doc.bookends.intro.measured_output_duration);
    });

    it.each([
      ["measurements an older join did not record, in both copies", (d: any) => {
        for (const kind of ["intro", "outro"] as const) for (const copy of both(d, kind)) copy.measured_output_duration = null;
      }],
      ["an older join without inputs, in both copies", predates],
      ["unknown metadata on one copy that nothing consumes", (d: any) => { d.bookends.outro.future_unused = { value: 1 }; }],
    ])("reads %s", async (_label, mutate) => {
      const response = await readMutated(BOOKENDS, mutate);
      expect(response.revision!.document!.bookends.outro).not.toBeNull();
    });

    const INTRO_ONLY = { recipe: recipe({ intro_path: outro }) };
    it("reads an intro-only render, whose intro join wrote the file", async () => {
      const response = await readMutated(INTRO_ONLY, () => {});
      expect(response.revision!.document!.bookends.outro).toBeNull();
      expect(response.revision!.document!.bookends.intro!.measured_output_duration).toBeCloseTo(response.timing.raw_render!.output_duration, 2);
    });

    it("binds an intro-only render to the intro's own measurement", async () => {
      await refused(INTRO_ONLY, (d) => { for (const copy of both(d, "intro")) copy.measured_output_duration = 999; });
    });
  });

  describe("the served container is the resolved file the routes check", () => {
    const committedPlay = (r: Response) => r.capabilities.find((c) => c.id === "play_committed_media")!;
    async function withLink(name: string, target: string | null) {
      const link = join(exportsDir, name);
      if (target) writeFileSync(target, "linked media");
      symlinkSync(target ?? join(exportsDir, "gone.mp4"), link, "file");
      await history.transaction((list) => { (list.find((e) => e.id === "clip-e") as any).output_path = link; });
      return reader.read("clip-e");
    }

    it("refuses the claim for a supported name over an unsupported resolved file", async () => {
      const response = await withLink("linked.mp4", join(exportsDir, "real.avi"));
      expect(response.media.summary).toMatchObject({ state: "untracked", served_kind: "unsupported" });
      expect(response.media.output.state).toBe("available");
      expect([committedPlay(response).available, committedPlay(response).reason]).toEqual([false, "MEDIA_KIND_UNSUPPORTED"]);
    });

    it("claims an unsupported name over a supported resolved file", async () => {
      const response = await withLink("linked.avi", join(exportsDir, "real.mp4"));
      expect(response.media.summary.served_kind).toBe("supported");
      expect([committedPlay(response).available, committedPlay(response).reason]).toEqual([true, "AVAILABLE"]);
    });

    it("keeps a dangling link a missing file rather than a kind", async () => {
      const response = await withLink("dangling.mp4", null);
      expect(response.media.output.state).toBe("missing");
      expect(response.media.summary.served_kind).toBe("supported");
      expect([committedPlay(response).available, committedPlay(response).reason]).toEqual([false, "MEDIA_MISSING"]);
      expect(response.clip.title).toBe("Legacy clip");
    });
  });
});
