import { EDGES, type AppSettings } from '@magwin/core';
import { app, session } from 'electron';
import { join } from 'node:path';
import { Channels } from '../shared/channels';
import type { MainTab } from '../shared/contracts';
import { LayoutCaptureService } from './application/layouts/LayoutCaptureService';
import { LayoutLibrary } from './application/layouts/LayoutLibrary';
import { LayoutRestoreService } from './application/layouts/LayoutRestoreService';
import { RestoreCoordinator } from './application/layouts/RestoreCoordinator';
import { WindowWaiter } from './application/layouts/WindowWaiter';
import { PaletteController } from './application/palette/PaletteController';
import { SettingsService } from './application/settings/SettingsService';
import { SnapService } from './application/snap/SnapService';
import { SystemStatusService } from './application/system/SystemStatusService';
import type { EdgeTriggerConfig, Logger } from './domain/ports';
import { createHelperServices, type HelperServices } from './helperServices';
import { MainWindow, ProgressHudWindow, SaveHudWindow } from './infrastructure/electron/AppWindows';
import { GhostWindow, PaletteWindow } from './infrastructure/electron/OverlayWindows';
import {
  appInfo,
  ElectronScreen,
  GlobalShortcuts,
  openSystemSettings,
  syncLoginItem,
  TrayController,
} from './infrastructure/electron/SystemIntegration';
import type { TrayModel } from './infrastructure/electron/trayMenu';
import { broadcast, DockPresence, helperBinaryPath } from './infrastructure/electron/views';
import {
  FileLayoutRepository,
  FileSettingsRepository,
} from './infrastructure/persistence/FileRepositories';
import {
  ConsoleLogger,
  SystemClock,
  TimerScheduler,
  UuidGenerator,
} from './infrastructure/system/NodeSystem';
import { registerIpc } from './ipc/registerIpc';

export interface AppRuntime {
  openMain(tab: MainTab): void;
  stop(): void;
}

export function triggerConfig(settings: AppSettings): EdgeTriggerConfig {
  const { trigger } = settings;
  return {
    enabled: trigger.enabled,
    edges: EDGES.filter((edge) => trigger.edges[edge]),
    dwellMs: trigger.dwellMs,
    bandPx: trigger.bandPx,
    modifier: trigger.modifier,
  };
}

interface Services {
  readonly logger: Logger;
  readonly helper: HelperServices;
  readonly settings: SettingsService;
  readonly library: LayoutLibrary;
  readonly status: SystemStatusService;
  readonly palette: PaletteController;
  readonly paletteWindow: PaletteWindow;
  readonly capture: LayoutCaptureService;
  readonly coordinator: RestoreCoordinator;
}

/** The composition root: the only place that instantiates concrete classes. */
async function createServices(): Promise<Services> {
  const logger = new ConsoleLogger();
  const clock = new SystemClock();
  const scheduler = new TimerScheduler();
  const userData = app.getPath('userData');
  const helper = createHelperServices(helperBinaryPath(), scheduler, logger);
  const settings = new SettingsService(
    new FileSettingsRepository(join(userData, 'settings.json')),
    logger,
  );
  await settings.load();
  const library = new LayoutLibrary(
    new FileLayoutRepository(join(userData, 'layouts'), logger),
    clock,
  );
  await library.load();
  const paletteWindow = new PaletteWindow();
  const palette = new PaletteController({
    edges: helper.edges,
    palette: paletteWindow,
    ghost: new GhostWindow(),
    screen: new ElectronScreen(),
    snap: new SnapService(helper.windows),
    scheduler,
    clock,
    settings: () => settings.get(),
    updateSettings: (patch) => settings.update(patch),
    logger,
  });
  const capture = new LayoutCaptureService({
    ...helper,
    library,
    ids: new UuidGenerator(),
    clock,
    settings: () => settings.get(),
  });
  const restorer = new LayoutRestoreService({
    ...helper,
    waiter: new WindowWaiter(helper.windows, scheduler, clock),
    scheduler,
    clock,
  });
  const coordinator = new RestoreCoordinator({
    restorer,
    capture,
    library,
    view: new ProgressHudWindow(),
    settings: () => settings.get(),
    logger,
  });
  const status = new SystemStatusService({ ...helper, scheduler, logger });
  return {
    logger,
    helper,
    settings,
    library,
    status,
    palette,
    paletteWindow,
    capture,
    coordinator,
  };
}

