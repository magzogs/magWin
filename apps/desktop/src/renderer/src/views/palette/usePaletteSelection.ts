import { selectionReducer, type Cell, type SelectionState } from '@magwin/core';
import { useCallback, useEffect, useReducer } from 'react';
import type { MagWinApi } from '../../../../shared/api';

export interface PaletteSelectionControls {
  readonly selection: SelectionState;
  readonly pointerDown: (presetId: string, cell: Cell, extend: boolean) => void;
  readonly pointerEnter: (presetId: string, cell: Cell) => void;
  readonly clear: () => void;
}

/** Primitive view of the selection so effects re-run only when the range really changes. */
function rangeParts(
  selection: SelectionState,
): readonly [string | null, number, number, number, number] {
  if (selection === null) {
    return [null, -1, -1, -1, -1];
  }
  const { top, left, bottom, right } = selection.range;
  return [selection.presetId, top, left, bottom, right];
}

/**
 * Binds the pure selection reducer (packages/core) to pointer input and tells the main process
 * about range changes so it can draw the placement preview.
 */
export function usePaletteSelection(palette: MagWinApi['palette']): PaletteSelectionControls {
  const [selection, dispatch] = useReducer(selectionReducer, null);
  const dragging = selection?.dragging ?? false;
  const [presetId, top, left, bottom, right] = rangeParts(selection);

  useEffect(() => {
    palette.selectionChanged(
      presetId === null ? null : { presetId, range: { top, left, bottom, right } },
    );
  }, [palette, presetId, top, left, bottom, right]);

  useEffect(() => {
    palette.interaction(dragging);
    if (!dragging) {
      return;
    }
    // Releasing the button anywhere (even outside the palette) ends the drag.
    const end = (): void => {
      dispatch({ type: 'pointerUp' });
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('blur', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('blur', end);
    };
  }, [dragging, palette]);

  const pointerDown = useCallback((id: string, cell: Cell, extend: boolean) => {
    dispatch({ type: 'pointerDown', presetId: id, cell, extend });
  }, []);
  const pointerEnter = useCallback((id: string, cell: Cell) => {
    dispatch({ type: 'pointerEnter', presetId: id, cell });
  }, []);
  const clear = useCallback(() => {
    dispatch({ type: 'clear' });
  }, []);

  return { selection, pointerDown, pointerEnter, clear };
}
