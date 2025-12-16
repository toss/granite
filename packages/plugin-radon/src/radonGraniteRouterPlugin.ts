import type { GranitePluginCore } from '@granite-js/plugin-core';

export interface RadonGraniteRouterPluginOptions {
  enableRouteScanning?: boolean;
}

const DEFAULT_OPTIONS: Required<RadonGraniteRouterPluginOptions> = {
  enableRouteScanning: true,
};
export const radonGraniteRouter = (options: RadonGraniteRouterPluginOptions = DEFAULT_OPTIONS): GranitePluginCore => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };


  return {
    name: 'radon-metro-reporter',
    config: {
      babel: {
        plugins: [
          [
            require.resolve('@granite-js/plugin-radon/dist/routerBabel.js'),
            {
              ...mergedOptions,
            },
          ],
        ],
      },
    },
  };
};
