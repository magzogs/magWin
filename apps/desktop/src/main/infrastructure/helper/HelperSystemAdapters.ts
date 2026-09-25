import { ok, type Result } from '@magwin/core';
import type { HotkeySummary } from '../../../shared/contracts';
import type {
  EdgeHover,
  EdgeHoverSource,
  EdgeTriggerConfig,
  PermissionGate,
  PermissionStatus,
  ShortcutInspector,
  Unsubscribe,
} from '../../domain/ports';
import type { HelperClient } from './HelperClient';
import {
  edgeBlockedEvent,
  edgeHoverEvent,
  emptyResult,
  HelperEvents,
  hotkeysResult,
  permissionResult,
} from './protocol';

export class HelperPermissionGate implements PermissionGate {
  constructor(private readonly client: HelperClient) {}

  status(): Promise<Result<PermissionStatus>> {
    return this.client.request('permissions.status', {}, permissionResult);
  }

  requestAccessibility(): Promise<Result<PermissionStatus>> {
    return this.client.request('permissions.requestAccessibility', {}, permissionResult);
  }
}

export class HelperShortcutInspector implements ShortcutInspector {
  constructor(private readonly client: HelperClient) {}

  async missionControlHotkeys(): Promise<Result<HotkeySummary>> {
    const result = await this.client.request('hotkeys.status', {}, hotkeysResult);
    if (!result.ok) {
      return result;
    }
    const { switchToDesktop, moveLeft, moveRight } = result.value;
    return ok({
      directDesktops: switchToDesktop.filter((d) => d.binding.enabled).map((d) => d.number),
      moveLeft: moveLeft?.enabled ?? false,
      moveRight: moveRight?.enabled ?? false,
    });
  }
}

export class HelperEdgeHoverSource implements EdgeHoverSource {
  constructor(private readonly client: HelperClient) {}

  onHover(listener: (hover: EdgeHover) => void): Unsubscribe {
    return this.client.on(HelperEvents.edgeHover, edgeHoverEvent, (event) => {
      listener({
        target: { windowId: event.windowId, pid: event.pid },
        bundleId: event.bundleId,
        appName: event.appName,
        windowFrame: event.frame,
        edge: event.edge,
        point: event.point,
      });
    });
  }

  onBlocked(listener: (reason: string) => void): Unsubscribe {
    return this.client.on(HelperEvents.edgeBlocked, edgeBlockedEvent, (event) => {
      listener(event.reason);
    });
  }

  async configure(config: EdgeTriggerConfig): Promise<Result<void>> {
    const result = await this.client.request(
      'edge.configure',
      {
        enabled: config.enabled,
        edges: [...config.edges],
        dwellMs: config.dwellMs,
        bandPx: config.bandPx,
        modifier: config.modifier,
      },
      emptyResult,
    );
    return result.ok ? ok(undefined) : result;
  }

  async setPaused(paused: boolean): Promise<Result<void>> {
    const result = await this.client.request('edge.setPaused', { paused }, emptyResult);
    return result.ok ? ok(undefined) : result;
  }
}
