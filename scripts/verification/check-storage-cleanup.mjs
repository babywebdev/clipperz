// Destructive checks use this disposable installation only, never the live home.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { request } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { loadRuntime, installationRoot, projectRoot } from '../local/runtime.mjs';
import { studioStatus } from '../local/studio-status.mjs';
const { env, settings } = loadRuntime();
const port = 3899, base = `http://127.0.0.1:${port}`;
await new Promise((resolve, reject) => { const p = createServer(); p.once('error', reject); p.listen(port, '127.0.0.1', () => p.close(resolve)); });
const fixture = mkdtempSync(join(installationRoot, 'tmp/storage-cleanup-'));
for (const dir of ['home', 'data/working/uploads', 'exports', 'tmp']) mkdirSync(join(fixture, dir), { recursive: true });
writeFileSync(join(fixture, 'empty.env'), '');
const put = (p, text = 'fixture video bytes') => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, text); return p; };
const old = p => { const date = new Date(Date.now() - 72 * 3600_000); utimesSync(p, date, date); };
const source = put(join(fixture, 'data/working/uploads/protected-source.mp4'));
const unused = put(join(fixture, 'data/working/uploads/unused-copy.mp4'));
const protectedReel = join(fixture, 'home/reel_saved'); put(join(protectedReel, 'highlights_reel.mp4'));
const discarded = join(fixture, 'home/reel_discarded'); put(join(discarded, 'highlights_reel.mp4'));
const stale = put(join(fixture, 'tmp/old-preview.mp4')); old(stale);
const final = put(join(fixture, 'exports/final.mp4'));
put(join(fixture, 'home/ui-state.json'), JSON.stringify({ videoPath: source, phase: 'idle', settings: { format: 'vertical' } }));
put(join(fixture, 'home/reels/saved.json'), JSON.stringify({ session_id: 'saved', source, profile: 'auto', out_dir: protectedReel, moments: [] }));
put(join(fixture, 'home/sources.json'), JSON.stringify([source, unused, join(discarded, 'highlights_reel.mp4')]));
old(source); old(join(fixture, 'data/working/uploads'));
const serverEnv = { ...env, PODCLI_HOME: join(fixture, 'home'), PODCLI_DATA: join(fixture, 'data'),
  PODCLI_OUTPUT: join(fixture, 'exports'), PODCLI_CWD: join(fixture, 'home'), PODCLI_PORT: String(port),
  PODCLI_ENV_FILE: join(fixture, 'empty.env'), TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp') };
const server = spawn(settings.PODCLI_NODE, [join(projectRoot, 'dist/ui/web-server.js')], {
  cwd: serverEnv.PODCLI_CWD, env: serverEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
const closed = once(server, 'close'); let logs = '';
server.stdout.on('data', b => logs += b); server.stderr.on('data', b => logs += b);
const post = async (body, status = 200) => {
  const response = await fetch(base + '/api/cleanup/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json(); assert.equal(response.status, status, JSON.stringify(data)); return data;
};
try {
  for (let i = 0; ; i++) {
    assert(i < 100 && server.exitCode === null, logs);
    try { const health = await (await fetch(base + '/api/health')).json(); if (health.service === 'clipperz-studio' && health.home === serverEnv.PODCLI_HOME) break; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  assert.equal((await studioStatus({ port, home: serverEnv.PODCLI_HOME })).status, 'running');
  assert.equal((await studioStatus({ port, home: 'another-installation' })).status, 'occupied');
  assert(!logs.includes('manage_config is disabled'));
  assert(existsSync(source), 'Startup must retain an older, referenced upload');
  let report = await (await fetch(base + '/api/cleanup')).json();
  assert.equal(report.warnings.length, 0);
  assert.equal(report.items.find(i => i.path === source).eligible, false);
  assert.equal(report.items.find(i => i.path === protectedReel).eligible, false);
  const selection = report.items.filter(i => i.eligible);
  assert.equal(selection.length, 3);
  await post({ scan_id: report.scanId, item_ids: ['../exports/final.mp4'] }, 400);
  const heldUpload = request(base + '/api/upload', { method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=cleanup-test' } });
  heldUpload.on('error', () => {});
  heldUpload.write('--cleanup-test\r\nContent-Disposition: form-data; name="file"; filename="upload.mp4"\r\nContent-Type: video/mp4\r\n\r\npartial');
  await new Promise(r => setTimeout(r, 150));
  await post({ scan_id: report.scanId, item_ids: selection.map(i => i.id) }, 409);
  heldUpload.destroy(); await new Promise(r => setTimeout(r, 150));
  const result = await post({ scan_id: report.scanId, item_ids: selection.map(i => i.id) });
  assert.equal(result.deleted.length, 3); assert.equal(result.skipped.length, 0);
  for (const p of [source, final, join(protectedReel, 'highlights_reel.mp4')]) assert.equal(readFileSync(p, 'utf8'), 'fixture video bytes');
  const sources = await (await fetch(base + '/api/sources')).json();
  assert.deepEqual(sources.map(s => s.path), [source]);
  report = await (await fetch(base + '/api/cleanup')).json();
  assert.equal(report.items.filter(i => i.eligible && i.path !== join(fixture, 'data/working/uploads')).some(i => selection.some(s => s.id === i.id)), false);
  console.log('Passed: startup preserves old uploads, health identifies the instance, scan protects saved work, deletion rejects arbitrary IDs and active uploads, selected files removed, sources and exports retained.');
  if (process.argv.includes('--keep-open')) {
    put(join(discarded, 'highlights_reel.mp4')); put(stale); old(stale);
    writeFileSync(join(projectRoot, '_local/storage-cleanup-fixture.json'), JSON.stringify({ fixture, pid: server.pid, port }));
    console.log(`Browser fixture ready: ${base}/cleanup`); await closed;
  }
} finally { if (server.exitCode === null) { server.kill(); await closed; } writeFileSync(join(fixture, 'server.log'), logs); }
