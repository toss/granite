import * as fs from 'fs';
import * as path from 'path';
import { GranitePluginCore } from '@granite-js/plugin-core';
import { prepareLocalDirectory } from '@granite-js/utils';
import { getPreludeConfig } from './prelude';
import { fetchRemoteBundle } from './remote';
import { virtualInitializeCoreConfig, virtualSharedConfig } from './resolver';
import type { MicroFrontendPluginOptions } from './types';
import { intoShared } from './utils/intoShared';

export const microFrontendPlugin = async (options: MicroFrontendPluginOptions): Promise<GranitePluginCore> => {
  const sharedConfig = intoShared(options.shared);
  const sharedEntries = Object.entries(sharedConfig ?? {});
  const nonEagerEntries = sharedEntries
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([_, config]) => config.eager !== true);

  const rootDir = process.cwd();
  const preludeConfig = getPreludeConfig({ ...options, shared: sharedConfig });
  const localDir = prepareLocalDirectory(rootDir);
  const preludePath = path.join(localDir, 'micro-frontend-runtime.js');
  fs.writeFileSync(preludePath, preludeConfig.preludeScript);

  /**
   * @TODO `MPACK_DEV_SERVER` flag should be removed after next version of bundle loader is released and load bundle dynamically at JS runtime.
   */
  if (process.env.MPACK_DEV_SERVER === 'true' && options.remote) {
    await fetchRemoteBundle(options.remote);
  }

  /**
   * If importing `react-native` from the shared registry,
   * `InitializeCore.js` must be excluded from the bundle to ensure the core is loaded only once per runtime.
   */
  const shouldExcludeReactNativeInitializeCore = Boolean(
    nonEagerEntries.find(([libName]) => libName === 'react-native')
  );

  const virtualInitializeCore = shouldExcludeReactNativeInitializeCore
    ? virtualInitializeCoreConfig(options.reactNativeBasePath)
    : undefined;
  const virtualShared = virtualSharedConfig(nonEagerEntries);

  return {
    name: 'micro-frontend-plugin',
    config: {
      resolver: {
        alias: [...(virtualInitializeCore?.alias ?? []), ...virtualShared.alias],
        protocols: {
          ...virtualInitializeCore?.protocols,
          ...virtualShared.protocols,
        },
      },
      esbuild: {
        prelude: [preludePath],
        banner: {
          js: preludeConfig.banner,
        },
      },
    },
  };
};
