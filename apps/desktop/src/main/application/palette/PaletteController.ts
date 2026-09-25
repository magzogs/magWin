import {
  computePaletteLayout,
  containsPoint,
  DEFAULT_PALETTE_METRICS,
  isRangeWithin,
  keepOpenZone,
  placePalette,
  type AppSettings,
  type GridPreset,
  type Rect,
} from '@magwin/core';
import type { ActionResult, PaletteSelection, PaletteState } from '../../../shared/contracts';
import type {
  Cancel,
  Clock,
  EdgeHover,
  EdgeHoverSource,
  Logger,
  Scheduler,
  Unsubscribe,
} from '../../domain/ports';
import type { GhostView, PaletteView, ScreenDisplay, ScreenInfo } from '../../domain/ui';
import type { SnapService } from '../snap/SnapService';

export const PALETTE_TICK_MS = 50;
/** Extra room around the palette and trigger point before the hide timer starts. */
export const KEEP_OPEN_MARGIN = 18;

export interface PaletteControllerDeps {
  readonly edges: EdgeHoverSource;
  readonly palette: PaletteView;
  readonly ghost: GhostView;
  readonly screen: ScreenInfo;
  readonly snap: SnapService;
  readonly scheduler: Scheduler;
  readonly clock: Clock;
  readonly settings: () => AppSettings;
  readonly logger: Logger;
}

interface Session {
  readonly hover: EdgeHover;
  readonly display: ScreenDisplay;
  readonly zone: Rect;
  readonly presets: readonly GridPreset[];
  readonly gapPx: number;
  lastInsideAt: number;
  interacting: boolean;
}

/**
 * Feature 1 orchestration: edge hover → palette → selection preview → apply.
 * See docs/docs/architecture/edge-detection.md and grid-selection.md.
 */
export class PaletteController {
  private session: Session | null = null;
  private token = 0;
  private stopTicker: Cancel | null = null;
  private unsubscribe: Unsubscribe | null = null;

  constructor(private readonly deps: PaletteControllerDeps) {}

  start(): void {
    this.unsubscribe = this.deps.edges.onHover((hover) => {
      void this.open(hover);
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.close();
  }

  isOpen(): boolean {
    return this.session !== null;
  }

  async open(hover: EdgeHover): Promise<void> {
    const settings = this.deps.settings();
    if (!settings.trigger.enabled || this.session !== null) {
      return;
    }
    const display = this.deps.screen.displayNearest(hover.point);
    const state = this.buildState(hover, display, settings);
    const bounds = placePalette({
      edge: hover.edge,
      point: hover.point,
      windowFrame: hover.windowFrame,
      workArea: display.workArea,
      size: state.layout.size,
    });
    this.session = {
      hover,
      display,
      zone: keepOpenZone(bounds, hover.point, KEEP_OPEN_MARGIN),
      presets: settings.grid.presets,
      gapPx: settings.grid.gapPx,
      lastInsideAt: this.deps.clock.now(),
      interacting: false,
    };
    void this.deps.edges.setPaused(true);
    this.stopTicker = this.deps.scheduler.setInterval(() => {
      this.tick();
    }, PALETTE_TICK_MS);
    await this.deps.palette.show(state, bounds);
  }

  /** Hides the palette once the cursor stayed away long enough and no drag is in progress. */
  tick(): void {
    const session = this.session;
    if (session === null || session.interacting) {
      return;
    }
    const now = this.deps.clock.now();
    if (containsPoint(session.zone, this.deps.screen.cursor())) {
      session.lastInsideAt = now;
      return;
    }
    if (now - session.lastInsideAt >= this.deps.settings().palette.hideDelayMs) {
      this.close();
    }
  }

  selectionChanged(selection: PaletteSelection | null): void {
    const session = this.session;
    if (session === null) {
      return;
    }
    const preset = selection === null ? undefined : this.presetFor(session, selection);
    if (selection === null || preset === undefined) {
      this.deps.ghost.hide();
      return;
    }
    const frame = this.deps.snap.frameFor({
      target: session.hover.target,
      preset,
      range: selection.range,
      workArea: session.display.workArea,
      gapPx: session.gapPx,
    });
    this.deps.ghost.show(session.display, frame);
  }

  setInteracting(active: boolean): void {
    if (this.session !== null) {
      this.session.interacting = active;
      this.session.lastInsideAt = this.deps.clock.now();
    }
  }

  async apply(selection: PaletteSelection): Promise<ActionResult> {
    const session = this.session;
    if (session === null) {
      return { ok: false, code: 'paletteClosed' };
    }
    const preset = this.presetFor(session, selection);
    if (preset === undefined) {
      return { ok: false, code: 'invalidRange' };
    }
    const result = await this.deps.snap.apply({
      target: session.hover.target,
      preset,
      range: selection.range,
      workArea: session.display.workArea,
      gapPx: session.gapPx,
    });
    if (!result.ok) {
      this.deps.logger.warn(`Snap failed: ${result.error.code} ${result.error.message}`);
      return { ok: false, code: result.error.code };
    }
    this.close();
    return { ok: true };
  }

  close(): void {
    if (this.session === null) {
      return;
    }
    this.session = null;
    this.stopTicker?.();
    this.stopTicker = null;
    this.deps.palette.hide();
    this.deps.ghost.hide();
    void this.deps.edges.setPaused(false);
  }

  private presetFor(session: Session, selection: PaletteSelection): GridPreset | undefined {
    const preset = session.presets.find((p) => p.id === selection.presetId);
    return preset !== undefined && isRangeWithin(selection.range, preset) ? preset : undefined;
  }

  private buildState(
    hover: EdgeHover,
    display: ScreenDisplay,
    settings: AppSettings,
  ): PaletteState {
    this.token += 1;
    const layout = computePaletteLayout({
      presets: settings.grid.presets,
      edge: hover.edge,
      aspectRatio: display.workArea.width / display.workArea.height,
      metrics: { ...DEFAULT_PALETTE_METRICS, componentWidth: settings.palette.componentWidth },
    });
    return {
      token: this.token,
      edge: hover.edge,
      layout,
      presets: settings.grid.presets,
      appName: hover.appName,
      workArea: { width: display.workArea.width, height: display.workArea.height },
      gapPx: settings.grid.gapPx,
    };
  }
}
