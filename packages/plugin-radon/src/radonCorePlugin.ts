import type { GranitePluginCore } from '@granite-js/plugin-core';
import path from 'path';

export interface RadonCorePluginOptions {
  enableJSXSource?: boolean;
  enableNavigationAutoRegister?: boolean;
  enableRouteScanning?: boolean;
  enableRendererReplacement?: boolean;
}

const DEFAULT_OPTIONS: Required<RadonCorePluginOptions> = {
  enableJSXSource: true,
  enableNavigationAutoRegister: true,
  enableRouteScanning: true,
  enableRendererReplacement: true,
};

/**
 * RadonIDE의 핵심 기능을 Granite에서 사용할 수 있도록 하는 플러그인
 * - 기존 babel.js 로직 (Metro babelTransformerPath → babel plugin 변환)
 * - react_devtools_agent.js 주입 (기존 RadonIDE 기능)
 * - React Native 렌더러 교체, navigation 자동 등록 등
 */
export const radonCore = (options: RadonCorePluginOptions = DEFAULT_OPTIONS): GranitePluginCore => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  return {
    name: 'radon-core-plugin',
    config: {
      babel: {
        plugins: [
          [path.resolve(__dirname, './babel.cjs'), {
            ...mergedOptions
          }],
        ]
      },
      metro: {
          serializer: {
            getPolyfills: () => {
              if (!global.__RADON_WATCH_FOLDERS_OUTPUTTED) {
                const extensionLib = process.env.RADON_IDE_LIB_PATH;
                if (extensionLib) {
                  process.stdout.write(JSON.stringify({
                    type: "RNIDE_watch_folders",
                    watchFolders: [extensionLib]
                  }) + "\n");
                  global.__RADON_WATCH_FOLDERS_OUTPUTTED = true;
                }
              }
            return []; // 실제 polyfill 반환
          }
        }
      }
    }
  };
};
