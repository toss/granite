import path from 'path';
import { mergeBuildConfigs, type BuildConfig } from '@granite-js/plugin-core';
import type { BundlerConfig } from '../../types';

export function getReactNativeSetupScripts({
  rootDir,
  skipReactNativePolyfills = false,
  skipReactNativeInitializeCore = false,
}: {
  rootDir: string;
  skipReactNativePolyfills?: boolean;
  skipReactNativeInitializeCore?: boolean;
}) {
  const reactNativePath = path.dirname(
    require.resolve('react-native/package.json', {
      paths: [rootDir],
    })
  );

  const polyfills = skipReactNativePolyfills
    ? []
    : (require(path.join(reactNativePath, 'rn-get-polyfills'))() as string[]);
  const initializeCore = skipReactNativeInitializeCore
    ? []
    : [path.join(reactNativePath, 'Libraries/Core/InitializeCore.js')];

  return [...polyfills, ...initializeCore] as string[];
}

export function globalVariables({ dev }: { dev: boolean }) {
  return [
    'var __BUNDLE_START_TIME__=this.nativePerformanceNow?nativePerformanceNow():Date.now();',
    `var __DEV__=${JSON.stringify(dev)};`,
    `var global=typeof globalThis!=='undefined'?globalThis:typeof global!=='undefined'?global:typeof window!=='undefined'?window:this;`,
  ].join('\n');
}

export function defineGlobalVariables({ dev }: { dev: boolean }) {
  return {
    window: 'global',
    __DEV__: JSON.stringify(dev),
    'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production'),
  };
}

export function combineWithBaseBuildConfig(
  config: BundlerConfig,
  context: { rootDir: string; dev: boolean }
): BuildConfig {
  return mergeBuildConfigs(
    {
      entry: config.buildConfig.entry,
      outfile: config.buildConfig.outfile,
      platform: config.buildConfig.platform,
      esbuild: {
        define: defineGlobalVariables({ dev: context.dev }),
        prelude: getReactNativeSetupScripts({
          rootDir: context.rootDir,
          skipReactNativePolyfills: config.buildConfig.extra?.skipReactNativePolyfills === true,
          skipReactNativeInitializeCore: config.buildConfig.extra?.skipReactNativeInitializeCore === true,
        }),
        banner: {
          js: globalVariables({ dev: context.dev }),
        },
      },
      babel: {
        conditions: [
          /**
           * @TODO
           * We're using a RegExp in Zod that's not supported by Hermes,
           * so we're switching to Babel for transpilation since there's no compatible SWC config or plugin available.
           *
           * @see zod {@link https://github.com/colinhacks/zod/issues/2302}
           */
          (_code: string, path: string) => path.includes('node_modules/zod'),
        ],
      },
    },
    config.buildConfig
  );
}
