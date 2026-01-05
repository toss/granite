import { BroadcastCommand, ClientLogEvent, MessageBroadcaster } from '../../server/types';

interface WebSocketServerDelegateParams {
  eventReporter: (event: ClientLogEvent) => void;
  messageBroadcaster: MessageBroadcaster;
  hmr: {
    updateStart: () => void;
    updateDone: () => void;
    reload: () => void;
  };
}

export class WebSocketServerDelegate {
  constructor(private delegateParams: WebSocketServerDelegateParams) {}

  sendEvent(event: ClientLogEvent) {
    this.delegateParams.eventReporter(event);
  }

  broadcastCommand(command: BroadcastCommand, params?: Record<string, unknown>) {
    this.delegateParams.messageBroadcaster(command, params);
  }

  onHMRUpdateStart() {
    this.delegateParams.hmr.updateStart();
  }

  onHMRUpdateDone() {
    this.delegateParams.hmr.updateDone();
  }

  /**
   * @TODO: HMR 구현 필요 (대신 실시간 새로고침 제공)
   */
  hotReload() {
    this.delegateParams.hmr.reload();
  }
}
