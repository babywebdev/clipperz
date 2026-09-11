// Exercise unused highlight batches with real audio analysis, cuts, and Studio routes.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { loadRuntime, installationRoot, projectRoot } from '../local/runtime.mjs';

const { env, settings } = loadRuntime();
// Never let this harness send fixture mutations to an already-running Studio.
await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(3896, '127.0.0.1', () => probe.close(resolve));
});
const fixture = mkdtempSync(join(installationRoot, 'tmp/highlight-batches-'));
for (const dir of ['home', 'data', 'exports', 'tmp']) mkdirSync(join(fixture, dir));
writeFileSync(join(fixture, 'empty.env'), '');
const serverEnv = { ...env, PODCLI_HOME: join(fixture, 'home'), PODCLI_DATA: join(fixture, 'data'),
  PODCLI_OUTPUT: join(fixture, 'exports'), PODCLI_CWD: join(fixture, 'home'), PODCLI_PORT: '3896',
  PODCLI_ENV_FILE: join(fixture, 'empty.env'), TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp') };
const run = (exe, args, encoding = 'utf8') => execFileSync(exe, args, {
  env: serverEnv, cwd: projectRoot, windowsHide: true, encoding, timeout: 120000, maxBuffer: 4 * 1024 * 1024,
});
const source = join(fixture, 'four-moments.mp4');
run(settings.FFMPEG_PATH, ['-y', '-v', 'error', '-f', 'lavfi', '-i',
  'color=red:s=384x216:r=15:d=25[r];color=lime:s=384x216:r=15:d=25[g];color=blue:s=384x216:r=15:d=25[b];color=yellow:s=384x216:r=15:d=25[y];[r][g][b][y]concat=n=4:v=1:a=0', '-f', 'lavfi', '-i',
  'aevalsrc=sin(2*PI*440*t)*(0.001+0.6*exp(-(t-10)*(t-10)/0.16)+0.4*exp(-(t-35)*(t-35)/0.16)+0.2*exp(-(t-60)*(t-60)/0.16)+0.1*exp(-(t-85)*(t-85)/0.16)):s=16000:d=100',
  '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', source]);
const server = spawn(settings.PODCLI_NODE, [join(projectRoot, 'dist/ui/web-server.js')], {
  cwd: serverEnv.PODCLI_CWD, env: serverEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
const closed = once(server, 'close');
let logs = '';
server.stdout.on('data', data => { logs += data; });
server.stderr.on('data', data => { logs += data; });
const base = 'http://127.0.0.1:3896';
async function post(body, ok = true) {
  const r = await fetch(base + '/api/reel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json();
  if (ok) assert.equal(r.status, 200, JSON.stringify(data));
  else assert(r.status >= 400, JSON.stringify(data));
  return data;
}
function media(session, min, max, count = 1) {
  assert.equal(session.moments.length, count);
  for (const m of session.moments)
    assert(m.end - m.start >= min - .0001 && m.end - m.start <= max + .0001, JSON.stringify(m));
  const duration = session.moments.reduce((sum, m) => sum + m.end - m.start, 0);
  const info = JSON.parse(run(settings.FFPROBE_PATH, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', session.reel_path]));
  const video = info.streams.find(s => s.codec_type === 'video');
  assert.deepEqual([video.width, video.height], [1920, 1080]);
  assert(info.streams.some(s => s.codec_type === 'audio'));
  assert(Math.abs(Number(info.format.duration) - duration) < .2);
  run(settings.FFMPEG_PATH, ['-v', 'error', '-i', session.reel_path, '-f', 'null', '-']);
}
function colorAt(file, time) {
  const rgb = run(settings.FFMPEG_PATH, ['-v', 'error', '-ss', String(time), '-i', file,
    '-vf', 'scale=2:2', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], null);
  assert(rgb.length >= 3, `Missing frame at ${time} in ${file}`);
  return [...rgb.subarray(0, 3)].map(v => v > 100 ? 1 : 0).join('');
}
function checkOrder(session, file = session.reel_path) {
  let time = 0;
  for (const m of session.moments.filter(m => m.enabled)) {
    assert.equal(colorAt(file, time + 1), colorAt(source, m.start + 1), `Wrong moment at reel time ${time}`);
    time += m.end - m.start;
  }
  const info = JSON.parse(run(settings.FFPROBE_PATH, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]));
  assert(info.streams.some(s => s.codec_type === 'audio'));
  assert(Math.abs(Number(info.format.duration) - time) < .4);
  run(settings.FFMPEG_PATH, ['-v', 'error', '-i', file, '-f', 'null', '-']);
}
async function variant(session, format) {
  const response = await fetch(base + '/api/reel-export', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: session.session_id, format }) });
  assert.equal(response.status, 200, await response.clone().text());
  const { job_id } = await response.json();
  for (let i = 0; i < 180; i++) {
    const job = await (await fetch(`${base}/api/job/${job_id}`)).json();
    assert.notEqual(job.status, 'error', job.error);
    if (job.status === 'done') {
      checkOrder(session, job.result.file_path);
      const info = JSON.parse(run(settings.FFPROBE_PATH, ['-v', 'error', '-show_streams', '-of', 'json', job.result.file_path]));
      const video = info.streams.find(s => s.codec_type === 'video');
      assert.deepEqual([video.width, video.height], format === 'vertical' ? [1080, 1920] : [1080, 1080]);
      return job.result;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error('Format export timed out');
}
try {
  for (let i = 0; ; i++) {
    assert(i < 100 && server.exitCode === null, logs);
    try { if ((await fetch(base + '/api/local-policy')).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log('Detecting batch 1 from four real audio peaks...');
  const first = await post({ action: 'new', video_path: source, auto: false, top_n: 1, min_dur: 3, max_dur: 4, format: 'horizontal' });
  const firstFile = join(fixture, 'home/reels', first.session_id + '.json');
  const original = readFileSync(firstFile, 'utf8');
  media(first, 3, 4);
  console.log('Finding batch 2 with different Custom lengths...');
  const second = await post({ action: 'different', mode: 'new', session_id: first.session_id, auto: false, top_n: 2, min_dur: 5, max_dur: 5 });
  media(second, 5, 5, 2);
  console.log('Finding batch 3 by reopening batch 1...');
  const third = await post({ action: 'different', mode: 'new', session_id: first.session_id });
  media(third, 3, 4);
  assert.deepEqual([first.batch_number, second.batch_number, third.batch_number], [1, 2, 3]);
  const ranges = [first, second, third].flatMap(s => s.moments).sort((a, b) => a.start - b.start);
  for (let i = 1; i < ranges.length; i++) assert(ranges[i - 1].end <= ranges[i].start, JSON.stringify(ranges));
  assert.equal(readFileSync(firstFile, 'utf8'), original);
  const before = readdirSync(join(fixture, 'home/reels'));
  const exhausted = await post({ action: 'different', session_id: first.session_id, auto: false, top_n: 1, min_dur: 101, max_dur: 102 }, false);
  assert.match(JSON.stringify(exhausted), /No unused highlights/);
  assert.deepEqual(readdirSync(join(fixture, 'home/reels')), before);
  const invalid = await post({ action: 'different', session_id: first.session_id, auto: false, min_dur: 10, max_dur: 5 }, false);
  assert.match(JSON.stringify(invalid), /maximum length/);
  const download = await fetch(`${base}/api/reel-download?path=${encodeURIComponent(second.reel_path)}`);
  assert.equal(download.status, 200);
  assert((await download.arrayBuffer()).byteLength > 0);
  console.log('Appending to a curated reel, preserving its trim and excluded moment...');
  let curated = await post({ action: 'new', video_path: source, auto: false, top_n: 1, min_dur: 3, max_dur: 4, format: 'horizontal' });
  curated = await post({ action: 'edit', session_id: curated.session_id, index: 1, op: 'set', start: curated.moments[0].start + .2, end: curated.moments[0].end - .2 });
  curated = await post({ action: 'edit', session_id: curated.session_id, index: 1, op: 'toggle' });
  assert.equal(curated.reel_path, null, 'An empty cut must not keep a stale reel');
  const excluded = curated.moments[0];
  const originalClip = readFileSync(excluded.clip_path);
  const countBefore = (await post({ action: 'list' })).sessions.length;
  const appended = await post({ action: 'different', session_id: curated.session_id, expected_revision: curated.revision, auto: false, top_n: 2, min_dur: 5, max_dur: 5 });
  assert.equal(appended.session_id, curated.session_id);
  assert.equal(appended.batch_number, 1);
  assert.equal(appended.moments.length, 3);
  for (const key of ['moment_id', 'start', 'end', 'enabled', 'text']) assert.equal(appended.moments[0][key], excluded[key]);
  assert.deepEqual(readFileSync(appended.moments[0].clip_path), originalClip);
  assert.equal((await post({ action: 'list' })).sessions.length, countBefore);
  checkOrder(appended);
  console.log('Reordering cached clips and checking actual exported frame order...');
  const order = [appended.moments[2].moment_id, appended.moments[0].moment_id, appended.moments[1].moment_id];
  let reordered = await post({ action: 'reorder', session_id: appended.session_id, expected_revision: appended.revision, order });
  assert.deepEqual(reordered.moments.map(m => m.moment_id), order);
  checkOrder(reordered);
  assert.equal(colorAt(reordered.moments[0].clip_path, 1), colorAt(source, reordered.moments[0].start + 1));
  const reload = await post({ action: 'show', session_id: reordered.session_id });
  assert.deepEqual(reload.moments.map(m => m.moment_id), order);
  const stale = await post({ action: 'reorder', session_id: reordered.session_id, expected_revision: appended.revision, order: [...order].reverse() }, false);
  assert.match(JSON.stringify(stale), /another window/);
  const invalidOrder = await post({ action: 'reorder', session_id: reordered.session_id, order: order.slice(1) }, false);
  assert.match(JSON.stringify(invalidOrder), /exactly once/);
  reordered = await post({ action: 'different', session_id: reordered.session_id, expected_revision: reordered.revision, auto: false, top_n: 1, min_dur: 3, max_dur: 4 });
  assert.deepEqual(reordered.moments.slice(0, 3).map(m => m.moment_id), order);
  assert.equal(reordered.moments.length, 4);
  checkOrder(reordered);
  console.log('Checking reordered vertical and square downloads...');
  await variant(reordered, 'vertical');
  await variant(reordered, 'square');
  writeFileSync(join(projectRoot, '_local/highlight-batch-fixture.json'), JSON.stringify({ fixture, source, serverPid: server.pid, first, second, third, reordered }));
  console.log('Passed: separate batches, append preserving edits, persisted manual order, actual reel/clip frame order and audio, stale edits, and empty/no-match cuts.');
  if (process.argv.includes('--keep-open')) { console.log('UI fixture ready at http://localhost:3896/highlights'); await closed; }
} finally {
  if (server.exitCode === null) { server.kill(); await closed; }
  writeFileSync(join(fixture, 'server.log'), logs);
}
