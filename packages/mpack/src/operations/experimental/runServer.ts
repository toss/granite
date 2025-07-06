import { select } from '@inquirer/prompts';
import * as ChromeLauncher from 'chrome-launcher';
import Debug from 'debug';
import { StartMenuHandler } from './StartMenuHandler';
import { DEV_SERVER_DEFAULT_PORT } from '../../constants';
import { DevServer } from '../../server/DevServer';
import type { DevServerPlugin } from '../../server/types';
import type { DevServerConfig } from '../../types/DevServerConfig';
import { printLogo } from '../../utils/printLogo';
import { openDebugger } from '../openDebugger';

const debug = Debug('cli:start');

interface RunServerArgs {
  appName: string;
  scheme: string;
  devServerConfig: DevServerConfig;
  host?: string;
  port?: number;
  plugins?: DevServerPlugin[];
  onServerReady?: () => Promise<void> | void;
}

const chromeInstanceMap: Map<string, ChromeLauncher.LaunchedChrome> = new Map();

// eslint-disable-next-line @typescript-eslint/naming-convention
export async function experimental_runServer({
  appName,
  scheme,
  devServerConfig,
  host,
  port = DEV_SERVER_DEFAULT_PORT,
  plugins,
  onServerReady,
}: RunServerArgs) {
  const rootDir = process.cwd();
  const server = new DevServer({
    appName,
    scheme,
    build: devServerConfig.build,
    host,
    port,
    plugins,
    rootDir,
  });

  printLogo();

  await server.initialize();
  await server.listen();

  await onServerReady?.();

  const menuHandler = new StartMenuHandler([
    {
      key: 'r',
      description: '새로고침',
      action: () => {
        console.log('새로고침 중...');
        server.broadcastCommand('reload');
      },
    },
    {
      key: 'd',
      description: '개발자 메뉴 열기',
      action: () => {
        console.log('개발자 메뉴 여는 중...');
        server.broadcastCommand('devMenu');
      },
    },
    {
      key: 'j',
      description: 'Debugger 열기',
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

        openDebugger(server.host, server.port, targetDevice.id)
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
