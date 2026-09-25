import {
  appKey,
  buildDesktopCatalog,
  expectedWindowCounts,
  explainMissingWindow,
  issueFor,
  matchWindows,
  planRestore,
  resolveTargetFrame,
  runningAppKey,
  windowAppKey,
  type Desktop,
  type DisplayInfo,
  type Layout,
  type Rect,
  type RestoreGroup,
  type RestoreIssue,
  type RestoreProgress,
  type RestoreReport,
  type Result,
  type SavedWindow,
  type WindowMatch,
} from '@magwin/core';
import type {
  AppCatalog,
  AppLauncher,
  Clock,
  DesktopNavigator,
  DisplayCatalog,
  Scheduler,
  WindowMover,
  WindowQuery,
} from '../../domain/ports';
import type { WindowWaiter } from './WindowWaiter';

export interface RestoreOptions {
  /** Restore only the windows saved on this desktop number; null restores everything. */
  readonly desktopNumber: number | null;
  readonly launchMissingApps: boolean;
}

export type ProgressListener = (progress: RestoreProgress) => void;

export interface RestoreDeps {
  readonly desktops: DesktopNavigator;
  readonly displays: DisplayCatalog;
  readonly apps: AppCatalog & AppLauncher;
  readonly windows: WindowQuery & WindowMover;
  readonly waiter: WindowWaiter;
  readonly scheduler: Scheduler;
  readonly clock: Clock;
}

export const RESTORE_TIMING = {
  /** How long to wait for freshly launched apps to open their windows. */
  launchWaitMs: 15_000,
  /** Short wait when nothing was launched (windows already exist). */
  settleWaitMs: 1_500,
  /** Launched apps often restore their own frame shortly after opening; re-apply after this. */
  reapplyDelayMs: 700,
} as const;

interface Environment {
  readonly desktops: readonly Desktop[];
  readonly displays: readonly DisplayInfo[];
}

interface RunContext {
  readonly layout: Layout;
  readonly env: Environment;
  readonly options: RestoreOptions;
  readonly onProgress: ProgressListener;
}

interface GroupOutcome {
  readonly placed: number;
  readonly issues: readonly RestoreIssue[];
}

interface LaunchOutcome {
  launched: boolean;
  readonly failedApps: Set<string>;
  readonly issues: RestoreIssue[];
}

function groupByApp(windows: readonly SavedWindow[]): Map<string, SavedWindow[]> {
  const groups = new Map<string, SavedWindow[]>();
  for (const window of windows) {
    const key = appKey(window.app);
    groups.set(key, [...(groups.get(key) ?? []), window]);
  }
  return groups;
}

/**
 * Feature 2, restore side. For every desktop in the layout: switch to that desktop first,
 * then launch the apps there, then place their windows.
 * See docs/docs/architecture/layout-restore.md.
 */
export class LayoutRestoreService {
  constructor(private readonly deps: RestoreDeps) {}

  async restore(
    layout: Layout,
    options: RestoreOptions,
    onProgress: ProgressListener,
  ): Promise<RestoreReport> {
    const startedAt = this.deps.clock.now();
    const env = await this.environment();
    const plan = planRestore(layout, env.desktops, { onlyDesktopNumber: options.desktopNumber });
    const total = plan.groups.reduce((sum, group) => sum + group.windows.length, 0);
    onProgress({
      type: 'started',
      layoutName: layout.name,
      totalWindows: total,
      desktopCount: plan.groups.length,
    });
    const context: RunContext = { layout, env, options, onProgress };
    const issues: RestoreIssue[] = [...plan.issues];
    let placed = 0;
    for (const group of plan.groups) {
      const outcome = await this.restoreGroup(group, context);
      placed += outcome.placed;
      issues.push(...outcome.issues);
    }
    const report: RestoreReport = {
      layoutName: layout.name,
      placed,
      total,
      issues,
      durationMs: this.deps.clock.now() - startedAt,
    };
    onProgress({ type: 'finished', report });
    return report;
  }

  private async environment(): Promise<Environment> {
    const [topology, displays] = await Promise.all([
      this.deps.desktops.topology(),
      this.deps.displays.displays(),
    ]);
    return {
      desktops: topology.ok ? buildDesktopCatalog(topology.value) : [],
      displays: displays.ok ? displays.value : [],
    };
  }

