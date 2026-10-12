# OrgaWin

**English** · [한국어](README.ko.md)

A macOS menu bar window manager.

- **Edge grid snap**: Rest the cursor on a window edge for a moment and a grid palette appears (2×2, 2×3, 3×2, 3×3, 4×4, and more). Pick a cell range (a rectangle) in one grid and press **Apply** to move the window there.
- **Desktop layouts**: Saves window arrangements together with their Desktop (Space). On restore, OrgaWin first switches to that Desktop, then launches the apps and places their windows.
- **Languages**: Korean · English (Settings › General › Language; follows the system setting by default). The docs are built in both languages too.

## Download

Get the latest `OrgaWin-<version>-arm64.dmg` from **[Releases](https://github.com/magzogs/orgawin/releases/latest)**, open it and drag OrgaWin into **Applications**.

- Requires macOS 13 or later on Apple Silicon.
- The app is signed with Developer ID and notarized by Apple.
- OrgaWin updates itself: new versions download in the background, and the menu bar menu shows **Restart to update** when one is ready.

## First launch

OrgaWin needs **Accessibility** permission to move other apps' windows and to press the Desktop switch shortcuts. On first launch it opens the Permissions & Status tab; click **Request permission**, then turn OrgaWin on in **System Settings › Privacy & Security › Accessibility**.

To restore layouts, at least one Mission Control shortcut must be on in **System Settings › Keyboard › Keyboard Shortcuts › Mission Control** ("Switch to Desktop N" or "Move left/right a space").

## Support

- Bugs and feature requests: [Issues](https://github.com/magzogs/orgawin/issues)
- Email: orgawin@magzog.com

The menu bar menu's **Get Support…** copies diagnostic information you can paste into an issue or email.

## Development

```bash
pnpm install
pnpm dev          # Build the Swift helper and run the app (needs Accessibility permission)
pnpm check        # Lint, format, type check, and tests
pnpm dev:docs     # Docs (Docusaurus)
```

| Path                  | Contents                             |
| --------------------- | ------------------------------------ |
| `apps/desktop`        | Electron + React app                 |
| `packages/core`       | Pure TypeScript domain logic         |
| `native/MagWinHelper` | Swift helper (Accessibility, Spaces) |
| `docs`                | Docusaurus documentation site        |

Working rules live in [AGENTS.md](AGENTS.md).
