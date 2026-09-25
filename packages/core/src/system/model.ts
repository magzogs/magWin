import type { Rect } from '../geometry/geometry';

/** A window as reported by the native helper right now. */
export interface LiveWindow {
  readonly id: number;
  readonly pid: number;
  readonly bundleId: string | null;
  readonly appName: string;
  /** Unknown when neither Accessibility nor Screen Recording can read it. */
  readonly title: string | null;
  readonly frame: Rect;
  readonly isOnScreen: boolean;
  /** Mission Control spaces that contain the window (usually exactly one). */
  readonly spaceIds: readonly number[];
}

export interface RunningApp {
  readonly pid: number;
  readonly bundleId: string | null;
  readonly name: string;
  readonly path: string | null;
  /** Hidden with ⌘H. */
  readonly isHidden: boolean;
}

export interface DisplayInfo {
  readonly id: number;
  readonly uuid: string;
  readonly name: string;
  readonly frame: Rect;
  /** Frame minus menu bar and Dock. */
  readonly visibleFrame: Rect;
  readonly isMain: boolean;
}

export type SpaceKind = 'desktop' | 'fullscreen' | 'other';

export interface SpaceInfo {
  readonly id: number;
  /** Empty for the very first desktop on some systems, so it is optional. */
  readonly uuid: string | null;
  readonly kind: SpaceKind;
}

export interface DisplaySpaces {
  readonly displayUuid: string;
  readonly currentSpaceId: number;
  /** In Mission Control order, including full-screen spaces. */
  readonly spaces: readonly SpaceInfo[];
}

export interface SpaceTopology {
  readonly displays: readonly DisplaySpaces[];
}
