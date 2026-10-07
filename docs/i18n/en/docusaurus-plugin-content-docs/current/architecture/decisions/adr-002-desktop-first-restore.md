---
id: adr-002-desktop-first-restore
title: ADR-002 Switch to the Desktop first, then launch apps and place windows
---

- **Status**: Accepted
- **Date**: 2026-09-25

## Context

A layout remembers which Desktop (Mission Control Space) each window was on. We investigated ways to put windows back on that Desktop when restoring.

- There is **no public API** to send another app's window to a specific Space.
- Private APIs (`CGSMoveWindowsToManagedSpace`, the compat ID workaround) are blocked on macOS 14.5 and 15. This is confirmed by Hammerspoon `hs.spaces.moveWindowToSpace` and yabai issues.
- Approaches that require turning off SIP (the yabai scripting addition) cannot be used in an app for ordinary users.
- UI automation (grabbing the window with a synthetic drag and switching Desktops) has worked on macOS 26 in some cases, but it had already changed in 27, and grabbing the wrong part of the title bar can wreck user state, for example by tearing off a tab.

## Decision

Follow the approach chosen by the user: **"When told to bring a window up on a given Desktop, first move to that Desktop, then launch the app on that Desktop and place its windows."**

1. Group the windows to restore by Desktop.
2. Switch to that Desktop ([ADR-003](adr-003-keyboard-desktop-switching.md)).
3. When an app that is not running is launched, its new window opens **on the current Desktop**. A running app with no windows at all is sent a reopen.
4. Pair the windows that appeared on that Desktop with the saved windows and place them.

A running app that **already has windows on another Desktop is not moved**, and we report which Desktop its window is currently on.

## Consequences

- Restoring right after a reboot, or with all apps quit, is accurate down to the Desktop.
- Restoring during normal use reports some windows as `onOtherDesktop`. The HUD advises the user to "quit the app and restore again, or drag it over in Mission Control."
- Desktops are processed from the highest number down, so we end on the layout's frontmost Desktop without an extra switch.
- If a reliable way to move windows between Spaces appears, a "gather" strategy can be added after the `ensureApps` step. This decision does not block that extension.
