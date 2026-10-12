---
id: release
title: Packaging and Distribution
sidebar_position: 6
---

## Distribution Channel

OrgaWin uses private APIs (CGS, `_AXUIElementGetWindow`), so it **cannot be published on the Mac App Store.** It is signed with a Developer ID, notarized, and distributed directly.

## Building

```bash
pnpm package            # helper release + bundle + electron-builder (dmg, zip), no notarization
pnpm release            # same, plus notarization (see "Signing and notarization" below)
pnpm release:publish    # notarize, then upload a draft to GitHub Releases (see "Public release" below)
pnpm --filter @magwin/desktop package:dir   # unsigned .app only (quick check)
```

The key settings in `electron-builder.yml` are:

| Setting                      | Value                                                 |
| ---------------------------- | ----------------------------------------------------- |
| `extraResources`             | Helper binary → `Contents/Resources/bin/MagWinHelper` |
| `mac.extendInfo.LSUIElement` | `true` (menu bar app, no Dock icon)                   |
| `mac.icon`                   | `build/icon.icns`                                     |
| `mac.hardenedRuntime`        | `true`                                                |
| `mac.entitlements`           | `build/entitlements.mac.plist`                        |
| Sandbox                      | Not used (controls other apps, private APIs)          |

## App Icon

The source is `apps/desktop/build/icon.svg`: the docs logo (`docs/static/img/logo.svg`) placed on the macOS icon grid (1024px canvas, 824px shape). After editing it, regenerate `icon.png` (dev-mode Dock icon) and `icon.icns` (packaged app). Requires `brew install librsvg`.

```bash
cd apps/desktop/build
rsvg-convert -w 1024 -h 1024 icon.svg -o icon.png
mkdir -p /tmp/icon.iconset
for s in 16 32 128 256 512; do
  rsvg-convert -w $s -h $s icon.svg -o /tmp/icon.iconset/icon_${s}x${s}.png
  rsvg-convert -w $((s*2)) -h $((s*2)) icon.svg -o /tmp/icon.iconset/icon_${s}x${s}@2x.png
done
iconutil -c icns /tmp/icon.iconset -o icon.icns
```

## Signing and Permission Persistence

macOS remembers Accessibility approval by binding it to the **code signature**.

- An ad-hoc signature (no certificate) changes with every build, so the approval appears to disappear. Use the same certificate (Apple Development or Developer ID) for test builds too.
- The helper binary must be signed with the same certificate as the app. electron-builder also signs the executables under `Contents/Resources/bin`.
- Release builds are signed with a **Developer ID Application** certificate. electron-builder finds it in the keychain automatically.

## Signing and notarization

`mac.notarize` is `true`, but when no credentials are in the environment electron-builder only logs a warning and skips notarization. So `pnpm package` keeps working with just the certificate.

Once, store the notarization credentials as a keychain profile. Create an app-specific password at appleid.apple.com, then run the command below; it asks for your Apple ID, team ID, and the password. The values live only in the keychain, so no password sits in the repository or shell config.

```bash
xcrun notarytool store-credentials orgawin-notary
```

`pnpm release` runs `pnpm package` with `APPLE_KEYCHAIN_PROFILE=orgawin-notary`, which signs, notarizes, and staples. Check the result with:

```bash
codesign -dv --verbose=2 apps/desktop/release/mac-arm64/OrgaWin.app
spctl -a -vv apps/desktop/release/mac-arm64/OrgaWin.app
xcrun stapler validate apps/desktop/release/mac-arm64/OrgaWin.app
```

`spctl` should report `source=Notarized Developer ID`.

## Public release

Release files ship through the Releases of this repository, [magzogs/orgawin](https://github.com/magzogs/orgawin). See [ADR-006](../architecture/decisions/adr-006-auto-update.md) for the background and security model.

1. Bump `version` in `apps/desktop/package.json` (for example `0.1.0` → `0.1.1`). Auto-update compares this value.
2. Check with `gh auth status` that the account can write to `magzogs/orgawin`.
3. Run `pnpm release:publish`. After signing and notarization it uploads the dmg, zip and `latest-mac.yml` as a **draft** release `v<version>`. The token is read with `gh auth token` only while it runs.
4. On GitHub, check the draft's files and notes, then press **Publish release**. From then on users can download it and installed apps find the update.

`pnpm package` and `pnpm release` pass `--publish never` and upload nothing.

## Auto-update

An installed app checks `latest-mac.yml` in Releases 30 seconds after launch and then every six hours, and downloads a new version in the background. When the update item in the menu bar menu turns into **Restart to update (v…)**, click it, or the update installs when the app quits. It does nothing in a development run (`pnpm dev`).

- Updates are most reliable for an app installed in `/Applications`.
- To test an update, install a lower version, publish a higher one, then choose **Check for updates…** in the menu.

## Architecture

The default build targets arm64, the same as the development Mac. If you need a universal helper, do the following.

```bash
swift build -c release --package-path native/MagWinHelper --arch arm64 --arch x86_64
```

In that case the output path is `.build/apple/Products/Release/MagWinHelper`, so change the `from` of `extraResources` as well.

## URLs to Change Before Release

The app's Help and Support tabs use the URLs in `apps/desktop/src/shared/links.ts`. `DOCS_URL` is still a placeholder; `SUPPORT_EMAIL` (`orgawin@magzog.com`) is the real support mailbox.

| Constant   | Current value               | Also change                          |
| ---------- | --------------------------- | ------------------------------------ |
| `DOCS_URL` | `https://docs.magwin.local` | `url` in `docs/docusaurus.config.ts` |
