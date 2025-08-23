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

/**
 * Integrated Radon plugin
 * - radonPolyfill: RN 0.72 compatibility (runs polyfill first)
 * - radonCore: RadonIDE core functionality (runs agent later)
 */
export const radon = (options: RadonPluginOptions = {}): GranitePlugin[] => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  const plugins: GranitePlugin[] = [];
  
  // 1. polyfill first (RN 0.72 compatibility)
  if (mergedOptions.enablePolyfill) {
    plugins.push(radonPolyfill(mergedOptions.polyfill));
  }
  
  // 2. core later (RadonIDE functionality + agent)
  plugins.push(radonCore(mergedOptions.core));
  
  return plugins;
};