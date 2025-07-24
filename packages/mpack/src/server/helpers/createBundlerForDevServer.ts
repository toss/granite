import { Bundler } from '../../bundler';
import { BuildConfig } from '../../types';
import { getBundleName } from '../../utils/getBundleName';
import { DEV_SERVER_BUNDLE_NAME } from '../constants';
import { Platform } from '../types';

export async function createBundlerForDevServer({
  rootDir,
  platform,
  buildConfig,
}: {
  rootDir: string;
  platform: Platform;
  buildConfig: Omit<BuildConfig, 'outfile' | 'platform'>;
}) {
  const bundleName = getBundleName(DEV_SERVER_BUNDLE_NAME);

  return new Bundler({
    rootDir,
    dev: true,
    cache: true,
    metafile: false,
    buildConfig: {
      ...buildConfig,
      platform,
      outfile: bundleName,
    },
  });
}
