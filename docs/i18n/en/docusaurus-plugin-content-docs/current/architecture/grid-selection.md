---
id: grid-selection
title: Grid Selection Model
sidebar_position: 5
---

This is the pure reducer in `packages/core/src/selection/selection.ts`. The renderer only turns pointer input into actions (`usePaletteSelection`).

## State

```ts
interface GridSelection {
  presetId: string; // the only component that holds the selection
  anchor: Cell; // the cell where the press started
  range: CellRange; // inclusive rectangle {top,left,bottom,right}
  dragging: boolean;
  toggleCandidate: boolean; // the only selected cell was pressed again → release clears it
}
type SelectionState = GridSelection | null;
```

**Invariants**: `range` is always built only by `rangeFromCells(anchor, some cell)`, so it is **always a rectangle**, and because there is only one `presetId`, the **selection always lies within a single component**.

## Actions and rules

| Action                      | Condition                                          | Next state                                             |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `pointerDown(p, c, extend)` | A different component, or no selection             | A single cell `c` in `p`, dragging                     |
|                             | Same component + Shift (`extend`)                  | `rangeFromCells(anchor, c)`                            |
|                             | Same component, pressed the only selected cell     | Unchanged + `toggleCandidate`                          |
|                             | Same component, anywhere else                      | A new selection of the single cell `c`                 |
| `pointerEnter(p, c)`        | dragging and the same component                    | `rangeFromCells(anchor, c)` (shrinks when moving back) |
|                             | Otherwise (dragging into another component, hover) | No change                                              |
| `pointerUp`                 | `toggleCandidate`                                  | `null` (cleared)                                       |
|                             | Otherwise                                          | dragging cleared                                       |
| `clear`                     |                                                    | `null`                                                 |

## UI wiring

- Each slot has a **header row** above the grid with the title (left) and the apply button (right). This is the same for both horizontal and vertical layouts (`computePaletteLayout` reserves the space in advance so the window size does not jump).
- The **apply button** is visible only in the slot that matches `selection.presetId`.
- The button appears the moment a selection is created (on press) and fades out when the selection disappears.
- `palette:selection` is sent to main only when the range changes, to update the ghost preview.
- If the button is released outside the palette during a drag, the drag still ends through `pointerup`/`blur` on `window`.
- Keyboard: Enter = apply, Esc = clear → press again to close.

## Custom grid

- This is the preset whose id is `custom` (`CUSTOM_PRESET_ID`). It does not collide with the `NxM` ids produced by `presetId(cols, rows)`, so it can coexist with a fixed 2×2. It occupies the last slot of the default presets (formerly 4×4), and its default shape is 2×2.
- The layout gives `resize` (up, down, left, and right arrow rectangles) only to this slot. The arrow strip (`arrowSize`) lies outside the grid, and every slot reserves the cross-axis strip so that lines align with the other grids.
- Arrow → `resizePreset` (a pure function, clamped to 1 to 8): right/down = add a column/row, left/up = remove a column/row. An arrow that has reached its limit is disabled because `canResize` is false.
- The renderer `clear`s the selection, immediately changes the preset in its own state, and then sends `palette:resize-custom {cols, rows}`. Main (`PaletteController.resizeCustom`) updates the session presets (so later apply and preview use the new shape) and saves it to `grid.presets` in settings. As a result, the last shape persists for the next palette and across restarts.
