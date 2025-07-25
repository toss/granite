import { CompleteGraniteConfig, createPluginHooksDriver } from '@granite-js/plugin-core';
import { select } from '@inquirer/prompts';
import * as ChromeLauncher from 'chrome-launcher';
import Debug from 'debug';
import { StartMenuHandler } from './StartMenuHandler';
import { DEV_SERVER_DEFAULT_HOST, DEV_SERVER_DEFAULT_PORT } from '../../constants';
import { DevServer } from '../../server/DevServer';
import { printLogo } from '../../utils/printLogo';
import { openDebugger } from '../openDebugger';

const debug = Debug('cli:start');

interface RunServerArgs {
  config: CompleteGraniteConfig;
  host?: string;
  port?: number;
  onServerReady?: () => Promise<void> | void;
}

const chromeInstanceMap: Map<string, ChromeLauncher.LaunchedChrome> = new Map();

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
  const server = new DevServer({
    buildConfig: { entry: config.entryFile, ...config.build },
    middlewares: config.devServer?.middlewares ?? [],
    host,
    port,
    rootDir,
  });

  printLogo();

  await server.initialize();
  await server.listen();

  await driver.devServer.post({ host, port });
  await onServerReady?.();

  const menuHandler = new StartMenuHandler([
    {
      key: 'r',
      description: 'Refresh',
      action: () => {
        console.log('Refreshing...');
        server.broadcastCommand('reload');
      },
    },
    {
      key: 'd',
      description: 'Open Developer Menu',
      action: () => {
        console.log('Opening developer menu...');
        server.broadcastCommand('devMenu');
      },
    },
    {
      key: 'j',
      description: 'Open Debugger',
      action: async () => {
        const devices = server.getInspectorProxy()?.getDevices();
        const connectedDevices = Array.from(devices?.entries() ?? []);
        let targetDevice: { id: string; name: string };

        for (const [id, device] of connectedDevices) {
          debug(`[${id}] ${device.getName()}`);
        }

        if (connectedDevices.length === 0) {
          console.log('No compatible apps connected');
          return;
        } else if (connectedDevices.length === 1) {
          const [id, device] = connectedDevices[0]!;
          const name = device.getName();
          targetDevice = { id, name };
        } else {
          const deviceInfo = await select({
            message: 'Select a device to connect',
            choices: connectedDevices.map(([id, device]) => ({
              value: { id, name: device.getName() },
              name: device.getName(),
            })),
          });
          process.stdin.resume();

          targetDevice = deviceInfo;
        }

        console.log(`Opening debugger for '${targetDevice.name}'...`);

        chromeInstanceMap.get(targetDevice.id)?.kill();

        openDebugger(server.port, targetDevice.id)
          .then((chrome) => {
            chromeInstanceMap.set(targetDevice.id, chrome);
          })
          .catch((error) => {
            if (error.message.includes('ECONNREFUSED')) {
              return;
            }
            console.error(error);
          });
      },
    },
  ]).attach();

  return {
    cleanup: async () => {
      await server.close();
      menuHandler.close();
    },
  };
}
