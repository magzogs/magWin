import { issueFor, type RestoreIssue } from '../restore/report';
import type { Desktop } from './desktops';
import type { Layout, SavedDesktop, SavedWindow } from './model';

/**
 * Windows restored together. The restore service first switches to `target`
 * (null = stay on whatever desktop is current), then launches the apps and places the windows.
 */
export interface RestoreGroup {
  readonly target: Desktop | null;
  readonly savedDesktopNumber: number | null;
  readonly windows: readonly SavedWindow[];
}

export interface RestorePlan {
  readonly groups: readonly RestoreGroup[];
  readonly issues: readonly RestoreIssue[];
}

export interface PlanOptions {
  /** Restore only the windows saved on this desktop number. */
  readonly onlyDesktopNumber: number | null;
}

/**
 * Finds today's desktop for a saved one: by space UUID, then by position on the same display,
 * then by the global "Desktop N" number.
 */
export function resolveDesktop(saved: SavedDesktop, desktops: readonly Desktop[]): Desktop | null {
  if (saved.spaceUuid !== null) {
    const byUuid = desktops.find((d) => d.spaceUuid === saved.spaceUuid);
    if (byUuid !== undefined) {
      return byUuid;
    }
  }
  const byDisplay = desktops.find(
    (d) => d.displayUuid === saved.displayUuid && d.indexOnDisplay === saved.indexOnDisplay,
  );
  return byDisplay ?? desktops.find((d) => d.number === saved.number) ?? null;
}

interface MutableGroup {
  readonly target: Desktop | null;
  readonly savedDesktopNumber: number | null;
  readonly windows: SavedWindow[];
}

/** Groups on the current desktop come first; then highest desktop number first, so the
 * restore ends on the lowest-numbered desktop of the layout without an extra switch. */
function compareGroups(a: RestoreGroup, b: RestoreGroup): number {
  if (a.target === null) {
    return b.target === null ? 0 : -1;
  }
  if (b.target === null) {
    return 1;
  }
  return b.target.number - a.target.number;
}

export function planRestore(
  layout: Layout,
  desktops: readonly Desktop[],
  options: PlanOptions,
): RestorePlan {
  const selected =
    options.onlyDesktopNumber === null
      ? layout.windows
      : layout.windows.filter((w) => w.desktop?.number === options.onlyDesktopNumber);
  const groups = new Map<string, MutableGroup>();
  const issues: RestoreIssue[] = [];
  for (const window of selected) {
    const target = window.desktop === null ? null : resolveDesktop(window.desktop, desktops);
    if (window.desktop !== null && target === null) {
      issues.push(issueFor(window, 'desktopMissing'));
    }
    const key = target === null ? 'current' : `space:${target.spaceId}`;
    const group = groups.get(key) ?? {
      target,
      savedDesktopNumber: window.desktop?.number ?? null,
      windows: [],
    };
    group.windows.push(window);
    groups.set(key, group);
  }
  return { groups: [...groups.values()].sort(compareGroups), issues };
}
