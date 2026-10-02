import { describe, it, expect, beforeEach } from "vitest";
import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";

// Writing Studio 1B.2b.3: the locked legacy writers (B2B3-2), metadata edits
// on tracked clips (B2B3-3), the path fence beneath ClipsHistory.remove
// (B2B3-4), and the field set: every field a revision commit writes is fenced,
// and the Python writer fences the same set.

const tmp = mkdtempSync(join(tmpdir(), "podcli-fence-"));
/** Junction fixtures live outside `tmp` so byte walkers never meet a link. */
const linkTmp = mkdtempSync(join(tmpdir(), "podcli-fence-links-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = join(tmp, "data");
process.env.PODCLI_OUTPUT = join(tmp, "exports");

const { ClipsHistory } = await import("./clips-history.js");
const fence = await import("./clip-write-fence.js");
const { ClipWriteFenceError, REVISION_OWNED_FIELDS, FENCE_NAMESPACE_DIR, FENCE_SIDECAR_DIR, isRevisionOwnedPath, isRevisionTracked, fencedPatchKeys, revisionPathVerdict } = fence;
const { ClipRevisionService, REVISION_NAMESPACE, REVISION_SIDECARS } = await import("./clip-revisions.js");
const { fakeCompose, fakeExactRender, fakeProbe, fakeStreams } = await import("./clip-revisions.test-support.js");
const { paths } = await import("../config/paths.js");

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const historyDir = join(tmp, "history");
const historyPath = join(historyDir, "clips.json");
const exportsDir = join(tmp, "exports");
const namespace = join(exportsDir, "writing-studio");
const sidecarTree = join(historyDir, "revisions");
const source = join(tmp, "source.mp4");
const intro = join(tmp, "intro.mp4");
const outro = join(tmp, "outro.mp4");
const logo = join(tmp, "logo.png");
const card = join(tmp, "card.png");

const sha256 = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const entries = () => JSON.parse(readFileSync(historyPath, "utf-8")) as any[];
const entryOf = (id: string) => entries().find((e) => e.id === id);
const historyBytes = () => readFileSync(historyPath);

/** Every stored byte beneath the fixture: a refusal must change none of them. */
function tree(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const item of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, item.name);
      if (item.name.endsWith(".lock")) continue;
      if (item.isDirectory()) walk(p);
      else if (item.isFile()) out[relative(tmp, p)] = sha256(p);
    }
  };
  walk(tmp);
  return out;
}

function legacy(id: string, over: Record<string, unknown> = {}) {
  const output = join(exportsDir, `${id}_short.mp4`);
  return {
    id, source_video: source, start_second: 1, end_second: 5, caption_style: "karaoke", crop_strategy: "center", format: "vertical",
    title: `Clip ${id}`, output_path: output, file_size_mb: 0.01, duration: 4, created_at: "2026-09-01T00:00:00.000Z",
    transcript_slice: "green blue", keep_segments: [{ start: 1, end: 5 }], logo_path: logo, logo_position: "top-left",
    thumbnail_config: { text: "Card", card_seconds: 1.5 }, unknown_field: { kept: [1, { deep: true }] },
    ...over,
  };
}

let history: InstanceType<typeof ClipsHistory>;
function seed(list: any[]) {
  rmSync(historyDir, { recursive: true, force: true });
  rmSync(exportsDir, { recursive: true, force: true });
  mkdirSync(historyDir, { recursive: true });
  mkdirSync(exportsDir, { recursive: true });
  for (const [p, bytes] of [[source, "source"], [intro, "intro"], [outro, "outro"], [logo, "logo"], [card, "png-card"]] as const) writeFileSync(p, bytes);
  for (const e of list) {
    if (typeof e.output_path === "string" && !existsSync(e.output_path)) {
      mkdirSync(dirname(e.output_path), { recursive: true });
      writeFileSync(e.output_path, `media ${e.id}`);
    }
    for (const dir of ["words", "recipes", "reframe"]) {
      mkdirSync(join(historyDir, dir), { recursive: true });
      writeFileSync(join(historyDir, dir, `${e.id}.json`), JSON.stringify({ id: e.id, dir }));
    }
    mkdirSync(join(exportsDir, "thumbnails", e.id), { recursive: true });
    writeFileSync(join(exportsDir, "thumbnails", e.id, "thumb.png"), `thumb ${e.id}`);
  }
  writeFileSync(historyPath, JSON.stringify(list, null, 2));
  history = new ClipsHistory();
}

