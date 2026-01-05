import assert from 'assert';
import middie from '@fastify/middie';
import type { BundleData } from '@granite-js/plugin-core';
import { createDevMiddleware } from '@react-native/dev-middleware';
import { createDevServerMiddleware } from '@react-native-community/cli-server-api';
import Fastify, {
  type DoneFuncWithErrOrRes,
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
} from 'fastify';
import type { WebSocketServer } from 'ws';
import { DebuggerEventHandler } from './debugger/DebuggerEventHandler';
import { createBundlerForDevServer } from './helpers/createBundlerForDevServer';
import { mergeBundles } from './helpers/mergeBundles';
import { createLiveReloadMiddleware } from './middlewares';
import * as serverPlugins from './plugins';
import type { BroadcastCommand, DevServerContext, DevServerOptions, Platform } from './types';
import { WebSocketServerDelegate, WebSocketServerRouter } from './wss';
import { DEV_SERVER_DEFAULT_HOST, DEV_SERVER_DEFAULT_PORT } from '../../constants';
import { logger, clientLogger } from '../../logger';
import { statusPlugin } from '../../plugins/statusPlugin';
import { isDebugMode } from '../../utils/isDebugMode';
import { createProgressBar } from '../../utils/progressBar';

type DevServerMiddleware = {
  middleware: {
    use: (middleware: (req: any, res: any, next: (error?: Error) => void) => void) => void;
    (req: any, res: any, next: (error?: Error) => void): void;
  };
  websocketEndpoints: Record<string, WebSocketServer>;
  messageSocketEndpoint: {
    broadcast: (method: string, params?: Record<string, unknown> | null) => void;
  };
  eventsSocketEndpoint: {
    reportEvent: (event: any) => void;
  };
};

type FastifyWithUse = FastifyInstance & {
  use: (middleware: (req: any, res: any, next: (error?: Error) => void) => void) => void;
};

export class DevServer {
  public host: string;
  public port: number;

  private app: FastifyInstance;
  private context: DevServerContext | null = null;
  private inspectorProxy?: unknown;
  private wssDelegate?: WebSocketServerDelegate;

  constructor(private devServerOptions: DevServerOptions) {
    logger.trace('DevServer.constructor');

    this.host = devServerOptions.host ?? DEV_SERVER_DEFAULT_HOST;
    this.port = devServerOptions.port ?? DEV_SERVER_DEFAULT_PORT;

    // 프리셋에서 참조할 수 있도록 전역 환경 변수로 노출
    process.env.DEV_SERVER_HOST = String(this.host);
    process.env.DEV_SERVER_PORT = String(this.port);

    const app = Fastify({
      logger: {
        level: isDebugMode('mpack') ? 'trace' : 'silent',
      },
    });

    this.app = app;
    this.setup(app);
  }

  async initialize() {
    logger.trace('DevServer.initialize');
    const { rootDir, buildConfig } = this.devServerOptions;
    this.context = await this.createDevServerContext(rootDir, buildConfig);
  }

  listen() {
    logger.trace('DevServer.listen');
    return this.app.listen({ host: this.host, port: this.port }).then(() => {
      logger.info(`개발 서버 실행 중 - ${this.getBaseUrl()}`);
    });
  }

  close() {
    return this.app.close();
  }

  getInspectorProxy() {
    return this.inspectorProxy;
  }

  getBaseUrl() {
    return `http://${this.host}:${this.port}`;
  }

  broadcastCommand(command: BroadcastCommand, params?: Record<string, unknown>): void {
    this.wssDelegate?.broadcastCommand?.(command, params);
  }

  private getContext() {
    assert(this.context, '초기화가 완료되지 않았습니다');
    return this.context;
  }

