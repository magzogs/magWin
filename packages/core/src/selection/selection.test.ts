import { describe, expect, it } from 'vitest';
import {
  isCellSelected,
  selectedRangeFor,
  selectionReducer,
  type SelectionAction,
  type SelectionState,
} from './selection';

function run(actions: readonly SelectionAction[], initial: SelectionState = null): SelectionState {
  return actions.reduce(selectionReducer, initial);
}

const down = (presetId: string, row: number, col: number, extend = false): SelectionAction => ({
  type: 'pointerDown',
  presetId,
  cell: { row, col },
  extend,
});
const enter = (presetId: string, row: number, col: number): SelectionAction => ({
  type: 'pointerEnter',
  presetId,
  cell: { row, col },
});
const up: SelectionAction = { type: 'pointerUp' };

describe('selectionReducer', () => {
  it('selects a single cell on click', () => {
    const state = run([down('3x3', 1, 1), up]);
    expect(state?.range).toEqual({ top: 1, left: 1, bottom: 1, right: 1 });
    expect(state?.dragging).toBe(false);
  });

  it('selects the rectangle spanned by a drag', () => {
    const state = run([down('3x3', 0, 0), enter('3x3', 0, 1), enter('3x3', 1, 2), up]);
    expect(state?.range).toEqual({ top: 0, left: 0, bottom: 1, right: 2 });
  });

  it('keeps the selection rectangular for diagonal drags', () => {
    const state = run([down('4x4', 3, 0), enter('4x4', 2, 1), enter('4x4', 1, 2)]);
    expect(state?.range).toEqual({ top: 1, left: 0, bottom: 3, right: 2 });
  });

  it('shrinks when the drag comes back, like a spreadsheet', () => {
    const state = run([down('3x3', 0, 0), enter('3x3', 2, 2), enter('3x3', 1, 1), up]);
    expect(state?.range).toEqual({ top: 0, left: 0, bottom: 1, right: 1 });
  });

  it('ignores drags into another component', () => {
    const state = run([down('3x3', 0, 0), enter('2x2', 1, 1), up]);
    expect(state?.presetId).toBe('3x3');
    expect(state?.range).toEqual({ top: 0, left: 0, bottom: 0, right: 0 });
  });

  it('replaces the selection when another component is pressed', () => {
    const first = run([down('3x3', 0, 0), enter('3x3', 1, 1), up]);
    const second = run([down('2x2', 1, 0), up], first);
    expect(second?.presetId).toBe('2x2');
    expect(selectedRangeFor(second, '3x3')).toBeNull();
  });

  it('starts a new single-cell selection when clicking another cell without shift', () => {
    const state = run([down('3x3', 0, 0), enter('3x3', 1, 1), up, down('3x3', 2, 2), up]);
    expect(state?.range).toEqual({ top: 2, left: 2, bottom: 2, right: 2 });
  });

  it('extends from the anchor with shift-click', () => {
    const state = run([down('3x3', 0, 0), up, down('3x3', 2, 1, true), up]);
    expect(state?.range).toEqual({ top: 0, left: 0, bottom: 2, right: 1 });
  });

  it('deselects when the only selected cell is clicked again', () => {
    const state = run([down('3x3', 1, 1), up, down('3x3', 1, 1), up]);
    expect(state).toBeNull();
  });

  it('keeps the selection when a press on the selected cell turns into a drag', () => {
    const state = run([down('3x3', 1, 1), up, down('3x3', 1, 1), enter('3x3', 1, 2), up]);
    expect(state?.range).toEqual({ top: 1, left: 1, bottom: 1, right: 2 });
  });

  it('ignores hover without a pressed pointer', () => {
    const state = run([down('3x3', 0, 0), up, enter('3x3', 2, 2)]);
    expect(state?.range).toEqual({ top: 0, left: 0, bottom: 0, right: 0 });
  });

  it('clears on demand', () => {
    expect(run([down('3x3', 0, 0), { type: 'clear' }])).toBeNull();
  });

  it('reports selected cells per component', () => {
    const state = run([down('3x2', 1, 0), enter('3x2', 1, 1), up]);
    expect(isCellSelected(state, '3x2', { row: 1, col: 1 })).toBe(true);
    expect(isCellSelected(state, '3x2', { row: 0, col: 1 })).toBe(false);
    expect(isCellSelected(state, '2x2', { row: 1, col: 1 })).toBe(false);
  });
});
