import { closeSync, openSync, rmSync, writeSync } from "fs";
import { readFile, rename, rm, stat } from "fs/promises";
import { hostname } from "os";
import { randomUUID } from "crypto";

/**
 * Cross-process, cross-language mutation lock for a shared JSON file.
 *
 * The Python backend (backend/services/mutation_lock.py) implements the same
 * protocol against the same lock path, so a Studio request and a CLI command
 * never interleave their read-modify-write cycles on clips.json.
 *
 * Protocol
 * - Acquire: create `<target>.lock` with O_EXCL (atomic on NTFS and POSIX),
 *   then write an owner record `{pid, host, token, created_at, tool}` into it.
 * - Release: unlink the lock only if its owner record still carries our token.
 *   Another process's lock is never removed by a release.
 * - Contention: poll with backoff until `timeoutMs` elapses, then throw a
 *   FileLockError describing the owner and how to recover. A living owner is
 *   never displaced merely because time passed.
 * - Crash recovery: an owner record whose pid is provably dead on this host is
 *   reclaimed. Reclaim runs under a second O_EXCL file (`<target>.lock.reclaim`)
 *   and re-reads the owner record under it, so two waiters cannot remove a
 *   lock that a third process created in between.
 * - Unknown owner: a lock with no readable owner record (a crash between
 *   create and write, or a foreign tool) is reclaimed only once it is older
 *   than UNKNOWN_OWNER_GRACE_MS; a fresh unreadable lock is treated as live.
 * - PID reuse / foreign host: if the pid is alive (possibly reused) or belongs
 *   to another host name, the lock is treated as live and acquisition fails
 *   closed at the timeout with the owner details and the lock path so the
 *   operator can confirm no Clipperz process holds it and delete it by hand.
 * - Interrupted acquisition: waiting creates no files. A crash after creating
 *   the lock file but before the owner record is the unknown-owner case above.
 */

export interface LockOwner {
  pid: number;
  host: string;
  token: string;
  created_at: string;
  tool: string;
}

export type FileLockErrorCode = "LOCK_TIMEOUT" | "LOCK_RECORD_FAILED";

export class FileLockError extends Error {
  readonly code: FileLockErrorCode;
  readonly lockPath: string;
  readonly owner: LockOwner | null;
  constructor(code: FileLockErrorCode, message: string, lockPath: string, owner: LockOwner | null) {
    super(message);
    this.name = "FileLockError";
    this.code = code;
    this.lockPath = lockPath;
    this.owner = owner;
  }
}

export interface FileLockOptions {
  /** Bounded wait; defaults to PODCLI_HISTORY_LOCK_TIMEOUT_MS or 10 000 ms. */
  timeoutMs?: number;
  /** Recorded in the owner record so an operator can see who holds the lock. */
  tool?: string;
}

export const DEFAULT_LOCK_TIMEOUT_MS = 10_000;
export const UNKNOWN_OWNER_GRACE_MS = 60_000;
const RECLAIM_MUTEX_GRACE_MS = 30_000;
const POLL_MIN_MS = 20;
const POLL_MAX_MS = 250;

export function lockPathFor(targetPath: string): string {
  return `${targetPath}.lock`;
}

function reclaimPathFor(lockPath: string): string {
  return `${lockPath}.reclaim`;
}

