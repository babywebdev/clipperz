// Saved revision through the real internal exact bridge (Writing Studio 1B.2a).
//
// Proves, in an isolated home/data/exports/tmp with synthetic media, that the
// internal revision save service can take a legacy clip as version zero, save
// a draft without touching its media, commit a real exact render through the
// compiled PythonExecutor into the app-owned export namespace, reopen the same
// immutable files from a separate process, answer a replay without rendering,
// widen a later revision from the retained source words, refuse a late commit
// after explicit cancellation, preserve a Python metadata edit made during a
// save, compose opening thumbnail cards through the real compose_opening_card
// bridge (1B.2b.1: draft, commit with decoded card/content/caption/audio-offset
// proof, restart reopen, replay without the selected image, card change and
// removal, content and logo change with a decoded logo marker, changed-image and
// contradictory-receipt refusal; 1B.2b.1 repair-1: real receipts with contradictory
// audio claims or omitted duration and card timing refused), reject malformed card descriptors, refuse
// configured export and history roots that are junctions, stay invisible to the
// real Cleanup scanner, keep each real bookend's join inputs and refuse a real
// receipt stripped of them. Since 1B.2b.4a a commit also projects the thumbnail
// preview from the committed card and drops a stale logo backup pointer.
// Requires `npm run build` and the Remotion bundle cache. No AI call, no user
// data, no production route.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRuntime, installationRoot, projectRoot } from '../local/runtime.mjs';

const { env, settings } = loadRuntime();
const fixture = mkdtempSync(join(installationRoot, 'tmp/saved-revision-'));
for (const dir of ['home', 'data', 'data/working', 'data/cache', 'exports', 'tmp']) mkdirSync(join(fixture, dir), { recursive: true });
writeFileSync(join(fixture, 'empty.env'), '');
const home = join(fixture, 'home');
const exportsDir = join(fixture, 'exports');
Object.assign(process.env, env, {
  PODCLI_HOME: home, PODCLI_DATA: join(fixture, 'data'), PODCLI_OUTPUT: exportsDir,
  PODCLI_CWD: home, PODCLI_ENV_FILE: join(fixture, 'empty.env'),
  TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp'), TMPDIR: join(fixture, 'tmp'),
});
const run = (exe, args, opts = {}) => execFileSync(exe, args, {
  env: process.env, windowsHide: true, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024, ...opts,
});
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');

// --- synthetic media (one colour, tone and word per source second) --------
const COLORS = ['red', 'green', 'blue', 'yellow', 'cyan', 'magenta'];
const RGB = { red: [255, 0, 0], green: [0, 128, 0], blue: [0, 0, 255], yellow: [255, 255, 0], cyan: [0, 255, 255], magenta: [255, 0, 255], purple: [128, 0, 128], black: [0, 0, 0] };
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
const outro = join(fixture, 'outro.mp4');
run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=purple:s=640x360:r=25:d=1',
  '-f', 'lavfi', '-i', 'sine=frequency=2400:sample_rate=44100:duration=1', '-c:v', 'libx264', '-preset', 'ultrafast',
  '-pix_fmt', 'yuv420p', '-c:a', 'aac', outro]);
const words = COLORS.map((c, i) => ({ word: c, start: i + 0.2, end: i + 0.7, confidence: 1, speaker: `S${i % 2}` }));
const sourceHash = sha256(source);

// --- decode helpers ----------------------------------------------------------
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
  for (let i = 0; i < 3; i++) assert(Math.abs(got[i] - want[i]) <= 28, `frame at ${t}s of ${basename(path)} is ${got}, not ${color} ${want}`);
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

// --- compiled application modules ------------------------------------------
const dist = name => pathToFileURL(join(projectRoot, 'dist', name)).href;
const { PythonExecutor } = await import(dist('services/python-executor.js'));
const { ClipsHistory } = await import(dist('services/clips-history.js'));
const { ClipRevisionService, REVISION_NAMESPACE } = await import(dist('services/clip-revisions.js'));
const { StorageCleanup } = await import(dist('services/storage-cleanup.js'));
const { paths } = await import(dist('config/paths.js'));
assert.equal(paths.output, exportsDir);
assert.equal(paths.history, join(home, 'history'));

const historyPath = join(home, 'history', 'clips.json');
const entries = () => JSON.parse(readFileSync(historyPath, 'utf8'));
const history = new ClipsHistory();
const executor = new PythonExecutor(15 * 60 * 1000);
const results = { fixture, sourceHash, steps: {} };
const step = (name, value) => { results.steps[name] = value; console.log(`  ok: ${name}`); };
const expectedOf = s => ({ incarnation: s.incarnation, draft_version: s.draft_version, revision_version: s.revision_version });
const recipe = (over = {}) => ({
  source_video: source, title: 'revision-check', keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }],
  caption_style: 'karaoke', caption_position: 'auto', caption_font_scale: 100, crop_strategy: 'center', format: 'vertical',
  clean_fillers: false, outro_path: outro, bookend_fade: 0.25, ...over,
});

console.log('Legacy clip as version zero (real legacy render, flat output)...');
const legacy = (await executor.execute('create_clip', { video_path: source, transcript_words: words, caption_style: 'karaoke',
  crop_strategy: 'center', format: 'vertical', clean_fillers: false, output_dir: exportsDir, title: 'legacy-check', start_second: 1, end_second: 2 })).data;
assert.equal(legacy.output_path, join(exportsDir, 'legacy-check_short.mp4'));
const legacyHash = sha256(legacy.output_path);
const clip = await history.record({ source_video: source, start_second: 1, end_second: 2, caption_style: 'karaoke', crop_strategy: 'center',
  format: 'vertical', title: 'legacy-check', output_path: legacy.output_path, file_size_mb: legacy.file_size_mb, duration: legacy.duration,
  transcript_slice: 'green', unknown_field: { kept: true } });
