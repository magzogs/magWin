import {
  EDGES,
  SUPPORTED_LOCALES,
  type AppSettings,
  type LanguagePreference,
  type SettingsPatch,
} from '@magwin/core';
import { useState, type ReactNode } from 'react';
import { LANGUAGE_NAMES } from '../../../../shared/i18n';
import { useI18n } from '../../i18n/I18nContext';
import { RangeField, Toggle } from './fields';

export type Update = (patch: SettingsPatch) => void;

interface SectionProps {
  readonly settings: AppSettings;
  readonly update: Update;
}

export function TriggerSettings({ settings, update }: SectionProps): ReactNode {
  const { t } = useI18n();
  const { trigger } = settings;
  const labels = t.settings.trigger;
  return (
    <fieldset className="card">
      <legend>{t.settings.sections.trigger}</legend>
      <Toggle
        label={labels.enabled}
        checked={trigger.enabled}
        onChange={(enabled) => {
          update({ trigger: { enabled } });
        }}
      />
      <div className="field">
        <span className="field-label">{labels.edges}</span>
        <div className="inline">
          {EDGES.map((edge) => (
            <label key={edge} className="chip">
              <input
                type="checkbox"
                checked={trigger.edges[edge]}
                onChange={(event) => {
                  update({
                    trigger: { edges: { ...trigger.edges, [edge]: event.target.checked } },
                  });
                }}
              />
              {t.edges[edge]}
            </label>
          ))}
        </div>
      </div>
      <RangeField
        label={labels.dwell}
        value={trigger.dwellMs}
        min={0}
        max={1500}
        step={50}
        unit="ms"
        hint={labels.dwellHint}
        onCommit={(dwellMs) => {
          update({ trigger: { dwellMs } });
        }}
      />
      <RangeField
        label={labels.band}
        value={trigger.bandPx}
        min={2}
        max={24}
        unit="px"
        onCommit={(bandPx) => {
          update({ trigger: { bandPx } });
        }}
      />
      <label className="field">
        <span className="field-label">{labels.modifier}</span>
        <select
          value={trigger.modifier}
          onChange={(event) => {
            update({
              trigger: { modifier: event.target.value as AppSettings['trigger']['modifier'] },
            });
          }}
        >
          {Object.entries(t.modifiers).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}

export function PlacementSettings({ settings, update }: SectionProps): ReactNode {
  const { t } = useI18n();
  const labels = t.settings.placement;
  return (
    <fieldset className="card">
      <legend>{t.settings.sections.placement}</legend>
      <RangeField
        label={labels.gridSize}
        value={settings.palette.componentWidth}
        min={64}
        max={200}
        step={4}
        unit="px"
        onCommit={(componentWidth) => {
          update({ palette: { componentWidth } });
        }}
      />
      <RangeField
        label={labels.hideDelay}
        value={settings.palette.hideDelayMs}
        min={100}
        max={3000}
        step={50}
        unit="ms"
        hint={labels.hideDelayHint}
        onCommit={(hideDelayMs) => {
          update({ palette: { hideDelayMs } });
        }}
      />
      <RangeField
        label={labels.gap}
        value={settings.grid.gapPx}
        min={0}
        max={64}
        unit="px"
        hint={labels.gapHint}
        onCommit={(gapPx) => {
          update({ grid: { gapPx } });
        }}
      />
    </fieldset>
  );
}

export function LayoutSettings({ settings, update }: SectionProps): ReactNode {
  const { t } = useI18n();
  const labels = t.settings.layouts;
  const [excluded, setExcluded] = useState(settings.layouts.excludedBundleIds.join('\n'));
  return (
    <fieldset className="card">
      <legend>{t.settings.sections.layouts}</legend>
      <Toggle
        label={labels.launchMissing}
        checked={settings.layouts.launchMissingApps}
        hint={labels.launchMissingHint}
        onChange={(launchMissingApps) => {
          update({ layouts: { launchMissingApps } });
        }}
      />
      <Toggle
        label={labels.hotkeys}
        checked={settings.layouts.hotkeysEnabled}
        onChange={(hotkeysEnabled) => {
          update({ layouts: { hotkeysEnabled } });
        }}
      />
      <label className="field">
        <span className="field-label">{labels.excluded}</span>
        <textarea
          rows={3}
          value={excluded}
          placeholder="com.apple.systempreferences"
          onChange={(event) => {
            setExcluded(event.target.value);
          }}
          onBlur={() => {
            const ids = excluded
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line !== '');
            update({ layouts: { excludedBundleIds: ids } });
          }}
        />
      </label>
    </fieldset>
  );
}

const LANGUAGE_CHOICES: readonly LanguagePreference[] = ['system', ...SUPPORTED_LOCALES];

export function GeneralSettings({ settings, update }: SectionProps): ReactNode {
  const { t } = useI18n();
  const labels = t.settings.general;
  return (
    <fieldset className="card">
      <legend>{t.settings.sections.general}</legend>
      <label className="field">
        <span className="field-label">{labels.language}</span>
        <select
          aria-label={labels.language}
          value={settings.general.language}
          onChange={(event) => {
            update({ general: { language: event.target.value as LanguagePreference } });
          }}
        >
          {LANGUAGE_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {choice === 'system' ? labels.languageSystem : LANGUAGE_NAMES[choice]}
            </option>
          ))}
        </select>
        <small className="muted">{labels.languageHint}</small>
      </label>
      <Toggle
        label={labels.launchAtLogin}
        checked={settings.general.launchAtLogin}
        onChange={(launchAtLogin) => {
          update({ general: { launchAtLogin } });
        }}
      />
    </fieldset>
  );
}
