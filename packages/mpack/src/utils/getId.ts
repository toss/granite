import { md5 } from './md5';
import { VERSION } from '../constants';
import type { BundlerConfig, INTERNAL__Id } from '../types';

export function getId(bundleConfig: BundlerConfig) {
  // Hash the targets that affect code transformation
  return md5(
    JSON.stringify([
      VERSION,
      bundleConfig.rootDir,
      bundleConfig.dev,
      bundleConfig.buildConfig.resolver,
      bundleConfig.buildConfig.transformer,
      bundleConfig.buildConfig.platform,
      bundleConfig.buildConfig.babel,
      bundleConfig.buildConfig.swc,
      bundleConfig.buildConfig.esbuild?.loader,
      bundleConfig.buildConfig.esbuild?.resolveExtensions,
      bundleConfig.buildConfig.esbuild?.mainFields,
      bundleConfig.buildConfig.esbuild?.conditions,
    ])
  ) as INTERNAL__Id;
}
