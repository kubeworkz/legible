import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Legible Docs',
  tagline: 'Open-Source GenBI Agent',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.kubeworkz.io',
  baseUrl: '/',

  organizationName: 'kubeworkz',
  projectName: 'legible',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/kubeworkz/legible/tree/main/docs-site/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.svg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Legible Docs',
      logo: {
        alt: 'Legible',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/kubeworkz/legible',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Getting Started', to: '/getting-started/quickstart'},
            {label: 'Architecture', to: '/architecture/overview'},
            {label: 'Configuration', to: '/guides/configuration'},
            {label: 'API Reference', to: '/api-reference/overview'},
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/kubeworkz/legible',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Legible. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'docker', 'sql', 'python', 'rust'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
