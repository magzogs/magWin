import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { MagWinApi, Unsubscribe } from '../shared/api';
import { Channels } from '../shared/channels';

/**
 * The renderer's only bridge to the main process: a fixed set of channels, no Node access.
 * Payloads are validated again in the main process (src/main/ipc).
 */

/** Payload types are declared by MagWinApi; the main process is the only sender. */
function subscribe(channel: string, listener: (payload: never) => void): Unsubscribe {
  const handler = (_event: IpcRendererEvent, payload: unknown): void => {
    listener(payload as never);
  };
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

/**
 * Response types are declared once, by MagWinApi below; `never` lets each member narrow it.
 * The main process validates the request payloads.
 */
function invoke(channel: string, payload?: unknown): Promise<never> {
  return ipcRenderer.invoke(channel, payload) as Promise<never>;
}

function send(channel: string, payload?: unknown): void {
  ipcRenderer.send(channel, payload);
}

const api: MagWinApi = {
  palette: {
    onState: (listener) => subscribe(Channels.paletteState, listener),
    ready: (token) => {
      send(Channels.paletteReady, token);
    },
    selectionChanged: (selection) => {
      send(Channels.paletteSelection, selection);
    },
    interaction: (active) => {
      send(Channels.paletteInteraction, active);
    },
    apply: (selection) => invoke(Channels.paletteApply, selection),
    resizeCustom: (size) => invoke(Channels.paletteResizeCustom, size),
    dismiss: () => {
      send(Channels.paletteDismiss);
    },
  },
  ghost: {
    onState: (listener) => subscribe(Channels.ghostState, listener),
  },
  settings: {
    get: () => invoke(Channels.settingsGet),
    update: (patch) => invoke(Channels.settingsUpdate, patch),
    onChanged: (listener) => subscribe(Channels.settingsChanged, listener),
  },
  layouts: {
    list: () => invoke(Channels.layoutsList),
    get: (id) => invoke(Channels.layoutsGet, id),
    capture: (scope) => invoke(Channels.layoutsCapture, scope),
    save: (request) => invoke(Channels.layoutsSave, request),
    rename: (request) => invoke(Channels.layoutsRename, request),
    remove: (id) => invoke(Channels.layoutsRemove, id),
    move: (request) => invoke(Channels.layoutsMove, request),
    restore: (request) => invoke(Channels.layoutsRestore, request),
    undoRestore: () => invoke(Channels.restoreUndo),
    openSaveHud: () => {
      send(Channels.saveHudOpen);
    },
    onChanged: (listener) => subscribe(Channels.layoutsChanged, listener),
    onProgress: (listener) => subscribe(Channels.restoreProgress, listener),
  },
  system: {
    status: () => invoke(Channels.systemStatus),
    requestAccessibility: () => invoke(Channels.systemRequestAccessibility),
    requestScreenRecording: () => invoke(Channels.systemRequestScreenRecording),
    openSettings: (target) => invoke(Channels.systemOpenSettings, target),
    about: () => invoke(Channels.systemAbout),
    onStatus: (listener) => subscribe(Channels.systemStatusChanged, listener),
  },
  windows: {
    closeSelf: () => {
      send(Channels.windowClose);
    },
    openMain: (tab) => {
      send(Channels.windowOpenMain, tab);
    },
    onNavigate: (listener) => subscribe(Channels.mainNavigate, listener),
  },
};

contextBridge.exposeInMainWorld('magwin', api);
