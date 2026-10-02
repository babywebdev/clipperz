// Finishing-action adapters and legacy output sinks over actual HTTP and the real
// bridge (Writing Studio 1B.2b.4a, B2B4A-1..4).
//
// Runs a real `dist/ui/web-server.js` in an isolated home/data/exports/tmp on a
// verified free loopback port (never the configured studio port), with real exact
// revisions committed through the accepted render and opening-card bridges, the
// real Python renderer and CLI, FFmpeg and Remotion.
//
// - B2B4A-1: on exact no-card and opening-card revisions, a caption-style PATCH, logo
//   apply and remove and thumbnail render (supported local profile), then thumbnail
//   generate and select (the upstream profile, the only one that serves them: strict
//   AI routing stays on and the AI command paths point at missing files, so no provider
//   can be reached; the thumbnail text is fixed) each commit one revision. Recipes are
//   diffed, frames decoded for the logo and the card, timing compared with the
//   previous revision, and every earlier file hashed.
// - B2B4A-2: unavailable bases, busy clips, missing or changed inputs, injected render,
//   composition, probe and commit failures (in-process adapter calls with the real
//   bridge, then HTTP), invalid styles; stored bytes before and after; bodies and logs
//   path-free.
// - B2B4A-3: projection after every commit, `/api/image` bytes, metadata in the same
//   transaction, replay, logo previews never reading the legacy backup.
// - B2B4A-4 (WS-23): a planted file symlink, junction and dangling link at the
//   title-derived and a suffixed name, a case variant and a missing namespace root are
//   refused through rerender and direct bridge calls; an outside-tree control renders.
//   Lead-27: the same for an audio-only source (the audiogram road), through rerender,
//   create_clip and batch_clips, plus a junction as the output folder.
//
// Requires `npm run build`, the Remotion bundle cache and the configured browser.
// Usage: node scripts/verification/check-legacy-adapters.mjs [--result <out.json>]
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
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
const resultOut = argv.includes('--result') ? argv[argv.indexOf('--result') + 1] : null;

const { env, settings } = loadRuntime();
const fixture = mkdtempSync(join(installationRoot, 'tmp/legacy-adapters-'));
for (const dir of ['home', 'data', 'data/working', 'data/cache', 'exports', 'tmp', 'outside', 'links', 'no-ai']) mkdirSync(join(fixture, dir), { recursive: true });
writeFileSync(join(fixture, 'empty.env'), '');
const home = join(fixture, 'home');
const exportsDir = join(fixture, 'exports');
const outside = join(fixture, 'outside');
const fixtureEnv = {
  ...env,
  PODCLI_HOME: home, PODCLI_DATA: join(fixture, 'data'), PODCLI_OUTPUT: exportsDir,
  PODCLI_CWD: home, PODCLI_ENV_FILE: join(fixture, 'empty.env'),
  TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp'), TMPDIR: join(fixture, 'tmp'),
  // Legacy batches render one clip at a time, so a repeated title takes the suffixed name.
  PODCLI_RENDER_CONCURRENCY: '1',
};
Object.assign(process.env, fixtureEnv);
assert.equal(process.env.PODCLI_LOCAL_ONLY, '1', 'the supported local profile is required');
assert.equal(process.env.PODCLI_AI_PROVIDER, 'codex-then-claude', 'strict AI routing is required');

const run = (exe, args, opts = {}) => execFileSync(exe, args, {
  env: process.env, windowsHide: true, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024, ...opts,
});
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = { fixture, versions: {}, steps: {} };
const step = (name, value) => { results.steps[name] = value; console.log(`  ok: ${name}`); };
results.versions = {
  node: process.version, python: run(settings.PYTHON_PATH, ['--version']).trim(),
  ffmpeg: run(settings.FFMPEG_PATH, ['-version']).split('\n')[0].trim(),
};

