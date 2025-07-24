import type { HandleFunction } from 'connect';
import type { FastifyPluginAsync, FastifyPluginCallback } from 'fastify';

export type Middleware = FastifyPluginAsync | FastifyPluginCallback;
export type MetroMiddleware = HandleFunction;

export interface DevServerConfig {
  middlewares?: Middleware[];
}

export interface MetroDevServerConfig {
  middlewares?: MetroMiddleware[];
}
