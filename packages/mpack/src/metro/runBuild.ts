import type { AdditionalMetroConfig } from '@granite-js/plugin-core';
import { getMetroConfig } from './getMetroConfig';
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
  additionalConfig?: AdditionalMetroConfig;
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
