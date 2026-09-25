import type { SavedWindow } from '../layouts/model';

export type RestoreIssueReason =
  | 'desktopMissing'
  | 'desktopSwitchFailed'
  | 'appLaunchFailed'
  | 'appNotRunning'
  | 'windowNotFound'
  | 'onOtherDesktop'
  | 'moveFailed';

export interface RestoreIssue {
  readonly reason: RestoreIssueReason;
  readonly appName: string;
  readonly windowTitle: string | null;
  /** Desktop the window was saved on. */
  readonly desktopNumber: number | null;
  /** For `onOtherDesktop`: the desktop where the app's window is right now. */
  readonly foundOnDesktop: number | null;
  /** Machine readable cause from the helper, e.g. `noShortcut` or `notResizable`. */
  readonly detail: string | null;
}

export interface RestoreReport {
  readonly layoutName: string;
  readonly placed: number;
  readonly total: number;
  readonly issues: readonly RestoreIssue[];
  readonly durationMs: number;
}

export type RestoreProgress =
  | {
      readonly type: 'started';
      readonly layoutName: string;
      readonly totalWindows: number;
      readonly desktopCount: number;
    }
  | { readonly type: 'switching'; readonly desktopNumber: number }
  | { readonly type: 'launching'; readonly appName: string }
  | { readonly type: 'waiting'; readonly desktopNumber: number | null }
  | { readonly type: 'placing'; readonly appName: string; readonly windowTitle: string | null }
  | { readonly type: 'finished'; readonly report: RestoreReport };

export interface IssueExtras {
  readonly detail?: string;
  readonly foundOnDesktop?: number;
}

export function issueFor(
  window: SavedWindow,
  reason: RestoreIssueReason,
  extras: IssueExtras = {},
): RestoreIssue {
  return {
    reason,
    appName: window.app.name,
    windowTitle: window.title,
    desktopNumber: window.desktop?.number ?? null,
    foundOnDesktop: extras.foundOnDesktop ?? null,
    detail: extras.detail ?? null,
  };
}
