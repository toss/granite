import type { FastifyPluginAsync, FastifyPlugin } from 'fastify';
import type { HandleFunction } from 'connect';

export type Middleware = FastifyPluginAsync | FastifyPlugin;
export type MetroMiddleware = HandleFunction;

export interface DevServerConfig {
  middlewares?: Middleware[];
}

export interface MetroDevServerConfig {
  middlewares?: MetroMiddleware[];
}
