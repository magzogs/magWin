---
id: adr-006-auto-update
title: ADR-006 GitHub Releases distribution and auto-update
---

- **Status**: Accepted
- **Date**: 2026-10-12

## Context

OrgaWin cannot ship on the Mac App Store, so it is distributed directly as a dmg/zip signed with Developer ID and notarized. Users need a place to download it, and installed apps need a way to pick up new versions on their own. OrgaWin is open source; the source and the release files live in one repository (`magzogs/orgawin`).

## Decision

- **Release location**: the GitHub Releases of the source repository `magzogs/orgawin`. There is no separate release repository.
- **Upload**: `publish` in `electron-builder.yml` (provider `github`, `releaseType: draft`). `pnpm release:publish` signs, notarizes and uploads the dmg, zip and `latest-mac.yml` as a **draft** release. Users and the auto-updater only see it after the draft is published on GitHub. The token is read with `gh auth token` at run time and never written to a file. `pnpm package` and `pnpm release` pass `--publish never` and upload nothing.
- **Auto-update**: `electron-updater`, split along the main-process layers.
  - `UpdateSource` in `domain/ports.ts`: check, download finished/failed events, restart to install.
  - `application/system/UpdateService`: state (`unsupported | idle | checking | upToDate | downloading | ready | failed`) and schedule. It checks 30 seconds after launch, then every six hours, and does not check again while a check or download is under way or an update is waiting.
  - `infrastructure/electron/ElectronUpdater`: adapter over `autoUpdater`. New versions download in the background and install on quit. In an unpackaged development run `supported = false` and it does nothing.
  - Menu bar menu: one item under Help follows the state (Check for updates… → Checking… → Downloading… → Restart to update).
- **Bundling**: like the other dependencies, `electron-updater` is a `devDependency` bundled into the main process (the packaged app ships no `node_modules`).

## Security

- Squirrel.Mac only installs a new app signed by **the same Developer ID team as the installed one**. Downloads are checked against the SHA-512 in `latest-mac.yml` and fetched from GitHub over HTTPS. Anything else uploaded to Releases cannot be installed without the signing key, even though the source is public.
- What must be protected: the Developer ID private key (never exported from the keychain) and the GitHub account (two-factor authentication, minimal write access).
- Anyone can read the source and the app bundle, so neither holds secrets. Notarization credentials and the GitHub token stay in the keychain and `gh`.

## Consequences

- To ship an update, bump `version` in `apps/desktop/package.json`, run `pnpm release:publish`, then publish the draft. See [Packaging and release](../../development/release.md).
- An older version can only update itself if it already contains `electron-updater`. Auto-update works from the first version that ships this feature.
- There is no setting to turn auto-update off yet. Add one to the `general` settings if it becomes necessary.
