import type { GranitePlugin } from '@granite-js/plugin-core';
import { radonCore, type RadonCorePluginOptions } from './radonCorePlugin.js';
import { radonPolyfill, type RadonPolyfillPluginOptions } from './radonPolyfillPlugin.js';

interface RadonPluginOptions {
  core?: RadonCorePluginOptions;
  polyfill?: RadonPolyfillPluginOptions;
  enablePolyfill?: boolean;
}

const DEFAULT_OPTIONS: Required<Pick<RadonPluginOptions, 'enablePolyfill'>> = {
  enablePolyfill: true,
};

export const radon = (options: RadonPluginOptions = {}): GranitePlugin[] => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const plugins: GranitePlugin[] = [];

  if (mergedOptions.enablePolyfill) {
    plugins.push(radonPolyfill(mergedOptions.polyfill));
  }

  plugins.push(radonCore(mergedOptions.core));

  return plugins;
};
