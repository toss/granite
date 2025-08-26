import type { GranitePluginCore } from '@granite-js/plugin-core';

export interface RadonPolyfillPluginOptions {
  enabled?: boolean;
  devtoolsPort?: number;
}

const DEFAULT_OPTIONS: Required<RadonPolyfillPluginOptions> = {
  enabled: true,
  devtoolsPort: 8097,
};

export const radonPolyfill = (options: RadonPolyfillPluginOptions = DEFAULT_OPTIONS): GranitePluginCore => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return {
    name: 'radon-polyfill-plugin',

    config: {
      babel: {
        plugins: [[require.resolve('@granite-js/plugin-radon/dist/lib/RNpolyfill/polyfill_babel.cjs'), mergedOptions]],
      },
    },
  };
};
