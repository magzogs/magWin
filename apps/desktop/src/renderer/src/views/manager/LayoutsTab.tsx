import type { Layout, LayoutSummary } from '@magwin/core';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { ActionResult } from '../../../../shared/contracts';
import { useApi } from '../../api/ApiContext';
import { LayoutPreview } from '../../components/LayoutPreview';
import { errorMessage } from '../../../../shared/i18n';
import { useI18n } from '../../i18n/I18nContext';
import { useLive } from '../../api/useLive';

type Run = (action: () => Promise<ActionResult>) => void;

function LayoutTitle(props: { summary: LayoutSummary; index: number; run: Run }): ReactNode {
  const api = useApi();
  const { summary, index, run } = props;
  const { t } = useI18n();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(summary.name);
  if (renaming) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setRenaming(false);
          run(() => api.layouts.rename({ id: summary.id, name }));
        }}
      >
        <input
          aria-label={t.layouts.newName}
          value={name}
          autoFocus
          maxLength={80}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <button type="submit">{t.common.confirm}</button>
      </form>
    );
  }
  return (
    <div className="layout-title">
      <h3>
        {summary.name}
        {index < 9 ? <kbd title={t.layouts.hotkey}>⌃⌥⌘{index + 1}</kbd> : null}
      </h3>
      <button
        type="button"
        onClick={() => {
          setRenaming(true);
        }}
      >
        {t.layouts.rename}
      </button>
    </div>
  );
}

function LayoutActions(props: { summary: LayoutSummary; busy: boolean; run: Run }): ReactNode {
  const api = useApi();
  const { summary, busy, run } = props;
  const { t } = useI18n();
  const restore = (desktopNumber: number | null): void => {
    run(() => api.layouts.restore({ id: summary.id, desktopNumber }));
  };
  const move = (direction: 'up' | 'down'): void => {
    run(() => api.layouts.move({ id: summary.id, direction }));
  };
  return (
    <div className="layout-actions">
      <button
        type="button"
        className="primary"
        disabled={busy}
        onClick={() => {
          restore(null);
        }}
      >
        {t.layouts.restoreAll}
      </button>
      {summary.desktopNumbers.length > 1
        ? summary.desktopNumbers.map((number) => (
            <button
              key={number}
              type="button"
              disabled={busy}
              onClick={() => {
                restore(number);
              }}
            >
              Desktop {number}
            </button>
          ))
        : null}
      <span className="spacer" />
      <button
        type="button"
        aria-label={t.layouts.moveUp}
        onClick={() => {
          move('up');
        }}
      >
        ↑
      </button>
      <button
        type="button"
        aria-label={t.layouts.moveDown}
        onClick={() => {
          move('down');
        }}
      >
        ↓
      </button>
      <button
        type="button"
        className="danger"
        onClick={() => {
          if (window.confirm(t.layouts.confirmDelete(summary.name))) {
            run(() => api.layouts.remove(summary.id));
          }
        }}
      >
        {t.common.remove}
      </button>
    </div>
  );
}

function LayoutCard(props: {
  summary: LayoutSummary;
  index: number;
  busy: boolean;
  run: Run;
}): ReactNode {
  const api = useApi();
  const { summary } = props;
  const { t } = useI18n();
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    let active = true;
    void api.layouts.get(summary.id).then((loaded) => {
      if (active) setLayout(loaded);
    });
    return () => {
      active = false;
    };
  }, [api, summary.id, summary.updatedAt]);

  return (
    <li className="layout-card">
      <div className="layout-head">
        <LayoutTitle summary={summary} index={props.index} run={props.run} />
        <p className="muted">
          {t.layouts.counts(summary.windowCount, summary.appCount)}
          {summary.desktopNumbers.length > 0
            ? ` · Desktop ${summary.desktopNumbers.join(', ')}`
            : ''}
        </p>
      </div>
      {layout === null ? null : (
        <LayoutPreview displays={layout.displays} windows={layout.windows} compact />
      )}
      <LayoutActions summary={summary} busy={props.busy} run={props.run} />
    </li>
  );
}

/** Saved layouts: restore all or one desktop, reorder (= hotkey slots), rename, delete. */
export function LayoutsTab(): ReactNode {
  const api = useApi();
  const layouts = useLive(api.layouts.list, api.layouts.onChanged);
  const status = useLive(api.system.status, api.system.onStatus);
  const { t } = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const busy = status?.restoring ?? false;

  const run = useCallback<Run>((action) => {
    setMessage(null);
    void action().then((result) => {
      if (!result.ok) setMessage(result.code);
    });
  }, []);

  return (
    <section className="layouts-tab">
      <header className="section-head">
        <div>
          <h2>{t.layouts.title}</h2>
          <p className="muted">{t.layouts.intro}</p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            disabled={!(status?.canUndo ?? false) || busy}
            onClick={() => {
              run(() => api.layouts.undoRestore());
            }}
          >
            {t.layouts.undo}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              api.layouts.openSaveHud();
            }}
          >
            {t.layouts.saveCurrent} <kbd>⌃⌥⌘S</kbd>
          </button>
        </div>
      </header>
      {message === null ? null : (
        <p className="error-text" role="alert">
          {errorMessage(t, message)}
        </p>
      )}
      {layouts !== null && layouts.length === 0 ? (
        <div className="empty">
          <p>{t.layouts.empty}</p>
          <p className="muted">{t.layouts.emptyHint}</p>
        </div>
      ) : (
        <ul className="layout-list">
          {(layouts ?? []).map((summary, index) => (
            <LayoutCard key={summary.id} summary={summary} index={index} busy={busy} run={run} />
          ))}
        </ul>
      )}
    </section>
  );
}
