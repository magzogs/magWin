# OrgaWin

[English](README.md) · **한국어**

macOS 메뉴 막대 창 관리 앱입니다.

- **엣지 그리드 스냅**: 창 가장자리에 커서를 잠시 두면 2×2, 2×3, 3×2, 3×3, 4×4 같은 그리드 팔레트가 뜹니다. 한 그리드에서 칸(직사각형)을 고르고 **적용**을 누르면 창이 그 자리로 갑니다.
- **Desktop 레이아웃**: 창 배치를 Desktop 정보까지 저장합니다. 복원할 때는 그 Desktop으로 먼저 이동한 뒤 앱을 띄워 배치합니다.
- **언어**: 한국어 · English (설정 › 일반 › 언어, 기본은 시스템 설정 따르기). 문서도 두 언어로 빌드됩니다.

## 내려받기

**[Releases](https://github.com/magzogs/orgawin/releases/latest)**에서 최신 `OrgaWin-<버전>-arm64.dmg`를 받아 열고, OrgaWin을 **응용 프로그램** 폴더로 끌어다 놓으세요.

- macOS 13 이상, Apple Silicon Mac이 필요합니다.
- Developer ID로 서명하고 Apple 공증을 받은 앱입니다.
- 자동으로 업데이트됩니다. 새 버전은 백그라운드로 받아지고, 준비되면 메뉴 막대 메뉴에 **재시작해서 업데이트**가 나타납니다.

## 처음 실행할 때

다른 앱의 창을 옮기고 Desktop 전환 단축키를 누르려면 **손쉬운 사용** 권한이 필요합니다. 처음 실행하면 권한 및 상태 탭이 열립니다. **권한 요청**을 누른 뒤 **시스템 설정 › 개인정보 보호 및 보안 › 손쉬운 사용**에서 OrgaWin을 켜세요.

레이아웃을 복원하려면 **시스템 설정 › 키보드 › 키보드 단축키 › Mission Control**에서 "데스크탑 N으로 전환" 또는 "왼쪽/오른쪽 스페이스로 이동" 중 하나가 켜져 있어야 합니다.

## 지원

- 버그 신고와 기능 요청: [Issues](https://github.com/magzogs/orgawin/issues)
- 메일: orgawin@magzog.com

메뉴 막대 메뉴의 **지원 받기…**에서 진단 정보를 복사해 Issue나 메일에 붙여 넣을 수 있습니다.

## 개발

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
