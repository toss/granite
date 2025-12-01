import path from 'path';
import { mergeBuildConfigs, type BuildConfig } from '@granite-js/plugin-core';
import type { BundlerConfig } from '../../types';

export function getReactNativeSetupScripts({ rootDir }: { rootDir: string }) {
  const reactNativePath = path.dirname(
    require.resolve('react-native/package.json', {
      paths: [rootDir],
    })
  );

  return [
    ...require(path.join(reactNativePath, 'rn-get-polyfills'))(),
    path.join(reactNativePath, 'Libraries/Core/InitializeCore.js'),
  ] as string[];
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
        prelude: getReactNativeSetupScripts({ rootDir: context.rootDir }),
        banner: {
          js: [
            globalVariables({ dev: context.dev }),
            /**
             * Polyfill for `@swc/helpers` build compatibility
             *
             * @see https://github.com/swc-project/swc/blob/v1.4.15/packages/helpers/esm/_async_iterator.js#L3
             *
             * - babel: No runtime issues after build as there is a fallback for `Symbol.asyncIterator`
             * - swc: No fallback for `Symbol.asyncIterator`, so it needs to be defined in advance
             */
            `(function(){if(typeof Symbol!=="undefined"&&!Symbol.asyncIterator){Symbol.asyncIterator=Symbol.for("@@asyncIterator")}})();`,
          ].join('\n'),
        },
      },
    },
    config.buildConfig
  );
}
