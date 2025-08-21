import type { GranitePluginCore } from '@granite-js/plugin-core';

export interface RadonPolyfillPluginOptions {
  enabled?: boolean;
  devtoolsPort?: number;
}

const DEFAULT_OPTIONS: Required<RadonPolyfillPluginOptions> = {
  enabled: true,
  devtoolsPort: 8097,
};

/**
 * RN 0.72 호환성을 위한 DevTools polyfill 플러그인
 * - React Native 0.72에서 DevTools가 작동하도록 환경 준비
 * - babel plugin 방식으로 안정적인 주입
 */
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
