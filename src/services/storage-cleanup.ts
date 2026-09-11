import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';

export type CleanupCategory = 'reels' | 'temporary' | 'uploads';
export interface CleanupItem {
  id: string; category: CleanupCategory; name: string; path: string;
  bytes: number; files: number; eligible: boolean; reason: string; modified: number;
}
export interface CleanupReport {
  scanId: string; scannedAt: number; items: CleanupItem[];
  storage: { label: string; bytes: number; complete: boolean }[];
  warnings: string[];
}
interface SnapshotItem extends CleanupItem { fingerprint: string }
interface Snapshot { created: number; items: SnapshotItem[] }
interface CleanupOptions {
  home: string; working: string; output: string; cache: string;
  temporary?: string; runtime?: string;
  currentState: () => unknown;
  now?: () => number;
}

const normalize = (p: string) => process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p);
const contains = (parent: string, child: string) => {
  const relative = path.relative(normalize(parent), normalize(child));
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
};
const overlap = (a: string, b: string) => contains(a, b) || contains(b, a);

function inspectTree(root: string) {
  let bytes = 0, files = 0, modified = 0, unsafe = false;
  const hash = createHash('sha256');
  const walk = (p: string) => {
    try {
      const stat = lstatSync(p, { bigint: true });
      if (stat.isSymbolicLink()) { unsafe = true; return; }
      // Avoid changing fingerprints when another hard link is removed. The
      // file's identity, size, and content-modification time remain relevant.
      hash.update(`${p}:${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeNs}\n`);
      modified = Math.max(modified, Number(stat.mtimeMs));
      if (stat.isDirectory()) for (const name of readdirSync(p).sort()) walk(path.join(p, name));
      else if (stat.isFile()) { bytes += Number(stat.size); files++; }
      else unsafe = true;
    } catch { unsafe = true; }
  };
  if (existsSync(root)) walk(root);
  return { bytes, files, modified, unsafe, fingerprint: hash.digest('hex') };
}

export class StorageCleanup {
  private snapshots = new Map<string, Snapshot>();
  private now: () => number;
  constructor(private options: CleanupOptions) { this.now = options.now || Date.now; }

