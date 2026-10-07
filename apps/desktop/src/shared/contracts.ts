import type {
  AppSettings,
  CaptureDraft,
  Edge,
  GridPreset,
  LayoutSummary,
  PaletteLayout,
  Rect,
  Size,
} from '@magwin/core';
import { GRID_LIMITS } from '@magwin/core';
import { z } from 'zod';

/* ------------------------------ palette ------------------------------ */

export const cellRangeSchema = z
  .object({
    top: z.number().int().min(0),
    left: z.number().int().min(0),
    bottom: z.number().int().min(0),
    right: z.number().int().min(0),
  })
  .refine((r) => r.top <= r.bottom && r.left <= r.right, { message: 'Range corners out of order' });

export const paletteSelectionSchema = z.object({
  presetId: z.string().min(1).max(20),
  range: cellRangeSchema,
});

export type PaletteSelection = z.infer<typeof paletteSelectionSchema>;

/** New shape of the palette's custom grid after an arrow press. */
export const customGridSizeSchema = z.object({
  cols: z.number().int().min(GRID_LIMITS.min).max(GRID_LIMITS.max),
  rows: z.number().int().min(GRID_LIMITS.min).max(GRID_LIMITS.max),
});

export type CustomGridSize = z.infer<typeof customGridSizeSchema>;

/** Everything the palette renderer needs for one appearance. */
export interface PaletteState {
  /** Increments on every show; the renderer echoes it back once painted. */
  readonly token: number;
  readonly edge: Edge;
  readonly layout: PaletteLayout;
  readonly presets: readonly GridPreset[];
  readonly appName: string;
  /** Size of the target display's work area, used to label the result size. */
  readonly workArea: Size;
  readonly gapPx: number;
}

/** Failure codes are translated by the renderer (see renderer/src/i18n/ko.ts). */
export type ActionResult = { readonly ok: true } | { readonly ok: false; readonly code: string };

/** Target frame in coordinates relative to the ghost window (which covers one display). */
export interface GhostState {
  readonly rect: Rect;
}

/* ------------------------------ layouts ------------------------------ */

export const captureScopeSchema = z.enum(['all', 'currentDesktop']);

export type CaptureResponse =
  | { readonly ok: true; readonly draftId: string; readonly draft: CaptureDraft }
  | { readonly ok: false; readonly code: string };

export const layoutIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9-]{1,64}$/, 'Layout ids are generated UUIDs');

const layoutNameSchema = z.string().trim().min(1).max(80);

export const saveLayoutRequestSchema = z.object({
  draftId: z.string().min(1).max(64),
  name: layoutNameSchema,
  includedKeys: z.array(z.string().max(32)).max(500),
});

export type SaveLayoutRequest = z.infer<typeof saveLayoutRequestSchema>;

export type SaveLayoutResult =
  | { readonly ok: true; readonly summary: LayoutSummary }
  | { readonly ok: false; readonly code: string };

export const renameLayoutRequestSchema = z.object({ id: layoutIdSchema, name: layoutNameSchema });
export type RenameLayoutRequest = z.infer<typeof renameLayoutRequestSchema>;

export const moveLayoutRequestSchema = z.object({
  id: layoutIdSchema,
  direction: z.enum(['up', 'down']),
});
export type MoveLayoutRequest = z.infer<typeof moveLayoutRequestSchema>;

export const restoreRequestSchema = z.object({
  id: layoutIdSchema,
  /** Restore only the windows saved on this desktop; null restores every desktop. */
  desktopNumber: z.number().int().min(1).max(64).nullable(),
});
export type RestoreRequest = z.infer<typeof restoreRequestSchema>;

/* ------------------------------ settings ------------------------------ */

export type SettingsUpdateResult =
  | { readonly ok: true; readonly settings: AppSettings }
  | { readonly ok: false; readonly code: string; readonly message: string };

/* ------------------------------ system ------------------------------ */

export interface HotkeySummary {
  /** Desktop numbers whose "Switch to Desktop N" shortcut is enabled. */
  readonly directDesktops: readonly number[];
  readonly moveLeft: boolean;
  readonly moveRight: boolean;
}

export type HelperState = 'starting' | 'ready' | 'failed';

export interface SystemStatus {
  readonly helper: HelperState;
  readonly helperMessage: string | null;
  readonly accessibility: boolean;
  readonly screenRecording: boolean;
  readonly hotkeys: HotkeySummary | null;
  readonly restoring: boolean;
  readonly canUndo: boolean;
}

export const settingsTargetSchema = z.enum([
  'accessibility',
  'screenRecording',
  'keyboardShortcuts',
]);
export type SettingsTarget = z.infer<typeof settingsTargetSchema>;

export const mainTabSchema = z.enum(['layouts', 'grid', 'status']);
export type MainTab = z.infer<typeof mainTabSchema>;
