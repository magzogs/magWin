import type { Locale, RestoreIssue, RestoreProgress } from '@magwin/core';
import { en } from './en';
import { ko, type Messages } from './ko';

export type { Messages } from './ko';

const CATALOGS: Readonly<Record<Locale, Messages>> = { en, ko };

/** Language names are always shown in their own language. */
export const LANGUAGE_NAMES: Readonly<Record<Locale, string>> = { ko: '한국어', en: 'English' };

export function messagesFor(locale: Locale): Messages {
  return CATALOGS[locale];
}

/** Translates an error code returned by the main process. */
export function errorMessage(t: Messages, code: string): string {
  const known: Readonly<Record<string, string | undefined>> = t.errors;
  return known[code] ?? t.common.unknownError(code);
}

function windowName(issue: RestoreIssue): string {
  return issue.windowTitle === null ? issue.appName : `${issue.appName} — ${issue.windowTitle}`;
}

export function issueMessage(t: Messages, issue: RestoreIssue): string {
  const name = windowName(issue);
  const desktop = issue.desktopNumber ?? 0;
  switch (issue.reason) {
    case 'desktopMissing':
      return t.issues.desktopMissing(name, desktop);
    case 'desktopSwitchFailed':
      return t.issues.desktopSwitchFailed(
        name,
        desktop,
        errorMessage(t, issue.detail ?? 'switchTimeout'),
      );
    case 'appLaunchFailed':
      return `${name}: ${errorMessage(t, issue.detail ?? 'launchFailed')}`;
    case 'appNotRunning':
      return t.issues.appNotRunning(name);
    case 'windowNotFound':
      return t.issues.windowNotFound(name);
    case 'onOtherDesktop':
      return t.issues.onOtherDesktop(name, String(issue.foundOnDesktop));
    case 'moveFailed':
      return `${name}: ${errorMessage(t, issue.detail ?? 'notResizable')}`;
  }
}

export function progressMessage(t: Messages, progress: RestoreProgress): string {
  switch (progress.type) {
    case 'started':
      return t.progress.started(progress.layoutName);
    case 'switching':
      return t.progress.switching(progress.desktopNumber);
    case 'launching':
      return t.progress.launching(progress.appName);
    case 'waiting':
      return t.progress.waiting;
    case 'placing':
      return t.progress.placing(progress.appName);
    case 'finished':
      return t.progress.finished(progress.report.placed, progress.report.total);
  }
}