const clipId = clip.id;
const namespace = join(exportsDir, REVISION_NAMESPACE, clipId);
const groups = () => (existsSync(namespace) ? readdirSync(namespace).sort() : []);
const entry = () => entries().find(e => e.id === clipId);
const svc = new ClipRevisionService({ history });
const v0 = await svc.ensureTracked(clipId);
assert.deepEqual([v0.current.version, v0.current.provenance, v0.current.output_path], [0, 'legacy-unversioned', legacy.output_path]);
step('legacy v0', { clipId, output_path: legacy.output_path, legacyHash });

console.log('Draft save leaves the served file and legacy summary untouched...');
const draft = await svc.saveDraft({ clip_id: clipId, expected: expectedOf(v0), draft: { recipe: recipe(), source_words: words } });
assert.equal(draft.draft.version, 1);
assert.equal(sha256(legacy.output_path), legacyHash);
assert.equal(entry().output_path, legacy.output_path);
assert.equal(entry().transcript_slice, 'green');
assert.deepEqual(groups(), []);
assert.deepEqual(JSON.parse(readFileSync(draft.draft.path, 'utf8')).draft.source_words, words);
step('draft', { path: draft.draft.path, draft_version: draft.state.draft_version });

console.log('Real exact revision through the bridge (reversed order, outro fade, Remotion captions)...');
let state = expectedOf(entry().revisions);
const request1 = { clip_id: clipId, operation_id: 'op-1', expected: state, recipe: recipe(), source_words: words };
const r1 = await svc.saveRevision(request1);
assert.equal(r1.outcome, 'committed', JSON.stringify(r1.operation));
{
  const e = entry();
  const st = e.revisions;
  const out = st.current.output_path;
  assert.equal(dirname(dirname(out)), st.current.group_root);
  assert.equal(dirname(st.current.group_root), namespace);
  assert.equal(basename(dirname(out)), 'final');
  assert(basename(st.current.group_root).startsWith('revision-check_short-'));
  assert.deepEqual(readdirSync(st.current.group_root), ['final']);
  assert.deepEqual([st.revision_version, st.current.version, st.previous.version, st.previous.output_path], [1, 1, 0, legacy.output_path]);
  // The legacy duration is the served file's probed length (1B.2b.1), not the 2 s of content.
  assert.deepEqual([e.output_path, e.start_second, e.end_second, e.duration, e.transcript_slice], [out, 1, 5, Math.round(Number(probe(out).format.duration) * 100) / 100, 'cyan green']);
  assert.deepEqual(e.keep_segments, [{ start: 4, end: 5 }, { start: 1, end: 2 }]);
  assert.deepEqual(e.unknown_field, { kept: true });
  assert.deepEqual(st.operations.map(o => [o.operation_id, o.state, o.revision_id]), [['op-1', 'committed', st.current.revision_id]]);
  const doc = await svc.loadRevision(clipId, st.current.revision_id);
  const tl = doc.render_timeline;
  assert.equal(tl.version, 1);
  assert.deepEqual(tl.segments.map(s => [s.source_start, s.source_end, s.content_start]), [[4, 5, 0], [1, 2, 1]]);
  assert.deepEqual(tl.words.content.map(w => [w.word, w.start, w.speaker]), [['cyan', 0.2, 'S0'], ['green', 1.2, 'S1']]);
  assert.deepEqual(tl.words.source.map(w => w.word), ['green', 'cyan']);
  assert.deepEqual(doc.source_words, words);
  assert.equal(doc.words_input, 'supplied');
  assert.equal(tl.captions.rendered, true);
  assert.equal(tl.thumbnail_card.applied, false);
  assert.deepEqual(doc.thumbnail_card, { requested: false, applied: false, note: doc.thumbnail_card.note });
  assert(['xfade_acrossfade', 'hardcut_soft_audio', 'hardcut'].includes(doc.bookends.outro.branch), doc.bookends.outro.branch);
  // A new save keeps the join inputs its outro was clamped from (lead-12).
  const joinInputs = doc.bookends.outro.join_inputs;
  assert(joinInputs && Number.isFinite(joinInputs.main_duration) && Number.isFinite(joinInputs.appended_duration), JSON.stringify(doc.bookends.outro));
  assert(Math.abs(doc.bookends.outro.asset_duration - joinInputs.appended_duration) <= 0.002, JSON.stringify(doc.bookends.outro));
  assert.equal(doc.files.main.path, out);
  assert.equal(doc.files.main.sha256, sha256(out));
  const format = probe(out).format;
  assert(Math.abs(Number(format.duration) - tl.output_duration) <= Math.max(0.05, tl.tolerance.composition_seconds), `probe ${format.duration} vs receipt ${tl.output_duration}`);
  assert.equal(Number(format.size), doc.files.main.bytes);
  // Without a card the served file is the raw exact render, and the composition record says so.
  assert.equal(doc.final_composition.version, 1);
  assert.equal(doc.final_composition.card, null);
  assert.deepEqual([doc.final_composition.output.file.path, doc.final_composition.output.duration, doc.final_composition.card_offset], [out, Number(format.duration), 0]);
  assert.deepEqual(st.current.groups, [st.current.group_root]);
  assertColor(out, 0.5, 'cyan');
  assertColor(out, 1.5, 'green');
  assertColor(out, tl.output_duration - 0.2, 'purple', 'center');
  assertTone(out, 0.3, 0.7, TONES[4]);
  assertTone(out, 1.3, 1.7, TONES[1]);
  const seen = new Set();
  for (let t = 0.125; t < 2.0; t += 0.25) seen.add(nearestColor(frameRgb(out, t)));
  assert.deepEqual([...seen].sort(), ['cyan', 'green'], `discarded seconds present: ${[...seen]}`);
  const captionPx = [captionPixels(out, 0.45), captionPixels(out, 1.45)];
  assert(captionPx.every(n => n > 500), `too few caption pixels: ${captionPx}`);
  assert.equal(sha256(legacy.output_path), legacyHash, 'legacy output changed');
  assert.equal(sha256(source), sourceHash, 'source changed');
  step('revision 1', { output_path: out, group_root: st.current.group_root, revision_id: st.current.revision_id, outro_branch: doc.bookends.outro.branch, output_duration: tl.output_duration, decoded: [...seen], captionPx, sha256: doc.files.main.sha256 });
}