function defaultTimeoutMs(): number {
  const raw = process.env.PODCLI_HISTORY_LOCK_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_LOCK_TIMEOUT_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isErrno(err: unknown, code: string): boolean {
  return typeof err === "object" && err !== null && (err as NodeJS.ErrnoException).code === code;
}

// Windows refuses to delete a file another process has open without
// FILE_SHARE_DELETE, which Python's open() never requests. A waiter reading
// the owner record holds it for microseconds, so removal retries briefly
// instead of leaving a lock behind that its own owner would then wait on.
const REMOVE_RETRY_MS = 2000;
const REMOVE_RETRY_STEP_MS = 25;

export function isTransientFsError(err: unknown): boolean {
  return isErrno(err, "EBUSY") || isErrno(err, "EPERM") || isErrno(err, "EACCES");
}

async function removeWithRetry(path: string): Promise<void> {
  const deadline = Date.now() + REMOVE_RETRY_MS;
  for (;;) {
    try {
      await rm(path, { force: true });
      return;
    } catch (err) {
      if (!isTransientFsError(err) || Date.now() >= deadline) throw err;
      await sleep(REMOVE_RETRY_STEP_MS);
    }
  }
}

/** true = alive, false = provably dead, null = cannot tell (treated as alive). */
export function pidAlive(pid: number): boolean | null {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    if (isErrno(err, "ESRCH")) return false;
    if (isErrno(err, "EPERM")) return true;
    return null;
  }
}

function parseOwner(raw: string): LockOwner | null {
  try {
    const value = JSON.parse(raw.replace(/^﻿/, ""));
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const { pid, host, token, created_at, tool } = value as Record<string, unknown>;
    if (typeof pid !== "number" || typeof host !== "string" || typeof token !== "string" || !token) return null;
    return {
      pid,
      host,
      token,
      created_at: typeof created_at === "string" ? created_at : "",
      tool: typeof tool === "string" ? tool : "unknown",
    };
  } catch {
    return null;
  }
}

interface OwnerRead {
  exists: boolean;
  owner: LockOwner | null;
  ageMs: number;
}

async function readOwner(path: string): Promise<OwnerRead> {
  try {
    const [raw, info] = await Promise.all([readFile(path, "utf-8"), stat(path)]);
    return { exists: true, owner: parseOwner(raw), ageMs: Date.now() - info.mtimeMs };
  } catch (err) {
    if (isErrno(err, "ENOENT")) return { exists: false, owner: null, ageMs: 0 };
    // Present but unreadable (for example a transient sharing violation while
    // the owner is still writing its record): treat as a fresh live lock.
    return { exists: true, owner: null, ageMs: 0 };
  }
}

function sameHost(owner: LockOwner): boolean {
  return owner.host.toLowerCase() === hostname().toLowerCase();
}

type Assessment = "gone" | "live" | "dead" | "unknown";

/** Decide what a lock file we did not create represents. */
function assess(read: OwnerRead, graceMs: number): Assessment {
  if (!read.exists) return "gone";
  if (!read.owner) return read.ageMs > graceMs ? "unknown" : "live";
  if (!sameHost(read.owner)) return "live";
  const alive = pidAlive(read.owner.pid);
  return alive === false ? "dead" : "live";
}

/** Create the lock file atomically and stamp it with our owner record. */
function tryCreate(lockPath: string, owner: LockOwner): boolean {
  let fd: number;
  try {
    fd = openSync(lockPath, "wx");
  } catch (err) {
    if (isErrno(err, "EEXIST")) return false;
    throw err;
  }
  try {
    writeSync(fd, JSON.stringify(owner), null, "utf-8");
  } catch (err) {
    closeSync(fd);
    try {
      rmSync(lockPath, { force: true });
    } catch {
      // An orphaned empty lock is the unknown-owner case and is reclaimed
      // after its grace period.
    }
    throw new FileLockError(
      "LOCK_RECORD_FAILED",
      `Could not record ownership of ${lockPath}: ${(err as Error).message}`,
      lockPath,
      null,
    );
  }
  closeSync(fd);
  return true;
}

/**
 * Remove a lock judged stale, but only after re-reading it under the reclaim
 * mutex and confirming it is still the same stale record. Returns true when
 * the lock was removed.
 */
