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

/**
 * Id of the one grid the user reshapes directly in the palette with its arrow buttons.
 * It never collides with `presetId()` ids, so a fixed "2x2" can live next to a custom 2 × 2.
 */
export const CUSTOM_PRESET_ID = 'custom';

export function isCustomPreset(preset: GridPreset): boolean {
  return preset.id === CUSTOM_PRESET_ID;
}

export function customPreset(cols: number, rows: number): GridPreset {
  return { id: CUSTOM_PRESET_ID, cols, rows };
}

/** Arrow buttons around the custom grid: right/down add a column/row, left/up remove one. */
export type ResizeDirection = 'up' | 'down' | 'left' | 'right';

function clampDimension(value: number): number {
  return Math.min(GRID_LIMITS.max, Math.max(GRID_LIMITS.min, value));
}

/** The grid after one arrow press, clamped to `GRID_LIMITS` (returns the same shape at a limit). */
export function resizePreset(preset: GridPreset, direction: ResizeDirection): GridPreset {
  const cols =
    direction === 'right' ? preset.cols + 1 : direction === 'left' ? preset.cols - 1 : preset.cols;
  const rows =
    direction === 'down' ? preset.rows + 1 : direction === 'up' ? preset.rows - 1 : preset.rows;
  return { ...preset, cols: clampDimension(cols), rows: clampDimension(rows) };
}

/** Whether an arrow press would change the grid, i.e. the arrow is not at a limit. */
export function canResize(preset: GridPreset, direction: ResizeDirection): boolean {
  const next = resizePreset(preset, direction);
  return next.cols !== preset.cols || next.rows !== preset.rows;
}

/** Replaces the preset with the same id, leaving the order untouched. */
export function replacePreset(
  presets: readonly GridPreset[],
  replacement: GridPreset,
): GridPreset[] {
  return presets.map((p) => (p.id === replacement.id ? replacement : p));
}

/** The presets the user listed when describing the feature; the last one is user defined. */
export const DEFAULT_PRESETS: readonly GridPreset[] = [
  preset(2, 2),
  preset(2, 3),
  preset(3, 2),
  preset(3, 3),
  customPreset(2, 2),
];
