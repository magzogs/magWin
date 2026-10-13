---
id: helper-protocol
title: Helper Protocol
sidebar_position: 2
---

This is the contract between the Electron main process and `MagWinHelper`. The code has two sources of truth, and you must **always change them together**.

- Swift: `native/MagWinHelper/Sources/HelperCore/Protocol.swift`
- TypeScript (zod): `apps/desktop/src/main/infrastructure/helper/protocol.ts`

## Transport

- The helper's stdin/stdout, **one JSON object per line** (UTF-8, separated by `\n`)
- stderr carries logs. The main process records them as `[helper] …`.
- When stdin closes (the app quits), the helper finishes its remaining requests and exits.
- The helper processes requests **one line at a time, in order**. During a long operation such as a Desktop switch, the next request waits. Edge watching runs on a separate thread, so it does not stall.

```text
→ {"id":7,"method":"windows.setFrame","params":{"windowId":123,"pid":456,"frame":{"x":0,"y":25,"width":720,"height":875}}}
← {"id":7,"ok":true,"result":{"frame":{"x":0,"y":25,"width":720,"height":875}}}
← {"id":8,"ok":false,"error":{"code":"windowNotFound","message":"Window 9 of process 1 is not accessible"}}
← {"event":"edge.hover","data":{"windowId":123,"pid":456,"appName":"Notes","edge":"top", …}}
```

Swift **omits** optional fields that have no value (`bundleId`, `title`, `uuid`, and so on). The TS-side schema normalizes both omission and `null` to `null`.

## Methods

| Method                               | params                                          | result                                                                                |
| ------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| `hello`                              | –                                               | `{ protocolVersion, pid, accessibility }`                                             |
| `permissions.status`                 | –                                               | `{ accessibility, screenRecording }`                                                  |
| `permissions.requestAccessibility`   | –                                               | Same (shows the system prompt)                                                        |
| `permissions.requestScreenRecording` | –                                               | Same (adds OrgaWin to the Screen Recording list, prompts the first time)              |
| `displays.list`                      | –                                               | `{ displays: [{ id, uuid, name, frame, visibleFrame, isMain }] }`                     |
| `spaces.topology`                    | –                                               | `{ displays: [{ displayUuid, currentSpaceId, spaces: [{ id, uuid?, kind }] }] }`      |
| `spaces.switch`                      | `{ spaceId }`                                   | `{ method: "none" \| "direct" \| "steps", steps }`                                    |
| `hotkeys.status`                     | –                                               | `{ switchToDesktop: [{ number, binding }], moveLeft?, moveRight? }`                   |
| `windows.list`                       | `{ scope: "current" \| "all" }`                 | `{ windows: [{ id, pid, bundleId?, appName, title?, frame, isOnScreen, spaceIds }] }` |
| `windows.setFrame`                   | `{ windowId, pid, frame }`                      | `{ frame }` (the frame the app actually accepted)                                     |
| `windows.focus`                      | `{ windowId, pid }`                             | `{}`                                                                                  |
| `apps.list`                          | –                                               | `{ apps: [{ pid, bundleId?, name, path?, isHidden }] }`                               |
| `apps.launch`                        | `{ bundleId?, path? }`                          | `{ pid }`                                                                             |
| `edge.configure`                     | `{ enabled, edges, dwellMs, bandPx, modifier }` | `{}`                                                                                  |
| `edge.setPaused`                     | `{ paused }`                                    | `{}`                                                                                  |

- All coordinates are [Quartz global coordinates](coordinates.md).
- `spaces.kind`: `desktop` (CGS type 0), `fullscreen` (type 4), `other`
- In `windows.list`, `current` means windows on the screen of the Desktop that is currently visible, and `all` means windows on every Desktop (auxiliary windows that do not belong to a Space are excluded).
- The helper starts with edge watching **turned off**, and main sends the user's settings with `edge.configure` after `hello`.

## Events

| Event          | data                                                        | When                                                                                   |
| -------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `edge.hover`   | `{ windowId, pid, bundleId?, appName, frame, edge, point }` | The cursor dwelled on an edge for the dwell time and the window can be moved           |
| `edge.blocked` | `{ reason: "accessibility" }`                               | The cursor dwelled but the Accessibility permission is missing (once every 30 seconds) |
| `log`          | `{ level, message }`                                        | Startup notices and the like                                                           |

## Error codes

| Code                  | Meaning                                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| `badRequest`          | Malformed JSON or params                                                    |
| `unknownMethod`       | The method does not exist                                                   |
| `accessibilityDenied` | Accessibility permission is missing                                         |
| `windowNotFound`      | The window could not be found through AX (closed, on another Desktop, etc.) |
| `notResizable`        | A window whose position or size cannot be changed                           |
| `fullscreen`          | A full-screen window                                                        |
| `spaceNotFound`       | The Space does not exist                                                    |
| `noShortcut`          | No usable Mission Control shortcut                                          |
| `switchTimeout`       | The shortcut was pressed but the Desktop did not change                     |
| `appNotFound`         | The app could not be found by bundle ID or path                             |
| `launchFailed`        | App launch failed or timed out                                              |
| `internal`            | Any other exception                                                         |

The main-side client adds `helperTimeout`, `helperClosed`, and `helperProtocol` (result schema mismatch).

## Versioning

If `hello.protocolVersion` differs from the app's `HELPER_PROTOCOL_VERSION`, the app does not use the helper and enters an error state. **Adding** fields is compatible, but if you rename a field, change its meaning, or remove a required field, bump the version on both sides together.

## Checking by hand

The helper can run standalone (example with read-only commands).

```bash
pnpm build:helper
printf '%s\n' '{"id":1,"method":"hello"}' '{"id":2,"method":"spaces.topology"}' \
  | native/MagWinHelper/.build/release/MagWinHelper
```
