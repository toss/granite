import * as fs from 'fs/promises';
import * as path from 'path';
import { Bundler } from '../bundler';
import { Performance, printSummary } from '../performance';
import { BundlerConfig, PluginFactory } from '../types';
import { writeBundle } from '../utils/writeBundle';

interface RunBundleOptions extends BundlerConfig {
  plugins?: PluginFactory[];
}

export async function runBundle({ plugins, ...bundlerConfig }: RunBundleOptions) {
  const bundler = new Bundler(bundlerConfig);

  if (plugins) {
    plugins.forEach((fn) => bundler.addPlugin(fn()));
  }

  const result = await bundler.build();
  await writeBundle(result.outfile, result.bundle);

  const performanceSummary = Performance.getSummary();
  if (performanceSummary != null) {
    printSummary(performanceSummary);
    await fs.writeFile(
      path.join(bundlerConfig.rootDir, 'perf.json'),
      JSON.stringify(performanceSummary, null, 2),
      'utf-8'
    );
  }

  return result;
}