  private references() {
    const refs = new Set<string>(), warnings: string[] = [];
    const collect = (value: unknown, key = '') => {
      if (typeof value === 'string' && value && (path.isAbsolute(value) ||
          /^(sources?|source_video|source_file|video_path|videoPath|file_path|filePath|output_path|out_dir|path|logo|logoPath|introPath|outroPath)$/.test(key))) {
        const resolved = path.resolve(this.options.home, value);
        refs.add(normalize(resolved));
        // A saved source can reach a render through a junction or symlink.
        try { refs.add(normalize(realpathSync(resolved))); } catch {}
      } else if (Array.isArray(value)) value.forEach(v => collect(v, key));
      else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => collect(v, k));
    };
    collect(this.options.currentState());
    const read = (p: string) => {
      try {
        const stat = lstatSync(p);
        if (stat.isSymbolicLink()) throw new Error('Linked metadata');
        if (stat.isDirectory()) for (const name of readdirSync(p)) read(path.join(p, name));
        else if (p.endsWith('.json')) collect(JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, '')));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') warnings.push(`Could not inspect saved work: ${p}`);
      }
    };
    for (const name of ['ui-state.json', 'reels', 'history', 'assets']) read(path.join(this.options.home, name));
    // sources.json is a picker history, not a saved project's dependency list.
    return { refs: [...refs], warnings };
  }

  scan(): CleanupReport {
    const now = this.now(), { refs, warnings } = this.references();
    const items: SnapshotItem[] = [];
    const roots = [this.options.home, this.options.working, this.options.temporary].filter(Boolean) as string[];
    const trustedRoot = (root: string) => {
      try { return normalize(realpathSync(root)) === normalize(root) && !lstatSync(root).isSymbolicLink(); }
      catch { return false; }
    };
    const add = (p: string, category: CleanupCategory) => {
      const tree = inspectTree(p);
      const linkedParent = !roots.some(root => contains(root, p) && trustedRoot(root)) ||
        (() => { try { return normalize(realpathSync(p)) !== normalize(p); } catch { return true; } })();
      const used = refs.some(ref => overlap(ref, p));
      const recent = category === 'temporary' && now - tree.modified < 60 * 60_000;
      const reason = warnings.length ? 'Saved work could not be fully checked; nothing will be removed.'
        : linkedParent || tree.unsafe ? 'Linked or unreadable files are protected.'
        : used ? 'Referenced by the current episode, a saved reel, a Library clip, or an asset.'
        : recent ? 'Modified within the last hour; kept until it is older.'
        : category === 'uploads' ? 'Uploaded copy not referenced by saved work.'
        : category === 'reels' ? 'Unused render version or output from a deleted batch.'
        : 'Temporary files older than one hour, not referenced by saved work.';
      items.push({ id: createHash('sha256').update(normalize(p)).digest('hex').slice(0, 24),
        category, name: path.basename(p), path: p, bytes: tree.bytes, files: tree.files,
        modified: tree.modified, eligible: !warnings.length && !linkedParent && !tree.unsafe && !used && !recent,
        reason, fingerprint: tree.fingerprint });
    };
    const children = (root: string) => {
      if (!existsSync(root)) return [];
      if (!trustedRoot(root)) { warnings.push(`Linked or unreadable storage folder: ${root}`); return []; }
      try { return readdirSync(root).map(name => path.join(root, name)); }
      catch { warnings.push(`Could not inspect storage folder: ${root}`); return []; }
    };
    for (const p of children(this.options.home)) if (/^reel_[a-z\d_-]+$/i.test(path.basename(p))) add(p, 'reels');
    const uploads = path.join(this.options.working, 'uploads');
    for (const p of children(uploads)) add(p, 'uploads');
    for (const p of children(this.options.working)) {
      if (normalize(p) === normalize(uploads)) continue;
      if (path.basename(p) === 'previews') for (const preview of children(p)) add(preview, 'temporary');
      else add(p, 'temporary');
    }
    // Never scan the host's general TEMP directory for deletion. Only the
    // installation-owned sibling of home is accepted as managed temporary data.
    const expectedTemp = path.join(path.dirname(this.options.home), 'tmp');
    if (this.options.temporary && normalize(this.options.temporary) === normalize(expectedTemp)) {
      for (const p of children(this.options.temporary)) add(p, 'temporary');
    }
    if (warnings.length) for (const item of items) {
      item.eligible = false; item.reason = 'Scan incomplete. Resolve the warning and scan again before cleanup.';
    }
    const storage = [
      { label: 'Uploaded copies', bytes: items.filter(i => i.category === 'uploads').reduce((sum, i) => sum + i.bytes, 0), complete: true },
      { label: 'Highlight renders', bytes: items.filter(i => i.category === 'reels').reduce((sum, i) => sum + i.bytes, 0), complete: true },
      { label: 'Temporary files', bytes: items.filter(i => i.category === 'temporary').reduce((sum, i) => sum + i.bytes, 0), complete: true },
    ];
    for (const [label, p] of [['Finished exports (kept)', this.options.output], ['Caches and models (kept)', this.options.cache], ['Application runtime (kept)', this.options.runtime]]) {
      if (!p) continue;
      const tree = inspectTree(p); storage.push({ label: label!, bytes: tree.bytes, complete: !tree.unsafe });
    }
    const scanId = randomUUID();
    for (const [id, snapshot] of this.snapshots) if (now - snapshot.created > 15 * 60_000) this.snapshots.delete(id);
    while (this.snapshots.size >= 8) this.snapshots.delete(this.snapshots.keys().next().value!);
    this.snapshots.set(scanId, { created: now, items });
    return { scanId, scannedAt: now, storage, warnings,
      items: items.map(({ fingerprint: _, ...item }) => item).sort((a, b) => b.bytes - a.bytes) };
  }

  async remove(scanId: string, ids: string[]) {
    const snapshot = this.snapshots.get(scanId);
    if (!snapshot || this.now() - snapshot.created > 15 * 60_000) throw new Error('This scan expired. Scan storage again before deleting.');
    if (!Array.isArray(ids) || !ids.length || ids.length > 1000 || new Set(ids).size !== ids.length ||
        ids.some(id => typeof id !== 'string' || !snapshot.items.some(i => i.id === id && i.eligible)))
      throw new Error('Select only removable items from this scan.');
    this.snapshots.delete(scanId);
    const deleted: { path: string; bytes: number }[] = [], skipped: { path: string; reason: string }[] = [];
    for (const id of ids) {
      const original = snapshot.items.find(i => i.id === id)!;
      // Recheck all project references and metadata immediately before each
      // recursive delete. The browser supplies opaque IDs, never target paths.
      const { refs, warnings } = this.references();
      const fresh = inspectTree(original.path);
      let linked = true;
      try { linked = normalize(realpathSync(original.path)) !== normalize(original.path); } catch {}
      const used = refs.some(ref => overlap(ref, original.path));
      if (warnings.length || linked || fresh.unsafe || used || fresh.fingerprint !== original.fingerprint) {
        skipped.push({ path: original.path, reason: used ? 'Now referenced by saved work.' :
          'Files or saved work changed since the scan. Scan again to review this item.' });
        continue;
      }
      try {
        await rm(original.path, { recursive: true, force: false });
        deleted.push({ path: original.path, bytes: fresh.bytes });
      } catch {
        skipped.push({ path: original.path, reason: 'Could not fully remove this item. A file may be in use; scan again.' });
      }
    }
    return { deleted, skipped };
  }
}
