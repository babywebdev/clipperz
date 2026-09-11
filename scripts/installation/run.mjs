// Installation-only runner: selected runtimes, shared app paths, local caches/logs.
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadRuntime, installationRoot, projectRoot } from '../local/runtime.mjs';

const [mode, label, ...args] = process.argv.slice(2);
if (!label || !/^[a-z0-9-]+$/.test(label)) throw new Error('A simple log label is required');
const { env, settings } = loadRuntime();
for (const key of Object.keys(env)) {
  if (/^(NPM_CONFIG_|PIP_|PYTHONPATH$|PYTHONHOME$|NODE_OPTIONS$|ESBUILD_BINARY_PATH$)/i.test(key)) delete env[key];
}
env.PIP_CONFIG_FILE = 'NUL';
env.PIP_DISABLE_PIP_VERSION_CHECK = '1';
env.PIP_NO_INPUT = '1';
env.PIP_CACHE_DIR = join(installationRoot, 'data/cache/pip');
env.NUMBA_CACHE_DIR = join(installationRoot, 'data/cache/numba');
env.TORCH_HOME = join(installationRoot, 'data/cache/torch');
const logDir = join(projectRoot, '_local/installation/logs');
mkdirSync(logDir, { recursive: true });
const log = createWriteStream(join(logDir, `${label}.log`), { flags: 'a' });
const commands = {
  npm: [settings.PODCLI_NODE, [join(dirname(settings.PODCLI_NODE), 'node_modules/npm/bin/npm-cli.js'),
    '--userconfig', join(projectRoot, 'config/windows/npm-user.npmrc'),
    '--globalconfig', join(projectRoot, 'config/windows/npm-global.npmrc'),
    '--cache', join(installationRoot, 'data/cache/npm'),
    '--registry', 'https://registry.npmjs.org', ...args]],
  'base-python': [process.env.CLIPPERZ_BASE_PYTHON, args],
  python: [settings.PYTHON_PATH, args],
  node: [settings.PODCLI_NODE, args],
};
if (!commands[mode]) throw new Error('Expected npm, base-python, python, or node');
const [command, childArgs] = commands[mode];
if (!command) throw new Error('Set CLIPPERZ_BASE_PYTHON to the absolute base Python executable before creating the venv.');
log.write(`\nStarted ${new Date().toISOString()}\n`);
const child = spawn(command, childArgs, { cwd: projectRoot, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', chunk => { log.write(chunk); process.stdout.write(chunk); });
child.stderr.on('data', chunk => { log.write(chunk); process.stderr.write(chunk); });
child.on('error', error => { console.error(error.message); log.end(`${error.message}\n`); process.exitCode = 1; });
child.on('close', code => { log.end(`\nExit ${code} at ${new Date().toISOString()}\n`); process.exitCode = code ?? 1; });
