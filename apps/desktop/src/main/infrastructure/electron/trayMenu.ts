import type { LayoutSummary } from '@magwin/core';
import type { MenuItemConstructorOptions } from 'electron';
import type { MainTab, SystemStatus } from '../../../shared/contracts';
import type { Messages } from '../../../shared/i18n';

export interface TrayModel {
  readonly layouts: readonly LayoutSummary[];
  readonly status: SystemStatus;
  readonly edgeSnapEnabled: boolean;
  readonly hotkeysEnabled: boolean;
  /** Menu text in the resolved UI language. */
  readonly text: Messages['tray'];
}

export interface TrayActions {
  saveLayout(): void;
  restore(id: string, desktopNumber: number | null): void;
  undo(): void;
  openMain(tab: MainTab): void;
  setEdgeSnap(enabled: boolean): void;
  quit(): void;
}

const SLOT_COUNT = 9;
const MAX_LAYOUTS_IN_MENU = 20;

function layoutItem(
  layout: LayoutSummary,
  index: number,
  model: TrayModel,
  actions: TrayActions,
): MenuItemConstructorOptions {
  const busy = model.status.restoring;
  const hotkey =
    model.hotkeysEnabled && index < SLOT_COUNT ? `Control+Alt+Command+${index + 1}` : undefined;
  const perDesktop = layout.desktopNumbers.map((number): MenuItemConstructorOptions => ({
    label: model.text.restoreDesktop(number),
    enabled: !busy,
    click: () => {
      actions.restore(layout.id, number);
    },
  }));
  return {
    label: model.text.layoutItem(layout.name, layout.windowCount),
    submenu: [
      {
        label: model.text.restoreAll,
        enabled: !busy,
        ...(hotkey === undefined ? {} : { accelerator: hotkey, registerAccelerator: false }),
        click: () => {
          actions.restore(layout.id, null);
        },
      },
      ...(perDesktop.length > 1 ? perDesktop : []),
      { type: 'separator' },
      {
        label: model.text.manageLayouts,
        click: () => {
          actions.openMain('layouts');
        },
      },
    ],
  };
}

function statusItems(model: TrayModel, actions: TrayActions): MenuItemConstructorOptions[] {
  const { status } = model;
  if (status.helper === 'failed') {
    return [
      {
        label: model.text.helperError,
        click: () => {
          actions.openMain('status');
        },
      },
    ];
  }
  if (status.helper === 'ready' && !status.accessibility) {
    return [
      {
        label: model.text.accessibilityNeeded,
        click: () => {
          actions.openMain('status');
        },
      },
    ];
  }
  return [];
}

/** Pure template builder so the menu can be unit tested without Electron. */
export function buildTrayMenu(
  model: TrayModel,
  actions: TrayActions,
): MenuItemConstructorOptions[] {
  const layouts = model.layouts.slice(0, MAX_LAYOUTS_IN_MENU);
  const warnings = statusItems(model, actions);
  return [
    ...(warnings.length > 0 ? [...warnings, { type: 'separator' as const }] : []),
    {
      label: model.text.saveLayout,
      ...(model.hotkeysEnabled
        ? { accelerator: 'Control+Alt+Command+S', registerAccelerator: false }
        : {}),
      click: () => {
        actions.saveLayout();
      },
    },
    { type: 'separator' },
    ...(layouts.length === 0
      ? [{ label: model.text.noLayouts, enabled: false }]
      : layouts.map((layout, index) => layoutItem(layout, index, model, actions))),
    { type: 'separator' },
    {
      label: model.status.restoring ? model.text.restoring : model.text.undo,
      enabled: model.status.canUndo && !model.status.restoring,
      click: () => {
        actions.undo();
      },
    },
    { type: 'separator' },
    {
      label: model.text.edgeSnap,
      type: 'checkbox',
      checked: model.edgeSnapEnabled,
      click: () => {
        actions.setEdgeSnap(!model.edgeSnapEnabled);
      },
    },
    {
      label: model.text.manageLayouts,
      click: () => {
        actions.openMain('layouts');
      },
    },
    {
      label: model.text.settings,
      click: () => {
        actions.openMain('grid');
      },
    },
    {
      label: model.text.status,
      click: () => {
        actions.openMain('status');
      },
    },
    { type: 'separator' },
    {
      label: model.text.help,
      click: () => {
        actions.openMain('help');
      },
    },
    {
      label: model.text.support,
      click: () => {
        actions.openMain('support');
      },
    },
    { type: 'separator' },
    {
      label: model.text.quit,
      accelerator: 'Command+Q',
      click: () => {
        actions.quit();
      },
    },
  ];
}