/** A value for each fenced field, so every refusal names a real write. */
const OWNED_VALUES: Record<string, unknown> = {
  revisions: { schema: 1 }, id: "other-id", created_at: "2030-01-01T00:00:00.000Z", source_video: "/elsewhere.mp4",
  logo_backup_path: "/backup.mp4", output_path: "/elsewhere_short.mp4", duration: 9, file_size_mb: 9, start_second: 0,
  end_second: 9, caption_style: "hormozi", crop_strategy: "manual", format: "square", keep_segments: [{ start: 0, end: 1 }],
  logo_path: "", intro_path: "/intro.mp4", outro_path: "/outro.mp4", logo_position: "bottom-right",
  transcript_slice: "changed", thumbnail_config: { text: "changed" },
};
const METADATA_PATCH = {
  title: "Edited title", generated_titles: ["a", "b"], description: "Edited description", tags: ["t"], hashtags: "#x",
  metrics: { views: 12, fetched_at: "2026-09-20T00:00:00Z" }, cloud_id: "cloud-1", cloud_synced: true, cloud_video_uploaded: true,
  youtube_video_id: "yt-123", future_unknown_field: { any: "value" },
};

/** Version zero through the real save service, and every malformed non-null value. */
const TRACKED_KINDS: Array<[string, (id: string) => Promise<void>]> = [
  ["version zero", async (id) => { await new ClipRevisionService({ history }).ensureTracked(id); }],
  ...(["not-a-state", 0, false, [], {}] as unknown[]).map((value) => [
    `malformed ${JSON.stringify(value)}`,
    async (id: string) => {
      const list = entries();
      list.find((e) => e.id === id).revisions = value;
      writeFileSync(historyPath, JSON.stringify(list, null, 2));
    },
  ] as [string, (id: string) => Promise<void>]),
];

beforeEach(() => seed([legacy("clip-t"), legacy("clip-u")]));

