# magWin

**English** · [한국어](README.ko.md)

A macOS menu bar window manager.

- **Edge grid snap**: Rest the cursor on a window edge for a moment and a grid palette appears (2×2, 2×3, 3×2, 3×3, 4×4, and more). Pick a cell range (a rectangle) in one grid and press **Apply** to move the window there.
- **Desktop layouts**: Saves window arrangements together with their Desktop (Space). On restore, magWin first switches to that Desktop, then launches the apps and places their windows.
- **Languages**: Korean · English (Settings › General › Language; follows the system setting by default). The docs are built in both languages too.

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
