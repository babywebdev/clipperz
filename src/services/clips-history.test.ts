import { describe, it, expect, beforeEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync, mkdirSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Isolate PODCLI_HOME before the module (and its paths import) are evaluated.
const tmp = mkdtempSync(join(tmpdir(), "podcli-test-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = tmp;

// Failure injection for the atomic replacement, so a save failure can be
// proven to leave the prior bytes intact and release the lock.
const atomicState = vi.hoisted(() => ({ failNext: false }));
vi.mock("../utils/atomic-file.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/atomic-file.js")>();
  return {
    ...actual,
    writeFileAtomic: async (p: string, d: string) => {
      if (atomicState.failNext) {
        atomicState.failNext = false;
        throw new Error("disk full (injected)");
      }
      return actual.writeFileAtomic(p, d);
    },
  };
});

const { ClipsHistory, HistoryReadError } = await import("./clips-history.js");

const historyDir = join(tmp, "history");
const historyPath = join(historyDir, "clips.json");

function makeFakeOutput(name: string): string {
  const p = join(tmp, name);
  writeFileSync(p, "stub");
  return p;
}

function leftovers(): string[] {
  return readdirSync(historyDir).filter((f) => f !== "clips.json" && !["words", "recipes", "reframe"].includes(f));
}

describe("ClipsHistory", () => {
  let history: InstanceType<typeof ClipsHistory>;

  beforeEach(() => {
    // Reset history dir for each test
    rmSync(historyDir, { recursive: true, force: true });
    mkdirSync(historyDir, { recursive: true });
    history = new ClipsHistory();
  });

  it("records and lists clips", async () => {
    await history.record({
      source_video: "/videos/show.mp4",
      output_path: makeFakeOutput("a.mp4"),
      start_second: 10,
      end_second: 40,
      caption_style: "karaoke",
      crop_strategy: "smart",
      title: "hook A",
    } as any);

    const list = await history.list();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("hook A");
  });

  it("findDuplicate matches within ±2s tolerance", async () => {
    const output = makeFakeOutput("b.mp4");
    await history.record({
      source_video: "/videos/show.mp4",
      output_path: output,
      start_second: 10,
      end_second: 40,
      caption_style: "karaoke",
      crop_strategy: "smart",
      title: "original",
    } as any);

    const dup = await history.findDuplicate("/videos/show.mp4", 11, 41, "karaoke", "smart");
    expect(dup).not.toBeNull();
    expect(dup?.title).toBe("original");

    const miss = await history.findDuplicate("/videos/show.mp4", 15, 45, "karaoke", "smart");
    expect(miss).toBeNull();
  });

  it("findDuplicate ignores entries whose output file is missing", async () => {
    const output = makeFakeOutput("c.mp4");
    await history.record({
      source_video: "/videos/show.mp4",
      output_path: output,
      start_second: 100,
      end_second: 130,
      caption_style: "karaoke",
      crop_strategy: "smart",
      title: "ghost",
    } as any);

    rmSync(output);
    const dup = await history.findDuplicate("/videos/show.mp4", 100, 130, "karaoke", "smart");
    expect(dup).toBeNull();
  });

  it("recordBatchResults skips failed/output-less rows and applies defaults", async () => {
    const ok = makeFakeOutput("batch-ok.mp4");
    const recorded = await history.recordBatchResults(
      [
        { status: "success", output_path: ok, start_second: 5, end_second: 20, title: "kept" },
        { status: "error", error: "boom" },
        { status: "success", title: "no output" },
      ] as any,
      { sourceVideo: "/videos/show.mp4", defaultCaptionStyle: "hormozi", defaultCropStrategy: "speaker" },
    );

    expect(recorded).toHaveLength(1);
    expect(recorded[0].title).toBe("kept");
    expect(recorded[0].caption_style).toBe("hormozi");
    expect(recorded[0].crop_strategy).toBe("speaker");

    const list = await history.list();
    expect(list).toHaveLength(1);
  });

  it("recordBatchResults resolves content_type and transcript_slice per row", async () => {
    const ok = makeFakeOutput("batch-ct.mp4");
    const recorded = await history.recordBatchResults(
      [{ status: "success", output_path: ok, start_second: 0, end_second: 10, title: "ct" }] as any,
      {
        sourceVideo: "/videos/show.mp4",
        transcriptWords: [
          { word: "hello", start: 1, end: 2 },
          { word: "world", start: 3, end: 4 },
          { word: "later", start: 99, end: 100 },
        ] as any,
        contentTypeFor: (s, e) => (s === 0 && e === 10 ? "hook" : undefined),
      },
    );

    expect(recorded[0].content_type).toBe("hook");
    expect(recorded[0].transcript_slice).toBe("hello world");
  });

  it("recordBatchResults tolerates undefined results", async () => {
    const recorded = await history.recordBatchResults(undefined, { sourceVideo: "/videos/show.mp4" });
    expect(recorded).toEqual([]);
  });

  it("serializes concurrent records without losing entries", async () => {
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        history.record({
          source_video: "/videos/show.mp4",
          output_path: makeFakeOutput(`c-${i}.mp4`),
          start_second: i,
          end_second: i + 5,
          caption_style: "karaoke",
          crop_strategy: "smart",
          title: `clip ${i}`,
        } as any),
      ),
    );
    const list = await history.list(100);
    expect(list).toHaveLength(25);
    expect(new Set(list.map((c) => c.id)).size).toBe(25);
  });

  it("findById and update require an exact id (no prefix match)", async () => {
    const rec = await history.record({
      source_video: "/videos/show.mp4",
      output_path: makeFakeOutput("exact.mp4"),
      start_second: 0,
      end_second: 10,
      caption_style: "karaoke",
      crop_strategy: "smart",
      title: "exact",
    } as any);

    expect(await history.findById(rec.id)).toBeDefined();
    expect(await history.findById(rec.id.slice(0, 8))).toBeUndefined();
    expect(await history.findById("")).toBeUndefined();
    expect(await history.update("", { title: "x" })).toBeNull();
    expect(await history.update(rec.id.slice(0, 8), { title: "x" })).toBeNull();
    const ok = await history.update(rec.id, { title: "renamed" });
    expect(ok?.title).toBe("renamed");
  });

  it("resolveId accepts a full id or unambiguous ≥4-char prefix, rejects short/empty", async () => {
    const rec = await history.record({
      source_video: "/videos/show.mp4",
      output_path: makeFakeOutput("resolve.mp4"),
      start_second: 0,
      end_second: 10,
      caption_style: "karaoke",
      crop_strategy: "smart",
      title: "resolve",
    } as any);

    expect(await history.resolveId(rec.id)).toBe(rec.id);
    expect(await history.resolveId(rec.id.slice(0, 8))).toBe(rec.id);
    expect(await history.resolveId("")).toBeNull();
    expect(await history.resolveId(rec.id.slice(0, 2))).toBeNull();
  });

  it("findDuplicate matches by basename, not full path", async () => {
    const output = makeFakeOutput("d.mp4");
    await history.record({
      source_video: "/absolute/path/one/show.mp4",
      output_path: output,
      start_second: 0,
      end_second: 30,
      caption_style: "karaoke",
      crop_strategy: "smart",
      title: "basename test",
    } as any);

    const dup = await history.findDuplicate("/different/path/show.mp4", 0, 30, "karaoke", "smart");
    expect(dup).not.toBeNull();
  });

  it("remove resolves a prefix inside the critical section and rejects ambiguous ones", async () => {
    const a = await history.record({ source_video: "/v.mp4", title: "a" } as any);
    const b = await history.record({ source_video: "/v.mp4", title: "b" } as any);
    // Both ids share a common prefix only if uuids collide; force a shared prefix by rewriting ids.
    const entries = JSON.parse(readFileSync(historyPath, "utf-8"));
    entries[0].id = "prefix-aaaa-1";
    entries[1].id = "prefix-aaaa-2";
    writeFileSync(historyPath, JSON.stringify(entries));
    expect(await history.remove("prefix-aaaa")).toBeNull();
    expect((await history.list()).length).toBe(2);
    expect((await history.remove("prefix-aaaa-1"))?.title).toBe("a");
    expect((await history.list()).map((e) => e.id)).toEqual(["prefix-aaaa-2"]);
    expect(a.id).not.toBe(b.id);
  });
});

