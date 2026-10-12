import type { AppInfo, SystemStatus } from '../../../../shared/contracts';

function yesNo(value: boolean): string {
  return value ? 'yes' : 'no';
}

function hotkeyLine(status: SystemStatus): string {
  const { hotkeys } = status;
  if (hotkeys === null) return 'unknown';
  const direct = hotkeys.directDesktops.length > 0 ? hotkeys.directDesktops.join(',') : 'none';
  return `direct=${direct} left=${yesNo(hotkeys.moveLeft)} right=${yesNo(hotkeys.moveRight)}`;
}

/**
 * Plain-text summary pasted into support requests. Language independent on purpose, and it
 * never contains window titles, app names or layout names.
 */
export function buildDiagnostics(info: AppInfo, status: SystemStatus | null): string {
  const lines = [`OrgaWin ${info.appVersion}`, `macOS ${info.osVersion} (${info.arch})`];
  if (status !== null) {
    lines.push(
      `helper: ${status.helper}${status.helperMessage === null ? '' : ` (${status.helperMessage})`}`,
      `accessibility: ${yesNo(status.accessibility)}`,
      `screen recording: ${yesNo(status.screenRecording)}`,
      `desktop shortcuts: ${hotkeyLine(status)}`,
    );
  }
  return lines.join('\n');
}
