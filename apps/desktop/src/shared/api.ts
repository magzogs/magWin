import type {
  AppSettings,
  CaptureScope,
  Layout,
  LayoutSummary,
  RestoreProgress,
  SettingsPatch,
} from '@magwin/core';
import type {
  ActionResult,
  AppInfo,
  CaptureResponse,
  CustomGridSize,
  GhostState,
  MainTab,
  MoveLayoutRequest,
  PaletteSelection,
  PaletteState,
  RenameLayoutRequest,
  RestoreRequest,
  SaveLayoutRequest,
  SaveLayoutResult,
  SettingsTarget,
  SettingsUpdateResult,
  SystemStatus,
} from './contracts';

export type Unsubscribe = () => void;
type Listen<T> = (listener: (value: T) => void) => Unsubscribe;

/**
 * The only surface the renderer sees, exposed by the preload as `window.magwin`.
 * Members are plain functions (no `this`), so they can be passed around freely.
 */
export interface MagWinApi {
  readonly palette: {
    readonly onState: Listen<PaletteState>;
    readonly ready: (token: number) => void;
    readonly selectionChanged: (selection: PaletteSelection | null) => void;
    readonly interaction: (active: boolean) => void;
    readonly apply: (selection: PaletteSelection) => Promise<ActionResult>;
    readonly resizeCustom: (size: CustomGridSize) => Promise<ActionResult>;
    readonly dismiss: () => void;
  };
  readonly ghost: {
    readonly onState: Listen<GhostState | null>;
  };
  readonly settings: {
    readonly get: () => Promise<AppSettings>;
    readonly update: (patch: SettingsPatch) => Promise<SettingsUpdateResult>;
    readonly onChanged: Listen<AppSettings>;
  };
  readonly layouts: {
    readonly list: () => Promise<LayoutSummary[]>;
    readonly get: (id: string) => Promise<Layout | null>;
    readonly capture: (scope: CaptureScope) => Promise<CaptureResponse>;
    readonly save: (request: SaveLayoutRequest) => Promise<SaveLayoutResult>;
    readonly rename: (request: RenameLayoutRequest) => Promise<ActionResult>;
    readonly remove: (id: string) => Promise<ActionResult>;
    readonly move: (request: MoveLayoutRequest) => Promise<ActionResult>;
    readonly restore: (request: RestoreRequest) => Promise<ActionResult>;
    readonly undoRestore: () => Promise<ActionResult>;
    readonly openSaveHud: () => void;
    readonly onChanged: Listen<LayoutSummary[]>;
    readonly onProgress: Listen<RestoreProgress>;
  };
  readonly system: {
    readonly status: () => Promise<SystemStatus>;
    readonly requestAccessibility: () => Promise<SystemStatus>;
    readonly requestScreenRecording: () => Promise<SystemStatus>;
    readonly openSettings: (target: SettingsTarget) => Promise<void>;
    readonly about: () => Promise<AppInfo>;
    readonly onStatus: Listen<SystemStatus>;
  };
  readonly windows: {
    readonly closeSelf: () => void;
    readonly openMain: (tab: MainTab) => void;
    readonly onNavigate: Listen<MainTab>;
  };
}
