import { buildDesktopCatalog, type Result } from '@magwin/core';
import type { HotkeySummary } from '../../../shared/contracts';
import type {
  AppCatalog,
  DesktopNavigator,
  DisplayCatalog,
  PermissionGate,
  PermissionStatus,
  ShortcutInspector,
  WindowQuery,
} from '../../domain/ports';

export interface DiagnosticsDeps {
  readonly permissions: PermissionGate;
  readonly displays: DisplayCatalog;
  readonly desktops: DesktopNavigator;
  readonly shortcuts: ShortcutInspector;
  readonly windows: WindowQuery;
  readonly apps: AppCatalog;
}

export interface DiagnosticsReport {
  readonly permissions: PermissionStatus | string;
  readonly displays: readonly string[] | string;
  readonly desktops: readonly string[] | string;
  readonly hotkeys: HotkeySummary | string;
  readonly visibleWindows: number | string;
  readonly allWindows: number | string;
  readonly runningApps: number | string;
}

function describe<T, R>(result: Result<T>, map: (value: T) => R): R | string {
  return result.ok ? map(result.value) : `error: ${result.error.code} ${result.error.message}`;
}

/** Read-only self check used by `OrgaWin --diagnose`. Never moves windows or switches desktops. */
export class DiagnosticsService {
  constructor(private readonly deps: DiagnosticsDeps) {}

  async run(): Promise<DiagnosticsReport> {
    const [permissions, displays, topology, hotkeys, visible, all, apps] = await Promise.all([
      this.deps.permissions.status(),
      this.deps.displays.displays(),
      this.deps.desktops.topology(),
      this.deps.shortcuts.missionControlHotkeys(),
      this.deps.windows.listWindows('current'),
      this.deps.windows.listWindows('all'),
      this.deps.apps.runningApps(),
    ]);
    return {
      permissions: describe(permissions, (p) => p),
      displays: describe(displays, (list) =>
        list.map((d) => `${d.name} ${d.frame.width}x${d.frame.height}${d.isMain ? ' (main)' : ''}`),
      ),
      desktops: describe(topology, (t) =>
        buildDesktopCatalog(t).map(
          (d) => `Desktop ${d.number} (space ${d.spaceId})${d.isCurrent ? ' current' : ''}`,
        ),
      ),
      hotkeys: describe(hotkeys, (h) => h),
      visibleWindows: describe(visible, (w) => w.length),
      allWindows: describe(all, (w) => w.length),
      runningApps: describe(apps, (a) => a.length),
    };
  }
}
