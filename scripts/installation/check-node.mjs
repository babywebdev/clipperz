import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadRuntime, projectRoot } from '../local/runtime.mjs';

const { settings } = loadRuntime();
mkdirSync(join(projectRoot, '_local/installation'), { recursive: true });
const require = createRequire(join(projectRoot, 'package.json'));
const lockBytes = readFileSync(join(projectRoot, 'package-lock.json'));
const lockHash = createHash('sha256').update(lockBytes).digest('hex');
const lock = JSON.parse(lockBytes);
const installed = [];
const lifecycleScripts = [];
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || !existsSync(join(projectRoot, path, 'package.json'))) continue;
  const pkg = JSON.parse(readFileSync(join(projectRoot, path, 'package.json'), 'utf8'));
  assert.equal(pkg.version, entry.version, path);
  installed.push(path);
  for (const key of ['preinstall', 'install', 'postinstall']) {
    if (pkg.scripts?.[key]) lifecycleScripts.push({ path, version: pkg.version, event: key, script: pkg.scripts[key] });
  }
}
const esbuild = require('esbuild');
const viteRequire = createRequire(require.resolve('vite/package.json'));
const viteEsbuild = viteRequire('esbuild');
const binary = require.resolve('@esbuild/win32-x64/esbuild.exe');
const binaryHash = createHash('sha256').update(readFileSync(binary)).digest('hex');
assert.equal(binaryHash, require('esbuild/package.json')['esbuild.binaryHashes']['@esbuild/win32-x64/esbuild.exe']);
for (const compiler of [esbuild, viteEsbuild]) {
  const result = await compiler.transform('export const answer: number = 42;', { loader: 'ts', format: 'esm' });
  assert.ok(result.code.includes('42'));
  assert.ok(!result.code.includes(': number'));
  compiler.stop();
}
const tsc = spawnSync(settings.PODCLI_NODE, [join(projectRoot, 'node_modules/typescript/bin/tsc'), '--version'], { encoding: 'utf8', windowsHide: true });
assert.equal(tsc.status, 0, tsc.stderr || tsc.error?.message);
const versions = Object.fromEntries(['remotion', '@remotion/bundler', '@remotion/renderer', '@remotion/cli'].map(name => [name, require(`${name}/package.json`).version]));
assert.ok(Object.values(versions).every(version => version === versions.remotion));
await import('vite');
const npm = spawnSync(settings.PODCLI_NODE, [
  join(dirname(settings.PODCLI_NODE), 'node_modules/npm/bin/npm-cli.js'),
  '--userconfig', join(projectRoot, 'config/windows/npm-user.npmrc'),
  '--globalconfig', join(projectRoot, 'config/windows/npm-global.npmrc'),
  '--cache', join(settings.PODCLI_DATA, 'cache/npm'),
  'ls', '--all', '--json', '--offline', '--ignore-scripts',
], { cwd: projectRoot, encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
writeFileSync(join(projectRoot, '_local/installation/npm-tree.json'), npm.stdout);
assert.equal(npm.status, 0, npm.stderr || npm.error?.message);
const result = {
  passed: true, installedPackageLocations: installed.length, lockHash,
  lifecycleScriptsSkipped: lifecycleScripts,
  esbuild: esbuild.version, viteEsbuild: viteEsbuild.version,
  esbuildNativeHash: binaryHash, typescript: tsc.stdout.trim(), remotion: versions,
  npmTreeValid: true, viteImportSucceeded: true, applicationStarted: false,
};
writeFileSync(join(projectRoot, '_local/installation/node-verification.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
