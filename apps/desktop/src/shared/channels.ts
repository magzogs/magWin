/**
 * IPC channel allowlist. The preload exposes exactly these channels; the main process validates
 * every renderer payload with the schemas in contracts.ts. No dependencies so the sandboxed
 * preload stays tiny.
 */
export const Channels = {
  // renderer → main, request/response
  paletteApply: 'palette:apply',
  paletteResizeCustom: 'palette:resize-custom',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  layoutsList: 'layouts:list',
  layoutsGet: 'layouts:get',
  layoutsCapture: 'layouts:capture',
  layoutsSave: 'layouts:save',
  layoutsRename: 'layouts:rename',
  layoutsRemove: 'layouts:remove',
  layoutsMove: 'layouts:move',
  layoutsRestore: 'layouts:restore',
  restoreUndo: 'restore:undo',
  systemStatus: 'system:status',
  systemRequestAccessibility: 'system:request-accessibility',
  systemRequestScreenRecording: 'system:request-screen-recording',
  systemOpenSettings: 'system:open-settings',
  systemAbout: 'system:about',
  // renderer → main, fire and forget
  paletteReady: 'palette:ready',
  paletteSelection: 'palette:selection',
  paletteInteraction: 'palette:interaction',
  paletteDismiss: 'palette:dismiss',
  windowClose: 'window:close',
  windowOpenMain: 'window:open-main',
  saveHudOpen: 'save-hud:open',
  // main → renderer events
  paletteState: 'palette:state',
  ghostState: 'ghost:state',
  settingsChanged: 'settings:changed',
  layoutsChanged: 'layouts:changed',
  restoreProgress: 'restore:progress',
  systemStatusChanged: 'system:status-changed',
  mainNavigate: 'main:navigate',
} as const;

export type Channel = (typeof Channels)[keyof typeof Channels];