console.log('Reopen from a separate process after "restart": same immutable files, same hashes...');
{
  const rev = entry().revisions.current;
  const reopen = join(fixture, 'reopen.mjs');
  writeFileSync(reopen, `
    import { pathToFileURL } from 'node:url';
    const dist = n => pathToFileURL(${JSON.stringify(join(projectRoot, 'dist'))} + '/' + n).href;
    const { ClipsHistory } = await import(dist('services/clips-history.js'));
    const { ClipRevisionService } = await import(dist('services/clip-revisions.js'));
    const svc = new ClipRevisionService({ history: new ClipsHistory() });
    const state = await svc.getState(process.argv[2]);
    const doc = await svc.loadRevision(process.argv[2], state.current.revision_id);
    const checks = await svc.verifyRevisionFiles(doc);
    console.log(JSON.stringify({ current: state.current, previous: state.previous, checks, content_text: doc.render_timeline.words.content_text, source_words: doc.source_words.length }));
  `);
  const child = spawnSync(process.execPath, [reopen, clipId], { env: process.env, encoding: 'utf8', windowsHide: true });
  assert.equal(child.status, 0, child.stderr);
  const seen = JSON.parse(child.stdout.trim().split('\n').pop());
  assert.equal(seen.current.revision_id, rev.revision_id);
  assert.equal(seen.current.output_path, rev.output_path);
  assert.deepEqual(seen.checks, [{ path: rev.output_path, ok: true }]);
  assert.equal(seen.content_text, 'cyan green');
  assert.equal(seen.source_words, 6);
  assert.equal(seen.previous.output_path, legacy.output_path);
  step('reopen after restart', seen);
}

console.log('Replay of the same operation renders nothing; the id cannot be reused for another request...');
{
  const before = groups();
  const bytes = readFileSync(historyPath);
  const replay = await svc.saveRevision(JSON.parse(JSON.stringify(request1)));
  assert.equal(replay.outcome, 'committed');
  assert.equal(replay.replayed, true);
  assert.equal(replay.revision.revision_id, entry().revisions.current.revision_id);
  assert.deepEqual(groups(), before);
  assert.deepEqual(readFileSync(historyPath), bytes);
  let error = null;
  try { await svc.saveRevision({ ...request1, recipe: recipe({ keep_segments: [{ start: 0, end: 1 }] }) }); } catch (e) { error = e; }
  assert.equal(error?.code, 'OPERATION_ID_REUSED');
  assert.deepEqual(readFileSync(historyPath), bytes);
  step('replay and id reuse', { replayed: replay.replayed, reuse: error.code });
}

console.log('Widen a later revision from the retained source words (real render)...');
{
  const first = entry().revisions.current;
  const firstHash = sha256(first.output_path);
  const doc1 = await svc.loadRevision(clipId, first.revision_id);
  const r2 = await svc.saveRevision({ clip_id: clipId, operation_id: 'op-2', expected: expectedOf(entry().revisions),
    recipe: recipe({ keep_segments: [{ start: 1, end: 4 }], outro_path: null, bookend_fade: null }), source_words: doc1.source_words });
  assert.equal(r2.outcome, 'committed', JSON.stringify(r2.operation));
  const st = entry().revisions;
  assert.deepEqual([st.revision_version, st.current.version, st.previous.revision_id], [2, 2, first.revision_id]);
  const doc2 = await svc.loadRevision(clipId, st.current.revision_id);
  assert.deepEqual(doc2.render_timeline.words.content.map(w => [w.word, w.start]), [['green', 0.2], ['blue', 1.2], ['yellow', 2.2]]);
  assert.equal(entry().transcript_slice, 'green blue yellow');
  assert.equal(doc2.bookends.outro, null);
  const out = st.current.output_path;
  assertColor(out, 0.5, 'green'); assertColor(out, 1.5, 'blue'); assertColor(out, 2.5, 'yellow');
  assertTone(out, 0.3, 0.7, TONES[1]); assertTone(out, 2.3, 2.7, TONES[3]);
  assert.equal(sha256(first.output_path), firstHash, 'revision 1 changed');
  assert.equal(sha256(legacy.output_path), legacyHash, 'legacy output changed');
  assert.equal(groups().length, 2);
  step('revision 2 widened', { output_path: out, content_text: doc2.render_timeline.words.content_text, previous: st.previous.revision_id });
}

console.log('Late completion after explicit cancellation is refused (real render, residual reported)...');
{
  const before = entry();
  const cancelling = new ClipRevisionService({ history, hooks: {
    beforeCommit: async ctx => { results.steps['cancel during render'] = await svc.invalidateOperation({ clip_id: clipId, operation_id: ctx.operation_id, expected_incarnation: before.revisions.incarnation, reason: 'check: cancelled before commit' }); },
  } });
  const r3 = await cancelling.saveRevision({ clip_id: clipId, operation_id: 'op-3', expected: expectedOf(before.revisions), recipe: recipe({ keep_segments: [{ start: 2, end: 3 }] }), source_words: words });
  assert.equal(r3.outcome, 'cancelled', JSON.stringify(r3.operation));
  const after = entry();
  assert.equal(after.output_path, before.output_path);
  assert.deepEqual(after.revisions.current, before.revisions.current);
  assert.equal(after.revisions.operations.at(-1).state, 'cancelled');
  assert.equal(groups().length, 3);
  const residualGroup = groups().find(g => !existsSync(join(namespace, g, 'final')) ? false : ![before.revisions.current.group_root, before.revisions.previous.group_root].map(p => basename(p)).includes(g));
  assert(r3.operation.residuals.includes(join(namespace, residualGroup)), JSON.stringify(r3.operation.residuals));
  assert(existsSync(join(namespace, residualGroup, 'final')), 'residual group must remain on disk, unreferenced');
  step('cancelled late commit', { residuals: r3.operation.residuals, current_unchanged: after.revisions.current.revision_id });
}

