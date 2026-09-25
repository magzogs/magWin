// @vitest-environment jsdom
import { computePaletteLayout, DEFAULT_PALETTE_METRICS, DEFAULT_PRESETS } from '@magwin/core';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PaletteState } from '../../../../shared/contracts';
import { createFakeApi } from '../../test/fakeApi';
import { renderWithApi } from '../../test/render';
import { PaletteApp } from './PaletteApp';

const state: PaletteState = {
  token: 1,
  edge: 'top',
  layout: computePaletteLayout({
    presets: DEFAULT_PRESETS,
    edge: 'top',
    aspectRatio: 1.6,
    metrics: DEFAULT_PALETTE_METRICS,
  }),
  presets: DEFAULT_PRESETS,
  appName: 'Editor',
  workArea: { width: 1440, height: 875 },
  gapPx: 0,
};

function cell(preset: string, row: number, col: number): HTMLElement {
  return screen.getByTestId(`cell-${preset}-${String(row)}-${String(col)}`);
}

/** Hidden apply buttons are aria-hidden, so they are found by class rather than by role. */
function applyButtons(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('button.apply'));
}

function visibleApply(): HTMLElement[] {
  return applyButtons().filter((button) => button.classList.contains('visible'));
}

function setup() {
  const fake = createFakeApi();
  renderWithApi(<PaletteApp />, fake.api);
  act(() => {
    fake.channels.paletteState.emit(state);
  });
  return fake;
}

function drag(from: HTMLElement, to: HTMLElement): void {
  fireEvent.pointerDown(from);
  fireEvent.pointerEnter(to);
  fireEvent.pointerUp(window);
}

describe('PaletteApp', () => {
  it('renders one grid per preset and reports when painted', async () => {
    const { api } = setup();
    expect(screen.getAllByRole('grid')).toHaveLength(5);
    expect(screen.getByText('3 × 2')).toBeInTheDocument();
    await waitFor(() => {
      expect(api.palette.ready).toHaveBeenCalledWith(1);
    });
    expect(applyButtons()).toHaveLength(5);
    expect(visibleApply()).toHaveLength(0);
  });

  it('selects the rectangle spanned by a drag and shows apply next to that grid only', () => {
    const { api } = setup();
    drag(cell('3x3', 0, 0), cell('3x3', 1, 1));
    const selected = screen
      .getAllByRole('gridcell')
      .filter((c) => c.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(4);
    expect(visibleApply()).toHaveLength(1);
    expect(api.palette.selectionChanged).toHaveBeenLastCalledWith({
      presetId: '3x3',
      range: { top: 0, left: 0, bottom: 1, right: 1 },
    });
    expect(api.palette.interaction).toHaveBeenCalledWith(true);
    expect(api.palette.interaction).toHaveBeenLastCalledWith(false);
  });

  it('clears the old component when another component is pressed', () => {
    setup();
    drag(cell('3x3', 0, 0), cell('3x3', 0, 2));
    fireEvent.pointerDown(cell('2x2', 1, 1));
    fireEvent.pointerUp(window);
    expect(cell('3x3', 0, 0)).toHaveAttribute('aria-selected', 'false');
    expect(cell('2x2', 1, 1)).toHaveAttribute('aria-selected', 'true');
    expect(visibleApply()).toHaveLength(1);
  });

  it('hides apply again when the only selected cell is clicked', () => {
    setup();
    fireEvent.pointerDown(cell('2x2', 0, 0));
    fireEvent.pointerUp(window);
    expect(visibleApply()).toHaveLength(1);
    fireEvent.pointerDown(cell('2x2', 0, 0));
    fireEvent.pointerUp(window);
    expect(visibleApply()).toHaveLength(0);
    expect(cell('2x2', 0, 0)).toHaveAttribute('aria-selected', 'false');
  });

  it('applies the selection and shows failures', async () => {
    const { api } = setup();
    api.palette.apply.mockResolvedValueOnce({ ok: false, code: 'notResizable' });
    drag(cell('2x3', 0, 0), cell('2x3', 2, 0));
    const [button] = visibleApply();
    expect(button).toHaveAttribute('title', '720 × 875');
    fireEvent.click(button ?? document.body);
    expect(api.palette.apply).toHaveBeenCalledWith({
      presetId: '2x3',
      range: { top: 0, left: 0, bottom: 2, right: 0 },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('위치나 크기를 바꿀 수 없어요');
  });

  it('uses Escape to clear, then to dismiss', () => {
    const { api } = setup();
    fireEvent.pointerDown(cell('4x4', 3, 3));
    fireEvent.pointerUp(window);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(visibleApply()).toHaveLength(0);
    expect(api.palette.dismiss).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(api.palette.dismiss).toHaveBeenCalledTimes(1);
  });

  it('starts fresh for every new appearance', () => {
    const { channels } = setup();
    fireEvent.pointerDown(cell('2x2', 0, 0));
    fireEvent.pointerUp(window);
    act(() => {
      channels.paletteState.emit({ ...state, token: 2 });
    });
    expect(visibleApply()).toHaveLength(0);
  });
});
