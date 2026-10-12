---
id: adr-006-auto-update
title: ADR-006 GitHub Releases 배포와 자동 업데이트
---

- **상태**: 채택
- **날짜**: 2026-10-12

## 맥락

OrgaWin은 Mac App Store에 낼 수 없어 Developer ID로 서명·공증한 dmg/zip을 직접 배포합니다. 사용자가 받을 곳과, 설치한 앱이 새 버전을 알아서 받는 방법이 필요합니다. OrgaWin은 오픈소스이고 소스와 배포 파일을 한 저장소(`magzogs/orgawin`)에 둡니다.

## 결정

- **배포 위치**: 소스 저장소 `magzogs/orgawin`의 GitHub Releases. 별도 배포 저장소는 두지 않습니다.
- **업로드**: `electron-builder.yml`의 `publish`(provider `github`, `releaseType: draft`). `pnpm release:publish`가 서명·공증 후 dmg, zip, `latest-mac.yml`을 **초안** 릴리스로 올립니다. 초안을 GitHub에서 Publish해야 사용자와 자동 업데이트에 보입니다. 토큰은 `gh auth token`으로 실행할 때만 읽어 파일에 남기지 않습니다. `pnpm package`·`pnpm release`는 `--publish never`라 올리지 않습니다.
- **자동 업데이트**: `electron-updater`. 메인 프로세스 계층을 따라 나눕니다.
  - `domain/ports.ts`의 `UpdateSource`: 확인, 다운로드 완료·실패 이벤트, 재시작 설치.
  - `application/system/UpdateService`: 상태(`unsupported | idle | checking | upToDate | downloading | ready | failed`)와 일정. 시작 30초 뒤 한 번, 이후 6시간마다 확인합니다. 진행 중이거나 설치 대기 중이면 다시 확인하지 않습니다.
  - `infrastructure/electron/ElectronUpdater`: `autoUpdater` 어댑터. 새 버전은 백그라운드로 받고, 종료할 때 자동 설치합니다. 패키지되지 않은 개발 실행에서는 `supported = false`라 아무것도 하지 않습니다.
  - 메뉴 막대 메뉴: 도움말 아래 한 항목이 상태를 따라 바뀝니다(업데이트 확인… → 확인 중… → 내려받는 중… → 재시작해서 업데이트).
- **번들**: `electron-updater`는 다른 의존성처럼 `devDependencies`에 두고 메인 번들에 포함합니다(패키지 앱에 `node_modules` 없음).

## 보안

- Squirrel.Mac은 새 앱이 **설치된 앱과 같은 Developer ID 팀**으로 서명된 경우에만 설치합니다. 받은 파일은 `latest-mac.yml`의 SHA-512와 대조하고, GitHub에서 HTTPS로 받습니다. Releases에 다른 파일이 올라가도 서명 키 없이는 설치되지 않습니다. 소스가 공개돼 있어도 마찬가지입니다.
- 지킬 것은 Developer ID 개인 키(키체인 밖으로 내보내지 않음)와 GitHub 계정(2단계 인증, 쓰기 권한 최소화)입니다.
- 소스와 앱 번들은 누구나 읽을 수 있으므로 비밀값을 넣지 않습니다. 공증 자격 증명과 GitHub 토큰은 키체인과 `gh`에만 둡니다.

## 결과

- 업데이트를 내려면 `apps/desktop/package.json`의 `version`을 올리고 `pnpm release:publish` 후 초안을 Publish합니다. 절차는 [패키징과 배포](../../development/release.md).
- 이전 버전에서 업데이트가 되려면 그 버전에 이미 `electron-updater`가 들어 있어야 합니다. 이 기능이 들어간 첫 버전부터 자동 업데이트가 이어집니다.
- 설정에 자동 업데이트 끄기 옵션은 아직 없습니다. 필요해지면 `general` 설정에 추가합니다.
