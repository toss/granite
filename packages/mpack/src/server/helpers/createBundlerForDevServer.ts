import { Bundler } from '../../bundler';
import { DevServerConfig } from '../../types';
import { getBundleName } from '../../utils/getBundleName';
import { DEV_SERVER_BUNDLE_NAME } from '../constants';
import { Platform } from '../types';

export async function createDevServerForDevServer({
  rootDir,
  appName,
  scheme,
  platform,
  config,
}: {
  rootDir: string;
  appName: string;
  scheme: string;
  platform: Platform;
  config: DevServerConfig;
}) {
  const tag = 'dev-server';
  const dev = true;
  const bundleName = getBundleName(DEV_SERVER_BUNDLE_NAME);

  const bundler = new Bundler({
    tag,
    rootDir,
    appName,
    scheme,
    dev,
    cache: true,
    metafile: false,
    buildConfig: {
      ...config.build,
      platform,
      outfile: bundleName,
    },
    services: {
      sentry: {
        enabled: false,
      },
    },
  });

  return bundler;
}
