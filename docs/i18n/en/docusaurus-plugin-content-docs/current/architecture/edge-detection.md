---
id: edge-detection
title: Edge Detection and Palette Lifecycle
sidebar_position: 4
---

## Detection (helper `EdgeDetector`)

Input: the cursor position, the list of **regular app windows** on screen (layer 0, excluding Dock apps and magWin) in front-to-back order, each display's visibleFrame, the detection width `band`, and the enabled edges.

1. If the cursor is not inside any visibleFrame (menu bar, Dock), no detection is performed.
2. Walk the windows **from the front** and pick the first window whose rectangle, expanded by `band`, contains the cursor. If a front window covers the edge of a window behind it, the rear window is not a candidate.
3. The result is the nearest of the four sides that is within `band`.
4. **Corner exclusion**: for the top or bottom side, the region within `max(3·band, 16)` px of the left and right ends is excluded. For the left or right side, the same distance from the top and bottom ends is excluded (diagonal resize handles).

Reading the window list (CGWindowList) is the most expensive step, so it is cached for 150ms and invalidated when a mouse button is released (a window may have moved) and when the display configuration changes.

## Dwell state machine (helper `DwellTracker`)

| State             | Meaning                                                   |
| ----------------- | --------------------------------------------------------- |
| `idle`            | Waiting                                                   |
| `pending(hit, t)` | Counting from the time `t` the cursor arrived at the edge |
| `fired(hit)`      | The palette was already shown during this visit           |
| `disarmed(hit?)`  | Will not show again until the cursor leaves that edge     |

The gate is computed on every observation.

| Gate       | Condition                                         | Effect                                                                                                  |
| ---------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `suppress` | A mouse button is pressed, or the palette is open | Marks the current edge `disarmed`. **Prevents the palette from appearing in place after a drag-resize** |
| `hold`     | The configured modifier key is not pressed        | Returns to `idle` without disabling (counting starts as soon as the key is pressed)                     |
| `open`     | Otherwise                                         | Fires **once** when the cursor dwells on the same target for the dwell time                             |

No events arrive while the cursor is still, so during `pending` a timer is set to evaluate once more at the deadline. Input comes from global `NSEvent` monitors (mouse movement, buttons, modifier keys), so no CPU is used while idle.

When it fires, a separate queue checks through AX that the window is **movable and not full screen**, and then sends `edge.hover`. If the permission is missing, it sends `edge.blocked`.

## Palette lifecycle (main `PaletteController`)

1. `edge.hover` → compute the palette layout (`computePaletteLayout`) and position (`placePalette`: just inside the edge, centered on the cursor, within the work area) → helper `edge.setPaused(true)` → `showInactive()` after the renderer has drawn
2. Every 50ms, check whether the cursor is inside the **keep-alive region** (palette ∪ trigger point, with 18px of margin). If the time spent outside exceeds the close delay, close the palette. It does not count during a drag (`palette:interaction true`).
3. On close, hide the ghost and call `edge.setPaused(false)`. The helper leaves that edge `disarmed`, so the cursor must leave and come back before the palette appears again.

The palette window uses `type: 'panel'` (a non-activating NSPanel) and `acceptFirstMouse: true`, and is shown above all Spaces and full-screen windows. This way it does not steal focus from the target app, and a cell is selected from the very first click.
