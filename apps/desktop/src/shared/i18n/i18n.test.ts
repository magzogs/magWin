import type { RestoreIssue } from '@magwin/core';
import { describe, expect, it } from 'vitest';
import { en } from './en';
import { errorMessage, issueMessage, messagesFor, progressMessage } from './index';
import { ko, type Messages } from './ko';

/** Every leaf (string, function or list) by dotted path, to compare catalog shapes at runtime. */
function leafKinds(value: object, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, child] of Object.entries(value)) {
    const path = `${prefix}${key}`;
    if (typeof child === 'object' && child !== null && !Array.isArray(child)) {
      Object.assign(out, leafKinds(child as object, `${path}.`));
    } else {
      out[path] = Array.isArray(child) ? `list:${String(child.length)}` : typeof child;
    }
  }
  return out;
}

const issue: RestoreIssue = {
  reason: 'desktopMissing',
  appName: 'Mail',
  windowTitle: 'Inbox',
  desktopNumber: 3,
  foundOnDesktop: null,
  detail: null,
};

describe('catalogs', () => {
  it('have the same keys, kinds and list lengths in every language', () => {
    expect(leafKinds(en)).toEqual(leafKinds(ko));
  });

  it('never leave a string empty', () => {
    const empty = (t: Messages): string[] =>
      Object.entries(leafKinds(t)).flatMap(([path]) => {
        const value = path
          .split('.')
          .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], t);
        return value === '' ? [path] : [];
      });
    expect(empty(ko)).toEqual([]);
    expect(empty(en)).toEqual([]);
  });

  it('are picked by locale', () => {
    expect(messagesFor('ko')).toBe(ko);
    expect(messagesFor('en')).toBe(en);
  });
});

describe('errorMessage', () => {
  it('translates error codes with a fallback', () => {
    expect(errorMessage(ko, 'fullscreen')).toBe('전체 화면 창은 옮길 수 없어요.');
    expect(errorMessage(ko, 'mystery')).toBe('알 수 없는 오류 (mystery)');
    expect(errorMessage(en, 'fullscreen')).toBe('Full-screen windows cannot be moved.');
    expect(errorMessage(en, 'mystery')).toBe('Unknown error (mystery)');
  });
});

describe('issueMessage', () => {
  it('describes restore issues in each language', () => {
    expect(issueMessage(ko, issue)).toBe(
      'Mail — Inbox: Desktop 3이 없어서 현재 Desktop에 배치했어요.',
    );
    expect(issueMessage(en, issue)).toBe(
      'Mail — Inbox: Desktop 3 no longer exists, so it was placed on the current Desktop.',
    );
  });

  it('words failures with the translated error code', () => {
    const failed: RestoreIssue = {
      ...issue,
      reason: 'appLaunchFailed',
      windowTitle: null,
      detail: null,
    };
    expect(issueMessage(en, failed)).toBe('Mail: The app could not be launched.');
    const other: RestoreIssue = { ...issue, reason: 'onOtherDesktop', foundOnDesktop: 2 };
    expect(issueMessage(ko, other)).toMatch(/^Mail — Inbox: 창이 Desktop 2에 있어요/);
  });
});

describe('progressMessage', () => {
  it('counts placed windows with English plurals', () => {
    const report = { layoutName: 'Coding', total: 1, placed: 1, issues: [], durationMs: 10 };
    expect(progressMessage(en, { type: 'finished', report })).toBe('Placed 1 of 1 window');
    expect(progressMessage(ko, { type: 'finished', report })).toBe('1개 중 1개 창을 배치했어요');
    expect(progressMessage(en, { type: 'switching', desktopNumber: 2 })).toBe(
      'Switching to Desktop 2…',
    );
  });
});

describe('default layout names', () => {
  it('follow each language’s date format', () => {
    const now = new Date(2026, 8, 25, 16, 5);
    expect(ko.save.defaultName(now)).toBe('9월 25일 16:05');
    expect(en.save.defaultName(now)).toBe('Sep 25 16:05');
  });
});
