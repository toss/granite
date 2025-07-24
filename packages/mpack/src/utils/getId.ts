import { md5 } from './md5';
import { VERSION } from '../constants';
import type { BundlerConfig, INTERNAL__Id } from '../types';

export function getId(bundleConfig: BundlerConfig) {
  // Hash the targets that affect code transformation
  return md5(
    JSON.stringify([VERSION, bundleConfig.rootDir, bundleConfig.dev, bundleConfig.buildConfig])
  ) as INTERNAL__Id;
}
