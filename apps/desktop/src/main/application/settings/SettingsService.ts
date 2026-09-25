import {
  applySettingsPatch,
  DEFAULT_SETTINGS,
  parseSettings,
  type AppSettings,
  type Result,
  type SettingsPatch,
} from '@magwin/core';
import type { Logger, SettingsRepository, Unsubscribe } from '../../domain/ports';
import { Emitter } from '../../domain/Emitter';

/** Owns the current settings, validates updates and persists them. */
export class SettingsService {
  private current: AppSettings = DEFAULT_SETTINGS;
  private readonly changes = new Emitter<AppSettings>();

  constructor(
    private readonly repository: SettingsRepository,
    private readonly logger: Logger,
  ) {}

  async load(): Promise<AppSettings> {
    const raw = await this.repository.load();
    if (raw === null) {
      this.current = DEFAULT_SETTINGS;
      return this.current;
    }
    const { settings, recovered } = parseSettings(raw);
    this.current = settings;
    if (recovered) {
      this.logger.warn('Settings file had invalid sections; defaults were restored for them');
      await this.repository.save(settings);
    }
    return settings;
  }

  get(): AppSettings {
    return this.current;
  }

  async update(patch: SettingsPatch): Promise<Result<AppSettings>> {
    const next = applySettingsPatch(this.current, patch);
    if (!next.ok) {
      return next;
    }
    this.current = next.value;
    await this.repository.save(next.value);
    this.changes.emit(next.value);
    return next;
  }

  onChange(listener: (settings: AppSettings) => void): Unsubscribe {
    return this.changes.subscribe(listener);
  }
}
