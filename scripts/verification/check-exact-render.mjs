// Exact-edit render through the real internal create_clip bridge (Writing Studio 1B.1).
//
// Renders synthetic media whose every source second has its own colour, tone
// and word, in an isolated home/data/exports/tmp, through the compiled
// PythonExecutor. Decodes the output to prove order, absence of discarded
// seconds, captions, dimensions and A/V agreement, and checks that the
// legacy default request is unchanged and that invalid exact requests leave
// the export directory untouched. Requires `npm run build` and the Remotion
// bundle cache (`npm run remotion:prebundle`). No AI call, no user data.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRuntime, installationRoot, projectRoot } from '../local/runtime.mjs';

const { env, settings } = loadRuntime();
const fixture = mkdtempSync(join(installationRoot, 'tmp/exact-render-'));
for (const dir of ['home', 'data', 'exports', 'tmp']) mkdirSync(join(fixture, dir));
writeFileSync(join(fixture, 'empty.env'), '');
const exportsDir = join(fixture, 'exports');
Object.assign(process.env, env, {
  PODCLI_HOME: join(fixture, 'home'), PODCLI_DATA: join(fixture, 'data'), PODCLI_OUTPUT: exportsDir,
  PODCLI_CWD: join(fixture, 'home'), PODCLI_ENV_FILE: join(fixture, 'empty.env'),
  TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp'), TMPDIR: join(fixture, 'tmp'),
});
const run = (exe, args, opts = {}) => execFileSync(exe, args, {
  env: process.env, windowsHide: true, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024, ...opts,
});
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');

// --- synthetic media -------------------------------------------------------
const COLORS = ['red', 'green', 'blue', 'yellow', 'cyan', 'magenta'];
const RGB = { red: [255, 0, 0], green: [0, 128, 0], blue: [0, 0, 255], yellow: [255, 255, 0], cyan: [0, 255, 255],
  magenta: [255, 0, 255], purple: [128, 0, 128] };
