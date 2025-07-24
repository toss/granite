import { describe, expect, it } from 'vitest';
import type { BuildConfig } from '../../types';
import { mergeBuildConfigs } from '../mergeBuildConfigs';

describe('mergeBuildConfigs', () => {
  it('빌드 설정 2개를 머지할 수 있다.', () => {
    const config1: BuildConfig = {
      platform: 'ios',
      entry: './index.js',
      outfile: './dist/index.js',
      resolver: {
        alias: [{ from: 'a', to: 'b' }],
      },
      esbuild: {
        banner: {
          js: 'console.log("banner");',
        },
        inject: ['foo'],
      },
      swc: {
        plugins: [['plugin-a', {}]],
      },
    };

    const config2: Partial<BuildConfig> = {
      resolver: {
        alias: [{ from: 'c', to: 'd' }],
      },
      esbuild: {
        minify: false,
        banner: {
          js: 'console.log("banner2");',
        },
      },
      swc: {
        plugins: [['plugin-b', {}]],
      },
    };

    const merged = mergeBuildConfigs(config1, config2);

    expect(merged.resolver?.alias).toHaveLength(2);
    expect(merged.swc?.plugins).toHaveLength(2);
    expect(merged).toMatchInlineSnapshot(`
      {
        "babel": undefined,
        "entry": "./index.js",
        "esbuild": {
          "banner": {
            "js": "console.log("banner");
      console.log("banner2");",
          },
          "define": {},
          "inject": [
            "foo",
          ],
          "minify": false,
          "prelude": [],
        },
        "extra": undefined,
        "outfile": "./dist/index.js",
        "platform": "ios",
        "resolver": {
          "alias": [
            {
              "from": "a",
              "to": "b",
            },
            {
              "from": "c",
              "to": "d",
            },
          ],
          "protocols": {},
        },
        "swc": {
          "plugins": [
            [
              "plugin-a",
              {},
            ],
            [
              "plugin-b",
              {},
            ],
          ],
        },
        "transformer": undefined,
      }
    `);
  });
});
