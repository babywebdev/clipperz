import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { spawn, type ChildProcess } from "child_process";

// Writing Studio 1B.2a: real process interruption and cross-language
// mutation around a revision save. A worker process (tsx) runs the service
// with the fake exact renderer and ends itself with SIGKILL before or after
// the history commit; a Python process mutates the same clip through its
// production history path while a save is pending. The parent inspects the
// history file and replays operations from a fresh process.

const tmp = mkdtempSync(join(tmpdir(), "podcli-revproc-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = join(tmp, "data");
process.env.PODCLI_OUTPUT = join(tmp, "exports");

const { ClipsHistory } = await import("./clips-history.js");
const { ClipRevisionService, REVISION_NAMESPACE } = await import("./clip-revisions.js");
const { fakeExactRender, fakeProbe } = await import("./clip-revisions.test-support.js");
const { paths } = await import("../config/paths.js");

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tsx = join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
const worker = join(projectRoot, "scripts", "verification", "fixtures", "revision-worker.ts");
const pyWorker = join(projectRoot, "scripts", "verification", "fixtures", "history_worker.py");
const historyDir = join(tmp, "history");
const historyPath = join(historyDir, "clips.json");
const exportsDir = join(tmp, "exports");
const source = join(tmp, "source.mp4");
const legacyOutput = join(exportsDir, "legacy_short.mp4");
const namespace = join(exportsDir, REVISION_NAMESPACE, "clip-p");

const seed = [
  { id: "clip-p", source_video: source, start_second: 1, end_second: 2, caption_style: "karaoke", crop_strategy: "center", format: "vertical", title: "Process clip", output_path: legacyOutput, file_size_mb: 0.01, duration: 1, created_at: "2026-09-01T00:00:00.000Z", extra: { keep: [1, { deep: true }] } },
  { id: "seed-b", title: "beta", source_video: source, legacy_flag: "yes" },
];

function childEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { ...process.env, PODCLI_HOME: tmp, PODCLI_DATA: join(tmp, "data"), PODCLI_OUTPUT: exportsDir, CLIPPERZ_TEST_SOURCE: source, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8", ...extra };
}
interface Result { code: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }
function start(cmd: string, args: string[], env = childEnv()): { child: ChildProcess; done: Promise<Result> } {
  const child = spawn(cmd, args, { cwd: projectRoot, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout!.on("data", (d) => (stdout += d));
  child.stderr!.on("data", (d) => (stderr += d));
  const done = new Promise<Result>((res) => child.on("close", (code, signal) => res({ code, signal, stdout, stderr })));
  return { child, done };
}
const runWorker = (args: string[]) => start(process.execPath, [tsx, worker, ...args]);
const runPython = (args: string[], env = childEnv()) => start(paths.pythonPath, [pyWorker, ...args], env);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(path: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(path)) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${path}`);
    await sleep(10);
  }
}
const entries = () => JSON.parse(readFileSync(historyPath, "utf-8")) as any[];
const clip = () => entries().find((e) => e.id === "clip-p");
const groups = () => (existsSync(namespace) ? readdirSync(namespace).sort() : []);
const out = (r: Result) => JSON.parse(r.stdout.trim().split("\n").pop()!);
const exp = (s: { incarnation: string; draft_version: number; revision_version: number }) => [s.incarnation, String(s.draft_version), String(s.revision_version)];

let history: InstanceType<typeof ClipsHistory>;
let svc: InstanceType<typeof ClipRevisionService>;

beforeEach(async () => {
  rmSync(historyDir, { recursive: true, force: true });
  rmSync(exportsDir, { recursive: true, force: true });
  mkdirSync(historyDir, { recursive: true });
  mkdirSync(exportsDir, { recursive: true });
  writeFileSync(source, "source-bytes");
  writeFileSync(legacyOutput, "legacy-output-bytes");
  writeFileSync(historyPath, JSON.stringify(seed, null, 2), "utf-8");
  history = new ClipsHistory();
  svc = new ClipRevisionService({ history, render: fakeExactRender(), probe: fakeProbe });
  await svc.ensureTracked("clip-p");
});

describe("revision save across real processes", () => {
  it("a worker killed before the history commit leaves the last save intact; replay renders nothing until explicit invalidation", async () => {
    const state = clip().revisions;
    const killed = await runWorker(["save", "clip-p", "op-1", "kill-before-commit", ...exp(state)]).done;
    expect(killed.code === 0 ? "exited 0" : "died").toBe("died");
    const after = clip();
    expect(after.output_path).toBe(legacyOutput);
    expect(after.revisions.current.version).toBe(0);
    expect(after.revisions.operations).toHaveLength(1);
    expect(after.revisions.operations[0]).toMatchObject({ operation_id: "op-1", state: "pending" });
    // The renderer published its group and the document was written: both unreferenced, neither collected.
    expect(groups()).toHaveLength(1);
    expect(readdirSync(join(historyDir, "revisions", "clip-p"))).toHaveLength(1);
    expect(readFileSync(legacyOutput, "utf-8")).toBe("legacy-output-bytes");

    // A fresh process replaying the same operation gets "pending" and renders nothing.
    const replay = await runWorker(["replay", "clip-p", "op-1", ...exp(state)]).done;
    expect(replay, replay.stderr).toMatchObject({ code: 0 });
    expect(out(replay)).toMatchObject({ outcome: "pending", replayed: true, renders: 0 });
    // A different operation is busy until the pending one is invalidated.
    const busy = await runWorker(["save", "clip-p", "op-2", "none", ...exp(state)]).done;
    expect(busy.code).toBe(2);
    expect(JSON.parse(busy.stderr.trim())).toMatchObject({ code: "OPERATION_BUSY" });
    // A cancellation from a process that observed another incarnation touches nothing.
    const stale = await runWorker(["invalidate", "clip-p", "op-1", "not-this-incarnation"]).done;
    expect(out(stale)).toMatchObject({ outcome: "not-owned" });
    expect(clip().revisions.operations[0].state).toBe("pending");
    const inv = await runWorker(["invalidate", "clip-p", "op-1", state.incarnation]).done;
    expect(out(inv)).toMatchObject({ outcome: "invalidated", operation: { state: "cancelled" } });
    const next = await runWorker(["save", "clip-p", "op-2", "none", ...exp(state)]).done;
    expect(next, next.stderr).toMatchObject({ code: 0 });
    expect(out(next)).toMatchObject({ outcome: "committed", replayed: false, renders: 1 });
    expect(clip().revisions.current).toMatchObject({ version: 1, operation_id: "op-2" });
    expect(clip().revisions.previous).toMatchObject({ version: 0, output_path: legacyOutput });
    expect(groups()).toHaveLength(2);
    const late = await runWorker(["replay", "clip-p", "op-1", ...exp(state)]).done;
    expect(out(late)).toMatchObject({ outcome: "cancelled", replayed: true, renders: 0 });
  }, 120_000);

  it("a worker killed after the commit but before acknowledgement left a committed save that a fresh process recovers by replay and reopens", async () => {
    const state = clip().revisions;
    const killed = await runWorker(["save", "clip-p", "op-1", "kill-after-commit", ...exp(state)]).done;
    expect(killed.code === 0 ? "exited 0" : "died").toBe("died");
    const after = clip();
    expect(after.revisions.current).toMatchObject({ version: 1, operation_id: "op-1", provenance: "exact" });
    expect(after.revisions.operations[0]).toMatchObject({ operation_id: "op-1", state: "committed", revision_id: after.revisions.current.revision_id });
    expect(after.output_path).toBe(after.revisions.current.output_path);
    expect(after.extra).toEqual(seed[0].extra);
    const replay = await runWorker(["replay", "clip-p", "op-1", ...exp(state)]).done;
    expect(replay, replay.stderr).toMatchObject({ code: 0 });
    expect(out(replay)).toMatchObject({ outcome: "committed", replayed: true, renders: 0, revision_id: after.revisions.current.revision_id });
    // Reopen after "restart": a fresh process reads the immutable document and rechecks the files.
    const verify = await runWorker(["verify", "clip-p", after.revisions.current.revision_id]).done;
    expect(verify, verify.stderr).toMatchObject({ code: 0 });
    expect(out(verify)).toMatchObject({ version: 1, source_words: 6, content_text: "cyan green", checks: [{ path: after.revisions.current.output_path, ok: true }] });
    expect(groups()).toHaveLength(1);
    expect(readFileSync(legacyOutput, "utf-8")).toBe("legacy-output-bytes");
  }, 120_000);

  it("a Python metadata mutation and a Python lock holder during a pending save are both respected by the commit", async () => {
    const state = clip().revisions;
    const marker = join(tmp, "before-commit");
    const go = join(tmp, "go");
    rmSync(marker, { force: true });
    rmSync(go, { force: true });
    const saving = runWorker(["save", "clip-p", "op-1", "wait-before-commit", ...exp(state), marker, go]);
    await waitFor(marker);
    expect(clip().revisions.operations[0].state).toBe("pending");
    // Production Python mutation path on the same clip while the save is pending.
    const py = await runPython(["update", "clip-p", "py_note", "from-python"]).done;
    expect(py, py.stderr).toMatchObject({ code: 0 });
    expect(clip().py_note).toBe("from-python");
    // A Python holder takes the lock; the commit must wait for it, not bypass it.
    const held = join(tmp, "py-held");
    const release = join(tmp, "py-release");
    rmSync(held, { force: true });
    rmSync(release, { force: true });
    const holder = runPython(["hold", held, release]);
    await waitFor(held);
    writeFileSync(go, "go");
    await sleep(500);
    expect(saving.child.exitCode).toBeNull();
    expect(clip().revisions.current.version).toBe(0);
    writeFileSync(release, "go");
    expect((await holder.done).code).toBe(0);
    const saved = await saving.done;
    expect(saved, saved.stderr).toMatchObject({ code: 0 });
    expect(out(saved)).toMatchObject({ outcome: "committed", renders: 1 });
    const after = clip();
    expect(after.py_note).toBe("from-python");
    expect(after.revisions.current.version).toBe(1);
    expect(after.revisions.operations[0].state).toBe("committed");
    expect(entries().find((e) => e.id === "seed-b")).toEqual(seed[1]);
    expect(existsSync(join(historyDir, "clips.json.lock"))).toBe(false);
  }, 120_000);

  it("a draft saved from another process while a render is pending supersedes it, and a concurrent save is busy", async () => {
    const state = clip().revisions;
    const marker = join(tmp, "before-render");
    const go = join(tmp, "go2");
    rmSync(marker, { force: true });
    rmSync(go, { force: true });
    const saving = runWorker(["save", "clip-p", "op-1", "wait-before-render", ...exp(state), marker, go]);
    await waitFor(marker);
    const busy = await runWorker(["save", "clip-p", "op-2", "none", ...exp(state)]).done;
    expect(busy.code).toBe(2);
    expect(JSON.parse(busy.stderr.trim())).toMatchObject({ code: "OPERATION_BUSY" });
    const draft = await runWorker(["draft", "clip-p", ...exp(state)]).done;
    expect(draft, draft.stderr).toMatchObject({ code: 0 });
    expect(out(draft)).toMatchObject({ superseded_operation: "op-1", draft: { version: 1 } });
    writeFileSync(go, "go");
    const late = await saving.done;
    expect(late, late.stderr).toMatchObject({ code: 0 });
    expect(out(late)).toMatchObject({ outcome: "superseded", renders: 1 });
    const after = clip();
    expect(after.output_path).toBe(legacyOutput);
    expect(after.revisions.current.version).toBe(0);
    expect(after.revisions.draft_version).toBe(1);
    expect(after.revisions.operations[0]).toMatchObject({ operation_id: "op-1", state: "superseded" });
    expect(groups()).toHaveLength(1);
  }, 120_000);
});