const TONES = COLORS.map((_, i) => 300 + 200 * i);
const source = join(fixture, 'source.mp4');
{
  const args = ['-v', 'error', '-y'];
  for (const c of COLORS) args.push('-f', 'lavfi', '-i', `color=c=${c}:s=1280x720:r=25:d=1`);
  for (const t of TONES) args.push('-f', 'lavfi', '-i', `sine=frequency=${t}:sample_rate=44100:duration=1`);
  const chain = COLORS.map((_, i) => `[${i}:v][${COLORS.length + i}:a]`).join('');
  args.push('-filter_complex', `${chain}concat=n=${COLORS.length}:v=1:a=1[v][a]`, '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', source);
  run(settings.FFMPEG_PATH, args);
}
// xfade needs both inputs at one frame rate. The 25 fps outro exercises the
// real crossfade; the 30 fps one drives the composition helper down its
// stream-copy fallback, whose output disagrees with itself and must be refused.
const outro = join(fixture, 'outro.mp4');
const outroOtherRate = join(fixture, 'outro-30fps.mp4');
for (const [path, rate] of [[outro, 25], [outroOtherRate, 30]]) {
  run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=purple:s=640x360:r=${rate}:d=1`,
    '-f', 'lavfi', '-i', 'sine=frequency=2400:sample_rate=44100:duration=1', '-c:v', 'libx264', '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', path]);
}
const words = COLORS.map((c, i) => ({ word: c, start: i + 0.2, end: i + 0.7, speaker: `S${i % 2}` }));
const sourceHash = sha256(source);

// --- decode helpers ---------------------------------------------------------
// Top-centre patch by default; the frame centre for a letterboxed bookend
// whose top rows are padding.
const frameRgb = (path, t, region = 'top') => {
  const y = region === 'top' ? 'ih/8' : '(ih-32)/2';
  const raw = execFileSync(settings.FFMPEG_PATH, ['-loglevel', 'error', '-ss', t.toFixed(3), '-i', path, '-frames:v', '1',
    '-vf', `crop=32:32:(iw-32)/2:${y}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { env: process.env, windowsHide: true, maxBuffer: 16 << 20 });
  const n = raw.length / 3; const sum = [0, 0, 0];
  for (let i = 0; i < raw.length; i++) sum[i % 3] += raw[i];
  return sum.map(v => Math.round(v / n));
};
const nearestColor = rgb => Object.keys(RGB).reduce((best, name) => {
  const d = rgb.reduce((acc, v, i) => acc + Math.abs(v - RGB[name][i]), 0);
  return d < best.d ? { name, d } : best;
}, { name: null, d: Infinity }).name;
const assertColor = (path, t, color, region = 'top') => {
  const got = frameRgb(path, t, region);
  const want = RGB[color];
  for (let i = 0; i < 3; i++) assert(Math.abs(got[i] - want[i]) <= 28, `frame at ${t}s is ${got}, not ${color} ${want}`);
};
const toneHz = (path, t0, t1) => {
  const raw = execFileSync(settings.FFMPEG_PATH, ['-loglevel', 'error', '-ss', t0.toFixed(3), '-t', (t1 - t0).toFixed(3), '-i', path,
    '-vn', '-f', 's16le', '-ac', '1', '-ar', '8000', '-'], { env: process.env, windowsHide: true, maxBuffer: 16 << 20 });
  let crossings = 0; let prev = raw.readInt16LE(0) < 0;
  for (let i = 2; i + 1 < raw.length; i += 2) { const neg = raw.readInt16LE(i) < 0; if (neg !== prev) crossings++; prev = neg; }
  return crossings / 2 / ((raw.length / 2) / 8000);
};
const assertTone = (path, t0, t1, hz) => {
  const got = toneHz(path, t0, t1);
  assert(Math.abs(got - hz) <= 60, `audio ${t0}-${t1}s is ~${got.toFixed(0)} Hz, not ${hz} Hz`);
};
// Caption pixels: on a uniform colour second, drawn text (white fill, dark
// outline) is the only thing far from the frame's median grey. Counted at full
// resolution over the lower half, where every caption style places words.
const captionPixels = (path, t) => {
  const raw = execFileSync(settings.FFMPEG_PATH, ['-loglevel', 'error', '-ss', t.toFixed(3), '-i', path, '-frames:v', '1',
    '-vf', 'crop=iw:ih/2:0:ih/2', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { env: process.env, windowsHide: true, maxBuffer: 16 << 20 });
  const sorted = Buffer.from(raw).sort();
  const median = sorted[sorted.length >> 1];
  let count = 0;
  for (const v of raw) if (Math.abs(v - median) > 60) count++;
  return count;
};
const probe = path => JSON.parse(run(settings.FFPROBE_PATH, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path]));
// An exact result lives in its operation's own group directory under the
// export root: <stem>-<op_id>/final/<file>. Returns the group directory.
const assertGroup = (path, stem) => {
  const finalDir = dirname(path);
  const group = dirname(finalDir);
  assert.equal(basename(finalDir), 'final', path);
  assert.equal(dirname(group), exportsDir, path);
  assert(basename(group).startsWith(`${stem}-`), path);
  assert.deepEqual(readdirSync(group), ['final'], `staging left behind in ${group}`);
  return group;
};

// --- the bridge -------------------------------------------------------------
const { PythonExecutor } = await import(pathToFileURL(join(projectRoot, 'dist/services/python-executor.js')).href);
const executor = new PythonExecutor(15 * 60 * 1000);
const results = { fixture, sourceHash, cases: {} };
const common = { video_path: source, transcript_words: words, caption_style: 'karaoke', crop_strategy: 'center',
  format: 'vertical', clean_fillers: false, output_dir: exportsDir };

