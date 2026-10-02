import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync } from "fs";
import { tmpdir } from "os";
import { basename, dirname, join } from "path";

// Writing Studio 1B.2b.1: the revision service with the real opening card
// composer. Each save writes a synthetic raw render with FFmpeg at the path the
// fake exact renderer returns (its receipt sized and framed to that file), then
// composes the card through the real compose_opening_card bridge task in the
// configured Python and checks it with the real ffprobe stream probe. Decoded
// frames and audio show the card once and silent, followed by the raw render at
// the recorded offset. A composed file re-encoded with FFmpeg's default encoder
// time base (which moves the frames of a render whose video starts late) is
// refused by the service's own packet measurement.
//
// Repair-1 adds the complete receipt matrix below: every field of real composer
// receipts, with and without audio, omitted and contradicted, plus malformed
// types, unsupported fields and no-audio nullability, each refused before the
// pointer commit with both groups named; valid real receipts still commit.

const tmp = mkdtempSync(join(tmpdir(), "podcli-cardprod-"));
process.env.PODCLI_HOME = tmp;
process.env.PODCLI_DATA = join(tmp, "data");
process.env.PODCLI_OUTPUT = join(tmp, "exports");

const { ClipsHistory } = await import("./clips-history.js");
const { ClipRevisionService, REVISION_NAMESPACE } = await import("./clip-revisions.js");
const { PythonExecutor } = await import("./python-executor.js");
const { fakeExactRender } = await import("./clip-revisions.test-support.js");
const { paths } = await import("../config/paths.js");
const { OPENING_CARD_TIME_DOMAINS } = await import("../models/clip-revisions.js");
type OpeningCardReceipt = import("../models/clip-revisions.js").OpeningCardReceipt;

const ffmpeg = paths.ffmpegPath;
const historyDir = join(tmp, "history");
const exportsDir = join(tmp, "exports");
const source = join(tmp, "source.mp4");
const image = join(tmp, "card.png");
mkdirSync(historyDir, { recursive: true });
mkdirSync(exportsDir, { recursive: true });
const history = new ClipsHistory();
const WORDS = [{ word: "cyan", start: 4.2, end: 4.7, confidence: 1 }, { word: "green", start: 1.2, end: 1.7, confidence: 1 }];
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const run = (args: string[]) => execFileSync(ffmpeg, args, { windowsHide: true, maxBuffer: 256 << 20 });

interface RawMedia { size: string; rate: string; audio: false | { rate: number; channels: number }; videoDelay?: number }

