---
id: docs-workflow
title: 문서 갱신 규칙
sidebar_position: 5
---

코드가 문서와 어긋나면 **문서를 고치는 것도 같은 변경의 일부**입니다.

## 반드시 문서를 갱신해야 하는 변경

| 변경                                  | 갱신할 문서                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 헬퍼 메서드·이벤트·오류 코드          | [헬퍼 프로토콜](../architecture/helper-protocol.md)                                              |
| 가장자리 판정, dwell, 팔레트 수명     | [가장자리 감지](../architecture/edge-detection.md)                                               |
| 선택 규칙                             | [그리드 선택 모델](../architecture/grid-selection.md), [엣지 스냅 사용법](../guide/edge-snap.md) |
| 레이아웃 스키마, 캡처 필터, 복원 순서 | [레이아웃 캡처와 복원](../architecture/layout-restore.md), [사용법](../guide/layouts.md)         |
| 좌표 계산                             | [좌표계](../architecture/coordinates.md)                                                         |
| 설정 항목                             | 사용 안내의 설정 표                                                                              |
| 폴더 구조·패키지 추가                 | [모노레포 구조](monorepo.md)                                                                     |
| lint·코딩 규칙                        | [코딩 표준](coding-standards.md)                                                                 |
| 아키텍처 수준의 결정                  | 새 ADR                                                                                           |

## ADR 작성

- 파일명 `adr-NNN-짧은-제목.md`, 번호는 순서대로 늘립니다.
- 섹션: 상태, 날짜, 맥락, 결정, 결과
- 이전 결정을 뒤집으면 이전 ADR의 상태를 "대체됨(ADR-NNN)"으로 바꿉니다.

## 링크

- 문서끼리는 상대 경로 `.md`로 링크합니다. 깨진 링크가 있으면 빌드가 실패합니다.
- 코드 주석에서 문서를 가리킬 때는 `docs/docs/...` 경로를 씁니다.
- 루트 `AGENTS.md`는 핵심 문서로 가는 입구입니다. 핵심 문서를 추가하면 그 표도 갱신합니다.

## 빌드 확인

```bash
pnpm build:docs
```
