import type { RestoreProgress } from '@magwin/core';
import { app, BrowserWindow, screen } from 'electron';
import { Channels } from '../../../shared/channels';
import type { MainTab } from '../../../shared/contracts';
import type { RestoreProgressView } from '../../domain/ui';
import { hardenWebContents, loadView, secureWebPreferences, type DockPresence } from './views';
import { mainWindowSizeOptions } from './windowSizes';

function bringToFront(window: BrowserWindow): void {
  app.focus({ steal: true });
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();
}

/** Settings, layouts manager and status (tabs). One instance at a time. */
export class MainWindow {
  private window: BrowserWindow | null = null;

  constructor(private readonly dock: DockPresence) {}

  open(tab: MainTab): void {
    if (this.window !== null && !this.window.isDestroyed()) {
      this.window.webContents.send(Channels.mainNavigate, tab);
      bringToFront(this.window);
      return;
    }
    const window = new BrowserWindow({
      ...mainWindowSizeOptions(),
      title: 'magWin',
      show: false,
      webPreferences: secureWebPreferences(),
    });
    hardenWebContents(window);
    window.once('ready-to-show', () => {
      bringToFront(window);
    });
    window.on('closed', () => {
      this.window = null;
      this.dock.windowClosed();
    });
    this.window = window;
    this.dock.windowOpened();
    void loadView(window, 'main', { tab });
  }
}

/** "Save current layout" HUD. Needs keyboard focus for the name field. */
export class SaveHudWindow {
  private window: BrowserWindow | null = null;

  constructor(private readonly dock: DockPresence) {}

  open(): void {
    if (this.window !== null && !this.window.isDestroyed()) {
      bringToFront(this.window);
      return;
    }
    const window = new BrowserWindow({
      width: 820,
      height: 600,
      minWidth: 640,
      minHeight: 460,
      title: '레이아웃 저장',
      show: false,
      alwaysOnTop: true,
      fullscreenable: false,
      webPreferences: secureWebPreferences(),
    });
    hardenWebContents(window);
    window.once('ready-to-show', () => {
      bringToFront(window);
    });
    window.on('closed', () => {
      this.window = null;
      this.dock.windowClosed();
    });
    this.window = window;
    this.dock.windowOpened();
    void loadView(window, 'save');
  }
}

const HUD_SIZE = { width: 380, height: 360 };
const HUD_MARGIN = 16;

/**
 * Restore progress. A non-activating panel on every desktop, so it stays visible while magWin
 * switches desktops and launches apps without stealing focus from them.
 */
export class ProgressHudWindow implements RestoreProgressView {
  private window: BrowserWindow | null = null;
  private loaded = false;
  private buffered: RestoreProgress[] = [];

  open(): void {
    this.buffered = [];
    const window = this.window ?? this.create();
    window.showInactive();
  }

  publish(progress: RestoreProgress): void {
    if (this.window !== null && this.loaded) {
      this.window.webContents.send(Channels.restoreProgress, progress);
    } else {
      this.buffered.push(progress);
    }
  }

  private create(): BrowserWindow {
    const area = screen.getPrimaryDisplay().workArea;
    const window = new BrowserWindow({
      type: 'panel',
      x: area.x + area.width - HUD_SIZE.width - HUD_MARGIN,
      y: area.y + HUD_MARGIN,
      ...HUD_SIZE,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      acceptFirstMouse: true,
      webPreferences: secureWebPreferences(),
    });
    window.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
    window.setAlwaysOnTop(true, 'floating');
    hardenWebContents(window);
    window.webContents.on('did-finish-load', () => {
      this.loaded = true;
      for (const progress of this.buffered) {
        window.webContents.send(Channels.restoreProgress, progress);
      }
      this.buffered = [];
    });
    window.on('closed', () => {
      this.window = null;
      this.loaded = false;
    });
    this.window = window;
    void loadView(window, 'progress');
    return window;
  }
}
