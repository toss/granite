import { getMetroConfig } from './getMetroConfig';
import type { MetroConfig } from './types';
import Metro from '../vendors/metro/src';

export async function runBuild({
  rootPath,
  entry,
  platform,
  minify,
  out,
  dev,
  additionalConfig,
}: {
  rootPath: string;
  entry: string;
  platform: 'ios' | 'android';
  minify: boolean;
  out: string;
  dev: boolean;
  additionalConfig?: MetroConfig;
}) {
  const config = await getMetroConfig({ rootPath }, additionalConfig);

  await Metro.runBuild(config, {
    entry,
    platform,
    minify,
    out,
    dev,
  });
}
