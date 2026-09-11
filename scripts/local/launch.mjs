// One shared, explicit profile for studio and MCP. No shell wrappers or auto-install.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRuntime, projectRoot } from './runtime.mjs';
import { verifyExecutables } from './preflight.mjs';
import { studioStatus } from './studio-status.mjs';

const mode = process.argv[2];
if (!['studio', 'status', 'mcp'].includes(mode)) throw new Error('Expected studio, status, or mcp');
const { env, cwd, settings } = loadRuntime();
if (mode === 'studio' || mode === 'status') {
  const state = await studioStatus({ host: settings.PODCLI_HOST, port: settings.PODCLI_PORT, home: settings.PODCLI_HOME });
  if (state.status === 'running') {
    console.log(`[Clipperz] Studio is already running (PID ${state.pid}). Open ${state.url}/episode`);
    console.log('[Clipperz] No second instance was started.');
    process.exit(0);
  }
  if (state.status === 'occupied') {
    console.error(`[Clipperz] ${state.url} is occupied by another process or an older Studio. No changes were made.`);
    console.error('[Clipperz] Check the open Studio, or press Ctrl+C in its original PowerShell window before relaunching.');
    process.exit(1);
  }
  if (mode === 'status') { console.log('[Clipperz] Studio is stopped. Start with: node scripts/local/launch.mjs studio'); process.exit(0); }
}
const entry = join(projectRoot, mode === 'studio' ? 'dist/ui/web-server.js' : 'dist/index.js');
if (!existsSync(entry)) throw new Error('Build the application before starting it.');
for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
Object.assign(process.env, env);
// Fail before opening a listener or touching application state if this account
// cannot launch the media runtime. MCP stdout must remain protocol-only.
if (mode === 'studio') {
  try {
    const versions = verifyExecutables({ env, cwd, settings });
    console.error(`[Clipperz] Executable pre-flight passed: Python ${versions.Python}; FFmpeg and FFprobe runnable.`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
mkdirSync(settings.PODCLI_INFERENCE_DIR, { recursive: true });
process.chdir(cwd);
await import(pathToFileURL(entry).href);
