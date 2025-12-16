import type { GranitePlugin } from '@granite-js/plugin-core';
import { radonCore } from './radonCorePlugin.js';
import { radonGraniteRouter } from './radonGraniteRouterPlugin.js';
import { radonCustomMetroPlugin } from './radonCustomMetroPlugin.js';

export const radon = (): GranitePlugin[] => {

  const plugins: GranitePlugin[] = [];

  plugins.push(radonCustomMetroPlugin());
  plugins.push(radonCore());
  plugins.push(radonGraniteRouter());

  return plugins;
};
