import { describe, expect, it } from 'vitest';
import { resolveLocale } from './language';

describe('resolveLocale', () => {
  it('uses a pinned language as is', () => {
    expect(resolveLocale('ko', ['en-US'])).toBe('ko');
    expect(resolveLocale('en', ['ko-KR'])).toBe('en');
  });

  it('follows the first supported system language', () => {
    expect(resolveLocale('system', ['ko-KR', 'en-US'])).toBe('ko');
    expect(resolveLocale('system', ['ja-JP', 'en_GB', 'ko'])).toBe('en');
    expect(resolveLocale('system', ['KO'])).toBe('ko');
  });

  it('falls back to English', () => {
    expect(resolveLocale('system', ['ja-JP', 'fr'])).toBe('en');
    expect(resolveLocale('system', [])).toBe('en');
  });
});
