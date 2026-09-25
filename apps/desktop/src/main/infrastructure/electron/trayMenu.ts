import type { LayoutSummary } from '@magwin/core';
import type { MenuItemConstructorOptions } from 'electron';
import type { MainTab, SystemStatus } from '../../../shared/contracts';

export interface TrayModel {
  readonly layouts: readonly LayoutSummary[];
  readonly status: SystemStatus;
  readonly edgeSnapEnabled: boolean;
  readonly hotkeysEnabled: boolean;
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
    label: `Desktop ${number}만 복원`,
    enabled: !busy,
    click: () => {
      actions.restore(layout.id, number);
    },
  }));
  return {
    label: `${layout.name}  ·  창 ${layout.windowCount}개`,
    submenu: [
      {
        label: '전체 복원',
        enabled: !busy,
        ...(hotkey === undefined ? {} : { accelerator: hotkey, registerAccelerator: false }),
        click: () => {
          actions.restore(layout.id, null);
        },
      },
      ...(perDesktop.length > 1 ? perDesktop : []),
      { type: 'separator' },
      {
        label: '레이아웃 관리…',
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
        label: '⚠️ 네이티브 도우미 오류 — 상태 보기',
        click: () => {
          actions.openMain('status');
        },
      },
    ];
  }
  if (status.helper === 'ready' && !status.accessibility) {
    return [
      {
        label: '⚠️ 손쉬운 사용 권한 필요',
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
      label: '현재 레이아웃 저장…',
      ...(model.hotkeysEnabled
        ? { accelerator: 'Control+Alt+Command+S', registerAccelerator: false }
        : {}),
      click: () => {
        actions.saveLayout();
      },
    },
    { type: 'separator' },
    ...(layouts.length === 0
      ? [{ label: '저장된 레이아웃이 없어요', enabled: false }]
      : layouts.map((layout, index) => layoutItem(layout, index, model, actions))),
    { type: 'separator' },
    {
      label: model.status.restoring ? '복원 중…' : '직전 배치로 되돌리기',
      enabled: model.status.canUndo && !model.status.restoring,
      click: () => {
        actions.undo();
      },
    },
    { type: 'separator' },
    {
      label: '엣지 스냅 사용',
      type: 'checkbox',
      checked: model.edgeSnapEnabled,
      click: () => {
        actions.setEdgeSnap(!model.edgeSnapEnabled);
      },
    },
    {
      label: '레이아웃 관리…',
      click: () => {
        actions.openMain('layouts');
      },
    },
    {
      label: '그리드 설정…',
      click: () => {
        actions.openMain('grid');
      },
    },
    {
      label: '권한 및 상태…',
      click: () => {
        actions.openMain('status');
      },
    },
    { type: 'separator' },
    {
      label: 'magWin 종료',
      accelerator: 'Command+Q',
      click: () => {
        actions.quit();
      },
    },
  ];
}
