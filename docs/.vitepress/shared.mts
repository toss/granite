import { createRequire } from 'module';
import path from 'path';
import { defineConfig } from 'vitepress';
import { search as koSearch } from './ko.mts';

const require = createRequire(import.meta.url);

export const shared = defineConfig({
  title: 'Granite',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#0064FF' }],
  ],
  lastUpdated: true,
  metaChunk: true,
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          ...koSearch,
        },
      },
    },
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/toss/granite',
      },
      {
        icon: 'npm',
        link: 'https://www.npmjs.com/package/@granite-js/react-native',
        ariaLabel: 'npm',
      },
    ],
  },

  vite: {
    resolve: {
      alias: [
        {
          find: /^vue$/,
          replacement: path.dirname(
            require.resolve('vue/package.json', {
              paths: [require.resolve('vitepress')],
            })
          ),
        },
        {
          find: /^vue\/server-renderer$/g,
          replacement: path.dirname(
            require.resolve('vue/server-renderer', {
              paths: [require.resolve('vitepress')],
            })
          ),
        },
        {
          find: /^@components/g,
          replacement: path.resolve(__dirname, '..', '..', 'components'),
        },
      ],
    },
  },
});
