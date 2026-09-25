import { DEFAULT_SETTINGS } from '@magwin/core';
import { describe, expect, it } from 'vitest';
import { FakeClock, MemoryLayoutRepository, SequentialIds } from '../test/fakes';
import { makeWorld } from '../test/world';
import { LayoutCaptureService } from './LayoutCaptureService';
import { LayoutLibrary } from './LayoutLibrary';

function setup() {
  const world = makeWorld();
  world.apps = [
    {
      pid: 100,
      bundleId: 'com.example.editor',
      name: 'Editor',
      path: '/Applications/Editor.app',
      isHidden: false,
    },
    {
      pid: 200,
      bundleId: 'com.example.chat',
      name: 'Chat',
      path: '/Applications/Chat.app',
      isHidden: false,
    },
  ];
  world.addWindow({
    pid: 100,
    bundleId: 'com.example.editor',
    appName: 'Editor',
    title: 'main.ts',
    spaceIds: [1],
  });
  world.addWindow({
    pid: 200,
    bundleId: 'com.example.chat',
    appName: 'Chat',
    title: 'General',
    spaceIds: [7],
  });
  const clock = new FakeClock(Date.parse('2026-09-25T10:00:00.000Z'));
  const library = new LayoutLibrary(new MemoryLayoutRepository(), clock);
  const service = new LayoutCaptureService({
    windows: world,
    desktops: world,
    displays: world,
    apps: world,
    library,
    ids: new SequentialIds(),
    clock,
    settings: () => DEFAULT_SETTINGS,
  });
  return { world, library, service };
}

describe('LayoutCaptureService', () => {
  it('captures every desktop with the desktop number of each window', async () => {
    const { service } = setup();
    const captured = await service.capture('all');
    expect(captured.ok).toBe(true);
    if (!captured.ok) return;
    expect(
      captured.value.draft.entries.map((e) => [e.window.app.name, e.window.desktop?.number]),
    ).toEqual([
      ['Editor', 1],
      ['Chat', 2],
    ]);
  });

  it('captures only the visible desktop when asked', async () => {
    const { service } = setup();
    const captured = await service.capture('currentDesktop');
    expect(captured.ok && captured.value.draft.entries.map((e) => e.window.app.name)).toEqual([
      'Editor',
    ]);
  });

  it('commits the chosen windows into the library', async () => {
    const { service, library } = setup();
    const captured = await service.capture('all');
    if (!captured.ok) throw new Error('capture failed');
    const chatKey = captured.value.draft.entries[1]?.key ?? '';
    const saved = await service.commit({
      draftId: captured.value.draftId,
      name: 'Chat only',
      includedKeys: [chatKey],
    });
    expect(saved.ok && saved.value.windowCount).toBe(1);
    expect(library.summaries().map((s) => s.name)).toEqual(['Chat only']);
    expect(
      (
        await service.commit({
          draftId: captured.value.draftId,
          name: 'again',
          includedKeys: [chatKey],
        })
      ).ok,
    ).toBe(false);
  });

  it('refuses empty layouts and unknown drafts', async () => {
    const { service } = setup();
    const captured = await service.capture('all');
    if (!captured.ok) throw new Error('capture failed');
    const empty = await service.commit({
      draftId: captured.value.draftId,
      name: 'x',
      includedKeys: [],
    });
    expect(empty.ok ? 'ok' : empty.error.code).toBe('emptyLayout');
    const unknown = await service.commit({ draftId: 'nope', name: 'x', includedKeys: [] });
    expect(unknown.ok ? 'ok' : unknown.error.code).toBe('draftExpired');
  });

  it('snapshots everything for undo', async () => {
    const { service } = setup();
    const snapshot = await service.snapshot('Before restore');
    expect(snapshot.ok && snapshot.value.windows.length).toBe(2);
  });
});
