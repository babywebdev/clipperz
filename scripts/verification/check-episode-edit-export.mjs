// Isolated Studio: edit a transcript, reload its cache, and export the entire video.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRuntime, installationRoot, projectRoot } from '../local/runtime.mjs';
const { env, settings } = loadRuntime();
const fixture = mkdtempSync(join(installationRoot, 'tmp/episode-edit-export-'));
for (const dir of ['home', 'data', 'exports', 'tmp']) mkdirSync(join(fixture, dir));
writeFileSync(join(fixture, 'empty.env'), '');
const port = 3897, base = `http://127.0.0.1:${port}`;
const serverEnv = { ...env, PODCLI_HOME: join(fixture, 'home'), PODCLI_DATA: join(fixture, 'data'),
  PODCLI_OUTPUT: join(fixture, 'exports'), PODCLI_CWD: join(fixture, 'home'), PODCLI_PORT: String(port),
  PODCLI_ENV_FILE: join(fixture, 'empty.env'), TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp') };
const run = (exe, args) => execFileSync(exe, args, { env: serverEnv, windowsHide: true, encoding: 'utf8', timeout: 180000, maxBuffer: 5 * 1024 * 1024 });
const source = join(fixture, 'episode.mp4'), bookend = join(fixture, 'bookend.mp4');
run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30',
  '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '4', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', source]);
run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=navy:size=320x240:rate=30',
  '-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=44100', '-t', '1', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', bookend]);
const server = spawn(settings.PODCLI_NODE, [join(projectRoot, 'dist/ui/web-server.js')], {
  cwd: serverEnv.PODCLI_CWD, env: serverEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
const closed = once(server, 'close');
let logs = '';
server.stdout.on('data', chunk => { logs += chunk; });
server.stderr.on('data', chunk => { logs += chunk; });
writeFileSync(join(projectRoot, '_local/episode-edit-fixture.json'), JSON.stringify({ fixture, pid: server.pid, port, source }));
const post = async (path, body, status = 200) => {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  assert.equal(response.status, status, JSON.stringify(data)); return data;
};
const jobResult = async jobId => {
  for (let i = 0; i < 300; i++) {
    const state = await (await fetch(`${base}/api/job/${jobId}`)).json();
    if (state.status === 'error') throw new Error(state.error + '\n' + logs.slice(-5000));
    if (state.status === 'done') return state.result;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Render timed out');
};
const probe = file => JSON.parse(run(settings.FFPROBE_PATH, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]));
function media(result, dimensions, duration) {
  const info = probe(result.output_path), video = info.streams.find(s => s.codec_type === 'video');
  assert.deepEqual([video.width, video.height], dimensions);
  assert(info.streams.some(s => s.codec_type === 'audio'));
  assert(Math.abs(Number(info.format.duration) - duration) < .2, JSON.stringify(info.format));
  run(settings.FFMPEG_PATH, ['-v', 'error', '-i', result.output_path, '-f', 'null', '-']);
}
try {
  for (let i = 0; ; i++) {
    assert(i < 100 && server.exitCode === null, logs || 'Server failed to start');
    try { if ((await fetch(base + '/api/local-policy')).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await post('/api/select-file', { file_path: source });
  const words = ['This', 'zebra', 'game', 'looks', 'great.'].map((word, i) => ({ word, start: .2 + i * .65, end: .7 + i * .65 }));
  const original = { words, transcript: words.map(w => w.word).join(' '), duration: 4,
    segments: [{ id: 0, start: .2, end: 3.3, text: words.map(w => w.word).join(' ') }], language: 'en', engine: 'whisper-py' };
  const framing = { mode: 'manual', zoom: 1.6, positionX: 52, positionY: 42, background: 'blur' };
  await post('/api/ui-state', { videoPath: source, transcript: original, suggestions: [], phase: 'idle',
    settings: { captionStyle: 'hormozi', captionPosition: 'upper', captionFontScale: 115,
      cropStrategy: 'center', foregroundFraming: framing, format: 'vertical', cleanFillers: false } });
  console.log('Correcting transcript words and verifying persisted captions...');
  const edit = { video_path: source, base_words: words, edits: [{ from: 0, to: 5, text: 'This Zelda video game looks great.' }] };
  const { transcript } = await post('/api/edit-transcript', edit);
  assert.equal(transcript.transcript, 'This Zelda video game looks great.');
  assert.deepEqual(transcript.words[0], words[0]);
  assert.deepEqual(transcript.words.at(-1), words.at(-1));
  await post('/api/edit-transcript', edit, 409);
  const reloaded = await post('/api/transcribe', { file_path: source, enable_diarization: false });
  assert.equal(reloaded.cached, true);
  assert.deepEqual(reloaded.data.words, transcript.words);
  await new Promise(resolve => setTimeout(resolve, 1200)); // UI persistence is debounced.
  const saved = JSON.parse(readFileSync(join(fixture, 'home/ui-state.json')));
  assert.deepEqual(saved.transcript.words, transcript.words);
  const request = { video_path: source, transcript_words: transcript.words, caption_style: 'hormozi',
    caption_position: 'upper', caption_font_scale: 115, crop_strategy: 'center', clean_fillers: false };
  console.log('Rendering full vertical episode with manual framing and intro/outro...');
  const vertical = await jobResult((await post('/api/export-full-episode', { ...request, format: 'vertical',
    foreground_framing: framing, intro_path: bookend, outro_path: bookend })).job_id);
  media(vertical, [1080, 1920], 6);
  run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-ss', '2.2', '-i', vertical.output_path, '-frames:v', '1', join(fixture, 'vertical-corrected.png')]);
  console.log('Rendering full horizontal and square episodes...');
  const horizontal = await jobResult((await post('/api/export-full-episode', { ...request, format: 'horizontal' })).job_id);
  media(horizontal, [1920, 1080], 4);
  const square = await jobResult((await post('/api/export-full-episode', { ...request, format: 'square',
    foreground_framing: { mode: 'fit', background: 'black' } })).job_id);
  media(square, [1080, 1080], 4);
  assert.deepEqual((await (await fetch(base + '/api/ui-state')).json()).suggestions, []);
  assert.equal((await (await fetch(base + '/api/history')).json()).length, 0);
  assert.equal((await fetch(`${base}/api/download/${encodeURIComponent(vertical.filename)}`)).status, 200);
  await post('/api/export-full-episode', { ...request, format: 'horizontal', foreground_framing: {} }, 400);
  writeFileSync(join(fixture, 'result.json'), JSON.stringify({ transcript, vertical, horizontal, square, passed: true }, null, 2));
  console.log('Passed: corrected transcript survives cache reload, all formats/audio verified, complete timeline and bookends retained, no clips needed.');
  if (process.argv.includes('--keep-open')) { console.log(`UI fixture ready at ${base}/episode`); await closed; }
} finally {
  if (server.exitCode === null) { server.kill(); await closed; }
  writeFileSync(join(fixture, 'server.log'), logs);
}
