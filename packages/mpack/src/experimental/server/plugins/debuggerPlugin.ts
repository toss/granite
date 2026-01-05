import fastifyStatic from '@fastify/static';
import debuggerFrontendPath from '@granite-js/devtools-frontend';
import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { DEBUGGER_FRONTEND_PATH } from '../../../constants';
import { logger } from '../../../logger';

interface DebuggerPluginConfig {
  onReload: () => void;
}

async function debuggerPluginImpl(app: FastifyInstance, config: DebuggerPluginConfig) {
  logger.debug('debugger-plugin', { root: debuggerFrontendPath, prefix: DEBUGGER_FRONTEND_PATH });

  app.register(fastifyStatic, {
    root: debuggerFrontendPath,
    prefix: DEBUGGER_FRONTEND_PATH,
  });

  app
    .route({
      method: ['GET', 'POST'],
      url: '/open-debugger',
      handler: async (request, reply) => {
        logger.trace('open-debugger-plugin', { body: request.body });

        reply.status(404);
      },
    })
    .route({
      method: ['GET', 'POST'],
      url: '/reload',
      handler: async (_request, reply) => {
        logger.trace('debugger-plugin');

        config.onReload();

        reply.status(200).send('OK');
      },
    });
}

export const debuggerPlugin = fastifyPlugin(debuggerPluginImpl, {
  name: 'debugger-plugin',
});
