import {
  clampRectInto,
  fromRelative,
  rectsEqual,
  roundRect,
  type Rect,
} from '../geometry/geometry';
import type { DisplayInfo } from '../system/model';
import type { SavedDisplay, SavedWindow } from './model';

function currentDisplayFor(
  saved: SavedWindow,
  displays: readonly DisplayInfo[],
): DisplayInfo | undefined {
  return (
    displays.find((d) => d.uuid === saved.displayUuid) ??
    displays.find((d) => d.isMain) ??
    displays[0]
  );
}

/**
 * Frame to apply for a saved window on today's displays.
 * Same display with the same visible frame → exact saved frame.
 * Otherwise the relative frame is scaled onto the matching (or main) display.
 */
export function resolveTargetFrame(
  saved: SavedWindow,
  layoutDisplays: readonly SavedDisplay[],
  displays: readonly DisplayInfo[],
): Rect {
  const display = currentDisplayFor(saved, displays);
  if (display === undefined) {
    return saved.frame;
  }
  const original = layoutDisplays.find((d) => d.uuid === saved.displayUuid);
  const unchanged =
    original?.uuid === display.uuid && rectsEqual(original.visibleFrame, display.visibleFrame);
  const frame = unchanged
    ? saved.frame
    : roundRect(fromRelative(saved.relativeFrame, display.visibleFrame));
  return clampRectInto(frame, display.visibleFrame);
}
