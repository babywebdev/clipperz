// Disposable child-process worker for clip-history concurrency tests.
// Run through tsx with PODCLI_HOME/PODCLI_DATA pointing at an isolated fixture.
// Never run against a real installation.
//
// Modes
//   stress <name> <count>   alternate records and field updates, <count> times
//   hold <held> <release>   acquire the history lock, create <held>, wait for
//                           <release> to exist, then release the lock
//   paused-acquire <created> <go> <entered> <release>
//                           model a live acquirer paused mid-creation: create
//                           the lock file (kept open, no record), create
//                           <created>, wait for <go>, write the owner record,
//                           create <entered>, wait for <release>, release
//   update <id> <key> <value>
//   delete <id>
// Exit codes: 0 ok, 2 surfaced history error (message on stderr), 3 usage.
import { closeSync, existsSync, openSync, writeFileSync, writeSync } from "fs";
import { hostname } from "os";
import { randomUUID } from "crypto";
import { ClipsHistory, HistoryReadError, FileLockError } from "../../../src/services/clips-history.js";
import { withFileLock, lockPathFor, removeOwned } from "../../../src/utils/mutation-lock.js";
import { paths } from "../../../src/config/paths.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForFile(path: string): Promise<boolean> {
  const deadline = Date.now() + 30_000;
  while (!existsSync(path)) {
    if (Date.now() > deadline) return false;
    await sleep(10);
  }
  return true;
}

// Reproduces the lock's on-disk steps by hand so the pause between creating
// the file and writing the record can be held open for as long as the test
// wants. The record format mirrors mutation-lock.ts.
async function pausedAcquire(created: string, go: string, entered: string, release: string) {
  const lockPath = lockPathFor(paths.clipsHistory);
  const fd = openSync(lockPath, "wx");
  writeFileSync(created, String(process.pid), "utf-8");
  if (!(await waitForFile(go))) return { paused: true, released: "timeout" };
  const token = randomUUID();
  writeSync(
    fd,
    JSON.stringify({ pid: process.pid, host: hostname(), token, created_at: new Date().toISOString(), tool: "clipperz-test-paused" }),
    null,
    "utf-8",
  );
  closeSync(fd);
  writeFileSync(entered, "in", "utf-8");
  const released = (await waitForFile(release)) ? "ok" : "timeout";
  await removeOwned(lockPath, token); // token-verified, retries transient sharing violations
  return { paused: true, released };
}

async function stress(name: string, count: number) {
  const history = new ClipsHistory();
  let recorded = 0;
  let updated = 0;
  for (let i = 0; i < count; i++) {
    if (i % 5 === 0) {
      await history.record({
        source_video: "/videos/show.mp4",
        title: `${name} ${i}`,
        nested: { by: name, n: i },
      } as any);
      recorded++;
    } else {
      // Seed entries only: everything a worker records carries "nested".
      const existing = (await history.load()).filter((e) => !("nested" in e)).map((e) => e.id);
      if (!existing.length) continue;
      const target = existing[i % existing.length];
      await history.update(target, { [`${name}_${i}`]: i } as any);
      updated++;
    }
  }
  return { recorded, updated };
}

async function hold(held: string, release: string) {
  return withFileLock(
    paths.clipsHistory,
    async () => {
      writeFileSync(held, JSON.stringify({ pid: process.pid }), "utf-8");
      const deadline = Date.now() + 30_000;
      while (!existsSync(release)) {
        if (Date.now() > deadline) return { held: true, released: "timeout" };
        await sleep(10);
      }
      return { held: true, released: "ok" };
    },
    { tool: "clipperz-test-hold" },
  );
}

async function main(argv: string[]): Promise<number> {
  const [mode, ...args] = argv;
  const history = new ClipsHistory();
  let result: unknown;
  try {
    if (mode === "stress") result = await stress(args[0], Number(args[1]));
    else if (mode === "hold") result = await hold(args[0], args[1]);
    else if (mode === "paused-acquire") result = await pausedAcquire(args[0], args[1], args[2], args[3]);
    else if (mode === "update") result = await history.update(args[0], { [args[1]]: args[2] } as any);
    else if (mode === "delete") result = await history.remove(args[0]);
    else return 3;
  } catch (err) {
    if (err instanceof HistoryReadError || err instanceof FileLockError) {
      process.stderr.write(`${err.name}: ${err.message}\n`);
      return 2;
    }
    throw err;
  }
  process.stdout.write(JSON.stringify(result ?? null) + "\n");
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(String(err?.stack || err) + "\n");
    process.exit(1);
  },
);