/** Two seconds: cyan with a 1300 Hz tone, then green with 500 Hz. */
function writeRaw(path: string, media: RawMedia) {
  const target = media.videoDelay ? `${path}.src.mp4` : path;
  const args = ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=cyan:s=${media.size}:r=${media.rate}:d=1`, "-f", "lavfi", "-i", `color=c=green:s=${media.size}:r=${media.rate}:d=1`];
  if (media.audio) {
    args.push("-f", "lavfi", "-i", `sine=frequency=1300:sample_rate=${media.audio.rate}:duration=1`, "-f", "lavfi", "-i", `sine=frequency=500:sample_rate=${media.audio.rate}:duration=1`);
    args.push("-filter_complex", "[0:v][2:a][1:v][3:a]concat=n=2:v=1:a=1[v][a]", "-map", "[v]", "-map", "[a]", "-ac", String(media.audio.channels), "-c:a", "aac");
  } else {
    args.push("-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0[v]", "-map", "[v]");
  }
  run([...args, "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", target]);
  if (media.videoDelay) run(["-v", "error", "-y", "-itsoffset", String(media.videoDelay), "-i", target, "-i", target, "-map", "0:v", "-map", "1:a", "-c", "copy", path]);
}

/** The fake exact renderer, with a real raw file written at its returned path, or a byte-identical copy of `template`. */
function mediaRender(media: RawMedia, template?: string) {
  return fakeExactRender({
    onRender: (_params, result) => {
      if (template) copyFileSync(template, result.output_path);
      else writeRaw(result.output_path, media);
      const [width, height] = media.size.split("x").map(Number);
      const tl = result.render_timeline!;
      Object.assign(tl.framing, { width, height });
      Object.assign(tl.output, { width, height, has_audio: !!media.audio, file_size_bytes: statSync(result.output_path).size });
      result.file_size_mb = Math.round((statSync(result.output_path).size / (1024 * 1024)) * 100) / 100;
    },
  });
}

async function realCompose(params: Record<string, unknown>): Promise<OpeningCardReceipt> {
  const result = await new PythonExecutor(10 * 60 * 1000).execute<OpeningCardReceipt>("compose_opening_card", params);
  return result.data!;
}

let clips = 0;
async function saveWithCard(media: RawMedia, compose = realCompose, template?: string) {
  const clipId = `clip-${++clips}`;
  await history.transaction((list) => { list.push({ id: clipId, source_video: source, output_path: source, title: "Producer card" } as any); });
  const svc = new ClipRevisionService({ history, historyRoot: historyDir, exportRoot: exportsDir, render: mediaRender(media, template), compose });
  const state = await svc.ensureTracked(clipId);
  const result: any = await svc.saveRevision({
    clip_id: clipId, operation_id: "op-1",
    expected: { incarnation: state.incarnation, draft_version: state.draft_version, revision_version: state.revision_version },
    recipe: { source_video: source, title: "Producer card", keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }], caption_style: "karaoke", crop_strategy: "center", format: "vertical", clean_fillers: false },
    source_words: WORDS,
    thumbnail_card: { image_path: image, image_sha256: sha256(image), placement: "opening", duration: 1.5 },
  });
  return { clipId, svc, result };
}

function rgbAt(path: string, t: number): number[] {
  const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", t.toFixed(3), "-i", path, "-frames:v", "1", "-vf", "crop=8:8:(iw-8)/2:(ih-8)/2", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { windowsHide: true });
  const n = raw.length / 3;
  return [0, 1, 2].map((c) => Math.round(raw.filter((_, i) => i % 3 === c).reduce((a, b) => a + b, 0) / n));
}
function expectColor(path: string, t: number, want: number[], label: string) {
  const got = rgbAt(path, t);
  for (let i = 0; i < 3; i++) expect(Math.abs(got[i] - want[i]), `${label}: frame at ${t.toFixed(3)}s is ${got}, not ${want}`).toBeLessThanOrEqual(30);
}
function pcm(path: string, rate: number): Float32Array {
  const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-i", path, "-vn", "-f", "f32le", "-ac", "1", "-ar", String(rate), "-"], { windowsHide: true, maxBuffer: 256 << 20 });
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length - (raw.length % 4)));
}
/** Samples by which the raw audio sits away from the card offset in the composed file,
 * by cross-correlation across the raw tone change at 1.0 s; and the card's peak level. */
function audioLag(rawPath: string, outPath: string, rate: number, cardSeconds: number) {
  const raw = pcm(rawPath, rate);
  const out = pcm(outPath, rate);
  const offset = Math.round(cardSeconds * rate);
  const s0 = Math.round(0.6 * rate);
  const s1 = Math.round(1.4 * rate);
  let best = -Infinity;
  let bestLag = 0;
  for (let lag = -1024; lag <= 1024; lag++) {
    let score = 0;
    for (let i = s0; i < s1; i++) score += raw[i] * out[offset + lag + i];
    if (score > best) { best = score; bestLag = lag; }
  }
  let peak = 0;
  for (let i = 0; i < offset - 2048; i++) peak = Math.max(peak, Math.abs(out[i]));
  return { lag: bestLag, peak };
}

const BLUE = [0, 0, 255];
const CYAN = [0, 255, 255];
const GREEN = [0, 128, 0];

beforeAll(() => {
  run(["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=orange:s=320x180:d=1", "-vf", "drawbox=x=130:y=60:w=60:h=60:color=blue:t=fill", "-frames:v", "1", image]);
  run(["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=gray:s=64x64:r=25:d=6", "-c:v", "libx264", "-preset", "ultrafast", source]);
}, 60_000);

describe("opening card with the real composer", () => {
  const cases: Array<[string, RawMedia, number, number]> = [
    ["vertical, 25 fps, 44.1 kHz mono", { size: "216x384", rate: "25", audio: { rate: 44100, channels: 1 } }, 38, 1.52],
    ["square, 30000/1001 fps, 48 kHz stereo", { size: "256x256", rate: "30000/1001", audio: { rate: 48000, channels: 2 } }, 45, 1.5015],
    ["horizontal, 25 fps, silent", { size: "384x216", rate: "25", audio: false }, 38, 1.52],
    ["vertical, video starting 62.5 ms after audio", { size: "216x384", rate: "25", audio: { rate: 44100, channels: 1 }, videoDelay: 0.0625 }, 38, 1.52],
  ];
  for (const [label, media, frames, seconds] of cases) {
    it(`commits a real composed card: ${label}`, async () => {
      const { clipId, svc, result } = await saveWithCard(media);
      expect(result.outcome, result.operation?.error).toBe("committed");
      const doc = await svc.loadRevision(clipId, result.revision.revision_id);
      const fc = doc.final_composition!;
      const out = doc.files.main.path;
      const rawPath = fc.raw_render.file.path;
      expect([fc.card!.frames, fc.card!.overlap, fc.card!.transition]).toEqual([frames, 0, "hardcut"]);
      expect(fc.card!.measured_duration).toBeCloseTo(seconds, 9);
      expect(fc.card_offset).toBeCloseTo(seconds, 9);
      expect(sha256(rawPath)).toBe(fc.raw_render.file.sha256);
      expect(sha256(fc.card!.image.path)).toBe(sha256(image));
      expect(doc.render_timeline.thumbnail_card.applied).toBe(false);
      expect((await svc.verifyRevisionFiles(doc)).every((c) => c.ok)).toBe(true);
      // Decoded: the card image, then the raw render's first and second seconds at the recorded offset.
      const start = fc.card_offset + (media.videoDelay ?? 0);
      expectColor(out, 0.3, BLUE, label);
      expectColor(out, fc.card_offset - 0.1, BLUE, label);
      expectColor(out, start + 0.3, CYAN, label);
      expectColor(out, start + 1.5, GREEN, label);
      if (media.audio) {
        const { lag, peak } = audioLag(rawPath, out, media.audio.rate, fc.card_offset);
        expect(lag, `${label}: raw audio is ${lag} samples from the card offset`).toBe(0);
        expect(peak, `${label}: the card is not silent`).toBeLessThan(0.01);
        expect(fc.output.audio).toMatchObject({ sample_rate: media.audio.rate, channels: media.audio.channels });
      } else {
        expect([fc.output.audio, fc.card!.audio_samples, fc.output.probe.has_audio]).toEqual([null, null, false]);
      }
    }, 240_000);
  }

  it("refuses a composed file whose raw frames moved because it was encoded with FFmpeg's default encoder time base", async () => {
    const media: RawMedia = { size: "216x384", rate: "25", audio: { rate: 44100, channels: 1 }, videoDelay: 0.0625 };
    const quantizing = async (params: Record<string, unknown>) => {
      const receipt = await realCompose(params);
      // Re-encode the same card and raw render as the prototype's second attempt did: without
      // -enc_time_base, frames land on the 1/25 s grid. Everything else, size included, stays coherent.
      const moved = join(tmp, `moved-${clips}.mp4`);
      run([
        "-v", "error", "-y", "-i", String(params.raw_video_path), "-loop", "1", "-framerate", "25/1", "-t", "1.6", "-i", receipt.card.image_path,
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
        "-filter_complex", `[1:v]scale=216:384:force_original_aspect_ratio=decrease,pad=216:384:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,trim=end_frame=${receipt.card.frames},setpts=PTS-STARTPTS[cv];[2:a]atrim=end_sample=${receipt.card.audio_samples},asetpts=PTS-STARTPTS[ca];[cv][ca][0:v:0][0:a:0]concat=n=2:v=1:a=1[v][a]`,
        "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-fps_mode", "passthrough", "-video_track_timescale", "12800",
        "-c:a", "aac", "-ar", "44100", "-ac", "1", "-movflags", "+faststart", moved,
      ]);
      copyFileSync(moved, receipt.output.path);
      receipt.output.file_size_bytes = statSync(receipt.output.path).size;
      return receipt;
    };
    const { clipId, result } = await saveWithCard(media, quantizing);
    expect(result.outcome).toBe("failed");
    expect(result.operation.error).toMatch(/raw render starts \d+ ticks later|raw frame \d+ is at/);
    expect(result.operation.residuals).toHaveLength(2);
    const entry = JSON.parse(readFileSync(join(historyDir, "clips.json"), "utf-8")).find((e: any) => e.id === clipId);
    expect([entry.output_path, entry.revisions.current.version]).toEqual([source, 0]);
  }, 240_000);
});

// --- Complete composer receipt validation (repair-1) ------------------------------
//
// One real composition per media profile is made from a raw template through the
// real composer. Each case then saves with a byte-identical copy of that template
// as its raw render, publishes the real composed file and card image into the
// call's own composition group, and returns the real receipt with only raw.path,
// output.path and card.image_path moved to those locations before its mutation.
// Every measured claim therefore still describes the files the service probes.
// RECEIPT_FIELDS is the declared version 1 schema; a coverage test proves it is
// exactly the field set of both real receipts and that every field is omitted and
// contradicted below, with no-audio nullability cases for the audio-dependent fields.

type Profile = "audio" | "silent";
type Mutation = (r: any) => unknown;
interface Capture { media: RawMedia; template: string; receipt: OpeningCardReceipt; retained: unknown; outcome: string }
interface ReceiptCase { profile: Profile; kind: "omit" | "contradict" | "malformed"; field: string; mutate: Mutation; refusal: RegExp }

const PROFILES: Record<Profile, RawMedia> = {
  audio: { size: "216x384", rate: "25", audio: { rate: 44100, channels: 1 } },
  silent: { size: "384x216", rate: "25", audio: false },
};
const captured = {} as Record<Profile, Capture>;

const VIDEO_KEYS = ["width", "height", "sample_aspect_ratio", "time_base", "frame_rate", "packets", "first_pts", "start", "duration"];
const AUDIO_KEYS = ["sample_rate", "channels", "channel_layout", "start", "duration"];
const CARD_KEYS = ["image_path", "image_sha256", "image_bytes", "frames", "frame_ticks", "frame_duration", "measured_ticks", "measured_duration", "audio_samples", "output_start", "output_end", "audio_note"];
const domainLabel = (key: string) => `time_domains[${JSON.stringify(key)}]`;
const RECEIPT_FIELDS: string[] = [
  "version", "kind", "placement", "transition", "overlap", "requested_duration",
  "raw", "raw.path", "raw.sha256", "raw.file_size_bytes", "raw.duration",
  "raw.video", ...VIDEO_KEYS.map((k) => `raw.video.${k}`), "raw.audio", ...AUDIO_KEYS.map((k) => `raw.audio.${k}`),
  "card", ...CARD_KEYS.map((k) => `card.${k}`),
  "output", "output.path", "output.file_size_bytes", "output.duration",
  "output.video", ...VIDEO_KEYS.map((k) => `output.video.${k}`), "output.audio", ...AUDIO_KEYS.map((k) => `output.audio.${k}`),
  "time_domains", ...Object.keys(OPENING_CARD_TIME_DOMAINS).map(domainLabel),
  "tolerance", "tolerance.video_ticks", "tolerance.card_seconds", "tolerance.audio_seconds", "tolerance.basis",
];
/** Fields whose value depends on whether the raw render has audio: null without it. */
const AUDIO_DEPENDENT = ["raw.audio", "output.audio", "card.audio_samples", "card.audio_note", "tolerance.audio_seconds"];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const segments = (label: string): string[] => (label.startsWith("time_domains[") ? ["time_domains", JSON.parse(label.slice("time_domains[".length, -1))] : label.split("."));
const labelOf = (path: string[]) => (path[0] === "time_domains" && path.length === 2 ? domainLabel(path[1]) : path.join("."));
/** Every field label of a receipt, objects and leaves. */
function labelsOf(v: unknown, path: string[] = []): string[] {
  if (!isRecord(v)) return [];
  return Object.entries(v).flatMap(([k, x]) => [labelOf([...path, k]), ...labelsOf(x, [...path, k])]);
}
const parentOf = (r: any, label: string) => segments(label).slice(0, -1).reduce((o, k) => o[k], r);
const lastOf = (label: string) => segments(label).at(-1)!;
const put = (label: string, value: unknown): Mutation => (r) => { parentOf(r, label)[lastOf(label)] = value; };
const bump = (label: string, by: number): Mutation => (r) => { parentOf(r, label)[lastOf(label)] += by; };
/** A retained claim that disagrees with what the service measured, derived or captured. */
const claim = (label: string) => new RegExp(`composition ${esc(label)} is `);
const AUDIO_CLAIMS = /the composition's audio claims differ from the measured files/;
const DOMAINS = /composition time_domains are not the opening card v1 time-domain map/;

const omissions: ReceiptCase[] = [
  ...RECEIPT_FIELDS.map((field): ReceiptCase => ({
    profile: "audio", kind: "omit", field,
    mutate: (r) => { delete parentOf(r, field)[lastOf(field)]; },
    refusal: field.startsWith("time_domains[") ? DOMAINS : new RegExp(`composition ${esc(field)} is required`),
  })),
  ...AUDIO_DEPENDENT.map((field): ReceiptCase => ({ profile: "silent", kind: "omit", field, mutate: (r) => { delete parentOf(r, field)[lastOf(field)]; }, refusal: new RegExp(`composition ${esc(field)} is required`) })),
];

const contradict = (profile: Profile, field: string, mutate: Mutation, refusal: RegExp = claim(field)): ReceiptCase => ({ profile, kind: "contradict", field, mutate, refusal });
const videoContradictions = (side: "raw" | "output") => [
  contradict("audio", `${side}.video.width`, bump(`${side}.video.width`, 2)),
  contradict("audio", `${side}.video.height`, bump(`${side}.video.height`, 2)),
  contradict("audio", `${side}.video.sample_aspect_ratio`, put(`${side}.video.sample_aspect_ratio`, "4:3")),
  contradict("audio", `${side}.video.time_base`, put(`${side}.video.time_base`, "1/25")),
  contradict("audio", `${side}.video.frame_rate`, put(`${side}.video.frame_rate`, "30/1")),
  contradict("audio", `${side}.video.packets`, bump(`${side}.video.packets`, 1)),
  contradict("audio", `${side}.video.first_pts`, bump(`${side}.video.first_pts`, 1)),
  contradict("audio", `${side}.video.start`, bump(`${side}.video.start`, 0.04)),
  contradict("audio", `${side}.video.duration`, bump(`${side}.video.duration`, 1)),
];
const audioContradictions = (side: "raw" | "output") => [
  contradict("audio", `${side}.audio.sample_rate`, put(`${side}.audio.sample_rate`, 48000)),
  contradict("audio", `${side}.audio.channels`, put(`${side}.audio.channels`, 2)),
  contradict("audio", `${side}.audio.channel_layout`, put(`${side}.audio.channel_layout`, "stereo")),
  contradict("audio", `${side}.audio.start`, put(`${side}.audio.start`, 999)),
  contradict("audio", `${side}.audio.duration`, put(`${side}.audio.duration`, 999)),
];
const INVENTED_AUDIO = { sample_rate: 44100, channels: 1, channel_layout: "mono", start: 0, duration: 2 };
const contradictions: ReceiptCase[] = [
  contradict("audio", "version", put("version", 2)),
  contradict("audio", "kind", put("kind", "closing_card")),
  contradict("audio", "placement", put("placement", "closing")),
  contradict("audio", "transition", put("transition", "xfade")),
  contradict("audio", "overlap", put("overlap", 0.04)),
  contradict("audio", "requested_duration", put("requested_duration", 1.52)),
  contradict("audio", "raw", put("raw", { ...INVENTED_AUDIO }), /composition raw has an unsupported field/),
  contradict("audio", "raw.path", put("raw.path", source), /not made from this operation's validated render/),
  contradict("audio", "raw.sha256", put("raw.sha256", "0".repeat(64))),
  contradict("audio", "raw.file_size_bytes", bump("raw.file_size_bytes", 1)),
  contradict("audio", "raw.duration", bump("raw.duration", 1)),
  contradict("audio", "raw.video", (r) => { r.raw.video = { ...r.output.video }; }, claim("raw.video.packets")),
  ...videoContradictions("raw"),
  contradict("audio", "raw.audio", put("raw.audio", null), AUDIO_CLAIMS),
  ...audioContradictions("raw"),
  contradict("audio", "card", (r) => { r.card = { ...r.card, frames: r.card.frames + 1, measured_ticks: r.card.measured_ticks + r.card.frame_ticks }; }, claim("card.frames")),
  contradict("audio", "card.image_path", (r) => { r.card.image_path = join(dirname(r.card.image_path), "card-image.jpg"); }, /composition card image file name is /),
  contradict("audio", "card.image_sha256", put("card.image_sha256", "f".repeat(64))),
  contradict("audio", "card.image_bytes", bump("card.image_bytes", 1)),
  contradict("audio", "card.frames", bump("card.frames", -1)),
  contradict("audio", "card.frame_ticks", bump("card.frame_ticks", 1)),
  contradict("audio", "card.frame_duration", bump("card.frame_duration", 0.0004)),
  contradict("audio", "card.measured_ticks", bump("card.measured_ticks", -1)),
  contradict("audio", "card.measured_duration", put("card.measured_duration", 1.5)),
  contradict("audio", "card.audio_samples", bump("card.audio_samples", 1)),
  contradict("audio", "card.output_start", put("card.output_start", 0.04)),
  contradict("audio", "card.output_end", put("card.output_end", 1.5)),
  contradict("audio", "card.audio_note", put("card.audio_note", "silent card")),
  contradict("audio", "output", (r) => { r.output = { ...r.output, duration: r.raw.duration }; }, claim("output.duration")),
  contradict("audio", "output.path", (r) => { r.output.path = r.raw.path; }, /not in this operation's own composition group/),
  contradict("audio", "output.file_size_bytes", bump("output.file_size_bytes", 1)),
  contradict("audio", "output.duration", bump("output.duration", 1)),
  contradict("audio", "output.video", (r) => { r.output.video = { ...r.raw.video }; }, claim("output.video.packets")),
  ...videoContradictions("output"),
  contradict("audio", "output.audio", put("output.audio", null), AUDIO_CLAIMS),
  ...audioContradictions("output"),
  contradict("audio", "time_domains", put("time_domains", { "output.*": "seconds in the composed file" }), DOMAINS),
  // Each map entry described as another entry's domain: the v1 map is compared whole.
  ...Object.keys(OPENING_CARD_TIME_DOMAINS).map((key, i, keys) =>
    contradict("audio", domainLabel(key), (r) => { r.time_domains[key] = OPENING_CARD_TIME_DOMAINS[keys[(i + 1) % keys.length]]; }, DOMAINS)),
  contradict("audio", "tolerance", (r) => { r.tolerance = { ...r.tolerance, card_seconds: r.card.frame_duration }; }, claim("tolerance.card_seconds")),
  contradict("audio", "tolerance.video_ticks", put("tolerance.video_ticks", 1)),
  contradict("audio", "tolerance.card_seconds", put("tolerance.card_seconds", 0.5)),
  contradict("audio", "tolerance.audio_seconds", put("tolerance.audio_seconds", 0.1)),
  // Prose carries no measurement: its declared type is what can contradict the schema.
  contradict("audio", "tolerance.basis", put("tolerance.basis", 42), /composition tolerance\.basis must be a non-empty string/),
  // Without audio every audio-dependent field must be null, and the note must explain the silent card.
  contradict("silent", "raw.audio", put("raw.audio", { ...INVENTED_AUDIO }), AUDIO_CLAIMS),
  contradict("silent", "output.audio", put("output.audio", { ...INVENTED_AUDIO, duration: 3.52 }), AUDIO_CLAIMS),
  contradict("silent", "card.audio_samples", put("card.audio_samples", 0)),
  contradict("silent", "card.audio_note", put("card.audio_note", null)),
  contradict("silent", "tolerance.audio_seconds", put("tolerance.audio_seconds", 1025 / 44100)),
];

const malformed = (profile: Profile, field: string, mutate: Mutation, refusal: RegExp): ReceiptCase => ({ profile, kind: "malformed", field, mutate, refusal });
const malformations: ReceiptCase[] = [
  malformed("audio", "receipt null", () => null, /composition receipt must be an object/),
  malformed("audio", "card.frames as text", (r) => { r.card.frames = String(r.card.frames); }, /composition card\.frames must be an integer/),
  malformed("audio", "raw.video.width fractional", bump("raw.video.width", 0.5), /composition raw\.video\.width must be an integer/),
  malformed("audio", "raw.duration as text", (r) => { r.raw.duration = String(r.raw.duration); }, /composition raw\.duration must be a finite number/),
  malformed("audio", "card.audio_samples negative", put("card.audio_samples", -1), /composition card\.audio_samples must be an integer >= 0/),
  malformed("audio", "card.frame_duration zero", put("card.frame_duration", 0), /composition card\.frame_duration must be a finite number > 0/),
  malformed("audio", "tolerance.card_seconds infinite", put("tolerance.card_seconds", Infinity), /composition tolerance\.card_seconds must be a finite number/),
  malformed("audio", "output.video null", put("output.video", null), /composition output\.video must be an object/),
  malformed("audio", "output.video.time_base not a ratio", put("output.video.time_base", "25"), /composition output\.video\.time_base must be a positive num\/den ratio/),
  malformed("audio", "raw.sha256 uppercase", (r) => { r.raw.sha256 = r.raw.sha256.toUpperCase(); }, /composition raw\.sha256 must be a lowercase hexadecimal SHA-256/),
  malformed("audio", "card.image_path number", put("card.image_path", 42), /composition card\.image_path must be a string/),
  malformed("audio", "output.audio.channel_layout number", put("output.audio.channel_layout", 2), /composition output\.audio\.channel_layout must be a string/),
  malformed("audio", "time_domains entry number", (r) => { r.time_domains["raw.*"] = 1; }, /composition time_domains\[.*\] must be a string/),
  malformed("audio", "time_domains extra entry", (r) => { r.time_domains["card.*"] = "seconds in the composed file"; }, DOMAINS),
  malformed("audio", "tolerance.basis blank", put("tolerance.basis", " "), /composition tolerance\.basis must be a non-empty string/),
  malformed("silent", "card.audio_note empty", put("card.audio_note", ""), /composition card\.audio_note must be a non-empty string/),
  ...["", "raw", "raw.video", "raw.audio", "card", "output", "output.video", "output.audio", "tolerance"].map((at) =>
    malformed("audio", `${at || "receipt"} unsupported field`, (r) => { (at ? segments(at).reduce((o, k) => o[k], r) : r).attested = true; },
      new RegExp(`composition ${esc(at || "receipt")} has an unsupported field "attested"`))),
  // Review R1's mutations as the review wrote them, and the audio one with a coherent shape.
  malformed("audio", "review R1 contradictory audio probes", (r) => {
    r.raw.audio = { sample_rate: 1, channels: 99, start: 999, duration: 999 };
    r.output.audio = { sample_rate: 1, channels: 99, start: 999, duration: 999 };
  }, /composition raw\.audio\.channel_layout is required/),
  malformed("audio", "review R1 contradictory audio probes, layout kept", (r) => {
    r.raw.audio = { ...r.raw.audio, sample_rate: 1, channels: 99, start: 999, duration: 999 };
    r.output.audio = { ...r.output.audio, sample_rate: 1, channels: 99, start: 999, duration: 999 };
  }, /composition raw\.audio\.sample_rate is 1; expected 44100/),
  malformed("audio", "review R1 missing duration and timing fields", (r) => {
    delete r.raw.duration; delete r.output.duration; delete r.card.output_start; delete r.card.output_end; delete r.card.frame_duration;
  }, /composition raw\.duration is required/),
];

const CASES: ReceiptCase[] = [...omissions, ...contradictions, ...malformations];

/** A composer that publishes the captured real composition into this call's own group
 * and returns its receipt, moved there and then mutated. Records what it returned. */
function replay(c: Capture, mutate: Mutation = () => undefined) {
  const compose = async (params: Record<string, unknown>): Promise<OpeningCardReceipt> => {
    if (params.raw_sha256 !== c.receipt.raw.sha256) throw new Error("replay premise broken: this raw render is not the template the real receipt measured");
    const finalDir = join(String(params.output_dir), `${String(params.group_stem)}-replay`, "final");
    mkdirSync(finalDir, { recursive: true });
    const output = join(finalDir, basename(c.receipt.output.path));
    const cardImage = join(finalDir, basename(c.receipt.card.image_path));
    copyFileSync(c.receipt.output.path, output);
    copyFileSync(c.receipt.card.image_path, cardImage);
    const receipt: any = structuredClone(c.receipt);
    receipt.raw.path = params.raw_video_path;
    receipt.output.path = output;
    receipt.card.image_path = cardImage;
    const replaced = mutate(receipt);
    compose.returned = structuredClone(replaced === undefined ? receipt : replaced);
    return compose.returned as OpeningCardReceipt;
  };
  compose.returned = undefined as unknown;
  return compose;
}

describe("complete composer receipt validation with real producer receipts", () => {
  beforeAll(async () => {
    for (const profile of ["audio", "silent"] as const) {
      const media = PROFILES[profile];
      const template = join(tmp, `receipt-raw-${profile}.mp4`);
      writeRaw(template, media);
      const seen: { receipt?: OpeningCardReceipt } = {};
      const { clipId, svc, result } = await saveWithCard(media, async (params) => {
        const receipt = await realCompose(params);
        seen.receipt = structuredClone(receipt);
        return receipt;
      }, template);
      const doc = result.outcome === "committed" ? await svc.loadRevision(clipId, result.revision.revision_id) : null;
      captured[profile] = { media, template, receipt: seen.receipt!, retained: doc?.final_composition?.card?.producer, outcome: `${result.outcome}${result.operation?.error ? `: ${result.operation.error}` : ""}` };
    }
  }, 240_000);

  it("valid real receipts commit through the real composer and through the replay; the revision retains the checked receipt field for field", async () => {
    for (const profile of ["audio", "silent"] as const) {
      const c = captured[profile];
      expect(c.outcome, profile).toBe("committed");
      expect(c.retained, profile).toEqual(c.receipt);
      const compose = replay(c);
      const { clipId, svc, result } = await saveWithCard(c.media, compose, c.template);
      expect(result.outcome, `${profile} replay: ${result.operation?.error}`).toBe("committed");
      const doc = await svc.loadRevision(clipId, result.revision.revision_id);
      expect(doc.final_composition!.card!.producer, profile).toEqual(compose.returned);
      expect(doc.final_composition!.card!.producer.output.audio, profile).toEqual(doc.final_composition!.output.audio);
    }
    const silent = captured.silent.receipt;
    expect([silent.raw.audio, silent.output.audio, silent.card.audio_samples, silent.tolerance.audio_seconds]).toEqual([null, null, null, null]);
    expect(typeof silent.card.audio_note).toBe("string");
    expect(captured.audio.receipt.card.audio_note).toBeNull();
  }, 240_000);

  it("the declared schema is exactly the field set of both real receipts, and every field is omitted and contradicted", () => {
    const withoutAudioFields = RECEIPT_FIELDS.filter((f) => !/^(raw|output)\.audio\./.test(f));
    expect(labelsOf(captured.audio.receipt).sort()).toEqual([...RECEIPT_FIELDS].sort());
    expect(labelsOf(captured.silent.receipt).sort()).toEqual([...withoutAudioFields].sort());
    for (const field of RECEIPT_FIELDS) {
      expect(CASES.some((c) => c.kind === "omit" && c.field === field), `omission of ${field}`).toBe(true);
      expect(CASES.some((c) => c.kind === "contradict" && c.field === field), `contradiction of ${field}`).toBe(true);
    }
    for (const field of AUDIO_DEPENDENT) {
      expect(CASES.some((c) => c.profile === "silent" && c.kind === "contradict" && c.field === field), `no-audio contradiction of ${field}`).toBe(true);
      expect(CASES.some((c) => c.profile === "silent" && c.kind === "omit" && c.field === field), `no-audio omission of ${field}`).toBe(true);
    }
  });

  for (const c of CASES) {
    it(`refuses ${c.kind} ${c.field} (${c.profile}) before commit, naming both groups`, async () => {
      const cap = captured[c.profile];
      const { clipId, result } = await saveWithCard(cap.media, replay(cap, c.mutate), cap.template);
      expect(result.outcome, c.field).toBe("failed");
      expect(result.operation.error, c.field).toMatch(c.refusal);
      const e = JSON.parse(readFileSync(join(historyDir, "clips.json"), "utf-8")).find((x: any) => x.id === clipId);
      expect([e.output_path, e.revisions.current.version, e.revisions.revision_version], c.field).toEqual([source, 0, 0]);
      const namespace = join(exportsDir, REVISION_NAMESPACE, clipId);
      const onDisk = readdirSync(namespace).map((g) => join(namespace, g)).sort();
      expect(onDisk, c.field).toHaveLength(2);
      expect([...result.operation.residuals].sort(), c.field).toEqual(onDisk);
      const sidecars = join(historyDir, "revisions", clipId);
      expect(existsSync(sidecars) ? readdirSync(sidecars) : [], c.field).toEqual([]);
    }, 60_000);
  }
});
