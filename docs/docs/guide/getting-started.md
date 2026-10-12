---
id: getting-started
title: 시작하기
sidebar_position: 1
---

## 요구 사항

| 항목          | 버전                                                     |
| ------------- | -------------------------------------------------------- |
| macOS         | 13 이상 (개발·검증: 26.6)                                |
| Xcode / Swift | Swift 6 툴체인 (Xcode 16 이상, 개발: Xcode 26.1 / 6.2.1) |
| Node.js       | 22.12 이상                                               |
| pnpm          | 9 (`corepack enable`)                                    |

## 설치와 실행

```bash
pnpm install        # 의존성 + Electron 바이너리
pnpm dev            # Swift 헬퍼 빌드 → electron-vite 개발 모드
```

실행하면 메뉴 막대에 2×2 격자 아이콘이 생깁니다. Dock 아이콘은 설정 창을 열 때만 나타납니다.

## 권한

| 권한            | 필요 여부 | 용도                                                  |
| --------------- | --------- | ----------------------------------------------------- |
| **손쉬운 사용** | 필수      | 다른 앱의 창 이동·크기 변경, Desktop 전환 단축키 입력 |
| 화면 기록       | 선택      | 다른 Desktop에 있는 창의 **제목**을 읽을 때만 사용    |

처음 실행하면 권한 및 상태 탭이 열립니다. **권한 요청**을 누르면 macOS 안내가 뜨고, **시스템 설정 › 개인정보 보호 및 보안 › 손쉬운 사용**에서 켜면 됩니다.

:::caution 개발 모드의 권한 대상
`pnpm dev`로 실행한 Electron은 터미널이 띄운 자식 프로세스라서, macOS는 권한을 **명령을 실행한 터미널 앱**(Terminal, iTerm, VS Code 등)에 묻습니다. 개발 중에는 그 앱에 손쉬운 사용 권한을 주세요. 패키징한 `OrgaWin.app`은 자기 이름으로 권한을 받습니다.
:::

## 언어

OrgaWin은 한국어와 영어를 지원합니다. 메뉴 막대 아이콘의 **🌐 언어** 하위 메뉴에서 바로 바꾸거나, **설정 › 일반 › 언어**에서 고릅니다.

| 값                 | 동작                                                              |
| ------------------ | ----------------------------------------------------------------- |
| 시스템 설정 따르기 | macOS의 선호 언어 순서에서 지원하는 첫 언어. 없으면 영어 (기본값) |
| 한국어 / English   | 그 언어로 고정                                                    |

바꾸면 열려 있는 창과 메뉴 막대 메뉴에 바로 적용됩니다. 문서 사이트는 오른쪽 위 언어 메뉴에서 바꿉니다.

## Desktop 전환 단축키

레이아웃 복원은 **키보드 설정 › 키보드 단축키 › Mission Control**의 단축키를 OrgaWin이 대신 눌러서 Desktop을 옮깁니다. 둘 중 하나는 켜져 있어야 합니다.

- "Desktop N으로 전환" (기본값 꺼짐, 켜면 가장 빠름)
- "왼쪽/오른쪽 Space로 이동" (기본값 켜짐, ⌃← / ⌃→)

단축키를 바꿔 써도 괜찮습니다. OrgaWin이 현재 설정을 읽어서 그대로 누릅니다.

## 진단

권한이나 단축키 문제를 확인할 때는 창을 띄우지 않고 읽기 전용 점검만 하는 진단 모드를 쓰세요.

```bash
pnpm build
cd apps/desktop && npx electron . --diagnose
```

```json
{
  "helperPath": ".../native/MagWinHelper/.build/release/MagWinHelper",
  "permissions": { "accessibility": true, "screenRecording": false },
  "displays": ["LG HDR 4K 3840x2160 (main)"],
  "desktops": ["Desktop 1 (space 1) current"],
  "hotkeys": { "directDesktops": [1, 2], "moveLeft": true, "moveRight": true },
  "visibleWindows": 3,
  "allWindows": 12,
  "runningApps": 7
}
```

## UI만 미리보기

권한이나 헬퍼 없이 화면만 다듬을 때는 브라우저 미리보기를 씁니다. 메모리 기반 가짜 API로 팔레트, 관리 창, HUD를 띄웁니다.

```bash
pnpm --filter @magwin/desktop preview:ui
# http://localhost:5199/preview.html
```
