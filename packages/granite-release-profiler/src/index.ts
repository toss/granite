import fs from 'node:fs';
import { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { Duplex } from 'node:stream';
import url, { fileURLToPath } from 'node:url';
import middie from '@fastify/middie';
import { initializeRozenite } from '@rozenite/middleware';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import * as ws from 'ws';
import { setupKeyHandler } from './key-handler';
import { parseUrl } from './url';

type MiddlewareNext = () => void;
type MiddlewareHandler = (req: IncomingMessage, res: ServerResponse, next: MiddlewareNext) => void;
type ReactNativeDevMiddleware = typeof import('@react-native/dev-middleware');
type MiddlewareCapableFastify = ReturnType<typeof Fastify> & {
  use(handler: MiddlewareHandler): MiddlewareCapableFastify;
};

const require = createRequire(import.meta.url);

export interface ReleaseProfilerServerOptions {
  host?: string;
  port?: number;
  projectRoot?: string;
}

export async function startReleaseProfilerServer(options: ReleaseProfilerServerOptions) {
  const host = options.host ?? 'localhost';
  const port = options.port ?? 8081;
  const projectRoot = options.projectRoot ?? path.resolve(fileURLToPath(new URL('..', import.meta.url)));

  const fastify = Fastify();
  const rozenite = initializeRozenite({
    projectRoot,
    include: ['@rozenite/tanstack-query-plugin'],
  });
  const { createDevMiddleware } = loadRozenitePatchedDevMiddleware(projectRoot);

  const { middleware: devMiddleware, websocketEndpoints } = createDevMiddleware({
    serverBaseUrl: url.format({ protocol: 'http', hostname: host, port }),
    unstable_experiments: {
      enableNetworkInspector: true,
      enableStandaloneFuseboxShell: false,
    },
  });

  const deviceWss = websocketEndpoints['/inspector/device'] as ws.WebSocketServer;
  const tracingEvents: any[] = [];

  deviceWss.on('connection', socket => {
    socket.on('message', message => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        if (typeof parsedMessage?.payload?.wrappedEvent === 'object') {
          const cdpEvent = parsedMessage?.payload?.wrappedEvent;

          if (cdpEvent.method === 'Tracing.start') {
            tracingEvents.length = 0;
          }

          if (cdpEvent.method === 'Tracing.dataCollected') {
            tracingEvents.push(cdpEvent);
          }

          if (cdpEvent.method === 'Tracing.tracingComplete') {
            fs.writeFileSync(path.join(process.cwd(), 'tracing-events.json'), JSON.stringify(tracingEvents, null, 2));
            console.log('Tracing Complete!', tracingEvents.length);
            tracingEvents.length = 0;
          }
        }
      } catch {}
    });
  });

  await fastify.register(middie);

  const fastifyWithMiddleware = fastify as MiddlewareCapableFastify;

  fastifyWithMiddleware
    .setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
      reply.code(404).send({ error: 'Not found' });
    })
    .use(rozenite.middleware as MiddlewareHandler)
    .use(devMiddleware as MiddlewareHandler);

  process.once('SIGINT', () => {
    void rozenite.dispose();
  });

  fastify.get('/status', (_request, reply) => {
    reply.status(200).send('packager-status:profiler-only');
  });

  fastify.server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer<ArrayBuffer>) => {
    if (request.url == null) {
      socket.destroy();
      return;
    }

    const { pathname } = parseUrl(request.url);
    if (pathname != null && websocketEndpoints[pathname]) {
      const wss = websocketEndpoints[pathname];
      wss.handleUpgrade(request, socket, head, (socket: any) => {
        wss.emit('connection', socket, request);
      });
    } else {
      socket.destroy();
    }
  });

  const address = await fastify.listen({ host, port });
  console.log(`Server is running on ${address}`);
  setupKeyHandler(address);

  return {
    address,
    close: async () => {
      await rozenite.dispose();
      await fastify.close();
    },
  };
}

function loadRozenitePatchedDevMiddleware(projectRoot: string): ReactNativeDevMiddleware {
  const reactNativePackageJsonPath = require.resolve('react-native/package.json', { paths: [projectRoot] });
  const reactNativePackagePath = path.dirname(reactNativePackageJsonPath);
  const communityCliPluginPath = require.resolve('@react-native/community-cli-plugin', {
    paths: [reactNativePackagePath],
  });
  const devMiddlewarePath = require.resolve('@react-native/dev-middleware', {
    paths: [path.dirname(communityCliPluginPath)],
  });

  return require(devMiddlewarePath) as ReactNativeDevMiddleware;
}