console.log('A Python metadata edit through its production history path during a real save survives the commit...');
{
  const pyWorker = join(projectRoot, 'scripts/verification/fixtures/history_worker.py');
  const mutating = new ClipRevisionService({ history, hooks: {
    beforeCommit: () => {
      const py = spawnSync(settings.PYTHON_PATH, [pyWorker, 'update', clipId, 'py_note', 'from-python-during-save'], { env: process.env, encoding: 'utf8', windowsHide: true });
      assert.equal(py.status, 0, py.stderr);
      results.steps['python mutation'] = JSON.parse(py.stdout.trim()).py_note;
    },
  } });
  const r4 = await mutating.saveRevision({ clip_id: clipId, operation_id: 'op-4', expected: expectedOf(entry().revisions), recipe: recipe({ keep_segments: [{ start: 5, end: 6 }], outro_path: null, bookend_fade: null }), source_words: words });
  assert.equal(r4.outcome, 'committed', JSON.stringify(r4.operation));
  const e = entry();
  assert.equal(e.py_note, 'from-python-during-save');
  assert.equal(e.revisions.revision_version, 3);
  assert.equal(e.transcript_slice, 'magenta');
  assertColor(e.output_path, 0.5, 'magenta');
  assert(!existsSync(join(home, 'history', 'clips.json.lock')));
  step('python edit during save', { py_note: e.py_note, revision_version: e.revisions.revision_version });
}

console.log('Replay of the oldest operation, now older than current/previous, returns its complete original result without rendering...');
{
  const bytes = readFileSync(historyPath);
  const before = groups();
  const first = results.steps['revision 1'];
  const old = await svc.saveRevision(JSON.parse(JSON.stringify(request1)));
  assert.equal(old.outcome, 'committed');
  assert.equal(old.replayed, true);
  assert.deepEqual([old.revision.version, old.revision.revision_id, old.revision.output_path, old.revision.group_root], [1, first.revision_id, first.output_path, first.group_root]);
  assert.notEqual(entry().revisions.current.revision_id, first.revision_id);
  assert.notEqual(entry().revisions.previous.revision_id, first.revision_id);
  assert.equal(sha256(old.revision.output_path), first.sha256);
  assert.deepEqual(groups(), before);
  assert.deepEqual(readFileSync(historyPath), bytes);
  assert.equal(entry().revisions.operations.length, 4);
  step('old replay', { version: old.revision.version, revision_id: old.revision.revision_id, operations: entry().revisions.operations.map(o => [o.operation_id, o.state]) });
}

