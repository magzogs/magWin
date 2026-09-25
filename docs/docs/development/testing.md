---
id: testing
title: 테스트
sidebar_position: 4
---

## 원칙

- **새 모듈은 테스트와 함께** 들어옵니다. 버그를 고치면 고치기 전에 실패하는 테스트를 먼저 씁니다.
- 순수 로직은 입력·출력으로만 검증합니다. 시간·타이머·헬퍼·파일은 포트로 주입해 가짜로 바꿉니다.
- 실제 OS가 필요한 코드(AX, CGS, 키 입력)는 얇은 어댑터에 가두고 [수동 점검](#수동-점검-목록)으로 확인합니다.

## 실행

```bash
pnpm test              # Vitest (core + desktop)
pnpm test:helper       # swift test
pnpm check             # 전체
pnpm vitest run --project core
```

## 계층별 테스트

| 계층                     | 환경                    | 예                                                                                             |
| ------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------- |
| `packages/core`          | node                    | 직사각형 선택 규칙, 셀→프레임 경계·간격, 팔레트 배치, 설정 복구, 캡처 필터, 창 매칭, 복원 계획 |
| desktop `application`    | node + fakes            | 팔레트 표시·숨김 타이밍, 스냅 실패 처리, **Desktop 전환 후 앱 실행 순서**, 되돌리기            |
| desktop `infrastructure` | node                    | 헬퍼 클라이언트 상관관계·시간 초과·이벤트, 어댑터 매핑, 파일 저장소, 트레이 메뉴               |
| desktop `renderer`       | jsdom + Testing Library | 팔레트 드래그 선택·적용 버튼 표시, 저장 HUD, 진행 HUD, 관리 탭                                 |
| `HelperCore` (Swift)     | Swift Testing           | 가장자리 판정·모서리 제외, dwell 상태 머신, 단축키 파서, 전환 계획, RPC 라우터                 |

`FakeDesktopWorld`(`application/test/fakes.ts`)는 작은 가상 macOS입니다. 창은 Space에 속하고, 디스플레이마다 현재 Space가 있고, 앱을 실행하면 창이 **현재 Space에** 열립니다. 복원 테스트는 이 모델 위에서 "Desktop을 먼저 전환해야 창이 그 Desktop에 생긴다"를 검증합니다.

## 수동 점검 목록

OS 동작은 단위 테스트로 대신할 수 없습니다. macOS를 올리거나 헬퍼의 `HelperPlatform`을 바꾸면 아래를 확인하세요. 먼저 `--diagnose`로 권한과 단축키를 봅니다.

### 엣지 스냅

- [ ] Finder, Safari/Chrome, VS Code, Terminal 창의 네 변에서 팔레트가 뜬다
- [ ] 가장자리를 끌어 크기를 바꾼 뒤 그 자리에서 팔레트가 뜨지 않는다
- [ ] 모서리, 메뉴 막대, Dock에서는 뜨지 않는다
- [ ] 팔레트가 떠도 대상 앱의 포커스가 유지된다
- [ ] 첫 클릭부터 셀이 선택되고, 드래그가 팔레트 밖에서 끝나도 선택이 유지된다
- [ ] 미리보기(ghost)가 실제 적용 위치와 같다
- [ ] 적용 후 창이 앞으로 오고, 같은 가장자리에서 바로 다시 뜨지 않는다
- [ ] 전체 화면 앱 위에서도 팔레트가 보인다
- [ ] 외부 모니터(음수 좌표 포함)에서 올바른 위치에 적용된다
- [ ] Stage Manager를 켠 상태에서 동작을 확인한다

### 레이아웃

- [ ] Desktop 2개 이상에 창을 두고 저장 → 저장 HUD의 Desktop 번호가 Mission Control과 같다
- [ ] 앱을 모두 종료한 뒤 전체 복원 → 각 Desktop으로 이동하며 앱이 그 Desktop에 열린다
- [ ] "Desktop N만 복원"이 그 Desktop으로 이동해 그 창들만 배치한다
- [ ] "Desktop N으로 전환" 단축키를 끄고 좌우 이동만으로도 전환된다
- [ ] 두 단축키를 모두 끄면 `desktopSwitchFailed`가 안내와 함께 보고된다
- [ ] 다른 Desktop에 창이 있는 실행 중인 앱은 `onOtherDesktop`으로 보고된다
- [ ] 되돌리기가 앱을 실행하지 않고 위치만 되돌린다
- [ ] 모니터를 바꾼 뒤 복원하면 비율로 배치된다