describe("tracked clips refuse legacy writes under the lock (B2B3-2)", () => {
  for (const [kind, track] of TRACKED_KINDS) {
    it(`${kind}: every revision-owned patch key and removal is refused and nothing is written`, async () => {
      await track("clip-t");
      expect(isRevisionTracked(entryOf("clip-t"))).toBe(true);
      const before = tree();
      for (const field of REVISION_OWNED_FIELDS) {
        for (const value of [OWNED_VALUES[field], undefined]) {
          const attempt = history.update("clip-t", { title: "not applied", [field]: value } as any);
          await expect(attempt, `${field}=${JSON.stringify(value)}`).rejects.toBeInstanceOf(ClipWriteFenceError);
          await attempt.catch((err) => {
            expect(err.code).toBe("CLIP_REVISION_TRACKED");
            expect(err.message).not.toMatch(/[A-Za-z]:[\\/]|\/tmp|\u2014/);
          });
        }
      }
      await expect(history.remove("clip-t")).rejects.toMatchObject({ code: "CLIP_REVISION_TRACKED" });
      await expect(history.remove("clip-")).resolves.toBeNull(); // an ambiguous prefix still resolves nothing
      expect(tree()).toEqual(before);
    });

    it(`${kind}: metadata-only writes still succeed and leave revision-owned fields untouched (B2B3-3)`, async () => {
      await track("clip-t");
      const before = entryOf("clip-t");
      const updated = await history.update("clip-t", METADATA_PATCH as any);
      expect(updated).not.toBeNull();
      const after = entryOf("clip-t");
      for (const field of REVISION_OWNED_FIELDS) expect(after[field], field).toEqual(before[field]);
      for (const [key, value] of Object.entries(METADATA_PATCH)) expect(after[key], key).toEqual(value);
      expect(after.unknown_field).toEqual(before.unknown_field);
    });
  }

  it("an untracked clip keeps its legacy behaviour, but no legacy patch starts tracking", async () => {
    const patch = Object.fromEntries(REVISION_OWNED_FIELDS.filter((f) => f !== "revisions" && f !== "id").map((f) => [f, OWNED_VALUES[f]]));
    const updated = await history.update("clip-u", patch as any);
    expect(updated).not.toBeNull();
    for (const [key, value] of Object.entries(patch)) expect(entryOf("clip-u")[key], key).toEqual(value);

    const before = historyBytes();
    for (const value of [{ schema: 1 }, undefined, "x"]) {
      await expect(history.update("clip-u", { revisions: value } as any)).rejects.toMatchObject({ code: "CLIP_REVISION_TRACKED" });
    }
    expect(historyBytes()).toEqual(before);
    expect("revisions" in entryOf("clip-u")).toBe(false);

    // Removal is unchanged: entry, output, sidecars and thumbnails go.
    seed([legacy("clip-u")]);
    const removed = await history.remove("clip-u");
    expect(removed?.id).toBe("clip-u");
    expect(entryOf("clip-u")).toBeUndefined();
    expect(existsSync(join(exportsDir, "clip-u_short.mp4"))).toBe(false);
    expect(existsSync(join(historyDir, "words", "clip-u.json"))).toBe(false);
    expect(existsSync(join(exportsDir, "thumbnails", "clip-u"))).toBe(false);
  });

  it("tracking that lands between an earlier read and the locked commit still refuses", async () => {
    const early = await history.findById("clip-t");
    expect(isRevisionTracked(early!)).toBe(false);
    await new ClipRevisionService({ history }).ensureTracked("clip-t");
    const before = historyBytes();
    await expect(history.update("clip-t", { caption_style: "hormozi", file_size_mb: 2 })).rejects.toMatchObject({ code: "CLIP_REVISION_TRACKED" });
    await expect(history.remove("clip-t")).rejects.toMatchObject({ code: "CLIP_REVISION_TRACKED" });
    expect(historyBytes()).toEqual(before);
  });

  it("counts every own key, including one set to undefined", () => {
    const trackedEntry = { id: "a", revisions: {} };
    expect(fencedPatchKeys(trackedEntry, { title: "x", caption_style: undefined })).toEqual(["caption_style"]);
    expect(fencedPatchKeys(trackedEntry, { title: "x", description: "y" })).toEqual([]);
    expect(fencedPatchKeys({ id: "b" }, { caption_style: "x", revisions: undefined })).toEqual(["revisions"]);
    expect(fencedPatchKeys({ id: "b", revisions: null }, { caption_style: "x" })).toEqual([]);
  });
});

