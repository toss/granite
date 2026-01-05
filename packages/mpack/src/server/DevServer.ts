import assert from 'assert';
import type { BundleData } from '@granite-js/plugin-core';
import Fastify, {
  type DoneFuncWithErrOrRes,
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
} from 'fastify';
import { setupDevToolsProxy } from 'react-native-devtools-standalone/backend';
import { DebuggerEventHandler } from './debugger/DebuggerEventHandler';
import { createBundlerForDevServer } from './helpers/createBundlerForDevServer';
import { mergeBundles } from './helpers/mergeBundles';
import { createLiveReloadMiddleware } from './middlewares';
import * as serverPlugins from './plugins';
import type { BroadcastCommand, DevServerContext, DevServerOptions, Platform } from './types';
import { WebSocketServerDelegate, WebSocketServerRouter } from './wss';
import { DEV_SERVER_DEFAULT_HOST, DEV_SERVER_DEFAULT_PORT } from '../constants';
import { logger, clientLogger } from '../logger';
import { statusPlugin } from '../plugins/statusPlugin';
import { isDebugMode } from '../utils/isDebugMode';
import { createProgressBar } from '../utils/progressBar';
import { InspectorProxy } from '../vendors/@react-native/dev-middleware';
import { createWebSocketEndpoints } from '../vendors/@react-native-community/cli-server-api';

export class DevServer {
  public host: string;
  public port: number;

  private app: FastifyInstance;
  private context: DevServerContext | null = null;
  private inspectorProxy?: InspectorProxy;
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

  broadcastCommand(command: BroadcastCommand): void {
    this.wssDelegate?.broadcastCommand?.(command);
  }

  private getContext() {
    assert(this.context, '초기화가 완료되지 않았습니다');
    return this.context;
  }

  private async setup(app: FastifyInstance) {
    const baseRoot = this.devServerOptions.rootDir;
    const serverBaseUrl = this.getBaseUrl();

    const debuggerEventHandler = new DebuggerEventHandler(this.devServerOptions.inspectorProxy?.delegate);
    const inspectorProxy = new InspectorProxy({ root: baseRoot, serverBaseUrl });
    const inspectorProxyWss = inspectorProxy.createWebSocketServers({
      onDeviceWebSocketConnected: (socket) => {
        debuggerEventHandler.setDeviceWebSocketHandler(socket);
      },
      onDebuggerWebSocketConnected: (socket) => {
        debuggerEventHandler.setDebuggerWebSocketHandler(socket);
      },
    });

    const { debuggerProxySocket, eventsSocket, messageSocket } = createWebSocketEndpoints({
      broadcast: (command, params) => {
        this.wssDelegate?.broadcastCommand(command, params);
      },
    });

    const liveReloadMiddleware = createLiveReloadMiddleware({
      onClientLog: (event) => {
        this.wssDelegate?.sendEvent(event);

        if (event.type === 'client_log') {
          clientLogger(event.level, event.data as any[]);
        }
      },
    });

    const wssDelegate = new WebSocketServerDelegate({
      eventReporter: (event) => eventsSocket.reportEvent(event),
      messageBroadcaster: (command, params) => messageSocket.broadcast(command, params),
      hmr: {
        updateStart: () => liveReloadMiddleware.updateStart(),
        updateDone: () => liveReloadMiddleware.updateDone(),
        reload: () => liveReloadMiddleware.liveReload(),
      },
    });

    app
      .register(serverPlugins.statusPlugin, { rootDir: this.devServerOptions.rootDir })
      .register(serverPlugins.debuggerPlugin, { onReload: () => this.wssDelegate?.broadcastCommand('reload') })
      .register(serverPlugins.serveBundlePlugin, { getBundle: this.getBundle.bind(this) })
      .register(serverPlugins.symbolicatePlugin, { getBundle: this.getBundle.bind(this) })
      .register(serverPlugins.indexPagePlugin)
      .addHook('onRequest', inspectorProxy.handleRequest)
      .addHook('onSend', this.setCommonHeaders);

    for (const plugin of this.devServerOptions.middlewares ?? []) {
      app.register(plugin);
    }

    new WebSocketServerRouter()
      .register('/hot', liveReloadMiddleware.server)
      .register('/debugger-proxy', debuggerProxySocket.server)
      .register('/message', messageSocket.server)
      .register('/events', eventsSocket.server)
      .register('/inspector/device', inspectorProxyWss.deviceSocketServer)
      .register('/inspector/debug', inspectorProxyWss.debuggerSocketServer)
      .setup(app);

    await setupDevToolsProxy({
      client: {
        delegate: {
          onError: (error: Error) => logger.error('React DevTools client error', error),
        },
      },
      devtools: {
        delegate: {
          onError: (error: Error) => logger.error('React DevTools frontend error', error),
        },
      },
    });

    this.inspectorProxy = inspectorProxy;
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
