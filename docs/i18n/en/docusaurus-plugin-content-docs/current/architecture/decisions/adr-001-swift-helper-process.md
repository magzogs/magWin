---
id: adr-001-swift-helper-process
title: ADR-001 Native features in a separate Swift helper process
---

- **Status**: Accepted
- **Date**: 2026-09-25

## Context

Electron alone cannot find or move another app's windows. What is needed is macOS Accessibility (AXUIElement), CGWindowList, private CGS calls, global mouse watching, and key input synthesis. There were three options.

| Option                       | Pros                                                                      | Cons                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| N-API native addon (Obj-C++) | Same process, no call latency                                             | Must be rebuilt for every Electron version, AX calls to unresponsive apps block the main thread, a crash takes down the whole app |
| osascript / JXA              | Little code                                                               | 100ms or more per call, no window ID or Space information, needs additional automation permission                                 |
| **Swift helper process**     | Natural use of macOS APIs from Swift, crash isolation, standalone testing | The binary must be signed and shipped alongside, inter-process communication                                                      |

## Decision

Place a Swift executable in `native/MagWinHelper`, have the Electron main process launch it as a child process, and communicate over stdin/stdout using **JSON Lines** ([Helper Protocol](../helper-protocol.md)).

- The helper is also split internally into pure logic (`HelperCore`, verified with Swift Testing) and OS adapters (`HelperPlatform`).
- On the main side, `HelperClient` pairs requests with responses and validates results with zod, and each feature uses the helper only through thin adapters that implement port interfaces (`WindowMover` and others).
- If the helper dies, `HelperProcess` restarts it up to five times with increasing delays.

## Consequences

- Permissions (TCC) attach to the **responsible process** that launched the helper. In a packaged app that is OrgaWin.app, and in development mode it is the terminal app that ran `pnpm dev`.
- Communication latency is under 1ms, so there is no perceptible difference. Edge detection finishes inside the helper and only the result events cross over.
- When shipping, the helper binary must be signed with the same certificate as the app ([Release](../../development/release.md)).
