import React, { useEffect, useRef, useState } from "react";
import { PageHeader } from "./Page";
import { api, basename, fmt } from "./lib";
import { useJob } from "./useJob";
import AssetPicker from "./AssetPicker";
import RecentSources from "./RecentSources";
import MomentTrim from "./MomentTrim";
import { BackIcon, TrashIcon, DownloadIcon } from "./icons";
import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";

interface Moment {
  moment_id: string;
  start: number;
  end: number;
  why: string;
  text: string;
  source?: string;
  enabled: boolean;
  dirty: boolean;
  clip_path?: string;
  clip_exists?: boolean;
}

interface HighlightsResp {
  session_id: string;
  revision: string;
  source: string;
  sources?: string[];
  format: string;
  logo?: string;
  out_dir: string;
  reel_path: string | null;
  moments: Moment[];
  batch_number?: number;
  selection_settings?: { auto: boolean; top_n: number; min_dur: number; max_dur: number };
}

interface SessionSummary {
  session_id: string;
  source: string;
  profile: string;
  format: string;
  moment_count: number;
  enabled_count: number;
  source_count?: number;
  batch_number?: number;
  reel_path: string | null;
}

type Format = "vertical" | "horizontal" | "square";

const download = (p: string) => `/api/reel-download?path=${encodeURIComponent(p)}`;
function saveDownload(path: string) {
  const link = document.createElement('a');
  link.href = download(path);
  link.download = basename(path);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
const isHttpUrl = (v: string) => /^https?:\/\//i.test(v.trim());

const FORMAT_LABEL: Record<Format, string> = {
  horizontal: "16:9",
  vertical: "9:16",
  square: "1:1",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function DownloadRow({
  jobId,
  url,
  onDone,
  onError,
}: {
  jobId: string;
  url: string;
  onDone: (jobId: string, filePath?: string) => void;
  onError: (jobId: string, error?: string) => void;
}) {
  const job = useJob(jobId);
  const fired = useRef(false);
  useEffect(() => {
    if (!job || fired.current) return;
    if (job.status === "done") {
      fired.current = true;
      onDone(jobId, job.result?.file_path);
    } else if (job.status === "error") {
      fired.current = true;
      onError(jobId, job.error);
    }
  }, [job?.status]);
  return (
    <div className="file-badge">
      <div className="spinner sm" />
      <div className="name">
        Downloading {basename(url)}
        {job?.progress ? ` · ${Math.round(job.progress)}%` : ""}
      </div>
    </div>
  );
}

function ExportProgress({ jobId, onDone, onError }: {
  jobId: string;
  onDone: (path: string) => void;
  onError: (message: string) => void;
}) {
  const job = useJob(jobId);
  const fired = useRef(false);
  useEffect(() => {
    if (!job || fired.current) return;
    if (job.status === 'done' || job.status === 'error') {
      fired.current = true;
      if (job.status === 'done' && job.result?.file_path) onDone(job.result.file_path);
      else onError(job.error || 'Export returned no video file.');
    }
  }, [job, onDone, onError]);
  return <div className="set-note" role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
    <div className="spinner sm" /> {job?.message || 'Preparing download…'} {Math.round(job?.progress || 0)}%
  </div>;
}

export default function HighlightsPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [videoPaths, setVideoPaths] = useState<string[]>([]);
  const [downloads, setDownloads] = useState<{ jobId: string; url: string }[]>([]);
  const [pathDraft, setPathDraft] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [format, setFormat] = useState<Format>("horizontal");
  const [auto, setAuto] = useState(true);
  const [topN, setTopN] = useState(10);
  const [minDur, setMinDur] = useState(15);
  const [maxDur, setMaxDur] = useState(60);
  const [logoPath, setLogoPath] = useState("");
  const [session, setSession] = useState<HighlightsResp | null>(null);
  const [selected, setSelected] = useState(0);
  const [differentMode, setDifferentMode] = useState<'append' | 'new'>('append');
  const draggingMoment = useRef<{ id: string; startY: number; moved: boolean } | null>(null);
  const momentList = useRef<HTMLDivElement>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; after: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<Format>('horizontal');
  const [exportStarting, setExportStarting] = useState(false);
  const [exportJob, setExportJob] = useState<{ id: string; label: string } | null>(null);
  const [readyDownload, setReadyDownload] = useState<{ path: string; label: string } | null>(null);
  const exportBusy = exportStarting || !!exportJob;
  const working = busy || saving || exportBusy;

  useEffect(() => {
    setDownloadFormat((session?.format as Format) || 'horizontal');
    setReadyDownload(null);
  }, [session?.session_id]);

  async function exportDownload(index?: number) {
    if (!session || working) return;
    const label = `${downloadFormat} ${index === undefined ? 'reel' : `clip ${index}`}`;
    setReadyDownload(null);
    setMsg(null);
    // The original rendition can still be downloaded if its source was moved.
    const moment = index === undefined ? null : session.moments[index - 1];
    const existing = moment ? (!moment.dirty && moment.clip_exists ? moment.clip_path : null)
      : (session.moments.every(m => !m.enabled || !m.dirty) ? session.reel_path : null);
    if (downloadFormat === session.format && existing) {
      setReadyDownload({ path: existing, label });
      saveDownload(existing);
      return;
    }
    setExportStarting(true);
    try {
      const result = await api<{ job_id: string }>('/reel-export', {
        method: 'POST', body: JSON.stringify({ session_id: session.session_id, format: downloadFormat, index }),
      });
      if (!result.job_id) throw new Error('The server did not start the export.');
      setExportJob({ id: result.job_id, label });
    } catch (error) {
      setMsg('Download failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setExportStarting(false);
    }
  }

  async function refreshList() {
    try {
      const r = await api<{ sessions: SessionSummary[] }>("/reel", {
        method: "POST",
        body: JSON.stringify({ action: "list" }),
      });
      setSessions(r.sessions || []);
    } catch {
      /* list is best-effort */
    }
  }

  useEffect(() => {
    refreshList();
    api<{ settings?: { logoPath?: string } }>("/ui-state")
      .then((s) => { if (s.settings?.logoPath) setLogoPath(s.settings.logoPath); })
      .catch(() => {});
  }, []);

  async function call(body: Record<string, unknown>, label: string) {
    setBusy(true);
    setReadyDownload(null);
    setMsg(label);
    try {
      const r = await api<HighlightsResp>("/reel", { method: "POST", body: JSON.stringify(body) });
      setSession(r);
      const keptSelection = r.session_id === session?.session_id
        ? r.moments.findIndex(m => m.moment_id === session.moments[selected]?.moment_id) : -1;
      setSelected(keptSelection >= 0 ? keptSelection : Math.min(selected, Math.max(0, r.moments.length - 1)));
      if (r.session_id !== session?.session_id) { setSelected(0); setDifferentMode('append'); }
      if (body.action === 'show' || body.action === 'new' || body.action === 'different') {
        const settings = r.selection_settings;
        if (settings && typeof settings.auto === 'boolean') {
          setAuto(settings.auto);
          if (!settings.auto) {
            setTopN(settings.top_n);
            setMinDur(settings.min_dur);
            setMaxDur(settings.max_dur);
          }
        }
      }
      setMsg(body.action === 'different'
        ? r.session_id === session?.session_id
          ? `Added ${r.moments.length - session.moments.length} new moments to this reel. Your existing order, trims, and exclusions are saved.`
          : `Batch ${r.batch_number || 2} is ready with ${r.moments.length} unused moments. Your earlier reel is in All highlights.`
        : null);
      refreshList();
    } catch (e: unknown) {
      setMsg("Error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  const addPath = (p: string) =>
    setVideoPaths((prev) => (p && !prev.includes(p) ? [...prev, p] : prev));
  const removePath = (i: number) => setVideoPaths((prev) => prev.filter((_, n) => n !== i));

  async function browse() {
    setBrowsing(true);
    try {
      const d = await api<{ file_path?: string; file_paths?: string[] }>("/browse-file?multiple=1");
      const picked = d.file_paths?.length ? d.file_paths : d.file_path ? [d.file_path] : [];
      setVideoPaths((prev) => [...prev, ...picked.filter((p) => !prev.includes(p))]);
    } catch {
      /* dialog cancelled */
    } finally {
      setBrowsing(false);
    }
  }

  async function uploadDropped(files: File[]) {
    setBrowsing(true);
    try {
      for (const file of files) {
        setMsg(`Uploading ${file.name}…`);
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const d = (await res.json()) as { file_path?: string; error?: string };
        if (d.file_path) addPath(d.file_path);
        else setMsg(d.error || "Upload failed");
      }
    } catch {
      setMsg("Upload failed");
    } finally {
      setBrowsing(false);
      setMsg(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) uploadDropped(files);
  }

  async function startDownload(url: string) {
    try {
      const d = await api<{ job_id?: string; error?: string }>("/download-video", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      if (d.error) setMsg("Download failed: " + d.error);
      else if (d.job_id) setDownloads((prev) => [...prev, { jobId: d.job_id!, url }]);
    } catch (e) {
      setMsg("Download failed: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  const onDownloadDone = (jobId: string, filePath?: string) => {
    setDownloads((prev) => prev.filter((d) => d.jobId !== jobId));
    if (filePath) addPath(filePath);
    else setMsg("Download finished without a video file.");
  };
  const onDownloadError = (jobId: string, error?: string) => {
    setDownloads((prev) => prev.filter((d) => d.jobId !== jobId));
    setMsg("Download failed: " + (error || "unknown error"));
  };

  function commitDraft() {
    const p = pathDraft.trim();
    if (p) {
      if (isHttpUrl(p)) startDownload(p);
      else addPath(p);
    }
    setPathDraft("");
  }

  function chooseLogo(path: string) {
    setLogoPath(path);
    api("/ui-state", {
      method: "POST",
      body: JSON.stringify({ _source: "ui", settings: { logoPath: path } }),
    }).catch(() => {});
  }

  function applySessionLogoPath(path: string) {
    if (!session) return;
    call(
      { action: "build", session_id: session.session_id, logo: path },
      path ? "Applying logo and rebuilding…" : "Removing logo…",
    );
  }

  const tuning = () => {
    if (!auto && (!Number.isInteger(topN) || topN < 1 || topN > 50 ||
        !Number.isFinite(minDur) || !Number.isFinite(maxDur) || minDur < 1 || maxDur < minDur)) {
      setMsg('Choose 1–50 moments and lengths of at least 1 second, with maximum at least minimum.');
      return null;
    }
    return { auto, top_n: topN, min_dur: minDur, max_dur: maxDur };
  };

  const detect = () => {
    const settings = tuning();
    if (!settings || working || !videoPaths.length) return;
    const seed =
      videoPaths.length === 1 ? { video_path: videoPaths[0] } : { video_paths: videoPaths };
    call(
      { action: "new", ...seed, profile: "auto", format, ...settings, ...(logoPath ? { logo: logoPath } : {}) },
      videoPaths.length > 1
        ? `Finding the best moments across ${videoPaths.length} videos…`
        : "Finding the best moments and building your reel…",
    );
  };

  const findDifferent = () => {
    if (!session || working) return;
    const settings = tuning();
    if (!settings) return;
    call({ action: 'different', session_id: session.session_id, expected_revision: session.revision, mode: differentMode, ...settings },
      differentMode === 'append' ? 'Finding unused moments to add to this reel…' : 'Finding unused moments for a new batch…');
  };

  async function moveMoment(from: number, to: number) {
    if (!session || working || from === to || to < 0 || to >= session.moments.length) return;
    const previous = session;
    const selectedId = session.moments[selected]?.moment_id;
    const moments = [...session.moments];
    const [moved] = moments.splice(from, 1);
    moments.splice(to, 0, moved);
    setBusy(true);
    setReadyDownload(null);
    setSession({ ...session, moments });
    setSelected(Math.max(0, moments.findIndex(m => m.moment_id === selectedId)));
    setMsg('Saving moment order and rebuilding the reel…');
    try {
      const result = await api<HighlightsResp>('/reel', { method: 'POST', body: JSON.stringify({
        action: 'reorder', session_id: session.session_id, expected_revision: session.revision,
        order: moments.map(m => m.moment_id),
      }) });
      setSession(result);
      setMsg(`Order saved. Moment ${from + 1} moved to position ${to + 1}. Downloads follow this order.`);
      refreshList();
    } catch (error) {
      setSession(previous);
      setSelected(selected);
      setMsg('Could not save order: ' + (error instanceof Error ? error.message : String(error)));
    } finally { setBusy(false); }
  }

  function momentDropTarget(clientY: number) {
    const rows = Array.from(momentList.current?.querySelectorAll<HTMLElement>('[data-moment-row]') || []);
    for (let index = 0; index < rows.length; index++) {
      const rect = rows[index].getBoundingClientRect();
      if (clientY < rect.bottom || index === rows.length - 1)
        return { index, after: clientY >= rect.top + rect.height / 2 };
    }
    return null;
  }

  function dragMoment(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = draggingMoment.current;
    if (!drag || working) return;
    if (Math.abs(e.clientY - drag.startY) >= 4) drag.moved = true;
    if (!drag.moved) return;
    setDropTarget(momentDropTarget(e.clientY));
    // Pointer capture also makes the handle work with touch and pen input.
    if (e.clientY < 60) window.scrollBy(0, -20);
    else if (e.clientY > window.innerHeight - 60) window.scrollBy(0, 20);
  }

  function finishMomentDrag(e: React.PointerEvent<HTMLButtonElement>, cancelled = false) {
    const drag = draggingMoment.current;
    const target = momentDropTarget(e.clientY);
    draggingMoment.current = null;
    setDropTarget(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (cancelled || !drag?.moved || !target) return;
    const from = session?.moments.findIndex(m => m.moment_id === drag.id) ?? -1;
    const insertion = target.index + (target.after ? 1 : 0);
    if (from >= 0) moveMoment(from, insertion - (from < insertion ? 1 : 0));
  }

  const open = (id: string) => call({ action: "show", session_id: id }, "Loading…");

  const editOp = (index: number, op: string, seconds = 0) =>
    session &&
    call({ action: "edit", session_id: session.session_id, index, op, seconds }, "Rebuilding…");

  async function commitTrim(index: number, start: number, end: number) {
    if (!session || working) return;
    setReadyDownload(null);
    setSession({ ...session, moments: session.moments.map((m, i) => (i === index ? { ...m, start, end } : m)) });
    setSaving(true);
    try {
      const r = await api<HighlightsResp>("/reel", {
        method: "POST",
        body: JSON.stringify({ action: "edit", session_id: session.session_id, index: index + 1, op: "set", start, end }),
      });
      setSession(r);
    } catch (error) {
      setSession(session);
      setMsg('Could not save trim: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
    }
  }

  async function remove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!window.confirm("Delete this highlights session?")) return;
    setBusy(true);
    try {
      await api("/reel", { method: "POST", body: JSON.stringify({ action: "delete", session_id: id }) });
      if (session?.session_id === id) setSession(null);
      refreshList();
    } finally {
      setBusy(false);
    }
  }

  const enabled = session?.moments.filter((m) => m.enabled).length ?? 0;
  const active = session?.moments[selected];
  const activeSource = active?.source || session?.source || "";
  const streamSrc = activeSource ? `/api/stream-source?path=${encodeURIComponent(activeSource)}` : "";

  return (
    <div className="app">
      <PageHeader title="Highlights" />

      <div className="section card">
        <div className="card-title" style={{ marginBottom: 14 }}>Find highlights</div>

        <div
          className={`drop-zone ${dragOver ? "drag-over" : ""}`}
          style={{ cursor: browsing ? "default" : "pointer" }}
          onClick={browsing ? undefined : browse}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {browsing ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div className="spinner sm" /> <span style={{ fontSize: 13, fontWeight: 600 }}>Working…</span>
            </div>
          ) : (
            <div className="label"><strong>Browse</strong> or drop video files here</div>
          )}
        </div>

        {(videoPaths.length > 0 || downloads.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {videoPaths.map((p, i) => (
              <div key={p} className="file-badge fade-in">
                <div className="dot" />
                <div className="name">{basename(p)}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => removePath(i)} style={{ padding: "4px 10px", fontSize: 11 }}>
                  Remove
                </button>
              </div>
            ))}
            {downloads.map((d) => (
              <DownloadRow key={d.jobId} jobId={d.jobId} url={d.url} onDone={onDownloadDone} onError={onDownloadError} />
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Or paste a local path or YouTube/video URL, press Enter to add"
            value={pathDraft}
            onChange={(e) => setPathDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitDraft(); } }}
            onBlur={commitDraft}
            style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12 }}
          />
          <RecentSources onPick={addPath} exclude={videoPaths} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
          <span className="field-label" style={{ margin: 0 }}>Moments</span>
          <div style={{ display: "inline-flex", gap: 4 }}>
            <button className={`btn ${auto ? "btn-primary" : "btn-ghost"} btn-sm`} disabled={working} onClick={() => setAuto(true)}>Auto</button>
            <button className={`btn ${!auto ? "btn-primary" : "btn-ghost"} btn-sm`} disabled={working} onClick={() => setAuto(false)}>Custom</button>
          </div>
          {auto && <span className="hint">Best moments and how many, picked for you</span>}
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <Field label="Format">
            <select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
              <option value="horizontal">Horizontal 16:9</option>
              <option value="vertical">Vertical 9:16</option>
              <option value="square">Square 1:1</option>
            </select>
          </Field>
          {!auto && (
            <>
              <Field label="Moments">
                <input type="number" min={1} max={50} disabled={working} value={topN} onChange={(e) => setTopN(Number(e.target.value))} style={{ width: "100%" }} />
              </Field>
              <Field label="Min length (s)">
                <input type="number" min={1} step={0.1} disabled={working} value={minDur} onChange={(e) => setMinDur(Number(e.target.value))} style={{ width: "100%" }} />
              </Field>
              <Field label="Max length (s)">
                <input type="number" min={1} step={0.1} disabled={working} value={maxDur} onChange={(e) => setMaxDur(Number(e.target.value))} style={{ width: "100%" }} />
              </Field>
            </>
          )}
        </div>

        {!auto && <p className="hint" style={{ marginTop: 10 }}>Moments is the maximum count. Each selected moment stays within these lengths; fewer may qualify.</p>}

        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 14 }}>
          <AssetPicker type="logo" label="Logo" value={logoPath} onChange={chooseLogo} />
          <span className="hint" style={{ paddingBottom: 8 }}>Overlaid top-right on every clip</span>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn btn-primary" disabled={working || videoPaths.length === 0} onClick={detect}>
            {busy && msg?.startsWith("Finding")
              ? "Finding…"
              : videoPaths.length > 1
                ? `Find best across ${videoPaths.length} videos`
                : "Find highlights"}
          </button>
        </div>
      </div>

      {msg && (
        <div className="set-note" role="status" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          {busy && <div className="spinner sm" />} {msg}
        </div>
      )}

      {exportJob && <ExportProgress key={exportJob.id} jobId={exportJob.id}
        onDone={path => {
          setReadyDownload({ path, label: exportJob.label });
          setExportJob(null);
          saveDownload(path);
        }}
        onError={message => { setMsg('Download failed: ' + message); setExportJob(null); }} />}
      {readyDownload && <div className="set-note" role="status" style={{ marginBottom: 16 }}>
        Your {readyDownload.label} is ready. <a href={download(readyDownload.path)} download>Download {readyDownload.label}</a>
      </div>}

      {session ? (
        <div className="stream-in">
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: 16, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="card-title">Batch {session.batch_number || 1}</div>
              <p className="hint" style={{ margin: '6px 0 0' }}>Find unused moments from this reel’s source videos using the Moments settings above. Add them to the end of this reel, or start a separate batch. Fewer moments may qualify.</p>
            </div>
            <Field label="New moments">
              <select value={differentMode} disabled={working} onChange={e => setDifferentMode(e.target.value as 'append' | 'new')}>
                <option value="append">Add to this reel</option>
                <option value="new">Create a new batch</option>
              </select>
            </Field>
            <button className="btn btn-primary" disabled={working} onClick={findDifferent}>Find different moments</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <button className="btn btn-ghost btn-sm" disabled={working} onClick={() => setSession(null)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <BackIcon /> All highlights
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: 'wrap' }}>
              <span className="hint">{enabled}/{session.moments.length} in the cut</span>
              <AssetPicker type="logo" value={session.logo || ""} disabled={working} onChange={applySessionLogoPath} />
              <label htmlFor="highlight-download-format" className="field-label" style={{ margin: 0 }}>Download format</label>
              <select id="highlight-download-format" value={downloadFormat} disabled={working}
                onChange={e => { setDownloadFormat(e.target.value as Format); setReadyDownload(null); }} style={{ width: 'auto' }}>
                <option value="vertical">Vertical 9:16</option>
                <option value="horizontal">Horizontal 16:9</option>
                <option value="square">Square 1:1</option>
              </select>
              {enabled > 0 && (
                <button className="btn btn-primary btn-sm" disabled={working} onClick={() => exportDownload()} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <DownloadIcon /> Download reel
                </button>
              )}
            </div>
          </div>
          <p className="hint" style={{ marginBottom: 14 }}>Applies to the reel and every Clip download. Horizontal keeps the full source frame; vertical fills a portrait frame. Another format may take a moment to render.</p>

          {active && (
            <div className="section card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                <span className="section-label" style={{ margin: 0 }}>Moment {selected + 1}</span>
                <span className="pill pill-blue">{active.why}</span>
                {(session.sources?.length ?? 1) > 1 && active.source && (
                  <span className="hint" title={active.source}>{basename(active.source)}</span>
                )}
                <span className="spacer" style={{ flex: 1 }} />
                  <button className="btn btn-ghost btn-sm" disabled={working} onClick={() => exportDownload(selected + 1)} aria-label={`Download moment ${selected + 1} as ${downloadFormat}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <DownloadIcon /> Clip
                  </button>
                <button className="btn btn-ghost btn-sm" disabled={working} onClick={() => editOp(selected + 1, "toggle")}>
                  {active.enabled ? "Exclude from cut" : "Include in cut"}
                </button>
                <button className="btn btn-danger btn-sm" disabled={working} onClick={() => editOp(selected + 1, "drop")}>
                  <TrashIcon />
                </button>
              </div>
              <MomentTrim
                key={`${session.session_id}:${active.moment_id}`}
                src={streamSrc}
                start={active.start}
                end={active.end}
                saving={working}
                onCommit={(s, e) => commitTrim(selected, s, e)}
              />
              {active.text && <p className="card-desc" style={{ marginTop: 12, marginBottom: 0 }}>{active.text}</p>}
            </div>
          )}

          <div className="section-label" style={{ margin: "4px 0 10px" }}>All moments</div>
          <p className="hint" id="moment-order-help">Drag a handle or use the arrows to reorder. Included moments play from top to bottom in the downloaded reel. Changes save automatically.</p>
          <div ref={momentList} role="list" aria-label="Reel moment order" aria-busy={working} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {session.moments.map((m, idx) => (
              <div
                key={m.moment_id}
                role="listitem"
                data-moment-row
                className="card"
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", margin: 0, flexWrap: 'wrap',
                  opacity: m.enabled ? 1 : 0.65,
                  borderColor: idx === selected ? "var(--accent-edge)" : "var(--border)",
                  boxShadow: dropTarget?.index === idx ? `inset 0 ${dropTarget.after ? '-3px' : '3px'} 0 var(--accent-edge)` : undefined,
                }}
              >
                <button className="btn btn-ghost btn-sm" disabled={working}
                  aria-label={`Reorder moment ${idx + 1}`} aria-describedby="moment-order-help"
                  title="Drag to reorder, or use Alt+Up / Alt+Down" style={{ padding: '4px', cursor: working ? 'default' : 'grab', touchAction: 'none', userSelect: 'none' }}
                  onPointerDown={e => {
                    if (working || e.button !== 0 || !e.isPrimary) return;
                    draggingMoment.current = { id: m.moment_id, startY: e.clientY, moved: false };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={dragMoment}
                  onPointerUp={e => finishMomentDrag(e)}
                  onPointerCancel={e => finishMomentDrag(e, true)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { draggingMoment.current = null; setDropTarget(null); }
                    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                      e.preventDefault(); moveMoment(idx, idx + (e.key === 'ArrowUp' ? -1 : 1));
                    }
                  }}><GripVertical size={16} /></button>
                <button className="btn btn-ghost btn-sm" disabled={working} aria-pressed={idx === selected}
                  aria-label={`Preview moment ${idx + 1}: ${fmt(m.start)} to ${fmt(m.end)}`}
                  onClick={() => setSelected(idx)} style={{ display: 'flex', gap: 10, padding: '4px' }}>
                  <span className="hint" style={{ width: 20, textAlign: "right" }}>{idx + 1}</span>
                  <strong style={{ fontVariantNumeric: "tabular-nums", minWidth: 96 }}>{fmt(m.start)}-{fmt(m.end)}</strong>
                </button>
                <span className="pill pill-blue">{m.why}</span>
                {!m.enabled && <span className="hint">Excluded</span>}
                {(session.sources?.length ?? 1) > 1 && m.source && (
                  <span className="hint" title={m.source} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {basename(m.source)}
                  </span>
                )}
                <span className="hint" style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{Math.round(m.end - m.start)}s</span>
                <button className="btn btn-ghost btn-sm" disabled={working || idx === 0}
                  aria-label={`Move moment ${idx + 1} up`} title="Move up" onClick={() => moveMoment(idx, idx - 1)} style={{ padding: '4px 6px' }}><ArrowUp size={14} /></button>
                <button className="btn btn-ghost btn-sm" disabled={working || idx === session.moments.length - 1}
                  aria-label={`Move moment ${idx + 1} down`} title="Move down" onClick={() => moveMoment(idx, idx + 1)} style={{ padding: '4px 6px' }}><ArrowDown size={14} /></button>
                  <button className="btn btn-ghost btn-sm" disabled={working} title={`Download ${downloadFormat} clip`} aria-label={`Download moment ${idx + 1} as ${downloadFormat}`}
                    onClick={(e) => { e.stopPropagation(); exportDownload(idx + 1); }} style={{ padding: "4px 8px" }}>
                    <DownloadIcon size={13} />
                  </button>
              </div>
            ))}
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">No highlights yet. Drop in one or more videos above to find their best moments.</div>
      ) : (
        <>
          <div className="section-label" style={{ marginBottom: 12 }}>Saved</div>
          <div className="stream-in">
            {sessions.map((s) => (
              <div
                key={s.session_id}
                className="card"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, cursor: "pointer" }}
                onClick={() => !busy && open(s.session_id)}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="clip-card-title" style={{ marginBottom: 4 }}>
                    {(s.source_count ?? 1) > 1
                      ? `${s.source_count} videos`
                      : basename(s.source) || s.session_id}
                  </div>
                  <div className="meta" style={{ gap: 8 }}>
                    <span className="pill pill-blue">{s.profile}</span>
                    <span className="hint">Batch {s.batch_number || 1}</span>
                    <span className="hint">{FORMAT_LABEL[s.format as Format] || s.format}</span>
                    <span className="hint">·</span>
                    <span className="hint">{s.enabled_count}/{s.moment_count} moments</span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={(e) => { e.stopPropagation(); open(s.session_id); }}>
                  Open
                </button>
                <button className="btn btn-danger btn-sm" title="Delete" disabled={busy} onClick={(e) => remove(e, s.session_id)}>
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
