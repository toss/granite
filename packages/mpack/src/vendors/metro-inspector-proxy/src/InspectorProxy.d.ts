import * as http from 'http';
import * as ws from 'ws';

declare class Device {
  getName(): string;
  getPageList(): unknown[];
}

declare class InspectorProxy {
  static devices: Map<number, Device>;

  processRequest: (request: http.IncomingMessage, response: http.ServerResponse, next: (error?: Error) => void) => void;
  createWebSocketListeners: (server: http.Server) => {
    ['/inspector/device']: ws.WebSocketServer;
    ['/inspector/debug']: ws.WebSocketServer;
  };

  constructor(projectRoot: string);
}

export default InspectorProxy;
