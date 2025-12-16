import type { GranitePlugin } from '@granite-js/plugin-core';
import { radonCore } from './radonCorePlugin.js';
import { radonCustomMetroPlugin } from './radonCustomMetroPlugin.js';
import { radonGraniteRouter } from './radonGraniteRouterPlugin.js';

export const radon = (): GranitePlugin[] => {

  const plugins: GranitePlugin[] = [];

  plugins.push(radonCustomMetroPlugin());
  plugins.push(radonCore());
  plugins.push(radonGraniteRouter());

  return plugins;
};
