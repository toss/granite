import path from 'node:path';
import type { GranitePluginCore } from '@granite-js/plugin-core';
import { getPackageRoot } from '@granite-js/utils';
import { detectRadonIdeExtensionPath } from './utils/detectRadonIdeExtensionPath';
import { loadRadonMetroConfig } from './utils/loadRadonMetroConfig';

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
  //TODO: 어디서 쓰이는지 확인하기
  process.env.NODE_PATH = path.join(appRoot, 'node_modules');
  process.env.RCT_METRO_PORT = '8081';
  process.env.RADON_IDE_LIB_PATH = radonIdeLibPath;
  process.env.RADON_IDE_VERSION = '1.14.0';
  process.env.RADON_IDE_ORIG_BABEL_TRANSFORMER_PATH = require.resolve('metro-react-native-babel-transformer');
}

// import와 동시에 넣어주기
ensureRadonIdeEnv();

export const radonCorePlugin = (): GranitePluginCore => {
  return {
    name: 'radon-core-plugin',
    config: {
      metro: loadRadonMetroConfig(),
    },
  };
};
