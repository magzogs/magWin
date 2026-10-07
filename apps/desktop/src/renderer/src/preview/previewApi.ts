import {
  applySettingsPatch,
  computePaletteLayout,
  customPreset,
  DEFAULT_PALETTE_METRICS,
  DEFAULT_SETTINGS,
  replacePreset,
  summarizeLayout,
  type AppSettings,
  type CaptureDraft,
  type Edge,
  type Layout,
  type LayoutSummary,
  type RestoreProgress,
  type SavedWindow,
} from '@magwin/core';
import type { MagWinApi, Unsubscribe } from '../../../shared/api';
import type { GhostState, MainTab, PaletteState, SystemStatus } from '../../../shared/contracts';

/**
 * In-memory MagWinApi for `pnpm --filter @magwin/desktop preview:ui`: lets you design the
 * renderer in a browser without Electron, the helper or macOS permissions. Never bundled
 * into the app (only preview.html imports it).
 */

class Channel<T> {
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

const display = {
  uuid: 'PREVIEW',
  name: 'Preview Display',
  frame: { x: 0, y: 0, width: 1512, height: 982 },
  visibleFrame: { x: 0, y: 32, width: 1512, height: 950 },
  isMain: true,
};

function win(
  app: string,
  desktop: number,
  rel: [number, number, number, number],
  order: number,
): SavedWindow {
  const [x, y, width, height] = rel;
  return {
    app: { bundleId: `preview.${app}`, name: app, path: null },
    title: `${app} — preview`,
    frame: { x: x * 1512, y: 32 + y * 950, width: width * 1512, height: height * 950 },
    relativeFrame: { x, y, width, height },
    displayUuid: display.uuid,
    desktop: {
      number: desktop,
      displayUuid: display.uuid,
      indexOnDisplay: desktop,
      spaceUuid: null,
      spaceId: desktop,
    },
    order,
  };
}

const CODING: Layout = {
  schemaVersion: 1,
  id: 'preview-coding',
  name: '코딩',
  createdAt: '2026-09-25T09:00:00.000Z',
  updatedAt: '2026-09-25T09:00:00.000Z',
  displays: [display],
  windows: [
    win('VS Code', 1, [0, 0, 0.66, 1], 0),
    win('Terminal', 1, [0.66, 0.5, 0.34, 0.5], 1),
    win('Chrome', 1, [0.66, 0, 0.34, 0.5], 2),
    win('Slack', 2, [0, 0, 0.5, 1], 3),
    win('Mail', 2, [0.5, 0, 0.5, 1], 4),
  ],
};

const DRAFT: CaptureDraft = {
  scope: 'all',
  displays: [display],
  entries: CODING.windows.map((window, index) => ({
    key: String(index),
    window,
    included: index !== 4,
  })),
  skippedFullscreen: 1,
};

const STATUS: SystemStatus = {
  helper: 'ready',
  helperMessage: null,
  accessibility: false,
  screenRecording: false,
  hotkeys: { directDesktops: [1, 2], moveLeft: true, moveRight: true },
  restoring: false,
  canUndo: true,
};

const DEMO_RESTORE: readonly RestoreProgress[] = [
  { type: 'started', layoutName: '코딩', totalWindows: 5, desktopCount: 2 },
  { type: 'switching', desktopNumber: 2 },
  { type: 'launching', appName: 'Slack' },
  { type: 'waiting', desktopNumber: 2 },
  { type: 'placing', appName: 'Slack', windowTitle: null },
  { type: 'switching', desktopNumber: 1 },
  { type: 'placing', appName: 'VS Code', windowTitle: null },
  {
    type: 'finished',
    report: {
      layoutName: '코딩',
      placed: 4,
      total: 5,
      durationMs: 5200,
      issues: [
        {
          reason: 'onOtherDesktop',
          appName: 'Mail',
          windowTitle: 'Inbox',
          desktopNumber: 2,
          foundOnDesktop: 3,
          detail: null,
        },
      ],
    },
  },
];

export function paletteState(edge: Edge, settings: AppSettings = DEFAULT_SETTINGS): PaletteState {
  return {
    token: Date.now(),
    edge,
    layout: computePaletteLayout({
      presets: settings.grid.presets,
      edge,
      aspectRatio: 1512 / 950,
      metrics: { ...DEFAULT_PALETTE_METRICS, componentWidth: settings.palette.componentWidth },
    }),
    presets: settings.grid.presets,
    appName: 'Preview',
    workArea: { width: 1512, height: 950 },
    gapPx: settings.grid.gapPx,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const OK = { ok: true } as const;

interface PreviewState {
  settings: AppSettings;
  layouts: Layout[];
}

const channels = {
  palette: new Channel<PaletteState>(),
  ghost: new Channel<GhostState | null>(),
  settings: new Channel<AppSettings>(),
  layouts: new Channel<LayoutSummary[]>(),
  progress: new Channel<RestoreProgress>(),
  status: new Channel<SystemStatus>(),
  navigate: new Channel<MainTab>(),
};

function settingsApi(state: PreviewState): MagWinApi['settings'] {
  return {
    get: () => Promise.resolve(state.settings),
    update: (patch) => {
      const next = applySettingsPatch(state.settings, patch);
      if (!next.ok)
        return Promise.resolve({ ok: false, code: next.error.code, message: next.error.message });
      state.settings = next.value;
      channels.settings.emit(state.settings);
      return Promise.resolve({ ok: true, settings: state.settings });
    },
    onChanged: channels.settings.subscribe,
  };
}

function layoutsApi(state: PreviewState): MagWinApi['layouts'] {
  const publish = (layouts: Layout[]): void => {
    state.layouts = layouts;
    channels.layouts.emit(layouts.map(summarizeLayout));
  };
  return {
    list: () => Promise.resolve(state.layouts.map(summarizeLayout)),
    get: (id) => Promise.resolve(state.layouts.find((l) => l.id === id) ?? null),
    capture: async () => {
      await delay(300);
      return { ok: true, draftId: 'preview-draft', draft: DRAFT };
    },
    save: (request) => {
      const layout = {
        ...CODING,
        id: `preview-${String(state.layouts.length + 1)}`,
        name: request.name,
      };
      publish([...state.layouts, layout]);
      return Promise.resolve({ ok: true, summary: summarizeLayout(layout) });
    },
    rename: ({ id, name }) => {
      publish(state.layouts.map((l) => (l.id === id ? { ...l, name } : l)));
      return Promise.resolve(OK);
    },
    remove: (id) => {
      publish(state.layouts.filter((l) => l.id !== id));
      return Promise.resolve(OK);
    },
    move: () => Promise.resolve(OK),
    restore: () => Promise.resolve(OK),
    undoRestore: () => Promise.resolve(OK),
    openSaveHud: () => undefined,
    onChanged: channels.layouts.subscribe,
    onProgress: channels.progress.subscribe,
  };
}

export interface PreviewControls {
  readonly api: MagWinApi;
  showPalette(edge: Edge): void;
  playRestore(): void;
}

export function createPreviewApi(): PreviewControls {
  const state: PreviewState = { settings: DEFAULT_SETTINGS, layouts: [CODING] };
  const api: MagWinApi = {
    palette: {
      onState: channels.palette.subscribe,
      ready: () => undefined,
      selectionChanged: () => undefined,
      interaction: () => undefined,
      apply: async () => {
        await delay(200);
        return OK;
      },
      resizeCustom: async (size) => {
        const presets = replacePreset(
          state.settings.grid.presets,
          customPreset(size.cols, size.rows),
        );
        await settingsApi(state).update({ grid: { presets } });
        return OK;
      },
      dismiss: () => undefined,
    },
    ghost: { onState: channels.ghost.subscribe },
    settings: settingsApi(state),
    layouts: layoutsApi(state),
    system: {
      status: () => Promise.resolve(STATUS),
      requestAccessibility: () => Promise.resolve(STATUS),
      openSettings: () => Promise.resolve(),
      about: () => Promise.resolve({ appVersion: '0.1.0', osVersion: '26.6.2', arch: 'arm64' }),
      onStatus: channels.status.subscribe,
    },
    windows: {
      closeSelf: () => undefined,
      openMain: (tab) => {
        channels.navigate.emit(tab);
      },
      onNavigate: channels.navigate.subscribe,
    },
  };
  return {
    api,
    showPalette: (edge) => {
      channels.palette.emit(paletteState(edge, state.settings));
    },
    playRestore: () => {
      DEMO_RESTORE.forEach((step, index) => {
        setTimeout(() => {
          channels.progress.emit(step);
        }, index * 600);
      });
    },
  };
}
