import { closeSync, openSync, rmSync, writeSync } from "fs";
import { readFile, rm } from "fs/promises";
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
 * - Release: unlink the lock only if its owner record still carries our token,
 *   re-checked before every removal attempt. Another process's lock is never
 *   removed by a release.
 * - Contention: poll with backoff until `timeoutMs` elapses, then throw a
 *   FileLockError describing the owner and how to recover. A living owner is
 *   never displaced merely because time passed.
 * - Crash recovery: a lock whose recorded owner pid is provably dead on this
 *   host is removed by one waiter at a time. That waiter first creates
 *   `<target>.lock.reclaim` with O_EXCL (the recovery file), re-reads the lock
 *   under it, and removes the lock only if it still carries the dead record it
 *   assessed. The recovery file is released by token, like the lock.
 * - Unknown owner: a lock with no readable owner record is never removed
 *   automatically, however old it is. Its owner may be a live process paused
 *   between creating the file and writing the record, and elapsed time cannot
 *   prove otherwise. Acquisition fails closed at the timeout and names the file.
 * - Orphaned recovery file: the recovery file is held for one read and one
 *   unlink and is never recovered automatically. If a reclaimer crashed there,
 *   acquisition of a dead lock fails closed at the timeout naming both files.
 * - PID reuse / foreign host: if the pid is alive (possibly reused) or belongs
 *   to another host name, the lock is treated as live and acquisition fails
 *   closed at the timeout with the owner details and the lock path so the
 *   operator can confirm no Clipperz process holds it and delete it by hand.
 * - Interrupted acquisition: waiting creates no files.
 *
 * Why this is mutually exclusive: at most one process can create the lock
 * (O_EXCL). The lock is removed only by its owner (token-verified) or by a
 * reclaimer holding the recovery file that has just read a dead record under
 * it; the recovery file is itself O_EXCL and released only by its creator, so
 * the record cannot change between that read and the removal (no one else can
 * remove the lock, and no one can create one while it exists). A live owner's
 * pid is never assessed as dead, and a record-less lock is never assessed at
 * all, so no living acquirer loses its lock.
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
const POLL_MIN_MS = 20;
const POLL_MAX_MS = 250;

export function lockPathFor(targetPath: string): string {
  return `${targetPath}.lock`;
}

