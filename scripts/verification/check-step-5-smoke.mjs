import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { loadRuntime, projectRoot, installationRoot } from '../local/runtime.mjs';
import { localMcpTools } from '../../dist/config/policy.js';

const { env, settings } = loadRuntime();
mkdirSync(join(installationRoot, 'tmp'), { recursive: true });
mkdirSync(join(projectRoot, '_local/verification'), { recursive: true });
const fixture = mkdtempSync(join(installationRoot, 'tmp/step-5-smoke-'));
for (const dir of ['home', 'data', 'exports', 'tmp']) mkdirSync(join(fixture, dir));
writeFileSync(join(fixture, 'empty.env'), '');
const port = 3891;
const serverEnv = { ...env, PODCLI_HOME: join(fixture, 'home'), PODCLI_DATA: join(fixture, 'data'),
  PODCLI_OUTPUT: join(fixture, 'exports'), PODCLI_CWD: join(fixture, 'home'), PODCLI_PORT: String(port),
  PODCLI_ENV_FILE: join(fixture, 'empty.env'), TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp'),
};
const server = spawn(settings.PODCLI_NODE, [join(projectRoot, 'dist/ui/web-server.js')], {
  cwd: serverEnv.PODCLI_CWD, env: serverEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
const closed = once(server, 'close');
let logs = '';
server.stdout.on('data', data => { logs += data; });
server.stderr.on('data', data => { logs += data; });
const base = `http://127.0.0.1:${port}`;
const checks = [];
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(`Fixture studio exited: ${logs}`);
    try {
      const response = await fetch(`${base}/api/local-policy`);
      if (response.ok) { const policy = await response.json(); assert(policy.localOnly && policy.strict); ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'Fixture studio failed to start');
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert(page.headers.get('content-security-policy').includes("connect-src 'self'"));
  const html = await page.text();
  assert(!html.includes('fonts.googleapis.com'));
  for (const [, asset] of html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)) {
    assert.equal((await fetch(base + asset)).status, 200);
  }
  checks.push('Loopback studio and bundled UI assets respond; local-only CSP applied');
  for (const path of ['/api/download-video', '/api/assets/url', '/api/youtube/sync', '/api/thumbnail-studio/render', '/api/settings']) {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 403, path);
  }
  const remoteMedia = await fetch(base + '/api/select-file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_path: 'https://example.com/video.mp4' }) });
  assert.equal(remoteMedia.status, 403);
  const provider = await (await fetch(base + '/api/ai-provider-status')).json();
  assert.equal(provider.mode, 'codex-then-claude');
  assert.deepEqual(provider.providers.map(p => p.engine), ['codex', 'claude']);
  const config = await (await fetch(base + '/api/settings')).json();
  assert.deepEqual(config.settings, []);
  assert.equal((await fetch(base + '/api/local-policy', { headers: { Origin: 'https://example.com' } })).status, 403);
  checks.push('Cloud/download/thumbnail/settings changes rejected; strict provider order reported');
  assert.deepEqual(readdirSync(join(fixture, 'home/knowledge')), []);
  assert.deepEqual(readdirSync(join(fixture, 'exports')), []);

  // The real MCP launcher uses the actual reviewed installation profile. Listing
  // tools and rejecting a disabled tool require no source media or AI inference.
  const transport = new StdioClientTransport({ command: settings.PODCLI_NODE,
    args: [join(projectRoot, 'scripts/local/launch.mjs'), 'mcp'], cwd: settings.PODCLI_HOME,
    env: Object.fromEntries(Object.entries(env).filter(([, value]) => typeof value === 'string')),
    stderr: 'pipe',
  });
  const client = new Client({ name: 'clipperz-installation-check', version: '1.0.0' });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(tool => tool.name).sort(), [...localMcpTools].sort());
    const outputs = await client.callTool({ name: 'list_outputs', arguments: {} });
    assert(!outputs.isError, 'Allowed list_outputs tool must be callable');
    const blocked = await client.callTool({ name: 'manage_assets', arguments: { action: 'list' } });
    assert.equal(blocked.isError, true);
    checks.push(`Real MCP launcher handshake and ${tools.tools.length} allowed tools verified; list_outputs succeeds; disabled tool rejected`);
  } finally { await client.close(); }
  writeFileSync(join(projectRoot, '_local/verification/step-5-smoke.json'), JSON.stringify({ checkedAt: new Date().toISOString(), fixture, checks, inferenceRequests: 0 }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, checks, fixture }, null, 2));
} finally {
  server.kill();
  await closed;
  writeFileSync(join(fixture, 'studio.log'), logs);
}
