import type { ReactNode } from 'react';
import type { HotkeySummary, SystemStatus } from '../../../../shared/contracts';
import { useApi } from '../../api/ApiContext';
import { useLive } from './useLive';

function Badge({ ok, label }: { ok: boolean; label: string }): ReactNode {
  return <span className={`badge ${ok ? 'ok' : 'bad'}`}>{label}</span>;
}

function helperText(status: SystemStatus): string {
  switch (status.helper) {
    case 'ready':
      return '실행 중';
    case 'starting':
      return '시작하는 중…';
    case 'failed':
      return status.helperMessage ?? '실행하지 못했어요';
  }
}

function shortcutText(hotkeys: HotkeySummary): string {
  const direct =
    hotkeys.directDesktops.length > 0
      ? `"Desktop N으로 전환" 켜짐: ${hotkeys.directDesktops.join(', ')}`
      : '"Desktop N으로 전환" 꺼짐';
  const move =
    hotkeys.moveLeft && hotkeys.moveRight
      ? '"왼쪽/오른쪽 Space로 이동" 켜짐'
      : '"왼쪽/오른쪽 Space로 이동" 꺼짐';
  return `${direct} · ${move}`;
}

/** Permissions and platform prerequisites, with direct links to System Settings. */
export function StatusTab(): ReactNode {
  const api = useApi();
  const status = useLive(api.system.status, api.system.onStatus);
  if (status === null) {
    return <p className="muted">확인하는 중…</p>;
  }
  const hotkeys = status.hotkeys;
  const canSwitch =
    hotkeys !== null &&
    (hotkeys.directDesktops.length > 0 || (hotkeys.moveLeft && hotkeys.moveRight));
  return (
    <section className="status-tab">
      <article className="card">
        <h3>
          네이티브 도우미 <Badge ok={status.helper === 'ready'} label={helperText(status)} />
        </h3>
        <p className="muted">
          다른 앱의 창을 찾고 옮기는 작은 Swift 프로그램이에요. 앱과 함께 실행돼요.
        </p>
      </article>
      <article className="card">
        <h3>
          손쉬운 사용{' '}
          <Badge ok={status.accessibility} label={status.accessibility ? '허용됨' : '필요'} />
        </h3>
        <p className="muted">
          창을 옮기고 Desktop을 전환하려면 시스템 설정 › 개인정보 보호 및 보안 › 손쉬운 사용에서
          magWin을 허용해야 해요. 개발 중(pnpm dev)에는 명령을 실행한 터미널 앱을 허용해 주세요.
        </p>
        {status.accessibility ? null : (
          <div className="inline">
            <button
              type="button"
              className="primary"
              onClick={() => {
                void api.system.requestAccessibility();
              }}
            >
              권한 요청
            </button>
            <button
              type="button"
              onClick={() => {
                void api.system.openSettings('accessibility');
              }}
            >
              시스템 설정 열기
            </button>
          </div>
        )}
      </article>
      <article className="card">
        <h3>
          Desktop 전환 단축키 <Badge ok={canSwitch} label={canSwitch ? '사용 가능' : '꺼짐'} />
        </h3>
        <p className="muted">
          macOS에는 Desktop을 옮기는 공개 API가 없어서, 키보드 설정 › 키보드 단축키 › Mission
          Control의 단축키를 magWin이 대신 눌러요. {hotkeys === null ? '' : shortcutText(hotkeys)}
        </p>
        <button
          type="button"
          onClick={() => {
            void api.system.openSettings('keyboardShortcuts');
          }}
        >
          키보드 단축키 설정 열기
        </button>
      </article>
      <article className="card">
        <h3>
          화면 기록 (선택){' '}
          <Badge ok={status.screenRecording} label={status.screenRecording ? '허용됨' : '꺼짐'} />
        </h3>
        <p className="muted">
          다른 Desktop에 있는 창의 제목을 읽을 때만 쓰여요. 없어도 저장·복원은 동작하지만, 같은 앱의
          창이 여러 개일 때 짝을 맞추는 정확도가 떨어질 수 있어요.
        </p>
        <button
          type="button"
          onClick={() => {
            void api.system.openSettings('screenRecording');
          }}
        >
          화면 기록 설정 열기
        </button>
      </article>
    </section>
  );
}
