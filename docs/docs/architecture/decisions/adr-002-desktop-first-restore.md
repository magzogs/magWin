---
id: adr-002-desktop-first-restore
title: ADR-002 Desktop으로 먼저 이동한 뒤 앱을 띄워 배치
---

- **상태**: 채택
- **날짜**: 2026-09-25

## 맥락

레이아웃은 창마다 어느 Desktop(Mission Control Space)에 있었는지 기억합니다. 복원할 때 창을 그 Desktop에 두는 방법을 조사했습니다.

- 다른 앱의 창을 특정 Space로 보내는 **공개 API는 없습니다.**
- 비공개 API(`CGSMoveWindowsToManagedSpace`, compat ID 우회)는 macOS 14.5와 15에서 막혔습니다. Hammerspoon `hs.spaces.moveWindowToSpace`와 yabai 이슈에서 확인됩니다.
- SIP를 꺼야 하는 방식(yabai scripting addition)은 일반 사용자 앱에 쓸 수 없습니다.
- UI 자동화(창을 합성 드래그로 잡고 Desktop 전환)는 macOS 26에서 동작한 사례가 있지만 27에서 이미 바뀌었고, 제목 표시줄을 잘못 잡으면 탭을 떼어내는 등 사용자 상태를 망칠 수 있습니다.

## 결정

사용자가 정한 방식을 따릅니다. **"해당 Desktop에 띄우도록 명령하면, 먼저 그 Desktop으로 이동하고, 그 Desktop에서 앱을 띄우고 배치한다."**

1. 복원 대상 창을 Desktop별로 묶습니다.
2. 그 Desktop으로 전환합니다([ADR-003](adr-003-keyboard-desktop-switching.md)).
3. 실행 중이 아닌 앱을 실행하면 새 창이 **현재 Desktop에** 열립니다. 창이 하나도 없는 실행 중인 앱은 다시 열기를 보냅니다.
4. 그 Desktop에 뜬 창을 저장된 창과 짝지어 배치합니다.

이미 **다른 Desktop에 창이 있는 실행 중인 앱은 옮기지 않고**, 그 창이 지금 어느 Desktop에 있는지 보고합니다.

## 결과

- 재부팅 직후나 앱을 모두 종료한 상태의 복원은 Desktop까지 정확히 됩니다.
- 사용 중에 복원하면 일부 창은 `onOtherDesktop`으로 보고됩니다. HUD가 "앱을 종료한 뒤 다시 복원하거나 Mission Control에서 끌어다 놓으라"고 안내합니다.
- 번호가 큰 Desktop부터 처리해서, 추가 전환 없이 레이아웃의 가장 앞 Desktop에서 끝납니다.
- 창을 Space 사이로 옮기는 안정적인 방법이 생기면 `ensureApps` 단계 뒤에 "모아 오기" 전략을 추가할 수 있습니다. 이 결정은 그 확장을 막지 않습니다.
