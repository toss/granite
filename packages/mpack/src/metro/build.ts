import path from 'path';
import { BuildResult, createPluginHooksDriver, type CompleteGraniteConfig } from '@granite-js/plugin-core';
import { Semaphore } from 'es-toolkit';
import { getMetroConfig } from './getMetroConfig';
import Metro from '../vendors/metro/src';

interface CommonMetroBuildOptions {
  outfile?: string;
  dev?: boolean;
  minify?: boolean;
  platform: 'ios' | 'android';
}

export interface MetroBuildOptions extends CommonMetroBuildOptions {
  config: CompleteGraniteConfig;
}

export interface MetroBuildAllOptions {
  config: CompleteGraniteConfig;
  concurrency?: number;
}

export async function build({ config, ...options }: MetroBuildOptions) {
  const driver = createPluginHooksDriver(config);
  await driver.build.pre();

  const buildResult = await buildImpl(config, options);

  await driver.build.post({
    buildResults: [buildResult],
  });

  return buildResult;
}

export async function buildAll(
  optionsList: CommonMetroBuildOptions[],
  { config, concurrency = 2 }: MetroBuildAllOptions
) {
  const buildResults: BuildResult[] = [];
  const semaphore = new Semaphore(Math.min(concurrency, optionsList.length));
  const driver = createPluginHooksDriver(config);
  await driver.build.pre();

  for (const options of optionsList) {
    await semaphore.acquire();
    try {
      const buildResult = await buildImpl(config, options);
      buildResults.push(buildResult);
    } catch {
      semaphore.release();
    }
  }

  await driver.build.post({ buildResults });

  return buildResults;
}

async function buildImpl(
  config: CompleteGraniteConfig,
  { platform, outfile = `bundle.${platform}.js`, minify = false, dev = true }: CommonMetroBuildOptions
) {
  const metroConfig = await getMetroConfig({ rootPath: config.cwd }, config.metro);
  const out = path.join(config.outdir, outfile);

  await Metro.runBuild(metroConfig, {
    entry: config.entryFile,
    out,
    platform,
    minify: minify,
    dev: dev,
  });

  return buildResultShim(config, { outfile, platform, minify, dev });
}

function buildResultShim(config: CompleteGraniteConfig, options: Required<CommonMetroBuildOptions>): BuildResult {
  const unsupportedField = new Proxy({} as any, {
    get: (_, key) => {
      throw new Error(`Unsupported field: ${key.toString()}`);
    },
  });

  return {
    platform: options.platform,
    bundle: unsupportedField,
    outfile: path.join(config.outdir, options.outfile),
    outputFiles: [{ path: options.outfile, contents: new Uint8Array(), hash: '', text: '' }],
    sourcemapOutfile: '',
    warnings: [],
    errors: [],
    extra: unsupportedField,
    mangleCache: unsupportedField,
    metafile: unsupportedField,
    size: 0,
    duration: 0,
    totalModuleCount: 0,
  };
}
