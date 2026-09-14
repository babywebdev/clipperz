import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from "fs";
import { tmpdir, hostname } from "os";
import { join } from "path";
import { spawnSync } from "child_process";

// Deterministic recovery schedules for the mutation lock. Two waiters run in
// this process as separate async "actors"; the fs/promises mock pauses an
// actor at a chosen read or removal so each interleaving is driven by
// barriers, not timing. The lock module itself is unmodified production code.

const harness = await vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import("async_hooks");
  type Hook = (actor: string | undefined, path: string) => Promise<void>;
  return {
    actor: new AsyncLocalStorage<string>(),
    afterRead: null as Hook | null,
    beforeRemove: null as Hook | null,
    removals: [] as Array<{ actor: string | undefined; path: string }>,
  };
});

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  const readFile = (async (path: string, options?: unknown) => {
    const result = await (actual.readFile as (p: string, o?: unknown) => Promise<unknown>)(path, options);
    await harness.afterRead?.(harness.actor.getStore(), String(path));
    return result;
  }) as typeof actual.readFile;
  const rm = (async (path: string, options?: unknown) => {
    harness.removals.push({ actor: harness.actor.getStore(), path: String(path) });
    await harness.beforeRemove?.(harness.actor.getStore(), String(path));
    return (actual.rm as (p: string, o?: unknown) => Promise<void>)(path, options);
  }) as typeof actual.rm;
  return { ...actual, readFile, rm };
});

const { withFileLock, lockPathFor, reclaimPathFor, removeOwned, FileLockError } = await import("./mutation-lock.js");

const dir = mkdtempSync(join(tmpdir(), "podcli-lock-recovery-"));
const target = join(dir, "clips.json");
const lockPath = lockPathFor(target);
const recoveryPath = reclaimPathFor(lockPath);

function record(token: string, pid: number, extra: Partial<{ host: string; tool: string }> = {}) {
  return { pid, host: extra.host ?? hostname(), token, created_at: "2026-01-01T00:00:00Z", tool: extra.tool ?? "x" };
}

function seed(path: string, content: object | string) {
  writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content), "utf-8");
}

function deadPid(): number {
  const r = spawnSync(process.execPath, ["-e", "process.exit(0)"], { windowsHide: true });
  expect(r.status).toBe(0);
  return r.pid;
}

function gate() {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => (open = resolve));
  return { wait: () => promise, open };
}

interface Pause { reached: Promise<void>; resume: () => void }

const pending: Array<{ actor: string; path: string; nth: number; fired: boolean; reached: ReturnType<typeof gate>; resume: ReturnType<typeof gate> }> = [];
const counts = new Map<string, number>();

/** Pause `actor` after its `nth` read of `path`, until `resume()` is called. */
function pauseAt(actor: string, path: string, nth: number): Pause {
  const entry = { actor, path, nth, fired: false, reached: gate(), resume: gate() };
  pending.push(entry);
  return { reached: entry.reached.wait(), resume: entry.resume.open };
}

harness.afterRead = async (actor, path) => {
  if (!actor) return;
  const key = `${actor}|${path}`;
  const n = (counts.get(key) ?? 0) + 1;
  counts.set(key, n);
  for (const p of pending) {
    if (!p.fired && p.actor === actor && p.path === path && p.nth === n) {
      p.fired = true;
      p.reached.open();
      await p.resume.wait();
    }
  }
};

const as = <T>(actor: string, fn: () => Promise<T>) => harness.actor.run(actor, fn);
const removalsBy = (actor: string) => harness.removals.filter((r) => r.actor === actor).map((r) => r.path);

