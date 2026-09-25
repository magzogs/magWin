import {
  appError,
  err,
  ok,
  type AppSettings,
  type DisplayInfo,
  type Layout,
  type LiveWindow,
  type Point,
  type Rect,
  type Result,
  type RunningApp,
  type SavedApp,
  type SpaceTopology,
} from '@magwin/core';
import type { HotkeySummary, PaletteState } from '../../../shared/contracts';
import type {
  AppCatalog,
  AppLauncher,
  Cancel,
  Clock,
  DesktopNavigator,
  DisplayCatalog,
  EdgeHover,
  EdgeHoverSource,
  EdgeTriggerConfig,
  IdGenerator,
  LayoutRepository,
  Logger,
  PermissionGate,
  PermissionStatus,
  Scheduler,
  SettingsRepository,
  ShortcutInspector,
  Unsubscribe,
  WindowMover,
  WindowQuery,
  WindowRef,
  WindowScope,
} from '../../domain/ports';
import type { GhostView, PaletteView, ScreenDisplay, ScreenInfo } from '../../domain/ui';

export class FakeClock implements Clock {
  constructor(public time = 1_000) {}
  now(): number {
    return this.time;
  }
  isoNow(): string {
    return new Date(this.time).toISOString();
  }
}

interface Timer {
  at: number;
  every: number | null;
  callback: () => void;
  cancelled: boolean;
}

/** Deterministic timers driven by {@link FakeClock}; `sleep` advances time immediately. */
export class FakeScheduler implements Scheduler {
  private timers: Timer[] = [];
  constructor(private readonly clock: FakeClock) {}

  setTimeout(callback: () => void, ms: number): Cancel {
    return this.add({ at: this.clock.time + ms, every: null, callback, cancelled: false });
  }
  setInterval(callback: () => void, ms: number): Cancel {
    return this.add({ at: this.clock.time + ms, every: ms, callback, cancelled: false });
  }
  sleep(ms: number): Promise<void> {
    this.clock.time += ms;
    return Promise.resolve();
  }
  /** Moves time forward, firing due timers in order. */
  advance(ms: number): void {
    const end = this.clock.time + ms;
    for (;;) {
      const next = this.timers
        .filter((t) => !t.cancelled && t.at <= end)
        .sort((a, b) => a.at - b.at)[0];
      if (next === undefined) break;
      this.clock.time = next.at;
      if (next.every === null) next.cancelled = true;
      else next.at += next.every;
      next.callback();
    }
    this.clock.time = end;
  }
  pending(): number {
    return this.timers.filter((t) => !t.cancelled).length;
  }
  private add(timer: Timer): Cancel {
    this.timers.push(timer);
    return () => {
      timer.cancelled = true;
    };
  }
}