describe("ClipsHistory mutation safety", () => {
  let history: InstanceType<typeof ClipsHistory>;

  beforeEach(() => {
    rmSync(historyDir, { recursive: true, force: true });
    mkdirSync(historyDir, { recursive: true });
    history = new ClipsHistory();
    atomicState.failNext = false;
  });

  const seed = [
    { id: "one", title: "first", source_video: "/videos/a.mp4", extra: { keep: [1, 2, { deep: true }] }, order: 1 },
    { id: "two", title: "second", source_video: "/videos/a.mp4", legacy_flag: "yes", order: 2 },
    { id: "three", title: "third", source_video: "/videos/b.mp4", order: 3 },
  ];

  async function expectMutationsAbort(code: string) {
    const before = readFileSync(historyPath);
    for (const attempt of [
      () => history.record({ source_video: "/v.mp4", title: "new" } as any),
      () => history.update("one", { title: "changed" }),
      () => history.remove("one"),
    ]) {
      const p = attempt();
      await expect(p).rejects.toBeInstanceOf(HistoryReadError);
      await p.catch((err: InstanceType<typeof HistoryReadError>) => {
        expect(err.code).toBe(code);
        expect(err.message).toContain("No changes were written");
      });
      expect(readFileSync(historyPath)).toEqual(before);
    }
    expect(leftovers()).toEqual([]);
  }

  it("a missing file initializes empty on the first record", async () => {
    expect(existsSync(historyPath)).toBe(false);
    await history.record({ source_video: "/v.mp4", title: "first" } as any);
    expect(JSON.parse(readFileSync(historyPath, "utf-8"))).toHaveLength(1);
  });

  it("invalid JSON aborts every mutation and leaves the bytes untouched", async () => {
    writeFileSync(historyPath, '[{"id": "one", "title": "first"', "utf-8");
    await expectMutationsAbort("HISTORY_INVALID_JSON");
  });

  it("a non-array top level aborts every mutation", async () => {
    writeFileSync(historyPath, JSON.stringify({ clips: seed }), "utf-8");
    await expectMutationsAbort("HISTORY_INVALID_SHAPE");
  });

  it("an entry without a string id aborts every mutation and names the entry", async () => {
    writeFileSync(historyPath, JSON.stringify([seed[0], { title: "no id" }]), "utf-8");
    await expectMutationsAbort("HISTORY_INVALID_SHAPE");
    await history.update("one", { title: "x" }).catch((err: Error) => {
      expect(err.message).toContain("entry 1");
    });
  });

  it("an unreadable path (a directory where the file should be) aborts mutation", async () => {
    mkdirSync(historyPath);
    const p = history.update("one", { title: "x" });
    await expect(p).rejects.toMatchObject({ code: "HISTORY_UNREADABLE" });
    expect(existsSync(historyPath)).toBe(true);
    expect(leftovers()).toEqual([]);
  });

  // Same bytes as the Python suite: a lone 0xFF inside a JSON string.
  const invalidUtf8 = Buffer.concat([Buffer.from('[{"id":"a","title":"'), Buffer.from([0xff]), Buffer.from('"}]')]);

  it("invalid UTF-8 aborts every mutation with a typed error and leaves the bytes untouched", async () => {
    writeFileSync(historyPath, invalidUtf8);
    await expectMutationsAbort("HISTORY_INVALID_ENCODING");
    await history.update("a", { description: "review" } as any).catch((err: Error) => {
      expect(err.message).toContain("not valid UTF-8");
    });
    expect(readFileSync(historyPath).equals(invalidUtf8)).toBe(true);
    // Listing stays lenient and still does not touch the file.
    expect(await history.list()).toEqual([]);
    expect(readFileSync(historyPath).equals(invalidUtf8)).toBe(true);
  });

  it("genuine UTF-8, including a literal replacement character, survives an unrelated edit", async () => {
    const entries = [{ id: "a", title: "café � \u{1F3AC}" }, { id: "b", title: "b" }];
    writeFileSync(historyPath, JSON.stringify(entries), "utf-8");
    expect((await history.update("b", { description: "d" } as any))?.description).toBe("d");
    const after = JSON.parse(readFileSync(historyPath, "utf-8"));
    expect(after[0]).toEqual(entries[0]);
    expect(readFileSync(historyPath).includes(Buffer.from("café � \u{1F3AC}", "utf-8"))).toBe(true);
  });

  it("a BOM-prefixed valid file is accepted", async () => {
    writeFileSync(historyPath, "﻿" + JSON.stringify(seed), "utf-8");
    expect((await history.update("two", { title: "edited" }))?.title).toBe("edited");
    expect(JSON.parse(readFileSync(historyPath, "utf-8"))[1].title).toBe("edited");
  });

  it("readers stay lenient: an invalid file lists as empty instead of throwing", async () => {
    writeFileSync(historyPath, "{not json", "utf-8");
    expect(await history.list()).toEqual([]);
    expect(await history.findById("one")).toBeUndefined();
    expect(readFileSync(historyPath, "utf-8")).toBe("{not json");
  });

  it("update preserves unknown nested fields, untouched entries and list order", async () => {
    writeFileSync(historyPath, JSON.stringify(seed), "utf-8");
    await history.update("two", { title: "renamed", description: "d" } as any);
    const after = JSON.parse(readFileSync(historyPath, "utf-8"));
    expect(after.map((e: any) => e.id)).toEqual(["one", "two", "three"]);
    expect(after[0]).toEqual(seed[0]);
    expect(after[2]).toEqual(seed[2]);
    expect(after[1]).toEqual({ ...seed[1], title: "renamed", description: "d" });
  });

  it("an update for a missing id is a no-op that does not rewrite the file", async () => {
    writeFileSync(historyPath, JSON.stringify(seed), "utf-8");
    const before = readFileSync(historyPath);
    expect(await history.update("missing", { title: "x" })).toBeNull();
    expect(readFileSync(historyPath)).toEqual(before);
  });

  it("a failed atomic save keeps the prior bytes, surfaces the error and releases the lock", async () => {
    writeFileSync(historyPath, JSON.stringify(seed), "utf-8");
    const before = readFileSync(historyPath);
    atomicState.failNext = true;
    await expect(history.update("one", { title: "lost" })).rejects.toThrow("disk full (injected)");
    expect(readFileSync(historyPath)).toEqual(before);
    expect(leftovers()).toEqual([]);
    // The lock was released: the next mutation proceeds and lands.
    expect((await history.update("one", { title: "kept" }))?.title).toBe("kept");
    expect(JSON.parse(readFileSync(historyPath, "utf-8"))[0].title).toBe("kept");
  });

  it("a delete followed by a queued update cannot resurrect the entry", async () => {
    writeFileSync(historyPath, JSON.stringify(seed), "utf-8");
    const [removed, updated] = await Promise.all([
      history.remove("two"),
      history.update("two", { title: "zombie" }),
    ]);
    expect(removed?.id).toBe("two");
    expect(updated).toBeNull();
    expect(JSON.parse(readFileSync(historyPath, "utf-8")).map((e: any) => e.id)).toEqual(["one", "three"]);
  });
});
