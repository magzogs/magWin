// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DOCS_URL, SUPPORT_EMAIL } from '../../../../shared/links';
import { createFakeApi } from '../../test/fakeApi';
import { renderWithApi } from '../../test/render';
import { HelpTab } from './HelpTab';
import { ManagerApp } from './ManagerApp';
import { SupportTab } from './SupportTab';

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('HelpTab', () => {
  it('links topics to the docs site and filters by search', () => {
    const { api } = createFakeApi();
    renderWithApi(<HelpTab onNavigate={vi.fn()} />, api);
    expect(screen.getByRole('link', { name: /엣지 그리드 스냅/ })).toHaveAttribute(
      'href',
      `${DOCS_URL}/guide/edge-snap`,
    );
    fireEvent.change(screen.getByRole('searchbox', { name: '도움말 검색' }), {
      target: { value: 'Mission Control' },
    });
    expect(screen.queryByRole('link', { name: /엣지 그리드 스냅/ })).toBeNull();
    expect(screen.getByText('Desktop이 전환되지 않아요')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(screen.getByText('"zzz"에 대한 결과가 없어요.')).toBeInTheDocument();
  });

  it('points to support when no answer fits', () => {
    const onNavigate = vi.fn();
    const { api } = createFakeApi();
    renderWithApi(<HelpTab onNavigate={onNavigate} />, api);
    fireEvent.click(screen.getByRole('button', { name: '지원 받기' }));
    expect(onNavigate).toHaveBeenCalledWith('support');
  });
});

describe('SupportTab', () => {
  it('shows diagnostics, copies them and drafts a mail', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const { api } = createFakeApi();
    renderWithApi(<SupportTab onNavigate={vi.fn()} />, api);
    const diagnostics = await screen.findByLabelText('진단 정보');
    expect(diagnostics).toHaveTextContent('OrgaWin 0.1.0');
    fireEvent.click(screen.getByRole('button', { name: '진단 정보 복사' }));
    expect(writeText).toHaveBeenCalledWith(diagnostics.textContent);
    expect(await screen.findByText('복사했어요')).toBeInTheDocument();
    const mail = screen.getByRole('link', { name: '이메일로 문의' }).getAttribute('href') ?? '';
    expect(mail.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
    expect(decodeURIComponent(mail)).toContain('macOS 26.6.2 (arm64)');
  });

  it('reports a failed copy and links the self-service steps', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    const onNavigate = vi.fn();
    const { api } = createFakeApi();
    renderWithApi(<SupportTab onNavigate={onNavigate} />, api);
    fireEvent.click(await screen.findByRole('button', { name: '진단 정보 복사' }));
    expect(await screen.findByText('복사하지 못했어요')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '도움말 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '권한 및 상태 열기' }));
    expect(onNavigate.mock.calls).toEqual([['help'], ['status']]);
  });
});

describe('ManagerApp help navigation', () => {
  it('moves from help to support', () => {
    const { api } = createFakeApi();
    renderWithApi(<ManagerApp initialTab="help" />, api);
    expect(screen.getByRole('tab', { name: 'OrgaWin 도움말' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: '지원 받기' }));
    expect(screen.getByRole('tab', { name: '지원 받기' })).toHaveAttribute('aria-selected', 'true');
  });
});