  private async restoreGroup(group: RestoreGroup, context: RunContext): Promise<GroupOutcome> {
    if (group.target !== null) {
      context.onProgress({ type: 'switching', desktopNumber: group.target.number });
      const switched = await this.deps.desktops.switchTo(group.target.spaceId);
      if (!switched.ok) {
        const detail = switched.error.code;
        return {
          placed: 0,
          issues: group.windows.map((w) => issueFor(w, 'desktopSwitchFailed', { detail })),
        };
      }
    }
    const launch = await this.ensureApps(group, context);
    context.onProgress({ type: 'waiting', desktopNumber: group.target?.number ?? null });
    const candidates = group.windows.filter((w) => !launch.failedApps.has(appKey(w.app)));
    const live = await this.deps.waiter.waitFor({
      spaceId: group.target?.spaceId ?? null,
      expected: expectedWindowCounts(candidates),
      timeoutMs: launch.launched ? RESTORE_TIMING.launchWaitMs : RESTORE_TIMING.settleWaitMs,
    });
    const { matches, unmatchedSaved } = matchWindows(candidates, live);
    const placement = await this.place(matches, context, launch.launched);
    const unmatched = await this.explainUnmatched(unmatchedSaved, group, context);
    return {
      placed: placement.placed,
      issues: [...launch.issues, ...placement.issues, ...unmatched],
    };
  }

  /**
   * Launches apps that are not running, and re-opens running apps that have no window at all,
   * so their windows appear on the desktop we just switched to. Running apps whose windows sit
   * on another desktop are left alone: activating them would pull macOS to that desktop.
   */
  private async ensureApps(group: RestoreGroup, context: RunContext): Promise<LaunchOutcome> {
    const outcome: LaunchOutcome = { launched: false, failedApps: new Set(), issues: [] };
    if (!context.options.launchMissingApps) {
      return outcome;
    }
    const [running, everywhere] = await Promise.all([
      this.deps.apps.runningApps(),
      this.deps.windows.listWindows('all'),
    ]);
    const runningKeys = new Set(running.ok ? running.value.map(runningAppKey) : []);
    const appsWithWindows = new Set(everywhere.ok ? everywhere.value.map(windowAppKey) : []);
    for (const [key, windows] of groupByApp(group.windows)) {
      const [first] = windows;
      if (first === undefined || (runningKeys.has(key) && appsWithWindows.has(key))) {
        continue;
      }
      context.onProgress({ type: 'launching', appName: first.app.name });
      const result = await this.deps.apps.launch(first.app);
      if (result.ok) {
        outcome.launched = true;
      } else {
        outcome.failedApps.add(key);
        const detail = result.error.code;
        outcome.issues.push(...windows.map((w) => issueFor(w, 'appLaunchFailed', { detail })));
      }
    }
    return outcome;
  }

  private async place(
    matches: readonly WindowMatch[],
    context: RunContext,
    launched: boolean,
  ): Promise<GroupOutcome> {
    const issues: RestoreIssue[] = [];
    let placed = 0;
    for (const match of matches) {
      context.onProgress({
        type: 'placing',
        appName: match.saved.app.name,
        windowTitle: match.saved.title,
      });
      const moved = await this.moveWindow(match, context);
      if (moved.ok) {
        placed += 1;
      } else {
        issues.push(issueFor(match.saved, 'moveFailed', { detail: moved.error.code }));
      }
    }
    if (launched && placed > 0) {
      await this.deps.scheduler.sleep(RESTORE_TIMING.reapplyDelayMs);
      for (const match of matches) {
        await this.moveWindow(match, context);
      }
    }
    return { placed, issues };
  }

  private moveWindow(match: WindowMatch, context: RunContext): Promise<Result<Rect>> {
    const frame = resolveTargetFrame(match.saved, context.layout.displays, context.env.displays);
    return this.deps.windows.setFrame({ windowId: match.live.id, pid: match.live.pid }, frame);
  }

  private async explainUnmatched(
    unmatched: readonly SavedWindow[],
    group: RestoreGroup,
    context: RunContext,
  ): Promise<RestoreIssue[]> {
    if (unmatched.length === 0) {
      return [];
    }
    const [running, everywhere] = await Promise.all([
      this.deps.apps.runningApps(),
      this.deps.windows.listWindows('all'),
    ]);
    const facts = {
      runningAppKeys: new Set(running.ok ? running.value.map(runningAppKey) : []),
      windows: everywhere.ok ? everywhere.value : [],
      desktops: context.env.desktops,
      targetSpaceId: group.target?.spaceId ?? null,
    };
    return unmatched.map((saved) => explainMissingWindow(saved, facts));
  }
}
