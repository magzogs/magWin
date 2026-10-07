import { describe, expect, it } from 'vitest';
import { docUrl, DOCS_URL, isAllowedExternalUrl, SUPPORT_EMAIL, supportMailto } from './links';

describe('links', () => {
  it('builds doc page addresses on the docs site', () => {
    expect(docUrl('guide/edge-snap')).toBe(`${DOCS_URL}/guide/edge-snap`);
    expect(docUrl('help')).toBe(`${DOCS_URL}/help`);
  });

  it('encodes the support mail draft with %20 spaces', () => {
    const url = supportMailto('magWin help', 'line 1\nline 2 & more');
    expect(url).toBe(
      `mailto:${SUPPORT_EMAIL}?subject=magWin%20help&body=line%201%0Aline%202%20%26%20more`,
    );
  });

  it('lets only https pages and mail drafts open outside the app', () => {
    expect(isAllowedExternalUrl('https://docs.magwin.local/help')).toBe(true);
    expect(isAllowedExternalUrl('mailto:support@magwin.local')).toBe(true);
    expect(isAllowedExternalUrl('http://example.com')).toBe(false);
    expect(isAllowedExternalUrl('file:///etc/passwd')).toBe(false);
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false);
  });
});
