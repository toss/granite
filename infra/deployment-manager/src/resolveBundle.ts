import { BUNDLE_BASE_NAME } from './constants';
import { paths } from './s3/paths';

export interface ResolveBundleOptions {
  appName: string;
  platform: 'android' | 'ios';
  deploymentId: string;
  tag?: string;
}

/**
 * Returns a bucket path that matches the bundle name specification.
 *
 * - `bundle.<platform>.hbc.gz`
 *
 * if `tag` is provided, it will be appended to the bundle name.
 *
 * - `bundle.<platform>.<tag>.hbc.gz`
 */
export function resolveBundle({ appName, platform, deploymentId, tag }: ResolveBundleOptions) {
  const bundleUrlPrefix = paths.bundlePathPrefix(appName, deploymentId);
  const extension = 'hbc.gz';
  const name = [BUNDLE_BASE_NAME, platform, tag, extension].filter(Boolean).join('.');

  return `${bundleUrlPrefix}/${name}` as const;
}
