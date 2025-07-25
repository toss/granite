import path from 'path';
import type { BundleData } from '@granite-js/plugin-core';
import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { invalidRequest, notFound } from './reply';
import { logger } from '../../logger';
import { stripExtension } from '../../utils/stripExtension';
import { DEV_SERVER_BUNDLE_NAME } from '../constants';
import type { Platform } from '../types';

interface ServeBundleParams {
  file: string;
}

interface ServeBundleQueryParams {
  platform: Platform;
  dev: boolean;
  minify: boolean;
  runModule: boolean;
  inlineSourceMap: boolean;
  modulesOnly: boolean;
}

enum BundleResourceType {
  Bundle = 'bundle',
  Sourcemap = 'Sourcemap',
}

// eslint-disable-next-line @typescript-eslint/naming-convention
async function _serveBundlePlugin(
  app: FastifyInstance,
  { getBundle }: { getBundle: (platform: Platform) => Promise<BundleData> }
) {
  app.route({
    method: ['GET'],
    url: '/:file',
    schema: {
      querystring: {
        type: 'object',
        properties: {
          platform: {
            type: 'string',
          },
          app: {
            type: 'string',
          },
          dev: {
            type: 'boolean',
          },
          minify: {
            type: 'boolean',
          },
          runModule: {
            type: 'boolean',
          },
          inlineSourceMap: {
            type: 'boolean',
          },
          modulesOnly: {
            type: 'boolean',
          },
        },
        required: ['platform'],
      },
    },
    handler: async (request, reply) => {
      const { file } = request.params as Partial<ServeBundleParams>;
      const query = request.query as Partial<ServeBundleQueryParams>;
      const { platform } = query;

      logger.trace('serve-bundle-plugin', query);

      if (file == null) {
        return invalidRequest(reply, 'file is required');
      }

      const bundleResourceType = file.endsWith('.bundle')
        ? BundleResourceType.Bundle
        : file.endsWith('.map')
          ? BundleResourceType.Sourcemap
          : null;

      const isInvalidResourceType = bundleResourceType == null;
      const isInvalidPlatform = !(platform === 'android' || platform === 'ios');

      if (isInvalidResourceType || isInvalidPlatform) {
        return invalidRequest(reply, JSON.stringify({ isInvalidResourceType, platform }));
      }

      if (!(platform === 'android' || platform === 'ios')) {
        return invalidRequest(reply, 'invalid platform');
      }

      const { name } = path.parse(file);

      if (stripExtension(name) !== DEV_SERVER_BUNDLE_NAME) {
        return notFound(reply, `invalid bundle name: ${name}`);
      }

      const bundle = await getBundle(platform);

      switch (bundleResourceType) {
        case BundleResourceType.Bundle:
          return reply
            .headers({
              'Content-Type': 'application/javascript; charset=UTF-8',
              // TODO: Custom header injection
            })
            .status(200)
            .send(Buffer.from(bundle.source.contents).toString('utf-8'));

        case BundleResourceType.Sourcemap:
          return reply
            .header('Access-Control-Allow-Origin', 'devtools://devtools')
            .status(200)
            .send(Buffer.from(bundle.sourcemap.contents).toString('utf-8'));
      }
    },
  });
}

export const serveBundlePlugin = fastifyPlugin(_serveBundlePlugin, {
  name: 'serve-bundle-plugin',
});
