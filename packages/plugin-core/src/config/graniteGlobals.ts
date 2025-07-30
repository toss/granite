import fs from 'fs';
import path from 'path';
import { getLocalTempDirectoryPath, prepareLocalDirectory } from '@granite-js/utils';
import type { PluginConfig } from '../types';

interface GraniteGlobalsConfig {
  rootDir: string;
  appName: string;
  scheme: string;
}

export function prepareGraniteGlobalsScript(config: GraniteGlobalsConfig): PluginConfig {
  const filePath = writeGraniteGlobalsScript(config);

  return {
    esbuild: {
      prelude: [filePath],
    },
    metro: {
      serializer: {
        getPolyfills: () => [filePath],
      },
    },
  };
}

function writeGraniteGlobalsScript(config: GraniteGlobalsConfig) {
  const script = getGraniteGlobalScript(config);
  const filePath = path.join(getLocalTempDirectoryPath(config.rootDir), 'granite-globals.js');

  prepareLocalDirectory(config.rootDir);
  fs.writeFileSync(filePath, script, 'utf-8');

  return filePath;
}

function getGraniteGlobalScript({ appName, scheme }: GraniteGlobalsConfig) {
  return [
    'global.__granite = global.__granite || {};',
    `global.__granite.app = { name: ${JSON.stringify(appName)}, scheme: ${JSON.stringify(scheme)} };`,
  ].join('\n');
}
