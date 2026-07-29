import fs from 'fs';
import path from 'path';
import { mergeBuildConfigs, type BuildConfig } from '@granite-js/plugin-core';
import type { BundlerConfig } from '../../types';
import { getDefaultReactNativePath } from '../../utils/getDefaultReactNativePath';

function getReactNativePolyfillPaths(reactNativePath: string): string[] {
  return require(path.join(reactNativePath, 'rn-get-polyfills'))() as string[];
}

export function getReactNativeConsolePolyfillBanner({
  rootDir,
  reactNativePath = getDefaultReactNativePath(rootDir),
  skipReactNativePolyfills = false,
}: {
  rootDir: string;
  reactNativePath?: string;
  skipReactNativePolyfills?: boolean;
}) {
  if (skipReactNativePolyfills) {
    return '';
  }

  const consolePolyfillPath = getReactNativePolyfillPaths(reactNativePath).find(
    (polyfillPath) => path.basename(polyfillPath) === 'console.js'
  );
  return consolePolyfillPath == null
    ? ''
    : `;(function () {\n${fs.readFileSync(consolePolyfillPath, 'utf8')}\n}).call(global);`;
}

export function getReactNativeSetupScripts({
  rootDir,
  reactNativePath = getDefaultReactNativePath(rootDir),
  skipReactNativePolyfills = false,
  skipReactNativeInitializeCore = false,
}: {
  rootDir: string;
  reactNativePath?: string;
  skipReactNativePolyfills?: boolean;
  skipReactNativeInitializeCore?: boolean;
}) {
  const polyfills = skipReactNativePolyfills
    ? []
    : getReactNativePolyfillPaths(reactNativePath).filter((polyfillPath) => path.basename(polyfillPath) !== 'console.js');
  const initializeCore = skipReactNativeInitializeCore
    ? []
    : [path.join(reactNativePath, 'Libraries/Core/InitializeCore.js')];

  return [...polyfills, ...initializeCore];
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
  const reactNativePath = config.buildConfig.reactNativePath;
  const skipReactNativePolyfills = config.buildConfig.extra?.skipReactNativePolyfills === true;

  return mergeBuildConfigs(
    {
      entry: config.buildConfig.entry,
      outfile: config.buildConfig.outfile,
      platform: config.buildConfig.platform,
      esbuild: {
        define: defineGlobalVariables({ dev: context.dev }),
        prelude: getReactNativeSetupScripts({
          rootDir: context.rootDir,
          reactNativePath,
          skipReactNativePolyfills,
          skipReactNativeInitializeCore: config.buildConfig.extra?.skipReactNativeInitializeCore === true,
        }),
        banner: {
          js: [
            globalVariables({ dev: context.dev }),
            getReactNativeConsolePolyfillBanner({
              rootDir: context.rootDir,
              reactNativePath,
              skipReactNativePolyfills,
            }),
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
