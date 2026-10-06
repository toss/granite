import type { Plugin, PluginOption } from 'rollipop';
import { generateRouterFile } from '../shared/generateRouterFile';
import { watchRouter } from '../shared/watchRouter';

export function router(): PluginOption {
  return [routeGenerator(), routeWatcher()];
}

function routeGenerator(): Plugin {
  return {
    name: 'granite:router:generate',
    configResolved(config) {
      generateRouterFile(config.root);
    },
  };
}

function routeWatcher(): Plugin {
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
