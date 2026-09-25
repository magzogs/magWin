import type { RestoreProgress, RestoreReport } from '@magwin/core';
import { useEffect, useState, type ReactNode } from 'react';
import { useApi } from '../../api/ApiContext';
import { issueMessage, progressMessage } from '../../i18n/ko';
import './progress.css';

/** A clean restore closes itself after this long; one with issues stays until dismissed. */
export const AUTO_CLOSE_MS = 4_000;

interface ProgressState {
  readonly layoutName: string;
  readonly total: number;
  readonly steps: readonly string[];
  readonly report: RestoreReport | null;
}

const EMPTY: ProgressState = { layoutName: '', total: 0, steps: [], report: null };

function reduce(state: ProgressState, progress: RestoreProgress): ProgressState {
  switch (progress.type) {
    case 'started':
      return {
        layoutName: progress.layoutName,
        total: progress.totalWindows,
        steps: [progressMessage(progress)],
        report: null,
      };
    case 'finished':
      return {
        ...state,
        report: progress.report,
        steps: [...state.steps, progressMessage(progress)],
      };
    case 'switching':
    case 'launching':
    case 'waiting':
    case 'placing':
      return { ...state, steps: [...state.steps.slice(-5), progressMessage(progress)] };
  }
}

/** Restore HUD: what magWin is doing right now, then a summary that explains any leftovers. */
export function ProgressApp(): ReactNode {
  const api = useApi();
  const [state, setState] = useState<ProgressState>(EMPTY);

  useEffect(
    () =>
      api.layouts.onProgress((progress) => {
        setState((current) => reduce(current, progress));
      }),
    [api],
  );

  const report = state.report;
  useEffect(() => {
    if (report === null || report.issues.length > 0) return;
    const timer = setTimeout(() => {
      api.windows.closeSelf();
    }, AUTO_CLOSE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [api, report]);

  return (
    <section className="progress-hud" aria-live="polite">
      <header>
        <strong>{state.layoutName === '' ? '레이아웃 복원' : `'${state.layoutName}' 복원`}</strong>
        <button
          type="button"
          aria-label="닫기"
          onClick={() => {
            api.windows.closeSelf();
          }}
        >
          ✕
        </button>
      </header>
      {report === null ? (
        <>
          <div className="spinner" aria-hidden />
          <ol className="steps">
            {state.steps.map((step, index) => (
              <li key={`${String(index)}-${step}`}>{step}</li>
            ))}
          </ol>
        </>
      ) : (
        <div className="summary">
          <p className={report.issues.length === 0 ? 'ok' : 'partial'}>
            {report.total}개 중 {report.placed}개 창을 배치했어요
          </p>
          {report.issues.length === 0 ? null : (
            <ul className="issues">
              {report.issues.map((issue, index) => (
                <li key={`${String(index)}-${issue.appName}`}>{issueMessage(issue)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
