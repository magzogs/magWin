---
id: setup
title: Development Environment
sidebar_position: 1
---

## Installation

```bash
corepack enable          # pnpm 9
pnpm install
```

The `postinstall` step of `pnpm install` downloads the Electron binary if it is missing. If you still see `Electron failed to install correctly`, run the installer manually.

```bash
node apps/desktop/node_modules/electron/install.js
```

## Common Commands

| Command                                    | What it does                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `pnpm dev`                                 | Release-builds the helper, then runs the app in dev mode (renderer HMR) |
| `pnpm build:helper`                        | `swift build -c release` (helper only)                                  |
| `pnpm build`                               | Helper + electron-vite bundle (`apps/desktop/out`)                      |
| `pnpm --filter @magwin/desktop preview:ui` | Browser UI preview (`http://localhost:5199/preview.html`)               |
| `pnpm dev:docs`                            | This documentation site                                                 |
| `pnpm check`                               | lint → format check → typecheck → Vitest → Swift tests                  |

## Full Check

This must pass before you say your work is done.

```bash
pnpm check
```

## Permissions (Dev Mode)

In dev mode, the Accessibility permission must be granted to the **terminal app** that runs `pnpm dev` ([Getting Started](../guide/getting-started.md#permissions)). The same applies when you run the helper on its own.

## Environment Variables

| Variable             | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `MAGWIN_HELPER_PATH` | Use a helper binary from another location |
