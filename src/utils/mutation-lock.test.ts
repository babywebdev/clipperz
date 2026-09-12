import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, utimesSync, rmSync } from "fs";
import { tmpdir, hostname } from "os";
import { join } from "path";
import { spawnSync } from "child_process";
import { withFileLock, lockPathFor, FileLockError, pidAlive, UNKNOWN_OWNER_GRACE_MS } from "./mutation-lock.js";

const dir = mkdtempSync(join(tmpdir(), "podcli-lock-"));
const target = join(dir, "clips.json");
const lockPath = lockPathFor(target);

function foreignLock(owner: object | string) {
  writeFileSync(lockPath, typeof owner === "string" ? owner : JSON.stringify(owner), "utf-8");
}

// A pid that provably no longer exists on this host: a child that already exited.
function deadPid(): number {
  const r = spawnSync(process.execPath, ["-e", "process.exit(0)"], { windowsHide: true });
  expect(r.status).toBe(0);
  return r.pid;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("mutation lock", () => {
  beforeEach(() => {
    rmSync(lockPath, { force: true });
    rmSync(`${lockPath}.reclaim`, { force: true });
  });

  it("holds an owner record while running and removes it afterwards", async () => {
    const seen = await withFileLock(target, async () => JSON.parse(readFileSync(lockPath, "utf-8")), { tool: "t" });
    expect(seen.pid).toBe(process.pid);
    expect(seen.host).toBe(hostname());
    expect(seen.tool).toBe("t");
    expect(typeof seen.token).toBe("string");
    expect(existsSync(lockPath)).toBe(false);
  });

  it("releases only its own lock, never a record with another token", async () => {
    const foreign = { pid: 1, host: "elsewhere", token: "foreign", created_at: "", tool: "x" };
    await withFileLock(target, async () => {
      foreignLock(foreign); // simulate the lock being replaced under us
    });
    expect(JSON.parse(readFileSync(lockPath, "utf-8")).token).toBe("foreign");
  });

  it("times out on a living owner without stealing it and without running the callback", async () => {
    const owner = { pid: process.pid, host: hostname(), token: "live", created_at: "2026-01-01T00:00:00Z", tool: "clipperz-cli" };
    foreignLock(owner);
    let ran = false;
    const attempt = withFileLock(target, async () => { ran = true; }, { timeoutMs: 150 });
    await expect(attempt).rejects.toBeInstanceOf(FileLockError);
    await attempt.catch((err: FileLockError) => {
      expect(err.code).toBe("LOCK_TIMEOUT");
      expect(err.owner?.pid).toBe(process.pid);
      expect(err.message).toContain(String(process.pid));
      expect(err.message).toContain(lockPath);
    });
    expect(ran).toBe(false);
    expect(JSON.parse(readFileSync(lockPath, "utf-8"))).toEqual(owner);
  });

  it("never reclaims a lock recorded by another host, even with a dead pid", async () => {
    const owner = { pid: deadPid(), host: `${hostname()}-other`, token: "remote", created_at: "", tool: "x" };
    foreignLock(owner);
    await expect(withFileLock(target, async () => 1, { timeoutMs: 150 })).rejects.toMatchObject({ code: "LOCK_TIMEOUT" });
    expect(JSON.parse(readFileSync(lockPath, "utf-8"))).toEqual(owner);
  });

  it("reclaims a lock whose owner process on this host is dead", async () => {
    foreignLock({ pid: deadPid(), host: hostname(), token: "dead", created_at: "", tool: "x" });
    const result = await withFileLock(target, async () => "ran", { timeoutMs: 2000 });
    expect(result).toBe("ran");
    expect(existsSync(lockPath)).toBe(false);
    expect(existsSync(`${lockPath}.reclaim`)).toBe(false);
  });

  it("treats a fresh lock without an owner record as live, and reclaims it only after the grace period", async () => {
    foreignLock("");
    await expect(withFileLock(target, async () => 1, { timeoutMs: 150 })).rejects.toMatchObject({ code: "LOCK_TIMEOUT", owner: null });
    expect(existsSync(lockPath)).toBe(true);

    const old = (Date.now() - UNKNOWN_OWNER_GRACE_MS - 5000) / 1000;
    utimesSync(lockPath, old, old);
    expect(await withFileLock(target, async () => "reclaimed", { timeoutMs: 2000 })).toBe("reclaimed");
    expect(existsSync(lockPath)).toBe(false);
  });

  it("serializes concurrent holders in one process", async () => {
    let active = 0;
    let maxActive = 0;
    const order: number[] = [];
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        withFileLock(target, async () => {
          active++;
          maxActive = Math.max(maxActive, active);
          await sleep(5);
          order.push(i);
          active--;
        }),
      ),
    );
    expect(maxActive).toBe(1);
    expect(order).toHaveLength(8);
    expect(existsSync(lockPath)).toBe(false);
  });

  it("pidAlive distinguishes live, dead and unknown pids", () => {
    expect(pidAlive(process.pid)).toBe(true);
    expect(pidAlive(deadPid())).toBe(false);
    expect(pidAlive(0)).toBeNull();
    expect(pidAlive(-5)).toBeNull();
  });
});
