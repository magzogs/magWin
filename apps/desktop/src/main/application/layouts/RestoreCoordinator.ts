import {
  appError,
  err,
  ok,
  type AppSettings,
  type Layout,
  type RestoreReport,
  type Result,
} from '@magwin/core';
import type { Logger, Unsubscribe } from '../../domain/ports';
import type { RestoreProgressView } from '../../domain/ui';
import { Emitter } from '../../domain/Emitter';
import type { LayoutCaptureService } from './LayoutCaptureService';
import type { LayoutLibrary } from './LayoutLibrary';
import type { LayoutRestoreService, RestoreOptions } from './LayoutRestoreService';

export interface RestoreCoordinatorDeps {
  readonly restorer: LayoutRestoreService;
  readonly capture: LayoutCaptureService;
  readonly library: LayoutLibrary;
  readonly view: RestoreProgressView;
  readonly settings: () => AppSettings;
  readonly logger: Logger;
}

export interface RestoreState {
  readonly restoring: boolean;
  readonly canUndo: boolean;
}

/**
 * Runs one restore at a time, shows progress, and remembers the arrangement from just before
 * the last restore so it can be undone.
 */
export class RestoreCoordinator {
  private restoring = false;
  private undoLayout: Layout | null = null;
  private readonly changes = new Emitter<RestoreState>();

  constructor(private readonly deps: RestoreCoordinatorDeps) {}

  state(): RestoreState {
    return { restoring: this.restoring, canUndo: this.undoLayout !== null };
  }

  onChange(listener: (state: RestoreState) => void): Unsubscribe {
    return this.changes.subscribe(listener);
  }

  async restoreLayout(id: string, desktopNumber: number | null): Promise<Result<RestoreReport>> {
    const layout = this.deps.library.get(id);
    if (layout === undefined) {
      return err(appError('layoutNotFound', `No layout ${id}`));
    }
    const options: RestoreOptions = {
      desktopNumber,
      launchMissingApps: this.deps.settings().layouts.launchMissingApps,
    };
    return this.run(layout, options, true);
  }

  async restoreSlot(index: number): Promise<Result<RestoreReport>> {
    const layout = this.deps.library.atSlot(index);
    return layout === undefined
      ? err(appError('layoutNotFound', `No layout in slot ${index + 1}`))
      : this.restoreLayout(layout.id, null);
  }

  /** Puts windows back where they were before the last restore (never launches apps). */
  async undo(): Promise<Result<RestoreReport>> {
    if (this.undoLayout === null) {
      return err(appError('nothingToUndo', 'No restore to undo'));
    }
    return this.run(this.undoLayout, { desktopNumber: null, launchMissingApps: false }, false);
  }

  private async run(
    layout: Layout,
    options: RestoreOptions,
    rememberUndo: boolean,
  ): Promise<Result<RestoreReport>> {
    if (this.restoring) {
      return err(appError('restoreInProgress', 'A restore is already running'));
    }
    this.restoring = true;
    this.notify();
    try {
      if (rememberUndo) {
        const snapshot = await this.deps.capture.snapshot('Before restore');
        this.undoLayout = snapshot.ok ? snapshot.value : this.undoLayout;
      }
      this.deps.view.open();
      const report = await this.deps.restorer.restore(layout, options, (progress) => {
        this.deps.view.publish(progress);
      });
      this.deps.logger.info(
        `Restored "${layout.name}": ${report.placed}/${report.total} windows, ${report.issues.length} issues`,
      );
      return ok(report);
    } finally {
      this.restoring = false;
      this.notify();
    }
  }

  private notify(): void {
    this.changes.emit(this.state());
  }
}
