import { describe, expect, it } from 'vitest';
import type { BuildConfig, TransformBundleData } from '../types';
import { mergeBuildConfigs } from './mergeBuildConfigs';

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

  it('bundle transform을 등록 순서대로 머지할 수 있다.', () => {
    const config1: BuildConfig = {
      platform: 'ios',
      entry: './index.js',
      outfile: './dist/index.js',
      transformer: {
        transformBundleSync: (bundle) => {
          bundle.source.contents = Buffer.from(`${bundle.source.text}a`);
          return bundle;
        },
      },
    };

    const config2: Partial<BuildConfig> = {
      transformer: {
        transformBundleSync: (bundle) => {
          bundle.source.contents = Buffer.from(`${bundle.source.text}b`);
          return bundle;
        },
      },
    };

    const merged = mergeBuildConfigs(config1, config2);
    const bundle = createBundle('source');

    const result = merged.transformer?.transformBundleSync?.(bundle, {
      outfile: './dist/index.js',
      platform: 'ios',
    });

    expect(result?.source.text).toBe('sourceab');
  });
});

function createBundle(sourceText: string): TransformBundleData {
  return {
    source: createOutputFile('bundle.js', sourceText),
    sourcemap: createOutputFile('bundle.js.map', '{}'),
  };
}

function createOutputFile(path: string, text: string) {
  let contents: Uint8Array = Buffer.from(text);

  return {
    path,
    get contents() {
      return contents;
    },
    set contents(value: Uint8Array) {
      contents = value;
    },
    hash: '',
    get text() {
      return Buffer.from(contents).toString('utf-8');
    },
  };
}
