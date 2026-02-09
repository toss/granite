import { CompleteGraniteConfig, createPluginHooksDriver, resolveConfig } from '@granite-js/plugin-core';
import { DEV_SERVER_DEFAULT_HOST, DEV_SERVER_DEFAULT_PORT } from '../../constants';
import attachKeyHandlers from '../../operations/attachKeyHandlers';
import { keyReporter } from '../../operations/keyReporter';
import { printLogo } from '../../utils/printLogo';
import { printServerUrl } from '../../utils/printServerUrl';
import { DevServer } from '../server/DevServer';
import type { BroadcastCommand } from '../server/types';

interface RunServerArgs {
  config: CompleteGraniteConfig;
  host?: string;
  port?: number;
  onServerReady?: () => Promise<void> | void;
}

let keyHandlersAttached = false;

// eslint-disable-next-line @typescript-eslint/naming-convention
export async function EXPERIMENTAL__server({
  config,
  host = DEV_SERVER_DEFAULT_HOST,
  port = DEV_SERVER_DEFAULT_PORT,
  onServerReady,
}: RunServerArgs) {
  const driver = createPluginHooksDriver(config);
  await driver.devServer.pre({ host, port });

  const rootDir = config.cwd;
  const { metro: _, devServer, ...buildConfig } = (await resolveConfig(config)) ?? {};
  const server = new DevServer({
    buildConfig: { entry: config.entryFile, ...buildConfig },
    middlewares: devServer?.middlewares ?? [],
    host,
    port,
    rootDir,
  });

  printLogo();

  await server.initialize();
  await server.listen();

  await driver.devServer.post({ host, port });
  printServerUrl({ host, port });
  if (!keyHandlersAttached) {
    keyHandlersAttached = true;
    const devServerHostname = host === '0.0.0.0' ? 'localhost' : host;
    const devServerUrl = new URL(`http://${devServerHostname}:${port}`).origin;

    attachKeyHandlers({
      devServerUrl,
      messageSocket: {
        broadcast: (command, params) => server.broadcastCommand(command as BroadcastCommand, params ?? undefined),
      },
      reporter: keyReporter,
    });
    await onServerReady?.();
  }

  return {
    cleanup: async () => {
      await server.close();
    },
  };
}
