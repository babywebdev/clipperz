import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Trash2, ShieldCheck } from 'lucide-react';
import { PageHeader } from './Page';
import { api } from './lib';
import { useDialog } from './useDialog';
import type { CleanupCategory, CleanupReport } from '../../services/storage-cleanup';

const size = (bytes: number) => bytes >= 2 ** 30 ? `${(bytes / 2 ** 30).toFixed(2)} GiB`
  : bytes >= 2 ** 20 ? `${(bytes / 2 ** 20).toFixed(1)} MiB` : `${Math.ceil(bytes / 1024)} KiB`;
const groups: { id: CleanupCategory; title: string; description: string }[] = [
  { id: 'reels', title: 'Highlight renders', description: 'Remove unused versions and videos left by deleted batches. Saved reels and their source videos are protected.' },
  { id: 'temporary', title: 'Temporary files', description: 'Preview files, test renders, and other temporary data. Files modified within the last hour are kept.' },
  { id: 'uploads', title: 'Uploaded copies', description: 'These are copies stored by Clipperz. Only copies with no references in saved work can be selected. Keep your original recordings elsewhere.' },
];

export default function CleanupPage() {
  const [report, setReport] = useState<CleanupReport | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showProtected, setShowProtected] = useState(false);
  const closeReview = () => { if (!deleting) setReviewing(false); };
  const dialog = useDialog(reviewing, closeReview);
  const busy = scanning || deleting;
  const chosen = report?.items.filter(i => selected.has(i.id) && i.eligible) || [];
  const chosenBytes = chosen.reduce((sum, i) => sum + i.bytes, 0);
  const chosenFiles = chosen.reduce((sum, i) => sum + i.files, 0);
  const removable = report?.items.filter(i => i.eligible) || [];

  async function scan() {
    setScanning(true); setError('');
    try { setReport(await api<CleanupReport>('/cleanup')); setSelected(new Set()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not scan storage.'); }
    finally { setScanning(false); }
  }
  useEffect(() => { scan(); }, []);

  async function remove() {
    if (!report || !chosen.length || deleting) return;
    setDeleting(true); setError('');
    try {
      const result = await api<{ deleted: { path: string; bytes: number }[]; skipped: { path: string; reason: string }[] }>('/cleanup/delete', {
        method: 'POST', body: JSON.stringify({ scan_id: report.scanId, item_ids: chosen.map(i => i.id) }),
      });
      setMessage(`Removed ${result.deleted.length} selected items (${size(result.deleted.reduce((sum, i) => sum + i.bytes, 0))} in file sizes).`);
      if (result.skipped.length) setMessage(previous => previous + ` ${result.skipped.length} items were kept because they changed, are needed, or could not be removed. Scan results below are updated.`);
      setReviewing(false);
      setSelected(new Set());
      window.dispatchEvent(new Event('recent-sources-cleared'));
      await scan();
    } catch (e) { setReviewing(false); setError(e instanceof Error ? e.message : 'Cleanup failed. Scan again to check the files.'); }
    finally { setDeleting(false); }
  }

  return <div className="app">
    <PageHeader title="Cleanup" actions={<button className="btn btn-ghost" disabled={busy} onClick={scan}>
      <RefreshCw size={15} /> {scanning ? 'Scanning…' : 'Scan storage'}
    </button>} />
    <p className="card-desc">Review storage use and remove files you no longer need. Nothing is selected or deleted automatically.</p>
    <div className="set-note" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 20 }}>
      <ShieldCheck size={20} style={{ flexShrink: 0 }} />
      <span>Current episode sources, saved reels, Library clips, assets, exports, transcripts, models, and application files are protected.
        Delete unwanted Library clips from Library. Delete a saved Highlights batch there, then scan here to remove its leftover videos.</span>
    </div>
    {scanning && <div role="status" className="hint" style={{ marginBottom: 16 }}>Checking file sizes and references in saved work…</div>}
    {error && <div role="alert" className="set-note" style={{ color: 'var(--red)', marginBottom: 16 }}>{error}</div>}
    {message && <div role="status" className="set-note" style={{ marginBottom: 16 }}>{message}</div>}
    {report && <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
        {report.storage.map(group => <div key={group.label} className="card" style={{ padding: 16, margin: 0 }}>
          <div className="hint">{group.label}</div>
          <strong style={{ display: 'block', fontSize: 24, marginTop: 6 }}>{size(group.bytes)}{!group.complete && ' +'}</strong>
        </div>)}
      </div>
      <p className="hint">Sizes count files; shared render files may free less disk space. “+” means some sizes could not be read.</p>
      {report.warnings.map(warning => <p key={warning} role="alert" style={{ color: 'var(--red)', overflowWrap: 'anywhere' }}>{warning}</p>)}
      <div className="card" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 20 }}>
        <strong>{chosen.length} selected · {size(chosenBytes)}</strong>
        <button className="btn btn-ghost btn-sm" disabled={busy || !removable.length}
          onClick={() => setSelected(new Set(removable.filter(i => i.category !== 'uploads').map(i => i.id)))}>Select unused renders &amp; temporary files</button>
        <button className="btn btn-ghost btn-sm" disabled={busy || !selected.size} onClick={() => setSelected(new Set())}>Select none</button>
        <button className="btn btn-danger btn-sm" disabled={busy || !chosen.length} onClick={() => setReviewing(true)} style={{ marginLeft: 'auto' }}>
          <Trash2 size={14} /> Review deletion
        </button>
      </div>
      <label className="hint" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '16px 0' }}>
        <input type="checkbox" checked={showProtected} onChange={e => setShowProtected(e.target.checked)} />
        Show protected items ({report.items.filter(i => !i.eligible).length})
      </label>
      {groups.map(group => {
        const items = report.items.filter(i => i.category === group.id && (showProtected || i.eligible));
        return <section key={group.id} className="section card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>{group.title}</h2>
          <p className="hint" style={{ margin: '0 0 14px' }}>{group.description}</p>
          {!items.length ? <p className="hint">No removable items in this group.</p> :
            <div style={{ maxHeight: 450, overflowY: 'auto' }}>
              {items.map(item => <label key={item.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)', alignItems: 'flex-start' }}>
                <input type="checkbox" disabled={busy || !item.eligible} checked={selected.has(item.id)}
                  aria-label={`Select ${item.name}`} style={{ marginTop: 4 }} onChange={e => setSelected(previous => {
                    const next = new Set(previous); if (e.target.checked) next.add(item.id); else next.delete(item.id); return next;
                  })} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{item.name}</strong>
                  <span className="hint" style={{ display: 'block', overflowWrap: 'anywhere', marginTop: 4 }}>{item.path}</span>
                  <span className="hint" style={{ display: 'block', marginTop: 4 }}>{!item.eligible && 'Protected · '}{item.reason}</span>
                </span>
                <span className="hint" style={{ whiteSpace: 'nowrap' }}>{size(item.bytes)}<br />{item.files} files</span>
              </label>)}
            </div>}
        </section>;
      })}
    </>}
    {reviewing && createPortal(<div className="modal-overlay" onClick={closeReview}>
      <div ref={dialog} className="modal-body" role="dialog" aria-modal="true" aria-label="Review cleanup deletion" tabIndex={-1}
        onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <h2 style={{ fontSize: 20 }}>Delete these files permanently?</h2>
        <p>{chosen.length} selected items contain {chosenFiles} files ({size(chosenBytes)}). This bypasses the Recycle Bin and cannot be undone in Clipperz.</p>
        <p className="hint">References and file changes are checked again before deletion. Newly protected or changed items will be skipped.</p>
        <ul style={{ maxHeight: 260, overflowY: 'auto', paddingLeft: 20 }}>
          {chosen.map(item => <li key={item.id} style={{ marginBottom: 8, overflowWrap: 'anywhere' }}>{item.path} · {size(item.bytes)}</li>)}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" disabled={deleting} onClick={closeReview}>Cancel</button>
          <button className="btn btn-danger" disabled={deleting} onClick={remove}>{deleting ? 'Deleting…' : 'Delete selected files permanently'}</button>
        </div>
      </div>
    </div>, document.body)}
  </div>;
}