console.log('Exact render through the bridge (reversed order, outro with fade, Remotion captions)...');
const exactSegments = [{ start: 4, end: 5 }, { start: 1, end: 2 }];
const exact = (await executor.execute('create_clip', { ...common, timing_mode: 'exact', title: 'exact-check',
  keep_segments: exactSegments, outro_path: outro, bookend_fade: 0.25, start_second: 0, end_second: 0 })).data;
{
  const tl = exact.render_timeline;
  assert.equal(exact.timing_mode, 'exact');
  assert.equal(tl.version, 1);
  assert.deepEqual(tl.segments.map(s => [s.source_start, s.source_end, s.content_start]), [[4, 5, 0], [1, 2, 1]]);
  assert.equal(tl.words.content_text, 'cyan green');
  assert.deepEqual(tl.words.content.map(w => [w.start, w.end, w.speaker]), [[0.2, 0.7, 'S0'], [1.2, 1.7, 'S1']]);
  assert.deepEqual(tl.words.source.map(w => w.word), ['green', 'cyan']);
  assert.equal(tl.captions.rendered, true);
  assert.equal(tl.captions.renderer, 'remotion');
  assert.equal(tl.thumbnail_card.applied, false);
  assert.equal(tl.content_to_output_offset, 0);
  assert.equal(tl.output.width, 1080); assert.equal(tl.output.height, 1920);
  assert(tl.output.has_audio);
  assert.equal(tl.bookends.intro, null);
  // The report must describe the join the helper really made, and the file
  // must add up to it. Which branch that is depends on the installation: on
  // this Windows profile h264_nvenc crashes on xfade of Remotion-captioned
  // content, so the helper takes a hard cut and the overlap is 0. The xfade
  // branch itself is proven on the ASS path in tests/test_exact_render.py.
  // xfade_audio_concat is never a valid exact receipt: exact mode asks the
  // helper for synchronized joins only and refuses that branch if reported.
  const outroJoin = tl.bookends.outro;
  assert(['xfade_acrossfade', 'hardcut_soft_audio', 'hardcut'].includes(outroJoin.branch), JSON.stringify(outroJoin));
  const expectedOverlap = outroJoin.branch.startsWith('xfade') ? 0.25 : 0;
  assert(Math.abs(outroJoin.applied_overlap - expectedOverlap) < 0.001, JSON.stringify(outroJoin));
  assert.equal(outroJoin.requested_fade, 0.25);
  const expectedOutput = tl.content_duration_measured + outroJoin.asset_duration - outroJoin.applied_overlap;
  assert(Math.abs(tl.output_duration - expectedOutput) <= tl.tolerance.composition_seconds, `output ${tl.output_duration}s, expected ${expectedOutput}s`);
  assert(Math.abs(tl.output.video_duration - tl.output.audio_duration) <= tl.tolerance.av_sync_seconds, 'A/V disagree');
  assert(Math.abs(tl.content_duration_measured - 2) <= tl.tolerance.content_seconds, `content ${tl.content_duration_measured}s`);
  assert.equal(exact.duration, 2);
  assert.deepEqual([exact.start_second, exact.end_second], [1, 5]);
  const path = exact.output_path;
  assert(path.startsWith(exportsDir), path);
  assert.equal(tl.output.path, path);
  // The operation published into its own group: <exports>/<stem>-<op_id>/final/<stem>.mp4,
  // with no staging left behind.
  const group = assertGroup(path, 'exact-check_short');
  assert.deepEqual(readdirSync(join(group, 'final')), ['exact-check_short.mp4']);
  assertColor(path, 0.5, 'cyan');
  assertColor(path, 1.5, 'green');
  assertColor(path, tl.output_duration - 0.2, 'purple', 'center');
  assertTone(path, 0.3, 0.7, TONES[4]);
  assertTone(path, 1.3, 1.7, TONES[1]);
  const seen = new Set();
  for (let t = 0.125; t < 2.0; t += 0.25) seen.add(nearestColor(frameRgb(path, t)));
  assert.deepEqual([...seen].sort(), ['cyan', 'green'], `discarded seconds present: ${[...seen]}`);
  const captionPx = [captionPixels(path, 0.45), captionPixels(path, 1.45)];
  assert(captionPx.every(n => n > 500), `too few caption pixels at word times: ${captionPx}`);
  const streams = probe(path).streams;
  const video = streams.find(s => s.codec_type === 'video');
  assert.equal(sha256(source), sourceHash, 'source bytes changed');
  results.cases.exact = { result: exact, decoded: { colors: [...seen], captionPixels: captionPx, fps: video.avg_frame_rate } };
  console.log(`  ok: ${path} (${tl.output_duration}s, output ${video.avg_frame_rate} fps, outro ${tl.bookends.outro.branch})`);
}

