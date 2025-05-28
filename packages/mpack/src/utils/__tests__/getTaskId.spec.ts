import { beforeAll, describe, expect, it } from 'vitest';
import type { BundlerConfig, INTERNAL__Id } from '../../types';
import { getId } from '../getId';

describe('getId', () => {
  const baseConfig: BundlerConfig = {
    tag: 'test',
    appName: 'test',
    scheme: 'test',
    rootDir: '/root',
    cache: true,
    dev: true,
    metafile: false,
    buildConfig: {
      entry: './index.ts',
      outfile: './dist/index.js',
      platform: 'android',
      babel: {
        plugins: ['plugin-b'],
      },
    },
  };
  let baseConfigId: INTERNAL__Id;

  beforeAll(() => {
    baseConfigId = getId(baseConfig);
  });

  it('빌드 구성이 같다면 같은 taskId 값이 반환된다.', () => {
    expect(getId(baseConfig)).toEqual(baseConfigId);
  });

  it('빌드 구성이 다르다면 다른 taskId 값이 반환된다.', () => {
    expect(getId({ ...baseConfig, appName: 'foo' })).not.toEqual(baseConfigId);
  });
});
