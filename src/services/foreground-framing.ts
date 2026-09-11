export type ForegroundFraming = {
  mode?: 'larger' | 'fit' | 'manual';
  sideTrimPercent?: number; foregroundBottom?: number;
  zoom?: number; positionX?: number; positionY?: number;
  background?: 'blur' | 'black';
};

export function formatDimensions(format = 'vertical'): [number, number] {
  if (format === 'horizontal') return [1920, 1080];
  if (format === 'square') return [1080, 1080];
  return [1080, 1920];
}

// Matches the FFmpeg even-pixel crop and scaling in foreground_framing.py.
export function foregroundGeometry(width: number, height: number, framing: ForegroundFraming) {
  const cropWidth = Math.floor(width * (1 - 2 * (framing.sideTrimPercent ?? 13) / 100) / 2) * 2;
  const cropX = Math.floor((width - cropWidth) / 4) * 2;
  const foregroundHeight = Math.round(height * 1080 / cropWidth / 2) * 2;
  return { cropWidth, cropX, foregroundHeight, top: 1920 * (framing.foregroundBottom ?? .658) - foregroundHeight };
}

// Pixel coordinates are shared with the export geometry; overlay origins are
// even because the exported video uses 4:2:0 chroma subsampling.
export function frameGeometry(width: number, height: number, framing: ForegroundFraming, format = 'vertical') {
  const [targetWidth, targetHeight] = formatDimensions(format);
  if (!framing.mode || framing.mode === 'larger') {
    const g = foregroundGeometry(width, height, framing);
    return { sx: g.cropX, sy: 0, sw: g.cropWidth, sh: height, dx: 0, dy: Math.floor(g.top / 2) * 2,
      dw: 1080, dh: g.foregroundHeight, targetWidth, targetHeight, background: 'blur', overflow: g.top < 0 };
  }
  const zoom = framing.mode === 'manual' ? (framing.zoom ?? 1) : 1;
  const scale = Math.min(targetWidth / width, targetHeight / height);
  const dw = Math.max(2, Math.floor(width * scale * zoom / 2) * 2);
  const dh = Math.max(2, Math.floor(height * scale * zoom / 2) * 2);
  const x = framing.mode === 'manual' ? (framing.positionX ?? 50) : 50;
  const y = framing.mode === 'manual' ? (framing.positionY ?? 50) : 50;
  const dx = Math.floor(((targetWidth - dw) / 2 + (x - 50) / 100 * targetWidth) / 2) * 2;
  const dy = Math.floor(((targetHeight - dh) / 2 + (y - 50) / 100 * targetHeight) / 2) * 2;
  return { sx: 0, sy: 0, sw: width, sh: height, dx, dy, dw, dh, targetWidth, targetHeight,
    background: framing.background || 'blur', overflow: false };
}

export function sourcePreviewGeometry(width: number, height: number, format: string, crop: string, framing: ForegroundFraming | null) {
  if (framing) return frameGeometry(width, height, framing, format);
  const [targetWidth, targetHeight] = formatDimensions(format);
  const fit = frameGeometry(width, height, { mode: 'fit', background: format === 'horizontal' ? 'black' : 'blur' }, format);
  // Tracking is shown only by a rendered preview. The live overview keeps the
  // entire source visible until that analysis is available.
  if (crop !== 'center' || format === 'horizontal' || width / height > targetWidth / targetHeight) return fit;
  const sh = Math.floor(width / (targetWidth / targetHeight));
  return { ...fit, sh, sy: Math.floor((height - sh) / 4) * 2, dx: 0, dy: 0, dw: targetWidth, dh: targetHeight };
}

export function validateForegroundFraming(value: unknown, format = 'vertical'): ForegroundFraming | null {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid foreground framing');
  const raw = value as Record<string, unknown>;
  const mode = raw.mode ?? 'larger';
  if (!['larger', 'fit', 'manual'].includes(mode as string)) throw new Error('Invalid framing mode');
  if (!['vertical', 'horizontal', 'square'].includes(format)) throw new Error('Invalid output format');
  if (mode !== 'larger') {
    const zoom = raw.zoom ?? 1, positionX = raw.positionX ?? 50, positionY = raw.positionY ?? 50;
    const background = raw.background ?? 'blur';
    if (!['blur', 'black'].includes(background as string)) throw new Error('Invalid framing background');
    for (const [label, n, min, max] of [['Zoom', zoom, .5, 4], ['Horizontal position', positionX, 0, 100], ['Vertical position', positionY, 0, 100]] as const) {
      if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) throw new Error(`${label} must be between ${min} and ${max}`);
    }
    return mode === 'fit' ? { mode, background: background as 'blur' | 'black' } :
      { mode: 'manual', zoom: zoom as number, positionX: positionX as number, positionY: positionY as number, background: background as 'blur' | 'black' };
  }
  if (format !== 'vertical') throw new Error('Larger foreground requires vertical 1080×1920 output');
  const sideTrimPercent = raw.sideTrimPercent ?? 13;
  const foregroundBottom = raw.foregroundBottom ?? .658;
  if (typeof sideTrimPercent !== 'number' || !Number.isFinite(sideTrimPercent) || sideTrimPercent < 0 || sideTrimPercent > 15 ||
      typeof foregroundBottom !== 'number' || !Number.isFinite(foregroundBottom) || foregroundBottom < .5 || foregroundBottom > .85) {
    throw new Error('Side trim must be 0–15% and foreground bottom must be 50–85%');
  }
  return { sideTrimPercent, foregroundBottom };
}
