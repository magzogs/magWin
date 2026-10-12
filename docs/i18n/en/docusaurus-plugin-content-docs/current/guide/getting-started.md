---
id: getting-started
title: Getting started
sidebar_position: 1
---

## Requirements

| Item          | Version                                                                |
| ------------- | ---------------------------------------------------------------------- |
| macOS         | 13 or later (developed and verified on 26.6)                           |
| Xcode / Swift | Swift 6 toolchain (Xcode 16 or later; developed on Xcode 26.1 / 6.2.1) |
| Node.js       | 22.12 or later                                                         |
| pnpm          | 9 (`corepack enable`)                                                  |

## Install and run

```bash
pnpm install        # dependencies + Electron binary
pnpm dev            # build Swift helper → electron-vite dev mode
```

Once running, a 2×2 grid icon appears in the menu bar. The Dock icon appears only while the settings window is open.

## Permissions

| Permission        | Required | Used for                                                                   |
| ----------------- | -------- | -------------------------------------------------------------------------- |
| **Accessibility** | Yes      | Moving and resizing other apps' windows, pressing Desktop switch shortcuts |
| Screen Recording  | Optional | Only to read the **titles** of windows on other Desktops                   |

On first launch the Permissions & Status tab opens. Click **Request permission** to show the macOS prompt, then turn it on in **System Settings › Privacy & Security › Accessibility**.

:::caution Permission target in development mode
Electron launched with `pnpm dev` is a child process of your terminal, so macOS asks for permission on **the terminal app that ran the command** (Terminal, iTerm, VS Code, etc.). During development, grant Accessibility to that app. The packaged `magWin.app` receives permission under its own name.
:::

## Language

magWin supports Korean and English. Switch right from the **🌐 Language** submenu of the menu bar icon, or choose one in **Settings › General › Language**.

| Value            | Behavior                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Match system     | The first supported language in macOS's preferred language order. English if none (default) |
| 한국어 / English | Fixed to that language                                                                      |

Changes apply immediately to open windows and the menu bar menu. Change the language of the docs site from the menu at the top right.

## Desktop switch shortcuts

To restore layouts, magWin moves between Desktops by pressing the shortcuts in **Keyboard settings › Keyboard Shortcuts › Mission Control**. At least one of these must be on:

- "Switch to Desktop N" (off by default; the fastest when on)
- "Move left/right a space" (on by default, ⌃← / ⌃→)

You can change the shortcut keys. magWin reads the current settings and presses exactly those.

## Diagnostics

To check permission or shortcut problems, use diagnostic mode, which runs a read-only check without opening any window.

```bash
pnpm build
cd apps/desktop && npx electron . --diagnose
```

```json
{
  "helperPath": ".../native/MagWinHelper/.build/release/MagWinHelper",
  "permissions": { "accessibility": true, "screenRecording": false },
  "displays": ["LG HDR 4K 3840x2160 (main)"],
  "desktops": ["Desktop 1 (space 1) current"],
  "hotkeys": { "directDesktops": [1, 2], "moveLeft": true, "moveRight": true },
  "visibleWindows": 3,
  "allWindows": 12,
  "runningApps": 7
}
```

## Preview the UI only

To polish the UI without permissions or the helper, use the browser preview. It shows the palette, main window, and HUD with an in-memory fake API.

```bash
pnpm --filter @magwin/desktop preview:ui
# http://localhost:5199/preview.html
```
