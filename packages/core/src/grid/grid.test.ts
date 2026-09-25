import { describe, expect, it } from 'vitest';
import {
  isRangeWithin,
  isSingleCell,
  rangeContains,
  rangeFromCells,
  rangeSize,
  rangeToFrame,
} from './cells';
import { createPreset, DEFAULT_PRESETS, presetLabel } from './presets';

const workArea = { x: 0, y: 25, width: 1440, height: 875 };
const threeByTwo = { id: '3x2', cols: 3, rows: 2 };

describe('presets', () => {
  it('ships the presets from the feature description, cols x rows', () => {
    expect(DEFAULT_PRESETS.map(presetLabel)).toEqual(['2x2', '2x3', '3x2', '3x3', '4x4']);
    expect(DEFAULT_PRESETS[2]).toEqual({ id: '3x2', cols: 3, rows: 2 });
  });

  it('validates dimensions', () => {
    expect(createPreset(3, 2)).toEqual({ ok: true, value: threeByTwo });
    expect(createPreset(0, 2).ok).toBe(false);
    expect(createPreset(9, 2).ok).toBe(false);
    expect(createPreset(2.5, 2).ok).toBe(false);
  });
});

describe('cell ranges', () => {
  it('normalises any two cells into a rectangle', () => {
    expect(rangeFromCells({ row: 1, col: 2 }, { row: 0, col: 0 })).toEqual({
      top: 0,
      left: 0,
      bottom: 1,
      right: 2,
    });
  });

  it('answers containment, size and bounds questions', () => {
    const range = rangeFromCells({ row: 0, col: 1 }, { row: 1, col: 2 });
    expect(rangeContains(range, { row: 1, col: 1 })).toBe(true);
    expect(rangeContains(range, { row: 1, col: 0 })).toBe(false);
    expect(rangeSize(range)).toEqual({ rows: 2, cols: 2 });
    expect(isSingleCell(range)).toBe(false);
    expect(isRangeWithin(range, threeByTwo)).toBe(true);
    expect(isRangeWithin({ top: 0, left: 0, bottom: 2, right: 0 }, threeByTwo)).toBe(false);
  });
});

describe('rangeToFrame', () => {
  it('maps a single cell into the work area', () => {
    expect(
      rangeToFrame(workArea, threeByTwo, rangeFromCells({ row: 0, col: 0 }, { row: 0, col: 0 })),
    ).toEqual({
      x: 0,
      y: 25,
      width: 480,
      height: 438,
    });
  });

  it('keeps neighbouring blocks flush despite rounding', () => {
    const left = rangeToFrame(workArea, threeByTwo, { top: 1, left: 0, bottom: 1, right: 0 });
    const right = rangeToFrame(workArea, threeByTwo, { top: 1, left: 1, bottom: 1, right: 2 });
    expect(left.x + left.width).toBe(right.x);
    expect(right.x + right.width).toBe(workArea.x + workArea.width);
    expect(left.y + left.height).toBe(workArea.y + workArea.height);
  });

  it('covers the whole work area when every cell is selected', () => {
    expect(rangeToFrame(workArea, threeByTwo, { top: 0, left: 0, bottom: 1, right: 2 })).toEqual(
      workArea,
    );
  });

  it('applies the gap at screen edges and between windows', () => {
    const gap = 10;
    const a = rangeToFrame(workArea, threeByTwo, { top: 0, left: 0, bottom: 0, right: 0 }, gap);
    const b = rangeToFrame(workArea, threeByTwo, { top: 0, left: 1, bottom: 0, right: 1 }, gap);
    expect(a.x).toBe(workArea.x + gap);
    expect(a.y).toBe(workArea.y + gap);
    expect(b.x - (a.x + a.width)).toBe(gap);
  });

  it('keeps odd gaps exact between windows', () => {
    const gap = 7;
    const a = rangeToFrame(workArea, threeByTwo, { top: 0, left: 0, bottom: 0, right: 0 }, gap);
    const b = rangeToFrame(workArea, threeByTwo, { top: 0, left: 1, bottom: 0, right: 1 }, gap);
    expect(b.x - (a.x + a.width)).toBe(gap);
  });
});
