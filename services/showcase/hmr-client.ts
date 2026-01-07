import type { HMRClientLogLevel, HMRClientMessage, HMRServerMessage } from 'rollipop';

const prettyFormat = require('pretty-format');
declare var __DEV__: boolean;

interface HMRClientNativeInterface {
  enable(): void;
  disable(): void;
  registerBundle(requestUrl: string): void;
  log(level: string, data: any[]): void;
  setup(
    platform: string,
    bundleEntry: string,
    host: string,
    port: number | string,
    isEnabled: boolean,
    scheme?: string
  ): void;
}

interface SocketInstance {
  socket: WebSocket;
  origin: string;
}

class HMRClient implements HMRClientNativeInterface {
  static readonly STARTUP_ERROR = 'Expected HMRClient.setup() call at startup';
  static readonly MAX_PENDING_LOGS = 100;

  private enabled = true;
  private _socketHolder: SocketInstance | null = null;
  private unavailableMessage: string | null = null;
  private compileErrorMessage: string | null = null;
  private pendingUpdatesCount = 0;
  private readonly pendingLogs: [HMRClientLogLevel, any[]][] = [];

  enable() {
    if (this.unavailableMessage) {
      throw new Error(this.unavailableMessage);
    }

    if (this._socketHolder == null) {
      throw new Error(HMRClient.STARTUP_ERROR);
    }

    this.enabled = true;
    this.showCompileErrorIfNeeded();
  }

  disable() {
    this.enabled = false;
  }

  registerBundle(requestUrl: string) {
    if (this._socketHolder == null) {
      throw new Error(HMRClient.STARTUP_ERROR);
    }

    if (!requestUrl.startsWith(this._socketHolder.origin)) {
      console.warn(
        `[HMR]: Cannot register bundle from unknown origin:\n${requestUrl}\n` +
          `(expected: ${this._socketHolder.origin})`
      );
      return;
    }

    // Nothing to do for Rollipop HMR runtime
  }

  log(level: HMRClientLogLevel, data: any[]) {
    if (this._socketHolder == null) {
      this.pendingLogs.push([level, data]);
      if (this.pendingLogs.length > HMRClient.MAX_PENDING_LOGS) {
        this.pendingLogs.shift();
      }
      return;
    }

    try {
      const prettifyData = data.map((item) =>
        typeof item === 'string'
          ? item
          : prettyFormat.format(item, {
              escapeString: true,
              highlight: true,
              maxDepth: 3,
              min: true,
              plugins: [prettyFormat.plugins.ReactElement],
            })
      );

      this.send({ type: 'hmr:log', level, data: prettifyData });
    } catch {}
  }

