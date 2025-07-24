import * as fs from 'fs/promises';
import * as path from 'path';
import { Semaphore } from '@shopify/semaphore';
import { isNotNil } from 'es-toolkit';
import { Bundler } from '../bundler';
import { Performance, printSummary } from '../performance';
import { BundlerConfig, Config, PluginFactory } from '../types';
import { writeBundle } from '../utils/writeBundle';

interface RunBundleOptions {
  config: Config;
  rootDir: BundlerConfig['rootDir'];
  dev: BundlerConfig['dev'];
  cache: BundlerConfig['cache'];
  metafile: BundlerConfig['metafile'];
  plugins?: PluginFactory[];
  tag?: string;
}

export async function runBundle(options: RunBundleOptions) {
  const config = options.config;
  const semaphore = new Semaphore(config.concurrency ?? 4);

  const buildResults = await Promise.all(
    config.tasks.map(async ({ tag, build }) => {
      if (typeof options.tag === 'string' && tag !== options.tag) {
        return;
      }

      const bundler = new Bundler({
        tag,
        buildConfig: build,
        appName: config.appName,
        scheme: config.scheme,
        services: config.services,
        dev: options.dev,
        metafile: options.metafile,
        rootDir: options.rootDir,
        cache: options.cache,
      });

      if (options.plugins) {
        options.plugins.forEach((fn) => bundler.addPlugin(fn()));
      }

      const permit = await semaphore.acquire();

      try {
        const result = await bundler.build();
        await writeBundle(result.outfile, result.bundle);
        return result;
      } finally {
        await permit.release();
      }
    })
  ).then((results) => results.filter(isNotNil));

  const performanceSummary = Performance.getSummary();
  if (performanceSummary != null) {
    printSummary(performanceSummary);
    await fs.writeFile(path.join(options.rootDir, 'perf.json'), JSON.stringify(performanceSummary, null, 2), 'utf-8');
  }

  return buildResults;
}
