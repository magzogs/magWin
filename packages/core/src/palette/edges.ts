/** A side of a window frame. */
export type Edge = 'top' | 'bottom' | 'left' | 'right';

export const EDGES: readonly Edge[] = ['top', 'bottom', 'left', 'right'];

/** Components run along the hovered edge: a row for top/bottom, a column for left/right. */
export type PaletteOrientation = 'row' | 'column';

export function orientationForEdge(edge: Edge): PaletteOrientation {
  return edge === 'top' || edge === 'bottom' ? 'row' : 'column';
}
