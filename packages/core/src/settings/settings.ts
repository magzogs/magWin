import { z } from 'zod';
import { DEFAULT_PRESETS, GRID_LIMITS } from '../grid/presets';
import { DEFAULT_PALETTE_METRICS } from '../palette/layout';
import { appError, err, ok, type Result } from '../result';

export const modifierSchema = z.enum(['none', 'option', 'control', 'command', 'shift']);
export type TriggerModifier = z.infer<typeof modifierSchema>;

export const gridPresetSchema = z.object({
  id: z.string().min(1),
  cols: z.number().int().min(GRID_LIMITS.min).max(GRID_LIMITS.max),
  rows: z.number().int().min(GRID_LIMITS.min).max(GRID_LIMITS.max),
});

const gridSettingsSchema = z.object({
  presets: z
    .array(gridPresetSchema)
    .min(1)
    .max(12)
    .refine((presets) => new Set(presets.map((p) => p.id)).size === presets.length, {
      message: 'Preset ids must be unique',
    }),
  gapPx: z.number().int().min(0).max(64),
});

const triggerSettingsSchema = z.object({
  enabled: z.boolean(),
  edges: z.object({ top: z.boolean(), bottom: z.boolean(), left: z.boolean(), right: z.boolean() }),
  dwellMs: z.number().int().min(0).max(3000),
  bandPx: z.number().int().min(2).max(24),
  modifier: modifierSchema,
});

const paletteSettingsSchema = z.object({
  componentWidth: z.number().int().min(64).max(200),
  hideDelayMs: z.number().int().min(100).max(3000),
});

const layoutSettingsSchema = z.object({
  launchMissingApps: z.boolean(),
  hotkeysEnabled: z.boolean(),
  excludedBundleIds: z.array(z.string().min(1)).max(200),
});

const generalSettingsSchema = z.object({
  launchAtLogin: z.boolean(),
});

export const settingsSchema = z.object({
  schemaVersion: z.literal(1),
  grid: gridSettingsSchema,
  trigger: triggerSettingsSchema,
  palette: paletteSettingsSchema,
  layouts: layoutSettingsSchema,
  general: generalSettingsSchema,
});

export type AppSettings = z.infer<typeof settingsSchema>;

export const settingsPatchSchema = z.object({
  grid: gridSettingsSchema.partial().optional(),
  trigger: triggerSettingsSchema.partial().optional(),
  palette: paletteSettingsSchema.partial().optional(),
  layouts: layoutSettingsSchema.partial().optional(),
  general: generalSettingsSchema.partial().optional(),
});

/** One level deep partial update, e.g. `{ trigger: { dwellMs: 500 } }`. */
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 1,
  grid: { presets: DEFAULT_PRESETS.map((p) => ({ ...p })), gapPx: 0 },
  trigger: {
    enabled: true,
    edges: { top: true, bottom: true, left: true, right: true },
    dwellMs: 350,
    bandPx: 5,
    modifier: 'none',
  },
  palette: {
    componentWidth: DEFAULT_PALETTE_METRICS.componentWidth,
    hideDelayMs: 450,
  },
  layouts: { launchMissingApps: true, hotkeysEnabled: true, excludedBundleIds: [] },
  general: { launchAtLogin: false },
};

type SectionKey = Exclude<keyof AppSettings, 'schemaVersion'>;
const SECTION_KEYS: readonly SectionKey[] = ['grid', 'trigger', 'palette', 'layouts', 'general'];

function sectionOrDefault<K extends SectionKey>(raw: unknown, key: K): AppSettings[K] {
  const section = settingsSchema.shape[key].safeParse(
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>)[key] : undefined,
  );
  return section.success ? (section.data as AppSettings[K]) : DEFAULT_SETTINGS[key];
}

/**
 * Parses stored settings. Invalid sections fall back to defaults individually so a single
 * bad value never wipes the user's presets. `recovered` tells the caller to rewrite the file.
 */
export function parseSettings(raw: unknown): {
  readonly settings: AppSettings;
  readonly recovered: boolean;
} {
  const full = settingsSchema.safeParse(raw);
  if (full.success) {
    return { settings: full.data, recovered: false };
  }
  const settings: AppSettings = {
    schemaVersion: 1,
    grid: sectionOrDefault(raw, 'grid'),
    trigger: sectionOrDefault(raw, 'trigger'),
    palette: sectionOrDefault(raw, 'palette'),
    layouts: sectionOrDefault(raw, 'layouts'),
    general: sectionOrDefault(raw, 'general'),
  };
  return { settings, recovered: true };
}

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export function applySettingsPatch(
  current: AppSettings,
  patch: SettingsPatch,
): Result<AppSettings> {
  const merged: Record<string, unknown> = { ...current };
  for (const key of SECTION_KEYS) {
    const sectionPatch = patch[key];
    if (sectionPatch !== undefined) {
      merged[key] = { ...current[key], ...withoutUndefined(sectionPatch) };
    }
  }
  const parsed = settingsSchema.safeParse(merged);
  if (!parsed.success) {
    return err(appError('invalidSettings', z.prettifyError(parsed.error)));
  }
  return ok(parsed.data);
}
