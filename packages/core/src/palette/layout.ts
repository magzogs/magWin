import type { Rect, Size } from '../geometry/geometry';
import { isCustomPreset, type GridPreset, type ResizeDirection } from '../grid/presets';
import { orientationForEdge, type Edge, type PaletteOrientation } from './edges';

/** Pixel metrics of the palette. Only `componentWidth` is user configurable. */
export interface PaletteMetrics {
  readonly componentWidth: number;
  /** Row above each grid holding the title (left) and the apply button (right). */
  readonly headerHeight: number;
  /** Space between components. */
  readonly gap: number;
  readonly padding: number;
  /** Space between a header and its grid, and between a title and its apply button. */
  readonly innerGap: number;
  readonly applyWidth: number;
  /** Thickness of the band around the custom grid that holds its arrow buttons. */
  readonly arrowSize: number;
  /** Length of an arrow button along the grid side it sits on. */
  readonly arrowLength: number;
}

export const DEFAULT_PALETTE_METRICS: PaletteMetrics = {
  componentWidth: 104,
  headerHeight: 22,
  gap: 14,
  padding: 12,
  innerGap: 6,
  applyWidth: 48,
  arrowSize: 14,
  arrowLength: 28,
};

/** Rectangles are relative to the palette's top-left corner. */
export interface PaletteSlot {
  readonly presetId: string;
  readonly label: Rect;
  readonly grid: Rect;
  readonly apply: Rect;
  /** Arrow buttons around the grid; only the custom preset has them. */
  readonly resize: Readonly<Record<ResizeDirection, Rect>> | null;
}

export interface PaletteLayout {
  readonly orientation: PaletteOrientation;
  readonly size: Size;
  readonly slots: readonly PaletteSlot[];
}

export interface PaletteLayoutInput {
  readonly presets: readonly GridPreset[];
  readonly edge: Edge;
  /** Width / height of the target display's work area; grids mirror its shape. */
  readonly aspectRatio: number;
  readonly metrics: PaletteMetrics;
}

function gridHeight(metrics: PaletteMetrics, aspectRatio: number): number {
  const clamped = Math.min(4, Math.max(0.3, aspectRatio));
  return Math.round(metrics.componentWidth / clamped);
}

/** The arrow band, or 0 when the preset has no arrows. */
function band(preset: GridPreset, m: PaletteMetrics): number {
  return isCustomPreset(preset) ? m.arrowSize : 0;
}

function resizeRects(grid: Rect, m: PaletteMetrics): Record<ResizeDirection, Rect> {
  const a = m.arrowSize;
  const centreX = grid.x + (grid.width - m.arrowLength) / 2;
  const centreY = grid.y + (grid.height - m.arrowLength) / 2;
  return {
    up: { x: centreX, y: grid.y - a, width: m.arrowLength, height: a },
    down: { x: centreX, y: grid.y + grid.height, width: m.arrowLength, height: a },
    left: { x: grid.x - a, y: centreY, width: a, height: m.arrowLength },
    right: { x: grid.x + grid.width, y: centreY, width: a, height: m.arrowLength },
  };
}

/** Title on the left of the header row, apply button on its right, both above the grid. */
function slotAt(preset: GridPreset, grid: Rect, headerY: number, m: PaletteMetrics): PaletteSlot {
  return {
    presetId: preset.id,
    label: {
      x: grid.x,
      y: headerY,
      width: grid.width - m.applyWidth - m.innerGap,
      height: m.headerHeight,
    },
    grid,
    apply: {
      x: grid.x + grid.width - m.applyWidth,
      y: headerY,
      width: m.applyWidth,
      height: m.headerHeight,
    },
    resize: isCustomPreset(preset) ? resizeRects(grid, m) : null,
  };
}

/**
 * Row layout. Grids share one top line; when a custom grid is present, every grid leaves the
 * arrow band above and below it so they stay aligned, and the custom slot is wider by its
 * left/right bands.
 */
function rowLayout(input: PaletteLayoutInput, height: number): PaletteLayout {
  const m = input.metrics;
  const crossBand = Math.max(0, ...input.presets.map((p) => band(p, m)));
  const gridTop = m.padding + m.headerHeight + Math.max(m.innerGap, crossBand);
  let x = m.padding;
  const slots = input.presets.map((preset): PaletteSlot => {
    const lead = band(preset, m);
    const grid = { x: x + lead, y: gridTop, width: m.componentWidth, height };
    x += lead * 2 + m.componentWidth + m.gap;
    return slotAt(preset, grid, m.padding, m);
  });
  return {
    orientation: 'row',
    size: {
      width: x - (slots.length > 0 ? m.gap : 0) + m.padding,
      height: gridTop + height + crossBand + m.padding,
    },
    slots,
  };
}

/**
 * Column layout. Grids share one left line; when a custom grid is present, every grid leaves
 * the arrow band on both sides, and the custom slot is taller by its up/down bands.
 */
function columnLayout(input: PaletteLayoutInput, height: number): PaletteLayout {
  const m = input.metrics;
  const crossBand = Math.max(0, ...input.presets.map((p) => band(p, m)));
  const gridX = m.padding + crossBand;
  let y = m.padding;
  const slots = input.presets.map((preset): PaletteSlot => {
    const lead = band(preset, m);
    const headerY = y;
    const grid = {
      x: gridX,
      y: headerY + m.headerHeight + Math.max(m.innerGap, lead),
      width: m.componentWidth,
      height,
    };
    y = grid.y + height + lead + m.gap;
    return slotAt(preset, grid, headerY, m);
  });
  return {
    orientation: 'column',
    size: {
      width: m.padding * 2 + crossBand * 2 + m.componentWidth,
      height: y - (slots.length > 0 ? m.gap : 0) + m.padding,
    },
    slots,
  };
}

export function computePaletteLayout(input: PaletteLayoutInput): PaletteLayout {
  const height = gridHeight(input.metrics, input.aspectRatio);
  return orientationForEdge(input.edge) === 'row'
    ? rowLayout(input, height)
    : columnLayout(input, height);
}
