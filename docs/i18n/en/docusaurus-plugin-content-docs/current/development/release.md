---
id: release
title: Packaging and Distribution
sidebar_position: 6
---

## Distribution Channel

magWin uses private APIs (CGS, `_AXUIElementGetWindow`), so it **cannot be published on the Mac App Store.** It is signed with a Developer ID, notarized, and distributed directly.

## Building

```bash
pnpm package            # helper release + bundle + electron-builder (dmg, zip)
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
- Notarization: set the `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` environment variables and change `mac.notarize` to `true`.

## Architecture

The default build targets arm64, the same as the development Mac. If you need a universal helper, do the following.

```bash
swift build -c release --package-path native/MagWinHelper --arch arm64 --arch x86_64
```

In that case the output path is `.build/apple/Products/Release/MagWinHelper`, so change the `from` of `extraResources` as well.

## URLs to Change Before Release

The app's Help and Support tabs use the URLs in `apps/desktop/src/shared/links.ts`. They are placeholders for now.

| Constant        | Current value               | Also change                                      |
| --------------- | --------------------------- | ------------------------------------------------ |
| `DOCS_URL`      | `https://docs.magwin.local` | `url` in `docs/docusaurus.config.ts`             |
| `SUPPORT_EMAIL` | `support@magwin.local`      | A support mailbox that actually receives replies |
