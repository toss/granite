import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { logger } from '../../logger';

// eslint-disable-next-line @typescript-eslint/naming-convention
async function _indexPagePlugin(app: FastifyInstance) {
  app.route({
    method: ['GET'],
    url: '/',
    handler: async (_request, reply) => {
      logger.trace('index-page-plugin');

      reply.status(200).send('index page');
    },
  });
}

export const indexPagePlugin = fastifyPlugin(_indexPagePlugin, {
  name: 'index-page-plugin',
});
