---
id: coding-standards
title: 코딩 표준과 SOLID
sidebar_position: 3
---

## 언어

- JavaScript가 필요한 곳은 **모두 TypeScript**입니다. 설정 파일도 `.ts`입니다(Prettier 설정만 JSON).
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`를 켭니다. `any`와 non-null 단언(`!`)은 금지입니다.
- 타입 전용 import는 `import type`을 씁니다.
- 경계를 넘는 데이터(헬퍼 응답, IPC 요청, 저장 파일)는 **zod로 검증**하고, 실패는 예외 대신 `Result`로 돌려줍니다.

## SOLID 적용

| 원칙                      | magWin의 규칙                                                                                                                                                                                                                    | 예                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **S**ingle Responsibility | 한 클래스는 한 가지 이유로만 바뀝니다. 팔레트의 수명(`PaletteController`)과 창 이동 계산(`SnapService`), 복원 알고리즘(`LayoutRestoreService`)과 동시 실행·되돌리기(`RestoreCoordinator`)를 나눴습니다.                          | `WindowWaiter`는 "창이 뜰 때까지 기다리기"만 합니다 |
| **O**pen/Closed           | 헬퍼 RPC는 `Router.register`로 추가하고 디스패치 코드는 고치지 않습니다. Desktop 전환 전략은 `SwitchPlan`에 케이스를 더하는 식으로 늘립니다.                                                                                     | `Handlers.swift`                                    |
| **L**iskov Substitution   | 테스트의 `FakeDesktopWorld`와 헬퍼 어댑터는 같은 포트 계약을 지킵니다. 가짜로 통과한 application 테스트는 실제 어댑터에서도 같은 의미여야 합니다.                                                                                | `application/test/fakes.ts`                         |
| **I**nterface Segregation | OS 기능을 `WindowQuery`, `WindowMover`, `DesktopNavigator`, `AppCatalog`, `AppLauncher`, `PermissionGate` …로 잘게 나눕니다. 필요한 것만 요구합니다.                                                                             | `SnapService`는 `WindowMover`만 받습니다            |
| **D**ependency Inversion  | application은 `domain/ports.ts`에만 의존합니다. 구체 클래스는 `bootstrap.ts`에서만 만듭니다. 시간(`Clock`), 타이머(`Scheduler`), ID(`IdGenerator`)도 주입합니다. 렌더러 컴포넌트는 `useApi()`로 받은 `MagWinApi`에만 의존합니다. | `PaletteController(deps)`                           |

### 체크리스트

- application 코드에서 `new HelperClient`, `setTimeout`, `Date.now()`, `fs`를 직접 쓰고 있다면 잘못된 위치입니다. 포트로 주입하세요.
- 순수하게 표현할 수 있는 규칙(선택, 좌표, 매칭, 계획)은 `packages/core`로 옮기고 입력·출력으로 테스트합니다.
- 클래스에 두 번째 책임이 생기면 나누세요. lint가 함수 80줄(TSX 120줄), 매개변수 4개, 순환 복잡도 12를 강제합니다.

## Lint

루트 `eslint.config.ts` 하나가 모든 패키지에 적용됩니다.

- `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`
- `max-lines-per-function` 80 (TSX 120), `max-params` 4, `complexity` 12
- `no-console` (warn, error만 허용)
- `explicit-module-boundary-types`, `consistent-type-imports`, `switch-exhaustiveness-check`
- `react-hooks` 권장 규칙 (effect 안에서 동기 setState 금지 등)
- 계층 경계 `no-restricted-imports` ([모노레포 구조](monorepo.md#의존-방향))
- Prettier가 포맷을 맡고 `eslint-config-prettier`로 충돌을 막습니다.

```bash
pnpm lint
pnpm format
```

## 네이밍

- 인터페이스(포트)는 접두사 없는 명사입니다: `WindowMover`, `DesktopNavigator`. 구현체는 기술 이름을 붙입니다: `HelperWindowService`, `FileLayoutRepository`, `ElectronScreen`.
- 테스트 파일은 대상 옆 `*.test.ts(x)`, 테스트 더블은 `test/` 폴더에 둡니다.
- 사용자에게 보이는 문구는 `src/shared/i18n/ko.ts`(원본)와 `en.ts`에만 둡니다. `en.ts`는 `Messages` 타입(= `ko`의 모양)을 따르므로 키가 빠지면 타입 검사가 실패합니다. 렌더러는 `useI18n()`, 메뉴 막대 메뉴는 `messagesFor(locale)`로 씁니다. 메인 프로세스의 서비스는 오류 **코드**만 돌려줍니다. 자세한 내용은 [ADR-005](../architecture/decisions/adr-005-localization.md).

## Electron 보안

- 모든 창: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, 탐색·새 창 차단.
- preload는 `Channels`에 있는 채널만 노출합니다. 메인은 모든 요청을 zod로 검증하고, 보낸 곳이 앱 렌더러(`file://` 또는 개발 서버)인지 확인합니다.
- 렌더러 권한 요청(카메라 등)은 모두 거절합니다. CSP: `script-src 'self'`.

## Swift

- `HelperCore`는 Foundation만 씁니다(순수, Swift Testing으로 검증).
- AppKit·AX·CGS 호출은 `HelperPlatform`에만 둡니다. 비공개 심볼은 `PrivateAPIs.swift` 한 곳에 모읍니다.
- `NSScreen`, `NSEvent` 모니터는 메인 스레드, RPC는 `rpc` 큐, AX 확인은 `edge` 큐에서 실행합니다.
