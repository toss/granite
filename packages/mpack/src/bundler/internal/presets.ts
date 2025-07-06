import path from 'path';
import { BuildConfig, BundlerConfig } from '../../types';
import { mergeBuildConfigs } from '../../utils/mergeBuildConfigs';

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
  const DUMMY_BUILD_NUMBER = '00000000';

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
            'global.__granite = global.__granite || {};',
            `global.__granite.shared = { buildNumber: ${JSON.stringify(DUMMY_BUILD_NUMBER)} };`,
            `global.__granite.app = { name: ${JSON.stringify(config.appName)}, scheme: ${JSON.stringify(config.scheme)}, buildNumber: ${JSON.stringify(DUMMY_BUILD_NUMBER)} };`,
            // symbol-asynciterator polyfill (ES5)
            `(function(){if(typeof Symbol!=="undefined"&&!Symbol.asyncIterator){Symbol.asyncIterator=Symbol.for("@@asyncIterator")}})();`,
          ].join('\n'),
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
