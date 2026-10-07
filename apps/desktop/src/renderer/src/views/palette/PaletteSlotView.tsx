import {
  presetLabel,
  rangeToFrame,
  type Cell,
  type GridPreset,
  type PaletteSlot,
  type Rect,
  type ResizeDirection,
  type SelectionState,
} from '@magwin/core';
import type { CSSProperties, ReactNode } from 'react';
import type { PaletteState } from '../../../../shared/contracts';
import { PresetGrid } from './PresetGrid';
import { ResizeArrows } from './ResizeArrows';
import { useI18n } from '../../i18n/I18nContext';

function place(rect: Rect): CSSProperties {
  return { left: rect.x, top: rect.y, width: rect.width, height: rect.height };
}

/** Size the window will get, shown on the apply button's tooltip. */
function resultSize(
  state: PaletteState,
  preset: GridPreset,
  range: Parameters<typeof rangeToFrame>[2],
): string {
  const area = { x: 0, y: 0, ...state.workArea };
  const frame = rangeToFrame(area, preset, range, state.gapPx);
  return `${String(frame.width)} × ${String(frame.height)}`;
}

export interface PaletteSlotViewProps {
  readonly state: PaletteState;
  readonly slot: PaletteSlot;
  readonly preset: GridPreset;
  readonly selection: SelectionState;
  readonly busy: boolean;
  readonly onPointerDown: (presetId: string, cell: Cell, extend: boolean) => void;
  readonly onPointerEnter: (presetId: string, cell: Cell) => void;
  readonly onApply: () => void;
  readonly onResize: (preset: GridPreset, direction: ResizeDirection) => void;
}

/** One component: a header (title left, apply right), the grid, and arrows for the custom grid. */
export function PaletteSlotView(props: PaletteSlotViewProps): ReactNode {
  const { slot, preset, selection } = props;
  const { t } = useI18n();
  const range = selection?.presetId === preset.id ? selection.range : null;
  return (
    <div className="slot">
      <div className="preset-label" style={place(slot.label)}>
        {presetLabel(preset).replace('x', ' × ')}
      </div>
      <PresetGrid
        preset={preset}
        selection={selection}
        style={place(slot.grid)}
        onPointerDown={props.onPointerDown}
        onPointerEnter={props.onPointerEnter}
      />
      <button
        type="button"
        className={`apply primary${range === null ? '' : ' visible'}`}
        style={place(slot.apply)}
        disabled={range === null || props.busy}
        tabIndex={range === null ? -1 : 0}
        aria-hidden={range === null}
        title={range === null ? undefined : resultSize(props.state, preset, range)}
        onClick={props.onApply}
      >
        {t.palette.apply}
      </button>
      {slot.resize === null ? null : (
        <ResizeArrows
          preset={preset}
          rects={slot.resize}
          onResize={(direction) => {
            props.onResize(preset, direction);
          }}
        />
      )}
    </div>
  );
}
