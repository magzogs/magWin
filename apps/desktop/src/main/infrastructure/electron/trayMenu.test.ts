import type { MenuItemConstructorOptions } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import type { SystemStatus } from '../../../shared/contracts';
import { rasterizeGridGlyph } from './trayIcon';
import { buildTrayMenu, type TrayActions, type TrayModel } from './trayMenu';

vi.mock('electron', () => ({}));

const readyStatus: SystemStatus = {
  helper: 'ready',
  helperMessage: null,
  accessibility: true,
  screenRecording: false,
  hotkeys: null,
  restoring: false,
  canUndo: false,
};

function actions(): TrayActions & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    saveLayout: () => calls.push('save'),
    restore: (id, desktop) => calls.push(`restore ${id} ${String(desktop)}`),
    undo: () => calls.push('undo'),
    openMain: (tab) => calls.push(`open ${tab}`),
    setEdgeSnap: (enabled) => calls.push(`edge ${String(enabled)}`),
    quit: () => calls.push('quit'),
  };
}

function model(overrides: Partial<TrayModel> = {}): TrayModel {
  return {
    layouts: [
      {
        id: 'a',
        name: 'Coding',
        createdAt: '',
        updatedAt: '',
        windowCount: 3,
        appCount: 2,
        desktopNumbers: [1, 2],
      },
    ],
    status: readyStatus,
    edgeSnapEnabled: true,
    hotkeysEnabled: true,
    ...overrides,
  };
}

function click(item: MenuItemConstructorOptions | undefined): void {
  const handler = item?.click as (() => void) | undefined;
  handler?.();
}

describe('buildTrayMenu', () => {
  it('lists layouts with full and per-desktop restore', () => {
    const a = actions();
    const menu = buildTrayMenu(model(), a);
    const layout = menu.find((item) => item.label?.startsWith('Coding'));
    const submenu = layout?.submenu as MenuItemConstructorOptions[];
    expect(submenu.map((item) => item.label ?? item.type)).toEqual([
      '전체 복원',
      'Desktop 1만 복원',
      'Desktop 2만 복원',
      'separator',
      '레이아웃 관리…',
    ]);
    expect(submenu[0]?.accelerator).toBe('Control+Alt+Command+1');
    click(submenu[0]);
    click(submenu[2]);
    expect(a.calls).toEqual(['restore a null', 'restore a 2']);
  });

  it('shows an empty state, disables undo and toggles edge snapping', () => {
    const a = actions();
    const menu = buildTrayMenu(model({ layouts: [] }), a);
    expect(
      menu.some((item) => item.label === '저장된 레이아웃이 없어요' && item.enabled === false),
    ).toBe(true);
    expect(menu.find((item) => item.label === '직전 배치로 되돌리기')?.enabled).toBe(false);
    click(menu.find((item) => item.label === '엣지 스냅 사용'));
    expect(a.calls).toEqual(['edge false']);
  });

  it('warns about missing permission first', () => {
    const menu = buildTrayMenu(
      model({ status: { ...readyStatus, accessibility: false } }),
      actions(),
    );
    expect(menu[0]?.label).toBe('⚠️ 손쉬운 사용 권한 필요');
  });

  it('blocks restores while one is running', () => {
    const menu = buildTrayMenu(
      model({ status: { ...readyStatus, restoring: true, canUndo: true } }),
      actions(),
    );
    const submenu = menu.find((item) => item.label?.startsWith('Coding'))
      ?.submenu as MenuItemConstructorOptions[];
    expect(submenu[0]?.enabled).toBe(false);
    expect(menu.find((item) => item.label === '복원 중…')?.enabled).toBe(false);
  });
});

describe('rasterizeGridGlyph', () => {
  it('draws four opaque tiles with transparent gaps', () => {
    const size = 18;
    const pixels = rasterizeGridGlyph(size);
    const alpha = (x: number, y: number) => pixels[(y * size + x) * 4 + 3];
    expect(pixels).toHaveLength(size * size * 4);
    expect(alpha(5, 5)).toBe(255);
    expect(alpha(12, 12)).toBe(255);
    expect(alpha(9, 9)).toBe(0);
    expect(alpha(0, 0)).toBe(0);
  });

  it('opens the help and support pages', () => {
    const a = actions();
    const menu = buildTrayMenu(model(), a);
    click(menu.find((item) => item.label === 'magWin 도움말…'));
    click(menu.find((item) => item.label === '지원 받기…'));
    expect(a.calls).toEqual(['open help', 'open support']);
  });
});
