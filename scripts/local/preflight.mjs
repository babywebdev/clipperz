// Run under the exact identity, environment and cwd that will host Studio.
// File existence is insufficient: a Windows venv redirects to its base Python.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRuntime } from './runtime.mjs';

export function verifyExecutables({ settings, env, cwd }) {
  const checks = [
    ['Python', settings.PYTHON_PATH, ['-I', '-c', 'import sys; print(sys.version.split()[0]); print(sys.executable)']],
    ['FFmpeg', settings.FFMPEG_PATH, ['-version']],
    ['FFprobe', settings.FFPROBE_PATH, ['-version']],
  ];
  const versions = {};
  for (const [name, executable, args] of checks) {
    try {
      const output = execFileSync(executable, args, {
        env, cwd, windowsHide: true, encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000,
      });
      versions[name] = output.trim().split(/\r?\n/)[0];
    } catch (error) {
      const detail = String(error.stderr || error.message).trim().slice(-1500);
      throw new Error(`Clipperz startup stopped: ${name} cannot execute.\nExecutable: ${executable}\n${detail}\nStart the configured launcher from Windows Terminal under your normal Windows account, or have Codex request an approved launch outside its sandbox. Do not copy the venv or change filesystem permissions. Studio has not been started by this launch.`);
    }
  }
  return versions;
}

export function runPreflight() {
  try {
    console.log(JSON.stringify({ executablePreflight: 'passed', versions: verifyExecutables(loadRuntime()) }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) runPreflight();
