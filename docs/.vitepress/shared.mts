import { createRequire } from 'module';
import path from 'path';
import { defineConfig } from 'vitepress';
import { search as koSearch } from './ko.mts';

const require = createRequire(import.meta.url);

export const shared = defineConfig({
  title: 'Granite',
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
      /** TODO */
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
