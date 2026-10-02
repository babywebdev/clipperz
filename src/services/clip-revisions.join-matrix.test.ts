import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";

// Writing Studio 1B.2a repair-3 (lead-12): the revision consumer driven by the
// actual producer. Every render runs the real exact create_clip path through
// scripts/verification/fixtures/exact_join_matrix.py in the configured Python
// (concat_outro's clamp, eligibility and fallback, bookend_region and receipt
// assembly), with only media I/O controlled. Valid receipts must commit with
// the join inputs they were clamped from. Wrong-overlap mutations the producer
// keeps coherent (regions, output, probe) must be refused by the request/clamp
// relationship without moving a pointer.

const tmp = mkdtempSync(join(tmpdir(), "podcli-joinmatrix-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = join(tmp, "data");
process.env.PODCLI_OUTPUT = join(tmp, "exports");

const { ClipsHistory } = await import("./clips-history.js");
const { ClipRevisionService } = await import("./clip-revisions.js");
const { fakeProbe } = await import("./clip-revisions.test-support.js");
const { loadJoinMatrix, producerExactRender } = await import("./clip-revisions.producer-test-support.js");
const { paths } = await import("../config/paths.js");
type JoinCase = import("./clip-revisions.producer-test-support.js").JoinCase;
type JoinMutation = import("./clip-revisions.producer-test-support.js").JoinMutation;

const historyDir = join(tmp, "history");
const historyPath = join(historyDir, "clips.json");
const exportsDir = join(tmp, "exports");
const source = join(tmp, "source.mp4");
const intro = join(tmp, "intro.mp4");
const outro = join(tmp, "outro.mp4");
mkdirSync(historyDir, { recursive: true });
mkdirSync(exportsDir, { recursive: true });
for (const p of [source, intro, outro]) writeFileSync(p, "synthetic asset");
const WORDS = [{ word: "join", start: 1.05, end: 1.25, confidence: 1, speaker: "S0" }];

const history = new ClipsHistory();
const entries = () => JSON.parse(readFileSync(historyPath, "utf-8")) as any[];
const round3 = (n: number) => Math.round(n * 1000) / 1000;
let cases: JoinCase[] = [];
let clips = 0;

const REFUSAL: Record<JoinMutation["refusal"], RegExp> = {
  clamp: /crossfade overlap [\d.]+s is not the requested fade [\d.]+s clamped by its join inputs to [\d.]+s/,
  eligibility: /xfade_acrossfade cannot have crossfaded/,
  "hard-cut": /a hard cut overlaps nothing/,
};

beforeAll(async () => {
  cases = await loadJoinMatrix(paths.pythonPath);
}, 60_000);

/** Save one case through the service with the producer as its renderer. */
async function save(c: JoinCase, mutate: JoinMutation | null, alter?: (result: any) => void) {
  const clipId = `clip-${++clips}`;
  await history.transaction((list) => {
    list.push({ id: clipId, source_video: source, output_path: source, title: "Join matrix" } as any);
  });
  let receipt: any = null;
  const render = producerExactRender({
    python: paths.pythonPath, media: c.media, mutate,
    onResult: (result) => { receipt = structuredClone(result); alter?.(result); },
  });
  const svc = new ClipRevisionService({ history, historyRoot: historyDir, exportRoot: exportsDir, render, probe: fakeProbe });
  const state = await svc.ensureTracked(clipId);
  const recipe = {
    source_video: source, title: "Join matrix", keep_segments: c.keep_segments, caption_style: "karaoke",
    crop_strategy: "center", format: "vertical" as const, clean_fillers: false, bookend_fade: c.bookend_fade,
    ...(c.media.intro !== null ? { intro_path: intro } : {}), ...(c.media.outro !== null ? { outro_path: outro } : {}),
  };
  const result: any = await svc.saveRevision({
    clip_id: clipId, operation_id: "op-1", recipe, source_words: WORDS,
    expected: { incarnation: state.incarnation, draft_version: state.draft_version, revision_version: state.revision_version },
  });
  return { clipId, svc, result, receipt };
}

function expectUnmoved(clipId: string, label: string) {
  const e = entries().find((x) => x.id === clipId);
  expect(e.revisions.revision_version, label).toBe(0);
  expect(e.revisions.current.version, label).toBe(0);
  expect(e.output_path, label).toBe(source);
  const sidecars = join(historyDir, "revisions", clipId);
  expect(existsSync(sidecars) ? readdirSync(sidecars) : [], label).toEqual([]);
}

describe("producer-derived join provenance matrix", () => {
  it("commits every valid producer receipt, keeping the join inputs its overlap was clamped from", async () => {
    expect(cases.length).toBe(15);
    for (const c of cases) {
      const { clipId, svc, result, receipt } = await save(c, null);
      expect(result.outcome, `${c.label}: ${result.operation.error}`).toBe("committed");
      const doc = await svc.loadRevision(clipId, result.revision.revision_id);
      for (const kind of ["intro", "outro"] as const) {
        const saved = doc.bookends[kind];
        const expected = c.expect[kind];
        if (!expected) {
          expect(saved, `${c.label} ${kind}`).toBeNull();
          continue;
        }
        expect([saved!.branch, saved!.applied_overlap], `${c.label} ${kind}`).toEqual(expected);
        expect(saved!.join_inputs, `${c.label} ${kind}`).toEqual(receipt.render_timeline.bookends[kind].join_inputs);
        expect(saved!.asset_duration, `${c.label} ${kind}`).toBe(round3(c.media[kind]!));
      }
    }
  }, 300_000);

  it("refuses every coherent wrong-overlap mutation by the request/clamp relationship, without moving a pointer", async () => {
    let mutations = 0;
    for (const c of cases) {
      for (const mutate of c.wrong) {
        mutations++;
        const label = `${c.label}: ${mutate.kind} ${mutate.branch ?? "same branch"} overlap ${mutate.applied_overlap}`;
        const { clipId, result, receipt } = await save(c, mutate);
        expect(result.outcome, label).toBe("failed");
        expect(result.operation.error, label).toMatch(REFUSAL[mutate.refusal]);
        expectUnmoved(clipId, label);
        // The refused receipt really carries the mutation, and its published media agrees
        // with it: nothing else about the receipt was left inconsistent.
        const tl = receipt.render_timeline;
        expect(tl.bookends[mutate.kind].applied_overlap, label).toBe(round3(mutate.applied_overlap));
        const probe = await fakeProbe(receipt.output_path);
        expect(Math.abs(probe.duration! - tl.output_duration), label).toBeLessThanOrEqual(Math.max(0.05, tl.tolerance.composition_seconds));
        expect(result.operation.residuals, label).toHaveLength(1);
        expect(resolve(receipt.output_path).startsWith(resolve(result.operation.residuals[0])), label).toBe(true);
      }
    }
    expect(mutations).toBe(13);
  }, 300_000);

  it("refuses a new bookend receipt whose join provenance is missing, non-finite or inconsistent", async () => {
    const c = cases.find((x) => x.label === "fade-limited")!;
    const alterations: Array<[string, (r: any) => void, RegExp]> = [
      ["join_inputs missing", (r) => { delete r.render_timeline.bookends.intro.join_inputs; }, /receipt intro lacks join_inputs: a new save needs the main_duration and appended_duration/],
      ["join_inputs null", (r) => { r.render_timeline.bookends.outro.join_inputs = null; }, /receipt outro lacks join_inputs/],
      ["main_duration missing", (r) => { delete r.render_timeline.bookends.intro.join_inputs.main_duration; }, /bookends\.intro\.join_inputs\.main_duration must be a finite number/],
      ["appended_duration NaN", (r) => { r.render_timeline.bookends.outro.join_inputs.appended_duration = Number.NaN; }, /bookends\.outro\.join_inputs\.appended_duration must be a finite number/],
      ["intro asset is not its first input", (r) => { r.render_timeline.bookends.intro.join_inputs.main_duration += 0.01; }, /receipt intro asset_duration 2s is not its joined input 2\.01s/],
      ["outro asset is not its second input", (r) => { r.render_timeline.bookends.outro.join_inputs.appended_duration = 2.5; }, /receipt outro asset_duration 2s is not its joined input 2\.5s/],
      ["outro first input is not the intro join's output", (r) => { r.render_timeline.bookends.outro.join_inputs.main_duration = 2.3; }, /outro join_inputs\.main_duration is not the intro join's measured output/],
    ];
    for (const [label, alter, message] of alterations) {
      const { clipId, result } = await save(c, null, alter);
      expect(result.outcome, label).toBe("failed");
      expect(result.operation.error, label).toMatch(message);
      expectUnmoved(clipId, label);
    }
  }, 300_000);

  it("still commits a bookend-free exact save, which needs no join provenance", async () => {
    const base = cases.find((x) => x.label === "fade-limited")!;
    const c: JoinCase = { ...base, label: "bookend-free", media: { ...base.media, intro: null, outro: null }, expect: {}, wrong: [] };
    const { clipId, svc, result } = await save(c, null);
    expect(result.outcome, result.operation.error).toBe("committed");
    const doc = await svc.loadRevision(clipId, result.revision.revision_id);
    expect(doc.bookends).toEqual({ intro: null, outro: null });
  }, 60_000);
});
