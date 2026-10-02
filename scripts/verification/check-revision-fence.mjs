// The tracked-clip write fence over actual HTTP and the real CLI (Writing Studio 1B.2b.3).
//
// Runs a real `dist/ui/web-server.js` under the supported local profile in an
// isolated home/data/exports/tmp on a verified free loopback port (never the
// configured studio port), the real Python CLI, and real revisions committed
// through the accepted render and opening-card bridges.
//
// Two modes share one fixture recipe:
//
//   --capture <file>   Pre-change build. Records what every untracked control
//                      does (status, body shape, history change, file presence,
//                      probe summary), then reproduces the pre-change defect on
//                      tracked clips. Asserts nothing about the fence.
//   --controls <file>  Final build. Proves the fence (B2B3-1, B2B3-2 barrier,
//                      B2B3-4) with every stored byte hashed before and after
//                      each refusal, then reruns the untracked controls and
//                      compares them with the capture (B2B3-3). Since lead-24 it
//                      also checks the owned and could-not-confirm wordings and
//                      their path-free log reasons, using a dangling junction.
//                      Since lead-26 (1B.2b.4a, B2B4A-5) the finishing actions
//                      (caption-style PATCH, logo, thumbnail) are adapted: here
//                      they refuse version zero and malformed state with
//                      REVISION_BASE_UNAVAILABLE and invalid styles with
//                      INVALID_CAPTION_STYLE, writing nothing; their commits on
//                      exact revisions are proved by check-legacy-adapters.mjs.
//                      DELETE, rerender and thumbnail_config still refuse.
//
// Requires `npm run build`, the Remotion bundle cache and the configured
// browser. No AI call: every thumbnail uses fixed text, and swap-thumbnail's
// outside-tree control stops at its source-video check before any provider.
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRuntime, installationRoot, projectRoot } from '../local/runtime.mjs';

const argv = process.argv.slice(2);
const captureOut = argv[argv.indexOf('--capture') + 1];
const controlsIn = argv[argv.indexOf('--controls') + 1];
const mode = argv.includes('--capture') ? 'capture' : argv.includes('--controls') ? 'final' : null;
if (!mode || !(captureOut || controlsIn)) {
  console.error('usage: check-revision-fence.mjs --capture <out.json> | --controls <capture.json> [--result <out.json>]');
  process.exit(2);
}
const resultOut = argv.includes('--result') ? argv[argv.indexOf('--result') + 1] : null;

const { env, settings } = loadRuntime();
const fixture = mkdtempSync(join(installationRoot, 'tmp/revision-fence-'));
for (const dir of ['home', 'data', 'data/working', 'data/cache', 'exports', 'tmp', 'outside', 'links']) mkdirSync(join(fixture, dir), { recursive: true });
writeFileSync(join(fixture, 'empty.env'), '');
const home = join(fixture, 'home');
const exportsDir = join(fixture, 'exports');
const outside = join(fixture, 'outside');
const fixtureEnv = {
  ...env,
  PODCLI_HOME: home, PODCLI_DATA: join(fixture, 'data'), PODCLI_OUTPUT: exportsDir,
  PODCLI_CWD: home, PODCLI_ENV_FILE: join(fixture, 'empty.env'),
  TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp'), TMPDIR: join(fixture, 'tmp'),
};
Object.assign(process.env, fixtureEnv);
assert.equal(process.env.PODCLI_LOCAL_ONLY, '1', 'the supported local profile is required');

const run = (exe, args, opts = {}) => execFileSync(exe, args, {
  env: process.env, windowsHide: true, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024, ...opts,
});
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = { mode, fixture, steps: {} };
const step = (name, value) => { results.steps[name] = value; console.log(`  ok: ${name}`); };

// --- synthetic media --------------------------------------------------------
const COLORS = ['red', 'green', 'blue', 'yellow', 'cyan', 'magenta'];
const source = join(fixture, 'source.mp4');
{
  const args = ['-v', 'error', '-y'];
  for (const c of COLORS) args.push('-f', 'lavfi', '-i', `color=c=${c}:s=1280x720:r=25:d=1`);
  for (let i = 0; i < COLORS.length; i++) args.push('-f', 'lavfi', '-i', `sine=frequency=${300 + 200 * i}:sample_rate=44100:duration=1`);
  const chain = COLORS.map((_, i) => `[${i}:v][${COLORS.length + i}:a]`).join('');
  args.push('-filter_complex', `${chain}concat=n=${COLORS.length}:v=1:a=1[v][a]`, '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', source);
  run(settings.FFMPEG_PATH, args);
}
const png = (name, color, size) => {
  const p = join(fixture, name);
  run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${color}:s=${size}:d=1`, '-frames:v', '1', p]);
  return p;
};
const cardImage = png('card.png', 'black', '1080x1920');
const bakeImage = png('bake.png', 'white', '1080x1920');
const frameImage = png('frame.png', 'gray', '1280x720');
const logoImage = png('logo.png', 'orange', '200x200');
const words = COLORS.map((c, i) => ({ word: c, start: i + 0.2, end: i + 0.7, confidence: 1, speaker: `S${i % 2}` }));

// --- compiled application modules -------------------------------------------
const dist = name => pathToFileURL(join(projectRoot, 'dist', name)).href;
const { PythonExecutor } = await import(dist('services/python-executor.js'));
const { ClipsHistory } = await import(dist('services/clips-history.js'));
const { ClipRevisionService } = await import(dist('services/clip-revisions.js'));
const { withFileLock } = await import(dist('utils/mutation-lock.js'));
const { paths } = await import(dist('config/paths.js'));
assert.equal(paths.output, exportsDir);
assert.equal(paths.history, join(home, 'history'));

const historyDir = join(home, 'history');
const historyPath = join(historyDir, 'clips.json');
const namespaceRoot = join(exportsDir, 'writing-studio');
const sidecarRoot = join(historyDir, 'revisions');
const entries = () => JSON.parse(readFileSync(historyPath, 'utf8'));
const entryOf = id => entries().find(e => e.id === id);
const writeEntries = list => {
  const tmp = `${historyPath}.check-${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(list, null, 2));
  renameSync(tmp, historyPath);
};
const history = new ClipsHistory();
const executor = new PythonExecutor(15 * 60 * 1000);
const expectedOf = s => ({ incarnation: s.incarnation, draft_version: s.draft_version, revision_version: s.revision_version });

