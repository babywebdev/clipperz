// Real format exports through the Studio API, using an isolated highlights session.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRuntime, installationRoot, projectRoot } from '../local/runtime.mjs';

const { env, settings } = loadRuntime();
const fixture = mkdtempSync(join(installationRoot, 'tmp/highlight-downloads-'));
for (const dir of ['home', 'data', 'exports', 'tmp']) mkdirSync(join(fixture, dir));
writeFileSync(join(fixture, 'empty.env'), '');
const serverEnv = { ...env, PODCLI_HOME: join(fixture, 'home'), PODCLI_DATA: join(fixture, 'data'),
  PODCLI_OUTPUT: join(fixture, 'exports'), PODCLI_CWD: join(fixture, 'home'), PODCLI_PORT: '3895',
  PODCLI_ENV_FILE: join(fixture, 'empty.env'), TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp') };
const run = (exe, args, encoding = 'utf8') => execFileSync(exe, args, {
  env: serverEnv, cwd: projectRoot, windowsHide: true, encoding, timeout: 120000, maxBuffer: 4 * 1024 * 1024,
});
const source = join(fixture, 'source.mp4');
run(settings.FFMPEG_PATH, ['-y', '-v', 'error', '-f', 'lavfi', '-i',
  'color=red:size=384x216:rate=30:duration=2.5,drawbox=x=128:y=0:w=128:h=216:color=green:t=fill,drawbox=x=256:y=0:w=128:h=216:color=blue:t=fill',
  '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=2.5', '-c:v', 'libx264', '-c:a', 'aac', source]);
run(settings.PYTHON_PATH, ['-c', `import sys
sys.path.insert(0, sys.argv[1])
from services.reel import ReelSession, Moment, build_reel
s = ReelSession('download_fixture', sys.argv[2], 'auto', sys.argv[3], format='vertical',
    moments=[Moment(0, .8), Moment(.8, 1.6, enabled=False), Moment(1.6, 2.4)])
build_reel(s)
`, join(projectRoot, 'backend'), source, join(fixture, 'exports')]);
const sessionFile = join(fixture, 'home/reels/download_fixture.json');
const savedBefore = readFileSync(sessionFile, 'utf8');
const server = spawn(settings.PODCLI_NODE, [join(projectRoot, 'dist/ui/web-server.js')], {
  cwd: serverEnv.PODCLI_CWD, env: serverEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
const closed = once(server, 'close');
let logs = '';
server.stdout.on('data', data => { logs += data; });
server.stderr.on('data', data => { logs += data; });
writeFileSync(join(projectRoot, '_local/highlight-download-fixture.json'), JSON.stringify({ fixture, source, serverPid: server.pid }));
const base = 'http://127.0.0.1:3895';
const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function exportResult(body) {
  const response = await post('/api/reel-export', { session_id: 'download_fixture', ...body });
  assert.equal(response.status, 200, await response.clone().text());
  const { job_id } = await response.json();
  for (let i = 0; i < 180; i++) {
    const job = await (await fetch(`${base}/api/job/${job_id}`)).json();
    assert.notEqual(job.status, 'error', job.error);
    if (job.status === 'done') return job.result;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Export timed out');
}
const probe = file => JSON.parse(run(settings.FFPROBE_PATH, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]));
function checkMedia(file, dimensions, duration) {
  const info = probe(file);
  const video = info.streams.find(s => s.codec_type === 'video');
  assert.deepEqual([video.width, video.height], dimensions);
  assert(info.streams.some(s => s.codec_type === 'audio'));
  assert(Math.abs(Number(info.format.duration) - duration) < .15, JSON.stringify(info.format));
  run(settings.FFMPEG_PATH, ['-v', 'error', '-i', file, '-f', 'null', '-']);
}
try {
  for (let i = 0; ; i++) {
    assert(i < 100 && server.exitCode === null, logs);
    try { if ((await fetch(base + '/api/local-policy')).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal((await post('/api/reel-export', { session_id: '../invalid', format: 'horizontal' })).status, 400);
  assert.equal((await post('/api/reel-export', { session_id: 'download_fixture', format: 'bogus' })).status, 400);
  console.log('Exporting horizontal and vertical versions of one moment...');
  const horizontal = await exportResult({ format: 'horizontal', index: 1 });
  const vertical = await exportResult({ format: 'vertical', index: 1 });
  checkMedia(horizontal.file_path, [1920, 1080], .8);
  checkMedia(vertical.file_path, [1080, 1920], .8);
  const pixels = run(settings.FFMPEG_PATH, ['-v', 'error', '-ss', '0.3', '-i', horizontal.file_path,
    '-vf', 'scale=12:6', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], null);
  const left = (3 * 12 + 1) * 3, right = (3 * 12 + 10) * 3;
  assert(pixels[left] > 180 && pixels[left + 2] < 50, 'Horizontal must recover the red left edge from the original');
  assert(pixels[right + 2] > 180 && pixels[right] < 50, 'Horizontal must recover the blue right edge from the original');
  const cached = await exportResult({ format: 'horizontal', index: 1 });
  assert.equal(cached.file_path, horizontal.file_path);
  assert.equal(cached.cached, true);
  console.log('Exporting the full reel and checking enabled moments...');
  const reel = await exportResult({ format: 'horizontal' });
  checkMedia(reel.file_path, [1920, 1080], 1.6);
  assert.equal(readFileSync(sessionFile, 'utf8'), savedBefore, 'Exports must not change the saved session');
  const download = await fetch(`${base}/api/reel-download?path=${encodeURIComponent(horizontal.file_path)}`);
  assert.equal(download.status, 200);
  assert(download.headers.get('content-disposition')?.includes('attachment'));
  assert((await download.arrayBuffer()).byteLength > 0);
  const edited = await post('/api/reel', { action: 'edit', session_id: 'download_fixture', index: 1, op: 'set', end: .5 });
  assert.equal(edited.status, 200, await edited.text());
  const trimmed = await exportResult({ format: 'horizontal', index: 1 });
  assert.notEqual(trimmed.file_path, horizontal.file_path);
  checkMedia(trimmed.file_path, [1920, 1080], .5);
  writeFileSync(join(fixture, 'verification.json'), JSON.stringify({ horizontal, vertical, reel, trimmed, passed: true }, null, 2));
  console.log('Passed: source edges retained, both dimensions/audio verified, reel selection respected, cached variants invalidated after trim.');
  if (process.argv.includes('--keep-open')) { console.log('UI fixture ready at http://localhost:3895/highlights'); await closed; }
} finally {
  if (server.exitCode === null) { server.kill(); await closed; }
  writeFileSync(join(fixture, 'server.log'), logs);
}
