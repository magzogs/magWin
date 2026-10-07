import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: '사용 안내',
      items: [
        'guide/getting-started',
        'guide/edge-snap',
        'guide/layouts',
        'guide/troubleshooting',
        'guide/get-support',
      ],
    },
    {
      type: 'category',
      label: '아키텍처',
      items: [
        'architecture/overview',
        'architecture/helper-protocol',
        'architecture/coordinates',
        'architecture/edge-detection',
        'architecture/grid-selection',
        'architecture/layout-restore',
        {
          type: 'category',
          label: '의사결정 기록 (ADR)',
          items: [
            'architecture/decisions/adr-001-swift-helper-process',
            'architecture/decisions/adr-002-desktop-first-restore',
            'architecture/decisions/adr-003-keyboard-desktop-switching',
            'architecture/decisions/adr-004-typescript-toolchain',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: '개발',
      items: [
        'development/setup',
        'development/monorepo',
        'development/coding-standards',
        'development/testing',
        'development/docs-workflow',
        'development/release',
      ],
    },
  ],
};

export default sidebars;
