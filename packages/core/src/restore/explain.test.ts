import { describe, expect, it } from 'vitest';
import { desktop, liveWindow, savedDesktop, savedWindow } from '../test/fixtures';
import { countsSatisfied, expectedWindowCounts, explainMissingWindow } from './explain';

const desktops = [
  desktop({ spaceId: 1, number: 1, isCurrent: true }),
  desktop({ spaceId: 7, number: 2 }),
];

describe('expected window counts', () => {
  it('counts windows per app and checks live windows against them', () => {
    const expected = expectedWindowCounts([
      savedWindow(),
      savedWindow({ title: 'second' }),
      savedWindow({ app: { bundleId: 'com.chat', name: 'Chat', path: null } }),
    ]);
    expect([...expected]).toEqual([
      ['com.example.editor', 2],
      ['com.chat', 1],
    ]);
    const oneEditor = [
      liveWindow({ id: 1 }),
      liveWindow({ id: 2, bundleId: 'com.chat', appName: 'Chat' }),
    ];
    expect(countsSatisfied(oneEditor, expected)).toBe(false);
    expect(countsSatisfied([...oneEditor, liveWindow({ id: 3 })], expected)).toBe(true);
  });
});

describe('explainMissingWindow', () => {
  const saved = savedWindow({ desktop: savedDesktop(2) });

  it('reports apps that are not running', () => {
    const issue = explainMissingWindow(saved, {
      runningAppKeys: new Set(),
      windows: [],
      desktops,
      targetSpaceId: 7,
    });
    expect(issue.reason).toBe('appNotRunning');
  });

  it('points to the desktop where the app window currently is', () => {
    const issue = explainMissingWindow(saved, {
      runningAppKeys: new Set(['com.example.editor']),
      windows: [liveWindow({ id: 1, spaceIds: [1] })],
      desktops,
      targetSpaceId: 7,
    });
    expect(issue).toMatchObject({ reason: 'onOtherDesktop', foundOnDesktop: 1, desktopNumber: 2 });
  });

  it('falls back to window not found', () => {
    const issue = explainMissingWindow(saved, {
      runningAppKeys: new Set(['com.example.editor']),
      windows: [liveWindow({ id: 1, spaceIds: [7] })],
      desktops,
      targetSpaceId: 7,
    });
    expect(issue.reason).toBe('windowNotFound');
  });
});
