import path from 'path';
import readline from 'readline';
import devtoolsFrontendPath from '@granite-js/devtools-frontend';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import * as ChromeLauncher from 'chrome-launcher';
import connect from 'connect';
import Debug from 'debug';
import serveStatic from 'serve-static';
import { DEBUGGER_FRONTEND_PATH } from './constants';
import { openDebugger } from './openDebugger';
import { getModule } from '../vendors';

const debug = Debug('cli:start');

interface DebuggerMiddlewareConfig {
  host?: string;
  port: number;
  broadcastMessage: (method: string, params?: Record<string, unknown>) => void;
}

const { InspectorProxy } = getModule('metro-inspector-proxy');
const chromeInstanceMap: Map<number, ChromeLauncher.LaunchedChrome> = new Map();

export function createDebuggerMiddleware({ host, port, broadcastMessage }: DebuggerMiddlewareConfig) {
  const middleware = connect().use(`/${DEBUGGER_FRONTEND_PATH}`, serveStatic(path.resolve(devtoolsFrontendPath)));

  function enableStdinWatchMode() {
    if (!process.stdout.isTTY || process.stdin.setRawMode == null) {
      console.warn('Watch mode is not supported in this environment');
      return;
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    console.log(`To reload the app press ${chalk.blue('"r"')}`);
    console.log(`To open developer menu press ${chalk.blue('"d"')}`);
    console.log(`To open debugger press ${chalk.blue('"j"')}`);
    console.log('');

    /**
     * React Native CLI에서 지원하는 단축키를 Granite CLI 구현체로 포팅합니다
     *
     * https://github.com/react-native-community/cli/blob/v11.3.7/packages/cli-plugin-metro/src/commands/start/watchMode.ts#L39-L66
     */
    process.stdin.on('keypress', (_key, data) => {
      if (data.ctrl === true) {
        switch (data.name) {
          case 'c':
            process.exit(0);
          // eslint-disable-next-line no-fallthrough
          case 'z':
            process.emit('SIGTSTP', 'SIGTSTP');
            break;
        }

        return;
      }

      switch (data.name) {
        case 'r':
          console.info('Reloading app...');
          broadcastMessage('reload');
          break;

        case 'd':
          console.info('Opening developer menu...');
          broadcastMessage('devMenu');
          break;

        case 'j':
          openReactNativeDebugger(host, port);
          break;
      }
    });
  }

  return { middleware, enableStdinWatchMode };
}

async function openReactNativeDebugger(host = 'localhost', port: number) {
  const connectedDevices = Array.from(InspectorProxy.devices.entries());
  let targetDevice: { id: number; name: string };

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
  openDebugger(host, port, targetDevice.id.toString())
    .then((chrome) => {
      chromeInstanceMap.set(targetDevice.id, chrome);
    })
    .catch((error) => {
      if (error.message.includes('ECONNREFUSED')) {
        return;
      }
      console.error(error);
    });
}
