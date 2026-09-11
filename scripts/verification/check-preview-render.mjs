// Actual preview/export parity on disposable media and an isolated Studio.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRuntime, installationRoot, projectRoot } from '../local/runtime.mjs';
const { env, settings } = loadRuntime();
const fixture = mkdtempSync(join(installationRoot, 'tmp/preview-render-'));
for (const dir of ['home', 'data', 'exports', 'tmp']) mkdirSync(join(fixture, dir));
writeFileSync(join(fixture, 'empty.env'), '');
const port = 3893, base = `http://127.0.0.1:${port}`;
const serverEnv = { ...env, PODCLI_HOME: join(fixture, 'home'), PODCLI_DATA: join(fixture, 'data'),
  PODCLI_OUTPUT: join(fixture, 'exports'), PODCLI_CWD: join(fixture, 'home'), PODCLI_PORT: String(port),
  PODCLI_ENV_FILE: join(fixture, 'empty.env'), TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp') };
const run = (exe, args) => execFileSync(exe, args, { env: serverEnv, windowsHide: true, encoding: 'utf8', timeout: 180000, maxBuffer: 5 * 1024 * 1024 });
const source = join(fixture, 'source.mp4');
run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=30',
  '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '4', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', source]);
const server = spawn(settings.PODCLI_NODE, [join(projectRoot, 'dist/ui/web-server.js')], {
  cwd: serverEnv.PODCLI_CWD, env: serverEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
const closed = once(server, 'close');
let logs = '';
server.stdout.on('data', chunk => { logs += chunk; });
server.stderr.on('data', chunk => { logs += chunk; });
writeFileSync(join(projectRoot, '_local/preview-fixture.json'), JSON.stringify({ fixture, pid: server.pid, port }));
const post = async (path, body) => {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  assert(response.ok, JSON.stringify(data)); return data;
};
const jobResult = async (jobId) => {
  for (let i = 0; i < 300; i++) {
    const state = await (await fetch(`${base}/api/job/${jobId}`)).json();
    if (state.status === 'error') throw new Error(state.error);
    if (state.status === 'done') return state.result;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Render timed out');
};
try {
  for (let i = 0; ; i++) {
    assert(i < 100 && server.exitCode === null, logs || 'Server failed to start');
    try { if ((await fetch(base + '/api/local-policy')).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await post('/api/select-file', { file_path: source });
  const words = ['Preview', 'matches', 'the', 'export'].map((word, i) => ({ word, start: i, end: i + .8 }));
  const framing = { mode: 'manual', zoom: 1.5, positionX: 65, positionY: 40, background: 'black' };
  const clip = { start_second: 0, end_second: 4, title: 'Framing verification', caption_style: 'karaoke',
    format: 'vertical', crop_strategy: 'center', foreground_framing: framing, keep_segments: [{ start: 0, end: 4 }] };
  await post('/api/ui-state', { videoPath: source, transcript: { words, duration: 4, segments: [] }, suggestions: [clip], phase: 'review',
    settings: { captionStyle: 'karaoke', cropStrategy: 'center', foregroundFraming: framing, format: 'vertical', cleanFillers: false } });
  const body = { ...clip, video_path: source, transcript_words: words, clean_fillers: false };
  console.log('Rendering disposable preview...');
  const previewJob = await post('/api/render-preview', body);
  const preview = await jobResult(previewJob.job_id);
  assert.equal((await (await fetch(base + '/api/history')).json()).length, 0, 'Preview must not enter the library');
  assert.equal((await fetch(`${base}/api/rendered-preview/${previewJob.job_id}`, { headers: { Range: 'bytes=0-1023' } })).status, 206);
  console.log('Rendering matching disposable batch export...');
  const exportJob = await post('/api/batch-clips', { video_path: source, clips: [clip], transcript_words: words, clean_fillers: false });
  const batch = await jobResult(exportJob.job_id);
  const exported = batch.results[0];
  assert.equal(exported.status, 'success', exported.error);
  const hash = path => run(settings.FFMPEG_PATH, ['-v', 'error', '-i', path, '-map', '0:v:0', '-map', '0:a:0', '-f', 'framemd5', '-']);
  assert.equal(hash(preview.output_path), hash(exported.output_path), 'Decoded preview and export must match');
  const probe = JSON.parse(run(settings.FFPROBE_PATH, ['-v', 'error', '-show_streams', '-of', 'json', preview.output_path]));
  const video = probe.streams.find(stream => stream.codec_type === 'video');
  assert.deepEqual([video.width, video.height], [1080, 1920]);
  assert(probe.streams.some(stream => stream.codec_type === 'audio'));
  writeFileSync(join(fixture, 'result.json'), JSON.stringify({ preview, exported, parity: 'identical decoded video and audio' }, null, 2));
  console.log('Passed: preview/export video and audio match; correct dimensions; preview stays out of history.');
  if (process.argv.includes('--keep-open')) {
    console.log(`UI fixture ready at ${base}/episode; server PID ${server.pid}`);
    await closed;
  }
} finally {
  if (server.exitCode === null) { server.kill(); await closed; }
  writeFileSync(join(fixture, 'server.log'), logs);
}
