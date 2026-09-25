import { settingsPatchSchema, type Result } from '@magwin/core';
import { BrowserWindow } from 'electron';
import { z } from 'zod';
import { Channels } from '../../shared/channels';
import {
  captureScopeSchema,
  layoutIdSchema,
  mainTabSchema,
  moveLayoutRequestSchema,
  paletteSelectionSchema,
  renameLayoutRequestSchema,
  restoreRequestSchema,
  saveLayoutRequestSchema,
  settingsTargetSchema,
  type ActionResult,
  type CaptureResponse,
  type MainTab,
  type SaveLayoutResult,
  type SettingsTarget,
  type SettingsUpdateResult,
} from '../../shared/contracts';
import type { LayoutCaptureService } from '../application/layouts/LayoutCaptureService';
import type { LayoutLibrary } from '../application/layouts/LayoutLibrary';
import type { RestoreCoordinator } from '../application/layouts/RestoreCoordinator';
import type { PaletteController } from '../application/palette/PaletteController';
import type { SettingsService } from '../application/settings/SettingsService';
import type { SystemStatusService } from '../application/system/SystemStatusService';
import { handle, listen } from './ipcGuard';

export interface IpcServices {
  readonly palette: PaletteController;
  readonly markPaletteReady: (token: number) => void;
  readonly settings: SettingsService;
  readonly library: LayoutLibrary;
  readonly capture: LayoutCaptureService;
  readonly coordinator: RestoreCoordinator;
  readonly status: SystemStatusService;
  readonly openMain: (tab: MainTab) => void;
  readonly openSaveHud: () => void;
  readonly openSettings: (target: SettingsTarget) => Promise<void>;
}

const none = z.undefined();

function toAction(result: Result<unknown>): ActionResult {
  return result.ok ? { ok: true } : { ok: false, code: result.error.code };
}

function registerPalette(services: IpcServices): void {
  handle(Channels.paletteApply, paletteSelectionSchema, (selection) =>
    services.palette.apply(selection),
  );
  listen(Channels.paletteReady, z.number().int(), (token) => {
    services.markPaletteReady(token);
  });
  listen(Channels.paletteSelection, paletteSelectionSchema.nullable(), (selection) => {
    services.palette.selectionChanged(selection);
  });
  listen(Channels.paletteInteraction, z.boolean(), (active) => {
    services.palette.setInteracting(active);
  });
  listen(Channels.paletteDismiss, none, () => {
    services.palette.close();
  });
}

function registerSettings(services: IpcServices): void {
  handle(Channels.settingsGet, none, () => services.settings.get());
  handle(
    Channels.settingsUpdate,
    settingsPatchSchema,
    async (patch): Promise<SettingsUpdateResult> => {
      const result = await services.settings.update(patch);
      return result.ok
        ? { ok: true, settings: result.value }
        : { ok: false, code: result.error.code, message: result.error.message };
    },
  );
}

function registerLayouts(services: IpcServices): void {
  const { library, capture, coordinator } = services;
  handle(Channels.layoutsList, none, () => library.summaries());
  handle(Channels.layoutsGet, layoutIdSchema, (id) => library.get(id) ?? null);
  handle(Channels.layoutsCapture, captureScopeSchema, async (scope): Promise<CaptureResponse> => {
    const result = await capture.capture(scope);
    return result.ok ? { ok: true, ...result.value } : { ok: false, code: result.error.code };
  });
  handle(
    Channels.layoutsSave,
    saveLayoutRequestSchema,
    async (request): Promise<SaveLayoutResult> => {
      const result = await capture.commit(request);
      return result.ok
        ? { ok: true, summary: result.value }
        : { ok: false, code: result.error.code };
    },
  );
  handle(Channels.layoutsRename, renameLayoutRequestSchema, async ({ id, name }) =>
    toAction(await library.rename(id, name)),
  );
  handle(Channels.layoutsRemove, layoutIdSchema, async (id) => toAction(await library.remove(id)));
  handle(Channels.layoutsMove, moveLayoutRequestSchema, async ({ id, direction }) =>
    toAction(await library.move(id, direction)),
  );
  handle(Channels.layoutsRestore, restoreRequestSchema, async ({ id, desktopNumber }) =>
    toAction(await coordinator.restoreLayout(id, desktopNumber)),
  );
  handle(Channels.restoreUndo, none, async () => toAction(await coordinator.undo()));
}

function registerSystem(services: IpcServices): void {
  handle(Channels.systemStatus, none, () => services.status.refresh());
  handle(Channels.systemRequestAccessibility, none, () => services.status.requestAccessibility());
  handle(Channels.systemOpenSettings, settingsTargetSchema, (target) =>
    services.openSettings(target),
  );
  listen(Channels.windowOpenMain, mainTabSchema, (tab) => {
    services.openMain(tab);
  });
  listen(Channels.saveHudOpen, none, () => {
    services.openSaveHud();
  });
  listen(Channels.windowClose, none, (_input, event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}

/** Wires every allow-listed channel to the application services. */
export function registerIpc(services: IpcServices): void {
  registerPalette(services);
  registerSettings(services);
  registerLayouts(services);
  registerSystem(services);
}
