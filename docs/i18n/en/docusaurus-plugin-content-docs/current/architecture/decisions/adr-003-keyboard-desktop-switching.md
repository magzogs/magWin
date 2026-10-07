---
id: adr-003-keyboard-desktop-switching
title: ADR-003 Switch Desktops with the user's Mission Control shortcuts
---

- **Status**: Accepted
- **Date**: 2026-09-25

## Context

The restore in [ADR-002](adr-002-desktop-first-restore.md) must be able to move the screen to the desired Desktop.

| Method                                        | Problem                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `CGSManagedDisplaySetCurrentSpace` (private)  | The change happens without the Dock knowing, which breaks window display                              |
| Open Mission Control and AXPress              | The accessibility tree moved from the Dock to WindowManager in macOS 27, so it breaks across versions |
| **Synthesize Mission Control shortcut input** | Unusable if the shortcuts are turned off                                                              |

On the development Mac the shortcuts differed from the defaults (Desktop 1 = ⌘1, adjacent Desktop = ⌥⌘←/→). Pressing a fixed ⌃1 / ⌃→ is not acceptable.

## Decision

- The helper reads `AppleSymbolicHotKeys` from `com.apple.symbolichotkeys` and presses **exactly the keys and modifiers the user configured** (ID 79/81 = left/right Space, 118+N−1 = Desktop N).
- The plan (`SpaceSwitchPlanner`, a pure function):
  1. If already on that Desktop, do nothing.
  2. If "Switch to Desktop N" is enabled, press it once.
  3. Otherwise, count within the same display, including full-screen Spaces, and press the left/right move that many times. "Move left/right a space" acts on the display where the cursor is, so the cursor is moved to that display if necessary.
  4. If both are disabled, `noShortcut`.
- After each press, the helper **verifies** through CGS that the current Space actually changed (up to 2.5 seconds per step). If the direct switch fails, it tries once more with left/right moves. When finished, it waits 0.35 seconds for the switch animation.

## Consequences

- Only public input paths are used, so it is relatively resilient to macOS version changes. The only requirement is the Accessibility permission (for input synthesis).
- The user sees the switch animation. The restore HUD shows which Desktop it is heading to.
- The permissions and status tab shows which shortcuts are enabled and links directly to the settings screen.
