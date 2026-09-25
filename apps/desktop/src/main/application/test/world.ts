import type { DisplayInfo, Layout, SavedWindow, SpaceTopology } from '@magwin/core';
import { FakeDesktopWorld } from './fakes';

export const MAIN_UUID = 'MAIN';

export const mainDisplay: DisplayInfo = {
  id: 1,
  uuid: MAIN_UUID,
  name: 'Built-in',
  frame: { x: 0, y: 0, width: 1440, height: 900 },
  visibleFrame: { x: 0, y: 25, width: 1440, height: 875 },
  isMain: true,
};

/** Desktop 1 (space 1, current), a full-screen space, Desktop 2 (space 7). */
export const twoDesktops: SpaceTopology = {
  displays: [
    {
      displayUuid: MAIN_UUID,
      currentSpaceId: 1,
      spaces: [
        { id: 1, uuid: null, kind: 'desktop' },
        { id: 50, uuid: 'FS', kind: 'fullscreen' },
        { id: 7, uuid: 'D2', kind: 'desktop' },
      ],
    },
  ],
};

export function makeWorld(): FakeDesktopWorld {
  return new FakeDesktopWorld(twoDesktops, [mainDisplay]);
}

export function saved(overrides: Partial<SavedWindow> & { number: number }): SavedWindow {
  const { number, ...rest } = overrides;
  return {
    app: { bundleId: 'com.example.editor', name: 'Editor', path: '/Applications/Editor.app' },
    title: null,
    frame: { x: 0, y: 25, width: 720, height: 875 },
    relativeFrame: { x: 0, y: 0, width: 0.5, height: 1 },
    displayUuid: MAIN_UUID,
    desktop: {
      number,
      displayUuid: MAIN_UUID,
      indexOnDisplay: number,
      spaceUuid: number === 2 ? 'D2' : null,
      spaceId: number === 2 ? 7 : 1,
    },
    order: 0,
    ...rest,
  };
}

export function layoutOf(windows: SavedWindow[], name = 'Coding'): Layout {
  return {
    schemaVersion: 1,
    id: 'layout-1',
    name,
    createdAt: '2026-09-25T10:00:00.000Z',
    updatedAt: '2026-09-25T10:00:00.000Z',
    displays: [mainDisplay],
    windows,
  };
}
