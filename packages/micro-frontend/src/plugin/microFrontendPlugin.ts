import * as fs from 'fs';
import * as path from 'path';
import type { GranitePluginCore } from '@granite-js/plugin-core';
import { prepareLocalDirectory } from '@granite-js/utils';
import type { DisposeOwnershipPluginOptions } from './disposeBabelPlugin';
import { transformDisposeOwnership } from './disposeTransform';
import { intoShared } from './intoShared';
import { getPreludeConfig } from './prelude';
import { createSharedResolverConfig } from './resolver';
import type { MicroFrontendPluginOptions } from './types';

export async function microFrontend(options: MicroFrontendPluginOptions = {}): Promise<GranitePluginCore> {
  const shared = intoShared(options.shared);
  const normalizedOptions: MicroFrontendPluginOptions = {
    ...options,
    shared,
  };
  const nonEagerEntries = Object.entries(shared ?? {}).filter(([, config]) => config.eager !== true);
  const localDirectory = prepareLocalDirectory(process.cwd());
  // Keep this path distinct from @granite-js/plugin-micro-frontend's generated prelude.
  // Both plugins can coexist while consumers migrate, and sharing a path makes the
  // later plugin overwrite the earlier plugin's runtime registrations.
  const preludePath = path.join(localDirectory, 'granite-micro-frontend-runtime.js');
  const prelude = getPreludeConfig(normalizedOptions);
  const resolver = createSharedResolverConfig(nonEagerEntries);
  const disposeOwnershipOptions: DisposeOwnershipPluginOptions = {};

  function writePrelude(appName?: string) {
    disposeOwnershipOptions.appName = appName;
    const config = getPreludeConfig(normalizedOptions, appName);
    fs.writeFileSync(preludePath, config.preludeScript, 'utf8');
  }

  writePrelude();

  return {
    name: 'micro-frontend',
    dev: {
      order: 'pre',
      handler({ appName }) {
        writePrelude(appName);
      },
    },
    build: {
      order: 'pre',
      handler({ appName }) {
        writePrelude(appName);
      },
    },
    config: {
      extra: nonEagerEntries.some(([moduleName]) => moduleName === 'react-native')
        ? {
            skipReactNativeInitializeCore: true,
            skipReactNativePolyfills: true,
          }
        : undefined,
      resolver,
      transformer: {
        transformSync(id, code) {
          return transformDisposeOwnership(id, code, disposeOwnershipOptions);
        },
      },
      esbuild: {
        prelude: [preludePath],
        banner: { js: prelude.banner },
      },
    },
  };
}
