---
id: monorepo
title: 모노레포 구조
sidebar_position: 2
---

```text
magWin/
├── AGENTS.md                     # 작업 규칙 (이 문서들로 링크)
├── apps/desktop/                 # Electron 앱
│   ├── electron.vite.config.ts
│   ├── electron-builder.yml      # 패키징
│   └── src/
│       ├── shared/               # main·preload·renderer 공용: 채널, zod 계약, MagWinApi
│       ├── preload/              # contextBridge — 허용 목록 채널만
│       ├── main/
│       │   ├── domain/           # 포트(인터페이스)와 Emitter — 의존성 없음
│       │   ├── application/      # 기능 흐름 (포트에만 의존) + test/ fakes
│       │   ├── infrastructure/   # helper · persistence · electron · system 어댑터
│       │   ├── ipc/              # 채널 → application 연결, 페이로드 검증
│       │   ├── bootstrap.ts      # 조립 루트 (유일하게 new)
│       │   └── index.ts          # 진입점 (--diagnose 포함)
│       └── renderer/
│           ├── index.html        # 단일 번들, ?view= 로 화면 선택
│           ├── preview.html      # 개발용 UI 미리보기
│           └── src/
│               ├── api/          # ApiContext (MagWinApi 주입)
│               ├── views/        # palette · ghost · manager · save · progress
│               ├── components/   # LayoutPreview …
│               ├── i18n/ko.ts    # 모든 문구와 오류 코드 번역
│               └── preview/      # 브라우저 미리보기용 가짜 API
├── packages/core/                # 순수 TS 도메인 (zod만 의존)
│   └── src/ geometry · grid · selection · palette · settings · system · layouts · restore
├── native/MagWinHelper/          # Swift 패키지
│   ├── Sources/HelperCore/       # 순수: 프로토콜, EdgeDetector, DwellTracker, 단축키 파서, 전환 계획
│   ├── Sources/HelperPlatform/   # AX · CGWindowList · CGS · NSWorkspace · 키 입력
│   ├── Sources/MagWinHelper/     # main.swift (조립), Handlers.swift (RPC 등록)
│   └── Tests/HelperCoreTests/    # Swift Testing
└── docs/                         # Docusaurus (이 사이트)
```

## 의존 방향

```text
apps/desktop ──▶ packages/core
renderer ──▶ shared ◀── main, preload
main: bootstrap ──▶ infrastructure ──▶ domain ◀── application
```

ESLint가 강제하는 규칙입니다.

| 위치                                          | 금지                                        |
| --------------------------------------------- | ------------------------------------------- |
| `packages/core/src`                           | `electron`, `node:*`, `react`, `fs`, `path` |
| `apps/desktop/src/main/domain`, `application` | `electron`, `node:*`, `infrastructure`      |
| `apps/desktop/src/renderer`                   | `electron`, `node:*`, `main`, `preload`     |

`packages/core`의 `tsconfig`는 `lib: ["ES2022"]`, `types: []`라서 DOM이나 Node 타입도 쓸 수 없습니다.
