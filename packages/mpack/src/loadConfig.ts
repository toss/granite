import * as path from 'node:path';
import type { GraniteContext } from '@granite-js/config';
import { loadConfig as loadC12Config } from 'c12';
import type { MpackConfig, MpackConfigContext } from './config';

export async function loadMpackConfig(
  context: GraniteContext,
  options: {
    configFile?: string;
    command: MpackConfigContext['command'];
    dev?: boolean;
  }
): Promise<MpackConfig> {
  const result = await loadC12Config<MpackConfig>({
    name: 'mpack',
    cwd: context.cwd,
    configFile: options.configFile == null ? undefined : path.resolve(context.cwd, options.configFile),
    configFileRequired: true,
    rcFile: false,
    envName: false,
    extend: false,
    context: {
      ...context,
      command: options.command,
      mode: options.command === 'serve' || options.dev ? 'development' : 'production',
    } satisfies MpackConfigContext,
  });
  if (result.configFile == null) {
    throw new Error(
      'Mpack config file not found. Create mpack.config.ts, pass mpack({ config }), or use inline options.'
    );
  }
  return result.config;
}
