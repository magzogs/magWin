import { describe, expect, it } from 'vitest';
import type { SystemStatus } from '../../../shared/contracts';
import { FakeClock, FakePermissions, FakeScheduler, MemoryLogger, makeWorld } from '../test/index';
import { DiagnosticsService } from './DiagnosticsService';
import { STATUS_POLL_MS, SystemStatusService } from './SystemStatusService';

function setup() {
  const clock = new FakeClock();
  const scheduler = new FakeScheduler(clock);
  const permissions = new FakePermissions();
  const service = new SystemStatusService({
    permissions,
    shortcuts: permissions,
    scheduler,
    logger: new MemoryLogger(),
  });
  return { scheduler, permissions, service };
}

describe('SystemStatusService', () => {
  it('reads permissions and shortcuts once the helper is ready', async () => {
    const { service } = setup();
    const seen: SystemStatus[] = [];
    service.onChange((s) => seen.push(s));
    expect(await service.refresh()).toMatchObject({ helper: 'starting', accessibility: false });
    service.setHelperState('ready');
    const status = await service.refresh();
    expect(status).toMatchObject({ helper: 'ready', hotkeys: { directDesktops: [1, 2] } });
    expect(seen.length).toBeGreaterThan(0);
  });

  it('polls until Accessibility is granted, then slows down', async () => {
    const { service, scheduler, permissions } = setup();
    service.setHelperState('ready');
    await service.refresh();
    permissions.status_ = { accessibility: true, screenRecording: false };
    scheduler.advance(STATUS_POLL_MS.waitingForPermission);
    await Promise.resolve();
    await Promise.resolve();
    expect(service.current().accessibility).toBe(true);
  });

  it('asks for Accessibility through the permission gate', async () => {
    const { service, permissions } = setup();
    service.setHelperState('ready');
    await service.requestAccessibility();
    expect(permissions.requested).toBe(1);
  });

  it('asks for Screen Recording through the permission gate', async () => {
    const { service, permissions } = setup();
    service.setHelperState('ready');
    await service.requestScreenRecording();
    expect(permissions.screenRecordingRequested).toBe(1);
  });

  it('tracks helper failures and restore state', () => {
    const { service } = setup();
    service.setHelperState('failed', 'binary missing');
    service.setRestoreState(true, false);
    expect(service.current()).toMatchObject({
      helper: 'failed',
      helperMessage: 'binary missing',
      restoring: true,
    });
    service.accessibilityLost();
    expect(service.current().accessibility).toBe(false);
    service.stop();
  });
});

describe('DiagnosticsService', () => {
  it('summarises the environment without side effects', async () => {
    const world = makeWorld();
    world.addWindow({ appName: 'Editor', spaceIds: [1] });
    const permissions = new FakePermissions();
    const report = await new DiagnosticsService({
      permissions,
      displays: world,
      desktops: world,
      shortcuts: permissions,
      windows: world,
      apps: world,
    }).run();
    expect(report).toMatchObject({
      displays: ['Built-in 1440x900 (main)'],
      desktops: ['Desktop 1 (space 1) current', 'Desktop 2 (space 7)'],
      visibleWindows: 1,
      allWindows: 1,
      runningApps: 0,
    });
    expect(world.switches).toEqual([]);
    expect(world.frames).toEqual([]);
  });
});
