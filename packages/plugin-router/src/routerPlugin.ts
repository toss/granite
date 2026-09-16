import type { GranitePluginCore } from '@granite-js/plugin-core';
import { generateRouterFile } from './shared/generateRouterFile';
import { watchRouter } from './shared/watchRouter';

interface RouterPluginOptions {
  watch?: boolean;
}

const DEFAULT_OPTIONS: Required<RouterPluginOptions> = {
  watch: true,
};

export const router = (options: RouterPluginOptions = DEFAULT_OPTIONS): GranitePluginCore => {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };

  return {
    name: 'router-plugin',
    build: {
      order: 'pre',
      handler: () => {
        generateRouterFile();
      },
    },
    dev: {
      order: 'pre',
      handler: () => {
        generateRouterFile();
        if (resolvedOptions.watch) {
          watchRouter();
        }
      },
    },
  };
};
