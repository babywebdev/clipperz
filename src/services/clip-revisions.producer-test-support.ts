// Test seam for the revision save service: the actual exact producer as a
// RenderFn. Each call runs scripts/verification/fixtures/exact_join_matrix.py
// in the given Python with the service's own render params, so the receipt comes
// from the real create_clip exact path (concat_outro's clamp, eligibility and
// fallback, bookend_region and receipt assembly) with only media I/O controlled.
// The fixture also owns the join matrix case table. Used by the vitest suites and
// disposable demonstrations only; never by production code.
import { spawn } from "child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import type { ClipResult, RenderTimelineBookend } from "../models/index.js";
import type { FakeRender } from "./clip-revisions.test-support.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = join(projectRoot, "scripts", "verification", "fixtures", "exact_join_matrix.py");

/** Input durations and FFmpeg outcomes the producer fixture answers with. */
export interface JoinMedia {
  content: number;
  intro: number | null;
  outro: number | null;
  xfade: "ok" | "fail";
  soft_audio: "ok" | "fail";
}

/** One join altered after concat_outro returns, with everything downstream kept coherent. */
export interface JoinMutation {
  kind: "intro" | "outro";
  applied_overlap: number;
  branch?: RenderTimelineBookend["branch"];
  /** The relationship the consumer must refuse it by. */
  refusal: "clamp" | "eligibility" | "hard-cut";
}

export interface JoinCase {
  label: string;
  bookend_fade: number;
  keep_segments: Array<{ start: number; end: number }>;
  media: JoinMedia;
  expect: Partial<Record<"intro" | "outro", [RenderTimelineBookend["branch"], number]>>;
  wrong: JoinMutation[];
}

/** concat_outro's own report for one join, as it returned it (before any mutation). */
export interface ProducerJoin {
  kind: "intro" | "outro";
  report: Record<string, unknown>;
  mutated: boolean;
}

function runFixture(python: string, args: string[], env?: NodeJS.ProcessEnv): Promise<{ code: number | null; stderr: string }> {
  return new Promise((done, fail) => {
    const child = spawn(python, [FIXTURE, ...args], {
      cwd: projectRoot,
      env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8", ...env },
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr!.on("data", (d) => (stderr += d));
    child.on("error", fail);
    child.on("close", (code) => done({ code, stderr }));
  });
}

async function withScratch<T>(use: (dir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "podcli-producer-"));
  try {
    return await use(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The fixture's case table. */
export function loadJoinMatrix(python: string, env?: NodeJS.ProcessEnv): Promise<JoinCase[]> {
  return withScratch(async (dir) => {
    const out = join(dir, "cases.json");
    const { code, stderr } = await runFixture(python, ["cases", out], env);
    if (code !== 0) throw new Error(`exact producer fixture could not list its cases (exit ${code}): ${stderr.trim()}`);
    return JSON.parse(readFileSync(out, "utf-8")) as JoinCase[];
  });
}

export interface ProducerRenderOptions {
  python: string;
  media: JoinMedia;
  mutate?: JoinMutation | null;
  env?: NodeJS.ProcessEnv;
  /** Sees the producer's result before the service does; may alter it. */
  onResult?: (result: ClipResult, joins: ProducerJoin[]) => void;
}

export function producerExactRender(options: ProducerRenderOptions): FakeRender {
  const render = (async (params: Record<string, unknown>): Promise<ClipResult> => {
    render.calls++;
    render.lastParams = params;
    return withScratch(async (dir) => {
      const request = join(dir, "request.json");
      const response = join(dir, "response.json");
      writeFileSync(request, JSON.stringify({ params, media: options.media, mutate: options.mutate ?? null }));
      const { code, stderr } = await runFixture(options.python, ["render", request, response], options.env);
      if (code !== 0) throw new Error(`exact producer failed (exit ${code}): ${stderr.trim().split(/\r?\n/).slice(-3).join(" | ")}`);
      const parsed = JSON.parse(readFileSync(response, "utf-8")) as { result: ClipResult; joins: ProducerJoin[] };
      options.onResult?.(parsed.result, parsed.joins);
      return parsed.result;
    });
  }) as FakeRender;
  render.calls = 0;
  render.lastParams = null;
  return render;
}
