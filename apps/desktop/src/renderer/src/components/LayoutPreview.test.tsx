// @vitest-environment jsdom
import type { SavedWindow } from '@magwin/core';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFakeApi } from '../test/fakeApi';
import { renderWithApi } from '../test/render';
import { GhostApp } from '../views/ghost/GhostApp';
import { appHue, LayoutPreview } from './LayoutPreview';

function window(app: string, desktop: number | null, order: number): SavedWindow {
  return {
    app: { bundleId: null, name: app, path: null },
    title: null,
    frame: { x: 0, y: 25, width: 720, height: 875 },
    relativeFrame: { x: 0.5, y: 0, width: 0.5, height: 1 },
    displayUuid: 'MAIN',
    desktop:
      desktop === null
        ? null
        : {
            number: desktop,
            displayUuid: 'MAIN',
            indexOnDisplay: desktop,
            spaceUuid: null,
            spaceId: desktop,
          },
    order,
  };
}

describe('LayoutPreview', () => {
  it('draws one miniature screen per desktop, unknown desktops last', () => {
    render(
      <LayoutPreview
        displays={[]}
        windows={[window('Chat', null, 2), window('Editor', 2, 0), window('Mail', 1, 1)]}
      />,
    );
    expect(
      screen.getAllByRole('figure').map((f) => f.querySelector('figcaption')?.textContent),
    ).toEqual(['Desktop 1', 'Desktop 2', 'Desktop ?']);
    expect(screen.getByTitle('Editor')).toHaveStyle({ left: '50%', width: '50%' });
  });

  it('gives each app a stable colour', () => {
    expect(appHue('Slack')).toBe(appHue('Slack'));
    expect(appHue('Slack')).not.toBe(appHue('Mail'));
  });
});

describe('GhostApp', () => {
  it('draws the target frame and hides it again', () => {
    const { api, channels } = createFakeApi();
    renderWithApi(<GhostApp />, api);
    expect(screen.queryByTestId('ghost')).toBeNull();
    act(() => {
      channels.ghostState.emit({ rect: { x: 10, y: 20, width: 300, height: 200 } });
    });
    expect(screen.getByTestId('ghost')).toHaveStyle({
      width: '300px',
      transform: 'translate(10px, 20px)',
    });
    act(() => {
      channels.ghostState.emit(null);
    });
    expect(screen.queryByTestId('ghost')).toBeNull();
  });
});
