import { isNotNil } from 'es-toolkit';
import { flattenPlugins } from './flattenPlugins';
import type {
  GranitePluginBuildPostHandler,
  GranitePluginBuildPreHandler,
  GranitePluginDevPostHandler,
  GranitePluginDevPreHandler,
  PluginInput,
} from '../types';

export async function resolvePlugins(plugins: PluginInput) {
  const pluginsResolved = await flattenPlugins(plugins);

  return {
    plugins: pluginsResolved,
    configs: pluginsResolved.map((plugin) => plugin.config).filter(isNotNil),
    pluginHooks: {
      devServer: {
        preHandlers: pluginsResolved
          .filter((plugin) => plugin.dev?.order === 'pre')
          .map((plugin) => plugin.dev?.handler as GranitePluginDevPreHandler),
        postHandlers: pluginsResolved
          .filter((plugin) => plugin.dev?.order === 'post')
          .map((plugin) => plugin.dev?.handler as GranitePluginDevPostHandler),
      },
      build: {
        preHandlers: pluginsResolved
          .filter((plugin) => plugin.build?.order === 'pre')
          .map((plugin) => plugin.build?.handler as GranitePluginBuildPreHandler),
        postHandlers: pluginsResolved
          .filter((plugin) => plugin.build?.order === 'post')
          .map((plugin) => plugin.build?.handler as GranitePluginBuildPostHandler),
      },
    },
  };
}
