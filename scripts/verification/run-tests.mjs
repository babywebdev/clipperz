// Local installation verification; fixtures never use the installation's home/exports.
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRuntime, projectRoot, installationRoot } from '../local/runtime.mjs';

const [mode, ...args] = process.argv.slice(2);
if (!['node', 'python'].includes(mode)) throw new Error('Expected node or python');
const { env, settings } = loadRuntime();
for (const key of Object.keys(env)) {
  if (/^(PODCLI_|ANTHROPIC_|OPENAI_|CLAUDE_|CODEX_|HF_TOKEN$|HUGGING_FACE_HUB_TOKEN$|PYTHONPATH$|PYTHONHOME$|NODE_OPTIONS$|PYTEST_|UPDATE_GOLDENS$)/i.test(key)) delete env[key];
}
const base = join(installationRoot, 'tmp/step-4-tests');
mkdirSync(base, { recursive: true });
const fixture = mkdtempSync(join(base, `${mode}-`));
for (const name of ['home', 'data', 'tmp', 'cache']) mkdirSync(join(fixture, name));
const envFile = join(fixture, 'empty.env');
writeFileSync(envFile, '');
Object.assign(env, {
  PODCLI_HOME: join(fixture, 'home'), PODCLI_DATA: join(fixture, 'data'),
  PODCLI_ENV_FILE: envFile, PODCLI_CWD: join(fixture, 'home'),
  TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp'), TMPDIR: join(fixture, 'tmp'),
  XDG_CACHE_HOME: join(fixture, 'cache'), NUMBA_CACHE_DIR: join(fixture, 'cache/numba'),
  TORCH_HOME: join(fixture, 'cache/torch'), PYTEST_DISABLE_PLUGIN_AUTOLOAD: '1',
  CLIPPERZ_TEST_FIXTURE: fixture,
});
const command = mode === 'node' ? settings.PODCLI_NODE : settings.PYTHON_PATH;
const childArgs = mode === 'node'
  ? ['node_modules/vitest/vitest.mjs', 'run', '--config', 'scripts/verification/vitest.config.mjs', ...args]
  : ['scripts/verification/pytest-offline.py', ...args];
mkdirSync(join(projectRoot, '_local/installation/logs'), { recursive: true });
const log = createWriteStream(join(projectRoot, `_local/installation/logs/step-4-${mode}-tests.log`), { flags: 'a' });
const header = `\nStarted ${new Date().toISOString()}\nFixtures: ${fixture}\n`;
log.write(header); process.stdout.write(header);
const child = spawn(command, childArgs, { cwd: projectRoot, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', chunk => { log.write(chunk); process.stdout.write(chunk); });
child.stderr.on('data', chunk => { log.write(chunk); process.stderr.write(chunk); });
child.on('error', error => { log.end(`${error.message}\n`); console.error(error.message); process.exitCode = 1; });
child.on('close', code => { log.end(`\nExit ${code} at ${new Date().toISOString()}\n`); process.exitCode = code ?? 1; });
