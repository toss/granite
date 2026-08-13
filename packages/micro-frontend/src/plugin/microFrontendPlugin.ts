import * as fs from 'fs';
import * as path from 'path';
import type { GranitePluginCore } from '@granite-js/plugin-core';
import { prepareLocalDirectory } from '@granite-js/utils';
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
  const preludePath = path.join(localDirectory, 'micro-frontend-runtime.js');
  const prelude = getPreludeConfig(normalizedOptions);
  const resolver = createSharedResolverConfig(nonEagerEntries);

  function writePrelude(appName?: string) {
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
      esbuild: {
        prelude: [preludePath],
        banner: { js: prelude.banner },
      },
    },
  };
}
