import { useEffect, useState, type ReactNode } from 'react';
import type { AppInfo, MainTab } from '../../../../shared/contracts';
import { SUPPORT_EMAIL, supportMailto } from '../../../../shared/links';
import { useApi } from '../../api/ApiContext';
import { useI18n } from '../../i18n/I18nContext';
import { buildDiagnostics } from './supportReport';
import { useLive } from '../../api/useLive';

type CopyState = 'idle' | 'copied' | 'failed';

function DiagnosticsCard({ text }: { text: string }): ReactNode {
  const { t } = useI18n();
  const s = t.support;
  const [copy, setCopy] = useState<CopyState>('idle');
  const body = `\n\n---\n${text}`;
  return (
    <article className="card support-step">
      <h3>
        <span className="step-number">3</span> {s.stepContact}
      </h3>
      <p className="muted">{s.contactBody(SUPPORT_EMAIL)}</p>
      <pre className="diagnostics" aria-label={s.diagnostics}>
        {text}
      </pre>
      <div className="inline">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(text).then(
              () => {
                setCopy('copied');
              },
              () => {
                setCopy('failed');
              },
            );
          }}
        >
          {s.copy}
        </button>
        <a className="button primary" href={supportMailto(s.mailSubject, body)}>
          {s.email}
        </a>
        <span role="status" className="muted">
          {copy === 'copied' ? s.copied : copy === 'failed' ? s.copyFailed : ''}
        </span>
      </div>
    </article>
  );
}

/** How to get support: self-service first, then a mail with diagnostics attached. */
export function SupportTab({ onNavigate }: { onNavigate: (tab: MainTab) => void }): ReactNode {
  const api = useApi();
  const { t } = useI18n();
  const s = t.support;
  const status = useLive(api.system.status, api.system.onStatus);
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    let active = true;
    void api.system.about().then((loaded) => {
      if (active) setInfo(loaded);
    });
    return () => {
      active = false;
    };
  }, [api]);

  return (
    <section className="support-tab">
      <header className="section-head">
        <div>
          <h2>{s.title}</h2>
          <p className="muted">{s.intro}</p>
        </div>
      </header>
      <article className="card support-step">
        <h3>
          <span className="step-number">1</span> {s.stepHelp}
        </h3>
        <p className="muted">{s.stepHelpBody}</p>
        <button
          type="button"
          onClick={() => {
            onNavigate('help');
          }}
        >
          {s.openHelp}
        </button>
      </article>
      <article className="card support-step">
        <h3>
          <span className="step-number">2</span> {s.stepStatus}
        </h3>
        <p className="muted">{s.stepStatusBody}</p>
        <button
          type="button"
          onClick={() => {
            onNavigate('status');
          }}
        >
          {s.openStatus}
        </button>
      </article>
      {info === null ? null : <DiagnosticsCard text={buildDiagnostics(info, status)} />}
      <article className="card">
        <h3>{s.tipsTitle}</h3>
        <ul className="tips">
          {s.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
