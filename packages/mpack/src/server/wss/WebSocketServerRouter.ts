import * as http from 'http';
import { Duplex } from 'stream';
import * as url from 'url';
import { FastifyInstance } from 'fastify';
import * as ws from 'ws';

export class WebSocketServerRouter {
  private webSocketServers = new Map<string, ws.WebSocketServer>();

  register(path: string, wss: ws.WebSocketServer) {
    this.webSocketServers.set(path, wss);
    return this;
  }

  setup(app: FastifyInstance) {
    app.server.on('upgrade', this.onUpgrade.bind(this));
  }

  private onUpgrade(request: http.IncomingMessage, socket: Duplex, head: Buffer) {
    if (!request.url) {
      return;
    }

    let upgraded = false;
    const { pathname } = url.parse(request.url);

    for (const [path, wss] of this.webSocketServers.entries()) {
      if (path === pathname) {
        wss.handleUpgrade(request, socket, head, client => {
          wss.emit('connection', client, request);
        });
        upgraded = true;
      }
    }

    if (!upgraded) {
      socket.destroy();
    }
  }
}
