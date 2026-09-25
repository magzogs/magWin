import { describe, expect, it } from 'vitest';
import { FakeClock, FakeScheduler, MemoryLogger } from '../../application/test/fakes';
import type { EdgeHover, Unsubscribe } from '../../domain/ports';
import { HelperClient, type LineTransport } from './HelperClient';
import {
  HelperAppService,
  HelperDesktopNavigator,
  HelperWindowService,
} from './HelperWindowAdapters';
import { HelperEdgeHoverSource, HelperShortcutInspector } from './HelperSystemAdapters';

/** Answers every request with a scripted result, like the real helper would. */
class ScriptedHelper implements LineTransport {
  readonly requests: { method: string; params: unknown }[] = [];
  private lineListener: (line: string) => void = () => undefined;

  constructor(private readonly results: Record<string, unknown>) {}

  send(line: string): void {
    const request = JSON.parse(line) as { id: number; method: string; params: unknown };
    this.requests.push({ method: request.method, params: request.params });
    queueMicrotask(() => {
      this.lineListener(
        JSON.stringify({ id: request.id, ok: true, result: this.results[request.method] }),
      );
    });
  }
  onLine(listener: (line: string) => void): Unsubscribe {
    this.lineListener = listener;
    return () => undefined;
  }
  onClose(): Unsubscribe {
    return () => undefined;
  }
  emit(event: string, data: unknown): void {
    this.lineListener(JSON.stringify({ event, data }));
  }
}

function clientFor(results: Record<string, unknown>) {
  const helper = new ScriptedHelper(results);
  return {
    helper,
    client: new HelperClient(helper, new FakeScheduler(new FakeClock()), new MemoryLogger()),
  };
}

describe('helper adapters', () => {
  it('normalises windows without optional fields to null', async () => {
    const { client, helper } = clientFor({
      'windows.list': {
        windows: [
          {
            id: 1,
            pid: 2,
            appName: 'Chrome',
            frame: { x: 0, y: 0, width: 10, height: 10 },
            isOnScreen: true,
            spaceIds: [1],
          },
        ],
      },
    });
    const result = await new HelperWindowService(client).listWindows('all');
    expect(result.ok && result.value[0]).toMatchObject({ bundleId: null, title: null });
    expect(helper.requests).toEqual([{ method: 'windows.list', params: { scope: 'all' } }]);
  });

  it('switches desktops and launches apps with the saved identity', async () => {
    const { client, helper } = clientFor({
      'spaces.switch': { method: 'direct', steps: 1 },
      'apps.launch': { pid: 77 },
    });
    expect(await new HelperDesktopNavigator(client).switchTo(7)).toEqual({
      ok: true,
      value: undefined,
    });
    const launched = await new HelperAppService(client).launch({
      bundleId: 'com.x',
      name: 'X',
      path: '/Applications/X.app',
    });
    expect(launched).toEqual({ ok: true, value: 77 });
    expect(helper.requests.map((r) => r.params)).toEqual([
      { spaceId: 7 },
      { bundleId: 'com.x', path: '/Applications/X.app' },
    ]);
  });

  it('summarises Mission Control shortcuts', async () => {
    const { client } = clientFor({
      'hotkeys.status': {
        switchToDesktop: [
          { number: 1, binding: { keyCode: 18, modifiers: 1048576, enabled: true } },
          { number: 2, binding: { keyCode: 19, modifiers: 1048576, enabled: false } },
        ],
        moveLeft: { keyCode: 123, modifiers: 12058624, enabled: true },
      },
    });
    expect(await new HelperShortcutInspector(client).missionControlHotkeys()).toEqual({
      ok: true,
      value: { directDesktops: [1], moveLeft: true, moveRight: false },
    });
  });

  it('maps edge hover events and sends trigger settings', async () => {
    const { client, helper } = clientFor({ 'edge.configure': {} });
    const source = new HelperEdgeHoverSource(client);
    const hovers: EdgeHover[] = [];
    source.onHover((h) => hovers.push(h));
    helper.emit('edge.hover', {
      windowId: 5,
      pid: 6,
      appName: 'Notes',
      frame: { x: 1, y: 2, width: 3, height: 4 },
      edge: 'left',
      point: { x: 1, y: 3 },
    });
    expect(hovers).toEqual([
      {
        target: { windowId: 5, pid: 6 },
        bundleId: null,
        appName: 'Notes',
        windowFrame: { x: 1, y: 2, width: 3, height: 4 },
        edge: 'left',
        point: { x: 1, y: 3 },
      },
    ]);
    await source.configure({
      enabled: true,
      edges: ['top'],
      dwellMs: 300,
      bandPx: 5,
      modifier: 'none',
    });
    expect(helper.requests.at(-1)).toEqual({
      method: 'edge.configure',
      params: { enabled: true, edges: ['top'], dwellMs: 300, bandPx: 5, modifier: 'none' },
    });
  });
});
