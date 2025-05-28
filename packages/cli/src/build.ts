import { runBundle } from '@granite-js/mpack';
import { statusPlugin } from '@granite-js/mpack/plugins';
import { resolvePlugins, type PluginContext } from '@granite-js/plugin-core';
import type { GraniteConfigResponse } from '.';

export async function build(
  config: GraniteConfigResponse,
  {
    tag,
    cache,
  }: {
    tag?: string;
    cache: boolean;
  }
) {
  const resolvedPlugins = await resolvePlugins(config.plugins);
  const pluginContext: PluginContext = {
    meta: Object.create(null),
  };

  for (const preHandler of resolvedPlugins.build.preHandlers) {
    await preHandler?.call(pluginContext, {
      cwd: config.cwd,
      entryFile: config.entryFile,
      appName: config.appName,
      outdir: config.outdir,
      buildResults: [],
    });
  }
  const results = await runBundle({
    tag,
    rootDir: config.cwd,
    dev: false,
    cache,
    metafile: true,
    plugins: [statusPlugin],
    config: config.mpack.build.config,
  });

  for (const postHandler of resolvedPlugins.build.postHandlers) {
    await postHandler?.call(pluginContext, {
      cwd: config.cwd,
      entryFile: config.entryFile,
      appName: config.appName,
      outdir: config.outdir,
      buildResults: results,
    });
  }
}
