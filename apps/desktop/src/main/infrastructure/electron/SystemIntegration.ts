import type { Point } from '@magwin/core';
import { app, globalShortcut, Menu, screen, shell, Tray } from 'electron';
import type { AppInfo, SettingsTarget } from '../../../shared/contracts';
import type { Logger } from '../../domain/ports';
import type { ScreenDisplay, ScreenInfo } from '../../domain/ui';
import { createTrayIcon } from './trayIcon';
import { buildTrayMenu, type TrayActions, type TrayModel } from './trayMenu';

export class ElectronScreen implements ScreenInfo {
  cursor(): Point {
    return screen.getCursorScreenPoint();
  }

  displayNearest(point: Point): ScreenDisplay {
    const display = screen.getDisplayNearestPoint({
      x: Math.round(point.x),
      y: Math.round(point.y),
    });
    return { id: display.id, bounds: display.bounds, workArea: display.workArea };
  }
}

export class TrayController {
  private tray: Tray | null = null;

  constructor(private readonly actions: TrayActions) {}

  start(model: TrayModel): void {
    this.tray = new Tray(createTrayIcon());
    this.tray.setToolTip('OrgaWin');
    this.update(model);
  }

  update(model: TrayModel): void {
    this.tray?.setContextMenu(Menu.buildFromTemplate(buildTrayMenu(model, this.actions)));
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}

export interface ShortcutActions {
  saveLayout(): void;
  restoreSlot(index: number): void;
}

/** ⌃⌥⌘S saves the current layout; ⌃⌥⌘1…9 restore the first nine layouts. */
export class GlobalShortcuts {
  constructor(
    private readonly actions: ShortcutActions,
    private readonly logger: Logger,
  ) {}

  apply(enabled: boolean): void {
    globalShortcut.unregisterAll();
    if (!enabled) {
      return;
    }
    this.register('Control+Alt+Command+S', () => {
      this.actions.saveLayout();
    });
    for (let slot = 1; slot <= 9; slot += 1) {
      this.register(`Control+Alt+Command+${slot}`, () => {
        this.actions.restoreSlot(slot - 1);
      });
    }
  }

  private register(accelerator: string, handler: () => void): void {
    if (!globalShortcut.register(accelerator, handler)) {
      this.logger.warn(`Shortcut ${accelerator} is already used by another app`);
    }
  }
}

const SETTINGS_URLS: Record<SettingsTarget, string> = {
  accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
  screenRecording: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
  keyboardShortcuts: 'x-apple.systempreferences:com.apple.Keyboard-Settings.extension',
};

export function openSystemSettings(target: SettingsTarget): Promise<void> {
  return shell.openExternal(SETTINGS_URLS[target]);
}

/** Registering a login item only makes sense for the packaged app, not the dev Electron binary. */
export function syncLoginItem(openAtLogin: boolean): void {
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin });
  }
}

export function appInfo(): AppInfo {
  return {
    appVersion: app.getVersion(),
    osVersion: process.getSystemVersion(),
    arch: process.arch,
  };
}
