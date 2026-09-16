import * as path from 'node:path';
import type { Plugin, PluginOption } from 'rollipop';
import { generateRouterFile } from '../shared/generateRouterFile';
import { watchRouter } from '../shared/watchRouter';

const REQUIRE_CONTEXT_IMPORT = /^(?:\.{1,2}\/)+(?:[^/]+\/)*require\.context(?:\.[^/]+)*$/;
const REQUIRE_CONTEXT_MODULE = /[\\/]require\.context(?:\.[^/\\]+)*$/;

export function router(): PluginOption {
  return [createRouteGeneratorPlugin(), createRouteWatcherPlugin(), createPageImportsPlugin()];
}

function createRouteGeneratorPlugin(): Plugin {
  return {
    name: 'granite:router:generate',
    configResolved(config) {
      generateRouterFile(config.root);
    },
  };
}

function createRouteWatcherPlugin(): Plugin {
  return {
    name: 'granite:router:watch',
    configureServer(server) {
      const close = watchRouter(server.config.root);
      server.instance.addHook('onClose', async () => {
        await close();
      });
    },
  };
}

function createPageImportsPlugin(): Plugin {
  return {
    name: 'granite:router:page-imports',
    resolveId: {
      filter: { id: REQUIRE_CONTEXT_IMPORT },
      handler(source, importer) {
        return importer == null ? null : path.resolve(path.dirname(importer), source);
      },
    },
    load: {
      filter: { id: REQUIRE_CONTEXT_MODULE },
      handler() {
        return `
          const modules = import.meta.glob('./**/*.{js,jsx,ts,tsx}', { base: './pages', eager: true });

          export const context = Object.assign(
            (key) => {
              if (!Object.prototype.hasOwnProperty.call(modules, key)) {
                throw new Error(\`Unknown screen: \${key}\`);
              }
              return modules[key];
            },
            {
              keys: () => Object.keys(modules),
              resolve: (key) => key,
              id: 'pages',
            }
          );
        `;
      },
    },
  };
}
