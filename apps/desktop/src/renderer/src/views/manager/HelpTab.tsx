import { useState, type ReactNode } from 'react';
import type { MainTab } from '../../../../shared/contracts';
import { docUrl } from '../../../../shared/links';
import { HELP_QUESTIONS, HELP_TOPICS, searchHelp } from './helpContent';

/**
 * magWin help: search, topic cards that open the docs site, and short answers that work
 * offline. Modeled on a help center front page.
 */
export function HelpTab({ onNavigate }: { onNavigate: (tab: MainTab) => void }): ReactNode {
  const [query, setQuery] = useState('');
  const { topics, questions } = searchHelp(query, HELP_TOPICS, HELP_QUESTIONS);
  const empty = topics.length === 0 && questions.length === 0;
  return (
    <section className="help-tab">
      <header className="help-hero">
        <h2>무엇을 도와드릴까요?</h2>
        <input
          type="search"
          aria-label="도움말 검색"
          placeholder="답을 검색하거나 아래 주제를 둘러보세요"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </header>
      {topics.length === 0 ? null : (
        <ul className="topic-grid" aria-label="도움말 주제">
          {topics.map((topic) => (
            <li key={topic.id}>
              <a className="topic-card" href={docUrl(topic.doc)} target="_blank" rel="noreferrer">
                <strong>{topic.title}</strong>
                <span className="muted">{topic.summary}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {questions.length === 0 ? null : (
        <div className="card faq">
          <h3>자주 묻는 질문</h3>
          {questions.map((item) => (
            <details key={item.id}>
              <summary>{item.question}</summary>
              <p className="muted">{item.answer}</p>
            </details>
          ))}
        </div>
      )}
      {empty ? <p className="muted">"{query.trim()}"에 대한 결과가 없어요.</p> : null}
      <footer className="help-footer">
        <span>원하는 답을 찾지 못했나요?</span>
        <button
          type="button"
          className="primary"
          onClick={() => {
            onNavigate('support');
          }}
        >
          지원 받기
        </button>
        <a href={docUrl('help')} target="_blank" rel="noreferrer">
          도움말 센터 전체 보기
        </a>
      </footer>
    </section>
  );
}
