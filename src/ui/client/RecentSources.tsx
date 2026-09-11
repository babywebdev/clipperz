import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./lib";

interface Source {
  path: string;
  name: string;
  exists: boolean;
}

export default function RecentSources({
  onPick,
  exclude = [],
}: {
  onPick: (path: string) => void;
  exclude?: string[];
}) {
  const [items, setItems] = useState<Source[]>([]);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    if (pending.current) return;
    const version = ++requestVersion.current;
    try {
      const sources = await api<Source[]>("/sources");
      if (version === requestVersion.current) setItems(sources.filter(s => s.exists));
    } catch { /* Keep the last known list if the server is temporarily unavailable. */ }
  }, []);

  useEffect(() => {
    refresh();
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('recent-sources-cleared', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      requestVersion.current++;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('recent-sources-cleared', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);

  async function clear() {
    pending.current = true;
    requestVersion.current++;
    setClearing(true);
    setMessage("");
    try {
      await api('/sources', { method: 'DELETE' });
      setItems([]);
      setMessage('History cleared. Video files kept.');
      window.dispatchEvent(new Event('recent-sources-cleared'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not clear recent sources.');
    } finally { pending.current = false; setClearing(false); }
  }

  const options = items.filter((s) => !exclude.includes(s.path));

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', maxWidth: 280 }}>
    <select
      className="recent-sources"
      aria-label="Recent sources"
      disabled={clearing}
      value=""
      onFocus={() => { setMessage(''); refresh(); }}
      onPointerDown={() => { setMessage(''); refresh(); }}
      onChange={async (e) => {
        const selected = e.target.value;
        e.target.value = "";
        if (!selected) return;
        const version = ++requestVersion.current;
        try {
          // A file may have been removed while the native menu was open.
          const current = await api<Source[]>('/sources');
          if (pending.current || version !== requestVersion.current) return;
          setItems(current.filter(s => s.exists));
          if (current.some(s => s.path === selected && s.exists)) onPick(selected);
          else setMessage('That file no longer exists. The list has been refreshed.');
        } catch { setMessage('Could not check this source. Please try again.'); }
      }}
    >
      <option value="">{options.length ? 'Recent sources…' : 'No recent sources'}</option>
      {options.map((s) => (
        <option key={s.path} value={s.path}>{s.name}</option>
      ))}
    </select>
    <button type="button" className="btn btn-ghost btn-sm" disabled={clearing || items.length === 0}
      aria-label="Clear recent sources" title="Clear this history list. Video files are kept." onClick={clear}>
      {clearing ? 'Clearing…' : 'Clear'}
    </button>
    {message && <span className="hint" role="status" style={{ flexBasis: '100%' }}>{message}</span>}
    </div>
  );
}
