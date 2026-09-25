import type { Rect } from '../geometry/geometry';
import type { GridPreset } from './presets';

export interface Cell {
  readonly row: number;
  readonly col: number;
}

/** An inclusive, always rectangular block of cells. */
export interface CellRange {
  readonly top: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
}

/** The smallest rectangle containing both cells, so any two cells yield a valid selection. */
export function rangeFromCells(a: Cell, b: Cell): CellRange {
  return {
    top: Math.min(a.row, b.row),
    left: Math.min(a.col, b.col),
    bottom: Math.max(a.row, b.row),
    right: Math.max(a.col, b.col),
  };
}

export function rangeContains(range: CellRange, cell: Cell): boolean {
  return (
    cell.row >= range.top &&
    cell.row <= range.bottom &&
    cell.col >= range.left &&
    cell.col <= range.right
  );
}

export function rangesEqual(a: CellRange, b: CellRange): boolean {
  return a.top === b.top && a.left === b.left && a.bottom === b.bottom && a.right === b.right;
}

export function isSingleCell(range: CellRange): boolean {
  return range.top === range.bottom && range.left === range.right;
}

export function rangeSize(range: CellRange): { readonly rows: number; readonly cols: number } {
  return { rows: range.bottom - range.top + 1, cols: range.right - range.left + 1 };
}

export function isRangeWithin(range: CellRange, preset: GridPreset): boolean {
  return (
    range.top >= 0 &&
    range.left >= 0 &&
    range.bottom < preset.rows &&
    range.right < preset.cols &&
    range.top <= range.bottom &&
    range.left <= range.right
  );
}

function boundary(start: number, length: number, index: number, divisions: number): number {
  return start + Math.round((index * length) / divisions);
}

/**
 * Converts a cell block to a screen frame inside `workArea`.
 * Boundaries are rounded once per grid line so neighbouring blocks share edges exactly.
 * `gap` is kept between windows and between windows and the screen edge.
 */
export function rangeToFrame(workArea: Rect, preset: GridPreset, range: CellRange, gap = 0): Rect {
  const leadingInner = Math.floor(gap / 2);
  const trailingInner = Math.ceil(gap / 2);
  const left =
    boundary(workArea.x, workArea.width, range.left, preset.cols) +
    (range.left === 0 ? gap : trailingInner);
  const right =
    boundary(workArea.x, workArea.width, range.right + 1, preset.cols) -
    (range.right === preset.cols - 1 ? gap : leadingInner);
  const top =
    boundary(workArea.y, workArea.height, range.top, preset.rows) +
    (range.top === 0 ? gap : trailingInner);
  const bottom =
    boundary(workArea.y, workArea.height, range.bottom + 1, preset.rows) -
    (range.bottom === preset.rows - 1 ? gap : leadingInner);
  return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}
