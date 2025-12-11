import type { BabelConfig, BabelRule } from '@granite-js/plugin-core';
import { describe, expect, it } from 'vitest';
import { getMatchingBabelOptions } from '../getMatchingBabelPlugins';

describe('getMatchingBabelOptions', () => {
  const createRule = (name: string, options: Omit<BabelRule, 'if'>): BabelRule => ({
    if: ({ path }) => path.includes(name),
    ...options,
  });

  it('returns empty arrays when babel config is undefined', () => {
    const result = getMatchingBabelOptions(undefined, 'const x = 1;', '/path/to/file.ts', true);
    expect(result).toEqual({ plugins: [], presets: [] });
  });

  it('returns empty arrays when babel rules is empty', () => {
    const babel: BabelConfig = { rules: [] };
    const result = getMatchingBabelOptions(babel, 'const x = 1;', '/path/to/file.ts', true);
    expect(result).toEqual({ plugins: [], presets: [] });
  });

  it('returns empty arrays when no rules match', () => {
    const babel: BabelConfig = {
      rules: [createRule('zod', { plugins: ['babel-plugin-hermes'] })],
    };
    const result = getMatchingBabelOptions(babel, 'const x = 1;', '/path/to/yup/file.ts', true);
    expect(result).toEqual({ plugins: [], presets: [] });
  });

  it('returns plugins from single matching rule', () => {
    const babel: BabelConfig = {
      rules: [createRule('zod', { plugins: ['babel-plugin-hermes'] })],
    };
    const result = getMatchingBabelOptions(babel, 'const x = 1;', '/node_modules/zod/index.js', true);
    expect(result).toEqual({ plugins: ['babel-plugin-hermes'], presets: [] });
  });

  it('returns presets from single matching rule', () => {
    const babel: BabelConfig = {
      rules: [createRule('legacy', { presets: ['@babel/preset-env'] })],
    };
    const result = getMatchingBabelOptions(babel, 'const x = 1;', '/node_modules/legacy/index.js', true);
    expect(result).toEqual({ plugins: [], presets: ['@babel/preset-env'] });
  });

  it('returns both plugins and presets from single matching rule', () => {
    const babel: BabelConfig = {
      rules: [
        createRule('legacy', {
          plugins: ['babel-plugin-decorators'],
          presets: ['@babel/preset-env'],
        }),
      ],
    };
    const result = getMatchingBabelOptions(babel, 'const x = 1;', '/node_modules/legacy/index.js', true);
    expect(result).toEqual({
      plugins: ['babel-plugin-decorators'],
      presets: ['@babel/preset-env'],
    });
  });

  it('merges plugins and presets from multiple matching rules', () => {
    const babel: BabelConfig = {
      rules: [
        createRule('zod', { plugins: ['babel-plugin-hermes'] }),
        createRule('node_modules', { plugins: ['common-plugin'], presets: ['common-preset'] }),
      ],
    };
    const result = getMatchingBabelOptions(babel, 'const x = 1;', '/node_modules/zod/index.js', true);
    expect(result).toEqual({
      plugins: ['babel-plugin-hermes', 'common-plugin'],
      presets: ['common-preset'],
    });
  });

  it('preserves order of plugins and presets based on rule order', () => {
    const babel: BabelConfig = {
      rules: [
        createRule('node_modules', { plugins: ['first-plugin'], presets: ['first-preset'] }),
        createRule('zod', { plugins: ['second-plugin'], presets: ['second-preset'] }),
        createRule('/', { plugins: ['third-plugin'], presets: ['third-preset'] }),
      ],
    };
    const result = getMatchingBabelOptions(babel, 'const x = 1;', '/node_modules/zod/index.js', true);
    expect(result).toEqual({
      plugins: ['first-plugin', 'second-plugin', 'third-plugin'],
      presets: ['first-preset', 'second-preset', 'third-preset'],
    });
  });

  it('supports plugin and preset with options tuple', () => {
    const babel: BabelConfig = {
      rules: [
        {
          if: ({ path }) => path.includes('zod'),
          plugins: ['simple-plugin', ['plugin-with-options', { option1: true }]],
          presets: ['simple-preset', ['preset-with-options', { loose: true }]],
        },
      ],
    };
    const result = getMatchingBabelOptions(babel, 'const x = 1;', '/node_modules/zod/index.js', true);
    expect(result).toEqual({
      plugins: ['simple-plugin', ['plugin-with-options', { option1: true }]],
      presets: ['simple-preset', ['preset-with-options', { loose: true }]],
    });
  });

  it('supports condition based on code content', () => {
    const babel: BabelConfig = {
      rules: [
        {
          if: ({ code }) => code.includes('@flow'),
          plugins: ['flow-plugin'],
        },
      ],
    };

    const flowCode = '// @flow\nconst x = 1;';
    const tsCode = 'const x: number = 1;';

    expect(getMatchingBabelOptions(babel, flowCode, '/file.js', true)).toEqual({
      plugins: ['flow-plugin'],
      presets: [],
    });
    expect(getMatchingBabelOptions(babel, tsCode, '/file.ts', true)).toEqual({
      plugins: [],
      presets: [],
    });
  });

  it('correctly handles complex matching scenario', () => {
    const babel: BabelConfig = {
      rules: [
        createRule('react-native', { plugins: ['rn-plugin'] }),
        createRule('zod', { plugins: ['zod-plugin'] }),
        createRule('legacy-lib', { presets: ['@babel/preset-env'], plugins: ['decorators-plugin'] }),
        {
          if: ({ path }) => path.endsWith('.flow.js'),
          plugins: ['flow-plugin'],
        },
      ],
    };

    // File in zod - only zod-plugin
    expect(getMatchingBabelOptions(babel, '', '/node_modules/zod/lib/index.js', true)).toEqual({
      plugins: ['zod-plugin'],
      presets: [],
    });

    // File in react-native - only rn-plugin
    expect(getMatchingBabelOptions(babel, '', '/node_modules/react-native/index.js', true)).toEqual({
      plugins: ['rn-plugin'],
      presets: [],
    });

    // File in legacy-lib - both preset and plugin
    expect(getMatchingBabelOptions(babel, '', '/node_modules/legacy-lib/index.js', true)).toEqual({
      plugins: ['decorators-plugin'],
      presets: ['@babel/preset-env'],
    });

    // Flow file in react-native - both rn-plugin and flow-plugin
    expect(getMatchingBabelOptions(babel, '', '/node_modules/react-native/lib/file.flow.js', true)).toEqual({
      plugins: ['rn-plugin', 'flow-plugin'],
      presets: [],
    });

    // Regular src file - no plugins or presets
    expect(getMatchingBabelOptions(babel, '', '/src/App.tsx', true)).toEqual({
      plugins: [],
      presets: [],
    });
  });

  it('handles rules with only plugins or only presets', () => {
    const babel: BabelConfig = {
      rules: [
        createRule('only-plugins', { plugins: ['some-plugin'] }),
        createRule('only-presets', { presets: ['some-preset'] }),
      ],
    };

    expect(getMatchingBabelOptions(babel, '', '/only-plugins/file.js', true)).toEqual({
      plugins: ['some-plugin'],
      presets: [],
    });

    expect(getMatchingBabelOptions(babel, '', '/only-presets/file.js', true)).toEqual({
      plugins: [],
      presets: ['some-preset'],
    });
  });

  describe('dev mode condition', () => {
    it('applies rule only in dev mode when condition checks dev: true', () => {
      const babel: BabelConfig = {
        rules: [
          {
            if: ({ dev }) => dev,
            plugins: ['dev-only-plugin'],
          },
        ],
      };

      // dev: true - should match
      expect(getMatchingBabelOptions(babel, '', '/src/file.js', true)).toEqual({
        plugins: ['dev-only-plugin'],
        presets: [],
      });

      // dev: false - should not match
      expect(getMatchingBabelOptions(babel, '', '/src/file.js', false)).toEqual({
        plugins: [],
        presets: [],
      });
    });

    it('applies rule only in production mode when condition checks dev: false', () => {
      const babel: BabelConfig = {
        rules: [
          {
            if: ({ dev }) => !dev,
            plugins: ['prod-only-plugin'],
          },
        ],
      };

      // dev: true - should not match
      expect(getMatchingBabelOptions(babel, '', '/src/file.js', true)).toEqual({
        plugins: [],
        presets: [],
      });

      // dev: false - should match
      expect(getMatchingBabelOptions(babel, '', '/src/file.js', false)).toEqual({
        plugins: ['prod-only-plugin'],
        presets: [],
      });
    });

    it('combines dev condition with path condition', () => {
      const babel: BabelConfig = {
        rules: [
          {
            if: ({ dev, path }) => dev && path.includes('node_modules'),
            plugins: ['dev-node-modules-plugin'],
          },
        ],
      };

      // dev: true + node_modules - should match
      expect(getMatchingBabelOptions(babel, '', '/node_modules/lib/index.js', true)).toEqual({
        plugins: ['dev-node-modules-plugin'],
        presets: [],
      });

      // dev: false + node_modules - should not match
      expect(getMatchingBabelOptions(babel, '', '/node_modules/lib/index.js', false)).toEqual({
        plugins: [],
        presets: [],
      });

      // dev: true + src - should not match
      expect(getMatchingBabelOptions(babel, '', '/src/App.tsx', true)).toEqual({
        plugins: [],
        presets: [],
      });
    });

    it('handles multiple rules with different dev conditions', () => {
      const babel: BabelConfig = {
        rules: [
          {
            if: ({ dev }) => dev,
            plugins: ['dev-plugin'],
          },
          {
            if: ({ dev }) => !dev,
            plugins: ['prod-plugin'],
          },
          {
            if: () => true,
            plugins: ['always-plugin'],
          },
        ],
      };

      // dev: true - dev-plugin and always-plugin
      expect(getMatchingBabelOptions(babel, '', '/src/file.js', true)).toEqual({
        plugins: ['dev-plugin', 'always-plugin'],
        presets: [],
      });

      // dev: false - prod-plugin and always-plugin
      expect(getMatchingBabelOptions(babel, '', '/src/file.js', false)).toEqual({
        plugins: ['prod-plugin', 'always-plugin'],
        presets: [],
      });
    });
  });
});
