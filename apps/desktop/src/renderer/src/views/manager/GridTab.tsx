import type { AppSettings } from '@magwin/core';
import { useCallback, useState, type ReactNode } from 'react';
import { errorMessage } from '../../../../shared/i18n';
import { useApi } from '../../api/ApiContext';
import { useLive } from '../../api/useLive';
import { useI18n } from '../../i18n/I18nContext';
import { PresetEditor } from './PresetEditor';
import {
  GeneralSettings,
  LayoutSettings,
  PlacementSettings,
  TriggerSettings,
  type Update,
} from './SettingsSections';
import { SettingsSidebar } from './SettingsSidebar';

type SectionId = 'presets' | 'trigger' | 'placement' | 'layouts' | 'general';

const SECTION_IDS: readonly SectionId[] = ['presets', 'trigger', 'placement', 'layouts', 'general'];

function SectionBody(props: {
  section: SectionId;
  settings: AppSettings;
  update: Update;
}): ReactNode {
  const { settings, update } = props;
  switch (props.section) {
    case 'presets':
      return (
        <PresetEditor
          presets={settings.grid.presets}
          onChange={(presets) => {
            update({ grid: { presets } });
          }}
        />
      );
    case 'trigger':
      return <TriggerSettings settings={settings} update={update} />;
    case 'placement':
      return <PlacementSettings settings={settings} update={update} />;
    case 'layouts':
      return <LayoutSettings settings={settings} update={update} />;
    case 'general':
      return <GeneralSettings settings={settings} update={update} />;
  }
}

/**
 * Settings, one section at a time: the sidebar on the left picks the section shown on the
 * right. Every change is validated by the main process.
 */
export function GridTab(): ReactNode {
  const api = useApi();
  const { t } = useI18n();
  const settings = useLive(api.settings.get, api.settings.onChanged);
  const [section, setSection] = useState<SectionId>('presets');
  const [error, setError] = useState<string | null>(null);

  const update = useCallback<Update>(
    (patch) => {
      setError(null);
      void api.settings.update(patch).then((result) => {
        if (!result.ok) setError(result.code);
      });
    },
    [api],
  );

  if (settings === null) {
    return <p className="muted">{t.common.loading}</p>;
  }
  const items = SECTION_IDS.map((id) => ({ id, label: t.settings.sections[id] }));
  return (
    <section className="grid-tab settings-split">
      <SettingsSidebar
        label={t.settings.sectionsLabel}
        items={items}
        selected={section}
        onSelect={setSection}
      />
      <div
        className="settings-panel"
        id="settings-panel"
        role="tabpanel"
        aria-labelledby={`settings-tab-${section}`}
      >
        {error === null ? null : (
          <p className="error-text" role="alert">
            {errorMessage(t, error)}
          </p>
        )}
        <SectionBody section={section} settings={settings} update={update} />
      </div>
    </section>
  );
}
