import * as url from 'url';
import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { parseStackFrame } from './parseStackFrame';
import { symbolicate } from './symbolicate';
import { BundleData } from '../../../bundler/types';
import { logger } from '../../../logger';
import { stripExtension } from '../../../utils/stripExtension';
import { DEV_SERVER_BUNDLE_NAME } from '../../constants';
import type { Platform } from '../../types';
import { invalidRequest, notFound } from '../reply';

async function symbolicatePluginImpl(
  app: FastifyInstance,
  { getBundle }: { getBundle: (platform: Platform) => Promise<BundleData> }
) {
  app.route({
    method: ['GET', 'POST'],
    url: '/symbolicate',
    handler: async (request, reply) => {
      logger.debug('symbolicate-plugin', { body: request.body });

      const stackFrame = parseStackFrame(request.body);

      if (stackFrame == null) {
        return invalidRequest(reply, 'invalid stack frame data');
      }

      const devBundlePath = stackFrame.find(({ file }) => file.startsWith('http'));

      if (devBundlePath == null) {
        return notFound(reply, 'no sourcemap found');
      }

      const {
        pathname,
        query: { platform },
      } = url.parse(devBundlePath.file, true);

      if (stripExtension(pathname ?? '') !== DEV_SERVER_BUNDLE_NAME) {
        return notFound(reply, `invalid bundle name: ${pathname}`);
      }

      if (!(platform === 'android' || platform === 'ios')) {
        return invalidRequest(reply, 'invalid platform');
      }

      const { sourcemap } = await getBundle(platform);

      return reply.status(200).send(await symbolicate(sourcemap.contents, stackFrame));
    },
  });
}

export const symbolicatePlugin = fastifyPlugin(symbolicatePluginImpl, {
  name: 'symbolicate-plugin',
});
