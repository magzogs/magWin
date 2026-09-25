import { center, containsPoint, toRelative } from '../geometry/geometry';
import type { DisplayInfo, LiveWindow, RunningApp, SpaceTopology } from '../system/model';
import {
  buildDesktopCatalog,
  desktopForSpaces,
  fullscreenSpaceIds,
  type Desktop,
} from './desktops';
import {
  LAYOUT_SCHEMA_VERSION,
  type Layout,
  type SavedApp,
  type SavedDisplay,
  type SavedWindow,
} from './model';

export type CaptureScope = 'all' | 'currentDesktop';

export interface CaptureInput {
  readonly windows: readonly LiveWindow[];
  readonly topology: SpaceTopology;
  readonly displays: readonly DisplayInfo[];
  readonly apps: readonly RunningApp[];
  readonly scope: CaptureScope;
  readonly excludedBundleIds: readonly string[];
}

/** One window the user can keep or drop before saving. */
export interface CaptureEntry {
  readonly key: string;
  readonly window: SavedWindow;
  /** Initial checkbox state; apps from the exclusion list start unchecked. */
  readonly included: boolean;
}

export interface CaptureDraft {
  readonly scope: CaptureScope;
  readonly displays: readonly SavedDisplay[];
  readonly entries: readonly CaptureEntry[];
  /** Windows in full-screen spaces are not restorable and are left out. */
  readonly skippedFullscreen: number;
}

function toSavedDisplay(display: DisplayInfo): SavedDisplay {
  return {
    uuid: display.uuid,
    name: display.name,
    frame: display.frame,
    visibleFrame: display.visibleFrame,
    isMain: display.isMain,
  };
}

function displayFor(
  window: LiveWindow,
  desktop: Desktop | null,
  displays: readonly DisplayInfo[],
): DisplayInfo | undefined {
  const middle = center(window.frame);
  return (
    displays.find((d) => containsPoint(d.frame, middle)) ??
    displays.find((d) => d.uuid === desktop?.displayUuid) ??
    displays.find((d) => d.isMain) ??
    displays[0]
  );
}

function appFor(window: LiveWindow, apps: readonly RunningApp[]): SavedApp {
  const running = apps.find((a) => a.pid === window.pid);
  return {
    bundleId: running?.bundleId ?? window.bundleId,
    name: running?.name ?? window.appName,
    path: running?.path ?? null,
  };
}

function inScope(window: LiveWindow, desktop: Desktop | null, scope: CaptureScope): boolean {
  if (scope === 'all') {
    return true;
  }
  return desktop === null ? window.isOnScreen : desktop.isCurrent;
}

/** Untitled off-screen windows smaller than this are treated as helper windows (popups, find bars). */
export const MIN_UNTITLED_WINDOW = { width: 320, height: 200 } as const;

/**
 * Whether a window belongs in a layout. Windows on a visible desktop count only when they are
 * on screen (so minimised and auxiliary windows drop out). Windows on other desktops cannot be
 * inspected, so untitled small ones are assumed to be helper windows.
 */
export function isLayoutWindow(
  window: LiveWindow,
  desktop: Desktop | null,
  hiddenPids: ReadonlySet<number>,
): boolean {
  if (hiddenPids.has(window.pid)) {
    return false;
  }
  if (window.isOnScreen) {
    return true;
  }
  if (desktop === null || desktop.isCurrent) {
    return false;
  }
  return (
    window.title !== null ||
    (window.frame.width >= MIN_UNTITLED_WINDOW.width &&
      window.frame.height >= MIN_UNTITLED_WINDOW.height)
  );
}

function savedWindow(
  window: LiveWindow,
  desktop: Desktop | null,
  context: WindowContext,
): SavedWindow {
  return {
    app: context.app,
    title: window.title,
    frame: window.frame,
    relativeFrame: toRelative(window.frame, context.display.visibleFrame),
    displayUuid: context.display.uuid,
    desktop:
      desktop === null
        ? null
        : {
            number: desktop.number,
            displayUuid: desktop.displayUuid,
            indexOnDisplay: desktop.indexOnDisplay,
            spaceUuid: desktop.spaceUuid,
            spaceId: desktop.spaceId,
          },
    order: context.order,
  };
}

interface WindowContext {
  readonly app: SavedApp;
  readonly display: DisplayInfo;
  readonly order: number;
}

interface CaptureContext {
  readonly input: CaptureInput;
  readonly desktops: readonly Desktop[];
  readonly hiddenPids: ReadonlySet<number>;
  readonly excluded: ReadonlySet<string>;
}

function captureEntry(
  window: LiveWindow,
  order: number,
  context: CaptureContext,
): CaptureEntry | null {
  const { input } = context;
  const desktop = desktopForSpaces(context.desktops, window.spaceIds) ?? null;
  const display = displayFor(window, desktop, input.displays);
  if (
    display === undefined ||
    !inScope(window, desktop, input.scope) ||
    !isLayoutWindow(window, desktop, context.hiddenPids)
  ) {
    return null;
  }
  const app = appFor(window, input.apps);
  return {
    key: String(window.id),
    window: savedWindow(window, desktop, { app, display, order }),
    included: app.bundleId === null || !context.excluded.has(app.bundleId),
  };
}

/** Turns the live window list (front-to-back) into a reviewable draft. */
export function buildCaptureDraft(input: CaptureInput): CaptureDraft {
  const fullscreen = fullscreenSpaceIds(input.topology);
  const context: CaptureContext = {
    input,
    desktops: buildDesktopCatalog(input.topology),
    hiddenPids: new Set(input.apps.filter((a) => a.isHidden).map((a) => a.pid)),
    excluded: new Set(input.excludedBundleIds),
  };
  const entries: CaptureEntry[] = [];
  let skippedFullscreen = 0;
  input.windows.forEach((window, order) => {
    if (window.spaceIds.some((id) => fullscreen.has(id))) {
      skippedFullscreen += 1;
      return;
    }
    const entry = captureEntry(window, order, context);
    if (entry !== null) {
      entries.push(entry);
    }
  });
  return {
    scope: input.scope,
    displays: input.displays.map(toSavedDisplay),
    entries,
    skippedFullscreen,
  };
}

export interface LayoutMeta {
  readonly id: string;
  readonly name: string;
  /** ISO timestamp. */
  readonly now: string;
  readonly includedKeys: ReadonlySet<string>;
}

export function layoutFromDraft(draft: CaptureDraft, meta: LayoutMeta): Layout {
  const windows = draft.entries
    .filter((entry) => meta.includedKeys.has(entry.key))
    .map((entry, order) => ({ ...entry.window, order }));
  return {
    schemaVersion: LAYOUT_SCHEMA_VERSION,
    id: meta.id,
    name: meta.name,
    createdAt: meta.now,
    updatedAt: meta.now,
    displays: [...draft.displays],
    windows,
  };
}
