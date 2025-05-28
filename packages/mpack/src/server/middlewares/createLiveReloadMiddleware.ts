import * as ws from 'ws';
import { logger } from '../../logger';
import {
  ClientLogEvent,
  HmrClientMessage,
  HmrUpdateDoneMessage,
  HmrUpdateMessage,
  HmrUpdateStartMessage,
} from '../types';

/**
 * DevSettings reload 를 호출하는 스크립트.
 *
 * @see turboModuleProxy {@link https://github.com/facebook/react-native/blob/v0.72.6/packages/react-native/Libraries/TurboModule/TurboModuleRegistry.js#L17}
 * @see nativeModuleProxy {@link https://github.com/facebook/react-native/blob/v0.72.6/packages/react-native/Libraries/BatchedBridge/NativeModules.js#L179}
 *
 * ```ts
 * // 아래와 동일하게 동작함
 * import { DevSettings } from 'react-native';
 *
 * DevSettings.reload();
 * ```
 */
const getReloadByDevSettingsProxy = (): string => `(function () {
  var moduleName = "DevSettings";
  (window.__turboModuleProxy
    ? window.__turboModuleProxy(moduleName)
    : window.nativeModuleProxy[moduleName]).reload();
})();`;

const getMessage = (data: ws.Data): HmrClientMessage | null => {
  try {
    const parsedData = JSON.parse(String(data));
    return 'type' in parsedData ? (parsedData as HmrClientMessage) : null;
  } catch {
    return null;
  }
};

export const createLiveReloadMiddleware = ({ onClientLog }: { onClientLog?: (event: ClientLogEvent) => void }) => {
  const server = new ws.WebSocketServer({ noServer: true });
  let connectedSocket: ws.WebSocket | null = null;

  const handleClose = (): void => {
    connectedSocket = null;
  };

  const handleMessage = (event: ws.MessageEvent): void => {
    const message = getMessage(event.data);
    if (!message) {
      return;
    }

    /**
     * @see {@link https://github.com/facebook/metro/blob/v0.77.0/packages/metro/src/HmrServer.js#L200-L239}
     */
    switch (message.type) {
      case 'log': {
        onClientLog?.({
          type: 'client_log',
          level: message.level,
          data: message.data,
          mode: 'BRIDGE',
        });
        break;
      }

      // Not supported
      case 'register-entrypoints':
      case 'log-opt-in':
        break;
    }
  };

  const handleError = (error?: Error): void => {
    if (error) {
      logger.error('HMR update 메시지를 전송할 수 없습니다', error);
    }
  };

  /**
   * reload 코드를 클라이언트로 전달하여 새로고침
   *
   * @see metro {@link https://github.com/facebook/metro/blob/v0.77.0/packages/metro-runtime/src/modules/HMRClient.js#L91-L99}
   */
  const liveReload = (): void => {
    const hmrUpdateMessage: HmrUpdateMessage = {
      type: 'update',
      body: {
        added: [
          {
            module: [-1, getReloadByDevSettingsProxy()],
            sourceMappingURL: null,
            sourceURL: null,
          },
        ],
        deleted: [],
        modified: [],
        isInitialUpdate: false,
        revisionId: '',
      },
    };

    connectedSocket?.send(JSON.stringify(hmrUpdateMessage), handleError);
  };

  const updateStart = (): void => {
    const hmrUpdateStartMessage: HmrUpdateStartMessage = {
      type: 'update-start',
      body: {
        isInitialUpdate: false,
      },
    };
    connectedSocket?.send(JSON.stringify(hmrUpdateStartMessage), handleError);
  };

  const updateDone = (): void => {
    const hmrUpdateDoneMessage: HmrUpdateDoneMessage = { type: 'update-done' };
    connectedSocket?.send(JSON.stringify(hmrUpdateDoneMessage), handleError);
  };

  server.on('connection', (socket) => {
    connectedSocket = socket;
    connectedSocket.onerror = handleClose;
    connectedSocket.onclose = handleClose;
    connectedSocket.onmessage = handleMessage;
    logger.debug('HMR 웹소켓 연결됨');
  });

  server.on('error', (error) => {
    logger.error('HMR 웹소켓 서버 에러', error);
  });

  return { server, liveReload, updateStart, updateDone };
};
