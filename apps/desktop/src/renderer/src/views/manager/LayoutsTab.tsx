import type { Layout, LayoutSummary } from '@magwin/core';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { ActionResult } from '../../../../shared/contracts';
import { useApi } from '../../api/ApiContext';
import { LayoutPreview } from '../../components/LayoutPreview';
import { errorMessage } from '../../i18n/ko';
import { useLive } from './useLive';

type Run = (action: () => Promise<ActionResult>) => void;

function LayoutTitle(props: { summary: LayoutSummary; index: number; run: Run }): ReactNode {
  const api = useApi();
  const { summary, index, run } = props;
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
          aria-label="새 이름"
          value={name}
          autoFocus
          maxLength={80}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <button type="submit">확인</button>
      </form>
    );
  }
  return (
    <div className="layout-title">
      <h3>
        {summary.name}
        {index < 9 ? <kbd title="전역 단축키">⌃⌥⌘{index + 1}</kbd> : null}
      </h3>
      <button
        type="button"
        onClick={() => {
          setRenaming(true);
        }}
      >
        이름 변경
      </button>
    </div>
  );
}

function LayoutActions(props: { summary: LayoutSummary; busy: boolean; run: Run }): ReactNode {
  const api = useApi();
  const { summary, busy, run } = props;
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
        전체 복원
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
        aria-label="위로"
        onClick={() => {
          move('up');
        }}
      >
        ↑
      </button>
      <button
        type="button"
        aria-label="아래로"
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
          if (window.confirm(`'${summary.name}' 레이아웃을 삭제할까요?`)) {
            run(() => api.layouts.remove(summary.id));
          }
        }}
      >
        삭제
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
          창 {summary.windowCount}개 · 앱 {summary.appCount}개
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
  const [message, setMessage] = useState<string | null>(null);
  const busy = status?.restoring ?? false;

  const run = useCallback<Run>((action) => {
    setMessage(null);
    void action().then((result) => {
      if (!result.ok) setMessage(errorMessage(result.code));
    });
  }, []);

  return (
    <section className="layouts-tab">
      <header className="section-head">
        <div>
          <h2>레이아웃</h2>
          <p className="muted">
            복원하면 저장된 Desktop으로 먼저 이동한 뒤, 그곳에서 앱을 실행하고 창을 배치해요.
          </p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            disabled={!(status?.canUndo ?? false) || busy}
            onClick={() => {
              run(() => api.layouts.undoRestore());
            }}
          >
            직전 배치로 되돌리기
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              api.layouts.openSaveHud();
            }}
          >
            현재 배치 저장… <kbd>⌃⌥⌘S</kbd>
          </button>
        </div>
      </header>
      {message === null ? null : (
        <p className="error-text" role="alert">
          {message}
        </p>
      )}
      {layouts !== null && layouts.length === 0 ? (
        <div className="empty">
          <p>아직 저장된 레이아웃이 없어요.</p>
          <p className="muted">
            창을 원하는 대로 배치한 뒤 ⌃⌥⌘S 또는 메뉴 막대 아이콘에서 저장하세요.
          </p>
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
