import type { Desktop } from '../layouts/desktops';
import type { SavedDesktop, SavedWindow } from '../layouts/model';
import type { DisplayInfo, LiveWindow, SpaceTopology } from '../system/model';

export const MAIN_UUID = 'MAIN-DISPLAY';
export const SIDE_UUID = 'SIDE-DISPLAY';

export const mainDisplay: DisplayInfo = {
  id: 1,
  uuid: MAIN_UUID,
  name: 'Built-in',
  frame: { x: 0, y: 0, width: 1440, height: 900 },
  visibleFrame: { x: 0, y: 25, width: 1440, height: 875 },
  isMain: true,
};

export const sideDisplay: DisplayInfo = {
  id: 2,
  uuid: SIDE_UUID,
  name: 'External',
  frame: { x: 1440, y: 0, width: 1920, height: 1080 },
  visibleFrame: { x: 1440, y: 25, width: 1920, height: 1055 },
  isMain: false,
};

/** Main display: Desktop 1 (current), a full-screen space, Desktop 2. Side display: Desktop 3. */
export const topology: SpaceTopology = {
  displays: [
    {
      displayUuid: MAIN_UUID,
      currentSpaceId: 1,
      spaces: [
        { id: 1, uuid: null, kind: 'desktop' },
        { id: 50, uuid: 'FS-UUID', kind: 'fullscreen' },
        { id: 7, uuid: 'D2-UUID', kind: 'desktop' },
      ],
    },
    {
      displayUuid: SIDE_UUID,
      currentSpaceId: 9,
      spaces: [{ id: 9, uuid: 'D3-UUID', kind: 'desktop' }],
    },
  ],
};

export function liveWindow(overrides: Partial<LiveWindow> & Pick<LiveWindow, 'id'>): LiveWindow {
  return {
    pid: 100,
    bundleId: 'com.example.editor',
    appName: 'Editor',
    title: 'Untitled',
    frame: { x: 0, y: 25, width: 720, height: 875 },
    isOnScreen: true,
    spaceIds: [1],
    ...overrides,
  };
}

export function desktop(
  overrides: Partial<Desktop> & Pick<Desktop, 'spaceId' | 'number'>,
): Desktop {
  return {
    spaceUuid: null,
    displayUuid: MAIN_UUID,
    indexOnDisplay: overrides.number,
    position: 0,
    isCurrent: false,
    ...overrides,
  };
}

export function savedDesktop(number: number, overrides: Partial<SavedDesktop> = {}): SavedDesktop {
  return {
    number,
    displayUuid: MAIN_UUID,
    indexOnDisplay: number,
    spaceUuid: null,
    spaceId: number,
    ...overrides,
  };
}

export function savedWindow(overrides: Partial<SavedWindow> = {}): SavedWindow {
  return {
    app: { bundleId: 'com.example.editor', name: 'Editor', path: '/Applications/Editor.app' },
    title: 'Untitled',
    frame: { x: 0, y: 25, width: 720, height: 875 },
    relativeFrame: { x: 0, y: 0, width: 0.5, height: 1 },
    displayUuid: MAIN_UUID,
    desktop: savedDesktop(1),
    order: 0,
    ...overrides,
  };
}
