import { isCellSelected, type Cell, type GridPreset, type SelectionState } from '@magwin/core';
import type { CSSProperties, ReactNode } from 'react';

export interface PresetGridProps {
  readonly preset: GridPreset;
  readonly selection: SelectionState;
  readonly style: CSSProperties;
  onPointerDown(presetId: string, cell: Cell, extend: boolean): void;
  onPointerEnter(presetId: string, cell: Cell): void;
}

/** One grid component: a miniature of the display split into `cols` × `rows` cells. */
export function PresetGrid(props: PresetGridProps): ReactNode {
  const { preset, selection } = props;
  const active = selection?.presetId === preset.id;
  const cells: Cell[] = [];
  for (let row = 0; row < preset.rows; row += 1) {
    for (let col = 0; col < preset.cols; col += 1) {
      cells.push({ row, col });
    }
  }
  return (
    <div
      className={`preset-grid${active ? ' active' : ''}`}
      role="grid"
      aria-label={`${String(preset.cols)} × ${String(preset.rows)} 그리드`}
      style={{
        ...props.style,
        gridTemplateColumns: `repeat(${String(preset.cols)}, 1fr)`,
        gridTemplateRows: `repeat(${String(preset.rows)}, 1fr)`,
      }}
    >
      {cells.map((cell) => {
        const selected = isCellSelected(selection, preset.id, cell);
        return (
          <div
            key={`${String(cell.row)}-${String(cell.col)}`}
            role="gridcell"
            aria-selected={selected}
            data-testid={`cell-${preset.id}-${String(cell.row)}-${String(cell.col)}`}
            className={`cell${selected ? ' selected' : ''}`}
            onPointerDown={(event) => {
              event.preventDefault();
              props.onPointerDown(preset.id, cell, event.shiftKey);
            }}
            onPointerEnter={() => {
              props.onPointerEnter(preset.id, cell);
            }}
          />
        );
      })}
    </div>
  );
}
