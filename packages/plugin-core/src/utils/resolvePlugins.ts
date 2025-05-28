import { flattenPlugins } from './flattenPlugins';
import { PluginInput } from '../core';

export async function resolvePlugins(plugins: PluginInput) {
  const pluginsResolved = await flattenPlugins(plugins);

  return {
    plugins: pluginsResolved,
    devServer: {
      preHandlers: pluginsResolved.filter((plugin) => plugin.dev?.order === 'pre').map((plugin) => plugin.dev?.handler),
      postHandlers: pluginsResolved
        .filter((plugin) => plugin.dev?.order === 'post')
        .map((plugin) => plugin.dev?.handler),
    },
    build: {
      preHandlers: pluginsResolved
        .filter((plugin) => plugin.build?.order === 'pre')
        .map((plugin) => plugin.build?.handler),
      postHandlers: pluginsResolved
        .filter((plugin) => plugin.build?.order === 'post')
        .map((plugin) => plugin.build?.handler),
    },
  };
}
