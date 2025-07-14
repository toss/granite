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
 * 통합 Radon 플러그인
 * - radonPolyfill: RN 0.72 호환성 (polyfill 먼저 실행)
 * - radonCore: RadonIDE 핵심 기능 (agent 나중에 실행)
 */
export const radon = (options: RadonPluginOptions = {}): GranitePlugin[] => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  const plugins: GranitePlugin[] = [];
  
  // 1. polyfill 먼저 (RN 0.72 호환성)
  if (mergedOptions.enablePolyfill) {
    plugins.push(radonPolyfill(mergedOptions.polyfill));
  }
  
  // 2. core 나중에 (RadonIDE 기능 + agent)
  plugins.push(radonCore(mergedOptions.core));
  
  return plugins;
};