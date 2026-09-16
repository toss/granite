import * as path from 'node:path';
import { getPackageRoot } from '@granite-js/utils';
import { assert } from 'es-toolkit';
import type { ResolvedGraniteConfig } from './adapter/bundler';

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

export const loadConfig = async (options: LoadConfigOptions = {}): Promise<ResolvedGraniteConfig> => {
  const { loadConfig: loadC12Config } = await import('c12');
  const resolveRoot = options.root ?? getPackageRoot();
  const result = await loadC12Config<ResolvedGraniteConfig>({
    name: MODULE_NAME,
    cwd: resolveRoot,
    configFile: options.configFile ? path.resolve(resolveRoot, options.configFile) : undefined,
    rcFile: false,
    envName: false,
    extend: false,
  });

  assert(result._configFile != null, 'Config file not found');

  return result.config;
};
