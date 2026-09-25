import { z } from 'zod';
import type { LiveWindow, RunningApp } from '../system/model';

export const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const savedAppSchema = z.object({
  bundleId: z.string().nullable(),
  name: z.string(),
  path: z.string().nullable(),
});

/** Where a window lived when the layout was captured. */
export const savedDesktopSchema = z.object({
  number: z.number().int().min(1),
  displayUuid: z.string(),
  indexOnDisplay: z.number().int().min(1),
  spaceUuid: z.string().nullable(),
  spaceId: z.number().int(),
});

export const savedDisplaySchema = z.object({
  uuid: z.string(),
  name: z.string(),
  frame: rectSchema,
  visibleFrame: rectSchema,
  isMain: z.boolean(),
});

export const savedWindowSchema = z.object({
  app: savedAppSchema,
  title: z.string().nullable(),
  /** Absolute frame in global points. */
  frame: rectSchema,
  /** Frame relative to the display's visible frame, used when the display changed. */
  relativeFrame: rectSchema,
  displayUuid: z.string(),
  desktop: savedDesktopSchema.nullable(),
  /** Front-to-back order at capture time. */
  order: z.number().int().min(0),
});

export const LAYOUT_SCHEMA_VERSION = 1;

export const layoutSchema = z.object({
  schemaVersion: z.literal(LAYOUT_SCHEMA_VERSION),
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  createdAt: z.string(),
  updatedAt: z.string(),
  displays: z.array(savedDisplaySchema),
  windows: z.array(savedWindowSchema),
});

export type SavedApp = z.infer<typeof savedAppSchema>;
export type SavedDesktop = z.infer<typeof savedDesktopSchema>;
export type SavedDisplay = z.infer<typeof savedDisplaySchema>;
export type SavedWindow = z.infer<typeof savedWindowSchema>;
export type Layout = z.infer<typeof layoutSchema>;

export interface LayoutSummary {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly windowCount: number;
  readonly appCount: number;
  readonly desktopNumbers: readonly number[];
}

/** Identity of an application across launches: bundle id, or name when there is none. */
export function appKey(app: SavedApp): string {
  return app.bundleId ?? `name:${app.name}`;
}

/** {@link appKey} of the app owning a live window. */
export function windowAppKey(window: LiveWindow): string {
  return window.bundleId ?? `name:${window.appName}`;
}

/** {@link appKey} of a running application. */
export function runningAppKey(app: RunningApp): string {
  return app.bundleId ?? `name:${app.name}`;
}

export function layoutDesktopNumbers(layout: Layout): number[] {
  const numbers = new Set<number>();
  for (const window of layout.windows) {
    if (window.desktop !== null) {
      numbers.add(window.desktop.number);
    }
  }
  return [...numbers].sort((a, b) => a - b);
}

export function summarizeLayout(layout: Layout): LayoutSummary {
  return {
    id: layout.id,
    name: layout.name,
    createdAt: layout.createdAt,
    updatedAt: layout.updatedAt,
    windowCount: layout.windows.length,
    appCount: new Set(layout.windows.map((w) => appKey(w.app))).size,
    desktopNumbers: layoutDesktopNumbers(layout),
  };
}
