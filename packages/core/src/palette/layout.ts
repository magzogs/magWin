import type { Rect, Size } from '../geometry/geometry';
import type { GridPreset } from '../grid/presets';
import { orientationForEdge, type Edge, type PaletteOrientation } from './edges';

/** Pixel metrics of the palette. Only `componentWidth` is user configurable. */
export interface PaletteMetrics {
  readonly componentWidth: number;
  readonly labelHeight: number;
  /** Space between components. */
  readonly gap: number;
  readonly padding: number;
  /** Space between a grid and its label or apply button. */
  readonly innerGap: number;
  readonly applyWidth: number;
  readonly applyHeight: number;
}

export const DEFAULT_PALETTE_METRICS: PaletteMetrics = {
  componentWidth: 104,
  labelHeight: 16,
  gap: 14,
  padding: 12,
  innerGap: 6,
  applyWidth: 64,
  applyHeight: 26,
};

/** Rectangles are relative to the palette's top-left corner. */
export interface PaletteSlot {
  readonly presetId: string;
  readonly label: Rect;
  readonly grid: Rect;
  readonly apply: Rect;
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

/** Row layout: the apply button sits below each grid. */
function rowLayout(input: PaletteLayoutInput, height: number): PaletteLayout {
  const m = input.metrics;
  const gridTop = m.padding + m.labelHeight + m.innerGap;
  const applyTop = gridTop + height + m.innerGap;
  const slots = input.presets.map((preset, index): PaletteSlot => {
    const x = m.padding + index * (m.componentWidth + m.gap);
    return {
      presetId: preset.id,
      label: { x, y: m.padding, width: m.componentWidth, height: m.labelHeight },
      grid: { x, y: gridTop, width: m.componentWidth, height },
      apply: {
        x: x + (m.componentWidth - m.applyWidth) / 2,
        y: applyTop,
        width: m.applyWidth,
        height: m.applyHeight,
      },
    };
  });
  const count = input.presets.length;
  return {
    orientation: 'row',
    size: {
      width: m.padding * 2 + count * m.componentWidth + Math.max(0, count - 1) * m.gap,
      height: applyTop + m.applyHeight + m.padding,
    },
    slots,
  };
}

/**
 * Column layout: the apply button sits beside each grid, on the side facing away from
 * the hovered edge (right of the grid for the left edge, left of it for the right edge).
 */
function columnLayout(input: PaletteLayoutInput, height: number): PaletteLayout {
  const m = input.metrics;
  const applyFirst = input.edge === 'right';
  const gridX = applyFirst ? m.padding + m.applyWidth + m.innerGap : m.padding;
  const applyX = applyFirst ? m.padding : m.padding + m.componentWidth + m.innerGap;
  const slotHeight = m.labelHeight + m.innerGap + height;
  const slots = input.presets.map((preset, index): PaletteSlot => {
    const y = m.padding + index * (slotHeight + m.gap);
    const gridTop = y + m.labelHeight + m.innerGap;
    return {
      presetId: preset.id,
      label: { x: gridX, y, width: m.componentWidth, height: m.labelHeight },
      grid: { x: gridX, y: gridTop, width: m.componentWidth, height },
      apply: {
        x: applyX,
        y: gridTop + (height - m.applyHeight) / 2,
        width: m.applyWidth,
        height: m.applyHeight,
      },
    };
  });
  const count = input.presets.length;
  return {
    orientation: 'column',
    size: {
      width: m.padding * 2 + m.componentWidth + m.innerGap + m.applyWidth,
      height: m.padding * 2 + count * slotHeight + Math.max(0, count - 1) * m.gap,
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
