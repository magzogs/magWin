import { describe, expect, it } from 'vitest';
import { readyStatus, testAppInfo } from '../../test/fakeApi';
import { HELP_QUESTIONS, HELP_TOPICS, searchHelp } from './helpContent';
import { buildDiagnostics } from './supportReport';

describe('buildDiagnostics', () => {
  it('summarizes versions, permissions and shortcuts', () => {
    expect(buildDiagnostics(testAppInfo, readyStatus)).toBe(
      [
        'magWin 0.1.0',
        'macOS 26.6.2 (arm64)',
        'helper: ready',
        'accessibility: yes',
        'screen recording: no',
        'desktop shortcuts: direct=1,2 left=yes right=yes',
      ].join('\n'),
    );
  });

  it('includes helper failures and unknown shortcuts', () => {
    const text = buildDiagnostics(testAppInfo, {
      ...readyStatus,
      helper: 'failed',
      helperMessage: 'Helper binary not found',
      hotkeys: null,
    });
    expect(text).toContain('helper: failed (Helper binary not found)');
    expect(text).toContain('desktop shortcuts: unknown');
  });

  it('works before the status arrives', () => {
    expect(buildDiagnostics(testAppInfo, null)).toBe('magWin 0.1.0\nmacOS 26.6.2 (arm64)');
  });
});

describe('searchHelp', () => {
  it('keeps everything for an empty query', () => {
    const result = searchHelp('  ', HELP_TOPICS, HELP_QUESTIONS);
    expect(result.topics).toHaveLength(HELP_TOPICS.length);
    expect(result.questions).toHaveLength(HELP_QUESTIONS.length);
  });

  it('matches titles and bodies case-insensitively', () => {
    const result = searchHelp('MISSION control', HELP_TOPICS, HELP_QUESTIONS);
    expect(result.topics).toEqual([]);
    expect(result.questions.map((q) => q.id)).toEqual(['desktop', 'other-desktop']);
    expect(searchHelp('레이아웃', HELP_TOPICS, []).topics.map((t) => t.id)).toEqual(['layouts']);
  });
});
