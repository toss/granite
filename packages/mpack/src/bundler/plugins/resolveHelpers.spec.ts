import type { PluginBuild } from 'esbuild';
import { describe, expect, it, vi } from 'vitest';
import { createNonRecursiveResolver } from './resolveHelpers';

describe('resolveHelpers', () => {
  function createDummyBuild() {
    return {
      resolve: vi.fn().mockImplementation((path: string, options: any) => {
        return { path: `resolved:${path}`, ...options };
      }),
    } as unknown as PluginBuild;
  }

  describe('createNonRecursiveResolver', () => {
    it('should create a non-recursive resolver', async () => {
      const build = createDummyBuild();
      const resolver = createNonRecursiveResolver(build);

      let result = await resolver(
        {
          path: 'foo',
          importer: 'shims',
          namespace: 'shims',
          resolveDir: 'shims',
          kind: 'import-statement',
          pluginData: undefined,
          with: {},
        },
        {}
      );

      expect(typeof result).toBe('object');

      result = await resolver(
        {
          path: 'foo',
          importer: 'shims',
          namespace: 'shims',
          resolveDir: 'shims',
          kind: 'import-statement',
          with: {},
          pluginData: result?.pluginData,
        },
        {}
      );

      expect(result).toBe(null);
      expect(build.resolve).toHaveBeenCalledTimes(1);
    });
  });
});
