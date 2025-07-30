import path from 'path';
import { getPackageRoot } from '@granite-js/utils';
import { cosmiconfig, type CosmiconfigResult, type Options as CosmiconfigOptions } from 'cosmiconfig';
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader';
import { assert } from 'es-toolkit';
import type { defineConfig } from './defineConfig';
import type { CompleteGraniteConfig } from '../schema/pluginConfig';

const MODULE_NAME = 'granite';

export interface LoadConfigOptions {
  /**
   * Root directory to search for the config file.
   *
   * Defaults to project root
   */
  root?: string;
  /**
   * Exact path to the config file.
   *
   * If provided, the config file will be loaded from the given path.
   * Otherwise, the config file will be searched for in the root directory.
   */
  configFile?: string;
}

export const loadConfig = async (options: LoadConfigOptions = {}): Promise<CompleteGraniteConfig> => {
  let result: CosmiconfigResult;

  if (options.configFile) {
    result = await getConfigExplorer().load(path.resolve(options.root ?? getPackageRoot(), options.configFile));
  } else {
    result = await getConfigExplorer({
      searchPlaces: [
        `${MODULE_NAME}.config.ts`,
        `${MODULE_NAME}.config.mts`,
        `${MODULE_NAME}.config.js`,
        `${MODULE_NAME}.config.cjs`,
      ],
    }).search(options.root);
  }

  assert(result, 'Config file not found');

  const config: Awaited<ReturnType<typeof defineConfig>> = await result.config;

  return config;
};

function getConfigExplorer(options?: Partial<CosmiconfigOptions>) {
  return cosmiconfig(MODULE_NAME, {
    loaders: {
      '.ts': TypeScriptLoader(),
      '.mts': TypeScriptLoader(),
    },
    ...options,
  });
}
