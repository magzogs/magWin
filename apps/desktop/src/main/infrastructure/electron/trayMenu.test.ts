import type { MenuItemConstructorOptions } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import type { SystemStatus } from '../../../shared/contracts';
import { en } from '../../../shared/i18n/en';
import { ko } from '../../../shared/i18n/ko';
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
    setLanguage: (language) => calls.push(`language ${language}`),
    checkForUpdates: () => calls.push('check updates'),
    installUpdate: () => calls.push('install update'),
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
    language: 'system',
    update: { kind: 'idle' },
    text: ko.tray,
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

describe('buildTrayMenu update entry', () => {
  const updateLabels = (update: TrayModel['update']): (string | undefined)[] => {
    const menu = buildTrayMenu(model({ update }), actions());
    const support = menu.findIndex((item) => item.label === '지원 받기…');
    return menu.slice(support + 1, support + 2).map((item) => item.label ?? item.type);
  };

  it('is hidden in development runs', () => {
    expect(updateLabels({ kind: 'unsupported' })).toEqual(['separator']);
  });

  it('follows the update state', () => {
    expect(updateLabels({ kind: 'idle' })).toEqual(['업데이트 확인…']);
    expect(updateLabels({ kind: 'checking' })).toEqual(['업데이트 확인 중…']);
    expect(updateLabels({ kind: 'upToDate' })).toEqual(['최신 버전 사용 중 — 다시 확인']);
    expect(updateLabels({ kind: 'failed' })).toEqual(['⚠️ 업데이트 확인 실패 — 다시 시도']);
    expect(updateLabels({ kind: 'downloading', version: '1.2.0' })).toEqual([
      'v1.2.0 내려받는 중…',
    ]);
    expect(updateLabels({ kind: 'ready', version: '1.2.0' })).toEqual([
      '재시작해서 업데이트 (v1.2.0)',
    ]);
  });

  it('checks again, waits while busy and installs a downloaded update', () => {
    const a = actions();
    click(
      buildTrayMenu(model({ update: { kind: 'upToDate' } }), a).find((item) =>
        item.label?.startsWith('최신 버전'),
      ),
    );
    const busy = buildTrayMenu(model({ update: { kind: 'checking' } }), a).find(
      (item) => item.label === '업데이트 확인 중…',
    );
    expect(busy?.enabled).toBe(false);
    click(
      buildTrayMenu(model({ update: { kind: 'ready', version: '1.2.0' } }), a).find((item) =>
        item.label?.startsWith('재시작'),
      ),
    );
    expect(a.calls).toEqual(['check updates', 'install update']);
  });

  it('uses the English text', () => {
    const menu = buildTrayMenu(
      model({ text: en.tray, update: { kind: 'ready', version: '1.2.0' } }),
      actions(),
    );
    expect(menu.map((item) => item.label)).toContain('Restart to update (v1.2.0)');
  });
});

describe('rasterizeGridGlyph', () => {
  it('draws the logo: one opaque large tile and translucent small tiles', () => {
    const size = 36;
    const pixels = rasterizeGridGlyph(size);
    const alpha = (x: number, y: number) => pixels[(y * size + x) * 4 + 3];
    expect(pixels).toHaveLength(size * size * 4);
    // Large tile (top left).
    expect(alpha(11, 11)).toBe(255);
    // Small tiles at 35% (right column and bottom row).
    expect(alpha(29, 6)).toBe(89);
    expect(alpha(6, 29)).toBe(89);
    expect(alpha(29, 29)).toBe(89);
    // Corner outside the tiles and the gap between the large tile and the right column.
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(24, 11)).toBe(0);
  });

  it('opens the help and support pages', () => {
    const a = actions();
    const menu = buildTrayMenu(model(), a);
    click(menu.find((item) => item.label === 'OrgaWin 도움말…'));
    click(menu.find((item) => item.label === '지원 받기…'));
    expect(a.calls).toEqual(['open help', 'open support']);
  });

  it('uses the text of the resolved language', () => {
    const menu = buildTrayMenu(model({ text: en.tray }), actions());
    const labels = menu.map((item) => item.label);
    expect(labels).toContain('Save current layout…');
    expect(labels).toContain('Coding  ·  3 windows');
    expect(labels).toContain('Quit OrgaWin');
  });

  it('switches the language from a radio submenu', () => {
    const a = actions();
    const menu = buildTrayMenu(model({ language: 'ko' }), a);
    const item = menu.find((entry) => entry.label === '🌐 언어');
    const submenu = item?.submenu as MenuItemConstructorOptions[];
    expect(submenu.map((entry) => [entry.label, entry.type, entry.checked])).toEqual([
      ['시스템 설정 따르기', 'radio', false],
      ['English', 'radio', false],
      ['한국어', 'radio', true],
    ]);
    click(submenu[1]);
    click(submenu[2]);
    expect(a.calls).toEqual(['language en']);
  });
});
