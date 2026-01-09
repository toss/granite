import type { GranitePlugin } from '@granite-js/plugin-core';
import { radonCorePlugin } from './radonCorePlugin.js';
import { radonGraniteRouter } from './radonGraniteRouterPlugin.js';

export const radon = (): GranitePlugin[] => {
  const plugins: GranitePlugin[] = [];

  plugins.push(radonCorePlugin());
  plugins.push(radonGraniteRouter());

  return plugins;
};
