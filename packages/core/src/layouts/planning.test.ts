import { describe, expect, it } from 'vitest';
import {
  desktop,
  mainDisplay,
  savedDesktop,
  savedWindow,
  sideDisplay,
  SIDE_UUID,
} from '../test/fixtures';
import { resolveTargetFrame } from './frames';
import type { Layout } from './model';
import { planRestore, resolveDesktop } from './planning';

const desktops = [
  desktop({ spaceId: 1, number: 1, isCurrent: true }),
  desktop({ spaceId: 7, number: 2, spaceUuid: 'D2-UUID' }),
  desktop({ spaceId: 9, number: 3, displayUuid: SIDE_UUID, indexOnDisplay: 1 }),
];

function layoutWith(windows: Layout['windows']): Layout {
  return {
    schemaVersion: 1,
    id: 'l1',
    name: 'Coding',
    createdAt: '2026-09-25T10:00:00.000Z',
    updatedAt: '2026-09-25T10:00:00.000Z',
    displays: [mainDisplay, sideDisplay],
    windows,
  };
}

describe('resolveDesktop', () => {
  it('prefers the space uuid', () => {
    expect(resolveDesktop(savedDesktop(5, { spaceUuid: 'D2-UUID' }), desktops)?.spaceId).toBe(7);
  });

  it('falls back to the position on the same display', () => {
    expect(
      resolveDesktop(savedDesktop(8, { displayUuid: SIDE_UUID, indexOnDisplay: 1 }), desktops)
        ?.spaceId,
    ).toBe(9);
  });

  it('falls back to the global number, then gives up', () => {
    expect(
      resolveDesktop(savedDesktop(2, { displayUuid: 'GONE', indexOnDisplay: 4 }), desktops)
        ?.spaceId,
    ).toBe(7);
    expect(resolveDesktop(savedDesktop(9, { displayUuid: 'GONE' }), desktops)).toBeNull();
  });
});

describe('planRestore', () => {
  const layout = layoutWith([
    savedWindow({ title: 'a', desktop: savedDesktop(1) }),
    savedWindow({ title: 'b', desktop: savedDesktop(2, { spaceUuid: 'D2-UUID' }) }),
    savedWindow({ title: 'c', desktop: savedDesktop(2, { spaceUuid: 'D2-UUID' }) }),
    savedWindow({
      title: 'd',
      desktop: savedDesktop(6, { displayUuid: 'GONE', indexOnDisplay: 6 }),
    }),
    savedWindow({ title: 'e', desktop: null }),
  ]);

  it('groups by target desktop: current first, then highest number first', () => {
    const plan = planRestore(layout, desktops, { onlyDesktopNumber: null });
    expect(
      plan.groups.map((g) => [g.target?.number ?? null, g.windows.map((w) => w.title)]),
    ).toEqual([
      [null, ['d', 'e']],
      [2, ['b', 'c']],
      [1, ['a']],
    ]);
  });

  it('reports desktops that no longer exist', () => {
    const plan = planRestore(layout, desktops, { onlyDesktopNumber: null });
    expect(plan.issues.map((i) => [i.reason, i.windowTitle, i.desktopNumber])).toEqual([
      ['desktopMissing', 'd', 6],
    ]);
  });

  it('restores a single desktop on request', () => {
    const plan = planRestore(layout, desktops, { onlyDesktopNumber: 2 });
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]?.target?.spaceId).toBe(7);
  });
});

describe('resolveTargetFrame', () => {
  it('uses the exact frame on an unchanged display', () => {
    const window = savedWindow({ frame: { x: 10, y: 30, width: 500, height: 400 } });
    expect(resolveTargetFrame(window, [mainDisplay], [mainDisplay])).toEqual({
      x: 10,
      y: 30,
      width: 500,
      height: 400,
    });
  });

  it('scales the relative frame when the display changed size', () => {
    const window = savedWindow({ relativeFrame: { x: 0.5, y: 0, width: 0.5, height: 1 } });
    const resized = { ...mainDisplay, visibleFrame: { x: 0, y: 25, width: 2000, height: 1000 } };
    expect(resolveTargetFrame(window, [mainDisplay], [resized])).toEqual({
      x: 1000,
      y: 25,
      width: 1000,
      height: 1000,
    });
  });

  it('moves windows of a missing display to the main display', () => {
    const window = savedWindow({
      displayUuid: SIDE_UUID,
      relativeFrame: { x: 0, y: 0, width: 1, height: 1 },
    });
    const frame = resolveTargetFrame(window, [mainDisplay, sideDisplay], [mainDisplay]);
    expect(frame).toEqual(mainDisplay.visibleFrame);
  });
});
