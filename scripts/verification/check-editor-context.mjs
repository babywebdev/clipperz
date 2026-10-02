// The read-only editor context over actual HTTP (Writing Studio 1B.2b.2).
//
// Proves, against a real `dist/ui/web-server.js` started in an isolated
// home/data/exports/tmp on a verified free loopback port — never the configured
// studio port, and never by restarting a running studio — that
// GET /api/clips/:id/editor-context:
//
//  * describes a real saved revision (committed here through the accepted
//    render and opening-card bridges) coherently: captured identity, committed
//    media identity, the renderer's effective cuts, raw render versus final
//    composition offsets, card image identity and dependency groups, all
//    agreeing with the document actually on disk;
//  * describes an untracked legacy clip honestly: requested range and segments
//    labelled requested, bounded words with their domain, conflicting sidecars
//    reported rather than resolved, a selected thumbnail with unknown bake
//    provenance, and no claim of effective cuts;
//  * distinguishes absent, supplied-empty, malformed and unreadable recovery
//    inputs;
//  * fails safely: a corrupt tracked document is a stable error and never
//    degrades to the legacy sidecars sitting beside it, a corrupt history is an
//    error rather than an empty Library, an absent id is 404 and a traversal
//    attempt is 400;
//  * holds the boundaries repair-1 corrected: a junction at an *ancestor* of the
//    clip's own sidecar directory is refused without adopting its target, a
//    malformed pointer or consumed document field answers with a stable domain
//    code rather than a coerced value or a raw exception, and an invalid legacy
//    word list is reported malformed instead of being filtered into a usable
//    transcript, with the clip's text and media still available;
//  * holds the boundaries repair-2 corrected: a junction at the *configured
//    history root* is refused before the clip list behind it can be read, so no
//    title or transcript from outside the owned tree is ever serialised; a
//    linked legacy sidecar directory answers with the ownership code rather
//    than a downgraded sidecar; finite-but-impossible durations, offsets,
//    overlaps, branches and crop coordinates are refused instead of becoming
//    exact timing; a document that does not serve the file its pointer serves
//    is refused; a moved entry summary keeps the clip's context but disables
//    the committed play and download capabilities and clears media.serves; and
//    a positive revision or draft counter with no pointer is refused instead of
//    falling back to legacy recovery;
//  * keeps the local host and origin policy, advertises no save or adoption
//    route, and answers the same after the server is stopped and restarted;
//  * changes nothing: every stored byte in the fixture is identical before and
//    after, the existing preview and download routes serve the same bytes, and
//    the untracked clip never gains revision tracking.
//
// Requires `npm run build` and the Remotion bundle cache. No AI call, no
// network, no user data, no production route beyond the ones under test.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:net';
import http from 'node:http';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRuntime, installationRoot, projectRoot } from '../local/runtime.mjs';

const { env, settings } = loadRuntime();
const fixture = mkdtempSync(join(installationRoot, 'tmp/editor-context-'));
for (const dir of ['home', 'data', 'data/working', 'data/cache', 'exports', 'tmp']) mkdirSync(join(fixture, dir), { recursive: true });
writeFileSync(join(fixture, 'empty.env'), '');
const home = join(fixture, 'home');
const exportsDir = join(fixture, 'exports');
const fixtureEnv = {
  ...env,
  PODCLI_HOME: home, PODCLI_DATA: join(fixture, 'data'), PODCLI_OUTPUT: exportsDir,
  PODCLI_CWD: home, PODCLI_ENV_FILE: join(fixture, 'empty.env'),
  TMP: join(fixture, 'tmp'), TEMP: join(fixture, 'tmp'), TMPDIR: join(fixture, 'tmp'),
};
Object.assign(process.env, fixtureEnv);

