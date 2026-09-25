import type { Point, Rect, RestoreProgress } from '@magwin/core';
import type { PaletteState } from '../../shared/contracts';

/** A display as Electron reports it, in the same global points as the helper. */
export interface ScreenDisplay {
  readonly id: number;
  readonly bounds: Rect;
  readonly workArea: Rect;
}

export interface ScreenInfo {
  cursor(): Point;
  displayNearest(point: Point): ScreenDisplay;
}

/** The floating grid palette. */
export interface PaletteView {
  /** Resolves once the renderer painted `state`, then the palette becomes visible. */
  show(state: PaletteState, bounds: Rect): Promise<void>;
  hide(): void;
}

/** Translucent preview of where the window will go. */
export interface GhostView {
  show(display: ScreenDisplay, frame: Rect): void;
  hide(): void;
}

/** The restore progress HUD. */
export interface RestoreProgressView {
  open(): void;
  publish(progress: RestoreProgress): void;
}
