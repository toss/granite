import { describe, expect, it } from 'vitest';
import type { BundlerConfig } from '../../types';
import { getId } from '../getId';

describe('getId', () => {
  const baseConfig: BundlerConfig = {
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
  const baseConfigId = getId(baseConfig);

  it('If the build configuration is the same, the same ID is returned', () => {
    expect(getId(baseConfig)).toEqual(baseConfigId);
  });

  it('If the build configuration is different, a different ID is returned', () => {
    expect(getId({ ...baseConfig, buildConfig: { ...baseConfig.buildConfig, platform: 'ios' } })).not.toEqual(
      baseConfigId
    );
  });
});