const run = (exe, args, opts = {}) => execFileSync(exe, args, {
  env: process.env, windowsHide: true, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024, ...opts,
});
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const results = { fixture, steps: {} };
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
const cardImage = join(fixture, 'card.png');
run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=1080x1920:d=1', '-frames:v', '1', cardImage]);
const poster = join(fixture, 'poster.png');
run(settings.FFMPEG_PATH, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=white:s=1280x720:d=1', '-frames:v', '1', poster]);
const words = COLORS.map((c, i) => ({ word: c, start: i + 0.2, end: i + 0.7, confidence: 1, speaker: `S${i % 2}` }));
const sourceHash = sha256(source);

// --- compiled application modules -------------------------------------------
const dist = name => pathToFileURL(join(projectRoot, 'dist', name)).href;
const { PythonExecutor } = await import(dist('services/python-executor.js'));
const { ClipsHistory } = await import(dist('services/clips-history.js'));
const { ClipRevisionService, REVISION_NAMESPACE } = await import(dist('services/clip-revisions.js'));
const { paths } = await import(dist('config/paths.js'));
assert.equal(paths.output, exportsDir);
assert.equal(paths.history, join(home, 'history'));

const historyPath = join(home, 'history', 'clips.json');
const entries = () => JSON.parse(readFileSync(historyPath, 'utf8'));
const entryOf = id => entries().find(e => e.id === id);
const history = new ClipsHistory();
const executor = new PythonExecutor(15 * 60 * 1000);
const expectedOf = s => ({ incarnation: s.incarnation, draft_version: s.draft_version, revision_version: s.revision_version });

console.log('Rendering one real legacy clip through the bridge...');
const legacy = (await executor.execute('create_clip', {
  video_path: source, transcript_words: words, caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical',
  clean_fillers: false, output_dir: exportsDir, title: 'editor-legacy', start_second: 1, end_second: 5,
})).data;
const legacyOutput = legacy.output_path;
const legacyCopy = join(exportsDir, 'editor-legacy-copy_short.mp4');
copyFileSync(legacyOutput, legacyCopy);

// Clip A: untracked legacy, with a full set of recovery inputs.
const clipA = await history.record({
  source_video: source, start_second: 1, end_second: 5, caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical',
  title: 'Legacy editor clip', output_path: legacyCopy, file_size_mb: legacy.file_size_mb, duration: legacy.duration,
  transcript_slice: 'green blue yellow', description: 'Legacy description', hashtags: '#a #b',
  keep_segments: [{ start: 1, end: 2 }, { start: 4, end: 5 }],
  thumbnail_config: { preview_path: poster, card_seconds: 1.5, text: 'Two lines' },
  unknown_field: { kept: true },
});
const boundedWords = words.filter(w => w.start >= 1 && w.start < 5);
mkdirSync(join(home, 'history', 'words'), { recursive: true });
mkdirSync(join(home, 'history', 'recipes'), { recursive: true });
mkdirSync(join(home, 'history', 'reframe'), { recursive: true });
writeFileSync(join(home, 'history', 'words', `${clipA.id}.json`), JSON.stringify(boundedWords));
writeFileSync(join(home, 'history', 'recipes', `${clipA.id}.json`), JSON.stringify({
  caption_style: 'hormozi', crop_strategy: 'center', format: 'square', clean_fillers: false,
  keep_segments: [{ start: 0, end: 3 }], transcript_words: boundedWords, unknown_future_field: { kept: true },
}));
writeFileSync(join(home, 'history', 'reframe', `${clipA.id}.json`), JSON.stringify({ inSec: 2.5, outSec: 5, keyframes: [{ tAbs: 3, x_pct: 40 }] }));

// Clip B: tracked, committed through the real bridges, with legacy recovery
// inputs beside it that a corrupt document must never fall back to.
const clipB = await history.record({
  source_video: source, start_second: 1, end_second: 2, caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical',
  title: 'Tracked editor clip', output_path: legacyOutput, file_size_mb: legacy.file_size_mb, duration: legacy.duration,
  transcript_slice: 'green',
});
writeFileSync(join(home, 'history', 'words', `${clipB.id}.json`), JSON.stringify(boundedWords));

// Clip C: never read here except to prove a clip list with more than one entry
// resolves by full id only.
const clipC = await history.record({
  source_video: source, start_second: 0, end_second: 1, caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical',
  title: 'Other clip', output_path: legacyCopy, file_size_mb: legacy.file_size_mb, duration: legacy.duration,
});

console.log('Committing a real exact revision with an opening card...');
const svc = new ClipRevisionService({ history });
const v0 = await svc.ensureTracked(clipB.id);
assert.deepEqual([v0.current.version, v0.current.provenance], [0, 'legacy-unversioned']);
const draft = await svc.saveDraft({
  clip_id: clipB.id, expected: expectedOf(v0),
  draft: { recipe: { source_video: source, title: 'editor-context', keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }], caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical', clean_fillers: false }, source_words: words, note: 'draft for the editor' },
});
const saved = await svc.saveRevision({
  clip_id: clipB.id, operation_id: 'op-editor-1', expected: expectedOf(entryOf(clipB.id).revisions),
  recipe: { source_video: source, title: 'editor-context', keep_segments: [{ start: 4, end: 5 }, { start: 1, end: 2 }], caption_style: 'karaoke', crop_strategy: 'center', format: 'vertical', clean_fillers: false },
  source_words: words,
  thumbnail_card: { image_path: cardImage, image_sha256: sha256(cardImage), placement: 'opening', duration: 1.5 },
});
assert.equal(saved.outcome, 'committed', JSON.stringify(saved.operation));
const document = await svc.loadRevision(clipB.id, saved.revision.revision_id);
assert(document.final_composition, 'the committed document carries no final composition');
const documentPath = entryOf(clipB.id).revisions.current.path;
const documentBytes = readFileSync(documentPath);
step('fixtures', {
  legacy_clip: clipA.id, tracked_clip: clipB.id, other_clip: clipC.id,
  revision_id: saved.revision.revision_id, draft_version: draft.draft.version,
  groups: entryOf(clipB.id).revisions.current.groups.length,
});

// A byte copy of a real clip output under a container `serveClipById` will not
// stream, created before the fixture is hashed so the byte-preservation walk
// covers it like every other stored file.
const unstreamable = join(exportsDir, 'committed_short.avi');
copyFileSync(legacyOutput, unstreamable);

// --- the whole fixture, before any request ----------------------------------
function hashTree(dir) {
  const out = {};
  const walk = d => {
    for (const item of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, item.name);
      if (item.isDirectory()) walk(p);
      else out[p] = sha256(p);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}
const before = hashTree(fixture);
const assertUnchanged = label => {
  const after = hashTree(fixture);
  assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort(), `${label}: the set of files changed`);
  for (const [path, hash] of Object.entries(before)) assert.equal(after[path], hash, `${label}: ${path} changed`);
};

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
    try { if ((await fetch(`${base}/api/local-policy`)).ok) break; } catch { /* not listening yet */ }
    await new Promise(resolve => setTimeout(resolve, 100));
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

const get = async (path, init) => {
  const response = await fetch(base + path, init);
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, headers: response.headers, body };
};
const context = async (id, init) => get(`/api/clips/${id}/editor-context`, init);
/** A raw request, so a Host header fetch refuses to set can still be sent. */
const raw = (path, headers) => new Promise((resolve, reject) => {
  const url = new URL(base + path);
  const request = http.request({ host: '127.0.0.1', port: url.port, path: url.pathname, method: 'GET', headers }, res => {
    let text = '';
    res.on('data', c => { text += c; });
    res.on('end', () => resolve({ status: res.statusCode, text }));
  });
  request.on('error', reject);
  request.end();
});

const port1 = await startServer();
step('studio started', { port: port1, configured_studio_port: settings.PODCLI_PORT });