console.log('Same-title exact render again: a new group, the earlier output untouched and playable...');
{
  const earlier = exact.output_path;
  const earlierHash = sha256(earlier);
  const before = readdirSync(exportsDir).sort();
  const again = (await executor.execute('create_clip', { ...common, timing_mode: 'exact', title: 'exact-check',
    keep_segments: [{ start: 2, end: 3 }], captions: false, start_second: 0, end_second: 0 })).data;
  assert.notEqual(again.output_path, earlier);
  const group = assertGroup(again.output_path, 'exact-check_short');
  assert.notEqual(group, dirname(dirname(earlier)));
  assert.deepEqual(readdirSync(exportsDir).sort(), [...before, basename(group)].sort(), 'the earlier group was moved or removed');
  assert.equal(sha256(earlier), earlierHash, 'the earlier output changed bytes');
  const earlierStreams = probe(earlier).streams.map(s => s.codec_type).sort();
  assert.deepEqual(earlierStreams, ['audio', 'video'], 'the earlier output no longer decodes');
  assertColor(earlier, 0.5, 'cyan');
  assertColor(again.output_path, 0.5, 'blue');
  assertTone(again.output_path, 0.3, 0.7, TONES[2]);
  assert.equal(sha256(source), sourceHash, 'source bytes changed');
  results.cases['same title again'] = { output_path: again.output_path, earlier, earlierHash, earlierStreams };
  console.log(`  ok: ${again.output_path}; earlier ${earlier} unchanged`);
}

console.log('Exact render whose composition falls back to a self-inconsistent file is refused...');
{
  const before = readdirSync(exportsDir).sort();
  let error = null;
  try {
    await executor.execute('create_clip', { ...common, timing_mode: 'exact', title: 'exact-mismatch', start_second: 0, end_second: 0,
      keep_segments: exactSegments, outro_path: outroOtherRate, bookend_fade: 0.25, captions: false });
  } catch (e) { error = e.message; }
  assert(error, 'a composition whose audio and video disagree was accepted');
  assert(/disagree|add up|ExactRenderVerificationError/.test(error), error);
  assert.deepEqual(readdirSync(exportsDir).sort(), before, 'a refused render changed the export directory');
  const lines = error.split(/\r?\n/);
  results.cases['refused: mismatched-rate outro'] = lines.find(l => l.includes('ExactRenderVerificationError')) || lines[0];
  console.log(`  refused: ${results.cases['refused: mismatched-rate outro'].slice(0, 160)}`);
}

