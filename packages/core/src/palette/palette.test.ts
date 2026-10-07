import { describe, expect, it } from 'vitest';
import { containsPoint } from '../geometry/geometry';
import { CUSTOM_PRESET_ID, DEFAULT_PRESETS, isCustomPreset } from '../grid/presets';
import { orientationForEdge } from './edges';
import {
  computePaletteLayout,
  DEFAULT_PALETTE_METRICS,
  type PaletteLayout,
  type PaletteSlot,
} from './layout';
import { keepOpenZone, PALETTE_EDGE_OFFSET, placePalette } from './placement';

const metrics = DEFAULT_PALETTE_METRICS;
const FIXED = DEFAULT_PRESETS.filter((p) => !isCustomPreset(p));

function slotOf(layout: PaletteLayout, index: number): PaletteSlot {
  const slot = layout.slots[index];
  if (slot === undefined) {
    throw new Error(`No slot ${String(index)}`);
  }
  return slot;
}

describe('computePaletteLayout', () => {
  it('lays components out in a row with the title left and apply right above each grid', () => {
    const layout = computePaletteLayout({
      presets: FIXED,
      edge: 'top',
      aspectRatio: 16 / 10,
      metrics,
    });
    expect(layout.orientation).toBe('row');
    expect(layout.slots).toHaveLength(4);
    const first = slotOf(layout, 0);
    expect(first.grid.height).toBe(65);
    expect(slotOf(layout, 1).grid.x).toBe(metrics.padding + metrics.componentWidth + metrics.gap);
    expect(first.label.x).toBe(first.grid.x);
    expect(first.apply.y).toBe(first.label.y);
    expect(first.apply.x + metrics.applyWidth).toBe(first.grid.x + metrics.componentWidth);
    expect(first.label.x + first.label.width).toBeLessThan(first.apply.x);
    expect(first.apply.y + metrics.headerHeight).toBeLessThan(first.grid.y);
    expect(first.resize).toBeNull();
    expect(layout.size.width).toBe(12 * 2 + 4 * 104 + 3 * 14);
    expect(first.grid.y + 65 + metrics.padding).toBe(layout.size.height);
  });

  it('keeps the same header layout in a column, whichever side edge was hovered', () => {
    const left = computePaletteLayout({ presets: FIXED, edge: 'left', aspectRatio: 1.6, metrics });
    const right = computePaletteLayout({
      presets: FIXED,
      edge: 'right',
      aspectRatio: 1.6,
      metrics,
    });
    expect(left.orientation).toBe('column');
    expect(left).toEqual(right);
    const first = slotOf(left, 0);
    expect(first.apply.y).toBe(first.label.y);
    expect(slotOf(left, 1).label.y).toBe(first.grid.y + first.grid.height + metrics.gap);
    expect(left.size.width).toBe(12 * 2 + 104);
  });

  it('puts arrow buttons outside the custom grid and keeps every grid aligned', () => {
    const row = computePaletteLayout({
      presets: DEFAULT_PRESETS,
      edge: 'bottom',
      aspectRatio: 1.6,
      metrics,
    });
    const a = metrics.arrowSize;
    const custom = slotOf(row, 4);
    const { grid, resize } = custom;
    expect(custom.presetId).toBe(CUSTOM_PRESET_ID);
    expect(grid.y).toBe(slotOf(row, 0).grid.y);
    expect(resize?.up).toEqual({
      x: grid.x + (grid.width - metrics.arrowLength) / 2,
      y: grid.y - a,
      width: metrics.arrowLength,
      height: a,
    });
    expect(resize?.down.y).toBe(grid.y + grid.height);
    expect(resize?.left.x).toBe(grid.x - a);
    expect(resize?.right.x).toBe(grid.x + grid.width);
    expect(grid.y - a).toBeGreaterThanOrEqual(custom.label.y + metrics.headerHeight);
    expect(row.size.width).toBe(12 * 2 + 5 * 104 + 4 * 14 + 2 * a);
    expect(grid.x + grid.width + a + metrics.padding).toBe(row.size.width);
    expect(grid.y + grid.height + a + metrics.padding).toBe(row.size.height);

    const column = computePaletteLayout({
      presets: DEFAULT_PRESETS,
      edge: 'left',
      aspectRatio: 1.6,
      metrics,
    });
    const last = slotOf(column, 4);
    expect(slotOf(column, 0).grid.x).toBe(last.grid.x);
    expect(column.size.width).toBe(12 * 2 + 104 + 2 * a);
    expect(last.grid.y + last.grid.height + a + metrics.padding).toBe(column.size.height);
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
