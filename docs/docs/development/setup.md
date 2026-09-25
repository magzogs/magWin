---
id: setup
title: 개발 환경
sidebar_position: 1
---

## 설치

```bash
corepack enable          # pnpm 9
pnpm install
```

`pnpm install`의 `postinstall`이 Electron 바이너리가 없으면 내려받습니다. 그래도 `Electron failed to install correctly`가 나오면 직접 실행하세요.

```bash
node apps/desktop/node_modules/electron/install.js
```

## 자주 쓰는 명령

| 명령                                       | 하는 일                                                     |
| ------------------------------------------ | ----------------------------------------------------------- |
| `pnpm dev`                                 | 헬퍼 release 빌드 → 앱 개발 모드 (렌더러 HMR)               |
| `pnpm build:helper`                        | `swift build -c release` (헬퍼만)                           |
| `pnpm build`                               | 헬퍼 + electron-vite 번들 (`apps/desktop/out`)              |
| `pnpm --filter @magwin/desktop preview:ui` | 브라우저 UI 미리보기 (`http://localhost:5199/preview.html`) |
| `pnpm dev:docs`                            | 이 문서 사이트                                              |
| `pnpm check`                               | lint → 포맷 검사 → 타입체크 → Vitest → Swift 테스트         |

## 전체 검사

작업을 끝냈다고 말하기 전에 반드시 통과해야 합니다.

```bash
pnpm check
```

## 권한 (개발 모드)

개발 모드의 손쉬운 사용 권한은 `pnpm dev`를 실행한 **터미널 앱**에 줘야 합니다([시작하기](../guide/getting-started.md#권한)). 헬퍼만 단독으로 실험할 때도 마찬가지입니다.

## 환경 변수

| 변수                 | 쓰임                              |
| -------------------- | --------------------------------- |
| `MAGWIN_HELPER_PATH` | 다른 위치의 헬퍼 바이너리를 쓸 때 |
