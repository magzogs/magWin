import { appError, err, ok, type Result } from '@magwin/core';
import { app } from 'electron';
import { autoUpdater, type UpdateDownloadedEvent } from 'electron-updater';
import type { Logger, Unsubscribe, UpdateSource } from '../../domain/ports';

/**
 * electron-updater against the GitHub Releases of magzogs/orgawin (the
 * `publish` block of electron-builder.yml, baked into app-update.yml). Squirrel.Mac only installs
 * an update signed by the same Developer ID team, so a tampered release cannot be installed.
 */
export class ElectronUpdater implements UpdateSource {
  readonly supported = app.isPackaged;

  constructor(logger: Logger) {
    autoUpdater.logger = logger;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
  }

  async check(): Promise<Result<string | null>> {
    try {
      const result = await autoUpdater.checkForUpdates();
      return ok(result?.isUpdateAvailable === true ? result.updateInfo.version : null);
    } catch (error) {
      return err(appError('UPDATE_CHECK_FAILED', String(error)));
    }
  }

  onDownloaded(listener: (version: string) => void): Unsubscribe {
    const handler = (event: UpdateDownloadedEvent): void => {
      listener(event.version);
    };
    autoUpdater.on('update-downloaded', handler);
    return () => {
      autoUpdater.off('update-downloaded', handler);
    };
  }

  onFailed(listener: (message: string) => void): Unsubscribe {
    const handler = (error: Error): void => {
      listener(error.message);
    };
    autoUpdater.on('error', handler);
    return () => {
      autoUpdater.off('error', handler);
    };
  }

  installAndRestart(): void {
    autoUpdater.quitAndInstall();
  }
}
