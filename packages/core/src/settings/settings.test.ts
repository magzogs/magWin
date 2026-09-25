import { describe, expect, it } from 'vitest';
import { applySettingsPatch, DEFAULT_SETTINGS, parseSettings } from './settings';

describe('parseSettings', () => {
  it('accepts valid settings unchanged', () => {
    expect(parseSettings(DEFAULT_SETTINGS)).toEqual({
      settings: DEFAULT_SETTINGS,
      recovered: false,
    });
  });

  it('falls back per section so one bad value keeps the rest', () => {
    const customPresets = [{ id: '5x1', cols: 5, rows: 1 }];
    const raw = {
      ...DEFAULT_SETTINGS,
      grid: { presets: customPresets, gapPx: 4 },
      trigger: { ...DEFAULT_SETTINGS.trigger, dwellMs: -1 },
    };
    const { settings, recovered } = parseSettings(raw);
    expect(recovered).toBe(true);
    expect(settings.grid.presets).toEqual(customPresets);
    expect(settings.trigger).toEqual(DEFAULT_SETTINGS.trigger);
  });

  it('returns defaults for garbage', () => {
    expect(parseSettings('nope').settings).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null).recovered).toBe(true);
  });
});

describe('applySettingsPatch', () => {
  it('merges one section without touching others', () => {
    const result = applySettingsPatch(DEFAULT_SETTINGS, { trigger: { dwellMs: 600 } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.trigger.dwellMs).toBe(600);
      expect(result.value.trigger.edges).toEqual(DEFAULT_SETTINGS.trigger.edges);
      expect(result.value.grid).toEqual(DEFAULT_SETTINGS.grid);
    }
  });

  it('rejects invalid values', () => {
    expect(applySettingsPatch(DEFAULT_SETTINGS, { palette: { componentWidth: 10 } }).ok).toBe(
      false,
    );
  });

  it('rejects duplicate presets', () => {
    const presets = [
      { id: '2x2', cols: 2, rows: 2 },
      { id: '2x2', cols: 2, rows: 2 },
    ];
    const result = applySettingsPatch(DEFAULT_SETTINGS, { grid: { presets } });
    expect(result.ok).toBe(false);
  });

  it('rejects an empty preset list', () => {
    expect(applySettingsPatch(DEFAULT_SETTINGS, { grid: { presets: [] } }).ok).toBe(false);
  });
});
