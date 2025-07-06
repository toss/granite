import * as fs from 'fs';
import * as path from 'path';
import { GranitePluginCore } from '@granite-js/plugin-core';
import { log } from './log';
import { getPreludeConfig } from './prelude';
import { fetchRemoteBundle } from './remote';
import { virtualInitializeCoreConfig, virtualSharedConfig } from './resolver';
import type { SharedModulesPluginOptions } from './types';

export const sharedModulesPlugin = async (options: SharedModulesPluginOptions): Promise<GranitePluginCore> => {
  const sharedEntries = Object.entries(options.shared ?? {});
  const nonEagerEntries = sharedEntries
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([_, config]) => config.eager !== true);

  const preludeConfig = getPreludeConfig(options);
  const preludePath = path.join(process.cwd(), '.granite', 'shared-modules-prelude.js');
  fs.mkdirSync(path.dirname(preludePath), { recursive: true });
  fs.writeFileSync(preludePath, preludeConfig.preludeScript);

  if (process.env.MPACK_DEV_SERVER === 'true' && options.remote) {
    try {
      await fetchRemoteBundle(options.remote);
    } catch (error) {
      log('Failed to fetch remote bundles. Please check if the remote dev server is running');
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * If importing `react-native` from the shared registry,
   * `InitializeCore.js` must be excluded from the bundle to ensure the core is loaded only once per runtime.
   */
  const shouldExcludeReactNativeInitializeCore = Boolean(
    nonEagerEntries.find(([libName]) => libName === 'react-native')
  );

  const virtualInitializeCore = shouldExcludeReactNativeInitializeCore ? virtualInitializeCoreConfig() : undefined;
  const virtualShared = virtualSharedConfig(nonEagerEntries);

  return {
    name: 'shared-modules-plugin',
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
