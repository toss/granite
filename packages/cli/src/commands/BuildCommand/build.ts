import path from 'path';
import { runBundle } from '@granite-js/mpack';
import { statusPlugin } from '@granite-js/mpack/plugins';
import { createContext } from '@granite-js/plugin-core';
import type { CompleteGraniteConfig } from '../../config';

export interface BuildOptions {
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
    });
  }

  const buildResults = await Promise.all(
    (['ios', 'android'] as const).map((platform) =>
      runBundle({
        rootDir: config.cwd,
        dev: false,
        metafile: true,
        cache: options.cache,
        plugins: [statusPlugin],
        buildConfig: { platform, outfile: path.join(config.outdir, `bundle.${platform}.js`), ...config.build },
      })
    )
  );

  for (const postHandler of config.pluginHooks.build.postHandlers) {
    await postHandler.call(pluginContext, {
      cwd: config.cwd,
      entryFile: config.entryFile,
      appName: config.appName,
      outdir: config.outdir,
      buildResults,
    });
  }
}
