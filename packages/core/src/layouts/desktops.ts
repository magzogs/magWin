import type { SpaceTopology } from '../system/model';

/**
 * A Mission Control desktop (not a full-screen space).
 * `number` is the global "Desktop N" label, counted across displays like Mission Control;
 * `indexOnDisplay` counts only this display's desktops; `position` counts every space on the
 * display including full-screen ones, which is what "move left/right a space" walks through.
 */
export interface Desktop {
  readonly spaceId: number;
  readonly spaceUuid: string | null;
  readonly displayUuid: string;
  readonly number: number;
  readonly indexOnDisplay: number;
  readonly position: number;
  readonly isCurrent: boolean;
}

export function buildDesktopCatalog(topology: SpaceTopology): Desktop[] {
  const desktops: Desktop[] = [];
  for (const display of topology.displays) {
    let indexOnDisplay = 0;
    display.spaces.forEach((space, position) => {
      if (space.kind !== 'desktop') {
        return;
      }
      indexOnDisplay += 1;
      desktops.push({
        spaceId: space.id,
        spaceUuid: space.uuid !== null && space.uuid !== '' ? space.uuid : null,
        displayUuid: display.displayUuid,
        number: desktops.length + 1,
        indexOnDisplay,
        position,
        isCurrent: display.currentSpaceId === space.id,
      });
    });
  }
  return desktops;
}

export function fullscreenSpaceIds(topology: SpaceTopology): Set<number> {
  const ids = new Set<number>();
  for (const display of topology.displays) {
    for (const space of display.spaces) {
      if (space.kind === 'fullscreen') {
        ids.add(space.id);
      }
    }
  }
  return ids;
}

export function desktopForSpace(
  desktops: readonly Desktop[],
  spaceId: number,
): Desktop | undefined {
  return desktops.find((d) => d.spaceId === spaceId);
}

/** The first desktop among a window's spaces, ignoring full-screen spaces. */
export function desktopForSpaces(
  desktops: readonly Desktop[],
  spaceIds: readonly number[],
): Desktop | undefined {
  for (const id of spaceIds) {
    const desktop = desktopForSpace(desktops, id);
    if (desktop !== undefined) {
      return desktop;
    }
  }
  return undefined;
}
