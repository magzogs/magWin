import { DEFAULT_SETTINGS, type RestoreProgress } from '@magwin/core';
import { describe, expect, it } from 'vitest';
import type { RestoreProgressView } from '../../domain/ui';
import {
  FakeClock,
  FakeScheduler,
  MemoryLayoutRepository,
  MemoryLogger,
  SequentialIds,
} from '../test/fakes';
import { layoutOf, makeWorld, saved } from '../test/world';
import { LayoutCaptureService } from './LayoutCaptureService';
import { LayoutLibrary } from './LayoutLibrary';
import { LayoutRestoreService } from './LayoutRestoreService';
import { RestoreCoordinator, type RestoreState } from './RestoreCoordinator';
import { WindowWaiter } from './WindowWaiter';

class RecordingView implements RestoreProgressView {
  opened = 0;
  readonly events: RestoreProgress[] = [];
  open(): void {
    this.opened += 1;
  }
  publish(progress: RestoreProgress): void {
    this.events.push(progress);
  }
}

async function setup() {
  const world = makeWorld();
  const clock = new FakeClock();
  const scheduler = new FakeScheduler(clock);
  const library = new LayoutLibrary(new MemoryLayoutRepository(), clock);
  await library.add(
    layoutOf([
      saved({ number: 1, app: { bundleId: 'com.example.editor', name: 'Editor', path: null } }),
    ]),
  );
  const capture = new LayoutCaptureService({
    windows: world,
    desktops: world,
    displays: world,
    apps: world,
    library,
    ids: new SequentialIds(),
    clock,
    settings: () => DEFAULT_SETTINGS,
  });
  const restorer = new LayoutRestoreService({
    desktops: world,
    displays: world,
    apps: world,
    windows: world,
    waiter: new WindowWaiter(world, scheduler, clock),
    scheduler,
    clock,
  });
  const view = new RecordingView();
  const coordinator = new RestoreCoordinator({
    restorer,
    capture,
    library,
    view,
    settings: () => DEFAULT_SETTINGS,
    logger: new MemoryLogger(),
  });
  return { world, coordinator, view };
}

describe('RestoreCoordinator', () => {
  it('restores a saved layout, shows progress and enables undo', async () => {
    const { coordinator, view, world } = await setup();
    const states: RestoreState[] = [];
    coordinator.onChange((s) => states.push(s));
    const result = await coordinator.restoreLayout('layout-1', null);
    expect(result.ok && result.value.placed).toBe(1);
    expect(view.opened).toBe(1);
    expect(view.events.at(-1)?.type).toBe('finished');
    expect(states).toEqual([
      { restoring: true, canUndo: false },
      { restoring: false, canUndo: true },
    ]);
    expect(world.launches).toEqual(['com.example.editor']);
  });

  it('undo repositions without launching apps', async () => {
    const { coordinator, world } = await setup();
    await coordinator.restoreLayout('layout-1', null);
    world.launches.length = 0;
    const undone = await coordinator.undo();
    expect(undone.ok).toBe(true);
    expect(world.launches).toEqual([]);
  });

  it('rejects concurrent restores and unknown layouts', async () => {
    const { coordinator } = await setup();
    const first = coordinator.restoreLayout('layout-1', null);
    const second = await coordinator.restoreLayout('layout-1', null);
    expect(second.ok ? 'ok' : second.error.code).toBe('restoreInProgress');
    await first;
    const missing = await coordinator.restoreLayout('nope', null);
    expect(missing.ok ? 'ok' : missing.error.code).toBe('layoutNotFound');
    const noUndo = await (await setup()).coordinator.undo();
    expect(noUndo.ok ? 'ok' : noUndo.error.code).toBe('nothingToUndo');
  });

  it('restores by hotkey slot', async () => {
    const { coordinator } = await setup();
    expect((await coordinator.restoreSlot(0)).ok).toBe(true);
    expect((await coordinator.restoreSlot(5)).ok).toBe(false);
  });
});
