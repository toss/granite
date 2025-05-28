import { md5 } from './md5';
import { VERSION } from '../constants';
import type { BundlerConfig, INTERNAL__Id } from '../types';

export function getId(bundleConfig: BundlerConfig) {
  // 코드 변환에 영향을 주는 구성값만 포함하여 해시화
  return md5(
    JSON.stringify([
      VERSION,
      bundleConfig.appName,
      bundleConfig.rootDir,
      bundleConfig.dev,
      bundleConfig.services,
      bundleConfig.buildConfig,
    ])
  ) as INTERNAL__Id;
}
