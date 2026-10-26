import * as fs from 'fs';
import * as path from 'path';
import type { GranitePluginCore } from '@granite-js/plugin-core';
import { prepareLocalDirectory } from '@granite-js/utils';
import { createSharedResolverConfig } from './resolver';
import type { MicroFrontendPluginOptions } from './types';
import type { DisposeOwnershipPluginOptions } from '../plugin-utils/disposeBabelPlugin';
import { transformDisposeOwnership } from '../plugin-utils/disposeTransform';
import { EXECUTION_RUNTIME_ID, executionPrelude, executionRuntimePath } from '../plugin-utils/executionRuntime';
import { transformExecutionOwnership } from '../plugin-utils/executionTransform';
import { intoShared } from '../plugin-utils/intoShared';
import { getPreludeConfig } from '../plugin-utils/prelude';
import { transformRendererExecution } from '../plugin-utils/rendererExecutionTransform';

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
  if (options.executionOwnership === true) {
    resolver.alias = [
      { exact: true, from: EXECUTION_RUNTIME_ID, to: executionRuntimePath() },
      ...resolver.alias ?? [],
    ];
  }
  const disposeOwnershipOptions: DisposeOwnershipPluginOptions = {};

  function writePrelude(appName?: string) {
    disposeOwnershipOptions.appName = appName;
    const config = getPreludeConfig(normalizedOptions, appName);
    const bootstrap =
      options.executionOwnership === true ? executionPrelude : '';
    fs.writeFileSync(preludePath, bootstrap + config.preludeScript, 'utf8');
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
          const owned = options.executionOwnership === true
            ? (transformRendererExecution(id, code) ?? transformExecutionOwnership(id, code))?.code ?? code
            : code;
          return transformDisposeOwnership(id, owned, disposeOwnershipOptions);
        },
      },
      esbuild: {
        prelude: [preludePath],
        banner: { js: prelude.banner },
      },
    },
  };
}