  setup(
    platform: string,
    bundleEntry: string,
    host: string,
    port: number | string,
    isEnabled = true,
    protocol = 'http'
  ) {
    if (!__DEV__) {
      throw new Error('HMR is only available in development mode');
    }

    if (this._socketHolder != null) {
      throw new Error('Cannot initialize HMRClient more than once');
    }

    if (platform == null) {
      throw new Error('Missing required parameter `platform`');
    }

    if (bundleEntry == null) {
      throw new Error('Missing required parameter `bundleEntry`');
    }

    if (host == null) {
      throw new Error('Missing required parameter `host`');
    }

    const serverHost = port !== null && port !== '' ? `${host}:${port}` : host;
    const origin = `${protocol}://${serverHost}`;
    const socket = new globalThis.WebSocket(`${origin}/hot`);

    this._socketHolder = { socket, origin };

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'hmr:connected', bundleEntry, platform } satisfies HMRClientMessage));
      this.handleConnection();
    });

    socket.addEventListener('error', (event) => {
      this.handleConnectionError(event.error, origin);
    });

    socket.addEventListener('message', (event) => {
      this.handleMessage(event);
    });

    socket.addEventListener('close', (event) => {
      this.handleClose(event);
    });

    // `__rolldown_runtime__` can be undefined when HMR is disabled.
    if (globalThis.__rolldown_runtime__ != null) {
      globalThis.__rolldown_runtime__.setup(socket, origin);
    }

    this.enabled = isEnabled;
  }

  private send(payload: HMRClientMessage) {
    if (this._socketHolder == null) {
      return;
    }

    if (this._socketHolder.socket.readyState === WebSocket.OPEN) {
      this._socketHolder.socket.send(JSON.stringify(payload));
    }
  }

  private flushEarlyLogs() {
    if (this._socketHolder == null || this._socketHolder.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    for (const [level, data] of this.pendingLogs) {
      this.send({ type: 'hmr:log', level, data });
    }

    this.pendingLogs.length = 0;
  }

  private dismissRedbox() {
    // noop
  }

  private showCompileErrorIfNeeded() {
    if (this.compileErrorMessage == null) {
      return;
    }

    this.dismissRedbox();

    const error = new Error(this.compileErrorMessage);
    this.compileErrorMessage = null;

    Object.defineProperty(error, 'preventSymbolication', { value: true });

    throw error;
  }

  private showUnavailableMessageIfNeeded() {
    if (this.unavailableMessage == null) {
      return;
    }

    if (this.enabled) {
      console.warn(this.unavailableMessage);
    }
  }

  private handleConnection() {
    this.flushEarlyLogs();
  }

  private handleConnectionError(error: Error, origin: string) {
    let errorMessage =
      'Cannot connect to Rollipop.\n\n' +
      'Try the following to fix the issue:\n' +
      '- Ensure that Rollipop is running and available on the same network';

    if (true) {
      errorMessage += '- Ensure that the Rollipop URL is correctly set in AppDelegate';
    } else {
      errorMessage +=
        `- Ensure that your device/emulator is connected to your machine and has USB debugging enabled - run 'adb devices' to see a list of connected devices\n` +
        `- If you're on a physical device connected to the same machine, run 'adb reverse tcp:8081 tcp:8081' to forward requests from your device\n` +
        `- If your device is on the same Wi-Fi network, set 'Debug server host & port for device' in 'Dev settings' to your machine's IP address and the port of the local dev server - e.g. 10.0.1.1:8081`;
    }

    errorMessage += `\n\nURL: ${origin}` + `\n\nError: ${error.message}`;

    this.unavailableMessage ??= errorMessage;
    this.showCompileErrorIfNeeded();
  }

  private handleMessage(message: MessageEvent) {
    const data = JSON.parse(String(message.data)) as HMRServerMessage;

    if (!this.enabled && data.type.startsWith('hmr:')) {
      return;
    }

    switch (data.type) {
      case 'hmr:update-start':
        this.pendingUpdatesCount++;
        this.compileErrorMessage = null;
        break;

      case 'hmr:update':
        this.dismissRedbox();
        break;

      case 'hmr:update-done':
        this.pendingUpdatesCount = Math.max(0, this.pendingUpdatesCount - 1);
        break;

      case 'hmr:error':
        this.compileErrorMessage = data.payload.message;
        this.showCompileErrorIfNeeded();
        break;
    }
  }

  private handleClose(event: any) {
    const { code, reason } = event;
    // https://www.rfc-editor.org/rfc/rfc6455.html#section-7.4.1
    // https://www.rfc-editor.org/rfc/rfc6455.html#section-7.1.5
    const isNormalOrUnsetCloseReason = code === 1000 || code === 1005;

    const message = isNormalOrUnsetCloseReason
      ? 'Disconnected from Rollipop.'
      : `Disconnected from Rollipop (${code}: "${reason}").`;

    this.unavailableMessage ??=
      message +
      '\n\n' +
      'To reconnect:\n' +
      '- Ensure that Rollipop is running and available on the same network\n' +
      '- Reload this app (will trigger further help if Rollipop cannot be connected to)\n';

    this.showUnavailableMessageIfNeeded();
  }
}

module.exports = new HMRClient();
