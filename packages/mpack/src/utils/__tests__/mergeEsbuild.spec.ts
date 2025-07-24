import { describe, expect, it } from 'vitest';
import { mergeEsbuild } from '../mergeEsbuild';

describe('mergeEsbuild', () => {
  it('returns undefined when both source and target are undefined', () => {
    const result = mergeEsbuild(undefined, undefined);
    expect(result).toBeUndefined();
  });

  it('returns target when source is undefined', () => {
    const target = { minify: true };
    const result = mergeEsbuild(undefined, target);
    expect(result).toEqual(target);
  });

  it('returns source when target is undefined', () => {
    const source = { minify: true };
    const result = mergeEsbuild(source, undefined);
    expect(result).toEqual(source);
  });

  it('merges prelude arrays', () => {
    const source = { prelude: ['prelude1.js'] };
    const target = { prelude: ['prelude2.js'] };
    const result = mergeEsbuild(source, target);

    expect(result?.prelude).toEqual(['prelude1.js', 'prelude2.js']);
  });

  it('handles missing prelude arrays', () => {
    const source = { minify: true };
    const target = { prelude: ['prelude.js'] };
    const result = mergeEsbuild(source, target);

    expect(result?.prelude).toEqual(['prelude.js']);
    expect(result?.minify).toBe(true);
  });

  it('merges esbuild options with target overriding source', () => {
    const source = {
      minify: true,
      sourcemap: false,
      prelude: ['source.js'],
    };
    const target = {
      minify: false,
      bundle: true,
      prelude: ['target.js'],
    };
    const result = mergeEsbuild(source, target);

    expect(result?.minify).toBe(false);
    expect(result?.sourcemap).toBe(false);
    expect(result?.bundle).toBe(true);
    expect(result?.prelude).toEqual(['source.js', 'target.js']);
  });

  it('preserves all esbuild build options', () => {
    const source = {
      target: 'es2020',
      format: 'esm' as const,
      banner: {
        js: 'console.log("banner 1");',
      },
      define: {
        __DEV__: 'true',
      },
      inject: ['react-polyfill.js', 'core-js-polyfill.js'],
      prelude: ['polyfill.js'],
    };
    const target = {
      outdir: 'dist',
      splitting: true,
      banner: {
        js: 'console.log("banner 2");',
      },
      define: {
        __DEV2__: 'true',
      },
      inject: ['runtime.js'],
      prelude: ['runtime.js'],
    };
    const result = mergeEsbuild(source, target);

    expect(result).toEqual({
      target: 'es2020',
      format: 'esm',
      outdir: 'dist',
      splitting: true,
      prelude: ['polyfill.js', 'runtime.js'],
      banner: {
        js: 'console.log("banner 1");\nconsole.log("banner 2");',
      },
      define: {
        __DEV__: 'true',
        __DEV2__: 'true',
      },
      inject: ['react-polyfill.js', 'core-js-polyfill.js', 'runtime.js'],
    });
  });

  it('handles empty prelude arrays', () => {
    const source = { prelude: [], minify: true };
    const target = { prelude: ['script.js'] };
    const result = mergeEsbuild(source, target);

    expect(result?.prelude).toEqual(['script.js']);
    expect(result?.minify).toBe(true);
  });
});
