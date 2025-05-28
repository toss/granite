import Debug from 'debug';
import * as ws from 'ws';
import { parseDomain } from './parseDomain';
import {
  CustomEvent,
  DebuggerRequest,
  GetResponseBodyRequest,
  NetworkResponseData,
  LegacyNetworkResponseData,
} from '../../vendors/@react-native/dev-middleware';

const debug = Debug('dev-server:debugger');

type NetworkResponseDataPayload = Pick<NetworkResponseData['params'], 'base64Encoded' | 'data'>;

export class DebuggerEventHandler {
  private networkResponseData = new Map<string, NetworkResponseDataPayload>();

  setDeviceWebSocketHandler(socket: ws.WebSocket) {
    socket.on('message', (message) => this.handleDeviceMessage(socket, message));
  }

  setDebuggerWebSocketHandler(socket: ws.WebSocket) {
    socket.on('message', (message) => this.handleDebuggerMessage(socket, message));
  }

  /**
   * 네이티브로부터 전달받은 wrappedEvent가 커스텀 이벤트인 경우 파싱하여 반환
   *
   * ```js
   * // message
   * {
   *   event: 'wrappedEvent',
   *   payload: {
   *     wrappedEvent: '<stringified event string>'
   *   }
   * }
   *
   * // wrappedEvent
   * {
   *   method: '<Namespace>.*',
   *   params: {}
   * }
   * ```
   */
  private safetyParseCustomEvent(message: ws.RawData) {
    try {
      const parsedMessage = JSON.parse(message.toString());

      if (parsedMessage.event === 'wrappedEvent') {
        const wrappedEventPayload = JSON.parse(parsedMessage?.payload?.wrappedEvent);
        const domain = parseDomain(wrappedEventPayload.method);

        if (domain === 'Bedrock' || domain === 'Granite') {
          return wrappedEventPayload as CustomEvent;
        }
      }
    } catch {
      // noop
    }

    return null;
  }

  /**
   * Chrome Devtools Frontend 로부터 전달받은 CDP 이벤트 요청 데이터인 경우 파싱하여 반환
   *
   * ```js
   * {
   *   method: 'CDP Event',
   *   params: {}
   * }
   * ```
   */
  private safetyParseDebuggerEvent(message: ws.RawData) {
    try {
      return JSON.parse(message.toString()) as DebuggerRequest;
    } catch {
      return null;
    }
  }

  private handleDeviceMessage(_socket: ws.WebSocket, message: ws.RawData) {
    const customEvent = this.safetyParseCustomEvent(message);

    if (customEvent == null) {
      return;
    }

    debug('handleDeviceMessage', customEvent);

    switch (customEvent.method) {
      case 'Bedrock.networkResponseData':
      case 'Granite.networkResponseData':
        this.handleNetworkResponseData(customEvent);
        return;
    }
  }

  private handleDebuggerMessage(socket: ws.WebSocket, message: ws.RawData) {
    let handled = true;
    const debuggerEvent = this.safetyParseDebuggerEvent(message);

    if (debuggerEvent == null) {
      return;
    }

    switch (debuggerEvent.method) {
      case 'Network.getResponseBody':
        this.handleGetResponseBody(socket, debuggerEvent);
        break;

      default:
        handled = false;
    }

    /**
     * Chrome Devtools Frontend 에서 넘어오는 CDP 이벤트 중 실제로 처리한 경우에만 로그에 남기도록 처리
     */
    if (handled) {
      debug('handleDebuggerMessage', debuggerEvent);
    }
  }

  private handleNetworkResponseData(event: LegacyNetworkResponseData | NetworkResponseData) {
    const { params } = event;

    if (typeof params.requestId === 'string') {
      this.networkResponseData.set(params.requestId, {
        data: params.data,
        base64Encoded: params.base64Encoded,
      });
    }
  }

  private handleGetResponseBody(socket: ws.WebSocket, event: GetResponseBodyRequest) {
    const requestId = event.params.requestId.toString();
    const responseData = this.networkResponseData.get(requestId);

    if (responseData == null) {
      return;
    }

    this.networkResponseData.delete(requestId);
    let base64Encoded = responseData.base64Encoded;
    let parsedOriginalData: null | object = null;

    try {
      parsedOriginalData = JSON.parse(responseData.base64Encoded ? atob(responseData.data) : responseData.data);
      base64Encoded = false;
    } catch {
      // noop
    }

    debug('handleGetResponseBody', responseData);

    socket.send(
      JSON.stringify({
        id: event.id,
        result: {
          /**
           * JSON 파싱 시도하여 실제로 JSON 형태의 값인지 확인
           *
           * - 파싱 성공: 파싱된 데이터 전송
           * - 파싱 실패: 기존 데이터 그대로 전송
           */
          body: typeof parsedOriginalData === 'object' ? JSON.stringify(parsedOriginalData) : responseData.data,
          base64Encoded,
        },
      })
    );
  }
}
