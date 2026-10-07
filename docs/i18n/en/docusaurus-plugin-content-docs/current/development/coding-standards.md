---
id: coding-standards
title: Coding Standards and SOLID
sidebar_position: 3
---

## Language

- Wherever JavaScript is needed, use **TypeScript**. Config files are `.ts` too (only the Prettier config is JSON).
- Enable `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`. `any` and non-null assertions (`!`) are forbidden.
- Use `import type` for type-only imports.
- Data crossing a boundary (helper responses, IPC requests, stored files) is **validated with zod**, and failures are returned as a `Result` instead of thrown.

## Applying SOLID

| Principle                 | magWin rule                                                                                                                                                                                                                                                         | Example                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **S**ingle Responsibility | A class changes for only one reason. The palette lifetime (`PaletteController`) is separate from window move calculation (`SnapService`), and the restore algorithm (`LayoutRestoreService`) is separate from concurrent execution and undo (`RestoreCoordinator`). | `WindowWaiter` only "waits until a window appears" |
| **O**pen/Closed           | Helper RPCs are added with `Router.register` without editing the dispatch code. Desktop switching strategies are extended by adding cases to `SwitchPlan`.                                                                                                          | `Handlers.swift`                                   |
| **L**iskov Substitution   | The test `FakeDesktopWorld` and the helper adapter honor the same port contract. An application test that passes with a fake must mean the same thing with the real adapter.                                                                                        | `application/test/fakes.ts`                        |
| **I**nterface Segregation | OS capabilities are split finely into `WindowQuery`, `WindowMover`, `DesktopNavigator`, `AppCatalog`, `AppLauncher`, `PermissionGate`, and so on. Require only what you need.                                                                                       | `SnapService` accepts only `WindowMover`           |
| **D**ependency Inversion  | application depends only on `domain/ports.ts`. Concrete classes are created only in `bootstrap.ts`. Time (`Clock`), timers (`Scheduler`), and IDs (`IdGenerator`) are injected too. Renderer components depend only on the `MagWinApi` obtained through `useApi()`. | `PaletteController(deps)`                          |

### Checklist

- If application code uses `new HelperClient`, `setTimeout`, `Date.now()`, or `fs` directly, it is in the wrong place. Inject them through ports.
- Move rules that can be expressed purely (selection, coordinates, matching, planning) into `packages/core` and test them by input and output.
- When a class gains a second responsibility, split it. Lint enforces 80 lines per function (120 for TSX), 4 parameters, and a cyclomatic complexity of 12.

## Lint

A single root `eslint.config.ts` applies to every package.

- `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`
- `max-lines-per-function` 80 (120 for TSX), `max-params` 4, `complexity` 12
- `no-console` (warn; only `error` is allowed)
- `explicit-module-boundary-types`, `consistent-type-imports`, `switch-exhaustiveness-check`
- `react-hooks` recommended rules (including no synchronous setState inside effects)
- Layer boundaries via `no-restricted-imports` ([Monorepo Structure](monorepo.md#dependency-direction))
- Prettier handles formatting, and `eslint-config-prettier` prevents conflicts.

```bash
pnpm lint
pnpm format
```

## Naming

- Interfaces (ports) are nouns without a prefix: `WindowMover`, `DesktopNavigator`. Implementations carry a technology name: `HelperWindowService`, `FileLayoutRepository`, `ElectronScreen`.
- Test files sit next to their target as `*.test.ts(x)`; test doubles go in a `test/` folder.
- User-visible strings live only in `src/shared/i18n/ko.ts` (source) and `en.ts`. `en.ts` follows the `Messages` type (the shape of `ko`), so a missing key fails type checking. The renderer uses `useI18n()`, and menu bar menus use `messagesFor(locale)`. Main-process services return only error **codes**. For details, see [ADR-005](../architecture/decisions/adr-005-localization.md).

## Electron Security

- Every window: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, with navigation and new windows blocked.
- The preload script exposes only the channels listed in `Channels`. The main process validates every request with zod and verifies that the sender is the app renderer (`file://` or the dev server).
- All renderer permission requests (camera, etc.) are denied. CSP: `script-src 'self'`.

## Swift

- `HelperCore` uses only Foundation (pure, verified with Swift Testing).
- AppKit, AX, and CGS calls live only in `HelperPlatform`. Private symbols are gathered in a single place, `PrivateAPIs.swift`.
- `NSScreen` and `NSEvent` monitors run on the main thread, RPC runs on the `rpc` queue, and AX checks run on the `edge` queue.
