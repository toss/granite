import * as fs from 'fs/promises';
import * as path from 'path';
import {
  createPluginHooksDriver,
  resolveConfig,
  type BuildConfig,
  type CompleteGraniteConfig,
} from '@granite-js/plugin-core';
import { Semaphore } from 'es-toolkit';
import { Bundler } from '../bundler';
import { Performance, printSummary } from '../performance';
import type { BundlerConfig, PluginFactory } from '../types';
import { isBuildSuccess } from '../utils/buildResult';
import { getDefaultOutfileName } from '../utils/getDefaultOutfileName';
import { isFulfilled, isRejected } from '../utils/promise';
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
  const semaphore = new Semaphore(Math.min(concurrency, optionsList.length));
  const driver = createPluginHooksDriver(config);
  await driver.build.pre();

  const taskResults = await Promise.allSettled(
    optionsList.map(async (options) => {
      await semaphore.acquire();
      try {
        const buildResult = await buildImpl(config, plugins, options);
        return buildResult;
      } finally {
        semaphore.release();
      }
    })
  );

  if (taskResults.some(isRejected)) {
    throw new Error('Build failed');
  }

  const buildResults = taskResults.filter(isFulfilled).map((result) => result.value);

  await driver.build.post({ buildResults });

  return buildResults;
}

async function buildImpl(
  config: CompleteGraniteConfig,
  plugins: PluginFactory[],
  { platform, outfile, cache = true, dev = true, metafile = false }: CommonBuildOptions
) {
  const { metro: _metroConfig, devServer: _devServerConfig, ...buildConfig } = await resolveConfig(config);
  const outfileName = outfile == null ? getDefaultOutfileName(config.entryFile, platform) : outfile;
  const outfilePath = path.resolve(config.outdir, outfileName);
  const bundler = new Bundler({
    rootDir: config.cwd,
    cache,
    dev,
    metafile,
    buildConfig: {
      platform,
      entry: config.entryFile,
      outfile: outfilePath,
      ...buildConfig,
    },
  });

  for (const plugin of plugins) {
    bundler.addPlugin(plugin());
  }

  const buildResult = await bundler.build();

  if (isBuildSuccess(buildResult)) {
    await writeBundle(buildResult.outfile, buildResult.bundle);

    const performanceSummary = Performance.getSummary();
    if (performanceSummary != null) {
      printSummary(performanceSummary);
      await fs.writeFile(path.join(config.cwd, 'perf.json'), JSON.stringify(performanceSummary, null, 2), 'utf-8');
    }

    return buildResult;
  } else {
    throw new Error('Build failed');
  }
}
