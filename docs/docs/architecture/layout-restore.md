---
id: layout-restore
title: 레이아웃 캡처와 복원
sidebar_position: 6
---

## 데이터 모델

```json
{
  "schemaVersion": 1,
  "id": "0b6c…",
  "name": "코딩",
  "createdAt": "2026-09-25T10:00:00.000Z",
  "updatedAt": "2026-09-25T10:00:00.000Z",
  "displays": [
    { "uuid": "2084E4AD-…", "name": "LG HDR 4K", "frame": {}, "visibleFrame": {}, "isMain": true }
  ],
  "windows": [
    {
      "app": {
        "bundleId": "com.microsoft.VSCode",
        "name": "Code",
        "path": "/Applications/Visual Studio Code.app"
      },
      "title": "main.ts — OrgaWin",
      "frame": { "x": 0, "y": 30, "width": 2534, "height": 2130 },
      "relativeFrame": { "x": 0, "y": 0, "width": 0.66, "height": 1 },
      "displayUuid": "2084E4AD-…",
      "desktop": {
        "number": 1,
        "displayUuid": "2084E4AD-…",
        "indexOnDisplay": 1,
        "spaceUuid": null,
        "spaceId": 1
      },
      "order": 0
    }
  ]
}
```

스키마는 `packages/core/src/layouts/model.ts`(zod)이며, 파일을 읽을 때마다 검증합니다.

## Desktop 식별

`CGSCopyManagedDisplaySpaces`는 디스플레이마다 Space 목록(ManagedSpaceID, UUID, type)을 줍니다. `buildDesktopCatalog`가 여기서 **Desktop**(type 0)만 골라 세 가지 번호를 붙입니다.

| 번호             | 의미                                                        | 쓰임                            |
| ---------------- | ----------------------------------------------------------- | ------------------------------- |
| `number`         | Mission Control의 "Desktop N" (디스플레이를 넘어 전역 번호) | UI, "Desktop N으로 전환" 단축키 |
| `indexOnDisplay` | 그 디스플레이 안에서의 순서                                 | 복원 시 대응                    |
| `position`       | 전체 화면 Space까지 포함한 위치                             | 좌우 이동 횟수 계산             |

ManagedSpaceID는 재부팅하면 바뀔 수 있고 첫 Desktop의 UUID는 비어 있기도 해서, 복원할 때는 **UUID → (디스플레이, 순서) → 전역 번호** 순으로 지금의 Desktop을 찾습니다(`resolveDesktop`).

## 캡처 규칙 (`buildCaptureDraft`)

- 전체 화면 Space의 창은 제외하고 개수만 알려 줍니다.
- 숨긴 앱(⌘H)의 창은 제외합니다.
- 보이는 Desktop에 속했는데 화면에 없는 창(최소화·보조 창)은 제외합니다.
- 다른 Desktop의 창은 속을 볼 수 없으므로, **제목도 없고 320×200보다 작으면** 보조 창(팝업, 찾기 막대 등)으로 보고 제외합니다.
- 설정의 제외 번들 ID는 체크 해제 상태로 보여 줍니다.

## 복원 알고리즘 (`LayoutRestoreService`)

사용자가 정한 원칙을 따릅니다. **"해당 Desktop으로 먼저 이동하고, 그 Desktop에서 앱을 띄워 배치한다."** ([ADR-002](decisions/adr-002-desktop-first-restore.md))

1. `planRestore`: 창을 **복원할 Desktop별로 묶습니다.** 찾지 못한 Desktop의 창은 "현재 Desktop" 그룹으로 보내고 `desktopMissing`으로 보고합니다. 그룹 순서는 현재 Desktop 그룹 → **번호 큰 Desktop부터**입니다.
2. 그룹마다:
   1. `spaces.switch` — 실패하면 그 그룹 전체를 `desktopSwitchFailed`로 보고하고 넘어갑니다.
   2. **앱 확보**: 실행 중이 아닌 앱은 실행하고, 실행 중이지만 창이 하나도 없는 앱은 다시 열기(reopen)를 보냅니다. 새 창은 지금 Desktop에 열립니다. 다른 Desktop에 창이 있는 실행 중인 앱은 **건드리지 않습니다.** 활성화하면 macOS가 그 Desktop으로 화면을 옮기기 때문입니다.
   3. **대기**: 250ms마다 `windows.list(current)`로 그 Space의 창을 확인합니다. 앱별 필요한 창 수가 채워지거나 시간이 다 되면(앱을 실행했으면 15초, 아니면 1.5초) 멈춥니다.
   4. **매칭** (`matchWindows`): 같은 앱끼리만, 점수 = 1 + 100 × 제목 유사도(바이그램 Dice) + 20 × 겹침 비율(IoU)로 탐욕적 1:1 대응.
   5. **배치**: `resolveTargetFrame` → `windows.setFrame`. 앱을 새로 실행했으면 0.7초 뒤 **한 번 더** 적용합니다(앱이 스스로 이전 위치를 복원하는 경우).
   6. **설명** (`explainMissingWindow`): 남은 창은 `appNotRunning` / `onOtherDesktop`(지금 있는 Desktop 번호 포함) / `windowNotFound`로 분류합니다.
3. `RestoreCoordinator`는 한 번에 하나만 실행하고, 시작 전에 전체 배치를 스냅샷으로 남겨 **되돌리기**에 씁니다.

## 창 이동 (`AXWindowService.setFrame`)

- AX 창 요소는 비공개 `_AXUIElementGetWindow`로 CGWindowID와 짝을 짓습니다.
- **크기 → 위치 → 크기** 순으로 설정합니다. 다른 모니터로 옮길 때 이전 화면 크기에 막히는 앱을 위해서입니다.
- Chromium 계열이 켜 두는 `AXEnhancedUserInterface`는 이동하는 동안 잠시 끕니다(애니메이션·지연 방지).
- 대상 앱을 앞으로 가져오는 일은 `NSRunningApplication.activate`가 아니라 AX(`AXFrontmost`, `AXMain`, `AXRaise`)로 합니다. macOS 14부터 비활성 앱이 다른 앱을 활성화하는 것이 제한되기 때문입니다.

## 비공개 API 목록

| 심볼                          | 용도                      | 대체 수단           |
| ----------------------------- | ------------------------- | ------------------- |
| `CGSMainConnectionID`         | 연결                      | –                   |
| `CGSCopyManagedDisplaySpaces` | Desktop 목록·현재 Desktop | 없음                |
| `CGSCopySpacesForWindows`     | 창이 속한 Desktop         | 없음                |
| `_AXUIElementGetWindow`       | AX 요소 ↔ 창 ID           | 프레임 비교(부정확) |

모두 **읽기**만 합니다. 창을 다른 Space로 보내는 비공개 쓰기 API(`CGSMoveWindowsToManagedSpace` 등)는 macOS 14.5·15에서 막혀 쓰지 않습니다. 새 macOS가 나오면 [수동 점검](../development/testing.md#수동-점검-목록)을 다시 하세요.
