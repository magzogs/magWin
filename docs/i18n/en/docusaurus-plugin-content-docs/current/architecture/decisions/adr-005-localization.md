---
id: adr-005-localization
title: ADR-005 Localization
---

- **Status**: Accepted
- **Date**: 2026-10-08

## Context

At first only Korean was supported, so all strings were collected in a single file, `renderer/src/i18n/ko.ts`. English needs to be added, and other languages should be possible later. Strings live not only in the renderer (management window, palette, HUDs) but also in the main process's menu bar menu.

## Decision

- **Catalogs**: Place one file per language in `apps/desktop/src/shared/i18n/`. `ko.ts` is the source, and `type Messages = typeof ko`. Other languages must satisfy the `Messages` type, so a missing key or different parameters is caught by type checking. No external i18n library is used (the number of strings is small, and function-style messages let each language handle plurals and word order).
- **Setting**: `general.language` is `system | ko | en`, with a default of `system`. Older settings files do not have this value, so it is filled in from the schema default. The partial-update schema has no default (so changing other items does not reset the language).
- **Locale resolution**: `resolveLocale(setting, system preferred languages)` in `packages/core`. For `system`, it picks the first supported language in the preferred list, or English if there is none. The renderer passes `navigator.languages`, and main passes `app.getPreferredSystemLanguages()`.
- **Applying**: In the renderer, `I18nProvider` subscribes to settings change events and re-renders immediately. The menu bar menu is also rebuilt when the setting changes.
- **Where to change it**: the **🌐 Language** submenu (radio items) of the menu bar menu, and Settings › General › Language. Language names are always shown in their own language, so a user can switch back even from a language they cannot read.
- **Docs**: Docusaurus i18n builds two locales, `ko` (default) and `en`, with a language menu in the navigation bar.

## Consequences

- Adding a new language: `shared/i18n/<language>.ts`, `SUPPORTED_LOCALES`, the language list in the settings screen, and Docusaurus `locales` plus translation files.
- Diagnostic information (Get Support) uses a fixed English format that is independent of language, so support staff can read it regardless of language.
