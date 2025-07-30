import { getPackageRoot } from '@granite-js/utils';
import { cosmiconfig } from 'cosmiconfig';
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader';
import { assert } from 'es-toolkit';
import type { defineConfig } from './defineConfig';
import type { CompleteGraniteConfig } from '../schema/pluginConfig';

const MODULE_NAME = 'granite';

export const loadConfig = async <Params = any>(params?: Params): Promise<CompleteGraniteConfig> => {
  const explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces: [
      `${MODULE_NAME}.config.ts`,
      `${MODULE_NAME}.config.mts`,
      `${MODULE_NAME}.config.js`,
      `${MODULE_NAME}.config.cjs`,
    ],
    loaders: {
      '.ts': TypeScriptLoader(),
      '.mts': TypeScriptLoader(),
    },
  });

  const result = await explorer.search(getPackageRoot());
  assert(result, 'Config file not found');

  const config: Awaited<ReturnType<typeof defineConfig>> = await result.config;

  return typeof config === 'function' ? config(params) : config;
};
