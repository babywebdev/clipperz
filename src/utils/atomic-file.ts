import { writeFileSync, renameSync, rmSync } from "fs";
import { writeFile, rename, rm } from "fs/promises";
import { randomUUID } from "crypto";

// Write to a temp file and atomically rename so a crash or a concurrent
// reader never sees a half-written file.
function tmpPathFor(filePath: string): string {
  return `${filePath}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
}

// Windows refuses to replace a file another process has open without
// FILE_SHARE_DELETE (Python's open() never requests it). Such readers hold
// the file for milliseconds, so the rename retries briefly before failing;
// a persistent error still surfaces and the original file is untouched.
const RENAME_RETRY_MS = 1000;
const RENAME_RETRY_STEP_MS = 25;

function isTransient(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException)?.code;
  return code === "EBUSY" || code === "EPERM" || code === "EACCES";
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function writeFileAtomicSync(filePath: string, data: string): void {
  const tmp = tmpPathFor(filePath);
  try {
    writeFileSync(tmp, data, "utf-8");
    const deadline = Date.now() + RENAME_RETRY_MS;
    for (;;) {
      try {
        renameSync(tmp, filePath);
        break;
      } catch (err) {
        if (!isTransient(err) || Date.now() >= deadline) throw err;
        sleepSync(RENAME_RETRY_STEP_MS);
      }
    }
  } catch (err) {
    try {
      rmSync(tmp, { force: true });
    } catch {}
    throw err;
  }
}

export async function writeFileAtomic(filePath: string, data: string): Promise<void> {
  const tmp = tmpPathFor(filePath);
  try {
    await writeFile(tmp, data, "utf-8");
    const deadline = Date.now() + RENAME_RETRY_MS;
    for (;;) {
      try {
        await rename(tmp, filePath);
        break;
      } catch (err) {
        if (!isTransient(err) || Date.now() >= deadline) throw err;
        await new Promise((resolve) => setTimeout(resolve, RENAME_RETRY_STEP_MS));
      }
    }
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}
