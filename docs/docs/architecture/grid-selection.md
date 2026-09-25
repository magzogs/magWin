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

- **적용 버튼**은 `selection.presetId`와 같은 슬롯에서만 보입니다. 가로 배치(위/아래 가장자리)는 그리드 **아래**, 세로 배치(왼쪽/오른쪽 가장자리)는 가장자리 반대쪽 **옆**입니다(`computePaletteLayout`이 자리를 미리 비워 둬서 창 크기가 흔들리지 않습니다).
- 버튼은 선택이 생기는 순간(누르는 순간) 나타나고, 선택이 사라지면 페이드아웃합니다.
- 범위가 바뀔 때만 메인에 `palette:selection`을 보내 ghost 미리보기를 갱신합니다.
- 드래그 중 버튼을 팔레트 밖에서 떼도 `window`의 `pointerup`/`blur`로 끝납니다.
- 키보드: Enter = 적용, Esc = 해제 → 한 번 더 누르면 닫기.