// --- synthetic media --------------------------------------------------------
const COLORS = ['red', 'green', 'blue', 'yellow', 'cyan', 'magenta'];
function coloredSource(path, colors, size = '1280x720') {
  const args = ['-v', 'error', '-y'];
  for (const c of colors) args.push('-f', 'lavfi', '-i', `color=c=${c}:s=${size}:r=25:d=1`);
  for (let i = 0; i < colors.length; i++) args.push('-f', 'lavfi', '-i', `sine=frequency=${300 + 200 * i}:sample_rate=44100:duration=1`);
  const chain = colors.map((_, i) => `[${i}:v][${colors.length + i}:a]`).join('');
  args.push('-filter_complex', `${chain}concat=n=${colors.length}:v=1:a=1[v][a]`, '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', path);
  run(settings.FFMPEG_PATH, args);
  return path;
}
const source = coloredSource(join(fixture, 'source.mp4'), COLORS);
const png = (name, color, size) => {
  const p = join(fixture, name);
  run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${color}:s=${size}:d=1`, '-frames:v', '1', p]);
  return p;
};
const cardImage = png('card.png', 'black', '1080x1920');
const altImage = png('alt-card.png', 'white', '1080x1920');
const frameImage = png('frame.png', 'gray', '1280x720');
const logoImage = png('logo.png', 'orange', '200x200');
const words = COLORS.map((c, i) => ({ word: c, start: i + 0.2, end: i + 0.7, confidence: 1, speaker: `S${i % 2}` }));

// --- compiled application modules -------------------------------------------
const dist = name => pathToFileURL(join(projectRoot, 'dist', name)).href;
const { PythonExecutor } = await import(dist('services/python-executor.js'));
const { ClipsHistory } = await import(dist('services/clips-history.js'));
const { ClipRevisionService } = await import(dist('services/clip-revisions.js'));
const { ClipLegacyAdapters } = await import(dist('services/clip-legacy-adapters.js'));
const { FENCE_MESSAGES } = await import(dist('services/clip-write-fence.js'));
const { paths } = await import(dist('config/paths.js'));
assert.equal(paths.output, exportsDir);

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
const plant = (id, change) => { const list = entries(); change(list.find(e => e.id === id)); writeEntries(list); };
const docOf = e => JSON.parse(readFileSync(e.revisions.current.path, 'utf8'));
const history = new ClipsHistory();
const executor = new PythonExecutor(15 * 60 * 1000);
const expectedOf = s => ({ incarnation: s.incarnation, draft_version: s.draft_version, revision_version: s.revision_version });

console.log('Rendering one real legacy clip through the bridge...');
const legacy = (await executor.execute('create_clip', {
  video_path: source, transcript_words: [], caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical',
  clean_fillers: false, output_dir: join(fixture, 'tmp'), title: 'adapter-legacy', start_second: 1, end_second: 5,
})).data;
const legacyMaster = join(fixture, 'legacy-master.mp4');
copyFileSync(legacy.output_path, legacyMaster);
const pinkBackup = coloredSource(join(fixture, 'pink-backup.mp4'), ['pink', 'pink']);

/** An untracked clip with its own output copy, sidecars, a thumbnail folder and fixed thumbnail text. */
async function legacyClip(name, over = {}, sidecarWords = words) {
  const output = join(exportsDir, `${name}_short.mp4`);
  copyFileSync(legacyMaster, output);
  const clip = await history.record({
    source_video: source, start_second: 1, end_second: 5, caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical',
    title: `Adapter ${name}`, output_path: output, file_size_mb: legacy.file_size_mb, duration: legacy.duration,
    unknown_field: { kept: name }, ...over,
  });
  const bounded = sidecarWords.filter(w => w.start >= 1 && w.start < 5);
  for (const dir of ['words', 'recipes']) mkdirSync(join(historyDir, dir), { recursive: true });
  writeFileSync(join(historyDir, 'words', `${clip.id}.json`), JSON.stringify(bounded));
  writeFileSync(join(historyDir, 'recipes', `${clip.id}.json`), JSON.stringify({
    caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical', clean_fillers: false, transcript_words: bounded,
  }));
  const thumbs = join(exportsDir, 'thumbnails', clip.id);
  mkdirSync(thumbs, { recursive: true });
  copyFileSync(frameImage, join(thumbs, 'frame.png'));
  copyFileSync(altImage, join(thumbs, 'legacy-thumb.png'));
  return clip;
}

// --- tracked fixtures -------------------------------------------------------
console.log('Committing real exact revisions (no card and opening card)...');
const svc = new ClipRevisionService({ history });
const RECIPE = { keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }], caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical', clean_fillers: false };
async function exactClip(name, card) {
  const clip = await legacyClip(name);
  const v0 = await svc.ensureTracked(clip.id);
  const saved = await svc.saveRevision({
    clip_id: clip.id, operation_id: `op-fixture-${name}`, expected: expectedOf(v0), recipe: { source_video: source, title: `fixture ${name}`, ...RECIPE },
    source_words: words, ...(card ? { thumbnail_card: { image_path: card, image_sha256: sha256(card), placement: 'opening', duration: 1.5 } } : {}),
  });
  assert.equal(saved.outcome, 'committed', JSON.stringify(saved.operation));
  // As a commit before 1B.2b.4a left them: a legacy pre-logo backup and a stale thumbnail preview,
  // plus fixed thumbnail text so no generation step needs a provider.
  copyFileSync(pinkBackup, join(exportsDir, `${name}.pre-logo.mp4`));
  plant(clip.id, e => {
    e.logo_backup_path = join(exportsDir, `${name}.pre-logo.mp4`);
    e.thumbnail_config = {
      ...(e.thumbnail_config ?? {}), text: 'Fixed text', line1: 'FIXED', line2: 'TEXT',
      image_path: join(exportsDir, 'thumbnails', clip.id, 'frame.png'), preview_path: join(exportsDir, 'thumbnails', clip.id, 'legacy-thumb.png'),
    };
  });
  return clip.id;
}
const tNoCard = await exactClip('no-card', null);
const tCard = await exactClip('card', cardImage);
const tV0 = (await legacyClip('v0')).id;
await svc.ensureTracked(tV0);
const tNoCurrent = (await legacyClip('no-current')).id;
plant(tNoCurrent, e => { delete e.output_path; });
await svc.ensureTracked(tNoCurrent);
const tMalformed = (await legacyClip('malformed')).id;
plant(tMalformed, e => { e.revisions = 'not-a-revision-state'; });
const cardSha = sha256(cardImage);
step('tracked fixtures', { tNoCard, tCard, tV0, tNoCurrent, tMalformed });

// --- every stored byte (logs, tmp, previews and lock activity excluded) -----
const EXCLUDED = [join(fixture, 'data'), join(fixture, 'tmp'), join(fixture, 'links'), join(fixture, 'outside'), join(exportsDir, 'logo-previews'), join(home, 'ui-state.json')];
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
const diffTrees = (before, after) => [...new Set([...Object.keys(before), ...Object.keys(after)])]
  .filter(p => before[p] !== after[p]).map(p => relative(fixture, p)).sort();
/** Every earlier file keeps its bytes; only the history file and new files may differ. */
function assertKept(label, before) {
  const now = hashTree();
  const changed = Object.keys(before).filter(p => p !== historyPath && now[p] !== before[p]).map(p => relative(fixture, p));
  assert.deepEqual(changed, [], `${label}: earlier files changed`);
}

// --- decoded frames ---------------------------------------------------------
/** Mean RGB of a w x h region at (x, y) of the frame at `t` seconds (or of an image). */
function region(path, t, x, y, w = 20, h = 20) {
  const args = ['-v', 'error', ...(t === null ? [] : ['-ss', String(t)]), '-i', path, '-frames:v', '1',
    '-vf', `crop=${w}:${h}:${x}:${y},scale=1:1:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'];
  const buf = execFileSync(settings.FFMPEG_PATH, args, { env: process.env, windowsHide: true, maxBuffer: 1 << 20 });
  return [buf[0], buf[1], buf[2]];
}
// Remotion draws a square logo inside a 255 x 126 box at top 180 and right 108 (1080 x 1920);
// the FFmpeg fallback flush right. Both cover this patch.
const LOGO = [866, 233];
const isOrange = ([r, g, b]) => r > 190 && g > 80 && g < 210 && b < 100;
const isCyan = ([r, g, b]) => r < 90 && g > 170 && b > 170;
const isPink = ([r, g, b]) => r > 200 && g > 150 && b > 160 && g < 225;
const near = (a, b, tol = 30) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
function probeStreams(path) {
  return JSON.parse(run(settings.FFPROBE_PATH, ['-v', 'error', '-print_format', 'json', '-show_entries', 'format=duration:stream=codec_type,width,height', path]));
}

// --- servers ----------------------------------------------------------------
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
/** `upstream`: the non-local profile, the only one serving thumbnail generate and select.
 * Strict AI routing stays on and both AI command paths name missing files. */
