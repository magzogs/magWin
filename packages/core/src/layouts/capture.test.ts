import { describe, expect, it } from 'vitest';
import { liveWindow, mainDisplay, sideDisplay, SIDE_UUID, topology } from '../test/fixtures';
import { buildCaptureDraft, layoutFromDraft, type CaptureInput } from './capture';
import { summarizeLayout } from './model';

const apps = [
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

function input(overrides: Partial<CaptureInput> = {}): CaptureInput {
  return {
    windows: [
      liveWindow({ id: 11 }),
      liveWindow({
        id: 12,
        pid: 200,
        bundleId: 'com.example.chat',
        appName: 'Chat',
        spaceIds: [7],
        isOnScreen: false,
      }),
      liveWindow({ id: 13, spaceIds: [50] }),
      liveWindow({
        id: 14,
        frame: { x: 1500, y: 100, width: 800, height: 600 },
        spaceIds: [9],
      }),
    ],
    topology,
    displays: [mainDisplay, sideDisplay],
    apps,
    scope: 'all',
    excludedBundleIds: [],
    ...overrides,
  };
}

describe('buildCaptureDraft', () => {
  it('records desktop, display and relative frame for every restorable window', () => {
    const draft = buildCaptureDraft(input());
    expect(draft.entries.map((e) => e.key)).toEqual(['11', '12', '14']);
    expect(draft.skippedFullscreen).toBe(1);
    const chat = draft.entries[1]?.window;
    expect(chat?.desktop).toEqual({
      number: 2,
      displayUuid: 'MAIN-DISPLAY',
      indexOnDisplay: 2,
      spaceUuid: 'D2-UUID',
      spaceId: 7,
    });
    expect(chat?.app.path).toBe('/Applications/Chat.app');
    const side = draft.entries[2]?.window;
    expect(side?.displayUuid).toBe(SIDE_UUID);
    expect(side?.relativeFrame.x).toBeCloseTo(60 / 1920);
  });

  it('keeps only the current desktops for the currentDesktop scope', () => {
    const draft = buildCaptureDraft(input({ scope: 'currentDesktop' }));
    expect(draft.entries.map((e) => e.key)).toEqual(['11', '14']);
  });

  it('pre-unchecks excluded apps', () => {
    const draft = buildCaptureDraft(input({ excludedBundleIds: ['com.example.chat'] }));
    expect(draft.entries.find((e) => e.key === '12')?.included).toBe(false);
    expect(draft.entries.find((e) => e.key === '11')?.included).toBe(true);
  });

  it('drops windows of hidden apps', () => {
    const hiddenChat = apps.map((a) => (a.pid === 200 ? { ...a, isHidden: true } : a));
    const draft = buildCaptureDraft(input({ apps: hiddenChat }));
    expect(draft.entries.map((e) => e.key)).toEqual(['11', '14']);
  });

  it('drops off-screen windows on a visible desktop (minimised or auxiliary)', () => {
    const draft = buildCaptureDraft(
      input({ windows: [liveWindow({ id: 20, isOnScreen: false, spaceIds: [1] })] }),
    );
    expect(draft.entries).toHaveLength(0);
  });

  it('keeps untitled windows on other desktops only when they are document sized', () => {
    const draft = buildCaptureDraft(
      input({
        windows: [
          liveWindow({
            id: 30,
            title: null,
            isOnScreen: false,
            spaceIds: [7],
            frame: { x: 0, y: 0, width: 375, height: 169 },
          }),
          liveWindow({
            id: 31,
            title: null,
            isOnScreen: false,
            spaceIds: [7],
            frame: { x: 0, y: 0, width: 900, height: 700 },
          }),
        ],
      }),
    );
    expect(draft.entries.map((e) => e.key)).toEqual(['31']);
  });
});

describe('layoutFromDraft', () => {
  it('keeps the chosen entries and renumbers their order', () => {
    const draft = buildCaptureDraft(input());
    const layout = layoutFromDraft(draft, {
      id: 'layout-1',
      name: 'Coding',
      now: '2026-09-25T10:00:00.000Z',
      includedKeys: new Set(['12', '14']),
    });
    expect(layout.windows.map((w) => w.order)).toEqual([0, 1]);
    expect(summarizeLayout(layout)).toEqual({
      id: 'layout-1',
      name: 'Coding',
      createdAt: '2026-09-25T10:00:00.000Z',
      updatedAt: '2026-09-25T10:00:00.000Z',
      windowCount: 2,
      appCount: 2,
      desktopNumbers: [2, 3],
    });
  });
});
