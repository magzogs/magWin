import Link from '@docusaurus/Link';
import { translate } from '@docusaurus/Translate';
import Layout from '@theme/Layout';
import { useState, type ReactNode } from 'react';
import styles from './help.module.css';

/** CSS module lookups are typed as possibly undefined. */
function cls(name: string): string {
  return styles[name] ?? '';
}

interface Topic {
  readonly to: string;
  readonly title: string;
  readonly summary: string;
}

function topics(): readonly Topic[] {
  return [
    {
      to: '/guide/getting-started',
      title: translate({ id: 'help.topic.start.title', message: '시작하기' }),
      summary: translate({
        id: 'help.topic.start.summary',
        message: '설치, 첫 실행, 메뉴 막대 아이콘과 권한 허용',
      }),
    },
    {
      to: '/guide/edge-snap',
      title: translate({ id: 'help.topic.snap.title', message: '엣지 그리드 스냅' }),
      summary: translate({
        id: 'help.topic.snap.summary',
        message: '창 가장자리에 머물러 팔레트를 띄우고 칸을 골라 창을 맞추기',
      }),
    },
    {
      to: '/guide/layouts',
      title: translate({ id: 'help.topic.layouts.title', message: '레이아웃 저장과 복원' }),
      summary: translate({
        id: 'help.topic.layouts.summary',
        message: 'Desktop까지 기억하는 창 배치, 전역 단축키, 되돌리기',
      }),
    },
    {
      to: '/guide/troubleshooting',
      title: translate({ id: 'help.topic.trouble.title', message: '문제 해결' }),
      summary: translate({
        id: 'help.topic.trouble.summary',
        message: '팔레트가 안 뜰 때, 권한 문제, Desktop 전환 실패, 도우미 오류',
      }),
    },
    {
      to: '/guide/get-support',
      title: translate({ id: 'help.topic.support.title', message: '지원 받기' }),
      summary: translate({
        id: 'help.topic.support.summary',
        message: '문의하는 방법과 함께 보내면 좋은 정보',
      }),
    },
    {
      to: '/architecture/overview',
      title: translate({ id: 'help.topic.dev.title', message: '개발자 문서' }),
      summary: translate({
        id: 'help.topic.dev.summary',
        message: '구조, 헬퍼 프로토콜, 설계 결정 기록',
      }),
    },
  ];
}

function matching(all: readonly Topic[], query: string): readonly Topic[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === '') return all;
  return all.filter((topic) =>
    `${topic.title} ${topic.summary}`.toLocaleLowerCase().includes(needle),
  );
}

/** Help center front page: search over topics, topic cards, and a way to reach support. */
export default function Help(): ReactNode {
  const [query, setQuery] = useState('');
  const shown = matching(topics(), query);
  const title = translate({ id: 'help.title', message: '무엇을 도와드릴까요?' });
  return (
    <Layout title={translate({ id: 'help.pageTitle', message: 'OrgaWin 도움말' })}>
      <header className={cls('hero')}>
        <h1>{title}</h1>
        <input
          type="search"
          className={cls('search')}
          aria-label={translate({ id: 'help.search.label', message: '도움말 검색' })}
          placeholder={translate({
            id: 'help.search.placeholder',
            message: '답을 검색하거나 아래 주제를 둘러보세요',
          })}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </header>
      <main className={cls('main')}>
        {shown.length === 0 ? (
          <p className={cls('empty')}>
            {translate({ id: 'help.search.empty', message: '검색 결과가 없어요.' })}
          </p>
        ) : (
          <ul className={cls('grid')}>
            {shown.map((topic) => (
              <li key={topic.to}>
                <Link className={cls('card')} to={topic.to}>
                  <strong>{topic.title}</strong>
                  <span>{topic.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <section className={cls('support')}>
          <p>{translate({ id: 'help.support.prompt', message: '원하는 답을 찾지 못했나요?' })}</p>
          <Link className="button button--primary" to="/guide/get-support">
            {translate({ id: 'help.support.button', message: '지원 받기' })}
          </Link>
        </section>
      </main>
    </Layout>
  );
}
