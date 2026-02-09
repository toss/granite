import type { IncomingMessage, ServerResponse } from 'node:http';
import type { GranitePluginCore, MetroMiddleware } from '@granite-js/plugin-core';
import { getPackageRoot } from '@granite-js/utils';
import { initializeRozenite } from '@rozenite/middleware';
import type { NextHandleFunction } from 'connect';
import type { RozenitePluginOptions } from './types';

const PLUGIN_NAME = 'rozenite-plugin';

const createRozeniteMiddleware = (
  projectRoot: string,
  options: Omit<RozenitePluginOptions, 'enabled'>
): MetroMiddleware => {
  // Default to explicit include to bypass node_modules auto-discovery (PnP compatible)
  if (!options.include) {
    options = { ...options, include: [] };
  }

  let rozeniteMiddleware: MetroMiddleware | undefined;

  const middleware: MetroMiddleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: NextHandleFunction
  ) => {
    if (rozeniteMiddleware == null) {
      try {
        const { middleware } = initializeRozenite({
          projectRoot,
          ...options,
        });

        rozeniteMiddleware = middleware as unknown as MetroMiddleware;
      } catch (e) {
        console.error('[rozenite-plugin] initializeRozenite FAILED:', e);
        return (next as unknown as (err?: unknown) => void)();
      }
    }

    const handler = rozeniteMiddleware as unknown as (
      req: IncomingMessage,
      res: ServerResponse,
      next: NextHandleFunction
    ) => void;

    return handler(req, res, next);
  };

  return middleware;
};

export const rozenitePlugin = (options: RozenitePluginOptions = {}): GranitePluginCore => {
  const { enabled = true, ...rozeniteOptions } = options;

  if (!enabled) {
    return { name: PLUGIN_NAME };
  }

  const projectRoot = getPackageRoot();

  return {
    name: PLUGIN_NAME,
    config: {
      metro: {
        middlewares: [createRozeniteMiddleware(projectRoot, rozeniteOptions)],
      },
    },
  };
};
