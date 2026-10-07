import { canResize, type GridPreset, type Rect, type ResizeDirection } from '@magwin/core';
import type { ReactNode } from 'react';

const DIRECTIONS: readonly ResizeDirection[] = ['up', 'down', 'left', 'right'];

const LABELS: Readonly<Record<ResizeDirection, string>> = {
  up: '행 줄이기',
  down: '행 추가',
  left: '열 줄이기',
  right: '열 추가',
};

export interface ResizeArrowsProps {
  readonly preset: GridPreset;
  readonly rects: Readonly<Record<ResizeDirection, Rect>>;
  onResize(direction: ResizeDirection): void;
}

/**
 * Outward-pointing triangles around the custom grid: right/down add a column/row,
 * left/up remove one. An arrow at the grid's limit is disabled.
 */
export function ResizeArrows(props: ResizeArrowsProps): ReactNode {
  return DIRECTIONS.map((direction) => {
    const rect = props.rects[direction];
    return (
      <button
        key={direction}
        type="button"
        className={`resize-arrow ${direction}`}
        style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        aria-label={LABELS[direction]}
        title={LABELS[direction]}
        disabled={!canResize(props.preset, direction)}
        onPointerDown={(event) => {
          // Keep focus and selection where they are; the click does the work.
          event.preventDefault();
        }}
        onClick={() => {
          props.onResize(direction);
        }}
      />
    );
  });
}
