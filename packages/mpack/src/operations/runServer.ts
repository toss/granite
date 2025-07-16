import { createDevServerMiddleware, indexPageMiddleware } from '@react-native-community/cli-server-api';
import type { HandleFunction } from 'connect';
import Debug from 'debug';
import { setupDevToolsProxy } from 'react-native-devtools-standalone/backend';
import { Config } from '..';
import { createDebuggerMiddleware } from './createDebuggerMiddleware';
import { DEV_SERVER_DEFAULT_PORT } from '../constants';
import { getMetroConfig, type AdditionalMetroConfig } from '../metro/getMetroConfig';
import { printLogo } from '../utils/printLogo';
import { getModule } from '../vendors';

const debug = Debug('cli:start');

interface RunServerConfig {
  config: Config;
  host?: string;
  port?: number;
  middlewares?: HandleFunction[];
  enableEmbeddedReactDevTools?: boolean;
  onServerReady?: () => Promise<void> | void;
  cwd?: string;
  additionalConfig?: AdditionalMetroConfig;
}

const { Metro, TerminalReporter } = getModule('metro');
const { Terminal } = getModule('metro-core');
const { mergeConfig } = getModule('metro-config');

export async function runServer({
  config,
  host,
  port = DEV_SERVER_DEFAULT_PORT,
  middlewares = [],
  enableEmbeddedReactDevTools = true,
  onServerReady,
  cwd = process.cwd(),
  additionalConfig,
}: RunServerConfig) {
  // 제어흐름상 `eventsSocketEndpoint.reportEvent` 을 먼저 할당할 수 없기에, 객체를 통해 참조하도록 합니다
  const ref: Partial<{
    reportEvent: (event: any) => void;
    enableStdinWatchMode: () => void;
  }> = {};

  const terminal = new Terminal(process.stdout);
  const terminalReporter = new TerminalReporter(terminal);
  const reporter = {
    async update(event: any) {
      debug('Reporter event', event);

      terminalReporter.update(event);
      ref.reportEvent?.(event);

      switch (event.type) {
        case 'initialize_started':
          printLogo();
          break;

        case 'initialize_done':
          enableStdinWatchMode();
          await onServerReady?.();
          break;

        default:
          break;
      }
    },
  };

  const baseConfig = await getMetroConfig(
    { rootPath: cwd, appName: config.appName, scheme: config.scheme },
    additionalConfig
  );
  const metroConfig = mergeConfig(baseConfig, {
    server: { port },
    reporter,
  });

  const { middleware, websocketEndpoints, messageSocketEndpoint, eventsSocketEndpoint } = createDevServerMiddleware({
    host,
    port,
    watchFolders: metroConfig.watchFolders,
  });

  const { middleware: debuggerMiddleware, enableStdinWatchMode } = createDebuggerMiddleware({
    host,
    port,
    broadcastMessage: messageSocketEndpoint.broadcast,
  });

  middleware.use(debuggerMiddleware);
  middleware.use(indexPageMiddleware);

  const customEnhanceMiddleware = metroConfig.server.enhanceMiddleware;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  metroConfig.server.enhanceMiddleware = (metroMiddleware: any, server: any) => {
    if (customEnhanceMiddleware) {
      metroMiddleware = customEnhanceMiddleware(metroMiddleware, server);
    }

    for (const item of middlewares) {
      middleware.use(item);
    }

    return middleware.use(metroMiddleware);
  };

  if (enableEmbeddedReactDevTools) {
    await setupDevToolsProxy({
      client: {
        delegate: {
          onError: (error) => console.error('React DevTools client error', error),
        },
      },
      devtools: {
        delegate: {
          onError: (error) => console.error('React DevTools frontend error', error),
        },
      },
    });
  }

  ref.reportEvent = eventsSocketEndpoint.reportEvent;
  ref.enableStdinWatchMode = enableStdinWatchMode;

  const serverInstance = await Metro.runServer(metroConfig, {
    host,
    websocketEndpoints,
  });

  // In Node 8, the default keep-alive for an HTTP connection is 5 seconds. In
  // early versions of Node 8, this was implemented in a buggy way which caused
  // some HTTP responses (like those containing large JS bundles) to be
  // terminated early.
  //
  // As a workaround, arbitrarily increase the keep-alive from 5 to 30 seconds,
  // which should be enough to send even the largest of JS bundles.
  //
  // For more info: https://github.com/nodejs/node/issues/13391
  //
  serverInstance.keepAliveTimeout = 30000;
}
