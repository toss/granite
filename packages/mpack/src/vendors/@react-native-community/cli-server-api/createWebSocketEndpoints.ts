import createDebuggerProxyEndpoint from '@react-native-community/cli-server-api/build/websocket/createDebuggerProxyEndpoint';
import createEventsSocketEndpoint from '@react-native-community/cli-server-api/build/websocket/createEventsSocketEndpoint';
import createMessageSocketEndpoint from '@react-native-community/cli-server-api/build/websocket/createMessageSocketEndpoint';
import { BroadcastCommand, MessageBroadcaster } from '../../../server/types';

interface WebSocketEndpointOptions {
  broadcast: MessageBroadcaster;
}

/**
 * import('@react-native-community/cli-server-api').createDevServerMiddleware 의 경우
 * 불필요한 미들웨어 구성까지 포함시키고 있기 때문에 필요한 대상만 가져와서 사용
 */
export function createWebSocketEndpoints(options: WebSocketEndpointOptions) {
  return {
    debuggerProxySocket: createDebuggerProxyEndpoint(),
    eventsSocket: createEventsSocketEndpoint((method, params) => options.broadcast(method as BroadcastCommand, params)),
    messageSocket: createMessageSocketEndpoint(),
  };
}
