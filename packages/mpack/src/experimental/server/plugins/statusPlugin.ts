import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

interface StatusPluginConfig {
  rootDir: string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
async function _statusPlugin(app: FastifyInstance, config: StatusPluginConfig) {
  app.route({
    method: ['GET'],
    url: '/status',
    handler: async (_request, reply) => {
      reply.header('X-React-Native-Project-Root', config.rootDir).status(200).send('packager-status:running');
    },
  });
}

export const statusPlugin = fastifyPlugin(_statusPlugin, {
  name: 'status-plugin',
});