console.log('Rendering one real legacy clip through the bridge...');
const legacy = (await executor.execute('create_clip', {
  video_path: source, transcript_words: words, caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical',
  clean_fillers: false, output_dir: join(fixture, 'tmp'), title: 'fence-legacy', start_second: 1, end_second: 5,
})).data;
const legacyMaster = join(fixture, 'legacy-master.mp4');
copyFileSync(legacy.output_path, legacyMaster);

/** An untracked clip with its own output copy, words/recipe/reframe sidecars and a thumbnail directory. */
async function legacyClip(name, over = {}) {
  const output = join(exportsDir, `${name}_short.mp4`);
  copyFileSync(legacyMaster, output);
  const clip = await history.record({
    source_video: source, start_second: 1, end_second: 5, caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical',
    title: `Control ${name}`, output_path: output, file_size_mb: legacy.file_size_mb, duration: legacy.duration,
    transcript_slice: 'green blue yellow', unknown_field: { kept: name },
    thumbnail_config: { text: 'Fixed card', card_seconds: 0 },
    ...over,
  });
  const bounded = words.filter(w => w.start >= 1 && w.start < 5);
  for (const dir of ['words', 'recipes', 'reframe']) mkdirSync(join(historyDir, dir), { recursive: true });
  writeFileSync(join(historyDir, 'words', `${clip.id}.json`), JSON.stringify(bounded));
  writeFileSync(join(historyDir, 'recipes', `${clip.id}.json`), JSON.stringify({
    caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical', clean_fillers: false, transcript_words: bounded,
  }));
  writeFileSync(join(historyDir, 'reframe', `${clip.id}.json`), JSON.stringify({ inSec: 1, outSec: 5, keyframes: [{ tAbs: 2, x_pct: 50 }] }));
  const thumbs = join(exportsDir, 'thumbnails', clip.id);
  mkdirSync(thumbs, { recursive: true });
  copyFileSync(frameImage, join(thumbs, 'frame.png'));
  copyFileSync(bakeImage, join(thumbs, 'existing.png'));
  return clip;
}

// --- tracked fixtures: version zero, exact no-card, opening card, malformed --
console.log('Committing real exact revisions (no card and opening card)...');
const svc = new ClipRevisionService({ history });
const recipe = title => ({
  source_video: source, title, keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }],
  caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical', clean_fillers: false,
});
const tV0 = await legacyClip('tracked-v0');
await svc.ensureTracked(tV0.id);
const tExact = await legacyClip('tracked-exact');
{
  const v0 = await svc.ensureTracked(tExact.id);
  const saved = await svc.saveRevision({ clip_id: tExact.id, operation_id: 'op-fence-exact', expected: expectedOf(v0), recipe: recipe('fence-exact'), source_words: words });
  assert.equal(saved.outcome, 'committed', JSON.stringify(saved.operation));
}
const tCard = await legacyClip('tracked-card');
{
  const v0 = await svc.ensureTracked(tCard.id);
  const saved = await svc.saveRevision({
    clip_id: tCard.id, operation_id: 'op-fence-card', expected: expectedOf(v0), recipe: recipe('fence-card'), source_words: words,
    thumbnail_card: { image_path: cardImage, image_sha256: sha256(cardImage), placement: 'opening', duration: 1.5 },
  });
  assert.equal(saved.outcome, 'committed', JSON.stringify(saved.operation));
  assert(entryOf(tCard.id).revisions.current.path, 'the card revision has no document');
}
const tMalformed = await legacyClip('tracked-malformed');
{
  const list = entries();
  list.find(e => e.id === tMalformed.id).revisions = 'not-a-revision-state';
  writeEntries(list);
}
const tracked = { v0: tV0.id, exact: tExact.id, card: tCard.id, malformed: tMalformed.id };
const exactMain = entryOf(tExact.id).revisions.current.output_path;
const cardMain = entryOf(tCard.id).revisions.current.output_path;
const cardDoc = entryOf(tCard.id).revisions.current.path;
assert(exactMain.startsWith(namespaceRoot) && cardMain.startsWith(namespaceRoot), 'revision media is not in the namespace');
assert(cardDoc.startsWith(sidecarRoot), 'the revision document is not in the sidecar tree');
step('tracked fixtures', { ...tracked, exact_main: basename(exactMain), card_main: basename(cardMain) });

// --- every stored byte (logs, tmp, previews and lock activity excluded) -----
const EXCLUDED = [join(fixture, 'data'), join(fixture, 'tmp'), join(fixture, 'links'), join(exportsDir, 'logo-previews'), join(home, 'ui-state.json')];
function hashTree() {
  const out = {};
  const walk = d => {
    for (const item of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, item.name);
      if (EXCLUDED.some(x => p === x || p.startsWith(x + sep))) continue;
      if (/\.lock(\.reclaim)?$/.test(item.name) || /\.tmp$/.test(item.name)) continue;
      if (item.isSymbolicLink()) continue;
      if (item.isDirectory()) walk(p);
      else out[p] = sha256(p);
    }
  };
  walk(fixture);
  return out;
}
function diffTrees(before, after) {
  const changed = [];
  for (const p of new Set([...Object.keys(before), ...Object.keys(after)])) if (before[p] !== after[p]) changed.push(relative(fixture, p));
  return changed.sort();
}