export function reclaimPathFor(lockPath: string): string {
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
export const REMOVE_RETRY_MS = 2000;
const REMOVE_RETRY_STEP_MS = 25;

export function isTransientFsError(err: unknown): boolean {
  return isErrno(err, "EBUSY") || isErrno(err, "EPERM") || isErrno(err, "EACCES");
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

export interface OwnerRead {
  exists: boolean;
  owner: LockOwner | null;
  /** Present but could not be read (for example a transient sharing violation). */
  unreadable: boolean;
}

export async function readOwner(path: string): Promise<OwnerRead> {
  try {
    const raw = await readFile(path, "utf-8");
    return { exists: true, owner: parseOwner(raw), unreadable: false };
  } catch (err) {
    if (isErrno(err, "ENOENT")) return { exists: false, owner: null, unreadable: false };
    return { exists: true, owner: null, unreadable: true };
  }
}

function sameHost(owner: LockOwner): boolean {
  return owner.host.toLowerCase() === hostname().toLowerCase();
}

type Assessment = "gone" | "live" | "dead";

/**
 * Decide what a lock file we did not create represents. Only a readable
 * record naming a provably dead process on this host is "dead"; everything
 * else, including a missing or unreadable record, is "live".
 */
function assess(read: OwnerRead): Assessment {
  if (!read.exists) return "gone";
  if (!read.owner) return "live";
  if (!sameHost(read.owner)) return "live";
  return pidAlive(read.owner.pid) === false ? "dead" : "live";
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
    // The file is ours (created with O_EXCL an instant ago) and record-less
    // files are never removed by anyone else, so this path is still ours.
    try {
      rmSync(lockPath, { force: true });
    } catch {
      // Leaving it behind is the documented unknown-owner case: manual removal.
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
 * Remove `path` only while it still carries `token`, re-reading before every
 * attempt so a bounded retry can never unlink a file whose ownership changed
 * meanwhile. Returns true when the file is gone (removed here or already
 * absent) and false when it now belongs to someone else. Transient sharing
 * errors are retried for REMOVE_RETRY_MS, then the last error is thrown.
 */
export async function removeOwned(path: string, token: string): Promise<boolean> {
  const deadline = Date.now() + REMOVE_RETRY_MS;
  for (;;) {
    const current = await readOwner(path);
    if (!current.exists) return true;
    if (!current.unreadable) {
      if (current.owner?.token !== token) return false;
      try {
        await rm(path, { force: true });
        return true;
      } catch (err) {
        if (!isTransientFsError(err) || Date.now() >= deadline) throw err;
      }
    } else if (Date.now() >= deadline) {
      throw new Error(`could not read ${path} to confirm ownership before removing it`);
    }
    await sleep(REMOVE_RETRY_STEP_MS);
  }
}

type ReclaimOutcome =
  | { outcome: "removed" }
  | { outcome: "changed" }
  | { outcome: "blocked"; recovery: OwnerRead };

/**
 * Remove a lock whose record names a dead process, under the recovery file.
 * "removed": the lock is gone and the caller may try to create its own.
 * "changed": the lock no longer carries the assessed dead record; poll again.
 * "blocked": the recovery file exists and is never taken over; its record is
 * returned so a timeout can describe it.
 */
async function reclaim(lockPath: string, expected: LockOwner, owner: LockOwner): Promise<ReclaimOutcome> {
  const recoveryPath = reclaimPathFor(lockPath);
  if (!tryCreate(recoveryPath, owner)) {
    return { outcome: "blocked", recovery: await readOwner(recoveryPath) };
  }
  try {
    const current = await readOwner(lockPath);
    if (!current.exists) return { outcome: "removed" };
    if (current.owner?.token !== expected.token || assess(current) !== "dead") return { outcome: "changed" };
    return { outcome: (await removeOwned(lockPath, expected.token)) ? "removed" : "changed" };
  } catch {
    return { outcome: "changed" };
  } finally {
    await removeOwned(recoveryPath, owner.token).catch(() => {});
  }
}

function holderText(owner: LockOwner): string {
  const since = owner.created_at ? ` since ${owner.created_at}` : "";
  return `${owner.tool} process ${owner.pid} on ${owner.host}${since}`;
}

const MANUAL_STEP = "If no Clipperz Studio or CLI process is running, delete";

function describeTimeout(lockPath: string, lastSeen: OwnerRead | null, blockedBy: OwnerRead | null): string {
  const owner = lastSeen?.owner ?? null;
  if (!owner) {
    return (
      `The lock file ${lockPath} has no readable owner record, so its owner cannot be identified ` +
      `and the file is never removed automatically. ${MANUAL_STEP} that file and retry.`
    );
  }
  if (blockedBy) {
    const recoveryPath = reclaimPathFor(lockPath);
    const holder = blockedBy.owner;
    const state = !holder
      ? `the recovery file ${recoveryPath} has no readable owner record`
      : assess(blockedBy) === "dead"
        ? `the recovery file ${recoveryPath} was left by ${holderText(holder)}, which is no longer running`
        : `the recovery file ${recoveryPath} is held by ${holderText(holder)} (recovery in progress)`;
    return (
      `History is locked by ${holderText(owner)}, which is no longer running, and automatic recovery is blocked: ` +
      `${state}. ${MANUAL_STEP} ${recoveryPath} and ${lockPath}, then retry.`
    );
  }
  return `History is locked by ${holderText(owner)}. If that process is no longer running, delete ${lockPath} and retry.`;
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
  let lastSeen: OwnerRead | null = null;
  let blockedBy: OwnerRead | null = null;

  for (;;) {
    if (tryCreate(lockPath, owner)) break;
    const current = await readOwner(lockPath);
    if (current.exists && !current.unreadable) lastSeen = current;
    blockedBy = null;
    const state = assess(current);
    if (state === "gone") continue;
    if (state === "dead") {
      const result = await reclaim(lockPath, current.owner!, owner);
      if (result.outcome === "removed") continue;
      if (result.outcome === "blocked") blockedBy = result.recovery;
    }
    if (Date.now() >= deadline) {
      throw new FileLockError(
        "LOCK_TIMEOUT",
        `Timed out after ${timeoutMs} ms waiting to update ${targetPath}. ${describeTimeout(lockPath, lastSeen, blockedBy)}`,
        lockPath,
        lastSeen?.owner ?? null,
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
 * Unlink the lock only while it still carries our token. A removal that keeps
 * failing is reported on stderr rather than thrown, so the caller's completed
 * mutation is not misreported; the next acquisition would then time out
 * naming this process and the lock path.
 */
async function releaseOwn(lockPath: string, token: string): Promise<void> {
  try {
    await removeOwned(lockPath, token);
  } catch (err) {
    process.stderr.write(
      `clipperz: could not release ${lockPath} (${(err as Error).message}). ` +
        `Delete it by hand if process ${process.pid} is no longer running.\n`,
    );
  }
}
