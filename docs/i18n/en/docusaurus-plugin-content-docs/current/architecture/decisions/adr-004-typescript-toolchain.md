---
id: adr-004-typescript-toolchain
title: ADR-004 TypeScript-only toolchain and versions
---

- **Status**: Accepted
- **Date**: 2026-09-25

## Context

Requirement: "If JS is used, it must be TS." No JavaScript sources are kept, configuration files included. As of September 2026, the latest versions did not fit together in some places.

| Tool                 | Latest   | Constraint                                              |
| -------------------- | -------- | ------------------------------------------------------- |
| TypeScript           | 7.0 (Go) | typescript-eslint 8.70 supports only `>=4.8.4 <6.1.0`   |
| Vite                 | 8        | electron-vite 5 supports only Vite `^5 \|\| ^6 \|\| ^7` |
| @vitejs/plugin-react | 6        | Vite 8 only                                             |

## Decision

| Tool                           | Version   |
| ------------------------------ | --------- |
| TypeScript                     | 6.0.3     |
| Electron / electron-vite       | 44 / 5.0  |
| Vite (pinned by pnpm override) | 7.3       |
| Vitest                         | 4.1       |
| ESLint / typescript-eslint     | 10 / 8.70 |
| React                          | 19.3      |
| zod                            | 4         |
| Docusaurus                     | 3.10      |

- Configuration files are TS too: `eslint.config.ts` (loaded with jiti), `vitest.config.ts`, `electron.vite.config.ts`, `vite.preview.config.ts`, `docusaurus.config.ts`, and `sidebars.ts`. The Prettier configuration is JSON.
- All of the app's runtime dependencies are bundled in (`externalizeDeps: false`). The sandboxed preload ends up as a single file, and packaging does not need `node_modules`.
- The Swift helper uses the Swift 6 toolchain with the **Swift 5 language mode**. Instead of the Sendable constraints on AX and CF types, concurrency is managed with explicit queues (`rpc`, `edge`, main).

## Consequences

- Moving up to TypeScript 7 requires typescript-eslint to support it. At that point, write a new ADR that supersedes this one.
- Bundling zod into the renderer increases its size (about 870KB). This is acceptable for a local app, but to reduce it, split core into a schema entry point and a pure-logic entry point.
