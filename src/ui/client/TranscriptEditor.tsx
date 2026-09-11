import React, { useMemo, useState } from 'react';
import { transcriptPassages } from '../../utils/transcript-edit';
import { fmt } from './lib';
import type { TranscriptResult } from '../../models';

export default function TranscriptEditor({ transcript, onSave, onCancel, onSeek }: {
  transcript: TranscriptResult;
  onSave: (edits: { from: number; to: number; text: string }[]) => Promise<void>;
  onCancel: () => void;
  onSeek: (time: number) => void;
}) {
  const passages = useMemo(() => transcriptPassages(transcript.words), [transcript]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(passages.length / 20);
  const edits = passages.filter(p => drafts[p.from] !== undefined && drafts[p.from] !== p.text)
    .map(p => ({ from: p.from, to: p.to, text: drafts[p.from] }));
  async function save() {
    setSaving(true); setError('');
    try { await onSave(edits); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }
  return <div>
    <p className="hint" style={{ padding: '0 14px' }}>Correct the text below. Unchanged words keep their timing; added or replaced words share the timing of the edited span. Blank a passage to remove its captions.</p>
    <div style={{ maxHeight: 470, overflowY: 'auto', padding: 14, display: 'grid', gap: 14 }}>
      {passages.slice(page * 20, (page + 1) * 20).map(p => <div key={p.from}>
        <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => onSeek(p.start)} aria-label={`Listen from ${fmt(p.start)}`}>
          ▶ {fmt(p.start)}–{fmt(p.end)}
        </button>
        <textarea aria-label={`Transcript at ${fmt(p.start)}`} rows={3} value={drafts[p.from] ?? p.text} disabled={saving}
          onChange={e => setDrafts(old => ({ ...old, [p.from]: e.target.value }))} style={{ width: '100%', marginTop: 6, resize: 'vertical', lineHeight: 1.6 }} />
      </div>)}
    </div>
    {pageCount > 1 && <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
      <button className="btn btn-ghost btn-sm" disabled={!page || saving} onClick={() => setPage(p => p - 1)}>Previous passages</button>
      <span className="hint">Page {page + 1} of {pageCount}</span>
      <button className="btn btn-ghost btn-sm" disabled={page === pageCount - 1 || saving} onClick={() => setPage(p => p + 1)}>Next passages</button>
    </div>}
    {error && <div role="alert" style={{ padding: '8px 14px', color: 'var(--red)' }}>{error}</div>}
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 14 }}>
      <button className="btn btn-primary btn-sm" disabled={saving || !edits.length} onClick={save}>{saving ? 'Saving…' : 'Save transcript'}</button>
      <button className="btn btn-ghost btn-sm" disabled={saving} onClick={onCancel}>Cancel</button>
      <span className="hint">{edits.length} edited {edits.length === 1 ? 'passage' : 'passages'}</span>
    </div>
  </div>;
}
