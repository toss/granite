import { type DefaultTheme, defineConfig } from 'vitepress';
import referenceManifest from '../reference/manifest.json';
import { categorizeManifest } from './utils';

export const en = defineConfig({
  lang: 'en',
  title: 'Granite',
  description: 'React Native Framework',
  themeConfig: {
    sidebar: sidebar(),
    nav: nav(),
  },
});

function sidebar(): DefaultTheme.Sidebar {
  return [
    {
      text: 'Guide',
      items: [
        { text: 'Introduction', link: '/guides/introduction' },
        { text: 'vs. Traditional RN', link: '/guides/comparison' },
        {
          text: 'Quick Start',
          items: [
            { text: 'Getting Started', link: '/guides/quick-start/create-your-app' },
            { text: 'Set Up Infrastructure', link: '/guides/quick-start/setup-aws' },
            { text: 'Deploy & Run Your App', link: '/guides/quick-start/deploy-your-app' },
          ],
        },
        {
          text: 'Granite Router',
          items: [
            { text: 'Using Plugin', link: '/guides/granite-router/plugin-router' },
            { text: 'Navigating Screens', link: '/guides/granite-router/routing' },
            { text: 'Defining Screen Parameters', link: '/guides/granite-router/params' },
            { text: 'Using Layouts', link: '/guides/granite-router/layouts' },
          ],
        },
        {
          text: 'Miscellaneous',
          items: [{ text: 'Install Test App', link: '/guides/miscellaneous/install-native-app' }],
        },
      ],
    },
    {
      text: 'Reference',
      items: categorizeManifest(referenceManifest, 'en'),
    },
  ];
}

function nav(): DefaultTheme.NavItem[] {
  return [
    { text: 'Introduction', link: '/guides/introduction' },
    {
      text: 'Guide',
      link: '/guides/quick-start/create-your-app',
    },
    {
      text: 'Reference',
      link: '/reference/react-native/config/defineConfig',
    },
  ];
}
