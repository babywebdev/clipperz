import React, { useEffect, useState } from 'react';

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function PreviewControls({ videoRef, videoUrl, activeClip }) {
  const [state, setState] = useState({ paused: true, muted: true, volume: 1, time: 0, duration: 0 });
  const [error, setError] = useState('');
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => setState({ paused: video.paused, muted: video.muted, volume: video.volume, time: video.currentTime, duration: Number.isFinite(video.duration) ? video.duration : 0 });
    const events = ['play', 'pause', 'timeupdate', 'volumechange', 'loadedmetadata', 'durationchange', 'seeked', 'ended'];
    events.forEach(event => video.addEventListener(event, sync));
    sync();
    setError('');
    return () => events.forEach(event => video.removeEventListener(event, sync));
  }, [videoRef, videoUrl]);
  const start = activeClip?.start_second ?? 0;
  const end = Math.min(activeClip?.end_second ?? state.duration, state.duration || Infinity);
  const span = Math.max(0, end - start);
  const elapsed = Math.max(0, Math.min(span, state.time - start));
  const toggle = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) { video.pause(); return; }
    if (video.currentTime >= end || video.currentTime < start) video.currentTime = start;
    try { await video.play(); setError(''); } catch { setError('Playback could not start. Try Play again.'); }
  };
  return <div className="clip-preview-controls">
    <div className="preview-toggle-row" style={{ gap: 8, flexWrap: 'wrap' }}>
      <button className="btn btn-ghost btn-sm" onClick={toggle}>{state.paused ? 'Play' : 'Pause'}</button>
      <button className="btn btn-ghost btn-sm" aria-pressed={!state.muted} onClick={() => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        if (!video.muted && video.volume === 0) video.volume = 1;
      }}>{state.muted ? 'Enable sound' : 'Mute'}</button>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>Volume
        <input aria-label="Preview volume" type="range" min="0" max="100" step="1" value={Math.round(state.volume * 100)} style={{ width: 85 }} onChange={e => {
          const video = videoRef.current;
          if (video) { video.volume = Number(e.target.value) / 100; video.muted = video.volume === 0; }
        }} />
      </label>
    </div>
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 0' }}>
      <span>{clock(elapsed)} / {clock(span)}</span>
      <input aria-label="Preview timeline" type="range" min="0" max={span || 1} step=".05" value={elapsed} disabled={!span} style={{ flex: 1, minWidth: 0 }} onChange={e => {
        if (videoRef.current) videoRef.current.currentTime = start + Number(e.target.value);
      }} />
    </label>
    {error && <p role="alert">{error}</p>}
  </div>;
}
