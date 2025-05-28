import url from 'url';
import { unstable_InspectorProxy } from '@react-native/dev-middleware';
import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import * as ws from 'ws';
import { Device } from './Device';
import { logger } from '../../../logger';

// New Debugger, 네트워크 인스펙터 기능은 별도로 제공하기 때문에 옵션에서 비활성화
const experiments = {
  enableNewDebugger: false,
  enableNetworkInspector: false,
  enableOpenDebuggerRedirect: false,
};

/**
 * @see origin {@link https://github.com/facebook/react-native/blob/v0.73.0/packages/dev-middleware/src/inspector-proxy/InspectorProxy.js#L28-L34}
 */
const PAGES_LIST_JSON_URL = '/json';
const PAGES_LIST_JSON_URL_2 = '/json/list';
const PAGES_LIST_JSON_VERSION_URL = '/json/version';
const INTERNAL_ERROR_CODE = 1011;

export class InspectorProxy extends unstable_InspectorProxy {
  constructor({ root, serverBaseUrl }: { root: string; serverBaseUrl: string }) {
    super(root, serverBaseUrl, null, experiments);
  }

  /**
   * 커스텀 Device 를 사용하기 위해 `InspectorProxy.createWebSocketListeners` 를 재구성한 메소드
   */
  createWebSocketServers({
    onDeviceWebSocketConnected,
    onDebuggerWebSocketConnected,
  }: {
    onDeviceWebSocketConnected: (socket: ws.WebSocket) => void;
    onDebuggerWebSocketConnected: (socket: ws.WebSocket) => void;
  }) {
    return {
      deviceSocketServer: this.createDeviceWebSocketServer(onDeviceWebSocketConnected),
      debuggerSocketServer: this.createDebuggerWebSocketServer(onDebuggerWebSocketConnected),
    };
  }

  /**
   * Fastify 에서 사용할 수 있도록 `InspectorProxy.processRequest` 의 인터페이스를 재구성한 메소드
   */
  handleRequest(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
    const { pathname } = url.parse(request.url);

    switch (pathname) {
      case PAGES_LIST_JSON_URL:
      case PAGES_LIST_JSON_URL_2:
        this.sendJsonResponse(reply, this.getPageDescriptions());
        break;

      case PAGES_LIST_JSON_VERSION_URL:
        this.sendJsonResponse(reply, { Browser: 'Mobile JavaScript', 'Protocol-Version': '1.1' });
        break;
    }

    done();
  }

  /**
   * 토스 커스텀 디버거를 띄우기 위해 내부 devices 를 노출시켜야 함
   */
  getDevices() {
    return this._devices as Map<string, Device>;
  }

  private sendJsonResponse(reply: FastifyReply, object: any) {
    const data = JSON.stringify(object, null, 2);

    reply
      .status(200)
      .headers({
        'Content-Type': 'application/json; charset=UTF-8',
        'Cache-Control': 'no-cache',
        'Content-Length': data.length.toString(),
        Connection: 'close',
      })
      .send(data);
  }

  private createDeviceWebSocketServer(onConnected: (socket: ws.WebSocket) => void): ws.WebSocketServer {
    const wss = new ws.WebSocketServer({
      noServer: true,
      perMessageDeflate: true,
    });

    wss.on('connection', async (socket, request) => {
      try {
        const fallbackDeviceId = String(this._deviceCounter++);

        const query = url.parse(request.url || '', true).query || {};
        const deviceId = query.device || fallbackDeviceId;
        const deviceName = query.name || 'Unknown';
        const appName = query.app || 'Unknown';

        logger.trace('Device 소켓 연결됨', { deviceId, deviceName, appName });

        if (Array.isArray(deviceId) || Array.isArray(deviceName) || Array.isArray(appName)) {
          return;
        }

        const oldDevice = this._devices.get(deviceId);
        const newDevice = new Device(deviceId, deviceName, appName, socket, this._projectRoot);

        if (oldDevice) {
          oldDevice.handleDuplicateDeviceConnection(newDevice);
        }

        this._devices.set(deviceId, newDevice);

        socket.on('close', () => {
          logger.trace('Device 소켓 연결 끊김', { deviceId });
          this._devices.delete(deviceId);
        });

        onConnected(socket);
      } catch (error) {
        const errorMessage = (error as Error)?.toString() ?? 'Unknown error';
        logger.error('Device 소켓 에러', errorMessage);
        socket.close(INTERNAL_ERROR_CODE, errorMessage);
      }
    });

    return wss;
  }

  private createDebuggerWebSocketServer(onConnected: (socket: ws.WebSocket) => void): ws.WebSocketServer {
    const wss = new ws.WebSocketServer({
      noServer: true,
      perMessageDeflate: false,
      maxPayload: 0,
    });

    wss.on('connection', async (socket, request) => {
      try {
        const query = url.parse(request.url || '', true).query || {};
        const deviceId = query.device;
        const pageId = query.page;
        const userAgent = query.userAgent;

        logger.trace('Debugger 소켓 연결됨', { deviceId, pageId, userAgent });

        if (deviceId == null || pageId == null) {
          throw new Error('커넥션 요청에 device, page 매개변수가 존재해야 합니다');
        }

        if (Array.isArray(deviceId) || Array.isArray(pageId) || Array.isArray(userAgent)) {
          return;
        }

        const device = this._devices.get(deviceId);

        if (device == null) {
          throw new Error(`${deviceId} 에 해당하는 기기를 찾을 수 없습니다`);
        }

        device.handleDebuggerConnection(socket, pageId, {
          userAgent: request.headers['user-agent'] ?? userAgent ?? null,
        });

        onConnected(socket);
      } catch (error) {
        const errorMessage = (error as Error)?.toString() ?? 'Unknown error';
        logger.error('Debugger 소켓 에러', errorMessage);
        socket.close(INTERNAL_ERROR_CODE, errorMessage);
      }
    });

    return wss;
  }
}
