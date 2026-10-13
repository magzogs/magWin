---
id: troubleshooting
title: Troubleshooting
sidebar_position: 4
---

First check permissions, shortcuts, and helper status with [diagnostic mode](getting-started.md#diagnostics).

## The palette does not appear

| Check                                               | Fix                                                                           |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| Menu bar shows "⚠️ Accessibility permission needed" | Allow it in the Permissions & Status tab. In dev mode, allow the terminal app |
| "Enable edge snap" in the menu                      | Turn it on                                                                    |
| Edges, Modifier key                                 | Check in Settings › Edge detection                                            |
| Trying near a corner or the menu bar                | Try the middle of an edge                                                     |
| You just resized by dragging that edge              | Move the cursor off the edge once, then back                                  |
| Full-screen windows, fixed-size windows             | Not supported                                                                 |

## Permission is granted but nothing works

- **Rebuilding a development build** changes its ad-hoc signature, so macOS may not recognize the earlier approval. Remove the entry from the Accessibility list and add it again. When packaging, use a fixed signing certificate ([Release](../development/release.md)).
- If **OrgaWin is already switched on in the Accessibility list but the app still says Required**, the switch belongs to a differently signed copy (an earlier build). Toggling it does not help: select OrgaWin, remove it with the **−** button, then press **Request permission** again in the Permissions & Status tab.
- After granting permission, restarting the app is the surest fix.

## OrgaWin is missing from the Screen Recording list

macOS only lists apps that have asked for Screen Recording at least once. **Open Screen Recording settings** in the Permissions & Status tab asks for access first, which adds OrgaWin to the list, and then opens the settings. After allowing it, quit and reopen OrgaWin.

## Desktops do not switch

- In Keyboard settings › Keyboard Shortcuts › Mission Control, turn on "Switch to Desktop N" or "Move left/right a space".
- If another app intercepts the same shortcut, "Switch to Desktop N" can fail. OrgaWin then retries one step at a time with move left/right.
- If Spaces are separate per display and the target Desktop is on another monitor, the cursor briefly moves to that monitor to use move left/right.

## "Native helper error"

- `Helper binary not found`: build the helper with `pnpm build:helper`.
- `protocol ... does not match`: the app and helper versions differ. Rebuild both.
- If the helper keeps exiting, it restarts five times and then stops. Check the `[helper]` lines in the console log.

## Still not resolved?

Follow the steps in [Get Support](get-support.md): copy the diagnostics and email us.
