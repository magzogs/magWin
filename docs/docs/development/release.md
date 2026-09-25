---
id: release
title: 패키징과 배포
sidebar_position: 6
---

## 배포 채널

magWin은 비공개 API(CGS, `_AXUIElementGetWindow`)를 쓰므로 **Mac App Store에는 낼 수 없습니다.** Developer ID로 서명하고 공증(notarize)해서 직접 배포합니다.

## 빌드

```bash
pnpm package            # 헬퍼 release + 번들 + electron-builder (dmg, zip)
pnpm --filter @magwin/desktop package:dir   # 서명 없이 .app만 (빠른 확인)
```

`electron-builder.yml`의 핵심은 다음과 같습니다.

| 설정                         | 값                                                    |
| ---------------------------- | ----------------------------------------------------- |
| `extraResources`             | 헬퍼 바이너리 → `Contents/Resources/bin/MagWinHelper` |
| `mac.extendInfo.LSUIElement` | `true` (메뉴 막대 앱, Dock 아이콘 없음)               |
| `mac.hardenedRuntime`        | `true`                                                |
| `mac.entitlements`           | `build/entitlements.mac.plist`                        |
| 샌드박스                     | 사용하지 않음 (다른 앱 제어·비공개 API)               |

## 서명과 권한 유지

macOS는 손쉬운 사용 허용을 **코드 서명**에 묶어 기억합니다.

- ad-hoc 서명(인증서 없음)은 빌드할 때마다 서명이 바뀌어, 허용이 사라진 것처럼 보입니다. 테스트 빌드에도 같은 인증서(Apple Development 또는 Developer ID)를 쓰세요.
- 헬퍼 바이너리도 앱과 같은 인증서로 서명해야 합니다. electron-builder가 `Contents/Resources/bin` 아래 실행 파일도 서명합니다.
- 공증: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` 환경 변수를 두고 `mac.notarize: true`로 바꿉니다.

## 아키텍처

기본 빌드는 개발 Mac과 같은 arm64입니다. 유니버설 헬퍼가 필요하면 다음처럼 합니다.

```bash
swift build -c release --package-path native/MagWinHelper --arch arm64 --arch x86_64
```

이 경우 결과 경로는 `.build/apple/Products/Release/MagWinHelper`이므로 `extraResources`의 `from`도 바꿉니다.
