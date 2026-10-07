---
id: grid-selection
title: 그리드 선택 모델
sidebar_position: 5
---

`packages/core/src/selection/selection.ts`의 순수 리듀서입니다. 렌더러는 포인터 입력을 액션으로 바꿀 뿐입니다(`usePaletteSelection`).

## 상태

```ts
interface GridSelection {
  presetId: string; // 선택을 가진 유일한 컴포넌트
  anchor: Cell; // 누르기 시작한 칸
  range: CellRange; // 포함 범위의 직사각형 {top,left,bottom,right}
  dragging: boolean;
  toggleCandidate: boolean; // 유일하게 선택된 칸을 다시 눌렀음 → 떼면 해제
}
type SelectionState = GridSelection | null;
```

**불변식**: `range`는 언제나 `rangeFromCells(anchor, 어떤 칸)`으로만 만들어지므로 **항상 직사각형**이고, `presetId`가 하나뿐이므로 **선택은 항상 한 컴포넌트 안**에 있습니다.

## 액션과 규칙

| 액션                        | 조건                                 | 다음 상태                                       |
| --------------------------- | ------------------------------------ | ----------------------------------------------- |
| `pointerDown(p, c, extend)` | 다른 컴포넌트이거나 선택 없음        | `p`에서 `c` 한 칸, dragging                     |
|                             | 같은 컴포넌트 + Shift(`extend`)      | `rangeFromCells(anchor, c)`                     |
|                             | 같은 컴포넌트, 유일한 선택 칸을 누름 | 그대로 + `toggleCandidate`                      |
|                             | 같은 컴포넌트, 그 밖                 | `c` 한 칸으로 새로 선택                         |
| `pointerEnter(p, c)`        | dragging이고 같은 컴포넌트           | `rangeFromCells(anchor, c)` (되돌아가면 줄어듦) |
|                             | 그 밖(다른 컴포넌트로 끌기, 호버)    | 변화 없음                                       |
| `pointerUp`                 | `toggleCandidate`                    | `null` (해제)                                   |
|                             | 그 밖                                | dragging 해제                                   |
| `clear`                     |                                      | `null`                                          |

## UI 연결

- 각 슬롯은 그리드 위 **헤더 줄**에 제목(왼쪽)과 적용 버튼(오른쪽)을 둡니다. 가로·세로 배치 모두 같습니다(`computePaletteLayout`이 자리를 미리 비워 둬서 창 크기가 흔들리지 않습니다).
- **적용 버튼**은 `selection.presetId`와 같은 슬롯에서만 보입니다.
- 버튼은 선택이 생기는 순간(누르는 순간) 나타나고, 선택이 사라지면 페이드아웃합니다.
- 범위가 바뀔 때만 메인에 `palette:selection`을 보내 ghost 미리보기를 갱신합니다.
- 드래그 중 버튼을 팔레트 밖에서 떼도 `window`의 `pointerup`/`blur`로 끝납니다.
- 키보드: Enter = 적용, Esc = 해제 → 한 번 더 누르면 닫기.

## 사용자 정의 그리드

- id가 `custom`(`CUSTOM_PRESET_ID`)인 프리셋입니다. `presetId(cols, rows)`가 만드는 `NxM` id와 겹치지 않으므로 고정 2×2와 함께 있을 수 있습니다. 기본 프리셋의 마지막 자리(이전의 4×4)이며 기본 모양은 2×2입니다.
- 레이아웃은 이 슬롯에만 `resize`(상·하·좌·우 화살표 사각형)를 줍니다. 화살표 띠(`arrowSize`)는 그리드 바깥에 있고, 다른 그리드와 줄이 맞도록 교차 축 방향 띠는 모든 슬롯이 비워 둡니다.
- 화살표 → `resizePreset`(순수 함수, 1~8로 제한): 오른쪽/아래 = 열/행 추가, 왼쪽/위 = 열/행 줄이기. 한계에 닿은 화살표는 `canResize`가 false라 꺼집니다.
- 렌더러는 선택을 `clear`하고 자기 상태의 프리셋을 바로 바꾼 뒤 `palette:resize-custom {cols, rows}`를 보냅니다. 메인(`PaletteController.resizeCustom`)은 세션 프리셋을 바꾸고(이후 적용·미리보기가 새 모양을 씀) 설정의 `grid.presets`에 저장합니다. 그래서 다음 팔레트와 재실행 후에도 마지막 모양이 유지됩니다.
