import { afterEach, beforeEach, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { StorageCleanup } from './storage-cleanup.js';

let root: string, home: string, working: string, temporary: string, state: unknown, cleanup: StorageCleanup;
const put = (p: string, text = 'media') => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, text); return p; };
const old = (p: string) => { const time = new Date(Date.now() - 3 * 3600_000); utimesSync(p, time, time); };
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'cleanup-test-'));
  home = join(root, 'home'); working = join(root, 'data/working'); temporary = join(root, 'tmp');
  for (const p of [home, working, temporary]) mkdirSync(p, { recursive: true });
  state = {};
  cleanup = new StorageCleanup({ home, working, temporary, cache: join(root, 'data/cache'), output: join(root, 'exports'), currentState: () => state });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

it('protects saved reel/source references, current sources, Library clips and assets while finding unused renders', () => {
  const source = put(join(working, 'uploads/source.mp4'));
  const current = put(join(working, 'uploads/current.mp4'));
  const saved = join(home, 'reel_saved'); put(join(saved, 'clips/clip_01.mp4'));
  const library = join(home, 'reel_library'); put(join(library, 'kept.mp4'));
  const asset = join(home, 'reel_asset'); put(join(asset, 'intro.mp4'));
  const unused = join(home, 'reel_unused'); put(join(unused, 'highlights_reel.mp4'));
  const spare = put(join(working, 'uploads/spare.mp4'));
  put(join(home, 'reels/saved.json'), JSON.stringify({ out_dir: saved, sources: [source] }));
  put(join(home, 'history/clips.json'), JSON.stringify([{ output_path: join(library, 'kept.mp4') }]));
  put(join(home, 'assets/registry.json'), JSON.stringify({ intro: join(asset, 'intro.mp4') }));
  put(join(home, 'sources.json'), JSON.stringify([unused, spare]));
  state = { videoPath: current };
  const report = cleanup.scan();
  expect(report.items.filter(i => i.eligible).map(i => i.path).sort()).toEqual([unused, spare].sort());
  expect(report.items.filter(i => !i.eligible)).toHaveLength(5);
});

it('deletes only selected scan items and keeps runtime, models, exports and external originals', async () => {
  const source = put(join(root, 'original.mp4'));
  const output = put(join(root, 'exports/final.mp4'));
  const model = put(join(root, 'data/cache/whisper/model.bin'));
  const unused = join(home, 'reel_unused'); put(join(unused, 'clip.mp4'));
  const spare = put(join(working, 'uploads/spare.mp4'));
  const report = cleanup.scan();
  const selected = report.items.find(i => i.path === unused)!;
  const result = await cleanup.remove(report.scanId, [selected.id]);
  expect(result.deleted.map(i => i.path)).toEqual([unused]);
  expect(existsSync(unused)).toBe(false);
  for (const p of [source, output, model, spare]) expect(readFileSync(p, 'utf8')).toBe('media');
  await expect(cleanup.remove(report.scanId, [selected.id])).rejects.toThrow('expired');
});

it('skips changed files and newly referenced sources after a scan', async () => {
  const changed = put(join(working, 'uploads/changed.mp4'));
  const used = put(join(working, 'uploads/used.mp4'));
  const report = cleanup.scan();
  writeFileSync(changed, 'changed contents');
  put(join(home, 'reels/new.json'), JSON.stringify({ source: used }));
  const result = await cleanup.remove(report.scanId, report.items.map(i => i.id));
  expect(result.deleted).toHaveLength(0); expect(result.skipped).toHaveLength(2);
  expect(readFileSync(changed, 'utf8')).toBe('changed contents'); expect(existsSync(used)).toBe(true);
});

it('protects recent temporary files and saved sources inside older temporary directories', () => {
  const stale = put(join(temporary, 'stale.mp4')); old(stale);
  put(join(temporary, 'recent.mp4'));
  const used = join(temporary, 'used'); const source = put(join(used, 'source.mp4')); old(source); old(used);
  state = { videoPath: source };
  expect(cleanup.scan().items.filter(i => i.eligible).map(i => i.path)).toEqual([stale]);
});

it('rejects arbitrary paths, duplicate IDs, protected selections and expired scans', async () => {
  const source = put(join(working, 'uploads/source.mp4')); state = { videoPath: source };
  const report = cleanup.scan();
  for (const ids of [[source], ['../home'], [report.items[0].id], ['x', 'x'], []])
    await expect(cleanup.remove(report.scanId, ids)).rejects.toThrow();
  await expect(cleanup.remove('invented', ['x'])).rejects.toThrow('expired');
  expect(existsSync(source)).toBe(true);
});

it('fails closed when saved project metadata cannot be read', () => {
  put(join(home, 'reel_unused/clip.mp4'));
  put(join(home, 'reels/corrupt.json'), '{ broken');
  const report = cleanup.scan();
  expect(report.warnings).toHaveLength(1); expect(report.items.every(i => !i.eligible)).toBe(true);
});

it('does not traverse linked directories or follow a replaced deletion target', async () => {
  const outside = join(root, 'outside'); put(join(outside, 'original.mp4'));
  const linked = join(home, 'reel_linked'); symlinkSync(outside, linked, 'junction');
  const unused = join(home, 'reel_unused'); put(join(unused, 'old.mp4'));
  const report = cleanup.scan();
  expect(report.items.find(i => i.path === linked)?.eligible).toBe(false);
  const item = report.items.find(i => i.path === unused)!;
  rmSync(unused, { recursive: true }); symlinkSync(outside, unused, 'junction');
  const result = await cleanup.remove(report.scanId, [item.id]);
  expect(result.deleted).toHaveLength(0); expect(existsSync(join(outside, 'original.mp4'))).toBe(true);
});

it('never treats a general system TEMP directory as installation-owned storage', () => {
  const externalTemp = join(root, 'external-temp'); const file = put(join(externalTemp, 'old.mp4')); old(file);
  const safe = new StorageCleanup({ home, working, temporary: externalTemp, cache: join(root, 'cache'), output: join(root, 'exports'), currentState: () => ({}) });
  expect(safe.scan().items.some(i => i.path === file)).toBe(false);
});

it('protects saved sources reached through linked and relative paths', () => {
  const kept = join(home, 'reel_kept'); put(join(kept, 'source.mp4'));
  const alias = join(root, 'source-alias'); symlinkSync(kept, alias, 'junction');
  state = { videoPath: join(alias, 'source.mp4') };
  expect(cleanup.scan().items.find(i => i.path === kept)?.eligible).toBe(false);
  state = { videoPath: 'reel_kept/source.mp4' };
  expect(cleanup.scan().items.find(i => i.path === kept)?.eligible).toBe(false);
});
