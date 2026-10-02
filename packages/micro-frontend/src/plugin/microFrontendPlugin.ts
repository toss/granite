import * as fs from 'fs';
import * as path from 'path';
import type { GranitePluginCore } from '@granite-js/plugin-core';
import { prepareLocalDirectory } from '@granite-js/utils';
import { createSharedResolverConfig } from './resolver';
import type { MicroFrontendPluginOptions } from './types';
import type { DisposeOwnershipPluginOptions } from '../plugin-utils/disposeBabelPlugin';
import { transformDisposeOwnership } from '../plugin-utils/disposeTransform';
import { intoShared } from '../plugin-utils/intoShared';
import { getPreludeConfig } from '../plugin-utils/prelude';

export async function microFrontend(options: MicroFrontendPluginOptions = {}): Promise<GranitePluginCore> {
  const shared = intoShared(options.shared);
  const normalizedOptions: MicroFrontendPluginOptions = {
    ...options,
    shared,
  };
  const nonEagerEntries = Object.entries(shared ?? {}).filter(([, config]) => config.eager !== true);
  const localDirectory = prepareLocalDirectory(process.cwd());
  // Keep this path distinct from @granite-js/plugin-micro-frontend's generated prelude.
  // Sharing a path would let one plugin overwrite the other's runtime registrations.
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
