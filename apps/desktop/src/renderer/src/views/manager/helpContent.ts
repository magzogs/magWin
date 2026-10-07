import type { DocPath } from '../../../../shared/links';

export interface HelpTopic {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly doc: DocPath;
}

export interface HelpQuestion {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: 'getting-started',
    title: '시작하기',
    summary: '설치, 첫 실행, 메뉴 막대 아이콘과 권한 허용',
    doc: 'guide/getting-started',
  },
  {
    id: 'edge-snap',
    title: '엣지 그리드 스냅',
    summary: '창 가장자리에 머물러 팔레트를 띄우고 칸을 골라 창을 맞추기',
    doc: 'guide/edge-snap',
  },
  {
    id: 'layouts',
    title: '레이아웃 저장과 복원',
    summary: 'Desktop까지 기억하는 창 배치, 전역 단축키, 되돌리기',
    doc: 'guide/layouts',
  },
  {
    id: 'troubleshooting',
    title: '문제 해결',
    summary: '팔레트가 안 뜰 때, 권한 문제, Desktop 전환 실패, 도우미 오류',
    doc: 'guide/troubleshooting',
  },
  {
    id: 'get-support',
    title: '지원 받기',
    summary: '문의하는 방법과 함께 보내면 좋은 정보',
    doc: 'guide/get-support',
  },
];

export const HELP_QUESTIONS: readonly HelpQuestion[] = [
  {
    id: 'palette',
    question: '팔레트가 뜨지 않아요',
    answer:
      '권한 및 상태 탭에서 손쉬운 사용이 허용됐는지, 메뉴 막대의 "엣지 스냅 사용"이 켜져 있는지 확인하세요. 모서리가 아닌 가장자리 중간에서 잠시 멈춰 보세요.',
  },
  {
    id: 'permission',
    question: '권한을 줬는데도 동작하지 않아요',
    answer:
      '시스템 설정 › 손쉬운 사용 목록에서 magWin을 지웠다가 다시 추가한 뒤 앱을 다시 시작하세요.',
  },
  {
    id: 'desktop',
    question: 'Desktop이 전환되지 않아요',
    answer:
      '키보드 설정 › 키보드 단축키 › Mission Control에서 "Desktop N으로 전환" 또는 "왼쪽/오른쪽 Space로 이동"을 켜세요.',
  },
  {
    id: 'other-desktop',
    question: '다른 Desktop에 있는 창은 왜 옮겨지지 않나요?',
    answer:
      'macOS에는 다른 앱의 창을 Desktop 사이로 옮기는 공개 API가 없어요. 앱을 종료한 뒤 다시 복원하거나 Mission Control에서 끌어다 놓아 주세요.',
  },
  {
    id: 'grid',
    question: '팔레트 그리드 모양을 바꾸고 싶어요',
    answer:
      '설정 › 팔레트 그리드에서 그리드를 추가·삭제하고 순서를 바꿀 수 있어요. 사용자 정의 그리드는 팔레트에서 화살표로 바로 바꿔요.',
  },
];

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
