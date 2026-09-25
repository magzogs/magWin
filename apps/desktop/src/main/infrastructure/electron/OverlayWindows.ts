import { rectsEqual, type Rect } from '@magwin/core';
import { BrowserWindow } from 'electron';
import { Channels } from '../../../shared/channels';
import type { GhostState, PaletteState } from '../../../shared/contracts';
import type { GhostView, PaletteView, ScreenDisplay } from '../../domain/ui';
import { hardenWebContents, loadView, roundBounds, secureWebPreferences } from './views';

/** The renderer normally paints within a frame; never wait longer than this. */
const READY_TIMEOUT_MS = 150;

function overlayWindow(options: Electron.BrowserWindowConstructorOptions): BrowserWindow {
  const window = new BrowserWindow({
    // NSPanel with the non-activating style: showing it never steals focus from the target app,
    // and it floats over full-screen apps on every desktop.
    type: 'panel',
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: secureWebPreferences(),
    ...options,
  });
  window.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: true,
  });
  hardenWebContents(window);
  return window;
}

/** The grid palette (feature 1). Created once and reused so it appears instantly. */
export class PaletteWindow implements PaletteView {
  private readonly window: BrowserWindow;
  private wantedToken: number | null = null;
  private readonly readyWaiters = new Map<number, () => void>();

  constructor() {
    this.window = overlayWindow({ acceptFirstMouse: true, roundedCorners: false });
    this.window.setAlwaysOnTop(true, 'pop-up-menu');
    void loadView(this.window, 'palette');
  }

  get webContentsId(): number {
    return this.window.webContents.id;
  }

  markReady(token: number): void {
    this.readyWaiters.get(token)?.();
  }

  /**
   * Hidden windows produce no frames, so the panel is shown fully transparent first; once the
   * renderer reports the new state painted, it becomes opaque. No stale content ever flashes.
   */
  async show(state: PaletteState, bounds: Rect): Promise<void> {
    this.wantedToken = state.token;
    this.window.setOpacity(0);
    this.window.setBounds(roundBounds(bounds));
    const painted = new Promise<void>((resolve) => {
      this.readyWaiters.set(state.token, resolve);
      setTimeout(resolve, READY_TIMEOUT_MS);
    });
    this.window.webContents.send(Channels.paletteState, state);
    this.window.showInactive();
    await painted;
    this.readyWaiters.delete(state.token);
    // hide() may have been called while the renderer was painting.
    if (this.wantedToken === state.token) {
      this.window.setOpacity(1);
    }
  }

  hide(): void {
    this.wantedToken = null;
    this.window.hide();
  }
}

/** Click-through overlay that previews the target frame while cells are selected. */
export class GhostWindow implements GhostView {
  private readonly window: BrowserWindow;
  private bounds: Rect | null = null;

  constructor() {
    this.window = overlayWindow({ focusable: false, enableLargerThanScreen: true });
    this.window.setIgnoreMouseEvents(true);
    this.window.setAlwaysOnTop(true, 'floating');
    void loadView(this.window, 'ghost');
  }

  show(display: ScreenDisplay, frame: Rect): void {
    const area = display.workArea;
    if (this.bounds === null || !rectsEqual(this.bounds, area)) {
      this.window.setBounds(roundBounds(area));
      this.bounds = area;
    }
    const state: GhostState = {
      rect: { x: frame.x - area.x, y: frame.y - area.y, width: frame.width, height: frame.height },
    };
    this.window.webContents.send(Channels.ghostState, state);
    if (!this.window.isVisible()) {
      this.window.showInactive();
    }
  }

  hide(): void {
    this.window.webContents.send(Channels.ghostState, null);
    this.window.hide();
  }
}
