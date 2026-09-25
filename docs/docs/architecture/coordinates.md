---
id: coordinates
title: 좌표계와 칸 → 프레임 계산
sidebar_position: 3
---

## 한 가지 좌표계만 씁니다

magWin의 모든 좌표는 **Quartz 전역 좌표**(포인트 단위)입니다.

- 원점: 메인 디스플레이(메뉴 막대가 있는 화면)의 **왼쪽 위**
- y는 **아래로** 증가
- 다른 모니터는 음수 좌표일 수 있음

CGWindowList, Accessibility(AXPosition/AXSize), Electron `screen` 모듈이 모두 이 좌표를 씁니다. 예외는 AppKit(`NSScreen`, `NSEvent.mouseLocation`)뿐입니다. AppKit은 **왼쪽 아래 원점, y 위로**를 씁니다. 헬퍼의 `CoordinateSpace.quartzRect(fromCocoa:)`가 한 번에 변환합니다.

```text
quartz.y = primaryScreen.height − cocoa.y − cocoa.height
```

커서 위치는 `CGEvent(source: nil).location`(이미 Quartz)으로 읽어서 변환할 일이 없게 했습니다.

## 칸 → 프레임

`packages/core/src/grid/cells.ts`의 `rangeToFrame(workArea, preset, range, gap)`.

1. 격자선 위치를 **한 번만 반올림**합니다. `x_i = workArea.x + round(i × width / cols)`
2. 선택 범위의 왼쪽 선과 (오른쪽 칸 + 1) 선 사이가 창의 가로 범위입니다. 세로도 같습니다.
3. 간격(`gap`)은 화면 가장자리 쪽에는 `gap`만큼, 창 사이에는 양쪽이 `floor(gap/2)`와 `ceil(gap/2)`로 나눠 가져서 **창 사이 간격이 정확히 `gap`**이 됩니다.

반올림을 격자선 단위로 하기 때문에 이웃한 창의 경계가 1px도 겹치거나 벌어지지 않습니다.

`workArea`는 메뉴 막대와 Dock을 뺀 영역이며 팔레트가 뜬 디스플레이 것을 씁니다.

## 저장과 복원의 좌표

레이아웃은 창마다 두 가지를 저장합니다.

| 필드            | 값                                        |
| --------------- | ----------------------------------------- |
| `frame`         | 절대 좌표                                 |
| `relativeFrame` | 디스플레이 `visibleFrame` 대비 비율 (0~1) |

복원할 때 같은 디스플레이(UUID)이고 `visibleFrame`이 그대로면 `frame`을, 아니면 `relativeFrame`을 지금 디스플레이에 맞춰 늘립니다. 디스플레이가 사라졌으면 메인 디스플레이를 씁니다. 결과는 항상 `visibleFrame` 안으로 맞춥니다(`resolveTargetFrame`).
