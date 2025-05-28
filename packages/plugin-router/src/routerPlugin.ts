import type { GranitePluginCore } from '@granite-js/plugin-core';
import { generateRouterFile } from './generateRouterFile';
import { watchRouter } from './watchRouter';

interface RouterPluginOptions {
  watch?: boolean;
}

const DEFAULT_OPTIONS: Required<RouterPluginOptions> = {
  watch: true,
};

export const router = (options: RouterPluginOptions = DEFAULT_OPTIONS): GranitePluginCore => {
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
        if (options.watch) {
          watchRouter();
        }
      },
    },
  };
};
