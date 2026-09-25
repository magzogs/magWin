// @vitest-environment jsdom
import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeApi } from '../../test/fakeApi';
import { renderWithApi } from '../../test/render';
import { AUTO_CLOSE_MS, ProgressApp } from './ProgressApp';

afterEach(() => {
  vi.useRealTimers();
});

function setup() {
  const fake = createFakeApi();
  renderWithApi(<ProgressApp />, fake.api);
  return fake;
}

describe('ProgressApp', () => {
  it('shows what is happening right now', () => {
    const { channels } = setup();
    act(() => {
      channels.progress.emit({
        type: 'started',
        layoutName: 'Coding',
        totalWindows: 3,
        desktopCount: 2,
      });
      channels.progress.emit({ type: 'switching', desktopNumber: 2 });
      channels.progress.emit({ type: 'launching', appName: 'Slack' });
    });
    expect(screen.getByText("'Coding' 복원")).toBeInTheDocument();
    expect(screen.getByText('Desktop 2로 이동하는 중…')).toBeInTheDocument();
    expect(screen.getByText('Slack 실행 중…')).toBeInTheDocument();
  });

  it('explains leftovers and stays open', () => {
    vi.useFakeTimers();
    const { channels, api } = setup();
    act(() => {
      channels.progress.emit({
        type: 'started',
        layoutName: 'Coding',
        totalWindows: 2,
        desktopCount: 1,
      });
      channels.progress.emit({
        type: 'finished',
        report: {
          layoutName: 'Coding',
          placed: 1,
          total: 2,
          durationMs: 900,
          issues: [
            {
              reason: 'onOtherDesktop',
              appName: 'Slack',
              windowTitle: null,
              desktopNumber: 2,
              foundOnDesktop: 1,
              detail: null,
            },
          ],
        },
      });
    });
    expect(screen.getByText('2개 중 1개 창을 배치했어요')).toBeInTheDocument();
    expect(screen.getByText(/Slack: 창이 Desktop 1에 있어요/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(AUTO_CLOSE_MS * 2);
    });
    expect(api.windows.closeSelf).not.toHaveBeenCalled();
  });

  it('closes itself after a clean restore', () => {
    vi.useFakeTimers();
    const { channels, api } = setup();
    act(() => {
      channels.progress.emit({
        type: 'finished',
        report: { layoutName: 'Coding', placed: 2, total: 2, durationMs: 900, issues: [] },
      });
    });
    act(() => {
      vi.advanceTimersByTime(AUTO_CLOSE_MS);
    });
    expect(api.windows.closeSelf).toHaveBeenCalledTimes(1);
  });
});
