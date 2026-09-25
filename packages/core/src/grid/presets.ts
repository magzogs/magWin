import { appError, err, ok, type Result } from '../result';

/**
 * A grid shown as one component in the edge palette.
 * `cols` x `rows` — "3x2" means three columns across and two rows down.
 */
export interface GridPreset {
  readonly id: string;
  readonly cols: number;
  readonly rows: number;
}

export const GRID_LIMITS = { min: 1, max: 8 } as const;

export function presetId(cols: number, rows: number): string {
  return `${cols}x${rows}`;
}

export function presetLabel(preset: GridPreset): string {
  return presetId(preset.cols, preset.rows);
}

function isValidDimension(value: number): boolean {
  return Number.isInteger(value) && value >= GRID_LIMITS.min && value <= GRID_LIMITS.max;
}

export function createPreset(cols: number, rows: number): Result<GridPreset> {
  if (!isValidDimension(cols) || !isValidDimension(rows)) {
    return err(
      appError(
        'invalidPreset',
        `Grid must be ${GRID_LIMITS.min}-${GRID_LIMITS.max} columns and rows, got ${cols}x${rows}`,
      ),
    );
  }
  return ok({ id: presetId(cols, rows), cols, rows });
}

function preset(cols: number, rows: number): GridPreset {
  return { id: presetId(cols, rows), cols, rows };
}

/** The presets the user listed when describing the feature. */
export const DEFAULT_PRESETS: readonly GridPreset[] = [
  preset(2, 2),
  preset(2, 3),
  preset(3, 2),
  preset(3, 3),
  preset(4, 4),
];