describe("the path fence (B2B3-4)", () => {
  const junctionOr = (target: string, name: string): string | null => {
    const link = join(linkTmp, name);
    rmSync(link, { recursive: true, force: true });
    try {
      symlinkSync(target, link, "junction");
      return link;
    } catch (err) {
      // Junctions need no privilege on Windows; a failure there is a real gap, not a skip.
      if (process.platform === "win32") throw err;
      return null;
    }
  };

  it("resolves links and junctions, folds case on Windows, treats a missing root as protected and fails closed", async () => {
    mkdirSync(join(namespace, "clip-x"), { recursive: true });
    writeFileSync(join(namespace, "clip-x", "main.mp4"), "revision media");
    mkdirSync(join(sidecarTree, "clip-x"), { recursive: true });
    const cases: Array<[string, string, boolean]> = [
      ["namespace root", namespace, true],
      ["namespace file", join(namespace, "clip-x", "main.mp4"), true],
      ["missing file in the namespace", join(namespace, "clip-y", "gone", "main.mp4"), true],
      ["sidecar tree file", join(sidecarTree, "clip-x", "doc.json"), true],
      ["a sibling with the same prefix", join(exportsDir, "writing-studio-other", "main.mp4"), false],
      ["an ordinary export", join(exportsDir, "clip_short.mp4"), false],
      ["the history file", historyPath, false],
      ["a lexical escape", join(namespace, "..", "clip_short.mp4"), false],
    ];
    if (process.platform === "win32") cases.push(["a case variant", join(exportsDir, "WRITING-STUDIO", "clip-x", "MAIN.mp4"), true]);
    for (const [label, target, expected] of cases) expect(await isRevisionOwnedPath(target), label).toBe(expected);

    const alias = junctionOr(join(namespace, "clip-x"), "alias");
    if (alias) expect(await isRevisionOwnedPath(join(alias, "main.mp4")), "junction alias").toBe(true);
    const outsideTarget = join(linkTmp, "outside-dir");
    mkdirSync(outsideTarget, { recursive: true });
    const benign = junctionOr(outsideTarget, "benign");
    if (benign) expect(await isRevisionOwnedPath(join(benign, "x.mp4")), "junction to an ordinary directory").toBe(false);
    const doomed = join(linkTmp, "doomed");
    mkdirSync(doomed, { recursive: true });
    const dangling = junctionOr(doomed, "dangling");
    if (dangling) {
      rmSync(doomed, { recursive: true, force: true });
      expect(await isRevisionOwnedPath(join(dangling, "x.mp4")), "a dangling junction fails closed").toBe(true);
      // lead-24 F-2: it is refused as unresolvable, with a path-free error code name.
      const verdict = await revisionPathVerdict(join(dangling, "x.mp4"));
      expect(verdict?.reason).toBe("unresolvable");
      expect(verdict && "errorCode" in verdict ? verdict.errorCode : "").toMatch(/^[A-Z][A-Z0-9_]+$/);
    }
    expect(await revisionPathVerdict(join(namespace, "clip-x", "main.mp4"))).toEqual({ reason: "owned" });
    expect(await revisionPathVerdict(join(exportsDir, "clip_short.mp4"))).toBeNull();

    rmSync(namespace, { recursive: true, force: true });
    expect(await isRevisionOwnedPath(join(namespace, "clip-x", "main.mp4")), "missing namespace root").toBe(true);
    expect(await revisionPathVerdict(join(namespace, "clip-x", "main.mp4")), "a missing root is owned, not unresolvable").toEqual({ reason: "owned" });
  });

  it("an entry through a dangling junction is refused with the could-not-confirm message; owned pointers keep theirs (lead-24 F-2)", async () => {
    const nsFile = join(namespace, "clip-x", "main.mp4");
    seed([legacy("ptr-owned", { output_path: nsFile }), legacy("ptr-ok")]);
    const doomed = join(linkTmp, "doomed-remove");
    mkdirSync(doomed, { recursive: true });
    const dangling = junctionOr(doomed, "dangling-remove");
    if (!dangling) return; // non-Windows without symlink privilege: covered by Python and the HTTP check
    rmSync(doomed, { recursive: true, force: true });
    const list = entries();
    list.push(legacy("ptr-dangling", { output_path: join(dangling, "x_short.mp4") }));
    writeFileSync(historyPath, JSON.stringify(list, null, 2));
    const before = tree();
    const refusal = await history.remove("ptr-dangling").catch((err) => err);
    expect([refusal.code, refusal.reason, refusal.message]).toEqual(["REVISION_PATH_PROTECTED", "unresolvable", fence.FENCE_MESSAGES.unresolvable]);
    expect(refusal.errorCode).toMatch(/^[A-Z][A-Z0-9_]+$/);
    const owned = await history.remove("ptr-owned").catch((err) => err);
    expect([owned.code, owned.reason, owned.message, owned.errorCode]).toEqual(["REVISION_PATH_PROTECTED", "owned", fence.FENCE_MESSAGES.owned, undefined]);
    expect(tree()).toEqual(before);
    expect((await history.remove("ptr-ok"))?.id).toBe("ptr-ok");
  });

  it("an untracked entry pointing into either tree, directly or through a link, is not removed", async () => {
    const nsFile = join(namespace, "clip-x", "main.mp4");
    const docFile = join(sidecarTree, "clip-x", "rev.json");
    const pointers: Array<[string, string]> = [["namespace", nsFile], ["sidecar tree", docFile]];
    if (process.platform === "win32") pointers.push(["case variant", join(exportsDir, "Writing-Studio", "clip-x", "main.mp4")]);
    // seed() creates the owned files (the case variant reuses the namespace file).
    seed([...pointers.map(([label, output], i) => legacy(`ptr-${i}`, { title: label, output_path: output })), legacy("clip-ok")]);
    const alias = junctionOr(join(namespace, "clip-x"), "pointer-alias");
    if (alias) {
      pointers.push(["junction alias", join(alias, "main.mp4")]);
      const list = entries();
      list.push(legacy(`ptr-${pointers.length - 1}`, { title: "junction alias", output_path: join(alias, "main.mp4") }));
      writeFileSync(historyPath, JSON.stringify(list, null, 2));
    }
    const before = tree();
    for (const [i, [label]] of pointers.entries()) {
      await expect(history.remove(`ptr-${i}`), label).rejects.toMatchObject({ code: "REVISION_PATH_PROTECTED" });
    }
    expect(tree()).toEqual(before);
    expect(entries()).toHaveLength(pointers.length + 1);
    // The outside-tree control proceeds.
    expect((await history.remove("clip-ok"))?.id).toBe("clip-ok");
    expect(existsSync(join(exportsDir, "clip-ok_short.mp4"))).toBe(false);
  });
});

