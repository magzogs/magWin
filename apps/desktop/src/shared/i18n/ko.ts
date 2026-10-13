/**
 * Korean catalog, the source of truth: `Messages` is its shape, so every other language must
 * provide the same keys and the same message functions (see docs ADR-005).
 */

function time(now: Date): string {
  return now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const ko = {
  common: {
    loading: '불러오는 중…',
    cancel: '취소',
    save: '저장',
    close: '닫기',
    remove: '삭제',
    confirm: '확인',
    unknownError: (code: string): string => `알 수 없는 오류 (${code})`,
  },
  errors: {
    accessibilityDenied: '손쉬운 사용 권한이 필요해요. 권한 및 상태 탭에서 허용해 주세요.',
    windowNotFound: '창을 찾을 수 없어요. 닫혔거나 다른 Desktop으로 옮겨졌어요.',
    notResizable: '이 창은 위치나 크기를 바꿀 수 없어요.',
    fullscreen: '전체 화면 창은 옮길 수 없어요.',
    invalidRange: '선택한 칸이 올바르지 않아요.',
    paletteClosed: '팔레트가 이미 닫혔어요.',
    invalidPreset: '그리드 크기가 올바르지 않아요.',
    helperTimeout: '네이티브 도우미가 응답하지 않아요.',
    helperClosed: '네이티브 도우미가 종료됐어요.',
    helperProtocol: '네이티브 도우미 버전이 맞지 않아요. 다시 빌드해 주세요.',
    layoutNotFound: '레이아웃을 찾을 수 없어요.',
    restoreInProgress: '이미 복원 중이에요.',
    nothingToUndo: '되돌릴 배치가 없어요.',
    draftExpired: '캡처가 만료됐어요. 다시 캡처해 주세요.',
    emptyLayout: '저장할 창을 하나 이상 선택해 주세요.',
    noShortcut: 'Desktop 전환 단축키가 꺼져 있어요.',
    switchTimeout: 'Desktop 전환이 확인되지 않았어요.',
    spaceNotFound: 'Desktop을 찾을 수 없어요.',
    appNotFound: '앱이 설치되어 있지 않아요.',
    launchFailed: '앱을 실행하지 못했어요.',
    invalidSettings: '설정 값이 올바르지 않아요.',
  },
  issues: {
    desktopMissing: (name: string, desktop: number): string =>
      `${name}: Desktop ${String(desktop)}이 없어서 현재 Desktop에 배치했어요.`,
    desktopSwitchFailed: (name: string, desktop: number, reason: string): string =>
      `${name}: Desktop ${String(desktop)}로 전환하지 못했어요. ${reason}`,
    appNotRunning: (name: string): string => `${name}: 앱이 실행 중이 아니에요.`,
    windowNotFound: (name: string): string => `${name}: 창을 찾지 못했어요.`,
    onOtherDesktop: (name: string, desktop: string): string =>
      `${name}: 창이 Desktop ${desktop}에 있어요. 옮기려면 앱을 종료한 뒤 다시 복원하거나 Mission Control에서 끌어다 놓아 주세요.`,
  },
  progress: {
    started: (layout: string): string => `'${layout}' 복원을 시작해요`,
    switching: (desktop: number): string => `Desktop ${String(desktop)}로 이동하는 중…`,
    launching: (app: string): string => `${app} 실행 중…`,
    waiting: '창이 뜨기를 기다리는 중…',
    placing: (app: string): string => `${app} 배치 중…`,
    finished: (placed: number, total: number): string =>
      `${String(total)}개 중 ${String(placed)}개 창을 배치했어요`,
    title: (layout: string): string => (layout === '' ? '레이아웃 복원' : `'${layout}' 복원`),
  },
  modifiers: {
    none: '없음 (그냥 머무르기)',
    option: '⌥ Option',
    control: '⌃ Control',
    command: '⌘ Command',
    shift: '⇧ Shift',
  },
  edges: { top: '위', bottom: '아래', left: '왼쪽', right: '오른쪽' },
  tabs: {
    layouts: '레이아웃',
    settings: '설정',
    status: '권한 및 상태',
    help: 'OrgaWin 도움말',
    support: '지원 받기',
  },
  settings: {
    sectionsLabel: '설정 섹션',
    sections: {
      presets: '팔레트 그리드',
      trigger: '가장자리 감지',
      placement: '팔레트와 배치',
      layouts: '레이아웃',
      general: '일반',
    },
    trigger: {
      enabled: '엣지 스냅 사용',
      edges: '감지할 가장자리',
      dwell: '머무름 시간',
      dwellHint:
        '가장자리 위에서 이만큼 멈춰 있어야 팔레트가 떠요. 창 크기 조절과 겹치지 않게 해 줘요.',
      band: '감지 폭',
      modifier: '함께 누를 키',
    },
    placement: {
      gridSize: '그리드 크기',
      hideDelay: '닫힘 지연',
      hideDelayHint: '커서가 팔레트를 벗어난 뒤 이 시간이 지나면 닫혀요.',
      gap: '창 간격',
      gapHint: '창과 창, 창과 화면 가장자리 사이 여백',
    },
    layouts: {
      launchMissing: '실행 중이 아닌 앱 실행',
      launchMissingHint: '복원할 때 해당 Desktop으로 이동한 뒤 앱을 실행해요.',
      hotkeys: '전역 단축키 (⌃⌥⌘S 저장, ⌃⌥⌘1~9 복원)',
      excluded: '저장할 때 기본으로 빼는 앱 (번들 ID, 한 줄에 하나)',
    },
    general: {
      language: '언어',
      languageSystem: '시스템 설정 따르기',
      languageHint: '메뉴 막대 메뉴와 열려 있는 창에 바로 적용돼요.',
      launchAtLogin: '로그인 시 자동 실행',
    },
  },
  presets: {
    intro:
      '가로 칸 × 세로 칸. 창 가장자리에 머무르면 이 순서대로 나타나요. 사용자 정의 그리드는 팔레트에서 화살표로 바로 바꿀 수 있어요.',
    custom: (size: string): string => `사용자 정의 (${size})`,
    moveEarlier: (name: string): string => `${name} 앞으로`,
    moveLater: (name: string): string => `${name} 뒤로`,
    removeNamed: (name: string): string => `${name} 삭제`,
    cols: '가로',
    rows: '세로',
    colsLabel: '가로 칸 수',
    rowsLabel: '세로 칸 수',
    add: '그리드 추가',
    addCustom: '사용자 정의 그리드 추가',
    outOfRange: (min: number, max: number): string =>
      `가로·세로는 ${String(min)}~${String(max)} 사이여야 해요.`,
    duplicate: (label: string): string => `${label} 그리드는 이미 있어요.`,
  },
  layouts: {
    title: '레이아웃',
    intro: '복원하면 저장된 Desktop으로 먼저 이동한 뒤, 그곳에서 앱을 실행하고 창을 배치해요.',
    undo: '직전 배치로 되돌리기',
    saveCurrent: '현재 배치 저장…',
    empty: '아직 저장된 레이아웃이 없어요.',
    emptyHint: '창을 원하는 대로 배치한 뒤 ⌃⌥⌘S 또는 메뉴 막대 아이콘에서 저장하세요.',
    newName: '새 이름',
    rename: '이름 변경',
    hotkey: '전역 단축키',
    restoreAll: '전체 복원',
    moveUp: '위로',
    moveDown: '아래로',
    confirmDelete: (name: string): string => `'${name}' 레이아웃을 삭제할까요?`,
    counts: (windows: number, apps: number): string =>
      `창 ${String(windows)}개 · 앱 ${String(apps)}개`,
  },
  status: {
    checking: '확인하는 중…',
    helper: '네이티브 도우미',
    helperReady: '실행 중',
    helperStarting: '시작하는 중…',
    helperFailed: '실행하지 못했어요',
    helperBody: '다른 앱의 창을 찾고 옮기는 작은 Swift 프로그램이에요. 앱과 함께 실행돼요.',
    accessibility: '손쉬운 사용',
    allowed: '허용됨',
    required: '필요',
    off: '꺼짐',
    available: '사용 가능',
    accessibilityBody:
      '창을 옮기고 Desktop을 전환하려면 시스템 설정 › 개인정보 보호 및 보안 › 손쉬운 사용에서 OrgaWin을 허용해야 해요.',
    accessibilityStale:
      '목록에서 OrgaWin이 이미 켜져 있는데도 계속 필요로 나오면, OrgaWin을 선택해 − 버튼으로 지운 뒤 권한 요청을 다시 눌러 주세요. 이전 버전에 대한 허용이 남아 있는 경우예요.',
    accessibilityDevHint: '개발 중(pnpm dev)에는 명령을 실행한 터미널 앱을 허용해 주세요.',
    requestPermission: '권한 요청',
    openSystemSettings: '시스템 설정 열기',
    shortcuts: 'Desktop 전환 단축키',
    shortcutsBody:
      'macOS에는 Desktop을 옮기는 공개 API가 없어서, 키보드 설정 › 키보드 단축키 › Mission Control의 단축키를 OrgaWin이 대신 눌러요.',
    directOn: (desktops: string): string => `"Desktop N으로 전환" 켜짐: ${desktops}`,
    directOff: '"Desktop N으로 전환" 꺼짐',
    moveOn: '"왼쪽/오른쪽 Space로 이동" 켜짐',
    moveOff: '"왼쪽/오른쪽 Space로 이동" 꺼짐',
    openShortcuts: '키보드 단축키 설정 열기',
    screenRecording: '화면 기록 (선택)',
    screenRecordingBody:
      '다른 Desktop에 있는 창의 제목을 읽을 때만 쓰여요. 없어도 저장·복원은 동작하지만, 같은 앱의 창이 여러 개일 때 짝을 맞추는 정확도가 떨어질 수 있어요. 허용한 뒤에는 OrgaWin을 다시 실행해야 적용돼요.',
    openScreenRecording: '화면 기록 설정 열기',
  },
  help: {
    title: '무엇을 도와드릴까요?',
    searchLabel: '도움말 검색',
    searchPlaceholder: '답을 검색하거나 아래 주제를 둘러보세요',
    topicsLabel: '도움말 주제',
    faq: '자주 묻는 질문',
    noResults: (query: string): string => `"${query}"에 대한 결과가 없어요.`,
    notFound: '원하는 답을 찾지 못했나요?',
    getSupport: '지원 받기',
    allHelp: '도움말 센터 전체 보기',
    topics: {
      'getting-started': {
        title: '시작하기',
        summary: '설치, 첫 실행, 메뉴 막대 아이콘과 권한 허용',
      },
      'edge-snap': {
        title: '엣지 그리드 스냅',
        summary: '창 가장자리에 머물러 팔레트를 띄우고 칸을 골라 창을 맞추기',
      },
      layouts: {
        title: '레이아웃 저장과 복원',
        summary: 'Desktop까지 기억하는 창 배치, 전역 단축키, 되돌리기',
      },
      troubleshooting: {
        title: '문제 해결',
        summary: '팔레트가 안 뜰 때, 권한 문제, Desktop 전환 실패, 도우미 오류',
      },
      'get-support': { title: '지원 받기', summary: '문의하는 방법과 함께 보내면 좋은 정보' },
    },
    questions: {
      palette: {
        question: '팔레트가 뜨지 않아요',
        answer:
          '권한 및 상태 탭에서 손쉬운 사용이 허용됐는지, 메뉴 막대의 "엣지 스냅 사용"이 켜져 있는지 확인하세요. 모서리가 아닌 가장자리 중간에서 잠시 멈춰 보세요.',
      },
      permission: {
        question: '권한을 줬는데도 동작하지 않아요',
        answer:
          '시스템 설정 › 손쉬운 사용 목록에서 OrgaWin을 지웠다가 다시 추가한 뒤 앱을 다시 시작하세요.',
      },
      desktop: {
        question: 'Desktop이 전환되지 않아요',
        answer:
          '키보드 설정 › 키보드 단축키 › Mission Control에서 "Desktop N으로 전환" 또는 "왼쪽/오른쪽 Space로 이동"을 켜세요.',
      },
      'other-desktop': {
        question: '다른 Desktop에 있는 창은 왜 옮겨지지 않나요?',
        answer:
          'macOS에는 다른 앱의 창을 Desktop 사이로 옮기는 공개 API가 없어요. 앱을 종료한 뒤 다시 복원하거나 Mission Control에서 끌어다 놓아 주세요.',
      },
      grid: {
        question: '팔레트 그리드 모양을 바꾸고 싶어요',
        answer:
          '설정 › 팔레트 그리드에서 그리드를 추가·삭제하고 순서를 바꿀 수 있어요. 사용자 정의 그리드는 팔레트에서 화살표로 바로 바꿔요.',
      },
      language: {
        question: '언어를 바꾸고 싶어요',
        answer: '설정 › 일반 › 언어에서 한국어나 English를 고르거나 시스템 설정을 따르게 하세요.',
      },
    },
  },
  support: {
    title: '지원 받기',
    intro: '대부분의 문제는 도움말과 권한 확인으로 바로 해결돼요.',
    stepHelp: '도움말에서 답 찾기',
    stepHelpBody: '자주 묻는 질문과 사용 안내를 검색해 보세요.',
    openHelp: '도움말 열기',
    stepStatus: '권한과 상태 확인',
    stepStatusBody: '손쉬운 사용 권한, Desktop 전환 단축키, 네이티브 도우미 상태를 확인해요.',
    openStatus: '권한 및 상태 열기',
    stepContact: '문의하기',
    contactBody: (email: string): string =>
      `문의는 이메일(${email})로 받아요. 아래 진단 정보를 함께 보내 주시면 더 빨리 도와드릴 수 있어요.`,
    diagnostics: '진단 정보',
    copy: '진단 정보 복사',
    copied: '복사했어요',
    copyFailed: '복사하지 못했어요',
    email: '이메일로 문의',
    mailSubject: 'OrgaWin 문의',
    tipsTitle: '문의할 때 알아 두세요',
    tips: [
      '오류 메시지나 스크린샷, 문제가 처음 생긴 때를 함께 알려 주세요.',
      '어떤 순서로 하면 문제가 다시 생기는지 적어 주세요.',
      '같은 문제로 새 문의를 또 보내기보다 받은 메일에 답장해 주세요.',
      '진단 정보에는 창 제목, 앱 이름, 레이아웃 이름이 들어가지 않아요.',
    ],
  },
  save: {
    title: '현재 레이아웃 저장',
    scope: '저장 범위',
    scopeAll: '모든 Desktop',
    scopeCurrent: '현재 Desktop만',
    windows: '저장할 창',
    untitled: '제목 없음',
    skippedFullscreen: (count: number): string =>
      `전체 화면 창 ${String(count)}개는 저장하지 않아요.`,
    name: '레이아웃 이름',
    defaultName: (now: Date): string =>
      `${String(now.getMonth() + 1)}월 ${String(now.getDate())}일 ${time(now)}`,
  },
  palette: {
    label: (app: string): string => `${app} 창 배치`,
    apply: '적용',
    grid: (cols: number, rows: number, custom: boolean): string =>
      `${custom ? '사용자 정의 ' : ''}${String(cols)} × ${String(rows)} 그리드`,
    resize: { up: '행 줄이기', down: '행 추가', left: '열 줄이기', right: '열 추가' },
  },
  tray: {
    restoreDesktop: (desktop: number): string => `Desktop ${String(desktop)}만 복원`,
    layoutItem: (name: string, windows: number): string => `${name}  ·  창 ${String(windows)}개`,
    restoreAll: '전체 복원',
    manageLayouts: '레이아웃 관리…',
    helperError: '⚠️ 네이티브 도우미 오류 — 상태 보기',
    accessibilityNeeded: '⚠️ 손쉬운 사용 권한 필요',
    saveLayout: '현재 레이아웃 저장…',
    noLayouts: '저장된 레이아웃이 없어요',
    restoring: '복원 중…',
    undo: '직전 배치로 되돌리기',
    edgeSnap: '엣지 스냅 사용',
    language: '🌐 언어',
    languageSystem: '시스템 설정 따르기',
    settings: '설정…',
    status: '권한 및 상태…',
    help: 'OrgaWin 도움말…',
    support: '지원 받기…',
    checkForUpdates: '업데이트 확인…',
    checkingForUpdates: '업데이트 확인 중…',
    upToDate: '최신 버전 사용 중 — 다시 확인',
    updateFailed: '⚠️ 업데이트 확인 실패 — 다시 시도',
    downloadingUpdate: (version: string): string => `v${version} 내려받는 중…`,
    installUpdate: (version: string): string => `재시작해서 업데이트 (v${version})`,
    quit: 'OrgaWin 종료',
  },
};

export type Messages = typeof ko;
