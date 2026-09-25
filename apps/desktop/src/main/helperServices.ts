import type {
  AppCatalog,
  AppLauncher,
  DesktopNavigator,
  DisplayCatalog,
  EdgeHoverSource,
  Logger,
  PermissionGate,
  Scheduler,
  ShortcutInspector,
  WindowMover,
  WindowQuery,
} from './domain/ports';
import { HelperClient } from './infrastructure/helper/HelperClient';
import { HelperConnection } from './infrastructure/helper/HelperConnection';
import { HelperProcess } from './infrastructure/helper/HelperProcess';
import {
  HelperEdgeHoverSource,
  HelperPermissionGate,
  HelperShortcutInspector,
} from './infrastructure/helper/HelperSystemAdapters';
import {
  HelperAppService,
  HelperDesktopNavigator,
  HelperDisplayCatalog,
  HelperWindowService,
} from './infrastructure/helper/HelperWindowAdapters';

/** Every port backed by the native helper. */
export interface HelperServices {
  readonly connection: HelperConnection;
  readonly windows: WindowQuery & WindowMover;
  readonly desktops: DesktopNavigator;
  readonly displays: DisplayCatalog;
  readonly apps: AppCatalog & AppLauncher;
  readonly permissions: PermissionGate;
  readonly shortcuts: ShortcutInspector;
  readonly edges: EdgeHoverSource;
}

/** One helper process and one client shared by all adapters. */
export function createHelperServices(
  binaryPath: string,
  scheduler: Scheduler,
  logger: Logger,
): HelperServices {
  const process = new HelperProcess(binaryPath, logger);
  const client = new HelperClient(process, scheduler, logger);
  return {
    connection: new HelperConnection(binaryPath, process, client, logger),
    windows: new HelperWindowService(client),
    desktops: new HelperDesktopNavigator(client),
    displays: new HelperDisplayCatalog(client),
    apps: new HelperAppService(client),
    permissions: new HelperPermissionGate(client),
    shortcuts: new HelperShortcutInspector(client),
    edges: new HelperEdgeHoverSource(client),
  };
}
