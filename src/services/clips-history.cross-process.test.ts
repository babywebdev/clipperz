import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync, mkdirSync, existsSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { spawn, type ChildProcess } from "child_process";

// Real TS and Python processes against one isolated history file. Proves the
// shared mutation lock rather than relying on timing luck: holders block
// other processes deterministically, crashes are recovered, and a stress mix
// of appends and updates from four processes loses nothing.

const tmp = mkdtempSync(join(tmpdir(), "podcli-xproc-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = tmp;

const { ClipsHistory, FileLockError } = await import("./clips-history.js");
const { paths } = await import("../config/paths.js");
const { withFileLock, lockPathFor } = await import("../utils/mutation-lock.js");

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tsx = join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
const nodeWorker = join(projectRoot, "scripts", "verification", "fixtures", "history-worker.ts");
const pyWorker = join(projectRoot, "scripts", "verification", "fixtures", "history_worker.py");
const python = paths.pythonPath;
const historyDir = join(tmp, "history");
const historyPath = join(historyDir, "clips.json");
const lockPath = lockPathFor(historyPath);

const seed = [
  { id: "seed-a", title: "alpha", source_video: "/videos/a.mp4", extra: { keep: [1, 2, { deep: true }] } },
  { id: "seed-b", title: "beta", source_video: "/videos/a.mp4", legacy_flag: "yes" },
  { id: "seed-c", title: "gamma", source_video: "/videos/b.mp4", metrics: { views: 5 } },
];

function childEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PODCLI_HOME: tmp,
    PODCLI_DATA: tmp,
    PYTHONUTF8: "1",
    PYTHONIOENCODING: "utf-8",
    ...extra,
  };
}

interface Result { code: number | null; stdout: string; stderr: string }

