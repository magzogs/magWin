import type { Messages } from './ko';

function time(now: Date): string {
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function plural(count: number, one: string, many: string): string {
  return `${String(count)} ${count === 1 ? one : many}`;
}

/** English catalog. Must match the shape of `ko` (the source of truth). */
export const en: Messages = {
  common: {
    loading: 'Loading…',
    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    remove: 'Delete',
    confirm: 'OK',
    unknownError: (code) => `Unknown error (${code})`,
  },
  errors: {
    accessibilityDenied:
      'OrgaWin needs Accessibility permission. Allow it on the Permissions & Status tab.',
    windowNotFound: 'The window could not be found. It was closed or moved to another Desktop.',
    notResizable: 'This window cannot be moved or resized.',
    fullscreen: 'Full-screen windows cannot be moved.',
    invalidRange: 'The selected cells are not valid.',
    paletteClosed: 'The palette is already closed.',
    invalidPreset: 'The grid size is not valid.',
    helperTimeout: 'The native helper is not responding.',
    helperClosed: 'The native helper has quit.',
    helperProtocol: 'The native helper version does not match. Please rebuild it.',
    layoutNotFound: 'The layout could not be found.',
    restoreInProgress: 'A restore is already in progress.',
    nothingToUndo: 'There is no arrangement to undo.',
    draftExpired: 'The capture has expired. Please capture again.',
    emptyLayout: 'Select at least one window to save.',
    noShortcut: 'The Desktop switching shortcuts are turned off.',
    switchTimeout: 'The Desktop switch could not be confirmed.',
    spaceNotFound: 'The Desktop could not be found.',
    appNotFound: 'The app is not installed.',
    launchFailed: 'The app could not be launched.',
    invalidSettings: 'The setting value is not valid.',
  },
  issues: {
    desktopMissing: (name, desktop) =>
      `${name}: Desktop ${String(desktop)} no longer exists, so it was placed on the current Desktop.`,
    desktopSwitchFailed: (name, desktop, reason) =>
      `${name}: Could not switch to Desktop ${String(desktop)}. ${reason}`,
    appNotRunning: (name) => `${name}: The app is not running.`,
    windowNotFound: (name) => `${name}: The window was not found.`,
    onOtherDesktop: (name, desktop) =>
      `${name}: The window is on Desktop ${desktop}. To move it, quit the app and restore again, or drag it in Mission Control.`,
  },
  progress: {
    started: (layout) => `Restoring '${layout}'`,
    switching: (desktop) => `Switching to Desktop ${String(desktop)}…`,
    launching: (app) => `Launching ${app}…`,
    waiting: 'Waiting for windows to appear…',
    placing: (app) => `Placing ${app}…`,
    finished: (placed, total) =>
      `Placed ${String(placed)} of ${plural(total, 'window', 'windows')}`,
    title: (layout) => (layout === '' ? 'Restore layout' : `Restore '${layout}'`),
  },
  modifiers: {
    none: 'None (just rest)',
    option: '⌥ Option',
    control: '⌃ Control',
    command: '⌘ Command',
    shift: '⇧ Shift',
  },
  edges: { top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right' },
  tabs: {
    layouts: 'Layouts',
    settings: 'Settings',
    status: 'Permissions & Status',
    help: 'OrgaWin Help',
    support: 'Get Support',
  },
  settings: {
    sectionsLabel: 'Settings sections',
    sections: {
      presets: 'Palette grids',
      trigger: 'Edge detection',
      placement: 'Palette & placement',
      layouts: 'Layouts',
      general: 'General',
    },
    trigger: {
      enabled: 'Enable edge snap',
      edges: 'Edges',
      dwell: 'Dwell time',
      dwellHint:
        'The palette appears after the cursor rests on an edge this long, so it does not get in the way of resizing.',
      band: 'Detection width',
      modifier: 'Modifier key',
    },
    placement: {
      gridSize: 'Grid size',
      hideDelay: 'Close delay',
      hideDelayHint: 'The palette closes this long after the cursor leaves it.',
      gap: 'Window gap',
      gapHint: 'Space between windows, and between windows and the screen edges',
    },
    layouts: {
      launchMissing: 'Launch apps that are not running',
      launchMissingHint:
        'When restoring, OrgaWin switches to the saved Desktop, then launches the app.',
      hotkeys: 'Global shortcuts (⌃⌥⌘S save, ⌃⌥⌘1–9 restore)',
      excluded: 'Apps excluded by default when saving (bundle IDs, one per line)',
    },
    general: {
      language: 'Language',
      languageSystem: 'Match system',
      languageHint: 'Applies right away to the menu bar menu and open windows.',
      launchAtLogin: 'Open at login',
    },
  },
  presets: {
    intro:
      'Columns × rows. They appear in this order when you rest on a window edge. The custom grid can be reshaped right in the palette with its arrows.',
    custom: (size) => `Custom (${size})`,
    moveEarlier: (name) => `Move ${name} earlier`,
    moveLater: (name) => `Move ${name} later`,
    removeNamed: (name) => `Delete ${name}`,
    cols: 'Columns',
    rows: 'Rows',
    colsLabel: 'Number of columns',
    rowsLabel: 'Number of rows',
    add: 'Add grid',
    addCustom: 'Add custom grid',
    outOfRange: (min, max) => `Columns and rows must be between ${String(min)} and ${String(max)}.`,
    duplicate: (label) => `The ${label} grid already exists.`,
  },
  layouts: {
    title: 'Layouts',
    intro:
      'Restoring switches to the saved Desktop first, then launches the apps there and places their windows.',
    undo: 'Undo last restore',
    saveCurrent: 'Save current layout…',
    empty: 'No saved layouts yet.',
    emptyHint: 'Arrange your windows, then save with ⌃⌥⌘S or from the menu bar icon.',
    newName: 'New name',
    rename: 'Rename',
    hotkey: 'Global shortcut',
    restoreAll: 'Restore all',
    moveUp: 'Move up',
    moveDown: 'Move down',
    confirmDelete: (name) => `Delete the layout '${name}'?`,
    counts: (windows, apps) =>
      `${plural(windows, 'window', 'windows')} · ${plural(apps, 'app', 'apps')}`,
  },
  status: {
    checking: 'Checking…',
    helper: 'Native helper',
    helperReady: 'Running',
    helperStarting: 'Starting…',
    helperFailed: 'Could not start',
    helperBody:
      'A small Swift program that finds and moves other apps’ windows. It runs with the app.',
    accessibility: 'Accessibility',
    allowed: 'Allowed',
    required: 'Required',
    off: 'Off',
    available: 'Available',
    accessibilityBody:
      'To move windows and switch Desktops, allow OrgaWin in System Settings › Privacy & Security › Accessibility. During development (pnpm dev), allow the terminal app that ran the command.',
    requestPermission: 'Request permission',
    openSystemSettings: 'Open System Settings',
    shortcuts: 'Desktop switching shortcuts',
    shortcutsBody:
      'macOS has no public API for switching Desktops, so OrgaWin presses the shortcuts from Keyboard settings › Keyboard Shortcuts › Mission Control for you.',
    directOn: (desktops) => `"Switch to Desktop N" on: ${desktops}`,
    directOff: '"Switch to Desktop N" off',
    moveOn: '"Move left/right a space" on',
    moveOff: '"Move left/right a space" off',
    openShortcuts: 'Open Keyboard Shortcuts',
    screenRecording: 'Screen Recording (optional)',
    screenRecordingBody:
      'Used only to read the titles of windows on other Desktops. Saving and restoring work without it, but matching several windows of the same app can be less accurate.',
    openScreenRecording: 'Open Screen Recording settings',
  },
  help: {
    title: 'How can we help?',
    searchLabel: 'Search help',
    searchPlaceholder: 'Search for answers or browse the topics below',
    topicsLabel: 'Help topics',
    faq: 'Frequently asked questions',
    noResults: (query) => `No results for "${query}".`,
    notFound: 'Didn’t find what you need?',
    getSupport: 'Get Support',
    allHelp: 'Visit the Help Center',
    topics: {
      'getting-started': {
        title: 'Getting started',
        summary: 'Installing, first launch, the menu bar icon and permissions',
      },
      'edge-snap': {
        title: 'Edge grid snapping',
        summary: 'Rest on a window edge, pick cells in the palette and snap the window',
      },
      layouts: {
        title: 'Saving and restoring layouts',
        summary: 'Window arrangements that remember their Desktop, shortcuts and undo',
      },
      troubleshooting: {
        title: 'Troubleshooting',
        summary: 'No palette, permission problems, Desktop switching and helper errors',
      },
      'get-support': {
        title: 'Get support',
        summary: 'How to contact us and what to include',
      },
    },
    questions: {
      palette: {
        question: 'The palette does not appear',
        answer:
          'Check on the Permissions & Status tab that Accessibility is allowed, and that "Enable edge snap" is on in the menu bar menu. Rest in the middle of an edge, not at a corner.',
      },
      permission: {
        question: 'I granted permission but it still does not work',
        answer:
          'Remove OrgaWin from the list in System Settings › Accessibility, add it again, then restart the app.',
      },
      desktop: {
        question: 'Desktops do not switch',
        answer:
          'Turn on "Switch to Desktop N" or "Move left/right a space" in Keyboard settings › Keyboard Shortcuts › Mission Control.',
      },
      'other-desktop': {
        question: 'Why are windows on another Desktop not moved?',
        answer:
          'macOS has no public API for moving other apps’ windows between Desktops. Quit the app and restore again, or drag the window in Mission Control.',
      },
      grid: {
        question: 'How do I change the palette grids?',
        answer:
          'Add, delete and reorder grids in Settings › Palette grids. The custom grid can be reshaped right in the palette with its arrows.',
      },
      language: {
        question: 'How do I change the language?',
        answer: 'In Settings › General › Language, pick 한국어 or English, or match the system.',
      },
    },
  },
  support: {
    title: 'Get Support',
    intro: 'Most problems are solved quickly with the help articles and a permission check.',
    stepHelp: 'Find an answer in Help',
    stepHelpBody: 'Search the frequently asked questions and guides.',
    openHelp: 'Open Help',
    stepStatus: 'Check permissions and status',
    stepStatusBody:
      'Check Accessibility permission, the Desktop switching shortcuts and the native helper.',
    openStatus: 'Open Permissions & Status',
    stepContact: 'Contact us',
    contactBody: (email) =>
      `We answer support requests by email (${email}). Include the diagnostics below so we can help you faster.`,
    diagnostics: 'Diagnostics',
    copy: 'Copy diagnostics',
    copied: 'Copied',
    copyFailed: 'Could not copy',
    email: 'Email support',
    mailSubject: 'OrgaWin support request',
    tipsTitle: 'Before you write',
    tips: [
      'Include error messages or screenshots, and when the problem started.',
      'Describe the steps that make the problem happen again.',
      'Reply to our existing email instead of sending a new request about the same problem.',
      'Diagnostics never include window titles, app names or layout names.',
    ],
  },
  save: {
    title: 'Save current layout',
    scope: 'Scope',
    scopeAll: 'All Desktops',
    scopeCurrent: 'Current Desktop only',
    windows: 'Windows to save',
    untitled: 'Untitled',
    skippedFullscreen: (count) =>
      `${plural(count, 'full-screen window is', 'full-screen windows are')} not saved.`,
    name: 'Layout name',
    defaultName: (now) =>
      `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time(now)}`,
  },
  palette: {
    label: (app) => `Place ${app} window`,
    apply: 'Apply',
    grid: (cols, rows, custom) =>
      `${custom ? 'Custom ' : ''}${String(cols)} × ${String(rows)} grid`,
    resize: { up: 'Remove row', down: 'Add row', left: 'Remove column', right: 'Add column' },
  },
  tray: {
    restoreDesktop: (desktop) => `Restore Desktop ${String(desktop)} only`,
    layoutItem: (name, windows) => `${name}  ·  ${plural(windows, 'window', 'windows')}`,
    restoreAll: 'Restore all',
    manageLayouts: 'Manage layouts…',
    helperError: '⚠️ Native helper error — show status',
    accessibilityNeeded: '⚠️ Accessibility permission needed',
    saveLayout: 'Save current layout…',
    noLayouts: 'No saved layouts',
    restoring: 'Restoring…',
    undo: 'Undo last restore',
    edgeSnap: 'Enable edge snap',
    language: '🌐 Language',
    languageSystem: 'Match system',
    settings: 'Settings…',
    status: 'Permissions & Status…',
    help: 'OrgaWin Help…',
    support: 'Get Support…',
    checkForUpdates: 'Check for updates…',
    checkingForUpdates: 'Checking for updates…',
    upToDate: 'OrgaWin is up to date — check again',
    updateFailed: '⚠️ Update check failed — try again',
    downloadingUpdate: (version) => `Downloading v${version}…`,
    installUpdate: (version) => `Restart to update (v${version})`,
    quit: 'Quit OrgaWin',
  },
};
