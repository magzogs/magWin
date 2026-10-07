import type { Messages } from '../../../../shared/i18n';
import type { DocPath } from '../../../../shared/links';

type TopicId = keyof Messages['help']['topics'];
type QuestionId = keyof Messages['help']['questions'];

export interface HelpTopic {
  readonly id: TopicId;
  readonly title: string;
  readonly summary: string;
  readonly doc: DocPath;
}

export interface HelpQuestion {
  readonly id: QuestionId;
  readonly question: string;
  readonly answer: string;
}

/** Help center topics in display order, each backed by a docs page. */
const TOPIC_DOCS: readonly (readonly [TopicId, DocPath])[] = [
  ['getting-started', 'guide/getting-started'],
  ['edge-snap', 'guide/edge-snap'],
  ['layouts', 'guide/layouts'],
  ['troubleshooting', 'guide/troubleshooting'],
  ['get-support', 'guide/get-support'],
];

const QUESTION_IDS: readonly QuestionId[] = [
  'palette',
  'permission',
  'desktop',
  'other-desktop',
  'grid',
  'language',
];

export function helpTopics(t: Messages): readonly HelpTopic[] {
  return TOPIC_DOCS.map(([id, doc]) => ({ id, doc, ...t.help.topics[id] }));
}

export function helpQuestions(t: Messages): readonly HelpQuestion[] {
  return QUESTION_IDS.map((id) => ({ id, ...t.help.questions[id] }));
}

function matches(query: string, ...texts: readonly string[]): boolean {
  return texts.some((text) => text.toLocaleLowerCase().includes(query));
}

/** Case-insensitive search over titles and bodies; an empty query keeps everything. */
export function searchHelp(
  query: string,
  topics: readonly HelpTopic[],
  questions: readonly HelpQuestion[],
): { readonly topics: readonly HelpTopic[]; readonly questions: readonly HelpQuestion[] } {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === '') return { topics, questions };
  return {
    topics: topics.filter((topic) => matches(needle, topic.title, topic.summary)),
    questions: questions.filter((item) => matches(needle, item.question, item.answer)),
  };
}