function start(cmd: string, args: string[], env: NodeJS.ProcessEnv): { child: ChildProcess; done: Promise<Result> } {
  const child = spawn(cmd, args, { cwd: projectRoot, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout!.on("data", (d) => (stdout += d));
  child.stderr!.on("data", (d) => (stderr += d));
  const done = new Promise<Result>((res) => child.on("close", (code) => res({ code, stdout, stderr })));
  return { child, done };
}

const runNode = (args: string[], env = childEnv()) => start(process.execPath, [tsx, nodeWorker, ...args], env);
const runPython = (args: string[], env = childEnv()) => start(python, [pyWorker, ...args], env);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(path: string, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(path)) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${path}`);
    await sleep(10);
  }
}

function entries(): any[] {
  return JSON.parse(readFileSync(historyPath, "utf-8"));
}
function leftovers(): string[] {
  return readdirSync(historyDir).filter((f) => f !== "clips.json");
}

describe("clip history across TS and Python processes", () => {
  let history: InstanceType<typeof ClipsHistory>;
  const savedTimeout = process.env.PODCLI_HISTORY_LOCK_TIMEOUT_MS;

  beforeEach(() => {
    rmSync(historyDir, { recursive: true, force: true });
    mkdirSync(historyDir, { recursive: true });
    writeFileSync(historyPath, JSON.stringify(seed, null, 2), "utf-8");
    history = new ClipsHistory();
  });

  afterEach(() => {
    if (savedTimeout === undefined) delete process.env.PODCLI_HISTORY_LOCK_TIMEOUT_MS;
    else process.env.PODCLI_HISTORY_LOCK_TIMEOUT_MS = savedTimeout;
  });

  it("four concurrent processes (2 Python, 2 Node) lose no appends or updates and keep unknown fields", async () => {
    const count = 25;
    const runs = [
      runPython(["stress", "py-a", String(count)]),
      runPython(["stress", "py-b", String(count)]),
      runNode(["stress", "node-a", String(count)]),
      runNode(["stress", "node-b", String(count)]),
    ];
    const results = await Promise.all(runs.map((r) => r.done));
    for (const r of results) expect(r, r.stderr).toMatchObject({ code: 0 });

    const after = entries();
    const byId = new Map(after.map((e) => [e.id, e]));
    const titles = new Set(after.map((e) => e.title));
    for (const name of ["py-a", "py-b", "node-a", "node-b"]) {
      for (let i = 0; i < count; i++) {
        if (i % 5 === 0) {
          // Node's record() assigns its own uuid, so appended rows are found by title.
          expect(titles.has(`${name} ${i}`), `${name} ${i} appended`).toBe(true);
        } else {
          const target = seed[i % seed.length].id;
          expect(byId.get(target)?.[`${name}_${i}`], `${name}_${i} on ${target}`).toBe(i);
        }
      }
    }
    // Seeds keep their unknown nested fields and their relative order.
    expect(byId.get("seed-a").extra).toEqual(seed[0].extra);
    expect(byId.get("seed-b").legacy_flag).toBe("yes");
    expect(byId.get("seed-c").metrics).toEqual({ views: 5 });
    expect(after.slice(0, 3).map((e) => e.id)).toEqual(["seed-a", "seed-b", "seed-c"]);
    expect(leftovers()).toEqual([]);
  }, 120_000);

  it("Node is blocked while a Python process holds the lock, reports the owner, and never steals it", async () => {
    const held = join(tmp, "py-held");
    const release = join(tmp, "py-release");
    rmSync(held, { force: true });
    rmSync(release, { force: true });
    const holder = runPython(["hold", held, release]);
    await waitFor(held);
    // The venv python.exe is a launcher on Windows: the interpreter that holds
    // the lock reports its own pid in the marker, which is the pid to expect.
    const owner = JSON.parse(readFileSync(held, "utf-8"));
    expect(owner.pid).toBeGreaterThan(0);
    expect(owner.pid).not.toBe(process.pid);

    process.env.PODCLI_HISTORY_LOCK_TIMEOUT_MS = "300";
    const before = readFileSync(historyPath);
    const attempt = history.update("seed-a", { title: "blocked" });
    await expect(attempt).rejects.toBeInstanceOf(FileLockError);
    await attempt.catch((err: InstanceType<typeof FileLockError>) => {
      expect(err.owner?.pid).toBe(owner.pid);
      expect(err.owner?.tool).toBe("clipperz-test-hold");
      expect(err.message).toContain(String(owner.pid));
    });
    expect(readFileSync(historyPath)).toEqual(before);
    expect(JSON.parse(readFileSync(lockPath, "utf-8")).token).toBe(owner.token);

    writeFileSync(release, "go");
    const result = await holder.done;
    expect(result, result.stderr).toMatchObject({ code: 0 });
    expect(JSON.parse(result.stdout)).toEqual({ held: true, released: "ok" });
    expect(existsSync(lockPath)).toBe(false);

    delete process.env.PODCLI_HISTORY_LOCK_TIMEOUT_MS;
    expect((await history.update("seed-a", { title: "after" }))?.title).toBe("after");
    expect(entries()[0].title).toBe("after");
  }, 60_000);

  it("Python is blocked while Node holds the lock, fails closed with the owner, then succeeds after release", async () => {
    const before = readFileSync(historyPath);
    const blocked = await withFileLock(historyPath, async () => {
      const r = await runPython(["update", "seed-b", "title", "blocked"], childEnv({ PODCLI_HISTORY_LOCK_TIMEOUT_MS: "300" })).done;
      return r;
    }, { tool: "clipperz-studio" });
    expect(blocked.code).toBe(2);
    expect(blocked.stderr).toContain("HistoryLockError");
    expect(blocked.stderr).toContain(String(process.pid));
    expect(blocked.stderr).toContain("clipperz-studio");
    expect(readFileSync(historyPath)).toEqual(before);
    expect(existsSync(lockPath)).toBe(false);

    const ok = await runPython(["update", "seed-b", "title", "from-python"]).done;
    expect(ok, ok.stderr).toMatchObject({ code: 0 });
    expect(JSON.parse(ok.stdout).title).toBe("from-python");
    expect(entries()[1]).toEqual({ ...seed[1], title: "from-python" });
  }, 60_000);

  it("a Python holder that crashes is recovered by Node; a Node holder that crashes is recovered by Python", async () => {
    // Python crashes while holding.
    let held = join(tmp, "py-crash-held");
    rmSync(held, { force: true });
    const pyHolder = runPython(["hold", held, join(tmp, "never-released")]);
    await waitFor(held);
    pyHolder.child.kill();
    await pyHolder.done;
    expect(existsSync(lockPath)).toBe(true);
    expect((await history.update("seed-c", { title: "recovered-by-node" }))?.title).toBe("recovered-by-node");
    expect(existsSync(lockPath)).toBe(false);

    // Node crashes while holding.
    held = join(tmp, "node-crash-held");
    rmSync(held, { force: true });
    const nodeHolder = runNode(["hold", held, join(tmp, "never-released")]);
    await waitFor(held);
    nodeHolder.child.kill();
    await nodeHolder.done;
    expect(existsSync(lockPath)).toBe(true);
    const r = await runPython(["update", "seed-c", "title", "recovered-by-python"]).done;
    expect(r, r.stderr).toMatchObject({ code: 0 });
    expect(entries()[2].title).toBe("recovered-by-python");
    expect(existsSync(lockPath)).toBe(false);
    expect(leftovers()).toEqual([]);
  }, 60_000);

  it("a delete and an update from two Node processes cannot resurrect the entry", async () => {
    const [del, upd] = await Promise.all([
      runNode(["delete", "seed-b"]).done,
      runNode(["update", "seed-b", "title", "zombie"]).done,
    ]);
    expect(del, del.stderr).toMatchObject({ code: 0 });
    expect(upd, upd.stderr).toMatchObject({ code: 0 });
    expect(JSON.parse(del.stdout)?.id).toBe("seed-b");
    expect(entries().map((e) => e.id)).toEqual(["seed-a", "seed-c"]);
  }, 60_000);

  it("a Python delete racing a Node update cannot resurrect the entry", async () => {
    const [del, upd] = await Promise.all([
      runPython(["delete", "seed-a"]).done,
      runNode(["update", "seed-a", "title", "zombie"]).done,
    ]);
    expect(del, del.stderr).toMatchObject({ code: 0 });
    expect(upd, upd.stderr).toMatchObject({ code: 0 });
    expect(entries().map((e) => e.id)).toEqual(["seed-b", "seed-c"]);
  }, 60_000);
});
