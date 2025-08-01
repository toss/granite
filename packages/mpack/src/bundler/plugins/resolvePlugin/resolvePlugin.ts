import type { Plugin } from 'esbuild';
import type { PluginOptions } from '../types';
import { setupAliasResolver } from './alias/setupAliasResolver';
import { setupProtocolResolver } from './protocol/setupProtocolResolver';

export function resolvePlugin({ context }: PluginOptions): Plugin {
  return {
    name: 'resolve-plugin',
    setup(build) {
      const { buildConfig } = context.config;
      const { resolver } = buildConfig;

      const alias = resolver?.alias ?? [];
      const protocols = resolver?.protocols ?? {};

      setupAliasResolver(build, alias);
      setupProtocolResolver(build, protocols);
    },
  };
}
