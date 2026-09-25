import type { CaptureDraft, CaptureEntry, CaptureScope, SavedDisplay } from '@magwin/core';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MagWinApi } from '../../../../shared/api';
import { useApi } from '../../api/ApiContext';
import { LayoutPreview } from '../../components/LayoutPreview';
import { errorMessage } from '../../i18n/ko';
import './save.css';

export function defaultLayoutName(now: Date): string {
  const time = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${String(now.getMonth() + 1)}월 ${String(now.getDate())}일 ${time}`;
}

interface Capture {
  readonly draftId: string;
  readonly draft: CaptureDraft;
}

interface CaptureState {
  readonly capture: Capture | null;
  readonly included: ReadonlySet<string>;
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
          : { ...EMPTY, error: errorMessage(response.code) },
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
  return (
    <div className="segmented" role="radiogroup" aria-label="저장 범위">
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
          {value === 'all' ? '모든 Desktop' : '현재 Desktop만'}
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
  return (
    <ul className="entries" aria-label="저장할 창">
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
            <span className="title muted">{entry.window.title ?? '제목 없음'}</span>
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
        setSaveError(errorMessage(result.code));
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
  const [scope, setScope] = useState<CaptureScope>('all');
  const { capture, included, error, toggle } = useCapture(api, scope);
  const [name, setName] = useState(() => defaultLayoutName(now));
  const { save, saving, saveError } = useSave(api, capture, included);

  const { entries, displays, skippedFullscreen } = captureView(capture);
  const chosen = useMemo(
    () => entries.filter((e) => included.has(e.key)).map((e) => e.window),
    [entries, included],
  );
  const shownError = saveError ?? error;
  const canSave = isSavable({ capture, included, name, saving });

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
        <h1>현재 레이아웃 저장</h1>
        <ScopeToggle scope={scope} onChange={setScope} />
      </header>
      <LayoutPreview displays={displays} windows={chosen} />
      <EntryList entries={entries} included={included} onToggle={toggle} />
      {skippedFullscreen > 0 ? (
        <p className="muted">전체 화면 창 {skippedFullscreen}개는 저장하지 않아요.</p>
      ) : null}
      {shownError === null ? null : (
        <p className="error-text" role="alert">
          {shownError}
        </p>
      )}
      <footer>
        <input
          aria-label="레이아웃 이름"
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
          취소
        </button>
        <button type="submit" className="primary" disabled={!canSave}>
          저장
        </button>
      </footer>
    </form>
  );
}
