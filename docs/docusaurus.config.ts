import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'magWin Docs',
  tagline: '창 가장자리 그리드 스냅과 Desktop을 기억하는 레이아웃',
  favicon: 'img/favicon.svg',
  url: 'https://docs.magwin.local',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  i18n: { defaultLocale: 'ko', locales: ['ko'] },
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
      title: 'magWin',
      logo: { alt: 'magWin', src: 'img/favicon.svg' },
      items: [{ type: 'docSidebar', sidebarId: 'docs', position: 'left', label: '문서' }],
    },
    footer: {
      style: 'dark',
      copyright: `© ${String(new Date().getFullYear())} magzog · magWin`,
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
