---
id: edge-snap
title: Edge grid snap
sidebar_position: 2
---

## How to use

1. Move the cursor onto the **edge** (top, bottom, left, or right) of the window you want to move, and pause briefly (0.35 seconds by default).
2. A **grid palette** appears at the cursor. Your configured grid presets (by default 2×2, 2×3, 3×2, 3×3, and **Custom**) are laid out side by side. Each grid has its **name on the left** (for example `3 × 2`).
3. Pick cells in one grid. Click for a single cell, or **press and drag** to select the rectangle that encloses the cells you pass over.
4. As soon as you select, an **Apply** button appears **to the right** of that grid's name (in the same spot regardless of palette orientation).
5. Click **Apply** (or press Enter) and the window moves and resizes to that area.

While you select, a translucent preview is shown on the actual screen, and hovering the Apply button shows the resulting size (for example `756 × 713`).

> Notation is **columns × rows**. `3x2` means 3 columns and 2 rows.

## Custom grid

The last grid can be reshaped right in the palette. It starts as 2 × 2, with outward-pointing triangle arrows above, below, and on both sides of the grid.

| Arrow   | Action            |
| ------- | ----------------- |
| ▶ Right | Add one column    |
| ◀ Left  | Remove one column |
| ▼ Down  | Add one row       |
| ▲ Up    | Remove one row    |

- Width and height range from 1 to 8 cells, and an arrow that has reached its limit is dimmed.
- Changing the shape clears the selection in that grid.
- **The last shape is saved**, so it stays the same the next time the palette appears and after you relaunch the app.
- You can delete it in the main window, and after deleting you can add it back with **Add custom grid**.

## Selection rules

| Action                                   | Result                                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Click a cell                             | Selects that single cell                                                           |
| Press a cell and drag to another         | A rectangle with the start and current cells as corners (shrinks if you drag back) |
| Click another cell in the same grid      | Starts a new selection of that single cell                                         |
| ⇧ Shift + click                          | Extends to a rectangle from the first pressed cell to the clicked cell             |
| Click the selected **single cell** again | Clears the selection, and the Apply button disappears                              |
| Press a cell in **another grid**         | The previous grid's selection is cleared and the new grid is selected              |
| Esc                                      | Clears the selection; closes the palette if nothing is selected                    |

A selection is always within one grid, and always a rectangle. The detailed model is in [Grid selection model](../architecture/grid-selection.md).

## When the palette closes

- When the **Close delay** (0.45 seconds by default) has passed after the cursor leaves the palette and the area around the trigger point. It does not close while dragging.
- When apply succeeds
- When you press Esc twice

## Settings (main window › Settings)

The main window has a fixed width and can be resized vertically only. Its content is centered.

The Settings tab has a sidebar on the left with the sections **Palette grids · Edge detection · Palette & placement · Layouts · General**, and the selected section appears on the right. Language and Open at login are in **General** ([Language](getting-started.md#language)).

| Setting         | Default                      | Description                                                         |
| --------------- | ---------------------------- | ------------------------------------------------------------------- |
| Palette grids   | 2×2 2×3 3×2 3×3 Custom (2×2) | Add (1–8 columns and rows), delete, reorder. Up to 12               |
| Edges           | All four                     | Turn each edge on or off                                            |
| Dwell time      | 350ms                        | How long the cursor must rest on an edge before the palette appears |
| Detection width | 5px                          | Distance on each side of the edge line that is recognized           |
| Modifier key    | None                         | The palette can be limited to when one of ⌥/⌃/⌘/⇧ is held           |
| Grid size       | 104px                        | Width of one grid in the palette                                    |
| Close delay     | 450ms                        |                                                                     |
| Window gap      | 0px                          | Margin between windows, and between a window and the screen edge    |

## Safeguards against accidental triggers

A window edge is in the same place as the macOS **resize handle**. So the palette behaves as follows.

- It appears only after the dwell time. It does not react to a cursor passing by.
- It does not appear while a mouse button is held (moving or resizing a window). Even if the spot where you finish dragging is an edge, the cursor must leave and come back before it appears again.
- It does not appear at corners (diagonal resize).
- It does not appear in the menu bar and Dock areas.

## Windows that are not supported

- Full-screen windows, and windows whose size or position cannot be changed
- Windows of apps that are not in the Dock, such as menu bar apps
- OrgaWin's own windows

If an app sets a minimum size, the window may be larger than the selected area (for example, Terminal, which resizes in character units).
