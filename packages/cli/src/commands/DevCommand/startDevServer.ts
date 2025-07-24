import { runServer } from '@granite-js/mpack';
import { createContext } from '@granite-js/plugin-core';
import type { CompleteGraniteConfig } from '../../config';

interface StartDevServerOptions {
  host: string;
  port: number;
  disableEmbeddedReactDevTools?: boolean;
}

export async function startDevServer(serverOptions: StartDevServerOptions, config: CompleteGraniteConfig) {
  const pluginContext = createContext();

  const commonHandlerArgs = {
    host: serverOptions.host,
    port: serverOptions.port,
    appName: config.appName,
    outdir: config.outdir,
    cwd: config.cwd,
    entryFile: config.build.entry,
  };

  for (const preHandler of config.pluginHooks.devServer.preHandlers) {
    await preHandler.call(pluginContext, commonHandlerArgs);
  }

  await runServer({
    cwd: config.cwd,
    host: serverOptions.host,
    port: serverOptions.port,
    middlewares: config.metro?.middlewares,
    enableEmbeddedReactDevTools: !serverOptions.disableEmbeddedReactDevTools,
    additionalConfig: config.metro,
    onServerReady: async () => {
      for (const postHandler of config.pluginHooks.devServer.postHandlers) {
        await postHandler.call(pluginContext, commonHandlerArgs);
      }
    },
  });
}
