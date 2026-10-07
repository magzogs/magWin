/**
 * External addresses used by the help and support pages. Keep DOCS_URL equal to `url` in
 * docs/docusaurus.config.ts. Both are placeholders until the docs site and a support mailbox
 * are published (docs/docs/development/release.md).
 */
export const DOCS_URL = 'https://docs.magwin.local';
export const SUPPORT_EMAIL = 'support@magwin.local';

/** Doc page ids under docs/docs, e.g. 'guide/edge-snap'. */
export type DocPath = `guide/${string}`;

export function docUrl(path: DocPath | 'help'): string {
  return `${DOCS_URL}/${path}`;
}

export function supportMailto(subject: string, body: string): string {
  const query = new URLSearchParams({ subject, body }).toString().replaceAll('+', '%20');
  return `mailto:${SUPPORT_EMAIL}?${query}`;
}

/** Only web pages and mail drafts may leave the app; everything else is dropped. */
export function isAllowedExternalUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('mailto:');
}