interface Ui {
  readonly main: MainWindow;
  readonly saveHud: SaveHudWindow;
  readonly tray: TrayController;
  readonly shortcuts: GlobalShortcuts;
  readonly model: () => TrayModel;
}

function createUi(services: Services): Ui {
  const dock = new DockPresence();
  const main = new MainWindow(dock);
  const saveHud = new SaveHudWindow(dock);
  const restore = (id: string, desktopNumber: number | null): void => {
    void services.coordinator.restoreLayout(id, desktopNumber);
  };
  const tray = new TrayController({
    saveLayout: () => {
      saveHud.open();
    },
    restore,
    undo: () => {
      void services.coordinator.undo();
    },
    openMain: (tab) => {
      main.open(tab);
    },
    setEdgeSnap: (enabled) => {
      void services.settings.update({ trigger: { enabled } });
    },
    quit: () => {
      app.quit();
    },
  });
  const shortcuts = new GlobalShortcuts(
    {
      saveLayout: () => {
        saveHud.open();
      },
      restoreSlot: (index) => {
        void services.coordinator.restoreSlot(index);
      },
    },
    services.logger,
  );
  const model = (): TrayModel => {
    const settings = services.settings.get();
    return {
      layouts: services.library.summaries(),
      status: services.status.current(),
      edgeSnapEnabled: settings.trigger.enabled,
      hotkeysEnabled: settings.layouts.hotkeysEnabled,
    };
  };
  return { main, saveHud, tray, shortcuts, model };
}

function wire(services: Services, ui: Ui): void {
  const { helper, settings, library, status, coordinator } = services;
  let onboardingShown = false;
  helper.connection.onState(({ state, message }) => {
    status.setHelperState(state, message);
    if (state !== 'ready') {
      return;
    }
    void helper.edges.configure(triggerConfig(settings.get()));
    void status.refresh().then((current) => {
      if (!current.accessibility && !onboardingShown) {
        onboardingShown = true;
        ui.main.open('status');
      }
    });
  });
  helper.edges.onBlocked(() => {
    status.accessibilityLost();
  });
  settings.onChange((next) => {
    void helper.edges.configure(triggerConfig(next));
    ui.shortcuts.apply(next.layouts.hotkeysEnabled);
    syncLoginItem(next.general.launchAtLogin);
    broadcast(Channels.settingsChanged, next);
    ui.tray.update(ui.model());
  });
  library.onChange((summaries) => {
    broadcast(Channels.layoutsChanged, summaries);
    ui.tray.update(ui.model());
  });
  coordinator.onChange((state) => {
    status.setRestoreState(state.restoring, state.canUndo);
  });
  status.onChange((next) => {
    broadcast(Channels.systemStatusChanged, next);
    ui.tray.update(ui.model());
  });
}

export async function bootstrap(): Promise<AppRuntime> {
  // The renderer never needs camera, microphone, notifications or similar.
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  const services = await createServices();
  const ui = createUi(services);
  registerIpc({
    palette: services.palette,
    markPaletteReady: (token) => {
      services.paletteWindow.markReady(token);
    },
    settings: services.settings,
    library: services.library,
    capture: services.capture,
    coordinator: services.coordinator,
    status: services.status,
    openMain: (tab) => {
      ui.main.open(tab);
    },
    openSaveHud: () => {
      ui.saveHud.open();
    },
    openSettings: openSystemSettings,
    about: appInfo,
  });
  wire(services, ui);
  services.palette.start();
  ui.tray.start(ui.model());
  ui.shortcuts.apply(services.settings.get().layouts.hotkeysEnabled);
  syncLoginItem(services.settings.get().general.launchAtLogin);
  services.helper.connection.start();
  return {
    openMain: (tab) => {
      ui.main.open(tab);
    },
    stop: () => {
      services.palette.stop();
      services.status.stop();
      services.helper.connection.stop();
      ui.tray.destroy();
    },
  };
}
