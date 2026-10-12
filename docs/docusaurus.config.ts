import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'OrgaWin Docs',
  tagline: '창 가장자리 그리드 스냅과 Desktop을 기억하는 레이아웃',
  favicon: 'img/logo.svg',
  url: 'https://docs.magwin.local',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en'],
    localeConfigs: { ko: { label: '한국어' }, en: { label: 'English' } },
  },
  markdown: { mermaid: true, hooks: { onBrokenMarkdownLinks: 'throw' } },
  themes: ['@docusaurus/theme-mermaid'],
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'OrgaWin',
      logo: { alt: 'OrgaWin', src: 'img/logo.svg' },
      items: [
        { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: '문서' },
        { to: '/help', position: 'left', label: '도움말' },
        { type: 'localeDropdown', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `© ${String(new Date().getFullYear())} magzog · OrgaWin`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['swift', 'bash', 'json'],
    },
    colorMode: { respectPrefersColorScheme: true },
  } satisfies Preset.ThemeConfig,
};

export default config;