describe("mutation lock recovery schedules", () => {
  beforeEach(() => {
    rmSync(lockPath, { force: true });
    rmSync(recoveryPath, { force: true });
    pending.length = 0;
    counts.clear();
    harness.removals.length = 0;
    harness.beforeRemove = null;
  });

  afterEach(() => {
    for (const p of pending) p.resume.open();
  });

  it("a waiter holding a stale dead-owner read never removes the lock a later owner created", async () => {
    const dead = record("dead", deadPid());
    seed(lockPath, dead);
    const order: string[] = [];

    // B assesses the dead record and pauses before acting on it.
    const bStale = pauseAt("B", lockPath, 1);
    const bUnderRecovery = pauseAt("B", lockPath, 2);
    const bAfterBackoff = pauseAt("B", lockPath, 3);
    const b = as("B", () => withFileLock(target, async () => { order.push("B"); }, { timeoutMs: 5000 }));
    await bStale.reached;

    // A recovers the dead lock and acquires while B is paused.
    const aInside = gate();
    const releaseA = gate();
    const a = as("A", () => withFileLock(target, async () => { order.push("A"); aInside.open(); await releaseA.wait(); }, { timeoutMs: 2000 }));
    await aInside.wait();
    const aRecord = JSON.parse(readFileSync(lockPath, "utf-8"));
    expect(aRecord.pid).toBe(process.pid);
    expect(aRecord.token).not.toBe("dead");
    expect(existsSync(recoveryPath)).toBe(false);

    // B resumes with its stale view, takes the recovery file, and re-reads.
    bStale.resume();
    await bUnderRecovery.reached;
    expect(JSON.parse(readFileSync(recoveryPath, "utf-8")).pid).toBe(process.pid);
    expect(JSON.parse(readFileSync(lockPath, "utf-8")).token).toBe(aRecord.token);
    bUnderRecovery.resume();

    // B backed off: A's lock is intact, B removed only its own recovery file.
    await bAfterBackoff.reached;
    expect(JSON.parse(readFileSync(lockPath, "utf-8")).token).toBe(aRecord.token);
    expect(existsSync(recoveryPath)).toBe(false);
    expect(removalsBy("B")).toEqual([recoveryPath]);
    expect(order).toEqual(["A"]);
    bAfterBackoff.resume();

    releaseA.open();
    await a;
    await b;
    expect(order).toEqual(["A", "B"]);
    expect(existsSync(lockPath)).toBe(false);
    expect(existsSync(recoveryPath)).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("only one waiter recovers at a time; a second waiter never touches the recovery file", async () => {
    seed(lockPath, record("dead", deadPid()));
    const before = readFileSync(lockPath);
    const order: string[] = [];

    // A's second read of the lock is the one under the recovery file.
    const aUnderRecovery = pauseAt("A", lockPath, 2);
    const a = as("A", () => withFileLock(target, async () => { order.push("A"); }, { timeoutMs: 5000 }));
    await aUnderRecovery.reached;
    const recoveryRecord = JSON.parse(readFileSync(recoveryPath, "utf-8"));
    expect(recoveryRecord.pid).toBe(process.pid);

    const b = as("B", () => withFileLock(target, async () => { order.push("B"); }, { timeoutMs: 400 }));
    await expect(b).rejects.toBeInstanceOf(FileLockError);
    await b.catch((err: InstanceType<typeof FileLockError>) => {
      expect(err.code).toBe("LOCK_TIMEOUT");
      expect(err.owner?.token).toBe("dead");
      expect(err.message).toContain(recoveryPath);
      expect(err.message).toContain("recovery in progress");
      expect(err.message).toContain(String(process.pid));
    });
    expect(readFileSync(lockPath)).toEqual(before);
    expect(JSON.parse(readFileSync(recoveryPath, "utf-8")).token).toBe(recoveryRecord.token);
    expect(removalsBy("B")).toEqual([]);
    expect(readdirSync(dir).sort()).toEqual(["clips.json.lock", "clips.json.lock.reclaim"]);

    aUnderRecovery.resume();
    await a;
    expect(order).toEqual(["A"]);
    expect(existsSync(lockPath)).toBe(false);
    expect(existsSync(recoveryPath)).toBe(false);
  });

  it("an orphaned recovery file fails closed, names both files, and is never taken over", async () => {
    const dead = record("dead", deadPid());
    for (const orphan of [record("crashed-reclaimer", deadPid(), { tool: "clipperz-cli" }), ""] as const) {
      seed(lockPath, dead);
      seed(recoveryPath, orphan);
      const lockBefore = readFileSync(lockPath);
      const recoveryBefore = readFileSync(recoveryPath);
      let ran = false;
      const attempt = as("W", () => withFileLock(target, async () => { ran = true; }, { timeoutMs: 400 }));
      await expect(attempt).rejects.toBeInstanceOf(FileLockError);
      await attempt.catch((err: InstanceType<typeof FileLockError>) => {
        expect(err.code).toBe("LOCK_TIMEOUT");
        expect(err.owner?.token).toBe("dead");
        expect(err.message).toContain("automatic recovery is blocked");
        expect(err.message).toContain(recoveryPath);
        expect(err.message).toContain(`delete ${recoveryPath} and ${lockPath}`);
        expect(err.message).toContain(orphan === "" ? "no readable owner record" : "no longer running");
      });
      expect(ran).toBe(false);
      expect(readFileSync(lockPath)).toEqual(lockBefore);
      expect(readFileSync(recoveryPath)).toEqual(recoveryBefore);
      expect(removalsBy("W")).toEqual([]);
      harness.removals.length = 0;
    }

    // Manual recovery: removing the orphan lets the dead lock be reclaimed.
    rmSync(recoveryPath);
    expect(await withFileLock(target, async () => "recovered", { timeoutMs: 2000 })).toBe("recovered");
    expect(existsSync(lockPath)).toBe(false);
    expect(existsSync(recoveryPath)).toBe(false);
  });

  it("a live owner is never displaced during recovery of a dead lock that was replaced meanwhile", async () => {
    // A reads a dead record, then before A can take the recovery file the dead
    // lock is replaced by a live one (as if its owner had released and another
    // process acquired). A must not remove the live lock.
    seed(lockPath, record("dead", deadPid()));
    const aStale = pauseAt("A", lockPath, 1);
    const a = as("A", () => withFileLock(target, async () => "A ran", { timeoutMs: 600 }));
    await aStale.reached;
    const live = record("live", process.pid, { tool: "clipperz-studio" });
    rmSync(lockPath);
    seed(lockPath, live);
    aStale.resume();
    await expect(a).rejects.toMatchObject({ code: "LOCK_TIMEOUT" });
    expect(JSON.parse(readFileSync(lockPath, "utf-8"))).toEqual(live);
    expect(removalsBy("A")).toEqual([recoveryPath]);
    expect(existsSync(recoveryPath)).toBe(false);
  });
});

describe("token-verified removal with bounded retries", () => {
  beforeEach(() => {
    rmSync(lockPath, { force: true });
    harness.removals.length = 0;
    harness.beforeRemove = null;
  });

  function eperm(): NodeJS.ErrnoException {
    const err: NodeJS.ErrnoException = new Error("EPERM: operation not permitted (injected)");
    err.code = "EPERM";
    return err;
  }

  it("retries a transient sharing error and then removes its own lock", async () => {
    let failures = 2;
    harness.beforeRemove = async () => {
      if (failures-- > 0) throw eperm();
    };
    expect(await withFileLock(target, async () => "ran")).toBe("ran");
    expect(existsSync(lockPath)).toBe(false);
    expect(harness.removals.filter((r) => r.path === lockPath)).toHaveLength(3);
  });

  it("does not unlink a path whose ownership changed during the retry", async () => {
    seed(lockPath, record("mine", process.pid));
    const other = record("other", process.pid);
    harness.beforeRemove = async (_actor, path) => {
      if (path === lockPath) {
        // The owner released and someone else acquired while our removal was failing.
        seed(lockPath, other);
        throw eperm();
      }
    };
    expect(await removeOwned(lockPath, "mine")).toBe(false);
    expect(JSON.parse(readFileSync(lockPath, "utf-8"))).toEqual(other);
    expect(harness.removals.filter((r) => r.path === lockPath)).toHaveLength(1);
  });

  it("surfaces a persistent removal failure after the bounded retry instead of looping forever", async () => {
    seed(lockPath, record("mine", process.pid));
    harness.beforeRemove = async () => {
      throw eperm();
    };
    const started = Date.now();
    await expect(removeOwned(lockPath, "mine")).rejects.toMatchObject({ code: "EPERM" });
    expect(Date.now() - started).toBeGreaterThanOrEqual(1500);
    expect(Date.now() - started).toBeLessThan(6000);
    expect(existsSync(lockPath)).toBe(true);
  }, 10_000);

  it("a release that keeps failing is reported on stderr and does not misreport the completed mutation", async () => {
    harness.beforeRemove = async () => {
      throw eperm();
    };
    const lines: string[] = [];
    const write = vi.spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
      lines.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);
    try {
      expect(await withFileLock(target, async () => "completed")).toBe("completed");
    } finally {
      write.mockRestore();
    }
    expect(lines.join("")).toContain(`could not release ${lockPath}`);
    expect(lines.join("")).toContain(String(process.pid));
    expect(existsSync(lockPath)).toBe(true);
    harness.beforeRemove = null;
    rmSync(lockPath);
  }, 10_000);

  it("removeOwned reports an already-absent file as gone", async () => {
    expect(await removeOwned(lockPath, "anything")).toBe(true);
  });
});
