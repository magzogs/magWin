---
id: layout-restore
title: Layout Capture and Restore
sidebar_position: 6
---

## Data model

```json
{
  "schemaVersion": 1,
  "id": "0b6c…",
  "name": "Coding",
  "createdAt": "2026-09-25T10:00:00.000Z",
  "updatedAt": "2026-09-25T10:00:00.000Z",
  "displays": [
    { "uuid": "2084E4AD-…", "name": "LG HDR 4K", "frame": {}, "visibleFrame": {}, "isMain": true }
  ],
  "windows": [
    {
      "app": {
        "bundleId": "com.microsoft.VSCode",
        "name": "Code",
        "path": "/Applications/Visual Studio Code.app"
      },
      "title": "main.ts — OrgaWin",
      "frame": { "x": 0, "y": 30, "width": 2534, "height": 2130 },
      "relativeFrame": { "x": 0, "y": 0, "width": 0.66, "height": 1 },
      "displayUuid": "2084E4AD-…",
      "desktop": {
        "number": 1,
        "displayUuid": "2084E4AD-…",
        "indexOnDisplay": 1,
        "spaceUuid": null,
        "spaceId": 1
      },
      "order": 0
    }
  ]
}
```

The schema is `packages/core/src/layouts/model.ts` (zod), and it is validated every time a file is read.

## Desktop identification

`CGSCopyManagedDisplaySpaces` returns a list of Spaces (ManagedSpaceID, UUID, type) for each display. `buildDesktopCatalog` keeps only the **Desktops** (type 0) and assigns three numbers.

| Number           | Meaning                                                         | Used for                               |
| ---------------- | --------------------------------------------------------------- | -------------------------------------- |
| `number`         | Mission Control's "Desktop N" (a global number across displays) | UI, the "Switch to Desktop N" shortcut |
| `indexOnDisplay` | Order within that display                                       | Matching on restore                    |
| `position`       | Position including full-screen Spaces                           | Counting left/right moves              |

ManagedSpaceID can change after a reboot, and the first Desktop's UUID can be empty, so on restore the current Desktop is found in the order **UUID → (display, order) → global number** (`resolveDesktop`).

## Capture rules (`buildCaptureDraft`)

- Windows in full-screen Spaces are excluded, and only their count is reported.
- Windows of hidden apps (⌘H) are excluded.
- Windows that belong to the visible Desktop but are not on screen (minimized, auxiliary windows) are excluded.
- Windows on other Desktops cannot be inspected, so a window with **no title and smaller than 320×200** is treated as an auxiliary window (popup, find bar, and so on) and excluded.
- Bundle IDs in the settings' exclusion list are shown unchecked.

## Restore algorithm (`LayoutRestoreService`)

This follows the principle set by the user: **"Move to the target Desktop first, then launch the app and place its windows on that Desktop."** ([ADR-002](decisions/adr-002-desktop-first-restore.md))

1. `planRestore`: **groups windows by the Desktop they will be restored to.** Windows whose Desktop cannot be found go to the "current Desktop" group and are reported as `desktopMissing`. Group order is the current Desktop group first, then **Desktops from the highest number down**.
2. For each group:
   1. `spaces.switch`. If it fails, the whole group is reported as `desktopSwitchFailed` and skipped.
   2. **Ensure the apps**: apps that are not running are launched, and running apps with no windows at all are sent a reopen. New windows open on the current Desktop. Running apps that have windows on another Desktop are **left untouched**, because activating one makes macOS move the screen to that Desktop.
   3. **Wait**: every 250ms, check that Space's windows with `windows.list(current)`. Stop when each app has the number of windows it needs, or when time runs out (15 seconds if the app was launched, otherwise 1.5 seconds).
   4. **Match** (`matchWindows`): greedy 1:1 pairing within the same app only, with score = 1 + 100 × title similarity (bigram Dice) + 20 × overlap ratio (IoU).
   5. **Place**: `resolveTargetFrame` → `windows.setFrame`. If the app was newly launched, the frame is applied **once more** after 0.7 seconds (for apps that restore their own previous position).
   6. **Explain** (`explainMissingWindow`): remaining windows are classified as `appNotRunning`, `onOtherDesktop` (including the Desktop number where it currently is), or `windowNotFound`.
3. `RestoreCoordinator` runs only one restore at a time and saves a snapshot of the whole arrangement before starting, which is used for **undo**.

## Moving windows (`AXWindowService.setFrame`)

- An AX window element is paired with its CGWindowID through the private `_AXUIElementGetWindow`.
- It sets **size → position → size**, for apps that get blocked by the previous screen's size when moving to another monitor.
- `AXEnhancedUserInterface`, which Chromium-based apps turn on, is briefly turned off during the move (to avoid animation and delay).
- Bringing the target app to the front is done through AX (`AXFrontmost`, `AXMain`, `AXRaise`) rather than `NSRunningApplication.activate`, because since macOS 14 an inactive app is restricted from activating another app.

## Private API list

| Symbol                        | Purpose                         | Alternative                   |
| ----------------------------- | ------------------------------- | ----------------------------- |
| `CGSMainConnectionID`         | Connection                      | –                             |
| `CGSCopyManagedDisplaySpaces` | Desktop list, current Desktop   | None                          |
| `CGSCopySpacesForWindows`     | The Desktop a window belongs to | None                          |
| `_AXUIElementGetWindow`       | AX element ↔ window ID          | Frame comparison (inaccurate) |

All of them are **read-only**. The private write APIs that send a window to another Space (`CGSMoveWindowsToManagedSpace` and the like) are blocked on macOS 14.5 and 15, so they are not used. When a new macOS is released, run the [manual checklist](../development/testing.md#manual-checklist) again.
