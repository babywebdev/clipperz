// Verify current artifacts without asserting historical test counts or empty user data.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRuntime, projectRoot, installationRoot } from '../local/runtime.mjs';

const { settings } = loadRuntime();
const fileInfo = path => {
  const bytes = readFileSync(path);
  assert(bytes.length > 0, `Empty artifact: ${path}`);
  return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
};
const artifacts = ['dist/index.js', 'dist/ui/web-server.js', 'dist/ui/public/index.html',
  '_local/clipperz/data/cache/remotion-bundle/index.html',
  '_local/clipperz/data/cache/remotion-bundle/.hash'].map(path => fileInfo(join(projectRoot, path)));
const html = readFileSync(join(projectRoot, 'dist/ui/public/index.html'), 'utf8');
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
assert(scripts.length > 0);
for (const script of scripts) {
  assert(script.startsWith('/assets/'));
  artifacts.push(fileInfo(join(projectRoot, 'dist/ui/public', script)));
}
const bundle = readFileSync(join(installationRoot, 'data/cache/remotion-bundle/bundle.js'), 'utf8');
for (const weight of [400, 700]) {
  const font = join(projectRoot, `node_modules/@fontsource/dm-sans/files/dm-sans-latin-${weight}-normal.woff2`);
  assert(bundle.includes(readFileSync(font).toString('base64')), `DM Sans ${weight} not embedded`);
}
for (const key of ['PODCLI_BROWSER', 'FFMPEG_PATH', 'FFPROBE_PATH']) assert(statSync(settings[key]).isFile());
const report = { checkedAt: new Date().toISOString(), artifacts, fontsEmbedded: true,
  inputs: ['package-lock.json','backend/requirements.txt'].map(path => fileInfo(join(projectRoot,path))),
  applicationStarted: false, browserRenderVerified: false };
mkdirSync(join(projectRoot, '_local/verification'), { recursive: true });
writeFileSync(join(projectRoot, '_local/verification/build-results.json'), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
