import { vitest, describe, expect, it } from 'vitest';
import { mergeConfig } from './mergeConfig';
import { GranitePluginCore, BabelRule } from '../types';

describe('mergeConfig', () => {
  const createBabelRule = (name: string): BabelRule => ({
    if: ({ path }) => path.includes(name),
    plugins: [`${name}-plugin`],
  });

  it('merges all configuration sections', async () => {
    const mockLoad1 = vitest.fn();
    const mockLoad2 = vitest.fn();

    const mockMiddleware1 = vitest.fn();
    const mockMiddleware2 = vitest.fn();
    const mockMiddleware3 = vitest.fn();
    const mockMiddleware4 = vitest.fn();
    const mockUpdate = vitest.fn();

    const rule1 = createBabelRule('foo');
    const rule2 = createBabelRule('bar');

    const source: GranitePluginCore['config'] = {
      resolver: {
        alias: [{ from: 'src', to: './src' }],
        protocols: {
          custom1: {
            load: mockLoad1,
          },
        },
      },
      transformer: {
        transformSync: vitest.fn(),
      },
      babel: {
        rules: [rule1],
      },
      esbuild: {
        minify: true,
        banner: {
          js: 'console.log("banner 1");',
        },
        prelude: ['source.js'],
      },
      devServer: {
        middlewares: [mockMiddleware1],
      },
      metro: {
        middlewares: [mockMiddleware2],
        resolver: {
          blockList: [/foo/, /bar/],
        },
        serializer: {
          getPolyfills: () => ['metro-prelude-1.js'],
        },
      },
    };

    const target: GranitePluginCore['config'] = {
      resolver: {
        alias: [{ from: 'utils', to: './utils' }],
        protocols: {
          custom2: {
            load: mockLoad2,
          },
        },
      },
      transformer: {
        transformAsync: vitest.fn(),
      },
      babel: {
        rules: [rule2],
      },
      esbuild: {
        sourcemap: true,
        banner: {
          js: 'console.log("banner 2");',
        },
        prelude: ['target.js'],
      },
      swc: {
        plugins: [['plugin1', {}]],
      },
      devServer: {
        middlewares: [mockMiddleware3],
      },
      metro: {
        middlewares: [mockMiddleware4],
        resolver: {
          blockList: /baz/,
        },
        serializer: {
          getPolyfills: () => ['metro-prelude-2.js'],
        },
        reporter: {
          update: mockUpdate,
        },
      },
    };

    const result = await mergeConfig(source, target);

    expect(result).toEqual({
      resolver: {
        alias: [
          { from: 'src', to: './src' },
          { from: 'utils', to: './utils' },
        ],
        protocols: {
          custom1: {
            load: mockLoad1,
          },
          custom2: {
            load: mockLoad2,
          },
        },
      },
      transformer: {
        transformSync: expect.any(Function),
        transformAsync: expect.any(Function),
      },
      babel: {
        rules: [rule1, rule2],
      },
      esbuild: {
        minify: true,
        sourcemap: true,
        define: {},
        inject: [],
        banner: {
          js: 'console.log("banner 1");\nconsole.log("banner 2");',
        },
        prelude: ['source.js', 'target.js'],
      },
      swc: {
        plugins: [['plugin1', {}]],
      },
      devServer: {
        middlewares: [mockMiddleware1, mockMiddleware3],
      },
      metro: {
        middlewares: [mockMiddleware2, mockMiddleware4],
        resolver: {
          blockList: [/foo/, /bar/, /baz/],
        },
        reporter: {
          update: mockUpdate,
        },
        serializer: {
          getPolyfills: expect.any(Function),
        },
      },
      extra: undefined,
      reactNativePath: undefined,
    });

    expect(result?.metro?.serializer?.getPolyfills?.()).toEqual(['metro-prelude-1.js', 'metro-prelude-2.js']);
  });

  it('handles partial configurations', async () => {
    const rule = createBabelRule('foo');
    const source: GranitePluginCore['config'] = {
      babel: { rules: [rule] },
    };

    const target: GranitePluginCore['config'] = {
      esbuild: { minify: true },
    };

    const result = await mergeConfig(source, target);

    expect(result).toEqual({
      babel: { rules: [rule] },
      esbuild: { minify: true },
      resolver: undefined,
      transformer: undefined,
      swc: undefined,
      devServer: undefined,
      metro: undefined,
      extra: undefined,
      reactNativePath: undefined,
    });
  });

  it('preserves top-level properties', async () => {
    const source: GranitePluginCore['config'] = {
      extra: { customOption: 'source' },
    };

    const target: GranitePluginCore['config'] = {
      extra: { anotherOption: 'target' },
    };

    const result = await mergeConfig(source, target);

    expect(result?.extra).toEqual({
      customOption: 'source',
      anotherOption: 'target',
    });
  });

  it('handles complex nested configuration merge', async () => {
    const mockLoad = vitest.fn();
    const mockTransform = vitest.fn();

    const mockMiddleware1 = vitest.fn();
    const mockMiddleware2 = vitest.fn();

    const rule1 = createBabelRule('react');
    const rule2 = createBabelRule('utils');

    const source: GranitePluginCore['config'] = {
      resolver: {
        alias: [{ from: '@components', to: './src/components' }],
        protocols: {
          'custom:': { load: mockLoad },
        },
      },
      transformer: {
        transformSync: mockTransform,
      },
      babel: {
        rules: [rule1],
      },
      esbuild: {
        target: 'es2020',
        prelude: ['react-polyfill.js'],
      },
      swc: {
        plugins: [['@swc/plugin-styled-components', { displayName: true }]],
      },
      metro: {
        middlewares: [mockMiddleware1],
      },
    };

    const target: GranitePluginCore['config'] = {
      resolver: {
        alias: [{ from: '@utils', to: './src/utils' }],
      },
      babel: {
        rules: [rule2],
      },
      esbuild: {
        minify: true,
        prelude: ['core-js-polyfill.js'],
      },
      metro: {
        middlewares: [mockMiddleware2],
      },
    };

    const result = await mergeConfig(source, target);

    expect(result?.resolver?.alias).toHaveLength(2);
    expect(result?.babel?.rules).toHaveLength(2);
    expect(result?.babel?.rules).toContain(rule1);
    expect(result?.babel?.rules).toContain(rule2);
    expect(result?.esbuild?.target).toBe('es2020');
    expect(result?.esbuild?.minify).toBe(true);
    expect(result?.esbuild?.prelude).toEqual(['react-polyfill.js', 'core-js-polyfill.js']);
    expect(result?.metro?.middlewares).toEqual([mockMiddleware1, mockMiddleware2]);
  });

  it('merges multiple configs', async () => {
    const mockLoad1 = vitest.fn();
    const mockLoad2 = vitest.fn();

    const mockMiddleware1 = vitest.fn();
    const mockMiddleware2 = vitest.fn();
    const mockMiddleware3 = vitest.fn();
    const mockMiddleware4 = vitest.fn();
    const mockUpdate = vitest.fn();

    const mockTransform1 = vitest.fn().mockImplementation((_: string, code: string) => {
      return '// from transform 2\n' + code;
    });

    const mockTransform2 = vitest.fn().mockImplementation((_: string, code: string) => {
      return '// from transform 2\n' + code;
    });

    const rule1 = createBabelRule('foo');
    const rule2 = createBabelRule('bar');
    const rule3 = createBabelRule('baz');
    const rule4 = createBabelRule('qux');

    const source: GranitePluginCore['config'] = {
      resolver: {
        alias: [{ from: 'src', to: './src' }],
        protocols: {
          custom1: {
            load: mockLoad1,
          },
        },
      },
      transformer: {
        transformSync: mockTransform1,
      },
      babel: {
        rules: [rule1],
      },
      esbuild: {
        banner: {
          js: 'console.log("banner 1");',
        },
        prelude: ['source.js'],
      },
      metro: {
        middlewares: [mockMiddleware1],
        serializer: {
          getPolyfills: () => ['metro-prelude-1.js'],
        },
      },
    };

    const target1: GranitePluginCore['config'] = {
      resolver: {
        alias: [{ from: 'src-1', to: './src-1' }],
        protocols: {
          custom2: {
            load: mockLoad2,
          },
        },
      },
      babel: {
        rules: [rule2],
      },
      metro: {
        middlewares: [mockMiddleware2],
        resolver: {
          blockList: [/foo/, /bar/],
        },
      },
      devServer: {
        middlewares: [mockMiddleware3],
      },
    };

    const target2: GranitePluginCore['config'] = {
      babel: {
        rules: [rule3],
      },
      swc: {
        plugins: ['swc-plugin' as any],
      },
      metro: {
        serializer: {
          getPolyfills: () => ['metro-prelude-2.js'],
        },
      },
      extra: { target2: '2' },
    };

    const target3: GranitePluginCore['config'] = {
      transformer: {
        transformSync: mockTransform2,
      },
      babel: {
        rules: [rule4],
      },
      esbuild: {
        prelude: ['source-2.js'],
        banner: {
          js: 'console.log("banner 2");',
        },
      },
      metro: {
        resolver: {
          blockList: /baz/,
        },
        reporter: {
          update: mockUpdate,
        },
      },
      devServer: {
        middlewares: [mockMiddleware4],
      },
      extra: { target3: '3' },
    };

    const result = await mergeConfig(source, target1, target2, target3);

    expect(result).toEqual({
      resolver: {
        alias: [
          { from: 'src', to: './src' },
          { from: 'src-1', to: './src-1' },
        ],
        protocols: {
          custom1: { load: mockLoad1 },
          custom2: { load: mockLoad2 },
        },
      },
      transformer: {
        transformSync: expect.any(Function),
        transformAsync: undefined,
      },
      esbuild: {
        define: {},
        inject: [],
        prelude: ['source.js', 'source-2.js'],
        banner: {
          js: 'console.log("banner 1");\nconsole.log("banner 2");',
        },
      },
      swc: {
        plugins: ['swc-plugin'],
      },
      babel: {
        rules: [rule1, rule2, rule3, rule4],
      },
      metro: {
        middlewares: [mockMiddleware1, mockMiddleware2],
        reporter: {
          update: mockUpdate,
        },
        resolver: {
          blockList: [/foo/, /bar/, /baz/],
        },
        serializer: {
          getPolyfills: expect.any(Function),
        },
      },
      devServer: {
        middlewares: [mockMiddleware3, mockMiddleware4],
      },
      extra: { target2: '2', target3: '3' },
      reactNativePath: undefined,
    });
  });

  it('merges dynamic configs', async () => {
    const rule1 = createBabelRule('foo');
    const rule2 = createBabelRule('bar');
    const rule3 = createBabelRule('baz');

    const source: GranitePluginCore['config'] = () => ({
      babel: { rules: [rule1] },
    });

    const target1: GranitePluginCore['config'] = () => ({
      babel: { rules: [rule2] },
    });

    const target2: GranitePluginCore['config'] = async () => ({
      babel: { rules: [rule3] },
    });

    const result = await mergeConfig(source, target1, target2);

    expect(result?.babel?.rules).toHaveLength(3);
    expect(result?.babel?.rules).toContain(rule1);
    expect(result?.babel?.rules).toContain(rule2);
    expect(result?.babel?.rules).toContain(rule3);
  });
});
