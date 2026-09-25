import { describe, expect, it } from 'vitest';
import {
  clampRectInto,
  containsPoint,
  fromRelative,
  inflate,
  intersection,
  overlapRatio,
  rectsEqual,
  roundRect,
  toRelative,
  union,
} from './geometry';

const screen = { x: 0, y: 0, width: 1000, height: 800 };

describe('geometry', () => {
  it('treats points on the border as inside', () => {
    expect(containsPoint(screen, { x: 0, y: 0 })).toBe(true);
    expect(containsPoint(screen, { x: 1000, y: 800 })).toBe(true);
    expect(containsPoint(screen, { x: 1000.5, y: 10 })).toBe(false);
  });

  it('inflates in every direction', () => {
    expect(inflate({ x: 10, y: 10, width: 20, height: 20 }, 5)).toEqual({
      x: 5,
      y: 5,
      width: 30,
      height: 30,
    });
  });

  it('builds the bounding union', () => {
    expect(
      union({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 5, width: 10, height: 10 }),
    ).toEqual({ x: 0, y: 0, width: 30, height: 15 });
  });

  it('returns null when rectangles only touch', () => {
    expect(
      intersection({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 5, height: 5 }),
    ).toBeNull();
  });

  it('computes overlap ratio as intersection over union', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(overlapRatio(a, a)).toBe(1);
    expect(overlapRatio(a, { x: 5, y: 0, width: 10, height: 10 })).toBeCloseTo(50 / 150);
    expect(overlapRatio(a, { x: 50, y: 50, width: 1, height: 1 })).toBe(0);
  });

  it('clamps a rectangle into bounds and shrinks when it is too large', () => {
    expect(clampRectInto({ x: 950, y: -20, width: 100, height: 100 }, screen)).toEqual({
      x: 900,
      y: 0,
      width: 100,
      height: 100,
    });
    expect(clampRectInto({ x: -5, y: 0, width: 2000, height: 10 }, screen)).toEqual({
      x: 0,
      y: 0,
      width: 1000,
      height: 10,
    });
  });

  it('round-trips relative coordinates', () => {
    const frame = { x: 100, y: 50, width: 800, height: 600 };
    const r = { x: 300, y: 200, width: 200, height: 150 };
    const rel = toRelative(r, frame);
    expect(rel).toEqual({ x: 0.25, y: 0.25, width: 0.25, height: 0.25 });
    expect(fromRelative(rel, frame)).toEqual(r);
  });

  it('rounds edges instead of sizes so neighbours stay flush', () => {
    expect(roundRect({ x: 0.4, y: 0.6, width: 10.3, height: 10.3 })).toEqual({
      x: 0,
      y: 1,
      width: 11,
      height: 10,
    });
  });

  it('compares with tolerance', () => {
    expect(rectsEqual(screen, { x: 1, y: 0, width: 999, height: 800 }, 1)).toBe(true);
    expect(rectsEqual(screen, { x: 2, y: 0, width: 999, height: 800 }, 1)).toBe(false);
  });
});
