import {
  ok,
  type DisplayInfo,
  type LiveWindow,
  type Rect,
  type Result,
  type RunningApp,
  type SavedApp,
  type SpaceTopology,
} from '@magwin/core';
import type {
  AppCatalog,
  AppLauncher,
  DesktopNavigator,
  DisplayCatalog,
  WindowMover,
  WindowQuery,
  WindowRef,
  WindowScope,
} from '../../domain/ports';
import type { HelperClient } from './HelperClient';
import {
  appsResult,
  displaysResult,
  emptyResult,
  frameResult,
  launchResult,
  switchResult,
  topologyResult,
  windowsResult,
} from './protocol';

/** Generous timeouts for calls that wait on other apps or animations. */
export const HELPER_TIMEOUTS = {
  listWindows: 8_000,
  switchDesktop: 20_000,
  launchApp: 25_000,
} as const;

export class HelperWindowService implements WindowQuery, WindowMover {
  constructor(private readonly client: HelperClient) {}

  async listWindows(scope: WindowScope): Promise<Result<readonly LiveWindow[]>> {
    const result = await this.client.request(
      'windows.list',
      { scope },
      windowsResult,
      HELPER_TIMEOUTS.listWindows,
    );
    return result.ok ? ok(result.value.windows) : result;
  }

  async setFrame(target: WindowRef, frame: Rect): Promise<Result<Rect>> {
    const result = await this.client.request(
      'windows.setFrame',
      { windowId: target.windowId, pid: target.pid, frame },
      frameResult,
    );
    return result.ok ? ok(result.value.frame) : result;
  }

  async focus(target: WindowRef): Promise<Result<void>> {
    const result = await this.client.request(
      'windows.focus',
      { windowId: target.windowId, pid: target.pid },
      emptyResult,
    );
    return result.ok ? ok(undefined) : result;
  }
}

export class HelperDesktopNavigator implements DesktopNavigator {
  constructor(private readonly client: HelperClient) {}

  async topology(): Promise<Result<SpaceTopology>> {
    const result = await this.client.request('spaces.topology', {}, topologyResult);
    return result.ok ? ok(result.value) : result;
  }

  async switchTo(spaceId: number): Promise<Result<void>> {
    const result = await this.client.request(
      'spaces.switch',
      { spaceId },
      switchResult,
      HELPER_TIMEOUTS.switchDesktop,
    );
    return result.ok ? ok(undefined) : result;
  }
}

export class HelperDisplayCatalog implements DisplayCatalog {
  constructor(private readonly client: HelperClient) {}

  async displays(): Promise<Result<readonly DisplayInfo[]>> {
    const result = await this.client.request('displays.list', {}, displaysResult);
    return result.ok ? ok(result.value.displays) : result;
  }
}

export class HelperAppService implements AppCatalog, AppLauncher {
  constructor(private readonly client: HelperClient) {}

  async runningApps(): Promise<Result<readonly RunningApp[]>> {
    const result = await this.client.request('apps.list', {}, appsResult);
    return result.ok ? ok(result.value.apps) : result;
  }

  async launch(app: SavedApp): Promise<Result<number>> {
    const result = await this.client.request(
      'apps.launch',
      { bundleId: app.bundleId, path: app.path },
      launchResult,
      HELPER_TIMEOUTS.launchApp,
    );
    return result.ok ? ok(result.value.pid) : result;
  }
}