// --- a verified free loopback port, never the configured studio -------------
async function freePort() {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise(resolve => probe.close(resolve));
  assert.notEqual(String(port), settings.PODCLI_PORT, 'the discovered port is the configured studio port');
  assert.notEqual(port, 3847);
  return port;
}
let server = null;
let base = '';
let logs = '';
async function startServer() {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  server = spawn(settings.PODCLI_NODE, [join(projectRoot, 'dist/ui/web-server.js')], {
    cwd: fixtureEnv.PODCLI_CWD, env: { ...fixtureEnv, PODCLI_PORT: String(port) }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', c => { logs += c; });
  server.stderr.on('data', c => { logs += c; });
  for (let i = 0; ; i++) {
    assert(i < 200 && server.exitCode === null, logs || 'the studio failed to start');
    try {
      const policy = await fetch(`${base}/api/local-policy`);
      if (policy.ok) { assert.equal((await policy.json()).localOnly, true); break; }
    } catch { /* not listening yet */ }
    await sleep(100);
  }
  return port;
}
async function stopServer() {
  if (!server) return;
  const closed = once(server, 'close');
  server.kill();
  await closed;
  server = null;
}
/** One connection per request: a pooled keep-alive socket the server has idled
 * out during a long CLI step would reset a non-idempotent request. */
function http(method, path, body) {
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
  const url = new URL(base + path);
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      host: '127.0.0.1', port: url.port, path: url.pathname + url.search, method, agent: false,
      headers: payload ? { 'content-type': 'application/json', 'content-length': payload.length } : {},
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const text = buffer.toString('utf8');
        let parsed = null;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        resolve({ status: res.statusCode, body: parsed, text, buffer });
      });
    });
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}
function cli(args, extraEnv = {}) {
  const r = spawnSync(settings.PYTHON_PATH, [join(projectRoot, 'backend', 'cli.py'), '--no-banner', ...args], {
    cwd: home, env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', ...extraEnv },
    encoding: 'utf8', windowsHide: true, timeout: 600000,
  });
  return { code: r.status, stdout: r.stdout || '', stderr: (r.stderr || '').replace(/\x1b\[[0-9;]*m/g, '') };
}
function probe(path) {
  if (!path || !existsSync(path)) return null;
  const out = JSON.parse(run(settings.FFPROBE_PATH, ['-v', 'error', '-print_format', 'json', '-show_entries',
    'format=duration:stream=codec_type,codec_name,width,height', path]));
  return {
    duration: Math.round(Number(out.format?.duration || 0) * 10) / 10,
    streams: (out.streams || []).map(s => [s.codec_type, s.codec_name, s.width ?? null, s.height ?? null].join(':')).sort(),
  };
}

// --- normalisation for comparing two runs in different fixture roots --------
function normalize(value, id) {
  if (typeof value === 'string') {
    let s = value.split(fixture).join('<F>').split(fixture.replace(/\\/g, '/')).join('<F>').replace(/\\/g, '/');
    if (id) s = s.split(id).join('<ID>');
    return s.replace(/thumb_[0-9a-f]{8}\.png/g, 'thumb_<rand>.png').replace(/\.logo-\d+\.mp4/g, '.logo-<pid>.mp4');
  }
  if (Array.isArray(value)) return value.map(v => normalize(v, id));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v, id)]));
  return value;
}
function shape(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return value.length ? [shape(value[0])] : [];
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, shape(value[k])]));
  return typeof value;
}
function historyChange(before, after, id) {
  if (!after) return 'removed';
  const change = {};
  for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) change[key] = { before: normalize(before[key] ?? null, id), after: normalize(after[key] ?? null, id) };
  }
  return change;
}
function presence(clip, after, name) {
  const id = clip.id;
  const listing = dir => (existsSync(dir) ? readdirSync(dir).map(n => normalize(n, id)).sort() : null);
  // Files this control's clip owns in the shared export directory: its output,
  // backups and any re-render, all named from `control-<name>` or its title.
  // Controls run in the same order in both modes, so a longer name's files never exist yet.
  const own = new RegExp(`control[-_ ]${name.replace(/[-]/g, '[-_ ]')}`, 'i');
  const out = {
    output: existsSync(clip.output_path),
    pre_logo_backup: existsSync(`${clip.output_path}.pre-logo.mp4`),
    words: existsSync(join(historyDir, 'words', `${id}.json`)),
    recipe: existsSync(join(historyDir, 'recipes', `${id}.json`)),
    reframe: existsSync(join(historyDir, 'reframe', `${id}.json`)),
    thumbnails: listing(join(exportsDir, 'thumbnails', id)),
    export_dir: listing(dirname(clip.output_path)).filter(n => n.includes('<ID>') || own.test(n)),
  };
  if (after && after.output_path !== clip.output_path) out.new_output = existsSync(after.output_path);
  return out;
}

