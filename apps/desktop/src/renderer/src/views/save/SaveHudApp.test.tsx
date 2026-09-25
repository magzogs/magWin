// @vitest-environment jsdom
import type { CaptureDraft } from '@magwin/core';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFakeApi } from '../../test/fakeApi';
import { renderWithApi } from '../../test/render';
import { defaultLayoutName, SaveHudApp } from './SaveHudApp';

const display = {
  uuid: 'MAIN',
  name: 'Built-in',
  frame: { x: 0, y: 0, width: 1440, height: 900 },
  visibleFrame: { x: 0, y: 25, width: 1440, height: 875 },
  isMain: true,
};

function entry(key: string, app: string, desktop: number, included: boolean) {
  return {
    key,
    included,
    window: {
      app: { bundleId: `com.${app}`, name: app, path: null },
      title: `${app} window`,
      frame: { x: 0, y: 25, width: 720, height: 875 },
      relativeFrame: { x: 0, y: 0, width: 0.5, height: 1 },
      displayUuid: 'MAIN',
      desktop: {
        number: desktop,
        displayUuid: 'MAIN',
        indexOnDisplay: desktop,
        spaceUuid: null,
        spaceId: desktop,
      },
      order: 0,
    },
  };
}

const draft: CaptureDraft = {
  scope: 'all',
  displays: [display],
  entries: [entry('11', 'Editor', 1, true), entry('12', 'Chat', 2, false)],
  skippedFullscreen: 1,
};

function setup() {
  const fake = createFakeApi();
  fake.api.layouts.capture.mockResolvedValue({ ok: true, draftId: 'draft-1', draft });
  renderWithApi(<SaveHudApp now={new Date(2026, 8, 25, 16, 5)} />, fake.api);
  return fake;
}

describe('SaveHudApp', () => {
  it('names layouts after the time by default', () => {
    expect(defaultLayoutName(new Date(2026, 8, 25, 16, 5))).toBe('9월 25일 16:05');
  });

  it('captures every desktop and pre-selects the included windows', async () => {
    const { api } = setup();
    const editor = await screen.findByRole('checkbox', { name: /Editor/ });
    expect(editor).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Chat/ })).not.toBeChecked();
    expect(api.layouts.capture).toHaveBeenCalledWith('all');
    expect(screen.getByText('전체 화면 창 1개는 저장하지 않아요.')).toBeInTheDocument();
    // Once in the wireframe caption, once next to the window.
    expect(screen.getAllByText('Desktop 1')).toHaveLength(2);
  });

  it('saves the chosen windows under the given name and closes', async () => {
    const { api } = setup();
    api.layouts.save.mockResolvedValue({
      ok: true,
      summary: {
        id: 'x',
        name: 'Coding',
        createdAt: '',
        updatedAt: '',
        windowCount: 2,
        appCount: 2,
        desktopNumbers: [1, 2],
      },
    });
    fireEvent.click(await screen.findByRole('checkbox', { name: /Chat/ }));
    fireEvent.change(screen.getByRole('textbox', { name: '레이아웃 이름' }), {
      target: { value: ' Coding ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => {
      expect(api.windows.closeSelf).toHaveBeenCalled();
    });
    expect(api.layouts.save).toHaveBeenCalledWith({
      draftId: 'draft-1',
      name: 'Coding',
      includedKeys: ['11', '12'],
    });
  });

  it('recaptures when the scope changes and reports failures', async () => {
    const { api } = setup();
    await screen.findByRole('checkbox', { name: /Editor/ });
    api.layouts.capture.mockResolvedValue({ ok: false, code: 'accessibilityDenied' });
    fireEvent.click(screen.getByRole('radio', { name: '현재 Desktop만' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('손쉬운 사용 권한이 필요해요');
    expect(api.layouts.capture).toHaveBeenLastCalledWith('currentDesktop');
  });
});
