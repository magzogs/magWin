import { applySettingsPatch, DEFAULT_SETTINGS, type AppSettings } from '@magwin/core';
import { beforeEach, describe, expect, it } from 'vitest';
import type { EdgeHover } from '../../domain/ports';
import { SnapService } from '../snap/SnapService';
import {
  FakeClock,
  FakeEdgeSource,
  FakeGhostView,
  FakePaletteView,
  FakeScheduler,
  FakeScreen,
  MemoryLogger,
} from '../test/fakes';
import { makeWorld } from '../test/world';
import { PALETTE_TICK_MS, PaletteController } from './PaletteController';

const display = {
  id: 1,
  bounds: { x: 0, y: 0, width: 1440, height: 900 },
  workArea: { x: 0, y: 25, width: 1440, height: 875 },
};

const hover: EdgeHover = {
  target: { windowId: 42, pid: 7 },
  bundleId: 'com.example.editor',
  appName: 'Editor',
  windowFrame: { x: 200, y: 100, width: 800, height: 600 },
  edge: 'top',
  point: { x: 600, y: 100 },
};

describe('PaletteController', () => {
  let clock: FakeClock;
  let scheduler: FakeScheduler;
  let edges: FakeEdgeSource;
  let palette: FakePaletteView;
  let ghost: FakeGhostView;
  let screen: FakeScreen;
  let world: ReturnType<typeof makeWorld>;
  let settings: AppSettings;
  let controller: PaletteController;

  beforeEach(() => {
    clock = new FakeClock();
    scheduler = new FakeScheduler(clock);
    edges = new FakeEdgeSource();
    palette = new FakePaletteView();
    ghost = new FakeGhostView();
    screen = new FakeScreen(display);
    world = makeWorld();
    settings = DEFAULT_SETTINGS;
    controller = new PaletteController({
      edges,
      palette,
      ghost,
      screen,
      snap: new SnapService(world),
      scheduler,
      clock,
      settings: () => settings,
      updateSettings: (patch) => {
        const next = applySettingsPatch(settings, patch);
        if (next.ok) {
          settings = next.value;
        }
        return Promise.resolve(next);
      },
      logger: new MemoryLogger(),
    });
    controller.start();
  });

  it('shows the palette inside the hovered edge and pauses edge detection', async () => {
    edges.emit(hover);
    await Promise.resolve();
    expect(palette.shown).toHaveLength(1);
    const [shown] = palette.shown;
    expect(shown?.state.layout.slots.map((s) => s.presetId)).toEqual([
      '2x2',
      '2x3',
      '3x2',
      '3x3',
      'custom',
    ]);
    expect(shown?.state.appName).toBe('Editor');
    expect(shown?.bounds.y).toBe(106);
    expect(edges.paused).toEqual([true]);
    expect(controller.isOpen()).toBe(true);
  });

  it('ignores hovers while open or when the trigger is disabled', async () => {
    await controller.open(hover);
    await controller.open(hover);
    expect(palette.shown).toHaveLength(1);
    controller.close();
    settings = { ...DEFAULT_SETTINGS, trigger: { ...DEFAULT_SETTINGS.trigger, enabled: false } };
    await controller.open(hover);
    expect(palette.shown).toHaveLength(1);
  });

  it('stays open while the cursor is near and hides after the delay once it leaves', async () => {
    await controller.open(hover);
    screen.cursorPoint = { x: 600, y: 150 };
    scheduler.advance(2_000);
    expect(controller.isOpen()).toBe(true);
    screen.cursorPoint = { x: 50, y: 800 };
    scheduler.advance(DEFAULT_SETTINGS.palette.hideDelayMs - PALETTE_TICK_MS);
    expect(controller.isOpen()).toBe(true);
    scheduler.advance(PALETTE_TICK_MS * 2);
    expect(controller.isOpen()).toBe(false);
    expect(palette.hidden).toBe(1);
    expect(edges.paused).toEqual([true, false]);
    expect(scheduler.pending()).toBe(0);
  });

  it('does not hide during a drag that leaves the palette', async () => {
    await controller.open(hover);
    controller.setInteracting(true);
    screen.cursorPoint = { x: 50, y: 800 };
    scheduler.advance(5_000);
    expect(controller.isOpen()).toBe(true);
  });

  it('previews the target frame for a selection and clears it', async () => {
    await controller.open(hover);
    controller.selectionChanged({
      presetId: '2x2',
      range: { top: 0, left: 0, bottom: 1, right: 0 },
    });
    expect(ghost.frames).toEqual([{ x: 0, y: 25, width: 720, height: 875 }]);
    controller.selectionChanged(null);
    controller.selectionChanged({
      presetId: '2x2',
      range: { top: 0, left: 0, bottom: 5, right: 0 },
    });
    expect(ghost.hidden).toBe(2);
  });

  it('applies the selection to the hovered window and closes', async () => {
    await controller.open(hover);
    const result = await controller.apply({
      presetId: '3x2',
      range: { top: 0, left: 0, bottom: 0, right: 1 },
    });
    expect(result).toEqual({ ok: true });
    expect(world.frames).toEqual([
      { windowId: 42, frame: { x: 0, y: 25, width: 960, height: 438 } },
    ]);
    expect(controller.isOpen()).toBe(false);
  });

  it('keeps the palette open and returns the failure code when snapping fails', async () => {
    world.failMove.add(42);
    await controller.open(hover);
    const result = await controller.apply({
      presetId: '2x2',
      range: { top: 0, left: 0, bottom: 0, right: 0 },
    });
    expect(result).toEqual({ ok: false, code: 'notResizable' });
    expect(controller.isOpen()).toBe(true);
  });

  it('refuses to apply when closed or with an unknown preset', async () => {
    const range = { top: 0, left: 0, bottom: 0, right: 0 };
    expect(await controller.apply({ presetId: '2x2', range })).toEqual({
      ok: false,
      code: 'paletteClosed',
    });
    await controller.open(hover);
    expect(await controller.apply({ presetId: '9x9', range })).toEqual({
      ok: false,
      code: 'invalidRange',
    });
  });

  it('reshapes the custom grid for this session and saves it for the next one', async () => {
    await controller.open(hover);
    expect(await controller.resizeCustom({ cols: 3, rows: 2 })).toEqual({ ok: true });
    expect(settings.grid.presets.at(-1)).toEqual({ id: 'custom', cols: 3, rows: 2 });
    expect(settings.grid.presets.slice(0, -1)).toEqual(DEFAULT_SETTINGS.grid.presets.slice(0, -1));
    const result = await controller.apply({
      presetId: 'custom',
      range: { top: 0, left: 2, bottom: 1, right: 2 },
    });
    expect(result).toEqual({ ok: true });
    expect(world.frames).toEqual([
      { windowId: 42, frame: { x: 960, y: 25, width: 480, height: 875 } },
    ]);

    await controller.open(hover);
    const reopened = palette.shown.at(-1)?.state.presets.at(-1);
    expect(reopened).toEqual({ id: 'custom', cols: 3, rows: 2 });
  });

  it('refuses to reshape when closed or without a custom grid', async () => {
    expect(await controller.resizeCustom({ cols: 3, rows: 2 })).toEqual({
      ok: false,
      code: 'paletteClosed',
    });
    settings = {
      ...DEFAULT_SETTINGS,
      grid: { ...DEFAULT_SETTINGS.grid, presets: DEFAULT_SETTINGS.grid.presets.slice(0, -1) },
    };
    await controller.open(hover);
    expect(await controller.resizeCustom({ cols: 3, rows: 2 })).toEqual({
      ok: false,
      code: 'invalidPreset',
    });
    expect(settings.grid.presets).toHaveLength(4);
  });
});
