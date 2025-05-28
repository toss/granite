import type { Plugin } from 'esbuild';
import { setupAliasResolver } from './aliasResolver';
import { setupProtocolResolver } from './protocolResolver';
import { PluginOptions } from '../types';

export function dependencyAliasPlugin({ context }: PluginOptions): Plugin {
  const pluginName = 'dependency-alias-plugin';

  return {
    name: pluginName,
    setup(build) {
      const { rootDir, buildConfig } = context.config;
      const { resolver } = buildConfig;

      const alias = resolver?.alias ?? [];
      const protocols = resolver?.protocols ?? {};

      setupAliasResolver(build, rootDir, alias);
      setupProtocolResolver(build, protocols);
    },
  };
}
