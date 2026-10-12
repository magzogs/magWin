# magWin

[English](README.md) · **한국어**

macOS 메뉴 막대 창 관리 앱입니다.

- **엣지 그리드 스냅**: 창 가장자리에 커서를 잠시 두면 2×2, 2×3, 3×2, 3×3, 4×4 같은 그리드 팔레트가 뜹니다. 한 그리드에서 칸(직사각형)을 고르고 **적용**을 누르면 창이 그 자리로 갑니다.
- **Desktop 레이아웃**: 창 배치를 Desktop 정보까지 저장합니다. 복원할 때는 그 Desktop으로 먼저 이동한 뒤 앱을 띄워 배치합니다.
- **언어**: 한국어 · English (설정 › 일반 › 언어, 기본은 시스템 설정 따르기). 문서도 두 언어로 빌드됩니다.

```bash
pnpm install
pnpm dev          # Swift 헬퍼 빌드 + 앱 실행 (손쉬운 사용 권한 필요)
pnpm check        # lint · 포맷 · 타입 · 테스트 전체
pnpm dev:docs     # 문서 (Docusaurus)
```

| 경로                  | 내용                               |
| --------------------- | ---------------------------------- |
| `apps/desktop`        | Electron + React 앱                |
| `packages/core`       | 순수 TypeScript 도메인 로직        |
| `native/MagWinHelper` | Swift 헬퍼 (Accessibility, Spaces) |
| `docs`                | Docusaurus 문서 사이트             |

작업 규칙은 [AGENTS.md](AGENTS.md)에 있습니다.
