import { type as osType } from 'os';
import path from 'path';
import { getPackageRoot } from '@granite-js/utils';

const BINARY_PATH = {
  Darwin: 'react-native/sdks/hermesc/osx-bin/hermesc',
  Linux: 'react-native/sdks/hermesc/linux64-bin/hermesc',
  Windows_NT: 'react-native/sdks/hermesc/win64-bin/hermesc.exe',
} as const;

/**
 * Returns the Hermes OS binary folder name for the current platform.
 */
function getHermesOSBin(): string {
  switch (process.platform) {
    case 'win32':
      return 'win64-bin';
    case 'darwin':
      return 'osx-bin';
    default:
      return 'linux64-bin';
  }
}

/**
 * Returns the Hermes executable name for the current platform.
 */
function getHermesOSExe(): string {
  const hermesExecutableName = 'hermesc';
  return process.platform === 'win32' ? `${hermesExecutableName}.exe` : hermesExecutableName;
}

function getReactNativePackagePath(root: string): string {
  try {
    return path.dirname(
      require.resolve('react-native/package.json', {
        paths: [root],
      })
    );
  } catch {
    return path.join('node_modules', 'react-native');
  }
}

export function resolveHermesBinaryPath() {
  const root = getPackageRoot();
  const os = osType() as 'Darwin' | 'Linux' | 'Windows_NT';
  const binaryPath = BINARY_PATH[os];

  if (binaryPath == null) {
    throw new Error(`Unsupported OS: ${os}`);
  }

  return path.join(getReactNativePackagePath(root), 'sdks', 'hermesc', getHermesOSBin(), getHermesOSExe());
}
