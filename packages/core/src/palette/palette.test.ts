import { describe, expect, it } from 'vitest';
import { containsPoint } from '../geometry/geometry';
import { DEFAULT_PRESETS } from '../grid/presets';
import { orientationForEdge } from './edges';
import { computePaletteLayout, DEFAULT_PALETTE_METRICS } from './layout';
import { keepOpenZone, PALETTE_EDGE_OFFSET, placePalette } from './placement';

const metrics = DEFAULT_PALETTE_METRICS;

describe('computePaletteLayout', () => {
  it('lays components out in a row for top/bottom edges with apply below each grid', () => {
    const layout = computePaletteLayout({
      presets: DEFAULT_PRESETS,
      edge: 'top',
      aspectRatio: 16 / 10,
      metrics,
    });
    expect(layout.orientation).toBe('row');
    expect(layout.slots).toHaveLength(5);
    const [first, second] = layout.slots;
    expect(first?.grid.height).toBe(65);
    expect(second?.grid.x).toBe(metrics.padding + metrics.componentWidth + metrics.gap);
    expect(first?.apply.y).toBeGreaterThan((first?.grid.y ?? 0) + (first?.grid.height ?? 0));
    expect(layout.size.width).toBe(12 * 2 + 5 * 104 + 4 * 14);
    const last = layout.slots.at(-1);
    expect((last?.apply.y ?? 0) + metrics.applyHeight + metrics.padding).toBe(layout.size.height);
  });

  it('lays components out in a column with apply beside the grid, away from the edge', () => {
    const left = computePaletteLayout({
      presets: DEFAULT_PRESETS,
      edge: 'left',
      aspectRatio: 1.6,
      metrics,
    });
    const right = computePaletteLayout({
      presets: DEFAULT_PRESETS,
      edge: 'right',
      aspectRatio: 1.6,
      metrics,
    });
    expect(left.orientation).toBe('column');
    const leftSlot = left.slots[0];
    const rightSlot = right.slots[0];
    expect(leftSlot?.apply.x).toBeGreaterThan(leftSlot?.grid.x ?? 0);
    expect(rightSlot?.apply.x).toBeLessThan(rightSlot?.grid.x ?? 0);
    expect(left.size).toEqual(right.size);
  });

  it('mirrors the display shape and clamps extreme aspect ratios', () => {
    const tall = computePaletteLayout({
      presets: DEFAULT_PRESETS,
      edge: 'top',
      aspectRatio: 0.1,
      metrics,
    });
    expect(tall.slots[0]?.grid.height).toBe(Math.round(104 / 0.3));
  });

  it('maps edges to orientations', () => {
    expect(orientationForEdge('bottom')).toBe('row');
    expect(orientationForEdge('right')).toBe('column');
  });
});

describe('placePalette', () => {
  const workArea = { x: 0, y: 25, width: 1440, height: 875 };
  const windowFrame = { x: 200, y: 100, width: 800, height: 600 };
  const size = { width: 300, height: 120 };

  it('centres on the cursor just inside the top edge', () => {
    const placed = placePalette({
      edge: 'top',
      point: { x: 600, y: 100 },
      windowFrame,
      workArea,
      size,
    });
    expect(placed).toEqual({ x: 450, y: 100 + PALETTE_EDGE_OFFSET, width: 300, height: 120 });
  });

  it('sits inside the bottom and side edges', () => {
    const bottom = placePalette({
      edge: 'bottom',
      point: { x: 600, y: 700 },
      windowFrame,
      workArea,
      size,
    });
    expect(bottom.y + bottom.height).toBe(700 - PALETTE_EDGE_OFFSET);
    const right = placePalette({
      edge: 'right',
      point: { x: 1000, y: 400 },
      windowFrame,
      workArea,
      size,
    });
    expect(right.x + right.width).toBe(1000 - PALETTE_EDGE_OFFSET);
    const left = placePalette({
      edge: 'left',
      point: { x: 200, y: 400 },
      windowFrame,
      workArea,
      size,
    });
    expect(left.x).toBe(200 + PALETTE_EDGE_OFFSET);
  });

  it('stays on screen near display borders', () => {
    const placed = placePalette({
      edge: 'top',
      point: { x: 5, y: 30 },
      windowFrame: { x: 0, y: 25, width: 1440, height: 875 },
      workArea,
      size,
    });
    expect(placed.x).toBe(4);
  });
});

describe('keepOpenZone', () => {
  it('covers the palette, the trigger point and the corridor between them', () => {
    const zone = keepOpenZone({ x: 100, y: 110, width: 200, height: 100 }, { x: 150, y: 100 }, 10);
    expect(containsPoint(zone, { x: 150, y: 95 })).toBe(true);
    expect(containsPoint(zone, { x: 150, y: 105 })).toBe(true);
    expect(containsPoint(zone, { x: 150, y: 80 })).toBe(false);
  });
});