// --- untracked controls: identical steps in both modes ------------------------
const CONTROLS = [
  ['patch-title', c => http('PATCH', `/api/clips/${c.id}`, { title: 'Renamed control' })],
  ['patch-caption', c => http('PATCH', `/api/clips/${c.id}`, { caption_style: 'hormozi' })],
  ['patch-thumbnail-config', c => http('PATCH', `/api/clips/${c.id}`, { thumbnail_config: { text: 'Other text', card_seconds: 0 } })],
  ['patch-title-and-caption', c => http('PATCH', `/api/clips/${c.id}`, { title: 'Both fields', caption_style: 'subtle' })],
  ['delete', c => http('DELETE', `/api/clips/${c.id}`)],
  ['thumbnail-render', c => http('POST', `/api/clips/${c.id}/thumbnail/render`, { frame_path: join(exportsDir, 'thumbnails', c.id, 'frame.png'), line1: 'FIXED', line2: 'TEXT' })],
  ['logo-apply', c => http('POST', `/api/clips/${c.id}/logo`, { action: 'apply', logo_path: logoImage, logo_position: 'top-right' })],
  ['logo-apply-then-remove', async c => {
    const applied = await http('POST', `/api/clips/${c.id}/logo`, { action: 'apply', logo_path: logoImage, logo_position: 'bottom-left' });
    const removed = await http('POST', `/api/clips/${c.id}/logo`, { action: 'remove' });
    return { status: [applied.status, removed.status], body: { apply: applied.body, remove: removed.body } };
  }],
  ['rerender-trim', c => http('POST', `/api/clips/${c.id}/rerender`, { trim: { inSec: 1.5, outSec: 4.5 } })],
  ['cli-edit-caption', async c => { const r = cli(['clips', 'edit', c.id, '--caption-style', 'branded']); return { status: r.code, body: null }; }],
  ['cli-edit-title', async c => { const r = cli(['clips', 'edit', c.id, '--title=Plain title']); return { status: r.code, body: null }; }],
  ['cli-delete', async c => { const r = cli(['clips', 'delete', c.id, '--yes']); return { status: r.code, body: null }; }],
];
async function runControls() {
  const out = {};
  for (const [name, act] of CONTROLS) {
    const clip = await legacyClip(`control-${name}`);
    const before = entryOf(clip.id);
    const response = await act(clip);
    const after = entryOf(clip.id);
    out[name] = {
      status: response.status,
      body_shape: shape(response.body),
      history_change: historyChange(before, after, clip.id),
      files: presence(clip, after, name),
      probe: probe(after?.output_path ?? clip.output_path),
    };
    console.log(`  control ${name}: ${JSON.stringify(response.status)}`);
  }
  // Path-based commands on a clip outside both owned trees.
  const bakeTarget = join(outside, 'bake-control.mp4');
  copyFileSync(legacyMaster, bakeTarget);
  const bake = cli(['bake-thumbnail', bakeTarget, bakeImage, '--position', 'start']);
  out['bake-thumbnail-outside'] = { status: bake.code, probe: probe(bakeTarget), changed: sha256(bakeTarget) !== sha256(legacyMaster) };
  const swapTarget = join(outside, 'swap-control.mp4');
  copyFileSync(legacyMaster, swapTarget);
  const swap = cli(['swap-thumbnail', swapTarget, '--source-video', join(outside, 'no-such-source.mp4')]);
  out['swap-thumbnail-outside'] = {
    status: swap.code, changed: sha256(swapTarget) !== sha256(legacyMaster),
    stopped_at_source_check: /Source video not found/.test(swap.stderr),
  };
  return out;
}

// Deep equality with a tolerance for re-encoded sizes and durations.
function sameCapture(a, b, path = '') {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) <= Math.max(0.15, Math.abs(a) * 0.05)) return [];
    return [`${path}: ${a} != ${b}`];
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return [`${path}: length ${a.length} != ${b.length}`];
    return a.flatMap((v, i) => sameCapture(v, b[i], `${path}[${i}]`));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    return keys.flatMap(k => (k in a && k in b ? sameCapture(a[k], b[k], `${path}.${k}`) : [`${path}.${k}: present on one side only`]));
  }
  return JSON.stringify(a) === JSON.stringify(b) ? [] : [`${path}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`];
}

const TRACKED_CODE = 'CLIP_REVISION_TRACKED';
const PATH_CODE = 'REVISION_PATH_PROTECTED';
// lead-24 F-2 wording, taken from the spec rather than the implementation: the owned
// message names the revision folders; the unresolvable one says the file could not be
// confirmed to be outside them, that nothing changed, and that the file, drive or link
// should be checked.
const isOwnedWording = m => /Writing Studio revision folders/.test(m) && !/could not confirm/i.test(m);
const isUnresolvableWording = m => /could not confirm/i.test(m) && /outside the Writing Studio revision folders/.test(m)
  && /nothing was changed/i.test(m) && ['file', 'drive', 'link'].every(w => m.includes(w));
/** A refusal: 409 (or `status`), exactly { error, code }, a plain message with no path or em dash, and nothing stored changed. */
function assertRefusal(label, response, code, before, status = 409) {
  assert.equal(response.status, status, `${label}: ${response.text}`);
  assert.deepEqual(Object.keys(response.body).sort(), ['code', 'error'], `${label}: ${response.text}`);
  assert.equal(response.body.code, code, `${label}: ${response.text}`);
  const text = response.text;
  for (const root of [fixture, home, exportsDir, fixture.replace(/\\/g, '/'), fixture.replace(/\\/g, '\\\\')]) assert(!text.includes(root), `${label}: leaked a path`);
  assert(!/[A-Za-z]:[\\/]{1,2}[A-Za-z0-9]/.test(text), `${label}: leaked a drive-rooted path`);
  assert(!text.includes('\u2014'), `${label}: em dash in the message`);
  assert.deepEqual(diffTrees(before, hashTree()), [], `${label}: stored bytes changed`);
}
function assertCliRefusal(label, r, code, before) {
  assert.notEqual(r.code, 0, `${label}: exited 0\n${r.stdout}${r.stderr}`);
  assert(new RegExp(`^\\s*(?:✗\\s+)?${code}:`, 'm').test(r.stderr), `${label}: no ${code} in\n${r.stderr}`);
  assert(!r.stderr.includes('\u2014'), `${label}: em dash in the message`);
  assert.deepEqual(diffTrees(before, hashTree()), [], `${label}: stored bytes changed`);
}

