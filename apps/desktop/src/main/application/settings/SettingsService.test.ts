import { DEFAULT_SETTINGS } from '@magwin/core';
import { describe, expect, it } from 'vitest';
import { MemoryLogger, MemorySettingsRepository } from '../test/fakes';
import { SettingsService } from './SettingsService';

describe('SettingsService', () => {
  it('starts from defaults when nothing is stored', async () => {
    const service = new SettingsService(new MemorySettingsRepository(), new MemoryLogger());
    expect(await service.load()).toEqual(DEFAULT_SETTINGS);
  });

  it('repairs invalid sections and rewrites the file', async () => {
    const repository = new MemorySettingsRepository({
      ...DEFAULT_SETTINGS,
      palette: { componentWidth: 1 },
    });
    const logger = new MemoryLogger();
    const settings = await new SettingsService(repository, logger).load();
    expect(settings.palette).toEqual(DEFAULT_SETTINGS.palette);
    expect(repository.saved).toHaveLength(1);
    expect(logger.lines[0]).toMatch(/^warn/);
  });

  it('validates, persists and announces updates', async () => {
    const repository = new MemorySettingsRepository();
    const service = new SettingsService(repository, new MemoryLogger());
    await service.load();
    const seen: number[] = [];
    service.onChange((s) => seen.push(s.trigger.dwellMs));
    const result = await service.update({ trigger: { dwellMs: 500 } });
    expect(result.ok).toBe(true);
    expect(service.get().trigger.dwellMs).toBe(500);
    expect(repository.saved.at(-1)?.trigger.dwellMs).toBe(500);
    expect(seen).toEqual([500]);
  });

  it('keeps the old settings when an update is invalid', async () => {
    const repository = new MemorySettingsRepository();
    const service = new SettingsService(repository, new MemoryLogger());
    await service.load();
    const result = await service.update({ trigger: { bandPx: 999 } });
    expect(result.ok).toBe(false);
    expect(service.get()).toEqual(DEFAULT_SETTINGS);
    expect(repository.saved).toHaveLength(0);
  });
});