  private async setup(app: FastifyInstance) {
    const devServerHostname = this.host === '0.0.0.0' ? 'localhost' : this.host;
    const serverBaseUrl = new URL(`http://${devServerHostname}:${this.port}`).origin;
    await app.register(middie);

    const {
      middleware: devServerMiddleware,
      websocketEndpoints: serverWebsocketEndpoints,
      eventsSocketEndpoint,
      messageSocketEndpoint,
    } = createDevServerMiddleware({
      host: this.host,
      port: this.port,
      watchFolders: [this.devServerOptions.rootDir],
    }) as DevServerMiddleware;

    const devMiddleware = createDevMiddleware({ serverBaseUrl }) as {
      middleware: (req: any, res: any, next: (error?: Error) => void) => void;
      websocketEndpoints: Record<string, WebSocketServer>;
      inspectorProxy?: unknown;
    };
    const devtoolsWebsocketEndpoints = devMiddleware.websocketEndpoints ?? {};
    this.inspectorProxy = devMiddleware.inspectorProxy;
    devServerMiddleware.use(devMiddleware.middleware);
    (app as FastifyWithUse).use(devServerMiddleware);

    const debuggerEventHandler = new DebuggerEventHandler(this.devServerOptions.inspectorProxy?.delegate);
    const deviceSocket = devtoolsWebsocketEndpoints['/inspector/device'];
    if (deviceSocket) {
      deviceSocket.on('connection', (socket) => {
        debuggerEventHandler.setDeviceWebSocketHandler(socket);
      });
    }
    const debuggerSocket = devtoolsWebsocketEndpoints['/inspector/debug'];
    if (debuggerSocket) {
      debuggerSocket.on('connection', (socket) => {
        debuggerEventHandler.setDebuggerWebSocketHandler(socket);
      });
    }

    const liveReloadMiddleware = createLiveReloadMiddleware({
      onClientLog: (event) => {
        this.wssDelegate?.sendEvent(event);

        if (event.type === 'client_log') {
          clientLogger(event.level, event.data as any[]);
        }
      },
    });

    const wssDelegate = new WebSocketServerDelegate({
      eventReporter: (event) => eventsSocketEndpoint.reportEvent(event),
      messageBroadcaster: (command, params) => messageSocketEndpoint.broadcast(command, params),
      hmr: {
        updateStart: () => liveReloadMiddleware.updateStart(),
        updateDone: () => liveReloadMiddleware.updateDone(),
        reload: () => liveReloadMiddleware.liveReload(),
      },
    });

    app
      .register(serverPlugins.statusPlugin, { rootDir: this.devServerOptions.rootDir })
      .register(serverPlugins.serveBundlePlugin, { getBundle: this.getBundle.bind(this) })
      .register(serverPlugins.symbolicatePlugin, { getBundle: this.getBundle.bind(this) })
      .register(serverPlugins.indexPagePlugin)
      .addHook('onSend', this.setCommonHeaders);

    for (const plugin of this.devServerOptions.middlewares ?? []) {
      app.register(plugin);
    }

    const webSocketRouter = new WebSocketServerRouter().register('/hot', liveReloadMiddleware.server);
    const registeredPaths = new Set<string>(['/hot']);

    const registerEndpoints = (endpoints: Record<string, WebSocketServer>) => {
      for (const [path, endpoint] of Object.entries(endpoints)) {
        if (registeredPaths.has(path)) {
          continue;
        }
        webSocketRouter.register(path, endpoint);
        registeredPaths.add(path);
      }
    };

    registerEndpoints(serverWebsocketEndpoints ?? {});
    registerEndpoints(devtoolsWebsocketEndpoints ?? {});

    webSocketRouter.setup(app);

    this.wssDelegate = wssDelegate;
  }

  private setCommonHeaders(
    _request: FastifyRequest,
    reply: FastifyReply,
    _payload: unknown,
    next: DoneFuncWithErrOrRes
  ) {
    reply.header('Surrogate-Control', 'no-store');
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');

    next();
  }

  private async createDevServerContext(
    rootDir: string,
    buildConfig: DevServerOptions['buildConfig']
  ): Promise<DevServerContext> {
    const [androidBundler, iosBundler] = await Promise.all([
      createBundlerForDevServer({ rootDir, platform: 'android', buildConfig }),
      createBundlerForDevServer({ rootDir, platform: 'ios', buildConfig }),
    ]);

    // Register common plugins for dev server
    [androidBundler, iosBundler].forEach((bundler) => {
      bundler.addPlugin(
        statusPlugin({
          onStart: () => {
            this.wssDelegate?.onHMRUpdateStart();
          },
          onEnd: () => {
            this.wssDelegate?.onHMRUpdateDone();
            this.wssDelegate?.hotReload();
          },
        })
      );
    });

    return {
      rootDir,
      android: {
        bundler: androidBundler,
        progressBar: createProgressBar('android'),
      },
      ios: {
        bundler: iosBundler,
        progressBar: createProgressBar('ios'),
      },
    };
  }

  private async getBundle(platform: Platform) {
    const { bundler } = this.getContext()[platform];
    const buildResult = await bundler.build({ withDispose: false });
    let targetBundle: BundleData;

    if ('bundle' in buildResult) {
      if (globalThis.remoteBundles != null) {
        const hostBundleContent = buildResult.bundle.source.text;
        const remoteBundleContent = globalThis.remoteBundles[platform];
        const mergedBundle = await mergeBundles({
          platform,
          hostBundleContent,
          remoteBundleContent,
        });

        targetBundle = mergedBundle;
      } else {
        targetBundle = buildResult.bundle;
      }

      return targetBundle;
    } else {
      throw new Error('Build failed');
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var remoteBundles: Record<'android' | 'ios', string> | null;
}
