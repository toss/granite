import type { GranitePluginCore } from '@granite-js/plugin-core';
import path from 'path';

export const radon = (): GranitePluginCore => {
  return {
    name: 'radon-plugin',
    config: {
      babel: {
        plugins: [
          // Babel 플러그인 경로 추가
          [
            path.resolve(__dirname, './babel.js'),
          ]
        ]
      }
    }
  };
};