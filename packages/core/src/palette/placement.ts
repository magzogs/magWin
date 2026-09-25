import {
  clampRectInto,
  inflate,
  rectBottom,
  rectRight,
  union,
  type Point,
  type Rect,
  type Size,
} from '../geometry/geometry';
import type { Edge } from './edges';

export interface PlacementInput {
  readonly edge: Edge;
  /** Cursor position when the hover fired. */
  readonly point: Point;
  readonly windowFrame: Rect;
  /** Work area of the display under the cursor; the palette never leaves it. */
  readonly workArea: Rect;
  readonly size: Size;
}

/** Distance between the hovered edge and the palette. Small, so the cursor reaches it at once. */
export const PALETTE_EDGE_OFFSET = 6;
const SCREEN_MARGIN = 4;

function unclamped(input: PlacementInput): Rect {
  const { edge, point, windowFrame, size } = input;
  switch (edge) {
    case 'top':
      return {
        x: point.x - size.width / 2,
        y: windowFrame.y + PALETTE_EDGE_OFFSET,
        ...size,
      };
    case 'bottom':
      return {
        x: point.x - size.width / 2,
        y: rectBottom(windowFrame) - PALETTE_EDGE_OFFSET - size.height,
        ...size,
      };
    case 'left':
      return {
        x: windowFrame.x + PALETTE_EDGE_OFFSET,
        y: point.y - size.height / 2,
        ...size,
      };
    case 'right':
      return {
        x: rectRight(windowFrame) - PALETTE_EDGE_OFFSET - size.width,
        y: point.y - size.height / 2,
        ...size,
      };
  }
}

/** Places the palette just inside the hovered edge, centred on the cursor, within the screen. */
export function placePalette(input: PlacementInput): Rect {
  const bounds = inflate(input.workArea, -SCREEN_MARGIN);
  const placed = clampRectInto(unclamped(input), bounds);
  return {
    x: Math.round(placed.x),
    y: Math.round(placed.y),
    width: placed.width,
    height: placed.height,
  };
}

/**
 * Area in which the cursor keeps the palette open: the palette, the trigger point and the
 * corridor between them, plus a margin for imprecise mouse movement.
 */
export function keepOpenZone(paletteBounds: Rect, triggerPoint: Point, margin: number): Rect {
  const pointBox = { x: triggerPoint.x, y: triggerPoint.y, width: 0, height: 0 };
  return inflate(union(paletteBounds, pointBox), margin);
}
