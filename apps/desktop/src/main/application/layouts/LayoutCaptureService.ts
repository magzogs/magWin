import {
  appError,
  buildCaptureDraft,
  err,
  layoutFromDraft,
  ok,
  type AppSettings,
  type CaptureDraft,
  type CaptureScope,
  type DisplayInfo,
  type Layout,
  type LayoutSummary,
  type LiveWindow,
  type Result,
  type RunningApp,
  type SpaceTopology,
} from '@magwin/core';
import type { SaveLayoutRequest } from '../../../shared/contracts';
import type {
  AppCatalog,
  Clock,
  DesktopNavigator,
  DisplayCatalog,
  IdGenerator,
  WindowQuery,
} from '../../domain/ports';
import type { LayoutLibrary } from './LayoutLibrary';

export interface LayoutCaptureDeps {
  readonly windows: WindowQuery;
  readonly desktops: DesktopNavigator;
  readonly displays: DisplayCatalog;
  readonly apps: AppCatalog;
  readonly library: LayoutLibrary;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly settings: () => AppSettings;
}

interface Environment {
  readonly windows: readonly LiveWindow[];
  readonly topology: SpaceTopology;
  readonly displays: readonly DisplayInfo[];
  readonly apps: readonly RunningApp[];
}

/** Drafts are kept briefly between "capture" (HUD opens) and "commit" (user saves). */
const MAX_DRAFTS = 3;

/** Feature 2, save side: capture the current arrangement and store it as a layout. */
export class LayoutCaptureService {
  private readonly drafts = new Map<string, CaptureDraft>();

  constructor(private readonly deps: LayoutCaptureDeps) {}

  async capture(
    scope: CaptureScope,
  ): Promise<Result<{ readonly draftId: string; readonly draft: CaptureDraft }>> {
    const env = await this.environment();
    if (!env.ok) {
      return env;
    }
    const draft = buildCaptureDraft({
      ...env.value,
      scope,
      excludedBundleIds: this.deps.settings().layouts.excludedBundleIds,
    });
    const draftId = this.deps.ids.next();
    this.drafts.set(draftId, draft);
    for (const id of [...this.drafts.keys()].slice(0, Math.max(0, this.drafts.size - MAX_DRAFTS))) {
      this.drafts.delete(id);
    }
    return ok({ draftId, draft });
  }

  async commit(request: SaveLayoutRequest): Promise<Result<LayoutSummary>> {
    const draft = this.drafts.get(request.draftId);
    if (draft === undefined) {
      return err(appError('draftExpired', 'Capture again before saving'));
    }
    const layout = layoutFromDraft(draft, {
      id: this.deps.ids.next(),
      name: request.name,
      now: this.deps.clock.isoNow(),
      includedKeys: new Set(request.includedKeys),
    });
    if (layout.windows.length === 0) {
      return err(appError('emptyLayout', 'Select at least one window'));
    }
    this.drafts.delete(request.draftId);
    return ok(await this.deps.library.add(layout));
  }

  /** Everything on every desktop, unsaved; used to undo a restore. */
  async snapshot(name: string): Promise<Result<Layout>> {
    const env = await this.environment();
    if (!env.ok) {
      return env;
    }
    const draft = buildCaptureDraft({ ...env.value, scope: 'all', excludedBundleIds: [] });
    return ok(
      layoutFromDraft(draft, {
        id: this.deps.ids.next(),
        name,
        now: this.deps.clock.isoNow(),
        includedKeys: new Set(draft.entries.map((e) => e.key)),
      }),
    );
  }

  private async environment(): Promise<Result<Environment>> {
    const [windows, topology, displays, apps] = await Promise.all([
      this.deps.windows.listWindows('all'),
      this.deps.desktops.topology(),
      this.deps.displays.displays(),
      this.deps.apps.runningApps(),
    ]);
    if (!windows.ok) return windows;
    if (!topology.ok) return topology;
    if (!displays.ok) return displays;
    if (!apps.ok) return apps;
    return ok({
      windows: windows.value,
      topology: topology.value,
      displays: displays.value,
      apps: apps.value,
    });
  }
}
