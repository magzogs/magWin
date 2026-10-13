import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type LayoutSummary,
  type RestoreProgress,
} from '@magwin/core';
import { vi } from 'vitest';
import type { MagWinApi, Unsubscribe } from '../../../shared/api';
import type {
  AppInfo,
  GhostState,
  MainTab,
  PaletteState,
  SystemStatus,
} from '../../../shared/contracts';

/** A test double for one main → renderer event channel. */
export class FakeChannel<T> {
  private readonly listeners = new Set<(value: T) => void>();
  readonly subscribe = (listener: (value: T) => void): Unsubscribe => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  emit(value: T): void {
    for (const listener of [...this.listeners]) listener(value);
  }
}

export const readyStatus: SystemStatus = {
  helper: 'ready',
  helperMessage: null,
  accessibility: true,
  screenRecording: false,
  hotkeys: { directDesktops: [1, 2], moveLeft: true, moveRight: true },
  restoring: false,
  canUndo: false,
};

export const testAppInfo: AppInfo = { appVersion: '0.1.0', osVersion: '26.6.2', arch: 'arm64' };

export function createFakeApi() {
  const channels = {
    paletteState: new FakeChannel<PaletteState>(),
    ghostState: new FakeChannel<GhostState | null>(),
    settings: new FakeChannel<AppSettings>(),
    layouts: new FakeChannel<LayoutSummary[]>(),
    progress: new FakeChannel<RestoreProgress>(),
    status: new FakeChannel<SystemStatus>(),
    navigate: new FakeChannel<MainTab>(),
  };
  const api = {
    palette: {
      onState: channels.paletteState.subscribe,
      ready: vi.fn(),
      selectionChanged: vi.fn(),
      interaction: vi.fn(),
      apply: vi.fn().mockResolvedValue({ ok: true }),
      resizeCustom: vi.fn().mockResolvedValue({ ok: true }),
      dismiss: vi.fn(),
    },
    ghost: { onState: channels.ghostState.subscribe },
    settings: {
      get: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
      update: vi.fn().mockResolvedValue({ ok: true, settings: DEFAULT_SETTINGS }),
      onChanged: channels.settings.subscribe,
    },
    layouts: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      capture: vi.fn().mockResolvedValue({ ok: false, code: 'helperClosed' }),
      save: vi.fn().mockResolvedValue({ ok: false, code: 'emptyLayout' }),
      rename: vi.fn().mockResolvedValue({ ok: true }),
      remove: vi.fn().mockResolvedValue({ ok: true }),
      move: vi.fn().mockResolvedValue({ ok: true }),
      restore: vi.fn().mockResolvedValue({ ok: true }),
      undoRestore: vi.fn().mockResolvedValue({ ok: true }),
      openSaveHud: vi.fn(),
      onChanged: channels.layouts.subscribe,
      onProgress: channels.progress.subscribe,
    },
    system: {
      status: vi.fn().mockResolvedValue(readyStatus),
      requestAccessibility: vi.fn().mockResolvedValue(readyStatus),
      requestScreenRecording: vi.fn().mockResolvedValue(readyStatus),
      openSettings: vi.fn().mockResolvedValue(undefined),
      about: vi.fn().mockResolvedValue(testAppInfo),
      onStatus: channels.status.subscribe,
    },
    windows: {
      closeSelf: vi.fn(),
      openMain: vi.fn(),
      onNavigate: channels.navigate.subscribe,
    },
  } satisfies MagWinApi;
  return { api, channels };
}
