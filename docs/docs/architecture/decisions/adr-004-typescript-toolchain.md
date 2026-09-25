---
id: adr-004-typescript-toolchain
title: ADR-004 TypeScript 전용 도구 체인과 버전
---

- **상태**: 채택
- **날짜**: 2026-09-25

## 맥락

요구 사항: "JS를 쓰려면 반드시 TS로." 설정 파일까지 포함해 JavaScript 소스를 두지 않습니다. 2026년 9월 기준 최신 버전들이 서로 맞지 않는 부분이 있었습니다.

| 도구                 | 최신     | 제약                                               |
| -------------------- | -------- | -------------------------------------------------- |
| TypeScript           | 7.0 (Go) | typescript-eslint 8.70이 `>=4.8.4 <6.1.0`만 지원   |
| Vite                 | 8        | electron-vite 5가 Vite `^5 \|\| ^6 \|\| ^7`만 지원 |
| @vitejs/plugin-react | 6        | Vite 8 전용                                        |

## 결정

| 도구                        | 버전      |
| --------------------------- | --------- |
| TypeScript                  | 6.0.3     |
| Electron / electron-vite    | 44 / 5.0  |
| Vite (pnpm override로 고정) | 7.3       |
| Vitest                      | 4.1       |
| ESLint / typescript-eslint  | 10 / 8.70 |
| React                       | 19.3      |
| zod                         | 4         |
| Docusaurus                  | 3.10      |

- 설정 파일도 TS입니다. `eslint.config.ts`(jiti로 로드), `vitest.config.ts`, `electron.vite.config.ts`, `vite.preview.config.ts`, `docusaurus.config.ts`, `sidebars.ts`. Prettier 설정은 JSON입니다.
- 앱의 런타임 의존성은 모두 번들에 넣습니다(`externalizeDeps: false`). 샌드박스 preload가 파일 하나로 끝나고, 패키징에 `node_modules`가 필요 없습니다.
- Swift 헬퍼는 Swift 6 툴체인에 **Swift 5 언어 모드**를 씁니다. AX·CF 타입의 Sendable 제약 대신 명시적 큐(`rpc`, `edge`, 메인)로 동시성을 관리합니다.

## 결과

- TypeScript 7로 올리려면 typescript-eslint가 지원해야 합니다. 그때 이 ADR을 대체하는 새 ADR을 쓰세요.
- 렌더러 번들에 zod가 들어가 크기가 커집니다(약 870KB). 로컬 앱이라 허용하되, 줄이려면 core를 스키마/순수 로직 진입점으로 나눕니다.
