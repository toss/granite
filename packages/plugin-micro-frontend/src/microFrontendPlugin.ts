import * as fs from 'fs';
import * as path from 'path';
import { GranitePluginCore } from '@granite-js/plugin-core';
import { prepareLocalDirectory } from '@granite-js/utils';
import { getPreludeConfig } from './prelude';
import { fetchRemoteAppBundles, fetchRemoteBundle } from './remote';
import { virtualSharedConfig } from './resolver';
import { scopeMicroFrontendBundle } from './scopeBundle';
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

  const remoteLoaderPreludePath =
    process.env.MPACK_DEV_SERVER === 'true' && options.remotes != null && options.remotes.length > 0
      ? await fetchRemoteAppBundles(options.remotes, localDir)
      : null;

  /**
   * If importing `react-native` from the shared registry, skip its prelude scripts
   * to ensure the core is loaded only once per runtime by the host.
   */
  const isReactNativeShared = Boolean(nonEagerEntries.find(([libName]) => libName === 'react-native'));

  const virtualShared = virtualSharedConfig(nonEagerEntries);
  const shouldScopeBundle = options.scopeBundle !== false;

  return {
    name: 'micro-frontend-plugin',
    config: (context) => ({
      extra: isReactNativeShared ? { skipReactNativePolyfills: true, skipReactNativeInitializeCore: true } : undefined,
      resolver: {
        alias: virtualShared.alias,
        protocols: virtualShared.protocols,
      },
      esbuild: {
        prelude: remoteLoaderPreludePath != null ? [preludePath, remoteLoaderPreludePath] : [preludePath],
      },
      transformer: shouldScopeBundle
        ? {
            transformBundleAsync: (bundle) =>
              scopeMicroFrontendBundle(bundle, { appName: context.appName, name: options.name }),
          }
        : undefined,
    }),
  };
};
