import { overlapRatio } from '../geometry/geometry';
import type { LiveWindow } from '../system/model';
import type { SavedApp, SavedWindow } from './model';
import { titleSimilarity } from './similarity';

export interface WindowMatch {
  readonly saved: SavedWindow;
  readonly live: LiveWindow;
}

export interface MatchResult {
  readonly matches: readonly WindowMatch[];
  readonly unmatchedSaved: readonly SavedWindow[];
  readonly unusedLive: readonly LiveWindow[];
}

export function sameApp(app: SavedApp, live: LiveWindow): boolean {
  if (app.bundleId !== null && live.bundleId !== null) {
    return app.bundleId === live.bundleId;
  }
  return app.name === live.appName;
}

const TITLE_WEIGHT = 100;
const OVERLAP_WEIGHT = 20;

/** 0 means "never pair these"; otherwise higher is better. */
export function matchScore(saved: SavedWindow, live: LiveWindow): number {
  if (!sameApp(saved.app, live)) {
    return 0;
  }
  let score = 1;
  if (saved.title !== null && live.title !== null) {
    score += TITLE_WEIGHT * titleSimilarity(saved.title, live.title);
  }
  score += OVERLAP_WEIGHT * overlapRatio(saved.frame, live.frame);
  return score;
}

interface Candidate {
  readonly saved: SavedWindow;
  readonly live: LiveWindow;
  readonly savedIndex: number;
  readonly liveIndex: number;
  readonly score: number;
}

function candidates(saved: readonly SavedWindow[], live: readonly LiveWindow[]): Candidate[] {
  const list: Candidate[] = [];
  saved.forEach((s, savedIndex) => {
    live.forEach((l, liveIndex) => {
      const score = matchScore(s, l);
      if (score > 0) {
        list.push({ saved: s, live: l, savedIndex, liveIndex, score });
      }
    });
  });
  return list.sort(
    (a, b) => b.score - a.score || a.savedIndex - b.savedIndex || a.liveIndex - b.liveIndex,
  );
}

/**
 * Greedy one-to-one pairing of saved windows with live windows of the same app.
 * Best title/position matches win; remaining windows of an app pair up in stacking order.
 */
export function matchWindows(
  saved: readonly SavedWindow[],
  live: readonly LiveWindow[],
): MatchResult {
  const usedSaved = new Set<number>();
  const usedLive = new Set<number>();
  const matches: WindowMatch[] = [];
  for (const candidate of candidates(saved, live)) {
    if (usedSaved.has(candidate.savedIndex) || usedLive.has(candidate.liveIndex)) {
      continue;
    }
    usedSaved.add(candidate.savedIndex);
    usedLive.add(candidate.liveIndex);
    matches.push({ saved: candidate.saved, live: candidate.live });
  }
  return {
    matches,
    unmatchedSaved: saved.filter((_, index) => !usedSaved.has(index)),
    unusedLive: live.filter((_, index) => !usedLive.has(index)),
  };
}
