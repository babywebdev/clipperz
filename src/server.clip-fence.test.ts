import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, relative } from "path";

// Writing Studio 1B.2b.3 (B2B3-1, B2B3-4): the MCP clip_history delete action
// is blocked by the local tool allowlist, so it is exercised here with the
// local policy off. A tracked clip, or an untracked one whose files lie in a
// revision-owned tree, is answered with refusal text and nothing is deleted.

const tmp = mkdtempSync(join(tmpdir(), "podcli-fence-mcp-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = join(tmp, "data");
process.env.PODCLI_OUTPUT = join(tmp, "exports");

const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
const { createServer } = await import("./server.js");
const { ClipsHistory } = await import("./services/clips-history.js");
const { ClipRevisionService } = await import("./services/clip-revisions.js");
const { FENCE_MESSAGES } = await import("./services/clip-write-fence.js");

const historyDir = join(tmp, "history");
const historyPath = join(historyDir, "clips.json");
const exportsDir = join(tmp, "exports");
const nsFile = join(exportsDir, "writing-studio", "clip-z", "main.mp4");
const sha256 = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const ids = () => (JSON.parse(readFileSync(historyPath, "utf-8")) as any[]).map((e) => e.id);
function tree(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const item of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, item.name);
      if (item.name.endsWith(".lock")) continue;
      if (item.isDirectory()) walk(p);
      else out[relative(tmp, p)] = sha256(p);
    }
  };
  walk(tmp);
  return out;
}

const clip = (id: string, output: string, over: Record<string, unknown> = {}) => ({
  id, source_video: join(tmp, "source.mp4"), start_second: 1, end_second: 5, caption_style: "karaoke", crop_strategy: "center",
  format: "vertical", title: `Clip ${id}`, output_path: output, file_size_mb: 0.01, duration: 4, created_at: "2026-09-01T00:00:00.000Z", ...over,
});

beforeEach(async () => {
  rmSync(historyDir, { recursive: true, force: true });
  rmSync(exportsDir, { recursive: true, force: true });
  mkdirSync(dirname(nsFile), { recursive: true });
  writeFileSync(nsFile, "owned");
  const list = [
    clip("aaaa1111-tracked", join(exportsDir, "tracked_short.mp4")),
    clip("bbbb2222-malformed", join(exportsDir, "malformed_short.mp4"), { revisions: { unexpected: true } }),
    clip("cccc3333-pointer", nsFile),
    clip("dddd4444-plain", join(exportsDir, "plain_short.mp4")),
  ];
  for (const e of list) if (e.output_path !== nsFile) { mkdirSync(dirname(e.output_path), { recursive: true }); writeFileSync(e.output_path, e.id); }
  mkdirSync(historyDir, { recursive: true });
  writeFileSync(historyPath, JSON.stringify(list, null, 2));
  await new ClipRevisionService({ history: new ClipsHistory() }).ensureTracked("aaaa1111-tracked");
});
afterEach(() => { vi.unstubAllEnvs(); });

async function withClient<T>(fn: (client: InstanceType<typeof Client>) => Promise<T>): Promise<T> {
  const server = createServer();
  const client = new Client({ name: "fence-test", version: "1" });
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return await fn(client);
  } finally {
    await client.close();
    await server.close();
  }
}
const text = (r: any) => (r.content as Array<{ text: string }>).map((c) => c.text).join("\n");

describe("MCP clip_history delete", () => {
  it("refuses tracked clips (full id or prefix) and owned-tree pointers with refusal text, deleting nothing", async () => {
    vi.stubEnv("PODCLI_LOCAL_ONLY", "");
    await withClient(async (client) => {
      const before = tree();
      for (const [clipId, code] of [
        ["aaaa1111-tracked", "CLIP_REVISION_TRACKED"],
        ["aaaa1111", "CLIP_REVISION_TRACKED"],
        ["bbbb2222-malformed", "CLIP_REVISION_TRACKED"],
        ["cccc3333-pointer", "REVISION_PATH_PROTECTED"],
      ]) {
        const r: any = await client.callTool({ name: "clip_history", arguments: { action: "delete", clip_id: clipId } });
        expect(r.isError, clipId).toBe(true);
        expect(text(r), clipId).toContain(code);
        expect(text(r)).not.toContain(tmp);
        expect(text(r)).not.toContain("\u2014");
      }
      expect(tree()).toEqual(before);
      expect(ids()).toEqual(["aaaa1111-tracked", "bbbb2222-malformed", "cccc3333-pointer", "dddd4444-plain"]);

      // The untracked control is deleted exactly as before.
      const ok: any = await client.callTool({ name: "clip_history", arguments: { action: "delete", clip_id: "dddd4444-plain" } });
      expect(ok.isError).not.toBe(true);
      expect(text(ok)).toContain('Deleted "Clip dddd4444-plain"');
      expect(ids()).not.toContain("dddd4444-plain");
      expect(existsSync(join(exportsDir, "plain_short.mp4"))).toBe(false);
    });
  });

  it("refuses a pointer through a dangling junction with the could-not-confirm text (lead-24 F-2)", async () => {
    vi.stubEnv("PODCLI_LOCAL_ONLY", "");
    // Outside `tmp`, so the byte walker never meets the junction.
    const links = mkdtempSync(join(tmpdir(), "podcli-fence-mcp-links-"));
    const doomed = join(links, "doomed");
    mkdirSync(doomed);
    symlinkSync(doomed, join(links, "dangling"), "junction");
    rmSync(doomed, { recursive: true, force: true });
    const list = JSON.parse(readFileSync(historyPath, "utf-8"));
    list.push(clip("eeee5555-dangling", join(links, "dangling", "x_short.mp4")));
    writeFileSync(historyPath, JSON.stringify(list, null, 2));
    await withClient(async (client) => {
      const before = tree();
      const r: any = await client.callTool({ name: "clip_history", arguments: { action: "delete", clip_id: "eeee5555-dangling" } });
      expect(r.isError).toBe(true);
      expect(text(r)).toBe(`Not deleted (REVISION_PATH_PROTECTED): ${FENCE_MESSAGES.unresolvable}`);
      const owned: any = await client.callTool({ name: "clip_history", arguments: { action: "delete", clip_id: "cccc3333-pointer" } });
      expect(text(owned)).toBe(`Not deleted (REVISION_PATH_PROTECTED): ${FENCE_MESSAGES.owned}`);
      expect(tree()).toEqual(before);
      expect(ids()).toContain("eeee5555-dangling");
    });
  });

  it("stays behind the local tool allowlist, which answers first", async () => {
    vi.stubEnv("PODCLI_LOCAL_ONLY", "1");
    await withClient(async (client) => {
      const before = tree();
      const r: any = await client.callTool({ name: "clip_history", arguments: { action: "delete", clip_id: "aaaa1111-tracked" } });
      expect(r.isError).toBe(true);
      expect(text(r)).not.toContain("CLIP_REVISION_TRACKED");
      expect(tree()).toEqual(before);
    });
  });
});
