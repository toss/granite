import { runBundle } from '@granite-js/mpack';
import { statusPlugin } from '@granite-js/mpack/plugins';
import { createContext } from '@granite-js/plugin-core';
import type { CompleteGraniteConfig } from './config';

interface BuildOptions {
  cache: boolean;
}

export async function build(config: CompleteGraniteConfig, options: BuildOptions) {
  const pluginContext = createContext();

  for (const preHandler of config.pluginHooks.build.preHandlers) {
    await preHandler.call(pluginContext, {
      cwd: config.cwd,
      entryFile: config.entryFile,
      appName: config.appName,
      outdir: config.outdir,
      buildResults: [],
    });
  }

  const results = await Promise.all(
    (['android', 'ios'] as const).map((platform) => {
      return runBundle({
        rootDir: config.cwd,
        dev: false,
        cache: options.cache,
        metafile: true,
        plugins: [statusPlugin],
        buildConfig: {
          ...config.build,
          platform,
          outfile: `bundle.${platform}.js`,
        },
      });
    })
  );

  for (const postHandler of config.pluginHooks.build.postHandlers) {
    await postHandler.call(pluginContext, {
      cwd: config.cwd,
      entryFile: config.entryFile,
      appName: config.appName,
      outdir: config.outdir,
      buildResults: results,
    });
  }
}
