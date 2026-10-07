import { useEffect, useState, type ReactNode } from 'react';
import type { AppInfo, MainTab } from '../../../../shared/contracts';
import { SUPPORT_EMAIL, supportMailto } from '../../../../shared/links';
import { useApi } from '../../api/ApiContext';
import { buildDiagnostics } from './supportReport';
import { useLive } from './useLive';

type CopyState = 'idle' | 'copied' | 'failed';

const TIPS: readonly string[] = [
  '오류 메시지나 스크린샷, 문제가 처음 생긴 때를 함께 알려 주세요.',
  '어떤 순서로 하면 문제가 다시 생기는지 적어 주세요.',
  '같은 문제로 새 문의를 또 보내기보다 받은 메일에 답장해 주세요.',
  '진단 정보에는 창 제목, 앱 이름, 레이아웃 이름이 들어가지 않아요.',
];

function DiagnosticsCard({ text }: { text: string }): ReactNode {
  const [copy, setCopy] = useState<CopyState>('idle');
  const body = `\n\n---\n${text}`;
  return (
    <article className="card support-step">
      <h3>
        <span className="step-number">3</span> 문의하기
      </h3>
      <p className="muted">
        문의는 이메일({SUPPORT_EMAIL})로 받아요. 아래 진단 정보를 함께 보내 주시면 더 빨리 도와드릴
        수 있어요.
      </p>
      <pre className="diagnostics" aria-label="진단 정보">
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
          진단 정보 복사
        </button>
        <a className="button primary" href={supportMailto('magWin 문의', body)}>
          이메일로 문의
        </a>
        <span role="status" className="muted">
          {copy === 'copied' ? '복사했어요' : copy === 'failed' ? '복사하지 못했어요' : ''}
        </span>
      </div>
    </article>
  );
}

/** How to get support: self-service first, then a mail with diagnostics attached. */
export function SupportTab({ onNavigate }: { onNavigate: (tab: MainTab) => void }): ReactNode {
  const api = useApi();
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
          <h2>지원 받기</h2>
          <p className="muted">대부분의 문제는 도움말과 권한 확인으로 바로 해결돼요.</p>
        </div>
      </header>
      <article className="card support-step">
        <h3>
          <span className="step-number">1</span> 도움말에서 답 찾기
        </h3>
        <p className="muted">자주 묻는 질문과 사용 안내를 검색해 보세요.</p>
        <button
          type="button"
          onClick={() => {
            onNavigate('help');
          }}
        >
          도움말 열기
        </button>
      </article>
      <article className="card support-step">
        <h3>
          <span className="step-number">2</span> 권한과 상태 확인
        </h3>
        <p className="muted">
          손쉬운 사용 권한, Desktop 전환 단축키, 네이티브 도우미 상태를 확인해요.
        </p>
        <button
          type="button"
          onClick={() => {
            onNavigate('status');
          }}
        >
          권한 및 상태 열기
        </button>
      </article>
      {info === null ? null : <DiagnosticsCard text={buildDiagnostics(info, status)} />}
      <article className="card">
        <h3>문의할 때 알아 두세요</h3>
        <ul className="tips">
          {TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
