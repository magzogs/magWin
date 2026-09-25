import {
  isSingleCell,
  rangeContains,
  rangeFromCells,
  rangesEqual,
  type Cell,
  type CellRange,
} from '../grid/cells';

/**
 * Selection inside the edge palette. Exactly one preset (component) can own a selection;
 * the range is always a rectangle because it is derived from two corner cells.
 * See docs/docs/architecture/grid-selection.md.
 */
export interface GridSelection {
  readonly presetId: string;
  /** Cell where the current press started; drags and shift-clicks extend from here. */
  readonly anchor: Cell;
  readonly range: CellRange;
  readonly dragging: boolean;
  /** True while a press on the only selected cell may still turn into a "deselect" click. */
  readonly toggleCandidate: boolean;
}

export type SelectionState = GridSelection | null;

export type SelectionAction =
  | {
      readonly type: 'pointerDown';
      readonly presetId: string;
      readonly cell: Cell;
      readonly extend: boolean;
    }
  | { readonly type: 'pointerEnter'; readonly presetId: string; readonly cell: Cell }
  | { readonly type: 'pointerUp' }
  | { readonly type: 'clear' };

function freshSelection(presetId: string, cell: Cell): GridSelection {
  return {
    presetId,
    anchor: cell,
    range: rangeFromCells(cell, cell),
    dragging: true,
    toggleCandidate: false,
  };
}

function onPointerDown(
  state: SelectionState,
  action: Extract<SelectionAction, { type: 'pointerDown' }>,
): SelectionState {
  if (state?.presetId !== action.presetId) {
    // A press in another component replaces the old selection entirely.
    return freshSelection(action.presetId, action.cell);
  }
  if (action.extend) {
    return {
      ...state,
      range: rangeFromCells(state.anchor, action.cell),
      dragging: true,
      toggleCandidate: false,
    };
  }
  if (isSingleCell(state.range) && rangeContains(state.range, action.cell)) {
    return { ...state, dragging: true, toggleCandidate: true };
  }
  return freshSelection(action.presetId, action.cell);
}

function onPointerEnter(
  state: SelectionState,
  action: Extract<SelectionAction, { type: 'pointerEnter' }>,
): SelectionState {
  if (state === null || !state.dragging || state.presetId !== action.presetId) {
    return state;
  }
  const range = rangeFromCells(state.anchor, action.cell);
  if (rangesEqual(range, state.range)) {
    return state;
  }
  return { ...state, range, toggleCandidate: false };
}

function onPointerUp(state: SelectionState): SelectionState {
  if (state === null) {
    return null;
  }
  if (state.toggleCandidate) {
    return null;
  }
  return state.dragging ? { ...state, dragging: false } : state;
}

export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case 'pointerDown':
      return onPointerDown(state, action);
    case 'pointerEnter':
      return onPointerEnter(state, action);
    case 'pointerUp':
      return onPointerUp(state);
    case 'clear':
      return null;
  }
}

export function selectedRangeFor(state: SelectionState, presetId: string): CellRange | null {
  return state?.presetId === presetId ? state.range : null;
}

export function isCellSelected(state: SelectionState, presetId: string, cell: Cell): boolean {
  const range = selectedRangeFor(state, presetId);
  return range !== null && rangeContains(range, cell);
}
