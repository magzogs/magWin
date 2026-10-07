---
id: coordinates
title: Coordinate System and Cell → Frame Calculation
sidebar_position: 3
---

## Only one coordinate system is used

Every coordinate in magWin is a **Quartz global coordinate** (in points).

- Origin: the **top-left** of the main display (the screen with the menu bar)
- y increases **downward**
- Other monitors can have negative coordinates

CGWindowList, Accessibility (AXPosition/AXSize), and the Electron `screen` module all use these coordinates. The only exception is AppKit (`NSScreen`, `NSEvent.mouseLocation`), which uses a **bottom-left origin with y pointing up**. The helper's `CoordinateSpace.quartzRect(fromCocoa:)` converts in one place.

```text
quartz.y = primaryScreen.height − cocoa.y − cocoa.height
```

The cursor position is read with `CGEvent(source: nil).location` (already Quartz), so no conversion is needed.

## Cell → frame

`rangeToFrame(workArea, preset, range, gap)` in `packages/core/src/grid/cells.ts`.

1. Grid line positions are rounded **only once**. `x_i = workArea.x + round(i × width / cols)`
2. The window's horizontal extent runs from the left line of the selected range to the line at (right cell + 1). The vertical extent works the same way.
3. The gap (`gap`) is applied as the full `gap` at screen edges, and between windows it is split as `floor(gap/2)` and `ceil(gap/2)` between the two sides, so the **gap between windows is exactly `gap`**.

Because rounding happens per grid line, the borders of neighboring windows never overlap or leave a gap, even by 1px.

`workArea` is the area excluding the menu bar and Dock, taken from the display where the palette appeared.

## Coordinates for saving and restoring

A layout stores two values per window.

| Field           | Value                                                 |
| --------------- | ----------------------------------------------------- |
| `frame`         | Absolute coordinates                                  |
| `relativeFrame` | Ratio relative to the display `visibleFrame` (0 to 1) |

On restore, if the display (UUID) is the same and its `visibleFrame` is unchanged, `frame` is used. Otherwise `relativeFrame` is scaled to the current display. If the display is gone, the main display is used. The result is always clamped into `visibleFrame` (`resolveTargetFrame`).