describe("the fenced field set", () => {
  it("names the same directories the save service owns", () => {
    expect(FENCE_NAMESPACE_DIR).toBe(REVISION_NAMESPACE);
    expect(FENCE_SIDECAR_DIR).toBe(REVISION_SIDECARS);
  });

  it("covers every field a revision commit writes: tracking, card and no-card, bookends and logo on and off, words and none", async () => {
    seed([legacy("clip-c", { logo_path: logo, intro_path: intro, outro_path: outro, logo_position: "top-left" })]);
    const svc = new ClipRevisionService({ history, render: fakeExactRender(), probe: fakeProbe, compose: fakeCompose(), streams: fakeStreams });
    const written = new Set<string>();
    const diff = (a: any, b: any) => {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) written.add(key);
      }
    };
    const recipe = (over: Record<string, unknown> = {}) => ({
      source_video: source, title: "Fence", keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }],
      caption_style: "karaoke", crop_strategy: "center", format: "vertical" as const, clean_fillers: false, ...over,
    });
    const WORDS = ["red", "green", "blue", "yellow", "cyan", "magenta"].map((word, i) => ({ word, start: i + 0.2, end: i + 0.7, confidence: 1 }));
    let before = entryOf("clip-c");
    await svc.ensureTracked("clip-c");
    diff(before, entryOf("clip-c"));
    const commits: Array<Record<string, unknown>> = [
      { recipe: recipe({ logo_path: logo, intro_path: intro, outro_path: outro, logo_position: "bottom-right", caption_style: "hormozi", format: "square", crop_strategy: "face" }), source_words: WORDS, thumbnail_card: { image_path: card, image_sha256: sha256(card), placement: "opening", duration: 1.5 } },
      { recipe: recipe({ keep_segments: [{ start: 2, end: 3 }] }), source_words: null },
      { recipe: recipe({ logo_path: logo }), source_words: WORDS },
    ];
    for (const [i, request] of commits.entries()) {
      before = entryOf("clip-c");
      const r = await svc.saveRevision({ clip_id: "clip-c", operation_id: `op-${i}`, expected: { incarnation: before.revisions.incarnation, draft_version: before.revisions.draft_version, revision_version: before.revisions.revision_version }, ...request } as any);
      expect(r.outcome, JSON.stringify(r.operation)).toBe("committed");
      diff(before, entryOf("clip-c"));
    }
    const unfenced = [...written].filter((key) => !REVISION_OWNED_FIELDS.includes(key));
    expect(unfenced, `revision commits wrote unfenced fields: ${unfenced.join(", ")}`).toEqual([]);
    // The commits really exercised the projection, so the check above is not vacuous.
    for (const key of ["revisions", "output_path", "thumbnail_config", "logo_path", "intro_path", "transcript_slice", "keep_segments"]) {
      expect(written.has(key), key).toBe(true);
    }
  });

  it("is the set the Python writer fences, with the same directory names and messages", () => {
    const code = [
      "import json, sys",
      `sys.path.insert(0, ${JSON.stringify(join(projectRoot, "backend"))})`,
      "from services import clips_history as ch",
      "print(json.dumps({'fields': list(ch.REVISION_OWNED_FIELDS), 'namespace': ch.REVISION_NAMESPACE_DIR, 'sidecars': ch.REVISION_SIDECAR_DIR, 'messages': ch.FENCE_MESSAGES}))",
    ].join("\n");
    const out = JSON.parse(execFileSync(paths.pythonPath, ["-c", code], { encoding: "utf-8", env: { ...process.env, PYTHONUTF8: "1" }, windowsHide: true }));
    expect([...out.fields].sort()).toEqual([...REVISION_OWNED_FIELDS].sort());
    expect(out.fields).toHaveLength(new Set(out.fields).size);
    expect([out.namespace, out.sidecars]).toEqual([FENCE_NAMESPACE_DIR, FENCE_SIDECAR_DIR]);
    // lead-24: the web server recognises the unresolvable wording in CLI output, so the texts must match exactly.
    expect(out.messages).toEqual({ ...fence.FENCE_MESSAGES });
  });

  it("refuses a caller-supplied revisions field in record() and writes nothing (lead-24)", async () => {
    const base = legacy("new-clip");
    const { id: _id, created_at: _created, ...fields } = base;
    for (const value of [{ schema: 1 }, undefined, null]) {
      const before = historyBytes();
      const refusal = await history.record({ ...fields, revisions: value } as any).catch((err) => err);
      expect([refusal.code, refusal.message], JSON.stringify(value)).toEqual(["CLIP_REVISION_TRACKED", fence.FENCE_MESSAGES.start]);
      expect(historyBytes()).toEqual(before);
    }
    // A missing history file stays missing.
    rmSync(historyPath);
    await expect(history.record({ ...fields, revisions: { schema: 1 } } as any)).rejects.toMatchObject({ code: "CLIP_REVISION_TRACKED" });
    expect(existsSync(historyPath)).toBe(false);
    // Without the field, record() is unchanged.
    const recorded = await history.record(fields as any);
    expect(entries().map((e) => e.id)).toEqual([recorded.id]);
    expect("revisions" in entryOf(recorded.id)).toBe(false);
  });

  it("keeps the save service out of the legacy writers' imports", () => {
    for (const file of ["src/services/clip-write-fence.ts", "src/services/clips-history.ts", "src/ui/clip-write-fence-route.ts"]) {
      const code = readFileSync(join(projectRoot, file), "utf-8");
      expect(code, file).not.toMatch(/from\s+["'][^"']*services\/clip-revisions(\.js)?["']|from\s+["']\.\/clip-revisions(\.js)?["']/);
    }
  });
});
