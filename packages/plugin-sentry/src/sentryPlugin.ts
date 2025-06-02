import * as fs from 'fs/promises';
import type { GranitePluginCore } from '@granite-js/plugin-core';
import { extractSentryDebugId } from './extractSentryDebugId';
import { writeDebugIdInjectedSourcemap } from './injectSentryDebugId';
import { tryResolveHermesBundle } from './resolveHermesBundle';
import { createClientActions } from './sentryClientActions';
import { getSentryDebugIdSnippets } from './snippets';
import type { SentryPluginOptions } from './types';

const PLUGIN_NAME = 'sentry-plugin';
const PLUGIN_SHIM: GranitePluginCore = { name: PLUGIN_NAME };

export const sentryPlugin = ({ enabled = true, ...options }: SentryPluginOptions = {}): GranitePluginCore => {
  if (enabled === false) {
    return PLUGIN_SHIM;
  }

  const { injectionScript, sourceMappingComment } = getSentryDebugIdSnippets();
  const sentryActions = createClientActions(options);

  return {
    name: PLUGIN_NAME,
    build: {
      order: 'post',
      handler: async function (config) {
        const files = config.buildResults.map(({ outfile, sourcemapOutfile }) => ({
          bundle: outfile,
          sourcemap: sourcemapOutfile,
        }));

        for (const file of files) {
          const { bundle, sourcemap } = file;
          const bundleContent = await fs.readFile(bundle, 'utf-8');
          const debugId = await extractSentryDebugId(bundleContent);

          if (debugId == null) {
            console.error('Cannot find Sentry Debug ID');
            continue;
          }

          const hermesBundle = tryResolveHermesBundle(bundle);
          const targetBundle = hermesBundle?.hbc ?? bundle;
          const targetSourcemap = hermesBundle?.sourcemap ?? sourcemap;

          await writeDebugIdInjectedSourcemap(targetSourcemap, debugId);
          await sentryActions.uploadSourcemap(
            { root: config.cwd },
            { bundlePath: targetBundle, sourcemapPath: targetSourcemap }
          );
        }
      },
    },
    config: {
      esbuild: {
        banner: {
          js: injectionScript,
        },
        footer: {
          js: sourceMappingComment,
        },
      },
    },
  };
};
