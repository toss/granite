import { getMetroConfig } from './getMetroConfig';
import type { MetroConfig } from './types';
import Metro from '../vendors/metro/src';

export async function runBuild({
  appName,
  scheme,
  rootPath,
  entry,
  platform,
  minify,
  out,
  dev,
  additionalConfig,
}: {
  appName: string;
  scheme: string;
  rootPath: string;
  entry: string;
  platform: 'ios' | 'android';
  minify: boolean;
  out: string;
  dev: boolean;
  additionalConfig?: MetroConfig;
}) {
  const config = await getMetroConfig(
    {
      appName,
      rootPath,
      scheme,
    },
    additionalConfig
  );

  await Metro.runBuild(config, {
    entry,
    platform,
    minify,
    out,
    dev,
  });
}
