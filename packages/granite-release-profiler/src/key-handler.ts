import readline from 'readline';

const CTRL_C = '\x03';
const CTRL_D = '\x04';

let state: 'idle' | 'busy' = 'idle';

export function setupKeyHandler(address: string) {
  if (!process.stdin.isTTY || process.stdin.setRawMode == null) {
    return;
  }

  console.log('Press d to print the connected device list');
  console.log('Press j to open the debugger');

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  process.stdin.on('keypress', (_, key: readline.Key) => {
    const { ctrl = false } = key;
    const sequence = key.sequence?.toLowerCase();

    if (sequence == null) {
      return;
    }

    if (ctrl && [CTRL_C, CTRL_D].includes(sequence)) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.emit('SIGINT');
      process.exit(0);
    }

    if (state === 'busy') {
      return;
    }

    if (sequence === 'd') {
      fetchDeviceList(address)
        .then(list => console.log(list))
        .finally(() => (state = 'idle'));
    } else if (sequence === 'j') {
      fetch(`${address}/json/list`, { method: 'GET' })
        .then(response => response.json())
        .then(list => {
          const [target] = (list ?? []) as any[];

          if ((list as any).length > 1) {
            console.warn('Multiple devices are connected. Opening the first device.');
          }

          if (target == null) {
            throw new Error('No connected device found');
          }

          state = 'busy';
          return fetch(new URL('/open-debugger?target=' + encodeURIComponent(target.id), address), {
            method: 'POST',
          });
        })
        .catch(console.error)
        .finally(() => (state = 'idle'));
    }
  });
}

function fetchDeviceList(address: string) {
  return fetch(`${address}/json/list`, { method: 'GET' }).then(response => response.json()) as Promise<any[]>;
}
