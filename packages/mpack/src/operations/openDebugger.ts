import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { getChromePath, launch } from 'chrome-launcher';
import { DEBUGGER_FRONTEND_PATH, DEBUGGER_TEMP_DIR, REACT_NATIVE_INSPECTOR_PAGE } from './constants';

export async function openDebugger(host = 'localhost', port: number, deviceId: string) {
  const appUrl = getDevToolsFrontendUrl(host, port, deviceId);
  const tempDir = await createTemporaryDirectory();
  const chromePath = getChromePath();

  if (!chromePath) {
    throw new Error('unable to get Chrome browser path');
  }

  return launch({
    chromePath,
    chromeFlags: [
      `--app=${appUrl}`,
      `--user-data-dir=${tempDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1200,800',
    ],
  });
}

function getDevToolsFrontendUrl(host: string, port: number, deviceId: string): string {
  const wsUrl = `${host}:${port}/inspector/debug?device=${deviceId}&page=-1`;

  const url = new URL(`http://${host}:${port}/${DEBUGGER_FRONTEND_PATH}/${REACT_NATIVE_INSPECTOR_PAGE}`);
  url.searchParams.set('ws', wsUrl);
  url.searchParams.set('unstable_enableNetworkPanel', 'true');
  url.searchParams.set('sources.hide_add_folder', 'true');

  return url.toString();
}

async function createTemporaryDirectory() {
  const tempDir = path.join(os.tmpdir(), DEBUGGER_TEMP_DIR);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}
