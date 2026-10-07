// @vitest-environment jsdom
import { customPreset, DEFAULT_SETTINGS, isCustomPreset } from '@magwin/core';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFakeApi, readyStatus } from '../../test/fakeApi';
import { renderWithApi } from '../../test/render';
import { GridTab } from './GridTab';
import { LayoutsTab } from './LayoutsTab';
import { ManagerApp } from './ManagerApp';
import { StatusTab } from './StatusTab';

const summary = {
  id: 'a',
  name: 'Coding',
  createdAt: '2026-09-25T10:00:00.000Z',
  updatedAt: '2026-09-25T10:00:00.000Z',
  windowCount: 3,
  appCount: 2,
  desktopNumbers: [1, 2],
};

describe('LayoutsTab', () => {
  it('shows an empty state with the save shortcut', async () => {
    const { api } = createFakeApi();
    renderWithApi(<LayoutsTab />, api);
    expect(await screen.findByText('아직 저장된 레이아웃이 없어요.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /현재 배치 저장/ }));
    expect(api.layouts.openSaveHud).toHaveBeenCalled();
  });

  it('restores everything or a single desktop', async () => {
    const { api } = createFakeApi();
    api.layouts.list.mockResolvedValue([summary]);
    renderWithApi(<LayoutsTab />, api);
    fireEvent.click(await screen.findByRole('button', { name: '전체 복원' }));
    fireEvent.click(screen.getByRole('button', { name: 'Desktop 2' }));
    expect(api.layouts.restore).toHaveBeenNthCalledWith(1, { id: 'a', desktopNumber: null });
    expect(api.layouts.restore).toHaveBeenNthCalledWith(2, { id: 'a', desktopNumber: 2 });
    expect(screen.getByText('⌃⌥⌘1')).toBeInTheDocument();
  });

  it('reports failures and follows live updates', async () => {
    const { api, channels } = createFakeApi();
    api.layouts.list.mockResolvedValue([summary]);
    api.layouts.restore.mockResolvedValue({ ok: false, code: 'restoreInProgress' });
    renderWithApi(<LayoutsTab />, api);
    fireEvent.click(await screen.findByRole('button', { name: '전체 복원' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('이미 복원 중이에요.');
    act(() => {
      channels.layouts.emit([]);
    });
    expect(screen.getByText('아직 저장된 레이아웃이 없어요.')).toBeInTheDocument();
  });
});

describe('GridTab', () => {
  it('adds a preset and rejects duplicates', async () => {
    const { api } = createFakeApi();
    renderWithApi(<GridTab />, api);
    const cols = await screen.findByRole('spinbutton', { name: '가로 칸 수' });
    fireEvent.change(cols, { target: { value: '5' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: '세로 칸 수' }), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: '그리드 추가' }));
    expect(api.settings.update).toHaveBeenCalledWith({
      grid: { presets: [...DEFAULT_SETTINGS.grid.presets, { id: '5x1', cols: 5, rows: 1 }] },
    });
    fireEvent.change(cols, { target: { value: '3' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: '세로 칸 수' }), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getByRole('button', { name: '그리드 추가' }));
    expect(screen.getByRole('alert')).toHaveTextContent('3x3 그리드는 이미 있어요.');
  });

  it('names the custom grid and offers to add it back once removed', async () => {
    const { api } = createFakeApi();
    renderWithApi(<GridTab />, api);
    expect(await screen.findByText('사용자 정의 (2 × 2)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '사용자 정의 그리드 추가' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '사용자 정의 (2 × 2) 삭제' }));
    const fixed = DEFAULT_SETTINGS.grid.presets.filter((p) => !isCustomPreset(p));
    expect(api.settings.update).toHaveBeenLastCalledWith({ grid: { presets: fixed } });
  });

  it('adds the custom grid when it is missing', async () => {
    const { api } = createFakeApi();
    const fixed = DEFAULT_SETTINGS.grid.presets.filter((p) => !isCustomPreset(p));
    api.settings.get.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      grid: { ...DEFAULT_SETTINGS.grid, presets: fixed },
    });
    renderWithApi(<GridTab />, api);
    fireEvent.click(await screen.findByRole('button', { name: '사용자 정의 그리드 추가' }));
    expect(api.settings.update).toHaveBeenCalledWith({
      grid: { presets: [...fixed, customPreset(2, 2)] },
    });
  });

  it('turns edges on and off', async () => {
    const { api } = createFakeApi();
    renderWithApi(<GridTab />, api);
    fireEvent.click(await screen.findByRole('checkbox', { name: '위' }));
    expect(api.settings.update).toHaveBeenCalledWith({
      trigger: { edges: { top: false, bottom: true, left: true, right: true } },
    });
  });

  it('shows validation errors from the main process', async () => {
    const { api } = createFakeApi();
    api.settings.update.mockResolvedValue({ ok: false, code: 'invalidSettings', message: 'x' });
    renderWithApi(<GridTab />, api);
    fireEvent.click(await screen.findByRole('checkbox', { name: '엣지 스냅 사용' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('설정 값이 올바르지 않아요.');
  });
});

describe('StatusTab', () => {
  it('guides the user to grant Accessibility', async () => {
    const { api } = createFakeApi();
    api.system.status.mockResolvedValue({ ...readyStatus, accessibility: false });
    renderWithApi(<StatusTab />, api);
    fireEvent.click(await screen.findByRole('button', { name: '권한 요청' }));
    fireEvent.click(screen.getByRole('button', { name: '시스템 설정 열기' }));
    expect(api.system.requestAccessibility).toHaveBeenCalled();
    expect(api.system.openSettings).toHaveBeenCalledWith('accessibility');
    expect(screen.getByText(/"Desktop N으로 전환" 켜짐: 1, 2/)).toBeInTheDocument();
  });
});

describe('ManagerApp', () => {
  it('switches tabs on navigation events', async () => {
    const { api, channels } = createFakeApi();
    renderWithApi(<ManagerApp initialTab="layouts" />, api);
    expect(screen.getByRole('tab', { name: '레이아웃' })).toHaveAttribute('aria-selected', 'true');
    act(() => {
      channels.navigate.emit('status');
    });
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '권한 및 상태' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });
});
