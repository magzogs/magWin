import type { CaptureDraft, CaptureEntry, CaptureScope, SavedDisplay } from '@magwin/core';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MagWinApi } from '../../../../shared/api';
import { useApi } from '../../api/ApiContext';
import { LayoutPreview } from '../../components/LayoutPreview';
import { errorMessage } from '../../../../shared/i18n';
import { useI18n } from '../../i18n/I18nContext';
import './save.css';

interface Capture {
  readonly draftId: string;
  readonly draft: CaptureDraft;
}

interface CaptureState {
  readonly capture: Capture | null;
  readonly included: ReadonlySet<string>;
  /** Error code, translated when rendered. */
  readonly error: string | null;
}

const EMPTY: CaptureState = { capture: null, included: new Set(), error: null };
const NO_ENTRIES: readonly CaptureEntry[] = [];
const NO_DISPLAYS: readonly SavedDisplay[] = [];

/** Captures the current arrangement for `scope`; recaptures whenever the scope changes. */
function useCapture(api: MagWinApi, scope: CaptureScope) {
  const [state, setState] = useState<CaptureState>(EMPTY);
  useEffect(() => {
    let cancelled = false;
    void api.layouts.capture(scope).then((response) => {
      if (cancelled) return;
      setState(
        response.ok
          ? {
              capture: { draftId: response.draftId, draft: response.draft },
              included: new Set(response.draft.entries.filter((e) => e.included).map((e) => e.key)),
              error: null,
            }
          : { ...EMPTY, error: response.code },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [api, scope]);
  const toggle = useCallback((key: string) => {
    setState((current) => {
      const included = new Set(current.included);
      if (!included.delete(key)) included.add(key);
      return { ...current, included };
    });
  }, []);
  return { ...state, toggle };
}

function ScopeToggle(props: {
  scope: CaptureScope;
  onChange: (scope: CaptureScope) => void;
}): ReactNode {
  const { t } = useI18n();
  return (
    <div className="segmented" role="radiogroup" aria-label={t.save.scope}>
      {(['all', 'currentDesktop'] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={props.scope === value}
          className={props.scope === value ? 'on' : ''}
          onClick={() => {
            props.onChange(value);
          }}
        >
          {value === 'all' ? t.save.scopeAll : t.save.scopeCurrent}
        </button>
      ))}
    </div>
  );
}

function desktopLabel(entry: CaptureEntry): string {
  return entry.window.desktop === null
    ? 'Desktop ?'
    : `Desktop ${String(entry.window.desktop.number)}`;
}

function EntryList(props: {
  entries: readonly CaptureEntry[];
  included: ReadonlySet<string>;
  onToggle: (key: string) => void;
}): ReactNode {
  const { t } = useI18n();
  return (
    <ul className="entries" aria-label={t.save.windows}>
      {props.entries.map((entry) => (
        <li key={entry.key}>
          <label>
            <input
              type="checkbox"
              checked={props.included.has(entry.key)}
              onChange={() => {
                props.onToggle(entry.key);
              }}
            />
            <span className="app">{entry.window.app.name}</span>
            <span className="title muted">{entry.window.title ?? t.save.untitled}</span>
            <span className="desktop muted">{desktopLabel(entry)}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/** Plain values for rendering; stable references while the capture does not change. */
function captureView(capture: Capture | null) {
  return {
    entries: capture?.draft.entries ?? NO_ENTRIES,
    displays: capture?.draft.displays ?? NO_DISPLAYS,
    skippedFullscreen: capture?.draft.skippedFullscreen ?? 0,
  };
}

function isSavable(input: {
  capture: Capture | null;
  included: ReadonlySet<string>;
  name: string;
  saving: boolean;
}): boolean {
  return (
    input.capture !== null && input.included.size > 0 && input.name.trim() !== '' && !input.saving
  );
}

/** Saves the chosen windows under `name`, closing the HUD on success. */
function useSave(api: MagWinApi, capture: Capture | null, included: ReadonlySet<string>) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const save = useCallback(
    async (name: string) => {
      if (capture === null) return;
      setSaving(true);
      const result = await api.layouts.save({
        draftId: capture.draftId,
        name: name.trim(),
        includedKeys: [...included],
      });
      setSaving(false);
      if (result.ok) {
        api.windows.closeSelf();
      } else {
        setSaveError(result.code);
      }
    },
    [api, capture, included],
  );
  return { save, saving, saveError };
}

/**
 * "Save current layout" HUD: shows what was captured per desktop, lets the user drop windows,
 * names the layout and saves it.
 */
export function SaveHudApp({ now = new Date() }: { now?: Date }): ReactNode {
  const api = useApi();
  const { t } = useI18n();
  const [scope, setScope] = useState<CaptureScope>('all');
  const { capture, included, error, toggle } = useCapture(api, scope);
  const [name, setName] = useState(() => t.save.defaultName(now));
  const { save, saving, saveError } = useSave(api, capture, included);

  const { entries, displays, skippedFullscreen } = captureView(capture);
  const chosen = useMemo(
    () => entries.filter((e) => included.has(e.key)).map((e) => e.window),
    [entries, included],
  );
  const shownError = saveError ?? error;
  const canSave = isSavable({ capture, included, name, saving });

  useEffect(() => {
    document.title = t.save.title;
  }, [t]);

  return (
    <form
      className="save-hud"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) void save(name);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') api.windows.closeSelf();
      }}
    >
      <header>
        <h1>{t.save.title}</h1>
        <ScopeToggle scope={scope} onChange={setScope} />
      </header>
      <LayoutPreview displays={displays} windows={chosen} />
      <EntryList entries={entries} included={included} onToggle={toggle} />
      {skippedFullscreen > 0 ? (
        <p className="muted">{t.save.skippedFullscreen(skippedFullscreen)}</p>
      ) : null}
      {shownError === null ? null : (
        <p className="error-text" role="alert">
          {errorMessage(t, shownError)}
        </p>
      )}
      <footer>
        <input
          aria-label={t.save.name}
          value={name}
          maxLength={80}
          autoFocus
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <button
          type="button"
          onClick={() => {
            api.windows.closeSelf();
          }}
        >
          {t.common.cancel}
        </button>
        <button type="submit" className="primary" disabled={!canSave}>
          {t.common.save}
        </button>
      </footer>
    </form>
  );
}
