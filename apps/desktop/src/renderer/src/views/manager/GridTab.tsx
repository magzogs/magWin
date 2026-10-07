import { EDGES, type AppSettings, type SettingsPatch } from '@magwin/core';
import { useCallback, useState, type ReactNode } from 'react';
import { useApi } from '../../api/ApiContext';
import { EDGE_LABELS, errorMessage, MODIFIER_LABELS } from '../../i18n/ko';
import { RangeField, Toggle } from './fields';
import { PresetEditor } from './PresetEditor';
import { SettingsSidebar, type SidebarItem } from './SettingsSidebar';
import { useLive } from './useLive';

type Update = (patch: SettingsPatch) => void;

type SectionId = 'presets' | 'trigger' | 'placement' | 'layouts';

const SECTIONS: readonly SidebarItem<SectionId>[] = [
  { id: 'presets', label: '팔레트 그리드' },
  { id: 'trigger', label: '가장자리 감지' },
  { id: 'placement', label: '팔레트와 배치' },
  { id: 'layouts', label: '레이아웃' },
];

function TriggerSettings({
  trigger,
  update,
}: {
  trigger: AppSettings['trigger'];
  update: Update;
}): ReactNode {
  return (
    <fieldset className="card">
      <legend>가장자리 감지</legend>
      <Toggle
        label="엣지 스냅 사용"
        checked={trigger.enabled}
        onChange={(enabled) => {
          update({ trigger: { enabled } });
        }}
      />
      <div className="field">
        <span className="field-label">감지할 가장자리</span>
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
              {EDGE_LABELS[edge]}
            </label>
          ))}
        </div>
      </div>
      <RangeField
        label="머무름 시간"
        value={trigger.dwellMs}
        min={0}
        max={1500}
        step={50}
        unit="ms"
        hint="가장자리 위에서 이만큼 멈춰 있어야 팔레트가 떠요. 창 크기 조절과 겹치지 않게 해 줘요."
        onCommit={(dwellMs) => {
          update({ trigger: { dwellMs } });
        }}
      />
      <RangeField
        label="감지 폭"
        value={trigger.bandPx}
        min={2}
        max={24}
        unit="px"
        onCommit={(bandPx) => {
          update({ trigger: { bandPx } });
        }}
      />
      <label className="field">
        <span className="field-label">함께 누를 키</span>
        <select
          value={trigger.modifier}
          onChange={(event) => {
            update({
              trigger: { modifier: event.target.value as AppSettings['trigger']['modifier'] },
            });
          }}
        >
          {Object.entries(MODIFIER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}

function PlacementSettings({
  settings,
  update,
}: {
  settings: AppSettings;
  update: Update;
}): ReactNode {
  return (
    <fieldset className="card">
      <legend>팔레트와 배치</legend>
      <RangeField
        label="그리드 크기"
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
        label="닫힘 지연"
        value={settings.palette.hideDelayMs}
        min={100}
        max={3000}
        step={50}
        unit="ms"
        hint="커서가 팔레트를 벗어난 뒤 이 시간이 지나면 닫혀요."
        onCommit={(hideDelayMs) => {
          update({ palette: { hideDelayMs } });
        }}
      />
      <RangeField
        label="창 간격"
        value={settings.grid.gapPx}
        min={0}
        max={64}
        unit="px"
        hint="창과 창, 창과 화면 가장자리 사이 여백"
        onCommit={(gapPx) => {
          update({ grid: { gapPx } });
        }}
      />
    </fieldset>
  );
}

function LayoutSettings({
  settings,
  update,
}: {
  settings: AppSettings;
  update: Update;
}): ReactNode {
  const [excluded, setExcluded] = useState(settings.layouts.excludedBundleIds.join('\n'));
  return (
    <fieldset className="card">
      <legend>레이아웃</legend>
      <Toggle
        label="실행 중이 아닌 앱 실행"
        checked={settings.layouts.launchMissingApps}
        hint="복원할 때 해당 Desktop으로 이동한 뒤 앱을 실행해요."
        onChange={(launchMissingApps) => {
          update({ layouts: { launchMissingApps } });
        }}
      />
      <Toggle
        label="전역 단축키 (⌃⌥⌘S 저장, ⌃⌥⌘1~9 복원)"
        checked={settings.layouts.hotkeysEnabled}
        onChange={(hotkeysEnabled) => {
          update({ layouts: { hotkeysEnabled } });
        }}
      />
      <label className="field">
        <span className="field-label">저장할 때 기본으로 빼는 앱 (번들 ID, 한 줄에 하나)</span>
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
      <Toggle
        label="로그인 시 자동 실행"
        checked={settings.general.launchAtLogin}
        onChange={(launchAtLogin) => {
          update({ general: { launchAtLogin } });
        }}
      />
    </fieldset>
  );
}

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
      return <TriggerSettings trigger={settings.trigger} update={update} />;
    case 'placement':
      return <PlacementSettings settings={settings} update={update} />;
    case 'layouts':
      return <LayoutSettings settings={settings} update={update} />;
  }
}

/**
 * Feature 1 settings plus layout options, one section at a time: the sidebar on the left picks
 * the section shown on the right. Every change is validated by the main process.
 */
export function GridTab(): ReactNode {
  const api = useApi();
  const settings = useLive(api.settings.get, api.settings.onChanged);
  const [section, setSection] = useState<SectionId>('presets');
  const [error, setError] = useState<string | null>(null);

  const update = useCallback<Update>(
    (patch) => {
      setError(null);
      void api.settings.update(patch).then((result) => {
        if (!result.ok) setError(errorMessage(result.code));
      });
    },
    [api],
  );

  if (settings === null) {
    return <p className="muted">불러오는 중…</p>;
  }
  return (
    <section className="grid-tab settings-split">
      <SettingsSidebar
        label="설정 섹션"
        items={SECTIONS}
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
            {error}
          </p>
        )}
        <SectionBody section={section} settings={settings} update={update} />
      </div>
    </section>
  );
}
