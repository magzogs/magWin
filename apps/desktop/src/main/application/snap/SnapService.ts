import {
  appError,
  err,
  isRangeWithin,
  rangeToFrame,
  type CellRange,
  type GridPreset,
  type Rect,
  type Result,
} from '@magwin/core';
import type { WindowMover, WindowRef } from '../../domain/ports';

export interface SnapRequest {
  readonly target: WindowRef;
  readonly preset: GridPreset;
  readonly range: CellRange;
  /** Work area of the display the grid represents. */
  readonly workArea: Rect;
  readonly gapPx: number;
}

/** Places a window on a block of grid cells (feature 1). */
export class SnapService {
  constructor(private readonly mover: WindowMover) {}

  frameFor(request: SnapRequest): Rect {
    return rangeToFrame(request.workArea, request.preset, request.range, request.gapPx);
  }

  async apply(request: SnapRequest): Promise<Result<Rect>> {
    if (!isRangeWithin(request.range, request.preset)) {
      return err(appError('invalidRange', 'Selection is outside the grid'));
    }
    const moved = await this.mover.setFrame(request.target, this.frameFor(request));
    if (moved.ok) {
      // Bring the snapped window forward; failure here is cosmetic.
      await this.mover.focus(request.target);
    }
    return moved;
  }
}