async function reclaim(lockPath: string, expected: LockOwner | null, owner: LockOwner): Promise<boolean> {
  const mutexPath = reclaimPathFor(lockPath);
  if (!tryCreate(mutexPath, owner)) {
    const mutex = await readOwner(mutexPath);
    if (assess(mutex, RECLAIM_MUTEX_GRACE_MS) === "live") return false;
    // The reclaimer itself died: it holds the mutex for one read and one
    // unlink, so an orphan can only be a crash. Move it aside before deleting
    // so two waiters cannot both believe they removed it.
    const aside = `${mutexPath}.${randomUUID().slice(0, 8)}`;
    try {
      await rename(mutexPath, aside);
      await removeWithRetry(aside);
    } catch {
      return false;
    }
    if (!tryCreate(mutexPath, owner)) return false;
  }
  try {
    const current = await readOwner(lockPath);
    if (!current.exists) return true;
    const sameRecord = expected
      ? current.owner?.token === expected.token
      : current.owner === null && current.ageMs > UNKNOWN_OWNER_GRACE_MS;
    if (!sameRecord) return false;
    await removeWithRetry(lockPath);
    return true;
  } catch {
    return false;
  } finally {
    await removeWithRetry(mutexPath).catch(() => {});
  }
}

function describeOwner(owner: LockOwner | null, lockPath: string): string {
  if (!owner) {
    return `The lock file ${lockPath} has no readable owner record. If no Clipperz Studio or CLI process is running, delete that file and retry.`;
  }
  const since = owner.created_at ? ` since ${owner.created_at}` : "";
  return (
    `History is locked by ${owner.tool} process ${owner.pid} on ${owner.host}${since}. ` +
    `If that process is no longer running, delete ${lockPath} and retry.`
  );
}

/**
 * Run `fn` while holding the mutation lock for `targetPath`.
 * Network, AI, and render work belong outside `fn`; hold the lock only for the
 * fresh read, the in-memory change, and the atomic replacement.
 */
export async function withFileLock<T>(
  targetPath: string,
  fn: () => Promise<T> | T,
  options: FileLockOptions = {},
): Promise<T> {
  const lockPath = lockPathFor(targetPath);
  const owner: LockOwner = {
    pid: process.pid,
    host: hostname(),
    token: randomUUID(),
    created_at: new Date().toISOString(),
    tool: options.tool ?? "clipperz-node",
  };
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs();
  const deadline = Date.now() + timeoutMs;
  let delay = POLL_MIN_MS;
  let lastSeen: LockOwner | null = null;

  for (;;) {
    if (tryCreate(lockPath, owner)) break;
    const current = await readOwner(lockPath);
    lastSeen = current.owner;
    const state = assess(current, UNKNOWN_OWNER_GRACE_MS);
    if (state === "gone") continue;
    if (state === "dead" || state === "unknown") {
      if (await reclaim(lockPath, current.owner, owner)) continue;
    }
    if (Date.now() >= deadline) {
      throw new FileLockError(
        "LOCK_TIMEOUT",
        `Timed out after ${timeoutMs} ms waiting to update ${targetPath}. ${describeOwner(lastSeen, lockPath)}`,
        lockPath,
        lastSeen,
      );
    }
    await sleep(Math.min(delay, Math.max(0, deadline - Date.now())));
    delay = Math.min(POLL_MAX_MS, Math.round(delay * 1.5));
  }

  try {
    return await fn();
  } finally {
    await releaseOwn(lockPath, owner.token);
  }
}

/**
 * Unlink the lock only when it still carries our token. A removal that keeps
 * failing is reported on stderr rather than thrown, so the caller's completed
 * mutation is not misreported; the next acquisition would then time out
 * naming this process and the lock path.
 */
async function releaseOwn(lockPath: string, token: string): Promise<void> {
  const current = await readOwner(lockPath);
  if (!current.exists) return;
  if (current.owner?.token !== token) return;
  try {
    await removeWithRetry(lockPath);
  } catch (err) {
    process.stderr.write(
      `clipperz: could not release ${lockPath} (${(err as Error).message}). ` +
        `Delete it by hand if process ${process.pid} is no longer running.\n`,
    );
  }
}
