# AGENTS.md — magWin

Working rules for AI agents and new contributors. The full specification lives in the Docusaurus
site under `docs/`; this file is the entry point and links to the pages that matter.

## What this project is

A macOS menu bar app with two features:

1. **Edge grid snapping** — rest the cursor on another app's window edge, a palette of grid
   presets appears, select a rectangular block of cells in one grid, press Apply, the window moves
   there.
2. **Desktop-aware layouts** — save the window arrangement including each window's Desktop
   (Mission Control space); restoring switches to that Desktop **first**, then launches the apps
   there and places their windows.

Electron + React (TypeScript) for UI and orchestration, a Swift helper (`native/MagWinHelper`)
for Accessibility, CGWindowList and private CGS calls. `packages/core` holds all pure logic.

## Read these before changing code

| Topic                                          | Doc                                         |
| ---------------------------------------------- | ------------------------------------------- |
| Processes, layers, flows                       | `docs/docs/architecture/overview.md`        |
| Helper wire protocol (keep Swift + TS in sync) | `docs/docs/architecture/helper-protocol.md` |
| Coordinates and cell → frame math              | `docs/docs/architecture/coordinates.md`     |
| Edge detection, dwell, palette lifetime        | `docs/docs/architecture/edge-detection.md`  |
| Grid selection rules                           | `docs/docs/architecture/grid-selection.md`  |
| Layout capture and restore                     | `docs/docs/architecture/layout-restore.md`  |
| Folder structure and dependency direction      | `docs/docs/development/monorepo.md`         |
| Coding standards, SOLID, lint rules            | `docs/docs/development/coding-standards.md` |
| Testing and the manual checklist               | `docs/docs/development/testing.md`          |
| When and how to update docs                    | `docs/docs/development/docs-workflow.md`    |
| Architecture decisions (ADRs)                  | `docs/docs/architecture/decisions/`         |

Run `pnpm dev:docs` to browse them.

## Hard rules

1. **TypeScript only.** No `.js` sources, config files included (Prettier config is JSON). No
   `any`, no `!`.
2. **Every change ships with tests.** New module → new `*.test.ts(x)` beside it. Swift pure logic
   goes in `HelperCore` with Swift Testing.
3. **`pnpm check` must pass** (lint with zero warnings, prettier, typecheck, Vitest, `swift test`)
   before you report work as done. Run it; do not assume.
4. **Dependency direction:** `apps/desktop → packages/core`. In the main process
   `application/` and `domain/` never import `electron`, `node:*` or `infrastructure/`; only
   `bootstrap.ts` instantiates concrete classes. The renderer never imports `main/` or `preload/`.
5. **Protocol changes** update `Protocol.swift`, `protocol.ts`, their tests, and
   `helper-protocol.md` together; bump `HelperProtocol.version` when breaking.
6. **Docs are part of the change.** See `docs-workflow.md`. Architecture decisions get an ADR.
7. **Electron security stays on:** `contextIsolation`, `sandbox`, no `nodeIntegration`; new IPC
   channels go in `src/shared/channels.ts` with a zod schema validated in `src/main/ipc`.
8. **Restore order is a product decision** (ADR-002): switch to the Desktop first, then launch and
   place. Do not add code that moves other apps' windows between Spaces through private APIs.
9. User-facing text lives in `apps/desktop/src/renderer/src/i18n/ko.ts`; the main process returns
   error codes.

## Commands

```bash
pnpm install          # once
pnpm dev              # build helper + run the app
pnpm check            # lint + format check + typecheck + tests + swift tests
pnpm build:docs       # docs must build (broken links fail)
```
