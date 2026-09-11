import React, { useEffect, useRef, useState } from 'react';
import { sourcePreviewGeometry, formatDimensions } from '../../services/foreground-framing';

export default function ForegroundCanvas({ videoRef, videoUrl, framing, format = 'vertical', cropStrategy = 'center' }) {
  const canvasRef = useRef(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    let frame;
    let previousTime = -1;
    let previousSource = '';
    const paint = () => {
      frame = requestAnimationFrame(paint);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return;
      if (previousTime === video.currentTime && previousSource === video.currentSrc) return;
      previousTime = video.currentTime;
      previousSource = video.currentSrc;
      const width = video.videoWidth, height = video.videoHeight;
      const g = sourcePreviewGeometry(width, height, format, cropStrategy, framing);
      setOverflow(g.overflow);
      const ctx = canvas.getContext('2d');
      const cw = g.targetWidth / 2, ch = g.targetHeight / 2;
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, cw, ch);
      const scale = Math.max(cw / width, ch / height);
      ctx.save();
      if (g.background === 'blur') {
        ctx.filter = 'blur(15px)';
        ctx.drawImage(video, (cw - width * scale) / 2, (ch - height * scale) / 2, width * scale, height * scale);
      }
      ctx.restore();
      ctx.drawImage(video, g.sx, g.sy, g.sw, g.sh, g.dx / 2, g.dy / 2, g.dw / 2, g.dh / 2);
    };
    paint();
    return () => cancelAnimationFrame(frame);
  }, [videoRef, videoUrl, framing, format, cropStrategy]);
  const [width, height] = formatDimensions(format);
  return <>
    <canvas ref={canvasRef} width={width / 2} height={height / 2} aria-label="Clip framing preview" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
    {overflow && <div role="alert" style={{ position: 'absolute', top: 35, left: 8, right: 8, zIndex: 7, padding: 8, background: '#611', color: 'white', fontSize: 12 }}>Foreground extends above the frame. Reduce trim or increase foreground bottom before exporting.</div>}
  </>;
}
