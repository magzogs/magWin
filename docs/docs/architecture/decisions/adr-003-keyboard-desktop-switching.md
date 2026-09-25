---
id: adr-003-keyboard-desktop-switching
title: ADR-003 Desktop 전환은 사용자의 Mission Control 단축키로
---

- **상태**: 채택
- **날짜**: 2026-09-25

## 맥락

[ADR-002](adr-002-desktop-first-restore.md)의 복원은 원하는 Desktop으로 화면을 옮길 수 있어야 합니다.

| 방법                                        | 문제                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `CGSManagedDisplaySetCurrentSpace` (비공개) | Dock이 모르는 채로 바뀌어 창 표시가 깨짐                              |
| Mission Control을 열고 AXPress              | 접근성 트리가 macOS 27에서 Dock → WindowManager로 이동, 버전마다 깨짐 |
| **Mission Control 단축키 입력 합성**        | 단축키가 꺼져 있으면 쓸 수 없음                                       |

개발 Mac에서는 단축키가 기본값과 달랐습니다(Desktop 1 = ⌘1, 옆 Desktop = ⌥⌘←/→). 고정된 ⌃1 / ⌃→를 누르면 안 됩니다.

## 결정

- 헬퍼가 `com.apple.symbolichotkeys`의 `AppleSymbolicHotKeys`를 읽어 **사용자가 설정한 키와 보조 키 그대로** 누릅니다(ID 79/81 = 왼쪽/오른쪽 Space, 118+N−1 = Desktop N).
- 계획(`SpaceSwitchPlanner`, 순수 함수):
  1. 이미 그 Desktop이면 아무것도 하지 않습니다.
  2. "Desktop N으로 전환"이 켜져 있으면 한 번 누릅니다.
  3. 아니면 같은 디스플레이 안에서 전체 화면 Space까지 세어 좌우 이동을 그 횟수만큼 누릅니다. "Move left/right a space"는 커서가 있는 디스플레이에 작동하므로, 필요하면 커서를 그 디스플레이로 옮깁니다.
  4. 둘 다 꺼져 있으면 `noShortcut`.
- 누를 때마다 CGS로 현재 Space가 바뀌었는지 **확인**합니다(단계당 최대 2.5초). 직접 전환이 실패하면 좌우 이동으로 한 번 더 시도합니다. 끝나면 전환 애니메이션을 위해 0.35초 기다립니다.

## 결과

- 공개 입력 경로만 쓰므로 macOS 버전 변화에 비교적 강합니다. 필요한 것은 손쉬운 사용 권한(입력 합성)뿐입니다.
- 사용자는 전환 애니메이션을 보게 됩니다. 복원 HUD가 지금 어느 Desktop으로 가는지 보여 줍니다.
- 권한 및 상태 탭에서 어떤 단축키가 켜져 있는지 보여 주고, 설정 화면으로 바로 보냅니다.