console.log('Transcript availability through the bridge (omitted, null, empty)...');
{
  // The renderer must see the request as sent: no transcript is
  // "unavailable", an explicit [] is a supplied, empty one. Captions are
  // requested by default in every case and must be reported as not drawn.
  const { transcript_words: _omit, ...withoutWords } = common;
  const cases = [
    ['omitted', {}, 'unavailable', null],
    ['null', { transcript_words: null }, 'unavailable', null],
    ['empty', { transcript_words: [] }, 'supplied', 0],
  ];
  for (const [label, extra, expectedInput, expectedCount] of cases) {
    const result = (await executor.execute('create_clip', { ...withoutWords, ...extra, timing_mode: 'exact',
      title: `transcript-${label}`, keep_segments: [{ start: 2, end: 3 }], start_second: 0, end_second: 0 })).data;
    const tl = result.render_timeline;
    assert.equal(tl.words.input, expectedInput, `${label}: words.input`);
    assert.equal(tl.words.source_count, expectedCount, `${label}: words.source_count`);
    assert.deepEqual(tl.words.source, expectedCount === null ? null : [], `${label}: words.source`);
    assert.deepEqual(tl.words.content, [], `${label}: words.content`);
    assert.equal(tl.captions.requested, true);
    assert.equal(tl.captions.rendered, false, `${label}: captions must not claim to be drawn`);
    assert.equal(tl.captions.renderer, null);
    assert(tl.captions.unavailable_reason, `${label}: missing unavailable_reason`);
    assert(result.output_path.startsWith(exportsDir));
    assertGroup(result.output_path, `transcript-${label}_short`);
    assertColor(result.output_path, 0.5, 'blue');
    assert(captionPixels(result.output_path, 0.5) < 50, `${label}: caption pixels drawn without a transcript`);
    results.cases[`transcript: ${label}`] = { words: tl.words, captions: tl.captions, output_path: result.output_path };
    console.log(`  ok (${label}): words.input=${tl.words.input}, source_count=${tl.words.source_count}, captions.rendered=${tl.captions.rendered}`);
  }
  assert.equal(sha256(source), sourceHash, 'source bytes changed');
}

console.log('Legacy default through the same bridge (no timing_mode)...');
const legacy = (await executor.execute('create_clip', { ...common, title: 'legacy-check', start_second: 1, end_second: 2,
  keep_segments: [{ start: 1, end: 2 }] })).data;
{
  assert(!('render_timeline' in legacy), 'legacy result must not carry a timeline');
  assert(!('timing_mode' in legacy), 'legacy result must not carry a timing mode');
  for (const key of ['output_path', 'duration', 'file_size_mb', 'title', 'start_second', 'end_second', 'caption_style', 'crop_strategy', 'format']) {
    assert(key in legacy, `legacy result lost ${key}`);
  }
  assert.equal(legacy.output_path, join(exportsDir, 'legacy-check_short.mp4'), 'legacy naming must stay flat');
  assertColor(legacy.output_path, 0.5, 'green');
  assert.equal(sha256(source), sourceHash, 'source bytes changed');
  results.cases.legacy = legacy;
  console.log(`  ok: ${legacy.output_path}`);
}

console.log('Invalid exact requests are refused without touching exports...');
const before = readdirSync(exportsDir).sort();
for (const [label, params] of [
  ['end beyond source', { keep_segments: [{ start: 5.5, end: 7 }] }],
  ['empty segments', { keep_segments: [] }],
  ['unknown mode', { keep_segments: [{ start: 1, end: 2 }], timing_mode: 'precise' }],
  ['missing outro asset', { keep_segments: [{ start: 1, end: 2 }], outro_path: join(fixture, 'no-outro.mp4') }],
  ['keyframe outside content', { keep_segments: [{ start: 1, end: 2 }], crop_strategy: 'manual', crop_keyframes: [{ t: 3, x_pct: 50 }] }],
]) {
  let error = null;
  try { await executor.execute('create_clip', { ...common, timing_mode: 'exact', title: 'invalid', start_second: 0, end_second: 0, ...params }); }
  catch (e) { error = e.message; }
  assert(error, `${label}: request was not refused`);
  results.cases[`invalid: ${label}`] = error.split('\n')[0];
  console.log(`  refused (${label}): ${error.split('\n')[0].slice(0, 120)}`);
}
assert.deepEqual(readdirSync(exportsDir).sort(), before, 'a refused request changed the export directory');
assert.equal(sha256(source), sourceHash, 'source bytes changed');

writeFileSync(join(fixture, 'result.json'), JSON.stringify(results, null, 2));
console.log(`Passed. Evidence: ${join(fixture, 'result.json')}`);
