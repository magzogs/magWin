import { nativeImage, type NativeImage } from 'electron';

interface Tile {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly radius: number;
  readonly opacity: number;
}

/**
 * The tiles of the app logo (build/icon.svg, docs/static/img/logo.svg) in its 64-unit space:
 * one large tile and five small, translucent ones. The glyph draws the area they cover.
 */
const LOGO_TILES: readonly Tile[] = [
  { x: 11, y: 11, size: 27, radius: 4, opacity: 1 },
  { x: 41, y: 11, size: 12, radius: 3, opacity: 0.35 },
  { x: 41, y: 26, size: 12, radius: 3, opacity: 0.35 },
  { x: 11, y: 41, size: 12, radius: 3, opacity: 0.35 },
  { x: 26, y: 41, size: 12, radius: 3, opacity: 0.35 },
  { x: 41, y: 41, size: 12, radius: 3, opacity: 0.35 },
];
const LOGO_ORIGIN = 11;
const LOGO_EXTENT = 42;
/** Samples per pixel along each axis, for anti-aliased edges. */
const SUPERSAMPLE = 4;

/**
 * Draws the menu bar glyph — the logo's tiles without its background — as a premultiplied BGRA
 * bitmap. Pure so it can be unit tested; no image assets are shipped.
 */
export function rasterizeGridGlyph(size: number): Buffer {
  const pixels = Buffer.alloc(size * size * 4);
  const margin = size / 18;
  const scale = (size - 2 * margin) / LOGO_EXTENT;
  const tiles = LOGO_TILES.map((tile) => ({
    left: margin + (tile.x - LOGO_ORIGIN) * scale,
    top: margin + (tile.y - LOGO_ORIGIN) * scale,
    size: tile.size * scale,
    radius: tile.radius * scale,
    opacity: tile.opacity,
  }));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let sum = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const px = x + (sx + 0.5) / SUPERSAMPLE;
          const py = y + (sy + 0.5) / SUPERSAMPLE;
          const hit = tiles.find((tile) => insideRoundedRect(px, py, tile));
          sum += hit?.opacity ?? 0;
        }
      }
      // Black glyph: colour channels stay 0 once premultiplied, only alpha matters.
      pixels[(y * size + x) * 4 + 3] = Math.round((sum / SUPERSAMPLE ** 2) * 255);
    }
  }
  return pixels;
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
