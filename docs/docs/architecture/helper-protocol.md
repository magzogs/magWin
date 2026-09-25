---
id: helper-protocol
title: 헬퍼 프로토콜
sidebar_position: 2
---

Electron 메인 프로세스와 `MagWinHelper` 사이의 계약입니다. 코드의 기준은 두 곳이며 **항상 함께** 바꿉니다.

- Swift: `native/MagWinHelper/Sources/HelperCore/Protocol.swift`
- TypeScript(zod): `apps/desktop/src/main/infrastructure/helper/protocol.ts`

## 전송

- 헬퍼의 stdin/stdout, **한 줄에 JSON 객체 하나** (UTF-8, `\n` 구분)
- stderr는 로그입니다. 메인 프로세스가 `[helper] …`로 남깁니다.
- stdin이 닫히면(앱 종료) 헬퍼는 남은 요청을 끝내고 종료합니다.
- 요청은 헬퍼 안에서 **한 줄씩 순서대로** 처리됩니다. Desktop 전환처럼 긴 작업 중에는 다음 요청이 기다립니다. 가장자리 감시는 별도 스레드라 멈추지 않습니다.

```text
→ {"id":7,"method":"windows.setFrame","params":{"windowId":123,"pid":456,"frame":{"x":0,"y":25,"width":720,"height":875}}}
← {"id":7,"ok":true,"result":{"frame":{"x":0,"y":25,"width":720,"height":875}}}
← {"id":8,"ok":false,"error":{"code":"windowNotFound","message":"Window 9 of process 1 is not accessible"}}
← {"event":"edge.hover","data":{"windowId":123,"pid":456,"appName":"Notes","edge":"top", …}}
```

값이 없는 선택 필드(`bundleId`, `title`, `uuid` 등)는 Swift가 **생략**합니다. TS 쪽 스키마가 생략과 `null`을 모두 `null`로 정규화합니다.

## 메서드

| 메서드                             | params                                          | result                                                                                |
| ---------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| `hello`                            | –                                               | `{ protocolVersion, pid, accessibility }`                                             |
| `permissions.status`               | –                                               | `{ accessibility, screenRecording }`                                                  |
| `permissions.requestAccessibility` | –                                               | 같음 (시스템 안내 표시)                                                               |
| `displays.list`                    | –                                               | `{ displays: [{ id, uuid, name, frame, visibleFrame, isMain }] }`                     |
| `spaces.topology`                  | –                                               | `{ displays: [{ displayUuid, currentSpaceId, spaces: [{ id, uuid?, kind }] }] }`      |
| `spaces.switch`                    | `{ spaceId }`                                   | `{ method: "none" \| "direct" \| "steps", steps }`                                    |
| `hotkeys.status`                   | –                                               | `{ switchToDesktop: [{ number, binding }], moveLeft?, moveRight? }`                   |
| `windows.list`                     | `{ scope: "current" \| "all" }`                 | `{ windows: [{ id, pid, bundleId?, appName, title?, frame, isOnScreen, spaceIds }] }` |
| `windows.setFrame`                 | `{ windowId, pid, frame }`                      | `{ frame }` (앱이 실제로 받아들인 프레임)                                             |
| `windows.focus`                    | `{ windowId, pid }`                             | `{}`                                                                                  |
| `apps.list`                        | –                                               | `{ apps: [{ pid, bundleId?, name, path?, isHidden }] }`                               |
| `apps.launch`                      | `{ bundleId?, path? }`                          | `{ pid }`                                                                             |
| `edge.configure`                   | `{ enabled, edges, dwellMs, bandPx, modifier }` | `{}`                                                                                  |
| `edge.setPaused`                   | `{ paused }`                                    | `{}`                                                                                  |

- 좌표는 모두 [Quartz 전역 좌표](coordinates.md)입니다.
- `spaces.kind`: `desktop` (CGS type 0), `fullscreen` (type 4), `other`
- `windows.list`의 `current`는 지금 보이는 Desktop의 화면에 있는 창, `all`은 모든 Desktop의 창입니다(Space에 속하지 않은 보조 창은 제외).
- 헬퍼는 시작할 때 가장자리 감시를 **꺼 둔 채** 시작하고, 메인이 `hello` 뒤에 `edge.configure`로 사용자 설정을 보냅니다.

## 이벤트

| 이벤트         | data                                                        | 언제                                                    |
| -------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| `edge.hover`   | `{ windowId, pid, bundleId?, appName, frame, edge, point }` | 가장자리에 dwell 시간만큼 머물렀고 창을 옮길 수 있을 때 |
| `edge.blocked` | `{ reason: "accessibility" }`                               | 머물렀지만 손쉬운 사용 권한이 없을 때 (30초에 한 번)    |
| `log`          | `{ level, message }`                                        | 시작 알림 등                                            |

## 오류 코드

| 코드                  | 뜻                                             |
| --------------------- | ---------------------------------------------- |
| `badRequest`          | JSON 또는 params 형식 오류                     |
| `unknownMethod`       | 없는 메서드                                    |
| `accessibilityDenied` | 손쉬운 사용 권한 없음                          |
| `windowNotFound`      | AX로 그 창을 찾지 못함 (닫힘, 다른 Desktop 등) |
| `notResizable`        | 위치·크기를 바꿀 수 없는 창                    |
| `fullscreen`          | 전체 화면 창                                   |
| `spaceNotFound`       | 없는 Space                                     |
| `noShortcut`          | 쓸 수 있는 Mission Control 단축키 없음         |
| `switchTimeout`       | 단축키를 눌렀지만 Desktop이 바뀌지 않음        |
| `appNotFound`         | 번들 ID·경로로 앱을 찾지 못함                  |
| `launchFailed`        | 앱 실행 실패/시간 초과                         |
| `internal`            | 그 밖의 예외                                   |

메인 쪽 클라이언트는 여기에 `helperTimeout`, `helperClosed`, `helperProtocol`(결과 스키마 불일치)을 더합니다.

## 버전

`hello.protocolVersion`이 앱의 `HELPER_PROTOCOL_VERSION`과 다르면 앱은 헬퍼를 쓰지 않고 오류 상태가 됩니다. 필드를 **추가**하는 것은 호환되지만, 이름·의미를 바꾸거나 필수 필드를 지우면 양쪽 버전을 함께 올리세요.

## 손으로 확인하기

헬퍼는 단독으로 실행할 수 있습니다(읽기 전용 명령 예).

```bash
pnpm build:helper
printf '%s\n' '{"id":1,"method":"hello"}' '{"id":2,"method":"spaces.topology"}' \
  | native/MagWinHelper/.build/release/MagWinHelper
```
