import type { ReactNode } from 'react';
import type { HotkeySummary, SystemStatus } from '../../../../shared/contracts';
import type { Messages } from '../../../../shared/i18n';
import { useApi } from '../../api/ApiContext';
import { useI18n } from '../../i18n/I18nContext';
import { useLive } from '../../api/useLive';

function Badge({ ok, label }: { ok: boolean; label: string }): ReactNode {
  return <span className={`badge ${ok ? 'ok' : 'bad'}`}>{label}</span>;
}

function helperText(t: Messages, status: SystemStatus): string {
  switch (status.helper) {
    case 'ready':
      return t.status.helperReady;
    case 'starting':
      return t.status.helperStarting;
    case 'failed':
      return status.helperMessage ?? t.status.helperFailed;
  }
}

function shortcutText(t: Messages, hotkeys: HotkeySummary): string {
  const direct =
    hotkeys.directDesktops.length > 0
      ? t.status.directOn(hotkeys.directDesktops.join(', '))
      : t.status.directOff;
  const move = hotkeys.moveLeft && hotkeys.moveRight ? t.status.moveOn : t.status.moveOff;
  return `${direct} · ${move}`;
}

function AccessibilityCard({
  granted,
  showDevHints,
}: {
  granted: boolean;
  showDevHints: boolean;
}): ReactNode {
  const api = useApi();
  const s = useI18n().t.status;
  return (
    <article className="card">
      <h3>
        {s.accessibility} <Badge ok={granted} label={granted ? s.allowed : s.required} />
      </h3>
      <p className="muted">{s.accessibilityBody}</p>
      {granted ? null : <p className="muted">{s.accessibilityStale}</p>}
      {showDevHints ? <p className="muted">{s.accessibilityDevHint}</p> : null}
      {granted ? null : (
        <div className="inline">
          <button
            type="button"
            className="primary"
            onClick={() => {
              void api.system.requestAccessibility();
            }}
          >
            {s.requestPermission}
          </button>
          <button
            type="button"
            onClick={() => {
              void api.system.openSettings('accessibility');
            }}
          >
            {s.openSystemSettings}
          </button>
        </div>
      )}
    </article>
  );
}

export interface StatusTabProps {
  /** Show hints that only apply to `pnpm dev` builds. Production builds hide them. */
  readonly showDevHints?: boolean;
}

/** Permissions and platform prerequisites, with direct links to System Settings. */
export function StatusTab({ showDevHints = import.meta.env.DEV }: StatusTabProps): ReactNode {
  const api = useApi();
  const { t } = useI18n();
  const status = useLive(api.system.status, api.system.onStatus);
  if (status === null) {
    return <p className="muted">{t.status.checking}</p>;
  }
  const s = t.status;
  const hotkeys = status.hotkeys;
  const canSwitch =
    hotkeys !== null &&
    (hotkeys.directDesktops.length > 0 || (hotkeys.moveLeft && hotkeys.moveRight));
  return (
    <section className="status-tab">
      <article className="card">
        <h3>
          {s.helper} <Badge ok={status.helper === 'ready'} label={helperText(t, status)} />
        </h3>
        <p className="muted">{s.helperBody}</p>
      </article>
      <AccessibilityCard granted={status.accessibility} showDevHints={showDevHints} />
      <article className="card">
        <h3>
          {s.shortcuts} <Badge ok={canSwitch} label={canSwitch ? s.available : s.off} />
        </h3>
        <p className="muted">
          {s.shortcutsBody} {hotkeys === null ? '' : shortcutText(t, hotkeys)}
        </p>
        <button
          type="button"
          onClick={() => {
            void api.system.openSettings('keyboardShortcuts');
          }}
        >
          {s.openShortcuts}
        </button>
      </article>
      <article className="card">
        <h3>
          {s.screenRecording}{' '}
          <Badge ok={status.screenRecording} label={status.screenRecording ? s.allowed : s.off} />
        </h3>
        <p className="muted">{s.screenRecordingBody}</p>
        <button
          type="button"
          onClick={() => {
            // macOS lists an app under Screen Recording only after it has asked for access.
            void api.system
              .requestScreenRecording()
              .finally(() => api.system.openSettings('screenRecording'));
          }}
        >
          {s.openScreenRecording}
        </button>
      </article>
    </section>
  );
}