// --- opening thumbnail card (1B.2b.1) -----------------------------------------
const cardA = join(fixture, 'card-a.png');
run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=orange:s=1280x720:d=1', '-vf', 'drawbox=x=540:y=260:w=200:h=200:color=blue:t=fill', '-frames:v', '1', cardA]);
const cardB = join(fixture, 'card-b.png');
run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=purple:s=720x1280:d=1', '-vf', 'drawbox=x=260:y=540:w=200:h=200:color=yellow:t=fill', '-frames:v', '1', cardB]);
const logo = join(fixture, 'logo.png');
run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=white:s=256x256:d=1', '-frames:v', '1', logo]);
const cardOf = path => ({ image_path: path, image_sha256: sha256(path), placement: 'opening', duration: 1.5 });
const walkFiles = dir => readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walkFiles(join(dir, d.name)) : [join(dir, d.name)]));
const namespaceHashes = () => Object.fromEntries(walkFiles(namespace).map(p => [p, sha256(p)]));
const assertKept = before => { for (const [p, h] of Object.entries(before)) assert.equal(sha256(p), h, `${p} changed`); };
const decode = (path, args) => execFileSync(settings.FFMPEG_PATH, ['-loglevel', 'error', ...args.slice(0, 2), '-i', path, ...args.slice(2)], { env: process.env, windowsHide: true, maxBuffer: 256 << 20 });
const pcm = (path, rate) => {
  const raw = decode(path, ['-ss', '0', '-vn', '-f', 'f32le', '-ac', '1', '-ar', String(rate), '-']);
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length - (raw.length % 4)));
};
// Samples between the raw audio and its place after the card, by cross-correlation
// across a tone change at raw second `change`; and the card's peak level.
const audioLag = (rawPath, outPath, rate, cardSeconds, change) => {
  const raw = pcm(rawPath, rate);
  const out = pcm(outPath, rate);
  const offset = Math.round(cardSeconds * rate);
  const s0 = Math.round((change - 0.4) * rate);
  const s1 = Math.round((change + 0.4) * rate);
  let best = -Infinity;
  let lag = 0;
  for (let l = -1024; l <= 1024; l++) {
    let score = 0;
    for (let i = s0; i < s1; i++) score += raw[i] * out[offset + l + i];
    if (score > best) { best = score; lag = l; }
  }
  let peak = 0;
  for (let i = 0; i < offset - 2048; i++) peak = Math.max(peak, Math.abs(out[i]));
  return { lag, peak };
};
const grayFrame = (path, t) => decode(path, ['-ss', t.toFixed(3), '-frames:v', '1', '-vf', 'scale=108:192', '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
const meanDiff = (a, b) => a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / a.length;
// Near-white pixels in the top-left quarter, where the renderer draws a top-left logo
// (108 px from the edge, 180 px down, 126 px high at 1920 px).
const whitePixels = (path, t) => {
  const raw = decode(path, ['-ss', t.toFixed(3), '-frames:v', '1', '-vf', 'crop=540:480:0:0', '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
  let count = 0;
  for (const v of raw) if (v > 230) count++;
  return count;
};
const card = {};

console.log('A card draft persists the choice without rendering, composing or touching the served file...');
{
  const before = entry();
  const servedHash = sha256(before.output_path);
  const groupsBefore = groups();
  const d = await svc.saveDraft({ clip_id: clipId, expected: expectedOf(before.revisions), draft: { recipe: recipe(), source_words: words, thumbnail_card: cardOf(cardA) } });
  assert.deepEqual(JSON.parse(readFileSync(d.draft.path, 'utf8')).draft.thumbnail_card, cardOf(cardA));
  assert.deepEqual(groups(), groupsBefore);
  assert.equal(sha256(before.output_path), servedHash);
  assert.deepEqual(entry().revisions.current, before.revisions.current);
  step('card draft', { path: d.draft.path, draft_version: d.state.draft_version, thumbnail_card: cardOf(cardA) });
}

console.log('Real card revision: exact render, then the real composer; decoded card, content, captions, outro and audio offset...');
{
  const before = entry();
  const kept = namespaceHashes();
  const groupsBefore = groups();
  card.request = { clip_id: clipId, operation_id: 'op-card-1', expected: expectedOf(before.revisions), recipe: recipe(), source_words: words, thumbnail_card: cardOf(cardA) };
  const r = await svc.saveRevision(structuredClone(card.request));
  assert.equal(r.outcome, 'committed', JSON.stringify(r.operation));
  assertKept(kept);
  const st = entry().revisions;
  const [rawGroup, cardGroup] = st.current.groups;
  assert.deepEqual(groups().filter(g => !groupsBefore.includes(g)).map(g => join(namespace, g)), [rawGroup, cardGroup]);
  assert(basename(cardGroup).startsWith('revision-check_short_card-'), cardGroup);
  assert.deepEqual(readdirSync(join(cardGroup, 'final')).sort(), ['card-image.png', 'revision-check_short.mp4']);
  assert.deepEqual(readdirSync(rawGroup), ['final']);
  const doc = await svc.loadRevision(clipId, st.current.revision_id);
  const fc = doc.final_composition;
  const out = doc.files.main.path;
  const raw = fc.raw_render.file.path;
  assert.deepEqual([st.current.output_path, st.current.group_root, dirname(dirname(out)), dirname(dirname(raw))], [out, cardGroup, cardGroup, rawGroup]);
  // The renderer's receipt is unmodified: it describes the raw render, which has no card.
  assert.deepEqual([doc.render_timeline.thumbnail_card.applied, doc.render_timeline.output.path], [false, raw]);
  assert.deepEqual([doc.thumbnail_card.requested, doc.thumbnail_card.applied, doc.thumbnail_card.image.sha256], [true, true, sha256(cardA)]);
  assert.equal(sha256(fc.card.image.path), sha256(cardA));
  assert(Math.abs(fc.card.measured_duration - 1.5) <= fc.card.frame_duration / 2 + 1e-9, JSON.stringify(fc.card));
  assert.deepEqual([fc.card.overlap, fc.card.transition, fc.card_offset], [0, 'hardcut', fc.card.measured_duration]);
  assert(Math.abs(fc.content_offset - (fc.card_offset + doc.render_timeline.content_to_output_offset)) < 1e-9);
  const outProbe = probe(out);
  const rawProbe = probe(raw);
  const video = outProbe.streams.find(s => s.codec_type === 'video');
  const rawVideo = rawProbe.streams.find(s => s.codec_type === 'video');
  assert.deepEqual([video.width, video.height, video.sample_aspect_ratio], [rawVideo.width, rawVideo.height, rawVideo.sample_aspect_ratio]);
  assert.equal(Number(outProbe.format.duration), fc.output.duration);
  // Decoded card: the image centre and its letterbox, the same in every card frame (no captions, logo or animation).
  assertColor(out, 0.3, 'blue', 'center');
  assertColor(out, 0.3, 'black');
  assertColor(out, fc.card_offset - 0.1, 'blue', 'center');
  const cardStill = meanDiff(grayFrame(out, 0.2), grayFrame(out, fc.card_offset - 0.1));
  assert(cardStill < 2, `the card changes between its frames: ${cardStill}`);
  // Then the exact render, second by second, with its captions and outro.
  assertColor(out, fc.card_offset + 0.5, 'cyan');
  assertColor(out, fc.card_offset + 1.5, 'green');
  assertColor(out, fc.output.duration - 0.2, 'purple', 'center');
  assertTone(out, fc.card_offset + 0.3, fc.card_offset + 0.7, TONES[4]);
  assertTone(out, fc.card_offset + 1.3, fc.card_offset + 1.7, TONES[1]);
  const captionPx = [captionPixels(out, fc.card_offset + 0.45), captionPixels(out, fc.card_offset + 1.45)];
  assert(captionPx.every(n => n > 500), `too few caption pixels after the card: ${captionPx}`);
  const rate = Number(rawProbe.streams.find(s => s.codec_type === 'audio').sample_rate);
  const { lag, peak } = audioLag(raw, out, rate, fc.card_offset, 1.0);
  assert(Math.abs(lag) <= 1, `raw audio is ${lag} samples from the card offset`);
  assert(peak < 0.01, `the card is not silent: peak ${peak}`);
  const e = entry();
  assert.deepEqual([e.output_path, e.duration, e.thumbnail_config?.card_seconds], [out, Math.round(fc.output.duration * 100) / 100, fc.card.measured_duration]);
  // 1B.2b.4a projection: the preview is the committed card image's owned copy; no stale logo backup.
  assert.equal(e.thumbnail_config.preview_path, fc.card.image.path);
  assert.equal(sha256(e.thumbnail_config.preview_path), fc.card.descriptor.image_sha256);
  assert.equal(e.logo_backup_path, undefined);
  // Reopen from a separate process: every file the revision depends on still verifies.
  const child = spawnSync(process.execPath, [join(fixture, 'reopen.mjs'), clipId], { env: process.env, encoding: 'utf8', windowsHide: true });
  assert.equal(child.status, 0, child.stderr);
  const reopened = JSON.parse(child.stdout.trim().split('\n').pop());
  assert.deepEqual(reopened.checks.map(c => [c.path, c.ok]), [[out, true], [raw, true], [fc.card.image.path, true]]);
  assert.equal(sha256(legacy.output_path), legacyHash, 'legacy output changed');
  Object.assign(card, { revision_id: st.current.revision_id, out, groups: st.current.groups });
  step('card revision', { output_path: out, raw, groups: st.current.groups, frames: fc.card.frames, frame_duration: fc.card.frame_duration, measured_duration: fc.card.measured_duration,
    content_offset: fc.content_offset, raw_output_duration: fc.raw_render.output_duration, output_duration: fc.output.duration, audio_rate: rate, audio_lag_samples: lag, card_peak: peak,
    card_still_diff: cardStill, captionPx, tolerance: fc.tolerance, reopened: reopened.checks });
}

console.log('Card replay renders and composes nothing, even with the selected image gone...');
{
  const bytes = readFileSync(historyPath);
  const before = groups();
  const moved = join(fixture, 'card-a.moved.png');
  renameSync(cardA, moved);
  try {
    const replay = await svc.saveRevision(structuredClone(card.request));
    assert.deepEqual([replay.outcome, replay.replayed, replay.revision.revision_id, replay.revision.output_path], ['committed', true, card.revision_id, card.out]);
    assert.deepEqual(replay.revision.groups, card.groups);
    assert.deepEqual(groups(), before);
    assert.deepEqual(readFileSync(historyPath), bytes);
  } finally {
    renameSync(moved, cardA);
  }
  step('card replay without image', { replayed: true, revision_id: card.revision_id });
}

console.log('Changing the card composes again from a fresh render; the earlier card revision stays byte-identical...');
{
  const kept = namespaceHashes();
  const r = await svc.saveRevision({ clip_id: clipId, operation_id: 'op-card-2', expected: expectedOf(entry().revisions), recipe: recipe(), source_words: words, thumbnail_card: cardOf(cardB) });
  assert.equal(r.outcome, 'committed', JSON.stringify(r.operation));
  assertKept(kept);
  const st = entry().revisions;
  assert.equal(st.previous.revision_id, card.revision_id);
  assert(!card.groups.includes(st.current.groups[0]) && !card.groups.includes(st.current.groups[1]));
  const doc = await svc.loadRevision(clipId, st.current.revision_id);
  const out = doc.files.main.path;
  assert.equal(dirname(dirname(doc.final_composition.raw_render.file.path)), st.current.groups[0]);
  assertColor(out, 0.3, 'yellow', 'center');
  assertColor(out, 0.3, 'purple');
  assertColor(out, doc.final_composition.card_offset + 0.5, 'cyan');
  assertColor(card.out, 0.3, 'blue', 'center');
  step('card changed', { output_path: out, previous: card.revision_id, image_sha256: doc.thumbnail_card.image.sha256 });
  card.changed = { out, groups: st.current.groups };
}

console.log('Removing the card commits the exact render itself as the served file...');
{
  const kept = namespaceHashes();
  const r = await svc.saveRevision({ clip_id: clipId, operation_id: 'op-card-3', expected: expectedOf(entry().revisions), recipe: recipe(), source_words: words, thumbnail_card: null });
  assert.equal(r.outcome, 'committed', JSON.stringify(r.operation));
  assertKept(kept);
  const e = entry();
  const st = e.revisions;
  const doc = await svc.loadRevision(clipId, st.current.revision_id);
  assert.deepEqual([doc.final_composition.card, st.current.groups, doc.files.main.path], [null, [st.current.group_root], st.current.output_path]);
  assertColor(st.current.output_path, 0.5, 'cyan');
  assert.equal(whitePixels(st.current.output_path, 0.5), 0);
  assert.deepEqual([e.thumbnail_config?.card_seconds, e.duration], [0, Math.round(Number(probe(st.current.output_path).format.duration) * 100) / 100]);
  // 1B.2b.4a projection: without a card no thumbnail preview is kept.
  assert.equal(e.thumbnail_config.preview_path, undefined);
  step('card removed', { output_path: st.current.output_path, duration: e.duration });
  card.removed = { out: st.current.output_path };
}

console.log('Changing content and logo with the card composes from the new render; the logo is drawn on the content, never on the card...');
{
  const kept = namespaceHashes();
  const earlier = new Set([...card.groups, ...card.changed.groups]);
  const r = await svc.saveRevision({ clip_id: clipId, operation_id: 'op-card-4', expected: expectedOf(entry().revisions),
    recipe: recipe({ keep_segments: [{ start: 2, end: 3 }, { start: 5, end: 6 }], logo_path: logo }), source_words: words, thumbnail_card: cardOf(cardA) });
  assert.equal(r.outcome, 'committed', JSON.stringify(r.operation));
  assertKept(kept);
  const e = entry();
  const doc = await svc.loadRevision(clipId, e.revisions.current.revision_id);
  const fc = doc.final_composition;
  const out = doc.files.main.path;
  assert(!e.revisions.current.groups.some(g => earlier.has(g)));
  assert.equal(e.logo_path, logo);
  assertColor(out, 0.3, 'blue', 'center');
  assertColor(out, fc.card_offset + 0.5, 'blue');
  assertColor(out, fc.card_offset + 1.5, 'magenta');
  const logoPx = { card: whitePixels(out, 0.5), content: whitePixels(out, fc.card_offset + 0.5), previous_without_logo: whitePixels(card.removed.out, 0.5) };
  assert(logoPx.content > 2000, `no logo on the content: ${JSON.stringify(logoPx)}`);
  assert.equal(logoPx.card, 0, `a logo was drawn on the card: ${JSON.stringify(logoPx)}`);
  assert.equal(e.transcript_slice, 'blue magenta');
  step('content and logo with card', { output_path: out, logoPx, content_offset: fc.content_offset });
}

console.log('A card whose image changed after it was chosen is refused before anything renders...');
{
  const chosen = cardOf(cardB);
  const original = readFileSync(cardB);
  writeFileSync(cardB, Buffer.concat([original, Buffer.from('changed')]));
  const bytes = readFileSync(historyPath);
  const before = groups();
  let error = null;
  try {
    await svc.saveRevision({ clip_id: clipId, operation_id: 'op-card-5', expected: expectedOf(entry().revisions), recipe: recipe(), source_words: words, thumbnail_card: chosen });
  } catch (err) { error = err; }
  writeFileSync(cardB, original);
  assert.equal(error?.code, 'CARD_IMAGE_MISMATCH');
  assert.deepEqual(readFileSync(historyPath), bytes);
  assert.deepEqual(groups(), before);
  step('changed card image refused', { code: error.code, message: error.message });
}

console.log('A real composition whose receipt claims one card frame fewer is refused; both groups are named...');
{
  const before = entry();
  const groupsBefore = groups();
  const lying = new ClipRevisionService({ history, compose: async params => {
    const data = (await executor.execute('compose_opening_card', params)).data;
    data.card.frames -= 1;
    return data;
  } });
  const r = await lying.saveRevision({ clip_id: clipId, operation_id: 'op-card-6', expected: expectedOf(before.revisions), recipe: recipe({ keep_segments: [{ start: 3, end: 4 }] }), source_words: words, thumbnail_card: cardOf(cardA) });
  assert.equal(r.outcome, 'failed', JSON.stringify(r.operation));
  assert.match(r.operation.error, /composition card\.frames/);
  const created = groups().filter(g => !groupsBefore.includes(g)).map(g => join(namespace, g));
  assert.equal(created.length, 2);
  assert.deepEqual(r.operation.residuals, created);
  const after = entry();
  assert.deepEqual([after.output_path, after.revisions.current, after.revisions.previous], [before.output_path, before.revisions.current, before.revisions.previous]);
  step('contradictory composition refused', { error: r.operation.error, residuals: r.operation.residuals });
}

console.log('Real compositions whose receipts contradict their measured audio or omit required timing are refused; nothing moves...');
{
  const refusals = {};
  const cases = [
    ['contradictory audio claims', data => {
      assert(data.raw.audio && data.output.audio, 'the bridge render must carry audio for this refusal');
      const claimed = { sample_rate: 1, channels: 99, start: 999, duration: 999 };
      data.raw.audio = { ...data.raw.audio, ...claimed };
      data.output.audio = { ...data.output.audio, ...claimed };
    }, /composition raw\.audio\.sample_rate is 1; expected /],
    ['omitted duration and card timing', data => {
      for (const [part, key] of [['raw', 'duration'], ['output', 'duration'], ['card', 'output_start'], ['card', 'output_end'], ['card', 'frame_duration']]) delete data[part][key];
    }, /composition raw\.duration is required/],
  ];
  for (const [i, [label, mutate, refusal]] of cases.entries()) {
    const before = entry();
    const groupsBefore = groups();
    const lying = new ClipRevisionService({ history, compose: async params => {
      const data = (await executor.execute('compose_opening_card', params)).data;
      mutate(data);
      return data;
    } });
    const r = await lying.saveRevision({ clip_id: clipId, operation_id: `op-card-receipt-${i + 1}`, expected: expectedOf(before.revisions), recipe: recipe({ keep_segments: [{ start: 3, end: 4 }] }), source_words: words, thumbnail_card: cardOf(cardA) });
    assert.equal(r.outcome, 'failed', JSON.stringify(r.operation));
    assert.match(r.operation.error, refusal);
    const created = groups().filter(g => !groupsBefore.includes(g)).map(g => join(namespace, g));
    assert.equal(created.length, 2);
    assert.deepEqual(r.operation.residuals, created);
    const after = entry();
    assert.deepEqual([after.output_path, after.revisions.current, after.revisions.previous], [before.output_path, before.revisions.current, before.revisions.previous]);
    refusals[label] = r.operation.error;
  }
  step('incomplete or contradictory composition receipts refused', refusals);
}

console.log('Malformed card descriptors, identifiers and recipes never reach the renderer...');
{
  const bytes = readFileSync(historyPath);
  const before = groups();
  const state = expectedOf(entry().revisions);
  const refusals = {};
  for (const [label, req] of [
    ['thumbnail card', { clip_id: clipId, operation_id: 'op-card', expected: state, recipe: recipe(), source_words: words, thumbnail_card: { preview_path: 'x.png' } }],
    ['clip id traversal', { clip_id: '../' + clipId, operation_id: 'op-x', expected: state, recipe: recipe(), source_words: words }],
    ['operation id traversal', { clip_id: clipId, operation_id: '..', expected: state, recipe: recipe(), source_words: words }],
    ['relative source', { clip_id: clipId, operation_id: 'op-x', expected: state, recipe: recipe({ source_video: 'source.mp4' }), source_words: words }],
    ['title separator', { clip_id: clipId, operation_id: 'op-x', expected: state, recipe: recipe({ title: '../escape' }), source_words: words }],
    ['missing outro', { clip_id: clipId, operation_id: 'op-x', expected: state, recipe: recipe({ outro_path: join(fixture, 'no.mp4') }), source_words: words }],
    ['stale expected state', { clip_id: clipId, operation_id: 'op-x', expected: { ...state, revision_version: 0 }, recipe: recipe(), source_words: words }],
  ]) {
    let error = null;
    try { await svc.saveRevision(req); } catch (e) { error = e; }
    assert(error, `${label} was not refused`);
    refusals[label] = error.code;
  }
  assert.deepEqual(refusals, { 'thumbnail card': 'INVALID_THUMBNAIL_CARD', 'clip id traversal': 'INVALID_IDENTIFIER', 'operation id traversal': 'INVALID_IDENTIFIER',
    'relative source': 'INVALID_RECIPE', 'title separator': 'INVALID_RECIPE', 'missing outro': 'INVALID_RECIPE', 'stale expected state': 'EXPECTED_STATE_MISMATCH' });
  assert.deepEqual(readFileSync(historyPath), bytes);
  assert.deepEqual(groups(), before);
  step('refusals', refusals);
}

console.log('Configured export and history roots that are junctions are refused before anything is written through them...');
{
  const physical = { exports: join(fixture, 'outside-export-root'), history: join(fixture, 'outside-history-root') };
  const linked = { exports: join(fixture, 'linked-export-root'), history: join(fixture, 'linked-history-root') };
  for (const kind of ['exports', 'history']) {
    mkdirSync(physical[kind]);
    writeFileSync(join(physical[kind], 'sentinel.txt'), `outside ${kind}`);
    symlinkSync(physical[kind], linked[kind], 'junction');
    assert(lstatSync(linked[kind]).isSymbolicLink(), `${linked[kind]} is not a junction`);
  }
  const bytes = readFileSync(historyPath);
  const before = groups();
  const operationsBefore = entry().revisions.operations.length;
  const state = expectedOf(entry().revisions);
  const linkedSvc = new ClipRevisionService({ history, exportRoot: linked.exports, historyRoot: linked.history });
  const codes = {};
  for (const [label, call] of [
    ['draft', () => linkedSvc.saveDraft({ clip_id: clipId, expected: state, draft: { recipe: recipe(), source_words: words } })],
    ['revision', () => linkedSvc.saveRevision({ clip_id: clipId, operation_id: 'op-linked-root', expected: state, recipe: recipe(), source_words: words })],
  ]) {
    let error = null;
    try { await call(); } catch (e) { error = e; }
    assert(error, `${label} through a linked configured root was not refused`);
    codes[label] = error.code;
  }
  assert.deepEqual(codes, { draft: 'OWNERSHIP_ESCAPE', revision: 'OWNERSHIP_ESCAPE' });
  for (const kind of ['exports', 'history']) {
    assert.deepEqual(readdirSync(physical[kind]), ['sentinel.txt'], `${kind} link target changed`);
    assert.equal(readFileSync(join(physical[kind], 'sentinel.txt'), 'utf8'), `outside ${kind}`);
  }
  assert.deepEqual(readFileSync(historyPath), bytes);
  assert.deepEqual(groups(), before);
  assert.equal(entry().revisions.operations.length, operationsBefore);
  step('configured root links', codes);
}

console.log('Real Cleanup scan: nothing under the export namespace is offered; a control reel is...');
{
  const interrupted = join(namespace, 'revision-check_short-interrupted-1-abcd');
  mkdirSync(join(interrupted, 'staging'), { recursive: true });
  writeFileSync(join(interrupted, 'staging', 'revision-check_short.mp4'), 'partial');
  const control = join(home, 'reel_unused');
  mkdirSync(control, { recursive: true });
  writeFileSync(join(control, 'highlights_reel.mp4'), 'unused');
  const old = new Date(Date.now() - 3 * 3600_000);
  for (const p of [interrupted, join(interrupted, 'staging'), join(interrupted, 'staging', 'revision-check_short.mp4'), control, join(control, 'highlights_reel.mp4')]) utimesSync(p, old, old);
  // Card revisions, composer residuals and card images are aged too: none may become eligible.
  for (const p of walkFiles(namespace)) utimesSync(p, old, old);
  const groupsBefore = groups();
  const namespaceBefore = namespaceHashes();
  const cleanup = new StorageCleanup({ home, working: join(fixture, 'data', 'working'), temporary: join(fixture, 'tmp'), cache: join(fixture, 'data', 'cache'), output: exportsDir, currentState: () => ({}) });
  const report = cleanup.scan();
  assert.deepEqual(report.warnings, []);
  assert.deepEqual(report.items.filter(i => i.eligible).map(i => i.path), [control]);
  assert(!report.items.some(i => i.path.toLowerCase().startsWith(exportsDir.toLowerCase())), 'export namespace offered for cleanup');
  const removed = await cleanup.remove(report.scanId, report.items.filter(i => i.eligible).map(i => i.id));
  assert.deepEqual(removed.deleted.map(d => d.path), [control]);
  const st = entry().revisions;
  for (const p of [legacy.output_path, st.current.output_path, st.previous.output_path, join(interrupted, 'staging', 'revision-check_short.mp4')]) assert(existsSync(p), `${p} was removed`);
  assert.deepEqual(groups(), groupsBefore);
  assertKept(namespaceBefore);
  assert.equal(sha256(legacy.output_path), legacyHash);
  step('cleanup protection', { eligible: [control], groups: groups().length, exports_kept: report.storage.find(s => s.label.startsWith('Finished exports')) });
}

console.log('A real receipt stripped of its join provenance is refused for a new save; nothing moves...');
{
  const before = entry();
  const groupsBefore = groups();
  let removed = null;
  const withoutJoinInputs = new ClipRevisionService({ history, render: async params => {
    const data = (await executor.execute('create_clip', params)).data;
    removed = structuredClone(data.render_timeline.bookends.outro.join_inputs);
    delete data.render_timeline.bookends.outro.join_inputs;
    return data;
  } });
  const r5 = await withoutJoinInputs.saveRevision({ clip_id: clipId, operation_id: 'op-5', expected: expectedOf(before.revisions),
    recipe: recipe({ keep_segments: [{ start: 3, end: 4 }] }), source_words: words });
  assert.equal(r5.outcome, 'failed', JSON.stringify(r5.operation));
  assert.match(r5.operation.error, /receipt outro lacks join_inputs: a new save needs/);
  assert(removed && Number.isFinite(removed.main_duration) && Number.isFinite(removed.appended_duration), 'the real receipt carried no join_inputs to remove');
  const after = entry();
  assert.deepEqual([after.output_path, after.revisions.current, after.revisions.previous, after.revisions.revision_version],
    [before.output_path, before.revisions.current, before.revisions.previous, before.revisions.revision_version]);
  const created = groups().filter(g => !groupsBefore.includes(g));
  assert.equal(created.length, 1);
  assert.deepEqual(r5.operation.residuals, [join(namespace, created[0])]);
  assert.equal(sha256(legacy.output_path), legacyHash, 'legacy output changed');
  step('missing join provenance refused', { error: r5.operation.error, removed_join_inputs: removed, residuals: r5.operation.residuals });
}

assert.equal(sha256(source), sourceHash, 'source bytes changed');
writeFileSync(join(fixture, 'result.json'), JSON.stringify(results, null, 2));
console.log(`Passed. Evidence: ${join(fixture, 'result.json')}`);