async function startServer(profile = 'local') {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  const serverEnv = { ...fixtureEnv, PODCLI_PORT: String(port) };
  if (profile === 'upstream') {
    Object.assign(serverEnv, {
      PODCLI_LOCAL_ONLY: '0', PODCLI_AI_PROVIDER: 'codex-then-claude',
      PODCLI_CLAUDE_PATH: join(fixture, 'no-ai', 'claude.exe'), PODCLI_CODEX_PATH: join(fixture, 'no-ai', 'codex.exe'),
    });
  }
  server = spawn(settings.PODCLI_NODE, [join(projectRoot, 'dist/ui/web-server.js')], {
    cwd: fixtureEnv.PODCLI_CWD, env: serverEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', c => { logs += c; });
  server.stderr.on('data', c => { logs += c; });
  for (let i = 0; ; i++) {
    assert(i < 200 && server.exitCode === null, logs || 'the studio failed to start');
    try {
      const policy = await fetch(`${base}/api/local-policy`);
      if (policy.ok) { assert.equal((await policy.json()).localOnly, profile === 'local'); break; }
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

/** A plain refusal body with no path and no em dash. */
function assertPlainBody(label, response) {
  const text = response.text;
  for (const root of [fixture, home, exportsDir, fixture.replace(/\\/g, '/'), fixture.replace(/\\/g, '\\\\')]) assert(!text.includes(root), `${label}: leaked a path`);
  assert(!/[A-Za-z]:[\\/]{1,2}[A-Za-z0-9]/.test(text), `${label}: leaked a drive-rooted path`);
  assert(!text.includes('\u2014'), `${label}: em dash in the message`);
}
/** Refused with status, exactly { error, code }, and nothing stored changed. */
function assertRefused(label, response, status, code, before) {
  assert.equal(response.status, status, `${label}: ${response.text}`);
  assert.deepEqual(Object.keys(response.body).sort(), ['code', 'error'], `${label}: ${response.text}`);
  assert.equal(response.body.code, code, `${label}: ${response.text}`);
  assertPlainBody(label, response);
  if (before) assert.deepEqual(diffTrees(before, hashTree()), [], `${label}: stored bytes changed`);
}
const diffRecipe = (a, b) => {
  const out = {};
  for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out[k] = [a[k] ?? null, b[k] ?? null];
  }
  return out;
};

/** The facts every committed adapter revision must show (B2B4A-1, B2B4A-3). */
async function assertCommitted(label, id, prev, response, { recipeDiff, card, timingFrom = prev }) {
  assert.equal(response.status, 200, `${label}: ${response.text}`);
  assert.equal(response.body.ok, true, label);
  const e = entryOf(id);
  const doc = docOf(e);
  const prevDoc = prev.doc;
  assert.equal(e.revisions.current.version, prevDoc.version + 1, `${label}: exactly one new revision`);
  assert.equal(e.revisions.previous.revision_id, prevDoc.revision_id, label);
  assert.match(doc.operation_id, /^legacy-[0-9a-f-]{36}$/, `${label}: server-generated operation id`);
  assert.deepEqual(diffRecipe(prevDoc.recipe, doc.recipe), recipeDiff, `${label}: recipe diff`);
  assert.deepEqual(doc.source_words, prevDoc.source_words, `${label}: retained words`);
  // Timing: the same content segments and a raw output within the renderer's tolerance.
  const t0 = timingFrom.doc.render_timeline;
  const t1 = doc.render_timeline;
  assert.deepEqual(t1.segments, t0.segments, `${label}: receipt segments`);
  const tol = Math.max(t0.tolerance.composition_seconds, t1.tolerance.composition_seconds);
  assert(Math.abs(t1.output_duration - t0.output_duration) <= tol, `${label}: raw duration ${t1.output_duration} vs ${t0.output_duration}`);
  assert.equal(t1.framing.width, t0.framing.width);
  assert.equal(t1.framing.height, t0.framing.height);
  assert.equal(t1.thumbnail_card.applied, false, `${label}: the raw render carries no card`);
  // Exactly one card: the chosen or carried one, before the content, with no logo on it.
  const fc = doc.final_composition;
  const served = e.output_path;
  assert.equal(served, doc.files.main.path);
  if (card) {
    assert.equal(fc.card.image.sha256, card, `${label}: card image hash`);
    assert.equal(sha256(fc.card.image.path), card);
    assert(Math.abs(fc.card.measured_duration - 1.5) <= fc.card.frame_duration / 2 + 1e-9);
    const cardFrame = region(served, 0.5, LOGO[0], LOGO[1]);
    assert(!isOrange(cardFrame), `${label}: a logo on the card ${cardFrame}`);
    assert(near(cardFrame, region(fc.card.image.path, null, LOGO[0], LOGO[1])), `${label}: card frame ${cardFrame} is not the card image`);
    assert(isCyan(region(fc.raw_render.file.path, 0.3, 100, 1500)), `${label}: the raw render starts with content, not a card`);
    assert(isCyan(region(served, fc.card.measured_duration + 0.3, 100, 1500)), `${label}: content follows one card`);
    assert.equal(e.thumbnail_config.preview_path, fc.card.image.path, `${label}: preview is the owned card copy`);
    assert.equal(e.thumbnail_config.card_seconds, fc.card.measured_duration);
    const image = await http('GET', `/api/image?path=${encodeURIComponent(e.thumbnail_config.preview_path)}`);
    assert.equal(image.status, 200, `${label}: /api/image ${image.text}`);
    assert.equal(createHash('sha256').update(image.buffer).digest('hex'), card, `${label}: /api/image bytes`);
  } else {
    assert.equal(fc.card, null, `${label}: no card`);
    assert.equal(e.thumbnail_config?.preview_path, undefined, `${label}: no preview without a card`);
    assert(isCyan(region(served, 0.3, 100, 1500)), `${label}: content from the start`);
  }
  assert.equal(e.logo_backup_path, undefined, `${label}: stale logo backup pointer`);
  const probed = probeStreams(served);
  assert(Math.abs(Number(probed.format.duration) - fc.output.duration) < 0.05, `${label}: served duration`);
  const preview = await http('GET', `/api/clips/${id}/preview`);
  assert.equal(createHash('sha256').update(preview.buffer).digest('hex'), sha256(served), `${label}: preview serves the new file`);
  assertKept(label, prev.tree);
  return { e, doc };
}
const snapshot = id => { const e = entryOf(id); return { e, doc: docOf(e), tree: hashTree(), history: readFileSync(historyPath) }; };

const adapterCodes = ['REVISION_BASE_UNAVAILABLE', 'REVISION_BUSY', 'REVISION_INPUT_MISSING', 'REVISION_SAVE_FAILED', 'INVALID_CAPTION_STYLE'];

try {
  await startServer('local');
  step('studio started (local profile)', { base, configured_studio_port: settings.PODCLI_PORT });
  const legacyFiles = Object.fromEntries(readdirSync(exportsDir).filter(n => n.endsWith('.pre-logo.mp4')).map(n => [n, sha256(join(exportsDir, n))]));

  // ======================= B2B4A-1 and B2B4A-3: commits =======================
  console.log('B2B4A-1: caption style on the exact no-card revision...');
  let prev = snapshot(tNoCard);
  let r = await http('PATCH', `/api/clips/${tNoCard}`, { title: 'Captions over HTTP', caption_style: 'hormozi' });
  let now = await assertCommitted('caption PATCH', tNoCard, prev, r, { recipeDiff: { caption_style: ['karaoke', 'hormozi'] }, card: null });
  assert.deepEqual(r.body, { ok: true });
  assert.equal(now.doc.render_timeline.captions.style, 'hormozi');
  assert.equal(now.doc.render_timeline.captions.rendered, true);
  assert.equal(now.e.title, 'Captions over HTTP', 'the title lands after the style');
  assert.equal(now.e.caption_style, 'hormozi');
  assert.equal(now.e.unknown_field.kept, 'no-card');
  const captionCommit = { version: now.e.revisions.current.version, style: now.doc.render_timeline.captions.style };

  console.log('B2B4A-1: an unchanged style renders nothing...');
  prev = snapshot(tNoCard);
  const groupsBefore = readdirSync(join(namespaceRoot, tNoCard)).sort();
  r = await http('PATCH', `/api/clips/${tNoCard}`, { caption_style: 'hormozi' });
  assert.deepEqual([r.status, r.body], [200, { ok: true }]);
  assert(readFileSync(historyPath).equals(prev.history), 'an unchanged style rewrote history');
  assert.deepEqual(readdirSync(join(namespaceRoot, tNoCard)).sort(), groupsBefore, 'an unchanged style started a render');
  assert.deepEqual(diffTrees(prev.tree, hashTree()), []);
  step('caption style', { ...captionCommit, noop: 'history and groups byte-identical' });

  console.log('B2B4A-1: logo apply and remove on the opening-card revision...');
  prev = snapshot(tCard);
  const beforeLogo = region(prev.e.output_path, prev.doc.final_composition.content_offset + 0.5, LOGO[0], LOGO[1]);
  assert(isCyan(beforeLogo), `no logo before: ${beforeLogo}`);
  r = await http('POST', `/api/clips/${tCard}/logo`, { action: 'apply', logo_path: logoImage, logo_position: 'top-right' });
  now = await assertCommitted('logo apply', tCard, prev, r, { recipeDiff: { logo_path: [null, logoImage], logo_position: [null, 'top-right'] }, card: cardSha });
  assert.deepEqual(r.body, { ok: true, logo_path: logoImage, logo_position: 'top-right', backup_path: null });
  const withLogo = region(now.e.output_path, now.doc.final_composition.content_offset + 0.5, LOGO[0], LOGO[1]);
  assert(isOrange(withLogo), `logo drawn: ${withLogo}`);
  assert.deepEqual([now.e.logo_path, now.e.logo_position], [logoImage, 'top-right']);
  const logoCommit = { region: withLogo, before: beforeLogo };

  console.log('B2B4A-2: missing and changed logo on the logo revision...');
  for (const [label, arrange, restore] of [
    ['logo missing', () => renameSync(logoImage, `${logoImage}.away`), () => renameSync(`${logoImage}.away`, logoImage)],
    ['logo replaced by a folder', () => { renameSync(logoImage, `${logoImage}.away`); mkdirSync(logoImage); }, () => { rmSync(logoImage, { recursive: true }); renameSync(`${logoImage}.away`, logoImage); }],
  ]) {
    arrange();
    const before = hashTree();
    assertRefused(label, await http('PATCH', `/api/clips/${tCard}`, { caption_style: 'subtle' }), 409, 'REVISION_INPUT_MISSING', before);
    restore();
  }

  prev = snapshot(tCard);
  r = await http('POST', `/api/clips/${tCard}/logo`, { action: 'remove' });
  now = await assertCommitted('logo remove', tCard, prev, r, { recipeDiff: { logo_path: [logoImage, null] }, card: cardSha });
  assert.deepEqual(r.body, { ok: true, restored_from: null });
  const removed = region(now.e.output_path, now.doc.final_composition.content_offset + 0.5, LOGO[0], LOGO[1]);
  assert(isCyan(removed) && !isPink(removed), `logo gone, no backup restored: ${removed}`);
  assert.equal(now.e.logo_path, undefined);
  {
    const before = hashTree();
    const again = await http('POST', `/api/clips/${tCard}/logo`, { action: 'remove' });
    assert.deepEqual([again.status, Object.keys(again.body)], [400, ['error']], again.text);
    assertPlainBody('remove without a logo', again);
    assert.deepEqual(diffTrees(before, hashTree()), []);
  }
  step('logo apply and remove', { ...logoCommit, removed, remove_without_logo: 400 });

  console.log('B2B4A-1: thumbnail render on the no-card revision...');
  prev = snapshot(tNoCard);
  const thumbsNoCard = join(exportsDir, 'thumbnails', tNoCard);
  r = await http('POST', `/api/clips/${tNoCard}/thumbnail/render`, { frame_path: join(thumbsNoCard, 'frame.png'), line1: 'FIXED', line2: 'TEXT' });
  const rendered = readdirSync(thumbsNoCard).filter(n => /^thumb_[0-9a-f]{8}\.png$/.test(n)).map(n => join(thumbsNoCard, n));
  assert.equal(rendered.length, 1, `${r.text} ${readdirSync(thumbsNoCard)}`);
  now = await assertCommitted('thumbnail render', tNoCard, prev, r, { recipeDiff: {}, card: sha256(rendered[0]) });
  assert.deepEqual(r.body, { ok: true, preview_path: now.e.thumbnail_config.preview_path });
  assert.deepEqual([now.e.thumbnail_config.line1, now.e.thumbnail_config.line2, now.e.thumbnail_config.text], ['FIXED', 'TEXT', 'Fixed text'], 'settings in the commit');
  step('thumbnail render', { card: basename(rendered[0]), preview: relative(fixture, now.e.thumbnail_config.preview_path) });

  console.log('Policy first: generate and select stay blocked in the local profile...');
  for (const path of [`/api/clips/${tCard}/thumbnail`, `/api/clips/${tCard}/thumbnail/select`]) {
    const before = hashTree();
    const blocked = await http('POST', path, { path: cardImage });
    assert.equal(blocked.status, 403, `${path}: ${blocked.text}`);
    assert.deepEqual(diffTrees(before, hashTree()), []);
  }

  // ======================= B2B4A-3: previews and replay =======================
  console.log('B2B4A-3: tracked logo previews never read the legacy backup...');
  {
    plant(tCard, e => { e.logo_backup_path = join(exportsDir, 'card.pre-logo.mp4'); });
    const before = hashTree();
    const previews = await http('GET', `/api/clips/${tCard}/logo/previews?logo_path=${encodeURIComponent(logoImage)}`);
    assert.equal(previews.status, 200, previews.text);
    const colors = previews.body.previews.map(p => region(p.path, null, 100, 1500));
    assert(colors.every(c => !isPink(c)), `a preview came from the backup: ${JSON.stringify(colors)}`);
    assert(previews.body.previews.every(p => p.path.startsWith(join(exportsDir, 'logo-previews', tCard) + sep)));
    assert.deepEqual(diffTrees(before, hashTree()), [], 'previews wrote outside logo-previews');
    plant(tCard, e => { delete e.logo_backup_path; });
    step('logo previews', { count: previews.body.previews.length, sample: colors[0] });
  }
  console.log('B2B4A-3: a replay of a request without settings rewrites nothing...');
  {
    const e = entryOf(tNoCard);
    const fixtureOp = e.revisions.operations.find(o => o.operation_id === 'op-fixture-no-card');
    const bytes = readFileSync(historyPath);
    const replay = await svc.saveRevision({
      clip_id: tNoCard, operation_id: 'op-fixture-no-card', expected: fixtureOp.expected,
      recipe: { source_video: source, title: 'fixture no-card', ...RECIPE }, source_words: words,
    });
    assert.deepEqual([replay.outcome, replay.replayed], ['committed', true]);
    assert(readFileSync(historyPath).equals(bytes), 'a replay rewrote history');
    step('replay', { operation: 'op-fixture-no-card', history: 'byte-identical' });
  }

  // ======================= B2B4A-2: refusals over HTTP =======================
  console.log('B2B4A-2: unavailable bases...');
  const baseRefusals = {};
  for (const [kind, id] of [['version zero', tV0], ['no current revision', tNoCurrent], ['malformed', tMalformed]]) {
    for (const [label, send] of [
      ['PATCH caption', () => http('PATCH', `/api/clips/${id}`, { caption_style: 'subtle', title: 'Not written' })],
      ['logo apply', () => http('POST', `/api/clips/${id}/logo`, { action: 'apply', logo_path: logoImage })],
      ['logo remove', () => http('POST', `/api/clips/${id}/logo`, { action: 'remove' })],
      ['thumbnail render', () => http('POST', `/api/clips/${id}/thumbnail/render`, { frame_path: join(exportsDir, 'thumbnails', id, 'frame.png'), line1: 'FIXED', line2: 'TEXT' })],
    ]) {
      const before = hashTree();
      assertRefused(`${kind} ${label}`, await send(), 409, 'REVISION_BASE_UNAVAILABLE', before);
      baseRefusals[`${kind} ${label}`] = 409;
    }
  }
  for (const [label, arrange, restore] of [
    ['unreadable document', p => renameSync(p, `${p}.away`), p => renameSync(`${p}.away`, p)],
    ['invalid document', p => { copyFileSync(p, `${p}.keep`); writeFileSync(p, '{ not json'); }, p => renameSync(`${p}.keep`, p)],
  ]) {
    const docPath = entryOf(tCard).revisions.current.path;
    arrange(docPath);
    const before = hashTree();
    assertRefused(label, await http('PATCH', `/api/clips/${tCard}`, { caption_style: 'subtle' }), 409, 'REVISION_BASE_UNAVAILABLE', before);
    restore(docPath);
    baseRefusals[label] = 409;
  }
  step('unavailable bases', { count: Object.keys(baseRefusals).length });

  console.log('B2B4A-2: busy clips...');
  for (const [label, change] of [
    ['draft present', e => { e.revisions.draft = { version: e.revisions.draft_version + 1, path: join(sidecarRoot, tCard, 'draft-x.json'), saved_at: 'now' }; }],
    ['pending operation', e => { e.revisions.operations.push({ ...e.revisions.operations.at(-1), operation_id: 'op-stale', state: 'pending', revision: null, ended_at: null }); }],
  ]) {
    const original = readFileSync(historyPath);
    plant(tCard, change);
    const before = hashTree();
    assertRefused(label, await http('PATCH', `/api/clips/${tCard}`, { caption_style: 'subtle' }), 409, 'REVISION_BUSY', before);
    writeFileSync(historyPath, original);
  }
  step('busy clips', { draft: 409, pending: 409 });

  console.log('B2B4A-2: missing and changed source and card image...');
  const inputRefusals = {};
  const cardCopy = () => docOf(entryOf(tCard)).thumbnail_card.image.path;
  const shortSource = coloredSource(join(fixture, 'short-source.mp4'), COLORS.slice(0, 3));
  for (const [label, arrange, restore] of [
    ['source missing', () => renameSync(source, `${source}.away`), () => renameSync(`${source}.away`, source)],
    ['source changed', () => { renameSync(source, `${source}.away`); copyFileSync(shortSource, source); }, () => { rmSync(source); renameSync(`${source}.away`, source); }],
    ['card image missing', () => renameSync(cardCopy(), `${cardCopy()}.away`), () => renameSync(`${cardCopy()}.away`, cardCopy())],
    ['card image changed', () => { copyFileSync(cardCopy(), `${cardCopy()}.keep`); writeFileSync(cardCopy(), 'other bytes'); }, () => { rmSync(cardCopy()); renameSync(`${cardCopy()}.keep`, cardCopy()); }],
  ]) {
    arrange();
    const before = hashTree();
    assertRefused(label, await http('PATCH', `/api/clips/${tCard}`, { caption_style: 'subtle' }), 409, 'REVISION_INPUT_MISSING', before);
    restore();
    inputRefusals[label] = 409;
  }
  step('missing or changed inputs', { ...inputRefusals, 'logo missing': 409, 'logo replaced by a folder': 409 });

  console.log('B2B4A-2: invalid caption styles...');
  for (const style of [null, 'neon', '', 0]) {
    const before = hashTree();
    const res = await http('PATCH', `/api/clips/${tNoCard}`, { title: 'Must not land', caption_style: style });
    assertRefused(`style ${JSON.stringify(style)}`, res, 400, 'INVALID_CAPTION_STYLE', before);
  }
  assert.notEqual(entryOf(tNoCard).title, 'Must not land');
  step('invalid caption styles', { refused: 4, title: 'unchanged' });

  console.log('B2B4A-2: injected failures through the adapter with the real bridge...');
  const failures = {};
  const injected = label => () => { throw new Error(`${label} failed (injected)`); };
  for (const [label, over] of [
    ['render', { render: async () => injected('render')() }],
    ['composition', { compose: async () => injected('composition')() }],
    ['probe', { probe: async () => injected('probe')() }],
    ['commit', { hooks: { beforeCommit: injected('commit') } }],
  ]) {
    const before = snapshot(tCard);
    const served = sha256(before.e.output_path);
    const adapters = new ClipLegacyAdapters({ history, service: new ClipRevisionService({ history, ...over }) });
    const err = await adapters.commit(await adapters.prepare(entryOf(tCard)), { recipe: rc => { rc.caption_style = 'subtle'; } }).catch(x => x);
    assert.deepEqual([err?.code, err?.status], ['REVISION_SAVE_FAILED', 500], `${label}: ${err?.stack ?? err}`);
    assert(!/[\\/]|injected/.test(err.message), `${label}: the refusal leaks detail`);
    const e = entryOf(tCard);
    assert.deepEqual(e.revisions.current, before.e.revisions.current, `${label}: current pointer moved`);
    for (const key of ['output_path', 'duration', 'file_size_mb', 'caption_style', 'thumbnail_config', 'logo_path']) assert.deepEqual(e[key], before.e[key], `${label}: ${key}`);
    const preview = await http('GET', `/api/clips/${tCard}/preview`);
    assert.equal(createHash('sha256').update(preview.buffer).digest('hex'), served, `${label}: the previous file is no longer served`);
    assertKept(label, before.tree);
    const op = e.revisions.operations.find(o => o.operation_id === err.operationId);
    failures[label] = { state: op.state, residuals: op.residuals.length };
    if (label === 'commit') {
      // A pending operation left by an interrupted commit keeps the clip busy until it is invalidated.
      const busyBefore = hashTree();
      assertRefused('after an interrupted commit', await http('PATCH', `/api/clips/${tCard}`, { caption_style: 'subtle' }), 409, 'REVISION_BUSY', busyBefore);
      const inv = await svc.invalidateOperation({ clip_id: tCard, operation_id: err.operationId, expected_incarnation: e.revisions.incarnation, reason: 'check cleanup' });
      assert.equal(inv.outcome, 'invalidated');
    }
  }
  step('injected save failures', failures);

  console.log('B2B4A-2: expected state changed between the guard and the pending record...');
  {
    const adapters = new ClipLegacyAdapters({ history, service: new ClipRevisionService({ history }) });
    const baseState = await adapters.prepare(entryOf(tCard));
    const original = history.transaction.bind(history);
    let calls = 0;
    history.transaction = async fn => {
      if (++calls === 2) await original(list => { list.find(x => x.id === tCard).revisions.draft_version += 1; });
      return original(fn);
    };
    const groups = readdirSync(join(namespaceRoot, tCard)).sort();
    const err = await adapters.commit(baseState, { recipe: rc => { rc.caption_style = 'subtle'; } }).catch(x => x);
    history.transaction = original;
    assert.equal(err?.code, 'REVISION_BUSY', String(err?.stack ?? err));
    assert.deepEqual(readdirSync(join(namespaceRoot, tCard)).sort(), groups, 'a render started');
    assert(!entryOf(tCard).revisions.operations.some(o => o.operation_id === err.operationId), 'a pending record was written');
    plant(tCard, x => { x.revisions.draft_version -= 1; });
    step('changed between guard and pending record', { code: err.code });
  }

  // ======================= B2B4A-4: WS-23 through rerender ===================
  console.log('B2B4A-4 (WS-23): links at the title-derived name through rerender...');
  const ownedFile = entryOf(tCard).output_path;
  const ownedDir = dirname(ownedFile);
  const ws23 = {};
  for (const [kind, make, wording] of [
    ['symlink', link => symlinkSync(ownedFile, link, 'file'), FENCE_MESSAGES.owned],
    ['junction', link => symlinkSync(ownedDir, link, 'junction'), FENCE_MESSAGES.owned],
    ['dangling', link => symlinkSync(join(ownedDir, 'created_short.mp4'), link, 'file'), FENCE_MESSAGES.unresolvable],
  ]) {
    const clip = await legacyClip(`ws23-${kind}`, {}, []);
    const derived = join(exportsDir, `Adapter_ws23-${kind}_short.mp4`);
    make(derived);
    const before = hashTree();
    const res = await http('POST', `/api/clips/${clip.id}/rerender`, { trim: { inSec: 1.5, outSec: 3.5 } });
    assertRefused(`rerender ${kind}`, res, 409, 'REVISION_PATH_PROTECTED', before);
    assert.equal(res.body.error, wording, `rerender ${kind} wording`);
    assert(!existsSync(join(ownedDir, 'created_short.mp4')));
    ws23[`rerender ${kind}`] = 409;
  }
  {
    const control = await legacyClip('ws23-control', {}, []);
    const res = await http('POST', `/api/clips/${control.id}/rerender`, { trim: { inSec: 1.5, outSec: 3.5 } });
    assert.equal(res.status, 200, res.text);
    assert(existsSync(join(exportsDir, 'Adapter_ws23-control_short.mp4')));
    ws23['rerender outside control'] = 200;
  }

  console.log('B2B4A-4 (WS-23): direct create_clip and batch_clips bridge calls...');
  const legacyParams = (outDir, title) => ({
    video_path: source, transcript_words: [], caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical',
    clean_fillers: false, output_dir: outDir, title, start_second: 1, end_second: 3,
  });
  const bridgeRefused = async (label, params, wording) => {
    const before = hashTree();
    const err = await executor.execute('create_clip', params).then(() => null, x => x);
    assert(err, `${label}: rendered`);
    const first = String(err.message).split('\n')[0];
    assert.equal(first, `ClipRevisionFenceError: REVISION_PATH_PROTECTED: ${wording}`, label);
    assert.deepEqual(diffTrees(before, hashTree()), [], `${label}: stored bytes changed`);
  };
  for (const [kind, make, wording] of [
    ['symlink', link => symlinkSync(ownedFile, link, 'file'), FENCE_MESSAGES.owned],
    ['junction', link => symlinkSync(ownedDir, link, 'junction'), FENCE_MESSAGES.owned],
    ['dangling', link => symlinkSync(join(ownedDir, 'created_short.mp4'), link, 'file'), FENCE_MESSAGES.unresolvable],
  ]) {
    const outDir = join(outside, `direct-${kind}`);
    mkdirSync(outDir);
    make(join(outDir, `direct_${kind}_short.mp4`));
    await bridgeRefused(`create_clip ${kind}`, legacyParams(outDir, `direct ${kind}`), wording);
    ws23[`create_clip ${kind}`] = 'refused';
    // A suffixed name: the first same-title clip of a batch takes the plain name, the second "-2".
    const batchDir = join(outside, `batch-${kind}`);
    mkdirSync(batchDir);
    make(join(batchDir, `batch_${kind}_short-2.mp4`));
    const before = hashTree();
    const batch = (await executor.execute('batch_clips', {
      video_path: source, transcript_words: [], clean_fillers: false, output_dir: batchDir,
      clips: [1, 2].map(() => ({ start_second: 1, end_second: 3, title: `batch ${kind}`, caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical' })),
    })).data;
    assert.equal(batch.results[0].status, 'success', JSON.stringify(batch.results[0]));
    assert.equal(batch.results[0].output_path, join(batchDir, `batch_${kind}_short.mp4`));
    assert.equal(batch.results[1].status, 'error', JSON.stringify(batch.results[1]));
    assert.equal(batch.results[1].error, `REVISION_PATH_PROTECTED: ${wording}`);
    assert.deepEqual(diffTrees(before, hashTree()), [], `batch ${kind}: stored bytes changed`);
    ws23[`batch suffixed ${kind}`] = 'refused';
  }
  assert(!existsSync(join(ownedDir, 'created_short.mp4')), 'a dangling link created its owned target');
  await bridgeRefused('create_clip case variant', legacyParams(join(exportsDir, 'WRITING-STUDIO', tCard, 'case'), 'case variant'), FENCE_MESSAGES.owned);
  assert(!existsSync(join(namespaceRoot, tCard, 'case')));
  ws23['create_clip case variant'] = 'refused';
  {
    const freshExports = join(fixture, 'exports-fresh');
    mkdirSync(freshExports);
    process.env.PODCLI_OUTPUT = freshExports;
    try {
      await bridgeRefused('create_clip missing namespace root', legacyParams(join(freshExports, 'writing-studio', 'clip-new'), 'missing root'), FENCE_MESSAGES.owned);
    } finally {
      process.env.PODCLI_OUTPUT = exportsDir;
    }
    assert(!existsSync(join(freshExports, 'writing-studio')), 'the missing namespace root was created');
    ws23['create_clip missing namespace root'] = 'refused';
  }
  {
    const control = (await executor.execute('create_clip', legacyParams(join(outside, 'control'), 'outside control'))).data;
    assert.equal(control.output_path, join(outside, 'control', 'outside_control_short.mp4'));
    assert(existsSync(control.output_path));
    ws23['create_clip outside control'] = 'rendered';
  }
  step('WS-23 legacy sinks', ws23);

  // ======================= B2B4A-4: WS-23 on the audio-only road (lead-27) ===
  // generate_clip hands an audio-only source to the audiogram renderer, which names its
  // output `<output folder>/<safe title>.mp4`: no `_short` and no suffix; alphanumerics,
  // "-" and "_" kept, anything else "_" (the legacy naming contract).
  console.log('B2B4A-4 (WS-23): the audio-only road through rerender, create_clip and batch_clips...');
  const audioSource = join(fixture, 'audio-only.m4a');
  run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=6', '-c:a', 'aac', audioSource]);
  assert.deepEqual(probeStreams(audioSource).streams.map(s => s.codec_type), ['audio']);
  const audioLinks = [
    ['symlink', link => symlinkSync(ownedFile, link, 'file'), FENCE_MESSAGES.owned],
    ['junction', link => symlinkSync(ownedDir, link, 'junction'), FENCE_MESSAGES.owned],
    ['dangling', link => symlinkSync(join(ownedDir, 'created_short.mp4'), link, 'file'), FENCE_MESSAGES.unresolvable],
  ];
  const isAudiogram = path => {
    const streams = probeStreams(path).streams.map(s => s.codec_type).sort();
    assert.deepEqual(streams, ['audio', 'video'], `${path}: not an audiogram render`);
  };
  const audio = {};
  for (const [kind, make, wording] of audioLinks) {
    const clip = await legacyClip(`ws23a-${kind}`, { source_video: audioSource }, []);
    make(join(exportsDir, `Adapter_ws23a-${kind}.mp4`));
    const before = hashTree();
    const res = await http('POST', `/api/clips/${clip.id}/rerender`, { trim: { inSec: 1.5, outSec: 3.5 } });
    assertRefused(`audio rerender ${kind}`, res, 409, 'REVISION_PATH_PROTECTED', before);
    assert.equal(res.body.error, wording, `audio rerender ${kind} wording`);
    audio[`rerender ${kind}`] = 409;
  }
  {
    const control = await legacyClip('ws23a-control', { source_video: audioSource }, []);
    const res = await http('POST', `/api/clips/${control.id}/rerender`, { trim: { inSec: 1.5, outSec: 3.5 } });
    assert.equal(res.status, 200, res.text);
    assert.equal(res.body.output_path, join(exportsDir, 'Adapter_ws23a-control.mp4'));
    isAudiogram(res.body.output_path);
    audio['rerender outside control'] = 200;
  }
  const audioParams = (outDir, title) => ({ ...legacyParams(outDir, title), video_path: audioSource });
  for (const [kind, make, wording] of audioLinks) {
    const outDir = join(outside, `audio-direct-${kind}`);
    mkdirSync(outDir);
    make(join(outDir, `audio_direct_${kind}.mp4`));
    await bridgeRefused(`audio create_clip ${kind}`, audioParams(outDir, `audio direct ${kind}`), wording);
    audio[`create_clip ${kind}`] = 'refused';
    // batch_clips: a clip whose derived name is plain renders; the one with the planted name is refused.
    const batchDir = join(outside, `audio-batch-${kind}`);
    mkdirSync(batchDir);
    make(join(batchDir, `audio_batch_${kind}.mp4`));
    const before = hashTree();
    const batch = (await executor.execute('batch_clips', {
      video_path: audioSource, transcript_words: [], clean_fillers: false, output_dir: batchDir,
      clips: [`audio batch plain ${kind}`, `audio batch ${kind}`].map(title => ({ start_second: 1, end_second: 3, title, caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical' })),
    })).data;
    assert.equal(batch.results[0].status, 'success', JSON.stringify(batch.results[0]));
    assert.equal(batch.results[0].output_path, join(batchDir, `audio_batch_plain_${kind}.mp4`));
    assert.equal(batch.results[1].status, 'error', JSON.stringify(batch.results[1]));
    assert.equal(batch.results[1].error, `REVISION_PATH_PROTECTED: ${wording}`);
    assert.deepEqual(diffTrees(before, hashTree()), [], `audio batch ${kind}: stored bytes changed`);
    audio[`batch ${kind}`] = 'refused';
  }
  {
    const junctionDir = join(outside, 'audio-junction-folder');
    symlinkSync(ownedDir, junctionDir, 'junction');
    await bridgeRefused('audio create_clip junction folder', audioParams(junctionDir, 'audio junction folder'), FENCE_MESSAGES.owned);
    audio['create_clip junction folder'] = 'refused';
  }
  assert(!existsSync(join(ownedDir, 'created_short.mp4')), 'a dangling link created its owned target');
  await bridgeRefused('audio create_clip case variant', audioParams(join(exportsDir, 'WRITING-STUDIO', tCard, 'audio-case'), 'audio case'), FENCE_MESSAGES.owned);
  assert(!existsSync(join(namespaceRoot, tCard, 'audio-case')));
  audio['create_clip case variant'] = 'refused';
  {
    const freshExports = join(fixture, 'exports-fresh-audio');
    mkdirSync(freshExports);
    process.env.PODCLI_OUTPUT = freshExports;
    try {
      await bridgeRefused('audio create_clip missing namespace root', audioParams(join(freshExports, 'writing-studio', 'clip-new'), 'audio missing root'), FENCE_MESSAGES.owned);
    } finally {
      process.env.PODCLI_OUTPUT = exportsDir;
    }
    assert(!existsSync(join(freshExports, 'writing-studio')), 'the missing namespace root was created');
    audio['create_clip missing namespace root'] = 'refused';
  }
  {
    const control = (await executor.execute('create_clip', audioParams(join(outside, 'audio-control'), 'audio control'))).data;
    assert.equal(control.output_path, join(outside, 'audio-control', 'audio_control.mp4'));
    assert.equal(control.crop_strategy, 'audiogram');
    isAudiogram(control.output_path);
    audio['create_clip outside control'] = 'rendered';
  }
  step('WS-23 audio-only sinks', audio);

  // ======================= B2B4A-1: generate and select ======================
  console.log('B2B4A-1: thumbnail generate and select (upstream profile, no provider)...');
  await stopServer();
  await startServer('upstream');
  prev = snapshot(tCard);
  r = await http('POST', `/api/clips/${tCard}/thumbnail`, {});
  assert.equal(r.status, 200, r.text);
  const variations = r.body.variations;
  assert(Array.isArray(variations) && variations.length > 0, r.text);
  now = await assertCommitted('thumbnail generate', tCard, prev, r, { recipeDiff: {}, card: sha256(variations[0]) });
  assert.deepEqual(r.body, { ok: true, preview_path: now.e.thumbnail_config.preview_path, variations });
  assert.deepEqual(now.e.thumbnail_config.variations, variations, 'variations stored in the commit');
  assert(variations.every(v => v.startsWith(join(exportsDir, 'thumbnails', tCard) + sep)));
  const generated = { variations: variations.length, card: basename(variations[0]) };

  // Selecting the current card's image again is unchanged: nothing renders or changes.
  prev = snapshot(tCard);
  r = await http('POST', `/api/clips/${tCard}/thumbnail/select`, { path: variations[0] });
  assert.deepEqual([r.status, r.body], [200, { ok: true, preview_path: prev.e.thumbnail_config.preview_path }], r.text);
  assert(readFileSync(historyPath).equals(prev.history), 'an unchanged select rewrote history');
  // A distinct variation commits it as the card.
  const distinct = join(exportsDir, 'thumbnails', tCard, 'thumb_v9.png');
  copyFileSync(altImage, distinct);
  plant(tCard, e => { e.thumbnail_config.variations = [...e.thumbnail_config.variations, distinct]; });
  prev = snapshot(tCard);
  r = await http('POST', `/api/clips/${tCard}/thumbnail/select`, { path: distinct });
  now = await assertCommitted('thumbnail select', tCard, prev, r, { recipeDiff: {}, card: sha256(distinct) });
  assert.deepEqual(r.body, { ok: true, preview_path: now.e.thumbnail_config.preview_path });
  step('thumbnail generate and select', { ...generated, select_same: 'unchanged', select_distinct: basename(distinct) });

  // ======================= logs and legacy files =============================
  const refusalLines = logs.split('\n').filter(l => adapterCodes.some(c => l.includes(c)) || /REVISION_PATH_PROTECTED/.test(l));
  assert(refusalLines.length > 0, 'no refusal was logged');
  for (const line of refusalLines) {
    assert(!line.includes(fixture) && !line.includes(fixture.replace(/\\/g, '\\\\')) && !line.includes(fixture.replace(/\\/g, '/')), `a log line leaked a path: ${line}`);
  }
  const adapterLines = refusalLines.filter(l => l.includes('Legacy clip action not saved'));
  assert(adapterLines.length > 0 && adapterLines.every(l => /"clip":"[^"]+"/.test(l) && /"operation":"[a-z-]+"/.test(l) && /"code":"[A-Z_]+"/.test(l)));
  for (const [name, hash] of Object.entries(legacyFiles)) assert.equal(sha256(join(exportsDir, name)), hash, `${name} changed`);
  step('logs and legacy files', {
    refusal_lines: refusalLines.length, adapter_lines: adapterLines.length, sample: adapterLines[0]?.slice(0, 300) ?? null,
    legacy_backups_unchanged: Object.keys(legacyFiles).length,
  });
} finally {
  await stopServer();
  results.serverLog = logs.split('\n').slice(-400).join('\n');
  if (resultOut) writeFileSync(resultOut, JSON.stringify(results, null, 2));
}
console.log('Passed');
