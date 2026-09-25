import { describe, expect, it } from 'vitest';
import { makeWorld } from '../test/world';
import { SnapService } from './SnapService';

const workArea = { x: 0, y: 25, width: 1440, height: 875 };
const preset = { id: '3x2', cols: 3, rows: 2 };

describe('SnapService', () => {
  it('moves the window onto the selected cells and focuses it', async () => {
    const world = makeWorld();
    const snap = new SnapService(world);
    const result = await snap.apply({
      target: { windowId: 42, pid: 7 },
      preset,
      range: { top: 0, left: 1, bottom: 1, right: 2 },
      workArea,
      gapPx: 0,
    });
    expect(result).toEqual({ ok: true, value: { x: 480, y: 25, width: 960, height: 875 } });
    expect(world.frames).toEqual([
      { windowId: 42, frame: { x: 480, y: 25, width: 960, height: 875 } },
    ]);
    expect(world.focused).toEqual([42]);
  });

  it('rejects ranges outside the grid without touching the window', async () => {
    const world = makeWorld();
    const result = await new SnapService(world).apply({
      target: { windowId: 42, pid: 7 },
      preset,
      range: { top: 0, left: 0, bottom: 2, right: 0 },
      workArea,
      gapPx: 0,
    });
    expect(result.ok).toBe(false);
    expect(world.frames).toHaveLength(0);
  });

  it('reports helper failures and skips focusing', async () => {
    const world = makeWorld();
    world.failMove.add(42);
    const result = await new SnapService(world).apply({
      target: { windowId: 42, pid: 7 },
      preset,
      range: { top: 0, left: 0, bottom: 0, right: 0 },
      workArea,
      gapPx: 0,
    });
    expect(result.ok ? 'ok' : result.error.code).toBe('notResizable');
    expect(world.focused).toHaveLength(0);
  });
});