try {
  console.log('Tracked clip: committed identity, timing and card...');
  const tracked = await context(clipB.id);
  assert.equal(tracked.status, 200, JSON.stringify(tracked.body));
  assert.equal(tracked.headers.get('cache-control'), 'no-store');
  const state = entryOf(clipB.id).revisions;
  assert.deepEqual(
    [tracked.body.identity.clip_id, tracked.body.identity.tracked, tracked.body.identity.incarnation,
      tracked.body.identity.revision_version, tracked.body.identity.draft_version],
    [clipB.id, true, state.incarnation, 1, draft.draft.version]);
  assert.equal(tracked.body.revision.revision_id, saved.revision.revision_id);
  assert.equal(tracked.body.revision.document.has_final_composition, true);
  assert.equal(tracked.body.revision.document.dependency_group_count, state.current.groups.length);
  assert.deepEqual(tracked.body.timing.effective_segments.map(s => [s.source_start, s.source_end, s.content_start]),
    document.render_timeline.segments.map(s => [s.source_start, s.source_end, s.content_start]));
  assert.deepEqual([tracked.body.timing.effective_cuts_known, tracked.body.timing.provenance], [true, 'exact-revision']);
  assert.deepEqual(tracked.body.timing.raw_render, {
    content_duration: document.render_timeline.content_duration,
    content_duration_measured: document.render_timeline.content_duration_measured,
    content_to_output_offset: document.render_timeline.content_to_output_offset,
    output_duration: document.render_timeline.output_duration,
  });
  assert.deepEqual(tracked.body.timing.final_composition, {
    card_offset: document.final_composition.card_offset,
    content_offset: document.final_composition.content_offset,
    content_duration: document.final_composition.content_duration,
    output_duration: document.final_composition.output.duration,
  });
  // A real 1.5 s card really shifts the content in the served file.
  assert(tracked.body.timing.final_composition.card_offset > 1.4, JSON.stringify(tracked.body.timing.final_composition));
  assert.notEqual(tracked.body.timing.raw_render.output_duration, tracked.body.timing.final_composition.output_duration);
  assert.deepEqual(tracked.body.revision.document.thumbnail_card.image,
    { sha256: sha256(cardImage), bytes: document.final_composition.card.image.bytes, name: basename(document.final_composition.card.image.path) });
  assert.deepEqual(tracked.body.media.serves, { revision_id: saved.revision.revision_id, version: 1, provenance: 'exact' });
  assert.deepEqual([tracked.body.media.output.state, tracked.body.media.output.size_matches, tracked.body.media.output.integrity_verified],
    ['available', true, false]);
  assert.equal(tracked.body.legacy, null, 'a tracked revision must not carry legacy recovery inputs');
  assert.equal(tracked.body.draft.version, draft.draft.version);
  assert.equal(tracked.body.draft.note, 'draft for the editor');
  assert.equal(tracked.body.transcript.provenance, 'saved-content-words');
  assert.deepEqual(tracked.body.transcript.words.map(w => w.word), document.render_timeline.words.content.map(w => w.word));
  assert.deepEqual(tracked.body.transcript.widening_input, { available: true, reason: 'AVAILABLE', word_count: words.length });
  step('tracked context', {
    revision: tracked.body.revision.revision_id, card_offset: tracked.body.timing.final_composition.card_offset,
    content_offset: tracked.body.timing.final_composition.content_offset,
    served_duration: tracked.body.timing.final_composition.output_duration,
  });

  console.log('No save or adoption is advertised, and no path is served...');
  const byId = Object.fromEntries(tracked.body.capabilities.map(c => [c.id, c]));
  assert.deepEqual([byId.save_revision.available, byId.save_revision.reason], [false, 'WRITE_ROUTE_NOT_AVAILABLE']);
  assert.deepEqual([byId.adopt_for_revision_tracking.available, byId.adopt_for_revision_tracking.reason], [false, 'WRITE_ROUTE_NOT_AVAILABLE']);
  for (const body of [tracked.body, (await context(clipA.id)).body]) {
    const text = JSON.stringify(body);
    for (const root of [fixture, home, exportsDir]) assert(!text.includes(root) && !text.includes(root.replace(/\\/g, '/')), `leaked ${root}`);
    assert(!/[A-Za-z]:[\\/]{1,2}[A-Za-z0-9]/.test(text), 'leaked a drive-rooted path');
  }
  step('no write advertised, no paths served', { capabilities: tracked.body.capabilities.map(c => `${c.id}=${c.available}`) });

  console.log('Legacy clip: requested labels, bounded words, conflicts...');
  const legacyBody = (await context(clipA.id)).body;
  assert.equal(legacyBody.identity.tracked, false);
  assert.equal(legacyBody.revision, null);
  assert.deepEqual([legacyBody.timing.provenance, legacyBody.timing.effective_cuts_known, legacyBody.timing.effective_segments],
    ['legacy-entry', false, null]);
  assert.deepEqual(legacyBody.timing.requested_range, { start_second: 1, end_second: 5, label: 'requested' });
  assert.equal(legacyBody.timing.requested_keep_segments.label, 'requested');
  assert.deepEqual(legacyBody.timing.requested_keep_segments.sources, ['history-entry', 'legacy-recipe']);
  assert.deepEqual([legacyBody.transcript.provenance, legacyBody.transcript.domain, legacyBody.transcript.word_count],
    ['legacy-words-sidecar', 'source-absolute', boundedWords.length]);
  assert.deepEqual(legacyBody.transcript.widening_input, { available: false, reason: 'TRANSCRIPT_BOUNDED_ONLY', word_count: null });
  const conflicts = legacyBody.legacy.conflicts.map(c => c.field).sort();
  assert.deepEqual(conflicts, ['caption_style', 'format', 'requested_keep_segments', 'start_second']);
  assert.deepEqual([legacyBody.legacy.thumbnail.selected, legacyBody.legacy.thumbnail.baked_provenance, legacyBody.legacy.thumbnail.card_seconds],
    [true, 'unknown', 1.5]);
  assert.equal(legacyBody.legacy.recovery.effective_cuts_known, false);
  assert(legacyBody.diagnostics.some(d => d.code === 'LEGACY_TIMING_UNPROVEN'));
  assert(legacyBody.diagnostics.some(d => d.code === 'LEGACY_WORDS_BOUNDED'));
  assert.equal(legacyBody.clip.publishing.description, 'Legacy description');
  step('legacy context', { conflicts, sidecars: legacyBody.legacy.sidecars, needs: legacyBody.legacy.recovery.needs.length });

  console.log('Absent, empty, malformed and unreadable recovery inputs stay distinct...');
  const wordsPath = join(home, 'history', 'words', `${clipA.id}.json`);
  const originalWords = readFileSync(wordsPath);
  const observed = {};
  for (const [label, write] of [
    ['empty', () => writeFileSync(wordsPath, '[]')],
    ['malformed', () => writeFileSync(wordsPath, '{not json')],
    ['invalid encoding', () => writeFileSync(wordsPath, Buffer.from([0x5b, 0xff, 0xfe, 0x5d]))],
    ['absent', () => rmSync(wordsPath)],
  ]) {
    write();
    const body = (await context(clipA.id)).body;
    observed[label] = { sidecar: body.legacy.sidecars.words.state, transcript: body.transcript.availability };
    assert.equal(body.clip.transcript_slice, 'green blue yellow', `${label}: the clip's own text must survive`);
  }
  assert.deepEqual(observed, {
    empty: { sidecar: 'empty', transcript: 'empty' },
    malformed: { sidecar: 'malformed', transcript: 'malformed' },
    'invalid encoding': { sidecar: 'malformed', transcript: 'malformed' },
    absent: { sidecar: 'absent', transcript: 'unavailable' },
  });
  writeFileSync(wordsPath, originalWords);
  step('recovery inputs distinguished', observed);

  console.log('Corrupt tracked state fails safely and never degrades to legacy data...');
  writeFileSync(documentPath, '{not json');
  const corrupt = await context(clipB.id);
  assert.deepEqual([corrupt.status, corrupt.body.code], [500, 'REVISION_DOCUMENT_INVALID'], JSON.stringify(corrupt.body));
  assert.deepEqual(Object.keys(corrupt.body).sort(), ['code', 'error']);
  assert(!/legacy|words|sidecar/i.test(JSON.stringify(corrupt.body)), 'the failure mentions legacy data');
  rmSync(documentPath);
  const missing = await context(clipB.id);
  assert.deepEqual([missing.status, missing.body.code], [500, 'REVISION_DOCUMENT_UNAVAILABLE']);
  writeFileSync(documentPath, documentBytes);
  assert.equal(sha256(documentPath), createHash('sha256').update(documentBytes).digest('hex'));
  // A junction in the clip's own sidecar directory is refused, not followed.
  const sidecarRoot = dirname(documentPath);
  const moved = join(fixture, 'moved-sidecars');
  renameSync(sidecarRoot, moved);
  run(process.env.ComSpec || 'cmd.exe', ['/c', 'mklink', '/J', sidecarRoot, moved]);
  const junction = await context(clipB.id);
  run(process.env.ComSpec || 'cmd.exe', ['/c', 'rmdir', sidecarRoot]);
  renameSync(moved, sidecarRoot);
  assert.deepEqual([junction.status, junction.body.code], [500, 'OWNERSHIP_ESCAPE'], JSON.stringify(junction.body));
  step('corrupt state refused', { invalid: corrupt.body.code, missing: missing.body.code, junction: junction.body.code });

  console.log('Corrupt history, absent ids and traversal attempts...');
  const historyBytes = readFileSync(historyPath);
  writeFileSync(historyPath, '{not json');
  const corruptHistory = await context(clipB.id);
  assert.deepEqual([corruptHistory.status, corruptHistory.body.code], [500, 'HISTORY_INVALID_JSON']);
  writeFileSync(historyPath, Buffer.from([0x5b, 0xff, 0xfe, 0x5d]));
  const badEncoding = await context(clipB.id);
  assert.deepEqual([badEncoding.status, badEncoding.body.code], [500, 'HISTORY_INVALID_ENCODING']);
  writeFileSync(historyPath, historyBytes);
  const absent = await context('does-not-exist');
  assert.deepEqual([absent.status, absent.body.code], [404, 'CLIP_NOT_FOUND']);
  const traversal = await context('..%2F..%2Fsecrets');
  assert.deepEqual([traversal.status, traversal.body.code], [400, 'INVALID_CLIP_ID']);
  // A prefix of a real id is not a clip: full stored ids only.
  const prefix = await context(clipB.id.slice(0, 8));
  assert.deepEqual([prefix.status, prefix.body.code], [404, 'CLIP_NOT_FOUND']);
  step('stable errors', { history: corruptHistory.body.code, encoding: badEncoding.body.code, absent: absent.body.code, traversal: traversal.body.code, prefix: prefix.body.code });

  console.log('Local host and origin policy still applies to the new route...');
  const wrongHost = await raw(`/api/clips/${clipB.id}/editor-context`, { Host: 'studio.example.com' });
  assert.equal(wrongHost.status, 403, wrongHost.text);
  const crossOrigin = await context(clipB.id, { headers: { Origin: 'http://evil.example' } });
  assert.equal(crossOrigin.status, 403);
  const sameOrigin = await context(clipB.id, { headers: { Origin: base } });
  assert.equal(sameOrigin.status, 200);
  step('host and origin policy', { wrong_host: wrongHost.status, cross_origin: crossOrigin.status, same_origin: sameOrigin.status });

  console.log('Existing routes and stored bytes are untouched...');
  const preview = await fetch(`${base}/api/clips/${clipB.id}/preview`, { headers: { Range: 'bytes=0-1023' } });
  assert.equal(preview.status, 206);
  const download = await fetch(`${base}/api/clips/${clipB.id}/download`);
  assert.equal(download.status, 200);
  const downloaded = createHash('sha256').update(Buffer.from(await download.arrayBuffer())).digest('hex');
  assert.equal(downloaded, sha256(entryOf(clipB.id).output_path), 'download no longer serves the current revision');
  assert.equal(downloaded, before[entryOf(clipB.id).output_path], 'the served bytes changed');
  const listed = (await get('/api/history')).body;
  assert.equal(listed.length, 3);
  assert.deepEqual(listed.find(e => e.id === clipA.id).unknown_field, { kept: true });
  assert(!('revisions' in listed.find(e => e.id === clipA.id)), 'the untracked clip was adopted');
  assertUnchanged('after the first server');
  step('no adoption, no writes', { clips: listed.length, download_sha256: downloaded });


  // --- 1B.2b.2 repair-1: the three reader occurrences, over real HTTP -------
  console.log('Ownership is checked from the configured history root down...');
  {
    // A junction at the `revisions` ancestor, above the clip's own directory:
    // the document is still perfectly reachable through it, which is exactly
    // what must not make it owned.
    const revisionsDir = join(home, 'history', 'revisions');
    const moved = join(fixture, 'moved-revisions-ancestor');
    const targetBefore = hashTree(revisionsDir);
    renameSync(revisionsDir, moved);
    run(process.env.ComSpec || 'cmd.exe', ['/c', 'mklink', '/J', revisionsDir, moved]);
    assert(existsSync(documentPath), 'the document is not reachable through the junction');
    const ancestor = await context(clipB.id);
    run(process.env.ComSpec || 'cmd.exe', ['/c', 'rmdir', revisionsDir]);
    renameSync(moved, revisionsDir);
    assert.deepEqual([ancestor.status, ancestor.body.code], [500, 'OWNERSHIP_ESCAPE'], JSON.stringify(ancestor.body));
    // The junction target was never written through, and the clip reads again
    // once the junction is gone: no target was adopted as a new trusted root.
    assert.deepEqual(hashTree(revisionsDir), targetBefore, 'the junction target changed');
    assert.equal((await context(clipB.id)).status, 200, 'the clip did not read again after the junction was removed');
    step('ancestor junction refused', { code: ancestor.body.code, boundary: 'history/revisions' });
  }

  console.log('Malformed tracked state and documents fail with stable codes...');
  {
    const historyBefore = readFileSync(historyPath);
    const restoreHistory = () => writeFileSync(historyPath, historyBefore);
    const restoreDocument = () => writeFileSync(documentPath, documentBytes);
    const observedState = {};
    for (const [label, mutate] of [
      // An exact pointer with no document used to fall through to the legacy
      // sidecars sitting beside this clip.
      ['exact pointer with no document', list => { list.find(e => e.id === clipB.id).revisions.current.path = null; }],
      ['pointer disagreeing with its counter', list => { list.find(e => e.id === clipB.id).revisions.revision_version = 9; }],
      ['legacy provenance on a rendered revision', list => { list.find(e => e.id === clipB.id).revisions.current.provenance = 'legacy-unversioned'; }],
    ]) {
      const list = JSON.parse(readFileSync(historyPath, 'utf8'));
      mutate(list);
      writeFileSync(historyPath, JSON.stringify(list, null, 2));
      const response = await context(clipB.id);
      restoreHistory();
      observedState[label] = { status: response.status, code: response.body.code };
      assert.deepEqual([response.status, response.body.code], [500, 'REVISION_STATE_INVALID'], `${label}: ${JSON.stringify(response.body)}`);
      assert(!/legacy|sidecar|words/i.test(JSON.stringify(response.body)), `${label}: the failure mentions legacy data`);
    }

    const observedDocument = {};
    for (const [label, mutate] of [
      ['malformed segment', d => { d.render_timeline.segments = [{ index: 0, source_start: { private: 'object' }, source_end: -5 }]; }],
      ['broken segment chain', d => { d.render_timeline.segments[1].content_start += 5; }],
      ['unusable retained source word', d => { d.source_words = [null]; }],
      ['arbitrary time-domain object', d => { d.render_timeline.time_domains.extra = { unrelated: 'stored object' }; }],
      ['arbitrary final-composition domain object', d => { d.final_composition.time_domains.extra = { unrelated: 'stored object' }; }],
      ['applied card with no image', d => { delete d.thumbnail_card.image; }],
      ['card offset disagreeing with the card', d => { d.final_composition.card_offset += 1; }],
      ['malformed probe', d => { d.probe.duration = 'about three'; }],
    ]) {
      const doc = JSON.parse(documentBytes.toString('utf8'));
      mutate(doc);
      writeFileSync(documentPath, JSON.stringify(doc));
      const response = await context(clipB.id);
      restoreDocument();
      observedDocument[label] = { status: response.status, code: response.body.code };
      assert.deepEqual([response.status, response.body.code], [500, 'REVISION_DOCUMENT_INVALID'], `${label}: ${JSON.stringify(response.body)}`);
      // A domain refusal, not the adapter's catch-all and not a raw exception.
      assert.notEqual(response.body.code, 'EDITOR_CONTEXT_FAILED', label);
      assert.deepEqual(Object.keys(response.body).sort(), ['code', 'error'], label);
      assert(!/TypeError|\bat \w+ \(/.test(JSON.stringify(response.body)), `${label}: a raw exception leaked`);
    }
    assert.equal(sha256(documentPath), createHash('sha256').update(documentBytes).digest('hex'), 'the document was not restored');
    assert.equal(sha256(historyPath), createHash('sha256').update(historyBefore).digest('hex'), 'the history was not restored');
    // The well-formed clip still answers coherently after all of that.
    const healthy = await context(clipB.id);
    assert.deepEqual([healthy.status, healthy.body.timing.effective_cuts_known], [200, true]);
    step('malformed tracked state refused', { state: observedState, document: observedDocument });
  }

  console.log('Invalid legacy word lists are malformed, not usable...');
  {
    const wordsFile = join(home, 'history', 'words', `${clipA.id}.json`);
    const wordsBefore = readFileSync(wordsFile);
    const observedWords = {};
    for (const [label, json] of [
      ['invalid element', JSON.stringify([null, { word: 'bad', start: 9, end: 1 }])],
      ['mixed valid and invalid', JSON.stringify([boundedWords[0], { word: 'bad', start: 3 }])],
      ['backwards timing', JSON.stringify([{ word: 'bad', start: 9, end: 1 }])],
    ]) {
      writeFileSync(wordsFile, json);
      const body = (await context(clipA.id)).body;
      observedWords[label] = { sidecar: body.legacy.sidecars.words.state, transcript: body.transcript.availability, words: body.transcript.words };
      assert.deepEqual([body.legacy.sidecars.words.state, body.transcript.availability], ['malformed', 'malformed'], `${label}: ${JSON.stringify(body.transcript)}`);
      assert.equal(body.transcript.words, null, `${label}: malformed words were still served`);
      assert.equal(body.transcript.word_count, null, label);
      assert.equal(body.transcript.widening_input.available, false, label);
      // Text, publishing metadata and the clip's own media stay usable.
      assert.equal(body.clip.transcript_slice, 'green blue yellow', label);
      assert.equal(body.clip.publishing.description, 'Legacy description', label);
      assert.equal(body.media.output.state, 'available', label);
      assert(body.capabilities.find(c => c.id === 'edit_writing_metadata').available, label);
      assert(body.diagnostics.some(d => d.code === 'SIDECAR_MALFORMED'), label);
      // Never repaired, rewritten or removed.
      assert.equal(readFileSync(wordsFile, 'utf8'), json, `${label}: the sidecar was modified`);
    }
    // A valid explicit [] stays supplied-empty, and a valid list stays usable.
    writeFileSync(wordsFile, '[]');
    const empty = (await context(clipA.id)).body;
    assert.deepEqual([empty.legacy.sidecars.words.state, empty.transcript.availability], ['empty', 'empty']);
    writeFileSync(wordsFile, wordsBefore);
    const valid = (await context(clipA.id)).body;
    assert.deepEqual([valid.legacy.sidecars.words.state, valid.transcript.availability], ['present', 'available']);
    assert.equal(valid.transcript.word_count, boundedWords.length);
    assert.equal(sha256(wordsFile), createHash('sha256').update(wordsBefore).digest('hex'), 'the words sidecar was not restored');
    step('legacy words classified', { ...observedWords, supplied_empty: 'empty', valid: valid.transcript.availability });
  }

  // --- 1B.2b.2 repair-2: the boundary before the read, and coherent claims --
  console.log('The configured history root is proved before clips.json is opened...');
  {
    const historyDir = join(home, 'history');
    const moved = join(fixture, 'moved-history-root');
    // The decoy lives outside the fixture, so the fixture's own byte set is
    // unchanged whatever this step does.
    const outside = mkdtempSync(join(installationRoot, 'tmp/editor-context-outside-'));
    writeFileSync(join(outside, 'clips.json'), JSON.stringify([
      { id: clipB.id, title: 'outside configured owned root', transcript_slice: 'outside text' },
    ]));
    const historyBefore = hashTree(historyDir);
    renameSync(historyDir, moved);
    run(process.env.ComSpec || 'cmd.exe', ['/c', 'mklink', '/J', historyDir, outside]);
    const linkedRoot = await context(clipB.id);
    run(process.env.ComSpec || 'cmd.exe', ['/c', 'rmdir', historyDir]);
    renameSync(moved, historyDir);
    rmSync(outside, { recursive: true, force: true });
    assert.deepEqual([linkedRoot.status, linkedRoot.body.code], [500, 'OWNERSHIP_ESCAPE'], JSON.stringify(linkedRoot.body));
    assert.deepEqual(Object.keys(linkedRoot.body).sort(), ['code', 'error']);
    // The finding was not the missing code: it was that the clip list behind
    // the junction had already been read and serialised.
    const text = JSON.stringify(linkedRoot.body);
    assert(!text.includes('outside configured owned root'), 'the linked root leaked a title');
    assert(!text.includes('outside text'), 'the linked root leaked a transcript');
    assert.deepEqual(hashTree(historyDir), historyBefore, 'the real history changed');
    assert.equal((await context(clipB.id)).status, 200, 'the clip did not read again after the junction was removed');
    step('history root junction refused before read', { code: linkedRoot.body.code, leaked: false });
  }

  console.log('A linked legacy sidecar directory is an ownership escape, not an unreadable sidecar...');
  {
    const wordsDir = join(home, 'history', 'words');
    const moved = join(fixture, 'moved-words-sidecar');
    const targetBefore = hashTree(wordsDir);
    renameSync(wordsDir, moved);
    run(process.env.ComSpec || 'cmd.exe', ['/c', 'mklink', '/J', wordsDir, moved]);
    const linked = await context(clipA.id);
    run(process.env.ComSpec || 'cmd.exe', ['/c', 'rmdir', wordsDir]);
    renameSync(moved, wordsDir);
    assert.deepEqual([linked.status, linked.body.code], [500, 'OWNERSHIP_ESCAPE'], JSON.stringify(linked.body));
    assert.deepEqual(hashTree(wordsDir), targetBefore, 'the junction target changed');
    const healthy = await context(clipA.id);
    assert.deepEqual([healthy.status, healthy.body.legacy.sidecars.words.state], [200, 'present']);
    step('legacy sidecar junction refused', { code: linked.body.code, sidecar_after: healthy.body.legacy.sidecars.words.state });
  }

  console.log('Consumed ranges, playback identity and pointer counters...');
  {
    const historyBefore = readFileSync(historyPath);
    const restoreHistory = () => writeFileSync(historyPath, historyBefore);
    const restoreDocument = () => writeFileSync(documentPath, documentBytes);

    const observedState = {};
    for (const [label, mutate] of [
      // Both used to succeed: the first answered from the legacy sidecars
      // beside this clip, the second reported a draft version with no draft.
      ['positive revision counter with no current pointer', list => { list.find(e => e.id === clipB.id).revisions.current = null; }],
      ['positive draft counter with no draft pointer', list => { list.find(e => e.id === clipB.id).revisions.draft = null; }],
    ]) {
      const list = JSON.parse(readFileSync(historyPath, 'utf8'));
      mutate(list);
      writeFileSync(historyPath, JSON.stringify(list, null, 2));
      const response = await context(clipB.id);
      restoreHistory();
      observedState[label] = { status: response.status, code: response.body.code };
      assert.deepEqual([response.status, response.body.code], [500, 'REVISION_STATE_INVALID'], `${label}: ${JSON.stringify(response.body)}`);
      assert(!/legacy|sidecar|words/i.test(JSON.stringify(response.body)), `${label}: the failure mentions legacy data`);
    }

    const observedDocument = {};
    for (const [label, mutate] of [
      ['negative raw output duration', d => { d.render_timeline.output_duration = -12; }],
      ['negative measured content', d => { d.render_timeline.content_duration_measured = -4; }],
      ['measured content outside the renderer tolerance', d => { d.render_timeline.content_duration_measured = d.render_timeline.content_duration + 9; }],
      ['negative final output duration', d => { d.final_composition.output.duration = -99; }],
      ['negative recorded probe duration', d => { d.probe.duration = -99; }],
      ['reversed bookend with negative lengths', d => { d.bookends.outro = { kind: 'outro', output_start: 8, output_end: -3, asset_duration: -1, requested_fade: null, applied_overlap: -5, branch: 'xfade_acrossfade', transition: { output_start: 8, output_end: 9 }, measured_output_duration: null }; }],
      ['unsupported composition branch', d => { d.bookends.outro = { kind: 'outro', output_start: 1, output_end: 2, asset_duration: 1, requested_fade: null, applied_overlap: 0, branch: 'crossfade', transition: { output_start: 1, output_end: 1 }, measured_output_duration: null }; }],
      ['crop keyframe outside the frame', d => { d.recipe.crop_keyframes = [{ t: -50, x_pct: 9999 }]; }],
      ['crop keyframe after the content', d => { d.recipe.crop_keyframes = [{ t: d.render_timeline.content_duration + 5, x_pct: 50 }]; }],
      ['unavailable transcript carrying editorial words', d => { d.source_words = null; d.words_input = 'unavailable'; d.render_timeline.words.input = 'unavailable'; }],
      ['editorial word ending after the content', d => { d.render_timeline.words.content[0].end = d.render_timeline.content_duration + 5; }],
      ['probe and composition disagreeing about the served length', d => { d.probe.duration = d.final_composition.output.duration + 1; }],
      ['probe and file record disagreeing about the size', d => { d.probe.bytes += 1; }],
      ['card image outliving its card offset', d => { d.final_composition.artifacts.card_image.until += 2; }],
      ['card image that is not the composed card', d => { d.final_composition.artifacts.card_image.sha256 = 'a'.repeat(64); }],
      ['composition file record that is not the served file', d => { d.final_composition.output.file.bytes += 1; }],
      ['document serving a file the pointer does not', d => { d.files.main.path = join(exportsDir, 'somewhere-else.mp4'); }],
    ]) {
      const doc = JSON.parse(documentBytes.toString('utf8'));
      mutate(doc);
      writeFileSync(documentPath, JSON.stringify(doc));
      const response = await context(clipB.id);
      restoreDocument();
      observedDocument[label] = { status: response.status, code: response.body.code };
      assert.deepEqual([response.status, response.body.code], [500, 'REVISION_DOCUMENT_INVALID'], `${label}: ${JSON.stringify(response.body)}`);
      assert.notEqual(response.body.code, 'EDITOR_CONTEXT_FAILED', label);
      assert.deepEqual(Object.keys(response.body).sort(), ['code', 'error'], label);
      assert(!/TypeError|\bat \w+ \(/.test(JSON.stringify(response.body)), `${label}: a raw exception leaked`);
    }
    assert.equal(sha256(documentPath), createHash('sha256').update(documentBytes).digest('hex'), 'the document was not restored');
    assert.equal(sha256(historyPath), createHash('sha256').update(historyBefore).digest('hex'), 'the history was not restored');
    const healthy = await context(clipB.id);
    assert.deepEqual([healthy.status, healthy.body.timing.effective_cuts_known], [200, true]);
    step('ranges, identity and counters refused', { state: observedState, document: observedDocument });
  }

  console.log('Entry-summary drift keeps context but disowns the urls...');
  {
    const historyBefore = readFileSync(historyPath);
    // A file that already exists in the fixture: the summary now names another
    // real clip's output, as a legacy writer moving it would leave it. Nothing
    // is created, so the fixture's byte set is unchanged.
    const otherFile = entryOf(clipA.id).output_path;
    const list = JSON.parse(readFileSync(historyPath, 'utf8'));
    list.find(e => e.id === clipB.id).output_path = otherFile;
    writeFileSync(historyPath, JSON.stringify(list, null, 2));
    const drifted = await context(clipB.id);
    writeFileSync(historyPath, historyBefore);
    assert.equal(drifted.status, 200, JSON.stringify(drifted.body));
    const byId = Object.fromEntries(drifted.body.capabilities.map(c => [c.id, c]));
    // Usable context is retained...
    assert.equal(drifted.body.revision.version, 1);
    assert.equal(drifted.body.timing.effective_cuts_known, true);
    assert.equal(drifted.body.clip.title, 'Tracked editor clip');
    assert.equal(byId.edit_writing_metadata.available, true);
    // ...but nothing claims a url serves the revision described.
    assert.equal(drifted.body.media.serves, null, 'serves still names a revision the urls do not reach');
    for (const id of ['play_committed_media', 'download_committed_media']) {
      assert.deepEqual([byId[id].available, byId[id].reason], [false, 'COMMITTED_MEDIA_SUMMARY_DRIFT'], id);
    }
    assert(drifted.body.diagnostics.some(d => d.code === 'COMMITTED_MEDIA_SUMMARY_DRIFT'), 'no drift diagnostic');
    assert(!JSON.stringify(drifted.body).includes(fixture), 'a path leaked');
    // With the summary restored, the same clip serves normally again.
    const restored = await context(clipB.id);
    assert.equal(restored.body.media.serves.version, 1);
    assert.equal(restored.body.capabilities.find(c => c.id === 'play_committed_media').available, true);
    assert.equal(sha256(historyPath), createHash('sha256').update(historyBefore).digest('hex'), 'the history was not restored');
    step('entry summary drift', { serves: null, reason: 'COMMITTED_MEDIA_SUMMARY_DRIFT', restored: restored.body.media.serves.version });
  }


  console.log('Aggregate claims: records that are each valid but contradict each other...');
  {
    const restoreDocument = () => writeFileSync(documentPath, documentBytes);
    const observedAggregate = {};
    // Every mutation below leaves well-typed values behind, and the ones the
    // repair-2 review found compensate their companion fields so no scalar
    // bound catches them.
    for (const [label, mutate] of [
      ['served file ending where its content starts', d => {
        const stop = d.final_composition.content_offset;
        d.final_composition.output.duration = stop;
        d.final_composition.output.probe.duration = stop;
        d.final_composition.card.producer.output.duration = stop;
        d.probe.duration = stop;
      }],
      ['hard cut claiming an overlap that cancels in the arithmetic', d => {
        d.bookends.outro = {
          kind: 'outro', output_start: 900, output_end: 901, asset_duration: 500, applied_overlap: 500,
          branch: 'hardcut', requested_fade: 0, measured_output_duration: 901,
          join_inputs: { main_duration: 1, appended_duration: 500 },
        };
      }],
      ['artifact placement in a domain its producer does not write', d => {
        d.final_composition.artifacts.caption_overlay = {
          path: d.files.main.path, time_domain: 'source-absolute seconds',
          contains_card: true, placed_at: d.final_composition.content_offset,
        };
      }],
      ['card provenance contradicting the composition that applied one', d => {
        d.thumbnail_card = { requested: false, applied: false, note: 'not applied' };
      }],
      ['card image identity differing between provenance and composition', d => {
        d.thumbnail_card.image = { path: d.files.main.path, bytes: 4242, sha256: 'a'.repeat(64) };
      }],
      ['card frames and tick length compensated to keep every scalar consistent', d => {
        const c = d.final_composition.card;
        c.frames /= 2;
        c.producer.card.frames = c.frames;
        c.producer.card.frame_ticks *= 2;
        c.frame_duration *= 2;
        c.producer.card.frame_duration = c.frame_duration;
        d.final_composition.tolerance.card_seconds = c.frame_duration / 2;
        c.producer.tolerance.card_seconds = c.frame_duration / 2;
      }],
      ['composed file holding no card frames', d => {
        const p = d.final_composition.card.producer;
        p.output.video.packets = p.raw.video.packets;
        d.final_composition.output.video.packets = p.raw.video.packets;
      }],
      ['composed audio that did not move by the card', d => {
        d.final_composition.card.producer.output.audio.duration += 5;
      }],
      ['a placement with no artifact file behind it', d => {
        d.final_composition.artifacts.cropped_source = {
          path: join(exportsDir, 'cropped.mp4'),
          time_domain: 'content-relative seconds of the edited content; it holds no card',
          contains_card: false, placed_at: d.final_composition.content_offset,
        };
      }],
      ['a raw render placement that claims to hold the card', d => {
        d.final_composition.artifacts.raw_render.contains_card = true;
      }],
      ['a relabelled raw time-domain map', d => {
        d.render_timeline.time_domains['bookends.*.output_*, content_to_output_offset, output_duration'] = 'content-relative seconds';
      }],
      ['a relabelled final time-domain map', d => {
        for (const key of Object.keys(d.final_composition.time_domains)) d.final_composition.time_domains[key] = 'source-absolute seconds in the original file';
      }],
      ['receipt cuts that are not the recipe intervals', d => {
        for (const s of d.render_timeline.segments) { s.source_start += 10; s.source_end += 10; }
      }],
      ['a producer receipt describing another raw file', d => {
        d.final_composition.card.producer.raw.sha256 = 'b'.repeat(64);
      }],
    ]) {
      const doc = JSON.parse(documentBytes.toString('utf8'));
      mutate(doc);
      writeFileSync(documentPath, JSON.stringify(doc));
      const response = await context(clipB.id);
      restoreDocument();
      observedAggregate[label] = { status: response.status, code: response.body.code };
      assert.deepEqual([response.status, response.body.code], [500, 'REVISION_DOCUMENT_INVALID'], `${label}: ${JSON.stringify(response.body)}`);
      assert.notEqual(response.body.code, 'EDITOR_CONTEXT_FAILED', label);
      assert.deepEqual(Object.keys(response.body).sort(), ['code', 'error'], label);
      assert(!/TypeError|\bat \w+ \(/.test(JSON.stringify(response.body)), `${label}: a raw exception leaked`);
    }
    assert.equal(sha256(documentPath), createHash('sha256').update(documentBytes).digest('hex'), 'the document was not restored');
    const healthy = await context(clipB.id);
    assert.deepEqual([healthy.status, healthy.body.timing.effective_cuts_known], [200, true]);
    step('aggregate contradictions refused', observedAggregate);
  }

  console.log('Absent, unusable, different and unstreamable entry summaries...');
  {
    const historyBefore = readFileSync(historyPath);
    const documentBefore = readFileSync(documentPath);
    const restore = () => { writeFileSync(historyPath, historyBefore); writeFileSync(documentPath, documentBefore); };
    const otherFile = entryOf(clipA.id).output_path;
    const observedSummary = {};
    // `previewIs` is what serveClipById itself answers for the same summary:
    // 404 without a usable one, 400 for a container it will not stream, and a
    // normal stream of whatever other file the summary names.
    for (const [label, mutate, state, reason, previewIs] of [
      ['absent', e => { delete e.output_path; }, 'absent', 'COMMITTED_MEDIA_SUMMARY_DRIFT', [404]],
      ['null', e => { e.output_path = null; }, 'absent', 'COMMITTED_MEDIA_SUMMARY_DRIFT', [404]],
      ['empty', e => { e.output_path = ''; }, 'invalid', 'COMMITTED_MEDIA_SUMMARY_DRIFT', [404]],
      ['not a path', e => { e.output_path = { path: otherFile }; }, 'invalid', 'COMMITTED_MEDIA_SUMMARY_DRIFT', [404, 500]],
      ['another file', e => { e.output_path = otherFile; }, 'different', 'COMMITTED_MEDIA_SUMMARY_DRIFT', [200, 206]],
      ['a container the routes refuse', e => { e.output_path = unstreamable; e.revisions.current.output_path = unstreamable; }, 'equal', 'MEDIA_KIND_UNSUPPORTED', [400]],
    ]) {
      const list = JSON.parse(readFileSync(historyPath, 'utf8'));
      const target = list.find(e => e.id === clipB.id);
      mutate(target);
      writeFileSync(historyPath, JSON.stringify(list, null, 2));
      if (state === 'equal') {
        // A coherent rename: every record that names the served file moves with it.
        const doc = JSON.parse(documentBefore.toString('utf8'));
        doc.files.main.path = unstreamable;
        doc.final_composition.output.file.path = unstreamable;
        doc.final_composition.artifacts.main.path = unstreamable;
        doc.final_composition.card.producer.output.path = unstreamable;
        writeFileSync(documentPath, JSON.stringify(doc));
      }
      const response = await context(clipB.id);
      // What the by-id routes themselves do with the same summary.
      const preview = await get(`/api/clips/${clipB.id}/preview`);
      restore();
      assert.equal(response.status, 200, `${label}: ${JSON.stringify(response.body)}`);
      const byId = Object.fromEntries(response.body.capabilities.map(c => [c.id, c]));
      assert.equal(response.body.media.summary.state, state, `${label}: ${JSON.stringify(response.body.media.summary)}`);
      assert.equal(response.body.media.serves, null, `${label}: serves still names a revision no url reaches`);
      for (const id of ['play_committed_media', 'download_committed_media']) {
        assert.deepEqual([byId[id].available, byId[id].reason], [false, reason], `${label}: ${id}`);
      }
      // Context the operator needs is still there.
      assert.equal(response.body.revision.version, 1, label);
      assert.equal(response.body.clip.title, 'Tracked editor clip', label);
      assert.equal(byId.edit_writing_metadata.available, true, label);
      assert(!JSON.stringify(response.body).includes(fixture), `${label}: a path leaked`);
      // The route really does refuse: 404 without a usable summary, 400 for a
      // container it does not stream, 200 for the other clip's own file.
      assert(previewIs.includes(preview.status), `${label}: the preview url answered ${preview.status}, expected one of ${previewIs}`);
      observedSummary[label] = { summary: state, reason, preview: preview.status };
    }
    assert.equal(sha256(historyPath), createHash('sha256').update(historyBefore).digest('hex'), 'the history was not restored');
    assert.equal(sha256(documentPath), createHash('sha256').update(documentBefore).digest('hex'), 'the document was not restored');
    const restored = await context(clipB.id);
    assert.equal(restored.body.media.summary.state, 'equal');
    assert.equal(restored.body.media.serves.version, 1);
    assert.equal(restored.body.capabilities.find(c => c.id === 'play_committed_media').available, true);
    step('entry summary matrix', observedSummary);
  }

  assertUnchanged('after the repaired cases');

  console.log('Restarting the studio...');
  const trackedBefore = (await context(clipB.id)).body;
  const legacyBefore = (await context(clipA.id)).body;
  await stopServer();
  const port2 = await startServer();
  assert.notEqual(port2, port1);
  const trackedAfter = (await context(clipB.id)).body;
  const legacyAfter = (await context(clipA.id)).body;
  const withoutCapture = body => ({ ...body, identity: { ...body.identity, captured_at: null } });
  assert.deepEqual(withoutCapture(trackedAfter), withoutCapture(trackedBefore), 'the tracked context changed across a restart');
  assert.deepEqual(withoutCapture(legacyAfter), withoutCapture(legacyBefore), 'the legacy context changed across a restart');
  assert.notEqual(trackedAfter.identity.captured_at, trackedBefore.identity.captured_at);
  assertUnchanged('after the restart');
  step('restart', { first_port: port1, second_port: port2, identical: true });

  assert.equal(sha256(source), sourceHash, 'source bytes changed');
} finally {
  await stopServer();
}

writeFileSync(join(fixture, 'result.json'), JSON.stringify(results, null, 2));
console.log(`Passed. Evidence: ${join(fixture, 'result.json')}`);