await startServer();
step('studio started', { base, configured_studio_port: settings.PODCLI_PORT });

try {
  if (mode === 'capture') {
    console.log('Pre-change capture: untracked controls...');
    const controls = await runControls();
    console.log('Pre-change defect reproduction on tracked clips...');
    const defect = {};
    {
      const before = entryOf(tracked.v0);
      const r = await http('PATCH', `/api/clips/${tracked.v0}`, { caption_style: 'hormozi' });
      defect.patch_caption_on_version_zero = { status: r.status, caption_style: [before.caption_style, entryOf(tracked.v0).caption_style], still_tracked: entryOf(tracked.v0).revisions != null };
    }
    {
      const bytesBefore = sha256(cardMain);
      const r = cli(['bake-thumbnail', cardMain, bakeImage, '--position', 'start']);
      defect.bake_into_revision_media = { status: r.code, revision_media_changed: sha256(cardMain) !== bytesBefore };
    }
    {
      const r = await http('DELETE', `/api/clips/${tracked.exact}`);
      defect.delete_exact_revision = { status: r.status, entry_removed: !entryOf(tracked.exact), revision_media_removed: !existsSync(exactMain) };
    }
    step('pre-change defect', defect);
    writeFileSync(captureOut, JSON.stringify({ capturedAt: new Date().toISOString(), controls, defect }, null, 2));
    step('capture written', { path: captureOut, controls: Object.keys(controls).length });
  } else {
    const capture = JSON.parse(readFileSync(controlsIn, 'utf8'));
    // lead-26: requests a tracked clip still refuses with CLIP_REVISION_TRACKED.
    const fenced = id => [
      ['PATCH thumbnail_config', () => http('PATCH', `/api/clips/${id}`, { thumbnail_config: { text: 'x' } })],
      ['PATCH caption_style with thumbnail_config', () => http('PATCH', `/api/clips/${id}`, { caption_style: 'hormozi', thumbnail_config: { text: 'x' } })],
      ['PATCH title with thumbnail_config null', () => http('PATCH', `/api/clips/${id}`, { title: 'Refused null', thumbnail_config: null })],
      ['PATCH thumbnail_config null only', () => http('PATCH', `/api/clips/${id}`, { thumbnail_config: null })],
      ['DELETE', () => http('DELETE', `/api/clips/${id}`)],
      ['POST rerender', () => http('POST', `/api/clips/${id}/rerender`, { trim: { inSec: 1.5, outSec: 4.5 } })],
    ];
    // lead-26: finishing actions an adapter answers; without an exact current revision it refuses the base.
    const adapted = (id, frame) => [
      ['PATCH caption_style', () => http('PATCH', `/api/clips/${id}`, { caption_style: 'hormozi' })],
      ['PATCH title with caption_style', () => http('PATCH', `/api/clips/${id}`, { title: 'Not written', caption_style: 'subtle' })],
      ['PATCH caption_style by prefix', () => http('PATCH', `/api/clips/${id.slice(0, 8)}`, { caption_style: 'hormozi' })],
      ['POST thumbnail/render', () => http('POST', `/api/clips/${id}/thumbnail/render`, { frame_path: frame, line1: 'FIXED', line2: 'TEXT' })],
      ['POST logo apply', () => http('POST', `/api/clips/${id}/logo`, { action: 'apply', logo_path: logoImage })],
      ['POST logo remove', () => http('POST', `/api/clips/${id}/logo`, { action: 'remove' })],
    ];
    // A present caption style that clips edit does not accept, null included, is never ignored.
    const invalidStyles = id => [null, '', 'neon'].flatMap(style => [false, true].map(prefix => [
      `PATCH caption_style ${JSON.stringify(style)}${prefix ? ' by prefix' : ''}`,
      () => http('PATCH', `/api/clips/${prefix ? id.slice(0, 8) : id}`, { title: 'Not written', caption_style: style }),
    ]));

    console.log('B2B3-1 / B2B4A-5: refused and adapted fenced routes on every tracked kind...');
    const refused = {};
    for (const [kind, id] of Object.entries(tracked)) {
      for (const [label, send] of fenced(id)) {
        const before = hashTree();
        assertRefusal(`${kind} ${label}`, await send(), TRACKED_CODE, before);
        refused[`${kind} ${label}`] = 409;
      }
      for (const [label, send] of invalidStyles(id)) {
        const before = hashTree();
        assertRefusal(`${kind} ${label}`, await send(), 'INVALID_CAPTION_STYLE', before, 400);
        refused[`${kind} ${label}`] = 400;
      }
      if (kind === 'v0' || kind === 'malformed') {
        for (const [label, send] of adapted(id, join(exportsDir, 'thumbnails', id, 'frame.png'))) {
          const before = hashTree();
          assertRefusal(`${kind} ${label}`, await send(), 'REVISION_BASE_UNAVAILABLE', before);
          refused[`${kind} ${label}`] = 409;
        }
      }
      // PATCH resolves the same unique prefix as its CLI, including null requests;
      // DELETE still resolves it in the Python writer's locked refusal.
      for (const [label, send] of [
        ['PATCH title with thumbnail_config null by prefix', () => http('PATCH', `/api/clips/${id.slice(0, 8)}`, { title: 'Refused prefix', thumbnail_config: null })],
        ['PATCH thumbnail_config null only by prefix', () => http('PATCH', `/api/clips/${id.slice(0, 8)}`, { thumbnail_config: null })],
        ['DELETE by prefix', () => http('DELETE', `/api/clips/${id.slice(0, 8)}`)],
      ]) {
        const before = hashTree();
        assertRefusal(`${kind} ${label}`, await send(), TRACKED_CODE, before);
        refused[`${kind} ${label}`] = 409;
      }
      // Policy refusals still come first for the routes the local profile blocks.
      for (const path of [`/api/clips/${id}/thumbnail`, `/api/clips/${id}/thumbnail/select`]) {
        const before = hashTree();
        const r = await http('POST', path, { path: cardImage });
        assert.equal(r.status, 403, `${kind} ${path}: ${r.text}`);
        assert.deepEqual(diffTrees(before, hashTree()), []);
      }
    }
    step('HTTP refusals', { count: Object.keys(refused).length, kinds: Object.keys(tracked) });

    console.log('B2B3-1: the real CLI refuses the same operations...');
    const cliRefused = {};
    for (const [kind, id] of Object.entries(tracked)) {
      for (const [label, args] of [
        ['clips edit --caption-style', ['clips', 'edit', id, '--caption-style', 'hormozi']],
        ['clips edit --thumbnail-config', ['clips', 'edit', id, '--thumbnail-config', '{"text":"x"}']],
        ['clips edit --title with --caption-style', ['clips', 'edit', id, '--title=Refused', '--caption-style', 'subtle']],
        ['clips delete --yes', ['clips', 'delete', id, '--yes']],
        ...[['--thumbnail-config', 'null'], ['--thumbnail-config', ''], ['--caption-style', ''], ['--caption-style', 'null']]
          .flatMap(([option, value]) => [false, true].map(withTitle => [
            `clips edit ${option}=${JSON.stringify(value)} title=${withTitle}`,
            ['clips', 'edit', id, `${option}=${value}`, ...(withTitle ? ['--title=Refused empty'] : [])],
          ])),
      ]) {
        const before = hashTree();
        assertCliRefusal(`${kind} ${label}`, cli(args), TRACKED_CODE, before);
        cliRefused[`${kind} ${label}`] = 'refused';
      }
    }
    step('CLI refusals', { count: Object.keys(cliRefused).length });

    console.log('B2B3-1/3: metadata edits still succeed on tracked clips...');
    const owned = e => Object.fromEntries(Object.entries(e).filter(([k]) => !['title', 'generated_titles', 'description'].includes(k)));
    for (const [kind, id] of Object.entries(tracked)) {
      const before = entryOf(id);
      const r = await http('PATCH', `/api/clips/${id}`, { title: `HTTP title ${kind}` });
      assert.equal(r.status, 200, `${kind} title PATCH: ${r.text}`);
      assert.deepEqual(r.body, { ok: true });
      assert.equal(entryOf(id).title, `HTTP title ${kind}`);
      assert.deepEqual(owned(entryOf(id)), owned(before), `${kind}: a title PATCH changed another field`);
      const c = cli(['clips', 'edit', id, `--title=CLI title ${kind}`]);
      assert.equal(c.code, 0, `${kind} clips edit --title: ${c.stderr}`);
      assert.equal(entryOf(id).title, `CLI title ${kind}`);
      assert.deepEqual(owned(entryOf(id)), owned(before), `${kind}: clips edit --title changed another field`);
    }
    step('metadata edits on tracked clips', { kinds: Object.keys(tracked) });

    // Expected outcomes come from fed8ed1's PATCH null filtering and CLI parsing,
    // not a new capture of this implementation. Original controls remain intact.
    const nullControls = [];
    for (const field of ['caption_style', 'thumbnail_config']) {
      for (const withTitle of [true, false]) {
        const c = await legacyClip(`null-http-${field}-${withTitle}`);
        const before = entryOf(c.id); const bytes = hashTree();
        const body = { [field]: null, ...(withTitle ? { title: 'Null control title' } : {}) };
        const r = await http('PATCH', `/api/clips/${c.id.slice(0, 8)}`, body);
        assert.equal(r.status, withTitle ? 200 : 400);
        assert.deepEqual(r.body, withTitle ? { ok: true } : { error: 'nothing to update' });
        assert.deepEqual(entryOf(c.id), withTitle ? { ...before, title: 'Null control title' } : before);
        const changed = diffTrees(bytes, hashTree());
        assert.deepEqual(changed, withTitle ? [relative(fixture, historyPath)] : []);
        nullControls.push({ surface: 'HTTP', field, withTitle, status: r.status });
      }
    }
    for (const [option, value] of [['--thumbnail-config', 'null'], ['--thumbnail-config', ''], ['--caption-style', '']]) {
      for (const withTitle of [true, false]) {
        const c = await legacyClip(`null-cli-${nullControls.length}`);
        const before = entryOf(c.id); const bytes = hashTree();
        const r = cli(['clips', 'edit', c.id, `${option}=${value}`, ...(withTitle ? ['--title=Null CLI title'] : [])]);
        const invalidCaption = option === '--caption-style';
        const succeeds = withTitle && !invalidCaption;
        assert.equal(r.code, invalidCaption ? 2 : withTitle ? 0 : 1, r.stderr);
        if (invalidCaption) assert.match(r.stderr, /invalid choice: ''/);
        else if (!withTitle) assert.match(r.stderr, /Nothing to change/);
        assert.deepEqual(entryOf(c.id), succeeds ? { ...before, title: 'Null CLI title' } : before);
        assert.deepEqual(diffTrees(bytes, hashTree()), succeeds ? [relative(fixture, historyPath)] : []);
        nullControls.push({ surface: 'CLI', option, value, withTitle, code: r.code });
      }
    }
    step('null and empty untracked controls match fed8ed1', nullControls);

    console.log('Unchanged read routes and preview generators on a tracked clip...');
    {
      const before = hashTree();
      for (const path of [`/api/clips/${tracked.card}/editor-context`, `/api/clips/${tracked.card}/reframe`, `/api/clips/${tracked.card}/cuts`]) {
        assert.equal((await http('GET', path)).status, 200, path);
      }
      const preview = await http('GET', `/api/clips/${tracked.card}/preview`);
      assert.equal(preview.status, 200);
      assert.equal(createHash('sha256').update(preview.buffer).digest('hex'), sha256(cardMain));
      const logoPreview = await http('GET', `/api/clips/${tracked.card}/logo/previews?logo_path=${encodeURIComponent(logoImage)}`);
      assert.equal(logoPreview.status, 200, logoPreview.text);
      const reopen = await http('POST', `/api/clips/${tracked.card}/reopen`);
      assert.equal(reopen.status, 200, reopen.text);
      assert.deepEqual(diffTrees(before, hashTree()), []);
    }
    step('read routes unchanged', { logo_previews: 200, reopen: 200 });

    console.log('B2B3-4: untracked entries pointing into the owned trees...');
    const alias = join(fixture, 'links', 'alias');
    let junction = 'created';
    try { symlinkSync(namespaceRoot, alias, 'junction'); } catch (err) { junction = `unavailable: ${err.code ?? err.message}`; }
    const caseVariant = join(exportsDir, 'WRITING-STUDIO', relative(namespaceRoot, cardMain));
    const pointers = {
      namespace: cardMain,
      sidecar_tree: cardDoc,
      case_variant: caseVariant,
      ...(junction === 'created' ? { junction_alias: join(alias, relative(namespaceRoot, exactMain)) } : {}),
    };
    const pathRefused = {};
    const ownedPointerIds = [];
    /** Refuse one untracked pointer through every media route, DELETE and the CLI, checking the wording. */
    async function refusePointer(label, target, wording, record) {
      const clip = await history.record({
        source_video: source, start_second: 1, end_second: 5, caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical',
        title: `Pointer ${label}`, output_path: target, file_size_mb: 0.1, duration: 4,
      });
      const thumbs = join(exportsDir, 'thumbnails', clip.id);
      mkdirSync(thumbs, { recursive: true });
      copyFileSync(frameImage, join(thumbs, 'frame.png'));
      for (const [op, send] of [
        ['POST logo apply', () => http('POST', `/api/clips/${clip.id}/logo`, { action: 'apply', logo_path: logoImage })],
        ['POST thumbnail/render', () => http('POST', `/api/clips/${clip.id}/thumbnail/render`, { frame_path: join(thumbs, 'frame.png'), line1: 'FIXED', line2: 'TEXT' })],
        ['POST rerender', () => http('POST', `/api/clips/${clip.id}/rerender`, { trim: { inSec: 1.5, outSec: 4.5 } })],
        ['DELETE', () => http('DELETE', `/api/clips/${clip.id}`)],
      ]) {
        const before = hashTree();
        const response = await send();
        assertRefusal(`${label} ${op}`, response, PATH_CODE, before);
        assert(wording(response.body.error), `${label} ${op}: unexpected wording: ${response.body.error}`);
        record[`${label} ${op}`] = 409;
      }
      const before = hashTree();
      const r = cli(['clips', 'delete', clip.id, '--yes']);
      assertCliRefusal(`${label} clips delete`, r, PATH_CODE, before);
      assert(wording(r.stderr), `${label} clips delete: unexpected wording: ${r.stderr}`);
      record[`${label} clips delete`] = 'refused';
      return clip.id;
    }
    for (const [label, target] of Object.entries(pointers)) {
      assert(existsSync(target), `${label}: fixture target missing`);
      ownedPointerIds.push(await refusePointer(label, target, isOwnedWording, pathRefused));
    }
    step('HTTP and CLI path refusals', { count: Object.keys(pathRefused).length, junction, wording: 'owned' });

    console.log('B2B3-4: path-based commands on owned-tree targets...');
    const missingRootExports = join(fixture, 'exports-fresh');
    mkdirSync(missingRootExports);
    const commandTargets = {
      namespace: [cardMain, {}],
      sidecar_tree: [cardDoc, {}],
      case_variant: [caseVariant, {}],
      missing_namespace_root: [join(missingRootExports, 'writing-studio', 'clip-x', 'main.mp4'), { PODCLI_OUTPUT: missingRootExports }],
      ...(junction === 'created' ? { junction_alias: [join(alias, relative(namespaceRoot, exactMain)), {}] } : {}),
    };
    const commandRefused = {};
    for (const [label, [target, extra]] of Object.entries(commandTargets)) {
      for (const [cmd, args] of [
        ['bake-thumbnail', ['bake-thumbnail', target, bakeImage, '--position', 'start']],
        ['swap-thumbnail', ['swap-thumbnail', target, '--source-video', source, '--image', bakeImage]],
      ]) {
        const before = hashTree();
        const r = cli(args, extra);
        assertCliRefusal(`${label} ${cmd}`, r, PATH_CODE, before);
        assert(isOwnedWording(r.stderr), `${label} ${cmd}: unexpected wording: ${r.stderr}`);
        commandRefused[`${label} ${cmd}`] = 'refused';
      }
    }
    assert(!existsSync(join(missingRootExports, 'writing-studio')), 'the missing namespace root was created');
    step('path-based command refusals', { count: Object.keys(commandRefused).length, junction, wording: 'owned' });

    console.log('B2B3-4 (lead-24): an existing but unresolvable target (dangling junction)...');
    const doomed = join(fixture, 'links', 'doomed');
    const danglingLink = join(fixture, 'links', 'dangling');
    mkdirSync(doomed);
    let dangling = 'created';
    try { symlinkSync(doomed, danglingLink, 'junction'); } catch (err) { dangling = `unavailable: ${err.code ?? err.message}`; }
    rmSync(doomed, { recursive: true, force: true });
    const unresolvableRefused = {};
    let danglingPointerId = null;
    if (dangling === 'created') {
      const danglingTarget = join(danglingLink, 'x_short.mp4');
      danglingPointerId = await refusePointer('dangling_junction', danglingTarget, isUnresolvableWording, unresolvableRefused);
      for (const [cmd, args] of [
        ['bake-thumbnail', ['bake-thumbnail', danglingTarget, bakeImage, '--position', 'start']],
        ['swap-thumbnail', ['swap-thumbnail', danglingTarget, '--source-video', source, '--image', bakeImage]],
      ]) {
        const before = hashTree();
        const r = cli(args);
        assertCliRefusal(`dangling_junction ${cmd}`, r, PATH_CODE, before);
        assert(isUnresolvableWording(r.stderr), `dangling_junction ${cmd}: unexpected wording: ${r.stderr}`);
        unresolvableRefused[`dangling_junction ${cmd}`] = 'refused';
      }
    }
    step('unresolvable target refusals', { count: Object.keys(unresolvableRefused).length, dangling, wording: 'could not confirm' });

    console.log('B2B3-2: tracking lands between the early check and the commit...');
    async function barrier(label, send, watched) {
      const clip = await legacyClip(`barrier-${label}`);
      const watchedPath = watched(clip);
      const initial = sha256(watchedPath);
      let pending;
      let landed;
      await withFileLock(historyPath, async () => {
        pending = send(clip);
        for (let i = 0; ; i++) {
          assert(i < 1800, `${label}: the route never changed its media`);
          let now = null;
          try { now = sha256(watchedPath); } catch { /* mid-write */ }
          if (now && now !== initial) break;
          await sleep(100);
        }
        // Land tracking as the lock holder, with the real ensureTracked.
        const lockedHistory = {
          transaction: async fn => { const list = entries(); const r = await fn(list); writeEntries(list); return r; },
          findById: async id => entryOf(id),
        };
        await new ClipRevisionService({ history: lockedHistory }).ensureTracked(clip.id);
        landed = entryOf(clip.id);
      }, { tool: 'revision-fence-barrier' });
      const response = await pending;
      assert.equal(response.status, 409, `${label}: ${response.text}`);
      assert.deepEqual(response.body, { error: response.body.error, code: TRACKED_CODE });
      assert.deepEqual(entryOf(clip.id), landed, `${label}: the commit changed the tracked entry`);
      return { status: response.status, code: response.body.code, legacy_media_changed: sha256(watchedPath) !== initial };
    }
    const barriers = {
      logo_apply_ts_commit: await barrier('logo', c => http('POST', `/api/clips/${c.id}/logo`, { action: 'apply', logo_path: logoImage }), c => c.output_path),
      thumbnail_render_python_commit: await barrier('render', c => http('POST', `/api/clips/${c.id}/thumbnail/render`, { frame_path: join(exportsDir, 'thumbnails', c.id, 'frame.png'), line1: 'FIXED', line2: 'TEXT' }), c => c.output_path),
    };
    step('route barriers', barriers);

    console.log('Refusal logs carry clip, operation and code only...');
    const refusalLines = logs.split('\n').filter(l => /CLIP_REVISION_TRACKED|REVISION_PATH_PROTECTED/.test(l));
    assert(refusalLines.length > 0, 'no refusal was logged');
    for (const line of refusalLines) {
      assert(!line.includes(fixture) && !line.includes(fixture.replace(/\\/g, '\\\\')), `a refusal log line leaked a path: ${line}`);
    }
    // lead-24: path refusals carry a path-free reason; the unresolvable ones also name the error code.
    const ownedLines = refusalLines.filter(l => ownedPointerIds.some(id => l.includes(id)));
    assert(ownedLines.length > 0 && ownedLines.every(l => l.includes('"reason":"owned"')), 'owned path refusals must log reason owned');
    const unresolvableLines = danglingPointerId ? refusalLines.filter(l => l.includes(danglingPointerId)) : [];
    if (danglingPointerId) {
      assert(unresolvableLines.length > 0, 'the unresolvable refusals were not logged');
      for (const line of unresolvableLines) {
        assert(line.includes('"reason":"unresolvable"') && /"error_code":"[A-Z][A-Z0-9_]+"/.test(line), `unresolvable log line lacks its reason: ${line}`);
      }
    }
    step('refusal logs', {
      lines: refusalLines.length, owned_lines: ownedLines.length, unresolvable_lines: unresolvableLines.length,
      sample: refusalLines[0].slice(0, 300), unresolvable_sample: unresolvableLines[0]?.slice(0, 300) ?? null,
    });

    console.log('B2B3-3: untracked controls versus the pre-change capture...');
    const controls = await runControls();
    const mismatches = sameCapture(capture.controls, controls, 'controls');
    results.controls = controls;
    assert.deepEqual(mismatches, [], `untracked controls differ from the pre-change capture:\n${mismatches.join('\n')}`);
    step('controls match the pre-change capture', { controls: Object.keys(controls).length });
  }
} finally {
  await stopServer();
  results.serverLog = logs.split('\n').slice(-400).join('\n');
  if (resultOut) writeFileSync(resultOut, JSON.stringify(results, null, 2));
}
console.log('Passed');
