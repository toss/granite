import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Plugin, PluginOption } from 'rollipop';
import { extractSentryDebugId } from '../shared/extractSentryDebugId';
import { writeDebugIdInjectedSourcemap } from '../shared/injectSentryDebugId';
import { tryResolveHermesBundle } from '../shared/resolveHermesBundle';
import { createClientActions } from '../shared/sentryClientActions';
import { getSentryDebugIdSnippets } from '../shared/snippets';
import type { SentryPluginOptions } from '../shared/types';

export type { SentryPluginOptions } from '../shared/types';

interface SentryBuildState {
  production: boolean;
  root: string;
  readonly snippetsByChunk: Map<string, ReturnType<typeof getSentryDebugIdSnippets>>;
}

export function sentry({ enabled = true, ...clientOptions }: SentryPluginOptions = {}): PluginOption {
  if (!enabled) {
    return [];
  }
  const actions = createClientActions(clientOptions);
  const state: SentryBuildState = {
    production: false,
    root: process.cwd(),
    snippetsByChunk: new Map(),
  };

  return [createSentryConfigPlugin(state), createSentryDebugIdPlugin(state), createSentryUploadPlugin(state, actions)];
}

function createSentryConfigPlugin(state: SentryBuildState): Plugin {
  return {
    name: 'granite:sentry:config',
    configResolved(config) {
      state.root = config.root;
      state.production = config.mode === 'production';
    },
  };
}

function createSentryDebugIdPlugin(state: SentryBuildState): Plugin {
  const getSnippets = (fileName: string) => {
    const existing = state.snippetsByChunk.get(fileName);
    if (existing != null) {
      return existing;
    }

    const snippets = getSentryDebugIdSnippets();
    state.snippetsByChunk.set(fileName, snippets);
    return snippets;
  };

  return {
    name: 'granite:sentry:debug-id',
    banner(chunk) {
      return state.production ? getSnippets(chunk.fileName).injectionScript : '';
    },
    footer(chunk) {
      return state.production ? getSnippets(chunk.fileName).sourceMappingComment : '';
    },
  };
}

function createSentryUploadPlugin(state: SentryBuildState, actions: ReturnType<typeof createClientActions>): Plugin {
  return {
    name: 'granite:sentry:upload',
    writeBundle: {
      order: 'post',
      sequential: true,
      async handler(output) {
        if (!state.production) {
          return;
        }
        if (!output.file) {
          throw new Error('Sentry source maps require an output file.');
        }

        try {
          const outfile = path.resolve(state.root, output.file);
          const bundleContent = await fs.promises.readFile(outfile, 'utf8');
          const debugId = extractSentryDebugId(bundleContent);
          if (debugId == null) {
            throw new Error('Cannot find Sentry Debug ID.');
          }

          const sourcemap = `${outfile}.map`;
          await writeDebugIdInjectedSourcemap(sourcemap, debugId);
          const hermesBundle = tryResolveHermesBundle(outfile);
          const hasHermesMap = hermesBundle != null && fs.existsSync(hermesBundle.sourcemap);
          if (hasHermesMap) {
            await writeDebugIdInjectedSourcemap(hermesBundle.sourcemap, debugId);
          }
          await actions.uploadSourcemap(
            { root: state.root },
            {
              bundlePath: hasHermesMap ? hermesBundle.hbc : outfile,
              sourcemapPath: hasHermesMap ? hermesBundle.sourcemap : sourcemap,
            }
          );
        } finally {
          state.snippetsByChunk.clear();
        }
      },
    },
  };
}
