import * as fs from 'fs/promises';
import * as path from 'path';
import {
  createPluginHooksDriver,
  type BuildConfig,
  type BuildResult,
  type CompleteGraniteConfig,
} from '@granite-js/plugin-core';
import { Semaphore } from 'es-toolkit';
import { Bundler } from '../bundler';
import { Performance, printSummary } from '../performance';
import type { BundlerConfig, PluginFactory } from '../types';
import { writeBundle } from '../utils/writeBundle';

type CommonBuildOptions = Omit<BundlerConfig, 'rootDir' | 'buildConfig'> & Pick<BuildConfig, 'platform' | 'outfile'>;

export interface BuildOptions extends CommonBuildOptions {
  config: CompleteGraniteConfig;
  plugins?: PluginFactory[];
}

export interface BuildAllOptions {
  config: CompleteGraniteConfig;
  concurrency?: number;
  plugins?: PluginFactory[];
}

export async function build({ config, plugins = [], ...options }: BuildOptions) {
  const driver = createPluginHooksDriver(config);
  await driver.build.pre();

  const buildResult = await buildImpl(config, plugins, options);

  await driver.build.post({ buildResults: [buildResult] });

  return buildResult;
}

export async function buildAll(
  optionsList: CommonBuildOptions[],
  { config, plugins = [], concurrency = 2 }: BuildAllOptions
) {
  const buildResults: BuildResult[] = [];
  const semaphore = new Semaphore(Math.min(concurrency, optionsList.length));
  const driver = createPluginHooksDriver(config);
  await driver.build.pre();

  await Promise.all(
    optionsList.map(async (options) => {
      await semaphore.acquire();
      try {
        const buildResult = await buildImpl(config, plugins, options);
        buildResults.push(buildResult);
      } catch {
        semaphore.release();
      }
    })
  );

  await driver.build.post({ buildResults });

  return buildResults;
}

async function buildImpl(
  config: CompleteGraniteConfig,
  plugins: PluginFactory[],
  { platform, outfile = `bundle.${platform}.js`, cache = true, dev = true, metafile = false }: CommonBuildOptions
) {
  const resolvedOutfile = path.join(config.outdir, outfile);
  const bundler = new Bundler({
    rootDir: config.cwd,
    cache,
    dev,
    metafile,
    buildConfig: {
      platform,
      outfile: resolvedOutfile,
      ...config.build,
    },
  });

  for (const plugin of plugins) {
    bundler.addPlugin(plugin());
  }

  const buildResult = await bundler.build();
  await writeBundle(buildResult.outfile, buildResult.bundle);

  const performanceSummary = Performance.getSummary();
  if (performanceSummary != null) {
    printSummary(performanceSummary);
    await fs.writeFile(path.join(config.cwd, 'perf.json'), JSON.stringify(performanceSummary, null, 2), 'utf-8');
  }

  return buildResult;
}
