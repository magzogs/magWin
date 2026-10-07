import { useState, type ReactNode } from 'react';
import type { MainTab } from '../../../../shared/contracts';
import { docUrl } from '../../../../shared/links';
import { useI18n } from '../../i18n/I18nContext';
import { helpQuestions, helpTopics, searchHelp } from './helpContent';

/**
 * magWin help: search, topic cards that open the docs site, and short answers that work
 * offline. Modeled on a help center front page.
 */
export function HelpTab({ onNavigate }: { onNavigate: (tab: MainTab) => void }): ReactNode {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const { topics, questions } = searchHelp(query, helpTopics(t), helpQuestions(t));
  const empty = topics.length === 0 && questions.length === 0;
  return (
    <section className="help-tab">
      <header className="help-hero">
        <h2>{t.help.title}</h2>
        <input
          type="search"
          aria-label={t.help.searchLabel}
          placeholder={t.help.searchPlaceholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </header>
      {topics.length === 0 ? null : (
        <ul className="topic-grid" aria-label={t.help.topicsLabel}>
          {topics.map((topic) => (
            <li key={topic.id}>
              <a
                className="topic-card"
                href={docUrl(topic.doc, locale)}
                target="_blank"
                rel="noreferrer"
              >
                <strong>{topic.title}</strong>
                <span className="muted">{topic.summary}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {questions.length === 0 ? null : (
        <div className="card faq">
          <h3>{t.help.faq}</h3>
          {questions.map((item) => (
            <details key={item.id}>
              <summary>{item.question}</summary>
              <p className="muted">{item.answer}</p>
            </details>
          ))}
        </div>
      )}
      {empty ? <p className="muted">{t.help.noResults(query.trim())}</p> : null}
      <footer className="help-footer">
        <span>{t.help.notFound}</span>
        <button
          type="button"
          className="primary"
          onClick={() => {
            onNavigate('support');
          }}
        >
          {t.help.getSupport}
        </button>
        <a href={docUrl('help', locale)} target="_blank" rel="noreferrer">
          {t.help.allHelp}
        </a>
      </footer>
    </section>
  );
}
