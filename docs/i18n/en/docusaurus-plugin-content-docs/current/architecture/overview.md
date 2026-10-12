---
id: overview
title: Architecture Overview
sidebar_position: 1
---

## Processes

| Process           | Language         | Responsibility                                                                                                                        |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Electron main     | TypeScript       | Persists settings and layouts, orchestrates feature flows (application services), manages windows, tray, and shortcuts                |
| Electron renderer | TypeScript/React | Palette, preview (ghost), management window, save HUD, restore HUD                                                                    |
| MagWinHelper      | Swift            | Global cursor watching and edge detection, window listing and moving (Accessibility), Desktop info (CGS) and switching, app launching |

The renderer talks to main only through `window.magwin` (an allowlisted API exposed by the preload script), and main talks to the helper over the [JSON Lines protocol](helper-protocol.md).

## Layers

```mermaid
flowchart TB
  subgraph core["packages/core (pure TS)"]
    C1["geometry · grid · selection"]
    C2["palette layout/placement"]
    C3["layouts: capture · matching · planning"]
  end
  subgraph main["apps/desktop/src/main"]
    D["domain/ports.ts · ui.ts<br/>(interfaces)"]
    A["application/*<br/>SnapService · PaletteController<br/>LayoutCapture/Restore · RestoreCoordinator"]
    I["infrastructure/*<br/>helper · persistence · electron · system"]
    B["bootstrap.ts<br/>(composition root)"]
  end
  A --> D
  I -. implements .-> D
  B --> A
  B --> I
  A --> core
  I --> core
```

- **Dependency inversion**: the application layer depends only on the small interfaces in `domain/ports.ts` (`WindowMover`, `DesktopNavigator`, `AppLauncher`, and so on). The helper, file, and Electron implementations live in infrastructure, and only `bootstrap.ts` calls `new` on concrete classes. The ESLint rule `no-restricted-imports` enforces this direction.
- **Pure logic goes in core**: selection rules, cell-to-coordinate conversion, palette placement, capture filters, window matching, and restore planning are functions with only inputs and outputs, so they are easy to test.
- The helper has the same structure: `HelperCore` (pure: protocol, edge detection, dwell state machine, shortcut parser, switch planning), `HelperPlatform` (AX, CG, and CGS adapters), and `MagWinHelper` (composition and RPC registration).

## Feature 1 flow

```mermaid
sequenceDiagram
  participant H as Helper(EdgeWatcher)
  participant M as PaletteController
  participant P as Palette renderer
  participant G as Ghost window
  H->>M: edge.hover {windowId, edge, point}
  M->>H: edge.setPaused(true)
  M->>P: palette:state (layout · presets)
  P-->>M: palette:ready(token)
  Note over M: showInactive (does not steal focus)
  P->>M: palette:selection {preset, range}
  M->>G: preview of the target frame
  P->>M: palette:resize-custom {cols, rows} (custom grid, saved in settings)
  P->>M: palette:apply
  M->>H: windows.setFrame → windows.focus
  M->>H: edge.setPaused(false)
```

## Feature 2 flow

```mermaid
sequenceDiagram
  participant U as User
  participant R as RestoreCoordinator
  participant S as LayoutRestoreService
  participant H as Helper
  U->>R: Restore (all / Desktop N)
  R->>S: Save a snapshot just before restoring (for undo), then restore()
  loop Desktop groups (highest number first)
    S->>H: spaces.switch(spaceId)
    S->>H: apps.launch (if not running)
    S->>H: windows.list(current) … until the window appears
    S->>H: windows.setFrame (for each matched window)
  end
  S-->>R: RestoreReport
  R-->>U: Progress HUD · result summary
```

## What is persisted to files

`~/Library/Application Support/OrgaWin/`

| File                 | Contents                                                                   |
| -------------------- | -------------------------------------------------------------------------- |
| `settings.json`      | Settings (validated per section; only invalid sections revert to defaults) |
| `layouts/<id>.json`  | One layout (zod schema `schemaVersion: 1`)                                 |
| `layouts/order.json` | List order = shortcut slots                                                |

Every file is saved atomically by writing to a temporary file and then renaming it.
