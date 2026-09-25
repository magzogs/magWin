import { nativeImage, type NativeImage } from 'electron';

/**
 * Draws the menu bar glyph — a 2×2 grid of rounded tiles — as a premultiplied BGRA bitmap.
 * Pure so it can be unit tested; no image assets are shipped.
 */
export function rasterizeGridGlyph(size: number): Buffer {
  const pixels = Buffer.alloc(size * size * 4);
  const unit = size / 18;
  const margin = 2 * unit;
  const tile = 6 * unit;
  const gap = 2 * unit;
  const radius = 1.5 * unit;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const alpha = coverage(x + 0.5, y + 0.5, { margin, tile, gap, radius });
      // Black glyph: colour channels stay 0 once premultiplied, only alpha matters.
      pixels[(y * size + x) * 4 + 3] = Math.round(alpha * 255);
    }
  }
  return pixels;
}

interface GlyphMetrics {
  readonly margin: number;
  readonly tile: number;
  readonly gap: number;
  readonly radius: number;
}

function coverage(px: number, py: number, m: GlyphMetrics): number {
  for (const row of [0, 1]) {
    for (const col of [0, 1]) {
      const left = m.margin + col * (m.tile + m.gap);
      const top = m.margin + row * (m.tile + m.gap);
      if (insideRoundedRect(px, py, { left, top, size: m.tile, radius: m.radius })) {
        return 1;
      }
    }
  }
  return 0;
}

function insideRoundedRect(
  px: number,
  py: number,
  r: { left: number; top: number; size: number; radius: number },
): boolean {
  const right = r.left + r.size;
  const bottom = r.top + r.size;
  if (px < r.left || px > right || py < r.top || py > bottom) {
    return false;
  }
  const cx = Math.min(Math.max(px, r.left + r.radius), right - r.radius);
  const cy = Math.min(Math.max(py, r.top + r.radius), bottom - r.radius);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r.radius ** 2;
}

/** Template image so macOS tints it for light/dark menu bars. */
export function createTrayIcon(): NativeImage {
  const image = nativeImage.createFromBitmap(rasterizeGridGlyph(18), {
    width: 18,
    height: 18,
    scaleFactor: 1,
  });
  image.addRepresentation({
    scaleFactor: 2,
    width: 36,
    height: 36,
    buffer: rasterizeGridGlyph(36),
  });
  image.setTemplateImage(true);
  return image;
}
