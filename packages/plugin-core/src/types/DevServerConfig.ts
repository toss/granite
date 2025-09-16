import type { HandleFunction } from 'connect';
import type { FastifyPluginAsync, FastifyPluginCallback } from 'fastify';
import * as ws from 'ws';

export type Middleware = FastifyPluginAsync | FastifyPluginCallback;
export type MetroMiddleware = HandleFunction;

export interface InspectorProxyConfig {
  delegate?: {
    /**
     * @param message CDP message from the connected device
     * @param socket `WebSocket` instance that connected to the device
     * @returns `true` if the message is handled, `false` otherwise
     */
    onDeviceMessage?: <DeviceMessage extends { method: string; params: Record<string, any> }>(
      message: DeviceMessage,
      socket: ws.WebSocket
    ) => boolean;
    /**
     * @param message CDP message from debugger
     * @param socket `WebSocket` instance that connected to debugger
     * @returns `true` if the message is handled, `false` otherwise
     */
    onDebuggerMessage?: <DebuggerMessage extends { method: string; params: Record<string, any> }>(
      message: DebuggerMessage,
      socket: ws.WebSocket
    ) => boolean;
  };
}

export interface DevServerConfig {
  middlewares?: Middleware[];
  inspectorProxy?: InspectorProxyConfig;
}

export interface MetroDevServerConfig {
  middlewares?: MetroMiddleware[];
  inspectorProxy?: InspectorProxyConfig;
}
