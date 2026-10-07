---
id: testing
title: Testing
sidebar_position: 4
---

## Principles

- **New modules arrive with tests.** When you fix a bug, first write a test that fails before the fix.
- Pure logic is verified only through input and output. Time, timers, the helper, and files are injected through ports and replaced with fakes.
- Code that needs the real OS (AX, CGS, key input) is confined to thin adapters and verified with the [manual checklist](#manual-checklist).

## Running Tests

```bash
pnpm test              # Vitest (core + desktop)
pnpm test:helper       # swift test
pnpm check             # everything
pnpm vitest run --project core
```

## Tests by Layer

| Layer                    | Environment             | Examples                                                                                                                                      |
| ------------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core`          | node                    | Rectangle selection rules, cell-to-frame bounds and gaps, palette placement, settings recovery, capture filter, window matching, restore plan |
| desktop `application`    | node + fakes            | Palette show/hide timing, snap failure handling, **app launch order after a Desktop switch**, undo                                            |
| desktop `infrastructure` | node                    | Helper client correlation, timeouts, events, adapter mapping, file repository, tray menu                                                      |
| desktop `renderer`       | jsdom + Testing Library | Palette drag selection and apply button display, save HUD, progress HUD, manager tab                                                          |
| `HelperCore` (Swift)     | Swift Testing           | Edge detection and corner exclusion, dwell state machine, shortcut parser, switch plan, RPC router                                            |

`FakeDesktopWorld` (`application/test/fakes.ts`) is a small virtual macOS. A window belongs to a Space, each display has a current Space, and launching an app opens its window **in the current Space**. Restore tests use this model to verify that "the Desktop must be switched first so the window appears on that Desktop".

## Manual Checklist

OS behavior cannot be replaced by unit tests. When you upgrade macOS or change the helper's `HelperPlatform`, verify the items below. First check permissions and shortcuts with `--diagnose`.

### Edge Snap

- [ ] The palette appears at all four edges of Finder, Safari/Chrome, VS Code, and Terminal windows
- [ ] After dragging an edge to resize, the palette does not appear at that spot
- [ ] It does not appear at corners, the menu bar, or the Dock
- [ ] The target app keeps focus while the palette is shown
- [ ] Cells are selected from the first click, and the selection persists even if the drag ends outside the palette
- [ ] The preview (ghost) matches the actual applied position
- [ ] Rows and columns of the custom grid can be changed with the arrows, and the shape persists after reopening the palette or relaunching the app
- [ ] After applying, the window comes to the front and the palette does not immediately reappear at the same edge
- [ ] The palette is visible over full-screen apps
- [ ] The window is applied at the correct position on an external monitor (including negative coordinates)
- [ ] Behavior is verified with Stage Manager turned on

### Layouts

- [ ] Place windows on two or more Desktops and save → the Desktop numbers in the save HUD match Mission Control
- [ ] Quit all apps, then restore everything → it moves through each Desktop and apps open on that Desktop
- [ ] "Restore Desktop N only" moves to that Desktop and arranges only its windows
- [ ] With the "Switch to Desktop N" shortcut disabled, switching still works with left/right movement alone
- [ ] With both shortcuts disabled, `desktopSwitchFailed` is reported with guidance
- [ ] A running app with windows on another Desktop is reported as `onOtherDesktop`
- [ ] Undo restores positions only, without launching apps
- [ ] Restoring after changing monitors places windows proportionally
