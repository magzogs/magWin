import { describe, expect, it } from 'vitest';
import { FakeClock, FakeScheduler } from '../test/fakes';
import { makeWorld } from '../test/world';
import { WAIT_POLL_MS, WindowWaiter } from './WindowWaiter';

describe('WindowWaiter', () => {
  it('returns as soon as every expected window is visible on the space', async () => {
    const world = makeWorld();
    const clock = new FakeClock();
    world.addWindow({ appName: 'Editor', bundleId: 'com.example.editor', spaceIds: [1] });
    const waiter = new WindowWaiter(world, new FakeScheduler(clock), clock);
    const start = clock.now();
    const windows = await waiter.waitFor({
      spaceId: 1,
      expected: new Map([['com.example.editor', 1]]),
      timeoutMs: 5_000,
    });
    expect(windows).toHaveLength(1);
    expect(clock.now()).toBe(start);
  });

  it('gives up at the deadline with whatever is visible', async () => {
    const world = makeWorld();
    const clock = new FakeClock();
    const waiter = new WindowWaiter(world, new FakeScheduler(clock), clock);
    const start = clock.now();
    const windows = await waiter.waitFor({
      spaceId: 1,
      expected: new Map([['com.example.editor', 1]]),
      timeoutMs: 1_000,
    });
    expect(windows).toHaveLength(0);
    expect(clock.now() - start).toBeGreaterThanOrEqual(1_000);
    expect(clock.now() - start).toBeLessThan(1_000 + WAIT_POLL_MS * 2);
  });

  it('ignores windows on other spaces', async () => {
    const world = makeWorld();
    const clock = new FakeClock();
    world.addWindow({ appName: 'Editor', bundleId: 'com.example.editor', spaceIds: [7] });
    const waiter = new WindowWaiter(world, new FakeScheduler(clock), clock);
    const windows = await waiter.waitFor({ spaceId: 1, expected: new Map(), timeoutMs: 0 });
    expect(windows).toHaveLength(0);
  });
});
