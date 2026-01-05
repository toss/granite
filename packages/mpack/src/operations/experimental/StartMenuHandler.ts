import readline from 'readline';
import chalk from 'chalk';

interface Menu {
  key: string;
  description: string;
  action: () => void;
}

export class StartMenuHandler {
  constructor(private menus: Menu[]) {}

  attach() {
    const isSupportInteractiveMode = process.stdout.isTTY && typeof process.stdin.setRawMode === 'function';

    if (isSupportInteractiveMode) {
      // https://nodejs.org/api/tty.html#readstreamsetrawmodemode
      readline.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
      process.stdin.setEncoding('utf8');
      process.stdin.on('keypress', this.keyPressHandler.bind(this));

      process.stdout.write('\n');
      this.menus.forEach(({ key, description }) => {
        console.log(`${chalk.bold(key)} - ${description}`);
      });
      process.stdout.write('\n');
    }

    return this;
  }

  close() {
    process.stdin.off('keypress', this.keyPressHandler);
  }

  private keyPressHandler(_data: unknown, { ctrl, name }: { ctrl: boolean; name: string }) {
    // 영문 상태인 경우 대소문자 구분 없이 소문자 값이 전달되나, 한글인 경우 undefined 가 전달됨.
    if (name === undefined) {
      console.log('한/영키를 확인해주세요');
      return;
    }

    if (ctrl) {
      switch (name) {
        // Ctrl + C: SIGINT
        case 'c':
          process.exit(0);
          return;

        // Ctrl + Z: SIGTSTP
        case 'z':
          process.emit('SIGTSTP', 'SIGTSTP');
          return;
      }

      return;
    }

    this.menus.forEach(({ key, action }) => {
      if (key === name) {
        action();
      }
    });
  }
}
