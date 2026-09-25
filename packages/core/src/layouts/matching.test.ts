import { describe, expect, it } from 'vitest';
import { liveWindow, savedWindow } from '../test/fixtures';
import { matchScore, matchWindows } from './matching';
import { titleSimilarity } from './similarity';

describe('titleSimilarity', () => {
  it('is 1 for equal titles ignoring case and spacing', () => {
    expect(titleSimilarity('Main.ts  — magWin', 'main.ts — magwin')).toBe(1);
  });

  it('scores drifting titles higher than unrelated ones', () => {
    const drift = titleSimilarity('● main.ts — magWin', 'main.ts — magWin');
    const unrelated = titleSimilarity('main.ts — magWin', 'Inbox (3)');
    expect(drift).toBeGreaterThan(0.8);
    expect(unrelated).toBeLessThan(0.2);
  });

  it('handles very short titles', () => {
    expect(titleSimilarity('a', 'b')).toBe(0);
  });
});

describe('matchWindows', () => {
  it('never pairs windows of different apps', () => {
    expect(
      matchScore(savedWindow(), liveWindow({ id: 1, bundleId: 'com.other', appName: 'Other' })),
    ).toBe(0);
  });

  it('pairs by title first, then by position', () => {
    const saved = [
      savedWindow({ title: 'notes.md', order: 0 }),
      savedWindow({ title: 'todo.md', order: 1 }),
    ];
    const live = [
      liveWindow({ id: 1, title: 'todo.md' }),
      liveWindow({ id: 2, title: 'notes.md' }),
    ];
    const result = matchWindows(saved, live);
    expect(result.matches.map((m) => [m.saved.title, m.live.id])).toEqual([
      ['notes.md', 2],
      ['todo.md', 1],
    ]);
  });

  it('falls back to app identity when titles are unknown', () => {
    const saved = [savedWindow({ title: null })];
    const live = [liveWindow({ id: 5, title: null })];
    expect(matchWindows(saved, live).matches).toHaveLength(1);
  });

  it('matches by app name when bundle ids are missing', () => {
    const saved = [savedWindow({ app: { bundleId: null, name: 'Editor', path: null } })];
    const live = [liveWindow({ id: 5, bundleId: null })];
    expect(matchWindows(saved, live).matches).toHaveLength(1);
  });

  it('reports leftovers on both sides', () => {
    const saved = [
      savedWindow(),
      savedWindow({ app: { bundleId: 'com.chat', name: 'Chat', path: null } }),
    ];
    const live = [liveWindow({ id: 1 }), liveWindow({ id: 2 })];
    const result = matchWindows(saved, live);
    expect(result.matches).toHaveLength(1);
    expect(result.unmatchedSaved.map((w) => w.app.name)).toEqual(['Chat']);
    expect(result.unusedLive.map((w) => w.id)).toEqual([2]);
  });
});
