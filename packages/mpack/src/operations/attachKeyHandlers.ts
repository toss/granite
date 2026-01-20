import readline from 'readline';
import { ReadStream } from 'tty';
import { styleText } from 'util';
import OpenDebuggerKeyboardHandler from './OpenDebuggerKeyboardHandler';

const CTRL_C = '\u0003';
const CTRL_D = '\u0004';
const RELOAD_TIMEOUT = 500;

type KeyEvent = {
  sequence?: string;
  name?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
};

type MessageSocketEndpoint = {
  broadcast: (type: string, params?: Record<string, unknown> | null) => void;
};

type Reporter = {
  update: (event: { type: string; [key: string]: unknown }) => void;
};

const throttle = (callback: () => void, timeout: number) => {
  let previousCallTimestamp = 0;
  return () => {
    const currentCallTimestamp = Date.now();
    if (currentCallTimestamp - previousCallTimestamp > timeout) {
      previousCallTimestamp = currentCallTimestamp;
      callback();
    }
  };
};

export default function attachKeyHandlers({
  devServerUrl,
  messageSocket,
  reporter,
}: {
  devServerUrl: string;
  messageSocket: MessageSocketEndpoint;
  reporter: Reporter;
}) {
  if (process.stdin.isTTY !== true) {
    reporter.update({
      type: 'unstable_server_log',
      level: 'info',
      data: 'Interactive mode is not supported in this environment',
    });
    return;
  }

  readline.emitKeypressEvents(process.stdin);
  setRawMode(true);

  const reload = throttle(() => {
    reporter.update({
      type: 'unstable_server_log',
      level: 'info',
      data: 'Reloading connected app(s)...',
    });
    messageSocket.broadcast('reload', null);
  }, RELOAD_TIMEOUT);

  const openDebuggerKeyboardHandler = new OpenDebuggerKeyboardHandler({
    reporter,
    devServerUrl,
  });

  process.stdin.on('keypress', (_str: string, key: KeyEvent) => {
    void _str;
    const keyName = key?.name;
    if (keyName && openDebuggerKeyboardHandler.maybeHandleTargetSelection(keyName)) {
      return;
    }

    switch (key?.sequence) {
      case 'r':
        reload();
        break;
      case 'd':
        reporter.update({
          type: 'unstable_server_log',
          level: 'info',
          data: 'Opening Dev Menu...',
        });
        messageSocket.broadcast('devMenu', null);
        break;
      case 'j':
        void openDebuggerKeyboardHandler.handleOpenDebugger();
        break;
      case CTRL_C:
      case CTRL_D:
        openDebuggerKeyboardHandler.dismiss();
        reporter.update({
          type: 'unstable_server_log',
          level: 'info',
          data: 'Stopping server',
        });
        setRawMode(false);
        process.stdin.pause();
        process.emit('SIGINT');
        process.exit();
    }
  });

  reporter.update({
    type: 'unstable_server_log',
    level: 'info',
    data: `Key commands available:\n\n  ${styleText(['bold', 'inverse'], ' r ')} - reload app(s)\n  ${styleText(
      ['bold', 'inverse'],
      ' d '
    )} - open Dev Menu\n  ${styleText(['bold', 'inverse'], ' j ')} - open DevTools\n`,
  });
}

function setRawMode(enable: boolean) {
  if (!(process.stdin instanceof ReadStream)) {
    throw new Error('process.stdin must be a readable stream to modify raw mode');
  }
  process.stdin.setRawMode(enable);
}
