import type { Rect } from '@magwin/core';
import { app, BrowserWindow, shell, type WebPreferences } from 'electron';
import { join } from 'node:path';
import { isAllowedExternalUrl } from '../../../shared/links';

export type ViewName = 'palette' | 'ghost' | 'main' | 'save' | 'progress';

/** Security settings shared by every window (docs/docs/development/coding-standards.md). */
export function secureWebPreferences(): WebPreferences {
  return {
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    spellcheck: false,
    backgroundThrottling: false,
  };
}

/** Loads the single renderer bundle with `?view=` selecting the screen. */
export function loadView(
  window: BrowserWindow,
  view: ViewName,
  query: Record<string, string> = {},
): Promise<void> {
  const params = new URLSearchParams({ view, ...query });
  const devServer = process.env.ELECTRON_RENDERER_URL;
  if (devServer !== undefined && devServer !== '') {
    return window.loadURL(`${devServer}?${params.toString()}`);
  }
  return window.loadFile(join(__dirname, '../renderer/index.html'), {
    query: Object.fromEntries(params),
  });
}

/**
 * No navigation away from the app and no new windows; https links open in the browser and
 * mailto links in the mail app.
 */
export function hardenWebContents(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
}

export function roundBounds(rect: Rect): Electron.Rectangle {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };
}

/** Sends an event to every window of the app. */
export function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, payload);
    }
  }
}

/**
 * magWin is a menu bar app, but while a regular window (main, save HUD) is open it shows a Dock
 * icon so the window can be reached with ⌘Tab.
 */
export class DockPresence {
  private open = 0;

  windowOpened(): void {
    this.open += 1;
    void app.dock?.show();
    // Packaged builds take the icon from the bundle; dev runs inside Electron.app.
    if (!app.isPackaged) {
      app.dock?.setIcon(join(app.getAppPath(), 'build', 'icon.png'));
    }
  }

  windowClosed(): void {
    this.open = Math.max(0, this.open - 1);
    if (this.open === 0) {
      app.dock?.hide();
    }
  }
}

/** Where the native helper binary lives in development and in the packaged app. */
export function helperBinaryPath(): string {
  const override = process.env.MAGWIN_HELPER_PATH;
  if (override !== undefined && override !== '') {
    return override;
  }
  return app.isPackaged
    ? join(process.resourcesPath, 'bin', 'MagWinHelper')
    : join(
        app.getAppPath(),
        '..',
        '..',
        'native',
        'MagWinHelper',
        '.build',
        'release',
        'MagWinHelper',
      );
}
