import { describe, expect, it } from 'vitest';
import { validateForegroundFraming, foregroundGeometry, frameGeometry, sourcePreviewGeometry } from './foreground-framing.js';

describe('larger foreground framing', () => {
  it('matches the approved source crop in the preview', () => {
    const spec = validateForegroundFraming({})!;
    expect(spec).toEqual({ sideTrimPercent: 13, foregroundBottom: .658 });
    const g = foregroundGeometry(1920, 1080, spec);
    expect(g.cropWidth).toBe(1420);
    expect(g.cropX).toBe(250);
    expect(g.foregroundHeight).toBe(822);
    expect(g.top + g.foregroundHeight).toBeCloseTo(1920 * .658);
  });
  it('rejects incompatible formats and malformed settings', () => {
    expect(() => validateForegroundFraming({}, 'horizontal')).toThrow('vertical');
    for (const value of [false, [], { sideTrimPercent: 16 }, { foregroundBottom: NaN }]) {
      expect(() => validateForegroundFraming(value)).toThrow();
    }
    expect(validateForegroundFraming(null, 'horizontal')).toBeNull();
  });
  it('fits the entire source without clipping in all formats', () => {
    for (const [w, h] of [[1920, 1080], [1080, 1920], [1000, 1000]]) {
      for (const format of ['vertical', 'horizontal', 'square']) {
        const g = frameGeometry(w, h, { mode: 'fit' }, format);
        expect([g.sx, g.sy, g.sw, g.sh]).toEqual([0, 0, w, h]);
        expect(g.dx).toBeGreaterThanOrEqual(0);
        expect(g.dy).toBeGreaterThanOrEqual(0);
        expect(g.dx + g.dw).toBeLessThanOrEqual(g.targetWidth);
        expect(g.dy + g.dh).toBeLessThanOrEqual(g.targetHeight);
      }
    }
  });
  it('zooms and positions the foreground in export pixel coordinates', () => {
    const g = frameGeometry(1920, 1080, { mode: 'manual', zoom: 2, positionX: 75, positionY: 25 });
    expect([g.dw, g.dh, g.dx, g.dy]).toEqual([2160, 1214, -270, -128]);
    expect(validateForegroundFraming({ mode: 'manual', zoom: 2 }, 'square')).toMatchObject({ zoom: 2, positionX: 50, positionY: 50 });
    for (const value of [{ mode: 'manual', zoom: 5 }, { mode: 'fit', background: 'image' }, { mode: 'manual', positionX: -1 }]) {
      expect(() => validateForegroundFraming(value)).toThrow();
    }
  });
  it('matches standard center framing and horizontal letterboxing', () => {
    const wide = sourcePreviewGeometry(1920, 1080, 'vertical', 'center', null);
    expect([wide.sw, wide.sh, wide.dw, wide.dh]).toEqual([1920, 1080, 1080, 606]);
    expect(sourcePreviewGeometry(1080, 1920, 'horizontal', 'center', null).background).toBe('black');
    const tall = sourcePreviewGeometry(1080, 1920, 'square', 'center', null);
    expect([tall.sw, tall.sh, tall.sy]).toEqual([1080, 1080, 420]);
  });
});
