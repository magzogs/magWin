import { z } from 'zod';

/** Languages the UI ships in. The first entry is the fallback when nothing else matches. */
export const SUPPORTED_LOCALES = ['en', 'ko'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** `system` follows the macOS preferred languages; the rest pin one language. */
export const languagePreferenceSchema = z.enum(['system', ...SUPPORTED_LOCALES]);
export type LanguagePreference = z.infer<typeof languagePreferenceSchema>;

function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the UI language. For `system`, the first preferred language (BCP 47, e.g. "ko-KR")
 * whose primary subtag is supported wins; otherwise English.
 */
export function resolveLocale(
  preference: LanguagePreference,
  systemLanguages: readonly string[],
): Locale {
  if (preference !== 'system') return preference;
  for (const tag of systemLanguages) {
    const primary = tag.split(/[-_]/)[0]?.toLowerCase() ?? '';
    if (isLocale(primary)) return primary;
  }
  return SUPPORTED_LOCALES[0];
}
