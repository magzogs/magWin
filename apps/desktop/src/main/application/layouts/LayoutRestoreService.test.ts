import type { RestoreProgress } from '@magwin/core';
import { describe, expect, it } from 'vitest';
import { FakeClock, FakeScheduler } from '../test/fakes';
import { layoutOf, makeWorld, saved } from '../test/world';
import { LayoutRestoreService, RESTORE_TIMING } from './LayoutRestoreService';
import { WindowWaiter } from './WindowWaiter';

const editorApp = {
  bundleId: 'com.example.editor',
  name: 'Editor',
  path: '/Applications/Editor.app',
};
const chatApp = { bundleId: 'com.example.chat', name: 'Chat', path: '/Applications/Chat.app' };

function setup() {
  const world = makeWorld();
  const clock = new FakeClock();
  const scheduler = new FakeScheduler(clock);
  const service = new LayoutRestoreService({
    desktops: world,
    displays: world,
    apps: world,
    windows: world,
    waiter: new WindowWaiter(world, scheduler, clock),
    scheduler,
    clock,
  });
  const progress: RestoreProgress[] = [];
  return { world, service, progress, onProgress: (p: RestoreProgress) => progress.push(p) };
}

const options = { desktopNumber: null, launchMissingApps: true };

describe('LayoutRestoreService', () => {
  it('switches to each desktop first, then launches its apps there and places the windows', async () => {
    const { world, service, progress, onProgress } = setup();
    const layout = layoutOf([
      saved({ number: 1, app: editorApp, frame: { x: 0, y: 25, width: 720, height: 875 } }),
      saved({ number: 2, app: chatApp, frame: { x: 720, y: 25, width: 720, height: 875 } }),
    ]);

    const report = await service.restore(layout, options, onProgress);

    // Highest desktop first so the restore ends on Desktop 1 without an extra switch.
    expect(world.switches).toEqual([7, 1]);
    expect(world.launches).toEqual(['com.example.chat', 'com.example.editor']);
    const chatWindow = world.windows.find((w) => w.appName === 'Chat');
    expect(chatWindow?.spaceIds).toEqual([7]);
    expect(report).toMatchObject({ placed: 2, total: 2, issues: [] });
    expect(world.frames.find((f) => f.windowId === chatWindow?.id)?.frame).toEqual({
      x: 720,
      y: 25,
      width: 720,
      height: 875,
    });
    expect(progress.map((p) => p.type)).toEqual([
      'started',
      'switching',
      'launching',
      'waiting',
      'placing',
      'switching',
      'launching',
      'waiting',
      'placing',
      'finished',
    ]);
  });

  it('restores a single desktop on request', async () => {
    const { world, service, onProgress } = setup();
    const layout = layoutOf([
      saved({ number: 1, app: editorApp }),
      saved({ number: 2, app: chatApp }),
    ]);
    const report = await service.restore(layout, { ...options, desktopNumber: 2 }, onProgress);
    expect(world.switches).toEqual([7]);
    expect(world.launches).toEqual(['com.example.chat']);
    expect(report.total).toBe(1);
  });

  it('uses windows that already exist on the target desktop without relaunching', async () => {
    const { world, service, onProgress } = setup();
    world.apps.push({ pid: 100, ...editorApp, isHidden: false });
    const existing = world.addWindow({
      pid: 100,
      bundleId: editorApp.bundleId,
      appName: 'Editor',
      spaceIds: [1],
    });
    const report = await service.restore(
      layoutOf([saved({ number: 1, app: editorApp })]),
      options,
      onProgress,
    );
    expect(world.launches).toEqual([]);
    expect(world.frames.map((f) => f.windowId)).toEqual([existing.id]);
    expect(report.placed).toBe(1);
  });

  it('re-applies frames after launching because apps restore their own frame late', async () => {
    const { world, service, onProgress } = setup();
    await service.restore(layoutOf([saved({ number: 1, app: editorApp })]), options, onProgress);
    expect(world.frames).toHaveLength(2);
    expect(RESTORE_TIMING.reapplyDelayMs).toBeGreaterThan(0);
  });

  it('reports windows of running apps that sit on another desktop', async () => {
    const { world, service, onProgress } = setup();
    world.apps.push({ pid: 200, ...chatApp, isHidden: false });
    world.addWindow({ pid: 200, bundleId: chatApp.bundleId, appName: 'Chat', spaceIds: [1] });
    const report = await service.restore(
      layoutOf([saved({ number: 2, app: chatApp })]),
      options,
      onProgress,
    );
    expect(world.launches).toEqual([]);
    expect(report.issues).toEqual([
      expect.objectContaining({ reason: 'onOtherDesktop', desktopNumber: 2, foundOnDesktop: 1 }),
    ]);
  });

  it('re-opens running apps that have no window at all', async () => {
    const { world, service, onProgress } = setup();
    world.apps.push({ pid: 200, ...chatApp, isHidden: false });
    const report = await service.restore(
      layoutOf([saved({ number: 2, app: chatApp })]),
      options,
      onProgress,
    );
    expect(world.launches).toEqual(['com.example.chat']);
    expect(report.placed).toBe(1);
  });

  it('skips a desktop it cannot switch to and says why', async () => {
    const { world, service, onProgress } = setup();
    world.failSwitch = 'noShortcut';
    const report = await service.restore(
      layoutOf([saved({ number: 2, app: chatApp })]),
      options,
      onProgress,
    );
    expect(world.launches).toEqual([]);
    expect(report.issues).toEqual([
      expect.objectContaining({ reason: 'desktopSwitchFailed', detail: 'noShortcut' }),
    ]);
  });

  it('reports launch failures and missing desktops', async () => {
    const { world, service, onProgress } = setup();
    world.failLaunch.add('com.example.chat');
    const layout = layoutOf([
      saved({ number: 2, app: chatApp }),
      saved({
        number: 5,
        app: editorApp,
        desktop: {
          number: 5,
          displayUuid: 'GONE',
          indexOnDisplay: 5,
          spaceUuid: null,
          spaceId: 99,
        },
      }),
    ]);
    const report = await service.restore(layout, options, onProgress);
    expect(report.issues.map((i) => i.reason).sort()).toEqual([
      'appLaunchFailed',
      'desktopMissing',
    ]);
    // The missing desktop's window still lands on the current desktop.
    expect(report.placed).toBe(1);
  });

  it('does not launch anything when launching is disabled', async () => {
    const { world, service, onProgress } = setup();
    const report = await service.restore(
      layoutOf([saved({ number: 1, app: editorApp })]),
      { desktopNumber: null, launchMissingApps: false },
      onProgress,
    );
    expect(world.launches).toEqual([]);
    expect(report.issues).toEqual([expect.objectContaining({ reason: 'appNotRunning' })]);
  });
});
