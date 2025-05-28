import { type as osType } from 'os';
import { getPackageRoot } from '@granite-js/utils';

const BINARY_PATH = {
  Darwin: 'react-native/sdks/hermesc/osx-bin/hermesc',
  Linux: 'react-native/sdks/hermesc/linux64-bin/hermesc',
  Windows_NT: 'react-native/sdks/hermesc/win64-bin/hermesc.exe',
} as const;

export function resolveHermesBinaryPath() {
  const root = getPackageRoot();
  const os = osType() as 'Darwin' | 'Linux' | 'Windows_NT';
  const binaryPath = BINARY_PATH[os];

  if (binaryPath == null) {
    throw new Error(`Unsupported OS: ${os}`);
  }

  return require.resolve(binaryPath, { paths: [root] });
}
