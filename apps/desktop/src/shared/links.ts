import type { Locale } from '@magwin/core';

/**
 * External addresses used by the help and support pages. Keep DOCS_URL equal to `url` in
 * docs/docusaurus.config.ts. DOCS_URL is a placeholder until the docs site is published
 * (docs/docs/development/release.md).
 */
export const DOCS_URL = 'https://docs.magwin.local';
export const SUPPORT_EMAIL = 'orgawin@magzog.com';

/** Doc page ids under docs/docs, e.g. 'guide/edge-snap'. */
export type DocPath = `guide/${string}`;

/** Korean is the docs site's default locale (no prefix); other locales live under /<locale>. */
export function docUrl(path: DocPath | 'help', locale: Locale): string {
  return locale === 'ko' ? `${DOCS_URL}/${path}` : `${DOCS_URL}/${locale}/${path}`;
}

export function supportMailto(subject: string, body: string): string {
  const query = new URLSearchParams({ subject, body }).toString().replaceAll('+', '%20');
  return `mailto:${SUPPORT_EMAIL}?${query}`;
}

/** Only web pages and mail drafts may leave the app; everything else is dropped. */
export function isAllowedExternalUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('mailto:');
}
