// @vitest-environment jsdom
import { DEFAULT_SETTINGS, type AppSettings } from '@magwin/core';
import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFakeApi } from '../../test/fakeApi';
import { renderWithApi } from '../../test/render';
import { GridTab } from './GridTab';
import { ManagerApp } from './ManagerApp';

function withLanguage(language: AppSettings['general']['language']): AppSettings {
  return { ...DEFAULT_SETTINGS, general: { ...DEFAULT_SETTINGS.general, language } };
}

describe('UI language', () => {
  it('follows the system language by default', async () => {
    const { api } = createFakeApi();
    renderWithApi(<ManagerApp initialTab="layouts" />, api, ['en-US', 'ko-KR']);
    expect(await screen.findByText('No saved layouts yet.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Permissions & Status' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('uses the language pinned in the settings over the system one', async () => {
    const { api } = createFakeApi();
    api.settings.get.mockResolvedValue(withLanguage('en'));
    renderWithApi(<ManagerApp initialTab="grid" />, api, ['ko-KR']);
    expect(await screen.findByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByRole('tab', { name: 'Palette grids' })).toBeInTheDocument();
  });

  it('switches every label as soon as the setting changes', async () => {
    const { api, channels } = createFakeApi();
    renderWithApi(<ManagerApp initialTab="layouts" />, api);
    expect(await screen.findByText('아직 저장된 레이아웃이 없어요.')).toBeInTheDocument();
    act(() => {
      channels.settings.emit(withLanguage('en'));
    });
    expect(screen.getByText('No saved layouts yet.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'magWin Help' })).toBeInTheDocument();
  });

  it('is chosen in Settings › General', async () => {
    const { api } = createFakeApi();
    renderWithApi(<GridTab />, api);
    fireEvent.click(await screen.findByRole('tab', { name: '일반' }));
    const select = screen.getByRole('combobox', { name: '언어' });
    expect(select).toHaveValue('system');
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'en' } });
    expect(api.settings.update).toHaveBeenCalledWith({ general: { language: 'en' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '로그인 시 자동 실행' }));
    expect(api.settings.update).toHaveBeenLastCalledWith({ general: { launchAtLogin: true } });
  });
});
