import { desktopForSpaces, type Desktop } from '../layouts/desktops';
import { sameApp } from '../layouts/matching';
import { appKey, windowAppKey, type SavedWindow } from '../layouts/model';
import type { LiveWindow } from '../system/model';
import { issueFor, type RestoreIssue } from './report';

/** How many windows each app should show before placing starts. */
export function expectedWindowCounts(windows: readonly SavedWindow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const window of windows) {
    const key = appKey(window.app);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function countsSatisfied(
  live: readonly LiveWindow[],
  expected: ReadonlyMap<string, number>,
): boolean {
  const actual = new Map<string, number>();
  for (const window of live) {
    const key = windowAppKey(window);
    actual.set(key, (actual.get(key) ?? 0) + 1);
  }
  for (const [key, count] of expected) {
    if ((actual.get(key) ?? 0) < count) {
      return false;
    }
  }
  return true;
}

export interface MissingWindowFacts {
  readonly runningAppKeys: ReadonlySet<string>;
  /** Every window on every desktop right now. */
  readonly windows: readonly LiveWindow[];
  readonly desktops: readonly Desktop[];
  /** Space the window should have appeared on; null means any visible desktop. */
  readonly targetSpaceId: number | null;
}

function isOnTarget(window: LiveWindow, targetSpaceId: number | null): boolean {
  return targetSpaceId === null ? window.isOnScreen : window.spaceIds.includes(targetSpaceId);
}

/** Explains why a saved window could not be placed, so the report can guide the user. */
export function explainMissingWindow(saved: SavedWindow, facts: MissingWindowFacts): RestoreIssue {
  if (!facts.runningAppKeys.has(appKey(saved.app))) {
    return issueFor(saved, 'appNotRunning');
  }
  const elsewhere = facts.windows.find(
    (w) => sameApp(saved.app, w) && !isOnTarget(w, facts.targetSpaceId),
  );
  const desktop =
    elsewhere === undefined ? undefined : desktopForSpaces(facts.desktops, elsewhere.spaceIds);
  return desktop === undefined
    ? issueFor(saved, 'windowNotFound')
    : issueFor(saved, 'onOtherDesktop', { foundOnDesktop: desktop.number });
}
