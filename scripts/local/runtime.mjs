// Shared environment preparation. No dependencies, application imports, or downloads.
import { existsSync, readFileSync } from 'node:fs';
import { delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const installationRoot = join(projectRoot, '_local/clipperz');
export const configFile = join(installationRoot, 'config', 'clipperz.env');

function samePath(a, b) {
  return resolve(a).toLowerCase() === resolve(b).toLowerCase();
}

export function loadRuntime(parentEnv = process.env) {
  const settings = parseEnv(readFileSync(configFile, 'utf8'));
  const pathKeys = [
    'PODCLI_HOME', 'PODCLI_DATA', 'PODCLI_OUTPUT', 'PODCLI_ENV_FILE',
    'PODCLI_BACKEND', 'PODCLI_CWD', 'PODCLI_CACHE_DIR', 'PODCLI_NODE',
    'PYTHON_PATH', 'PODCLI_PYTHON', 'FFMPEG_PATH', 'FFPROBE_PATH',
    'PODCLI_CODEX_PATH', 'PODCLI_CLAUDE_PATH', 'PODCLI_BROWSER',
    'TMP', 'TEMP', 'TMPDIR', 'XDG_CACHE_HOME',
    'PODCLI_INFERENCE_DIR',
  ];
  for (const key of pathKeys) {
    if (!settings[key] || !isAbsolute(settings[key])) {
      throw new Error(`${key} must be an explicit absolute path in ${configFile}`);
    }
  }
  const localPaths = {
    PODCLI_HOME: 'home', PODCLI_DATA: 'data', PODCLI_OUTPUT: 'exports',
    PODCLI_ENV_FILE: 'config/clipperz.env', PODCLI_CWD: 'home',
    PODCLI_CACHE_DIR: 'data/cache', XDG_CACHE_HOME: 'data/cache',
    PYTHON_PATH: 'venv/Scripts/python.exe', PODCLI_PYTHON: 'venv/Scripts/python.exe',
    TMP: 'tmp', TEMP: 'tmp', TMPDIR: 'tmp',
    PODCLI_INFERENCE_DIR: 'inference',
  };
  for (const [key, suffix] of Object.entries(localPaths)) {
    if (!samePath(settings[key], join(installationRoot, suffix))) {
      throw new Error(`${key} does not match this installation's designated ${suffix} path`);
    }
  }
  if (!samePath(settings.PODCLI_BACKEND, join(projectRoot, 'backend'))) {
    throw new Error('PODCLI_BACKEND must point to this checkout');
  }
  if (settings.PODCLI_HOST !== '127.0.0.1' || settings.PODCLI_PORT !== '3847') {
    throw new Error('This initial profile uses 127.0.0.1:3847');
  }
  if (settings.PODCLI_AI_PROVIDER !== 'codex-then-claude' || settings.PODCLI_LOCAL_ONLY !== '1') {
    throw new Error('This installation requires the strict AI policy and local-only controls');
  }

  // Override configured names case-insensitively on Windows. Drop ambient Clipperz
  // settings so a different installation cannot silently select a home or token.
  // AI children receive the narrower environment in strict_ai.py. Neither loader
  // is itself a filesystem sandbox.
  const owned = new Set(Object.keys(settings).map(key => key.toUpperCase()));
  const inheritedPath = Object.entries(parentEnv).find(([key]) => key.toUpperCase() === 'PATH')?.[1] || '';
  const env = Object.fromEntries(Object.entries(parentEnv).filter(([key]) => {
    const upper = key.toUpperCase();
    return upper !== 'PATH' && !upper.startsWith('PODCLI_') && !owned.has(upper)
      && !/^(ANTHROPIC_|OPENAI_|CLAUDE_|CODEX_|ASSEMBLYAI_|HF_TOKEN$|HUGGING_FACE_HUB_TOKEN$|NODE_OPTIONS$|PYTHONPATH$|PYTHONHOME$)/.test(upper);
  }));
  Object.assign(env, settings);
  env.PATH = [
    dirname(settings.PYTHON_PATH), dirname(settings.PODCLI_NODE),
    dirname(settings.FFMPEG_PATH), dirname(settings.FFPROBE_PATH), inheritedPath,
  ].filter(Boolean).join(delimiter);

  const working = join(settings.PODCLI_DATA, 'working');
  const outputRelativeToWorking = relative(working, settings.PODCLI_OUTPUT);
  if (!outputRelativeToWorking.startsWith(`..${sep}`) && outputRelativeToWorking !== '..' && !isAbsolute(outputRelativeToWorking)) {
    throw new Error('Exports must be outside automatic working-directory cleanup');
  }
  return { env, cwd: settings.PODCLI_CWD, settings };
}

export function checkRuntime() {
  try {
    const mode = process.argv[2] || 'check';
    if (mode !== 'check') {
      throw new Error('Use launch.mjs studio or launch.mjs mcp to start the verified strict installation.');
    }
    const { settings, cwd } = loadRuntime();
    // Print only known path/status fields, never the full environment or .env.
    console.log(JSON.stringify({
      configuration: 'valid', configFile, cwd,
      home: settings.PODCLI_HOME, data: settings.PODCLI_DATA,
      exports: settings.PODCLI_OUTPUT,
      uploads: join(settings.PODCLI_DATA, 'working', 'uploads'),
      temporary: settings.TEMP,
      studioAddress: `http://${settings.PODCLI_HOST}:${settings.PODCLI_PORT}`,
      pythonEnvironment: existsSync(settings.PYTHON_PATH) ? 'present; this check validates configuration only' : 'pending Step 3',
      studioBuild: existsSync(join(projectRoot, 'dist/ui/web-server.js')) ? 'present; not started' : 'pending Step 4',
      mcpBuild: existsSync(join(projectRoot, 'dist/index.js')) ? 'present; not started' : 'pending Step 4',
      applicationStarted: false,
    }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) checkRuntime();
