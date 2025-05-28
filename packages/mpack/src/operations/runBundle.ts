import assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Semaphore } from '@shopify/semaphore';
import { isNotNil } from 'es-toolkit';
import { loadConfig } from '..';
import { Bundler } from '../bundler';
import { Performance, printSummary } from '../performance';
import { BundlerConfig, Config, PluginFactory } from '../types';
import { loadPresets } from '../utils/loadPresets';
import { writeBundle } from '../utils/writeBundle';

interface RunBundleOptions {
  rootDir: BundlerConfig['rootDir'];
  dev: BundlerConfig['dev'];
  cache: BundlerConfig['cache'];
  metafile: BundlerConfig['metafile'];
  plugins?: PluginFactory[];
  tag?: string;
  config?: Config;
}

export async function runBundle(options: RunBundleOptions) {
  const config = options.config ?? (await loadConfig({ rootDir: options.rootDir }));
  assert(config, '구성 파일을 찾을 수 없습니다');

  config.tasks = await Promise.all(
    config.tasks.map((task) =>
      loadPresets(task, {
        appName: config.appName,
        scheme: config.scheme,
        rootDir: options.rootDir,
        dev: options.dev,
      })
    )
  );

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
