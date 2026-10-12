---
id: monorepo
title: Monorepo Structure
sidebar_position: 2
---

```text
orgawin/
├── AGENTS.md                     # Working rules (links to these docs)
├── apps/desktop/                 # Electron app
│   ├── electron.vite.config.ts
│   ├── electron-builder.yml      # Packaging
│   └── src/
│       ├── shared/               # Shared by main, preload, renderer: channels, zod contracts, MagWinApi
│       │   └── i18n/             # ko.ts (source) · en.ts · messagesFor
│       ├── preload/              # contextBridge — allow-listed channels only
│       ├── main/
│       │   ├── domain/           # Ports (interfaces) and Emitter — no dependencies
│       │   ├── application/      # Feature flows (depend on ports only) + test/ fakes
│       │   ├── infrastructure/   # helper · persistence · electron · system adapters
│       │   ├── ipc/              # Wires channels to application, validates payloads
│       │   ├── bootstrap.ts      # Composition root (the only place that uses new)
│       │   └── index.ts          # Entry point (including --diagnose)
│       └── renderer/
│           ├── index.html        # Single bundle, ?view= selects the screen
│           ├── preview.html      # Dev UI preview
│           └── src/
│               ├── api/          # ApiContext (injects MagWinApi)
│               ├── views/        # palette · ghost · manager · save · progress
│               ├── components/   # LayoutPreview …
│               ├── i18n/         # I18nProvider · useI18n (honors the language setting)
│               └── preview/      # Fake API for the browser preview
├── packages/core/                # Pure TS domain (depends on zod only)
│   └── src/ geometry · grid · selection · palette · settings · system · layouts · restore
├── native/MagWinHelper/          # Swift package
│   ├── Sources/HelperCore/       # Pure: protocol, EdgeDetector, DwellTracker, shortcut parser, switch plan
│   ├── Sources/HelperPlatform/   # AX · CGWindowList · CGS · NSWorkspace · key input
│   ├── Sources/MagWinHelper/     # main.swift (assembly), Handlers.swift (RPC registration)
│   └── Tests/HelperCoreTests/    # Swift Testing
└── docs/                         # Docusaurus (this site)
```

## Dependency Direction

```text
apps/desktop ──▶ packages/core
renderer ──▶ shared ◀── main, preload
main: bootstrap ──▶ infrastructure ──▶ domain ◀── application
```

These rules are enforced by ESLint.

| Location                                      | Forbidden                                   |
| --------------------------------------------- | ------------------------------------------- |
| `packages/core/src`                           | `electron`, `node:*`, `react`, `fs`, `path` |
| `apps/desktop/src/main/domain`, `application` | `electron`, `node:*`, `infrastructure`      |
| `apps/desktop/src/renderer`                   | `electron`, `node:*`, `main`, `preload`     |

The `tsconfig` of `packages/core` sets `lib: ["ES2022"]` and `types: []`, so DOM and Node types are not available either.
