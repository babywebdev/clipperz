// Disposable Studio: verify framing survives both HTTP sync and process restart.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRuntime, installationRoot, projectRoot } from '../local/runtime.mjs';

const { env, settings } = loadRuntime();
const fixture = mkdtempSync(join(installationRoot, 'tmp/framing-state-'));
for (const dir of ['home', 'data', 'exports', 'tmp']) mkdirSync(join(fixture, dir));
writeFileSync(join(fixture, 'empty.env'), '');
const port = 3892;
const base = `http://127.0.0.1:${port}`;
const serverEnv = { ...env, PODCLI_HOME: join(fixture, 'home'), PODCLI_DATA: join(fixture, 'data'),
  PODCLI_OUTPUT: join(fixture, 'exports'), PODCLI_CWD: join(fixture, 'home'), PODCLI_PORT: String(port),
  PODCLI_ENV_FILE: join(fixture, 'empty.env'), TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp') };
const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
let server, closed;
async function start() {
  server = spawn(settings.PODCLI_NODE, [join(projectRoot, 'dist/ui/web-server.js')], {
    cwd: serverEnv.PODCLI_CWD, env: serverEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  closed = once(server, 'close');
  let logs = '';
  server.stdout.on('data', chunk => { logs += chunk; });
  server.stderr.on('data', chunk => { logs += chunk; });
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(logs);
    try { if ((await fetch(base + '/api/local-policy')).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Fixture server failed to start');
}
async function stop() { server.kill(); await closed; }
const framing = { sideTrimPercent: 12.5, foregroundBottom: .658 };
try {
  await start();
  assert.equal((await post('/api/ui-state', { settings: { foregroundFraming: framing, format: 'vertical' } })).status, 200);
  let state = await (await fetch(base + '/api/ui-state')).json();
  assert.deepEqual(state.settings.foregroundFraming, framing);
  // State writes are debounced.
  await new Promise(resolve => setTimeout(resolve, 1500));
  await stop();
  await start();
  state = await (await fetch(base + '/api/ui-state')).json();
  assert.deepEqual(state.settings.foregroundFraming, framing);
  assert.equal((await post('/api/create-clip', { foreground_framing: framing, format: 'square' })).status, 400);
  assert.equal((await post('/api/ui-state', { settings: { foregroundFraming: { sideTrimPercent: 100 } } })).status, 400);
  state = await (await fetch(base + '/api/ui-state')).json();
  assert.deepEqual(state.settings.foregroundFraming, framing, 'Invalid updates must not erase settings');
  assert.equal((await post('/api/ui-state', { settings: { format: 'horizontal' } })).status, 200);
  state = await (await fetch(base + '/api/ui-state')).json();
  assert.equal(state.settings.foregroundFraming, null);
  const manual = { mode: 'manual', zoom: 2, positionX: 65, positionY: 35, background: 'black' };
  await post('/api/ui-state', { settings: { foregroundFraming: manual, format: 'square' } });
  await new Promise(resolve => setTimeout(resolve, 1500));
  await stop(); await start();
  state = await (await fetch(base + '/api/ui-state')).json();
  assert.deepEqual(state.settings.foregroundFraming, manual);
  await post('/api/ui-state', { settings: { format: 'horizontal' } });
  state = await (await fetch(base + '/api/ui-state')).json();
  assert.deepEqual(state.settings.foregroundFraming, manual, 'Manual placement supports all formats');
  console.log('Passed: framing sync, process restart, invalid input rejection, and horizontal reset.');
} finally {
  if (server?.exitCode === null) await stop();
}
