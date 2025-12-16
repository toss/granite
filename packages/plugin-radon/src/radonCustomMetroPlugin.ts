import fs from 'node:fs';
import path from 'node:path';
import type { GranitePluginCore } from '@granite-js/plugin-core';
import { getPackageRoot } from '@granite-js/utils';
import { loadRadonMetroConfig } from './utils/loadRadonMetroConfig';

function detectRadonIdeExtensionPath(): string | undefined {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    return undefined;
  }

  // Check VSCode extensions
  const vscodeExtPath = path.join(homeDir, '.vscode', 'extensions');
  
  // Check Cursor extensions (multiple possible locations)
  const cursorExtPaths = [
    path.join(homeDir, '.cursor', 'extensions'),
    path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'extensions'),
  ];

  const searchPaths = [vscodeExtPath, ...cursorExtPaths];

  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      const entries = fs.readdirSync(searchPath);
      // Match exact version: swmansion.react-native-ide-1.14.2-{platform}
      const radonFolder = entries.find((entry) => /^swmansion\.react-native-ide-1\.14\.2-.+$/.test(entry));
      if (radonFolder) {
        const fullPath = path.join(searchPath, radonFolder);
        console.log(`[Radon] Found extension at: ${fullPath}`);
        return fullPath;
      }
    }
  }

  console.warn('[Radon] Extension not found');
  return undefined;
}

function ensureRadonIdeEnv() {
  const appRoot = getPackageRoot();
  const radonIdePath = detectRadonIdeExtensionPath();

  if (!radonIdePath) {
    console.warn('[Radon] Extension not found, Radon IDE features will not be available');
    return;
  }

  const radonIdeLibPath = path.join(radonIdePath, 'lib');
  const metroConfigPath = path.join(radonIdeLibPath, 'metro_config.js');

  process.env.RN_IDE_METRO_CONFIG_PATH = metroConfigPath;
  process.env.NODE_PATH = path.join(appRoot, 'node_modules');
  process.env.RCT_METRO_PORT = '8081';
  process.env.RADON_IDE_LIB_PATH = radonIdeLibPath;
  process.env.RADON_IDE_VERSION = '1.14.2';

}

// Ensure RADON_IDE_LIB_PATH is set as early as possible
ensureRadonIdeEnv();

export const radonCustomMetroPlugin = (): GranitePluginCore => {
  return {
    name: 'radon-custom-metro-plugin',
    config: {
      metro: loadRadonMetroConfig(),
    },
  };
};
