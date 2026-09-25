import type {
  AppSettings,
  DisplayInfo,
  Edge,
  Layout,
  LiveWindow,
  Point,
  Rect,
  Result,
  RunningApp,
  SavedApp,
  SpaceTopology,
} from '@magwin/core';
import type { HotkeySummary } from '../../shared/contracts';

/**
 * Ports: what the application layer needs from the outside world. Each interface is small
 * (interface segregation) and implemented in infrastructure/ (dependency inversion).
 * See docs/docs/architecture/overview.md.
 */

export type Unsubscribe = () => void;
export type Cancel = () => void;

export interface WindowRef {
  readonly windowId: number;
  readonly pid: number;
}

/** `current` = windows on the visible desktops; `all` = every desktop. */
export type WindowScope = 'current' | 'all';

export interface WindowQuery {
  listWindows(scope: WindowScope): Promise<Result<readonly LiveWindow[]>>;
}

export interface WindowMover {
  /** Resolves with the frame the window actually took (apps may clamp sizes). */
  setFrame(target: WindowRef, frame: Rect): Promise<Result<Rect>>;
  focus(target: WindowRef): Promise<Result<void>>;
}

export interface DesktopNavigator {
  topology(): Promise<Result<SpaceTopology>>;
  /** Makes the space visible on its display; resolves once macOS reports the switch. */
  switchTo(spaceId: number): Promise<Result<void>>;
}

export interface DisplayCatalog {
  displays(): Promise<Result<readonly DisplayInfo[]>>;
}

export interface AppCatalog {
  runningApps(): Promise<Result<readonly RunningApp[]>>;
}

export interface AppLauncher {
  /** Launches (or re-opens) the app; its new windows appear on the current desktop. */
  launch(app: SavedApp): Promise<Result<number>>;
}

export interface PermissionStatus {
  readonly accessibility: boolean;
  readonly screenRecording: boolean;
}

export interface PermissionGate {
  status(): Promise<Result<PermissionStatus>>;
  requestAccessibility(): Promise<Result<PermissionStatus>>;
}

export interface ShortcutInspector {
  missionControlHotkeys(): Promise<Result<HotkeySummary>>;
}

export interface EdgeHover {
  readonly target: WindowRef;
  readonly bundleId: string | null;
  readonly appName: string;
  readonly windowFrame: Rect;
  readonly edge: Edge;
  readonly point: Point;
}

export interface EdgeTriggerConfig {
  readonly enabled: boolean;
  readonly edges: readonly Edge[];
  readonly dwellMs: number;
  readonly bandPx: number;
  readonly modifier: AppSettings['trigger']['modifier'];
}

export interface EdgeHoverSource {
  onHover(listener: (hover: EdgeHover) => void): Unsubscribe;
  /** Fired when hovering works but snapping cannot (e.g. Accessibility not granted). */
  onBlocked(listener: (reason: string) => void): Unsubscribe;
  configure(config: EdgeTriggerConfig): Promise<Result<void>>;
  /** Paused while the palette is open so the cursor inside it never re-triggers. */
  setPaused(paused: boolean): Promise<Result<void>>;
}

export interface LayoutRepository {
  loadAll(): Promise<Layout[]>;
  save(layout: Layout): Promise<void>;
  remove(id: string): Promise<void>;
  loadOrder(): Promise<string[]>;
  saveOrder(ids: readonly string[]): Promise<void>;
}

export interface SettingsRepository {
  /** Raw stored value, or null when nothing was saved yet. */
  load(): Promise<unknown>;
  save(settings: AppSettings): Promise<void>;
}

export interface Clock {
  now(): number;
  isoNow(): string;
}

export interface Scheduler {
  setTimeout(callback: () => void, ms: number): Cancel;
  setInterval(callback: () => void, ms: number): Cancel;
  sleep(ms: number): Promise<void>;
}

export interface IdGenerator {
  next(): string;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
