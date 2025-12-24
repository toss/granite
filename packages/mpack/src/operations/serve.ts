import { createPluginHooksDriver, resolveConfig, type CompleteGraniteConfig } from '@granite-js/plugin-core';
import { createDevMiddleware } from '@react-native/dev-middleware';
import { createDevServerMiddleware } from '@react-native-community/cli-server-api';
import Debug from 'debug';
import attachKeyHandlers from './attachKeyHandlers';
import { DEV_SERVER_DEFAULT_HOST, DEV_SERVER_DEFAULT_PORT } from '../constants';
import { getMetroConfig } from '../metro/getMetroConfig';
import { printLogo } from '../utils/printLogo';
import { printServerUrl } from '../utils/printServerUrl';
import { getModule } from '../vendors';

const debug = Debug('cli:start');

interface RunServerConfig {
  config: CompleteGraniteConfig;
  host?: string;
  port?: number;
  onServerReady?: () => Promise<void> | void;
}

const { Metro, TerminalReporter } = getModule('metro');
const { Terminal } = getModule('metro-core');
const { mergeConfig } = getModule('metro-config');

type DevServerMiddleware = {
  middleware: any;
  websocketEndpoints: Record<string, any>;
  messageSocketEndpoint: {
    broadcast: (method: string, params?: Record<string, unknown> | null) => void;
  };
  eventsSocketEndpoint: {
    reportEvent: (event: any) => void;
  };
};

export async function runServer({
  config,
  host = DEV_SERVER_DEFAULT_HOST,
  port = DEV_SERVER_DEFAULT_PORT,
  onServerReady,
}: RunServerConfig) {
  // Since eventsSocketEndpoint.reportEvent cannot be assigned first due to the control flow,
  // we reference it through an object
  const devServerUrl = new URL(`http://${host}:${port}`).toString();
  let keyHandlersAttached = false;

  const ref: Partial<{
    reportEvent: (event: any) => void;
    enableStdinWatchMode: () => void;
  }> = {};

  const driver = createPluginHooksDriver(config);
  const terminal = new Terminal(process.stdout);
  const terminalReporter = new TerminalReporter(terminal);
  const keyReporter = {
    update(event: { type: string; [key: string]: unknown }) {
      switch (event.type) {
        case 'unstable_server_log': {
          const level = typeof event.level === 'string' ? event.level : 'info';
          const data = event.data;
          const output =
            typeof data === 'string' ? data : Array.isArray(data) ? data.map(String).join(' ') : String(data);

          if (level === 'error') {
            console.error(output);
          } else if (level === 'warn') {
            console.warn(output);
          } else {
            console.log(output);
          }
          break;
        }
        case 'unstable_server_menu_updated': {
          const message = event.message;
          if (typeof message === 'string') {
            console.log(message);
          }
          break;
        }
        case 'unstable_server_menu_cleared':
          break;
        default:
          break;
      }
    },
  };

  const resolvedConfig = await resolveConfig(config);
  const { middlewares = [], inspectorProxy, ...additionalMetroConfig } = resolvedConfig?.metro ?? {};
  const baseConfig = await getMetroConfig({ rootPath: config.cwd }, additionalMetroConfig);
  const metroConfig = mergeConfig(baseConfig, {
    server: { port },
  });

  const {
    middleware,
    websocketEndpoints: communityWebsocketEndpoints,
    eventsSocketEndpoint,
    messageSocketEndpoint,
  } = createDevServerMiddleware({
    host,
    port,
    watchFolders: metroConfig.watchFolders,
  }) as DevServerMiddleware;

  const reporter = {
    async update(event: any) {
      debug('Reporter event', event);

      terminalReporter.update(event);
      ref.reportEvent?.(event);

      if (baseConfig.reporter?.update) {
        baseConfig.reporter.update(event);
      }

      switch (event.type) {
        case 'initialize_started':
          printLogo();
          break;

        case 'initialize_done':
          await driver.devServer.post({ host, port });
          printServerUrl({ host, port });
          if (!keyHandlersAttached) {
            keyHandlersAttached = true;
            attachKeyHandlers({
              devServerUrl,
              messageSocket: messageSocketEndpoint,
              reporter: keyReporter,
            });
          }
          await onServerReady?.();
          break;

        default:
          break;
      }
    },
  };

  metroConfig.reporter = reporter;

  const { middleware: debuggerMiddleware, websocketEndpoints: debuggerWebSocketEndpoints } = createDevMiddleware({
    projectRoot: config.cwd,
    serverBaseUrl: devServerUrl,
  });

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

  ref.reportEvent = eventsSocketEndpoint.reportEvent;

  await driver.devServer.pre({ host, port });

  const serverInstance = await Metro.runServer(metroConfig, {
    host,
    websocketEndpoints: {
      communityWebsocketEndpoints,
      debuggerWebSocketEndpoints,
    },
    unstable_extraMiddleware: [middleware, debuggerMiddleware],
    inspectorProxyDelegate: inspectorProxy?.delegate,
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