export class SequentialIds implements IdGenerator {
  private counter = 0;
  next(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class MemoryLogger implements Logger {
  readonly lines: string[] = [];
  info(message: string): void {
    this.lines.push(`info ${message}`);
  }
  warn(message: string): void {
    this.lines.push(`warn ${message}`);
  }
  error(message: string): void {
    this.lines.push(`error ${message}`);
  }
}

/**
 * A tiny simulated macOS: windows live on spaces, one current space per display,
 * launching an app opens its windows on the current space.
 */
export class FakeDesktopWorld
  implements WindowQuery, WindowMover, DesktopNavigator, AppCatalog, AppLauncher, DisplayCatalog
{
  windows: LiveWindow[] = [];
  apps: RunningApp[] = [];
  readonly frames: { windowId: number; frame: Rect }[] = [];
  readonly switches: number[] = [];
  readonly launches: string[] = [];
  readonly focused: number[] = [];
  /** Windows each app opens on launch (frame only; placed on the current space). */
  readonly launchWindows = new Map<string, { title: string | null; count: number }>();
  failSwitch: string | null = null;
  failLaunch = new Set<string>();
  failMove = new Set<number>();
  private nextWindowId = 500;

  constructor(
    public topologyValue: SpaceTopology,
    public displayList: DisplayInfo[],
  ) {}

  listWindows(scope: WindowScope): Promise<Result<readonly LiveWindow[]>> {
    const current = new Set(this.topologyValue.displays.map((d) => d.currentSpaceId));
    const list = this.windows.map((w) => ({
      ...w,
      isOnScreen: w.spaceIds.some((id) => current.has(id)),
    }));
    return Promise.resolve(ok(scope === 'all' ? list : list.filter((w) => w.isOnScreen)));
  }

  setFrame(target: WindowRef, frame: Rect): Promise<Result<Rect>> {
    if (this.failMove.has(target.windowId)) {
      return Promise.resolve(err(appError('notResizable', 'fixed size')));
    }
    this.frames.push({ windowId: target.windowId, frame });
    return Promise.resolve(ok(frame));
  }

  focus(target: WindowRef): Promise<Result<void>> {
    this.focused.push(target.windowId);
    return Promise.resolve(ok(undefined));
  }

  topology(): Promise<Result<SpaceTopology>> {
    return Promise.resolve(ok(this.topologyValue));
  }

  switchTo(spaceId: number): Promise<Result<void>> {
    if (this.failSwitch !== null) {
      return Promise.resolve(err(appError(this.failSwitch, 'cannot switch')));
    }
    this.switches.push(spaceId);
    this.topologyValue = {
      displays: this.topologyValue.displays.map((d) =>
        d.spaces.some((s) => s.id === spaceId) ? { ...d, currentSpaceId: spaceId } : d,
      ),
    };
    return Promise.resolve(ok(undefined));
  }

  runningApps(): Promise<Result<readonly RunningApp[]>> {
    return Promise.resolve(ok(this.apps));
  }

  launch(app: SavedApp): Promise<Result<number>> {
    const key = app.bundleId ?? app.name;
    this.launches.push(key);
    if (this.failLaunch.has(key)) {
      return Promise.resolve(err(appError('appNotFound', 'not installed')));
    }
    const pid = 9_000 + this.launches.length;
    if (!this.apps.some((a) => a.bundleId === app.bundleId)) {
      this.apps.push({
        pid,
        bundleId: app.bundleId,
        name: app.name,
        path: app.path,
        isHidden: false,
      });
    }
    const spec = this.launchWindows.get(key) ?? { title: null, count: 1 };
    const space = this.topologyValue.displays[0]?.currentSpaceId ?? 1;
    for (let i = 0; i < spec.count; i += 1) {
      this.addWindow({
        bundleId: app.bundleId,
        appName: app.name,
        title: spec.title,
        spaceIds: [space],
        pid,
      });
    }
    return Promise.resolve(ok(pid));
  }

  displays(): Promise<Result<readonly DisplayInfo[]>> {
    return Promise.resolve(ok(this.displayList));
  }

  addWindow(partial: Partial<LiveWindow> & Pick<LiveWindow, 'appName'>): LiveWindow {
    this.nextWindowId += 1;
    const window: LiveWindow = {
      id: this.nextWindowId,
      pid: 100,
      bundleId: null,
      title: null,
      frame: { x: 10, y: 40, width: 400, height: 300 },
      isOnScreen: false,
      spaceIds: [1],
      ...partial,
    };
    this.windows.push(window);
    return window;
  }
}

export class FakeEdgeSource implements EdgeHoverSource {
  private hoverListener: ((hover: EdgeHover) => void) | null = null;
  readonly paused: boolean[] = [];
  readonly configs: EdgeTriggerConfig[] = [];

  onHover(listener: (hover: EdgeHover) => void): Unsubscribe {
    this.hoverListener = listener;
    return () => {
      this.hoverListener = null;
    };
  }
  onBlocked(): Unsubscribe {
    return () => undefined;
  }
  configure(config: EdgeTriggerConfig): Promise<Result<void>> {
    this.configs.push(config);
    return Promise.resolve(ok(undefined));
  }
  setPaused(paused: boolean): Promise<Result<void>> {
    this.paused.push(paused);
    return Promise.resolve(ok(undefined));
  }
  emit(hover: EdgeHover): void {
    this.hoverListener?.(hover);
  }
}

export class FakePaletteView implements PaletteView {
  readonly shown: { state: PaletteState; bounds: Rect }[] = [];
  hidden = 0;
  show(state: PaletteState, bounds: Rect): Promise<void> {
    this.shown.push({ state, bounds });
    return Promise.resolve();
  }
  hide(): void {
    this.hidden += 1;
  }
}

export class FakeGhostView implements GhostView {
  readonly frames: Rect[] = [];
  hidden = 0;
  show(_display: ScreenDisplay, frame: Rect): void {
    this.frames.push(frame);
  }
  hide(): void {
    this.hidden += 1;
  }
}

export class FakeScreen implements ScreenInfo {
  cursorPoint: Point = { x: 0, y: 0 };
  constructor(readonly display: ScreenDisplay) {}
  cursor(): Point {
    return this.cursorPoint;
  }
  displayNearest(): ScreenDisplay {
    return this.display;
  }
}

export class MemoryLayoutRepository implements LayoutRepository {
  readonly layouts = new Map<string, Layout>();
  order: string[] = [];
  loadAll(): Promise<Layout[]> {
    return Promise.resolve([...this.layouts.values()]);
  }
  save(layout: Layout): Promise<void> {
    this.layouts.set(layout.id, layout);
    return Promise.resolve();
  }
  remove(id: string): Promise<void> {
    this.layouts.delete(id);
    return Promise.resolve();
  }
  loadOrder(): Promise<string[]> {
    return Promise.resolve([...this.order]);
  }
  saveOrder(ids: readonly string[]): Promise<void> {
    this.order = [...ids];
    return Promise.resolve();
  }
}

export class MemorySettingsRepository implements SettingsRepository {
  saved: AppSettings[] = [];
  constructor(public raw: unknown = null) {}
  load(): Promise<unknown> {
    return Promise.resolve(this.raw);
  }
  save(settings: AppSettings): Promise<void> {
    this.saved.push(settings);
    this.raw = settings;
    return Promise.resolve();
  }
}

export class FakePermissions implements PermissionGate, ShortcutInspector {
  status_: PermissionStatus = { accessibility: false, screenRecording: false };
  requested = 0;
  hotkeys: HotkeySummary = { directDesktops: [1, 2], moveLeft: true, moveRight: true };
  status(): Promise<Result<PermissionStatus>> {
    return Promise.resolve(ok(this.status_));
  }
  requestAccessibility(): Promise<Result<PermissionStatus>> {
    this.requested += 1;
    return Promise.resolve(ok(this.status_));
  }
  missionControlHotkeys(): Promise<Result<HotkeySummary>> {
    return Promise.resolve(ok(this.hotkeys));
  }
}
