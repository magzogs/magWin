import type { RestoreIssue, RestoreProgress } from '@magwin/core';

/** Every user-facing string lives here so wording changes never touch components. */
const ERRORS: Record<string, string> = {
  accessibilityDenied: '손쉬운 사용 권한이 필요해요. 권한 및 상태 탭에서 허용해 주세요.',
  windowNotFound: '창을 찾을 수 없어요. 닫혔거나 다른 Desktop으로 옮겨졌어요.',
  notResizable: '이 창은 위치나 크기를 바꿀 수 없어요.',
  fullscreen: '전체 화면 창은 옮길 수 없어요.',
  invalidRange: '선택한 칸이 올바르지 않아요.',
  paletteClosed: '팔레트가 이미 닫혔어요.',
  helperTimeout: '네이티브 도우미가 응답하지 않아요.',
  helperClosed: '네이티브 도우미가 종료됐어요.',
  helperProtocol: '네이티브 도우미 버전이 맞지 않아요. 다시 빌드해 주세요.',
  layoutNotFound: '레이아웃을 찾을 수 없어요.',
  restoreInProgress: '이미 복원 중이에요.',
  nothingToUndo: '되돌릴 배치가 없어요.',
  draftExpired: '캡처가 만료됐어요. 다시 캡처해 주세요.',
  emptyLayout: '저장할 창을 하나 이상 선택해 주세요.',
  noShortcut: 'Desktop 전환 단축키가 꺼져 있어요.',
  switchTimeout: 'Desktop 전환이 확인되지 않았어요.',
  spaceNotFound: 'Desktop을 찾을 수 없어요.',
  appNotFound: '앱이 설치되어 있지 않아요.',
  launchFailed: '앱을 실행하지 못했어요.',
  invalidSettings: '설정 값이 올바르지 않아요.',
};

export function errorMessage(code: string): string {
  return ERRORS[code] ?? `알 수 없는 오류 (${code})`;
}

function windowName(issue: RestoreIssue): string {
  return issue.windowTitle === null ? issue.appName : `${issue.appName} — ${issue.windowTitle}`;
}

export function issueMessage(issue: RestoreIssue): string {
  const name = windowName(issue);
  const saved = issue.desktopNumber === null ? '' : `Desktop ${issue.desktopNumber}`;
  switch (issue.reason) {
    case 'desktopMissing':
      return `${name}: ${saved}이 없어서 현재 Desktop에 배치했어요.`;
    case 'desktopSwitchFailed':
      return `${name}: ${saved}로 전환하지 못했어요. ${errorMessage(issue.detail ?? 'switchTimeout')}`;
    case 'appLaunchFailed':
      return `${name}: ${errorMessage(issue.detail ?? 'launchFailed')}`;
    case 'appNotRunning':
      return `${name}: 앱이 실행 중이 아니에요.`;
    case 'windowNotFound':
      return `${name}: 창을 찾지 못했어요.`;
    case 'onOtherDesktop':
      return `${name}: 창이 Desktop ${String(issue.foundOnDesktop)}에 있어요. 옮기려면 앱을 종료한 뒤 다시 복원하거나 Mission Control에서 끌어다 놓아 주세요.`;
    case 'moveFailed':
      return `${name}: ${errorMessage(issue.detail ?? 'notResizable')}`;
  }
}

export function progressMessage(progress: RestoreProgress): string {
  switch (progress.type) {
    case 'started':
      return `'${progress.layoutName}' 복원을 시작해요`;
    case 'switching':
      return `Desktop ${progress.desktopNumber}로 이동하는 중…`;
    case 'launching':
      return `${progress.appName} 실행 중…`;
    case 'waiting':
      return '창이 뜨기를 기다리는 중…';
    case 'placing':
      return `${progress.appName} 배치 중…`;
    case 'finished':
      return `${progress.report.total}개 중 ${progress.report.placed}개 창을 배치했어요`;
  }
}

export const MODIFIER_LABELS = {
  none: '없음 (그냥 머무르기)',
  option: '⌥ Option',
  control: '⌃ Control',
  command: '⌘ Command',
  shift: '⇧ Shift',
} as const;

export const EDGE_LABELS = { top: '위', bottom: '아래', left: '왼쪽', right: '오른쪽' } as const;
