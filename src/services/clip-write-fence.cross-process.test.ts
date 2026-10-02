import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

// Writing Studio 1B.2b.3 (B2B3-2): a real second process contends with a TS
// transaction that tracks the clip. The CLI finishes its unlocked lookup while
// the clip is still untracked and then waits on the shared lock; the TS
// transaction lands tracking and releases; the CLI's locked check refuses.
// A marker written by the probe just before it asks for the lock makes the
// ordering deterministic rather than a timing guess.

const tmp = mkdtempSync(join(tmpdir(), "podcli-fence-xproc-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = join(tmp, "data");
process.env.PODCLI_OUTPUT = join(tmp, "exports");

const { ClipsHistory } = await import("./clips-history.js");
const { ClipRevisionService } = await import("./clip-revisions.js");
const { paths } = await import("../config/paths.js");

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const probe = join(projectRoot, "scripts", "verification", "fixtures", "cli_lock_probe.py");
const historyDir = join(tmp, "history");
const historyPath = join(historyDir, "clips.json");
const output = join(tmp, "exports", "contended_short.mp4");
const entries = () => JSON.parse(readFileSync(historyPath, "utf-8")) as any[];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const seedEntry = {
  id: "contended", source_video: join(tmp, "source.mp4"), start_second: 1, end_second: 5, caption_style: "karaoke",
  crop_strategy: "center", format: "vertical", title: "Contended", output_path: output, file_size_mb: 0.01, duration: 4,
  created_at: "2026-09-01T00:00:00.000Z", thumbnail_config: { card_seconds: 0 },
};

function runProbe(marker: string, args: string[]) {
  const child = spawn(paths.pythonPath, [probe, marker, ...args], {
    cwd: projectRoot, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PODCLI_HOME: tmp, PODCLI_DATA: join(tmp, "data"), PODCLI_OUTPUT: join(tmp, "exports"), PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d) => (stdout += d));
  child.stderr.on("data", (d) => (stderr += d));
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((res) => child.on("close", (code) => res({ code, stdout, stderr: stderr.replace(/\x1b\[[0-9;]*m/g, "") })));
}

beforeEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(historyDir, { recursive: true });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, "legacy media");
  writeFileSync(historyPath, JSON.stringify([seedEntry], null, 2));
});

describe("a CLI writer contending with a TS transaction that tracks the clip", () => {
  for (const [label, args] of [
    ["clips edit --caption-style", ["clips", "edit", "contended", "--caption-style", "hormozi"]],
    ["clips edit --thumbnail-config", ["clips", "edit", "contended", "--thumbnail-config", '{"card_seconds":1.5}']],
    ["clips delete --yes", ["clips", "delete", "contended", "--yes"]],
  ] as const) {
    it(`${label}: passes its unlocked lookup, waits, then refuses under the lock`, async () => {
      const marker = join(tmp, `marker-${label.replace(/\W+/g, "-")}`);
      const history = new ClipsHistory();
      let pending!: ReturnType<typeof runProbe>;
      // The real ensureTracked, held open until the CLI is waiting on the lock.
      const heldHistory = {
        transaction: <T>(fn: (e: any[]) => T | Promise<T>) => history.transaction(async (list) => {
          const result = await fn(list);
          pending = runProbe(marker, [...args]);
          for (let i = 0; !existsSync(marker); i++) {
            if (i > 600) throw new Error("the CLI never reached the lock");
            await sleep(50);
          }
          // Still untracked on disk: the file is rewritten only when this transaction returns.
          expect(JSON.parse(readFileSync(historyPath, "utf-8"))[0].revisions).toBeUndefined();
          return result;
        }),
        findById: (id: string) => history.findById(id),
      };
      await new ClipRevisionService({ history: heldHistory as any }).ensureTracked("contended");
      const landed = entries()[0];
      expect(landed.revisions).toBeTruthy();

      const r = await pending;
      expect(r.code, r.stderr).not.toBe(0);
      expect(r.stderr).toMatch(/^\s*✗\s+CLIP_REVISION_TRACKED:/m);
      expect(r.stderr).not.toContain(tmp);
      expect(entries()).toEqual([landed]);
      expect(readFileSync(output, "utf-8")).toBe("legacy media");
    }, 60_000);
  }
});
