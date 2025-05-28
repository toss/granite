import { omit } from 'es-toolkit';
import { describe, expect, it } from 'vitest';
import { PresetContext, TaskConfig, Preset } from '../../types';
import { loadPresets } from '../loadPresets';

describe('loadPresets', () => {
  const options: PresetContext = {
    rootDir: '/root',
    appName: 'test',
    dev: true,
    scheme: 'foo',
  };

  describe('프리셋이 존재하지 않으면', () => {
    const config: TaskConfig = {
      tag: 'test',
      presets: [],
      build: {
        platform: 'android',
        entry: 'index.js',
        outfile: 'index.out.js',
      },
    };

    it('presets 필드가 제거된 기존 구성이 그대로 반환된다', async () => {
      const result = await loadPresets(config, options);

      expect(result).toMatchObject(omit(config, ['presets']));
    });
  });

  describe('프리셋이 존재하면', () => {
    const preset: Preset = () => {
      return {
        extra: { value: 'preset' },
        esbuild: {
          define: {
            __DEV__: JSON.stringify(false),
            __global: 'window',
          },
          banner: {
            js: 'preset();',
          },
        },
      };
    };

    const config: TaskConfig = {
      tag: 'test',
      presets: [preset],
      build: {
        platform: 'android',
        entry: 'index.js',
        outfile: 'index.out.js',
        esbuild: {
          define: {
            __DEV__: JSON.stringify(true),
          },
          banner: {
            js: 'config();',
          },
        },
        extra: { value: 'base' },
      },
    };

    it('프리셋이 적용된 구성이 반환된다', async () => {
      const result = await loadPresets(config, options);

      expect(result.build.extra).toMatchObject({ value: 'base' });

      // 프리셋은 false 이지만, 사용자 구성이 true 이기에 최종 구성은 true 가 되어야 함
      expect(result.build.esbuild?.define?.__DEV__).toEqual(JSON.stringify(true));

      expect(result.build.esbuild?.define?.__global).toEqual('window');
      expect(result.build.esbuild?.banner?.js).toEqual(['preset();', 'config();'].join('\n'));
    });
  });
});
