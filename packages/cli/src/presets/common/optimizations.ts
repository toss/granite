import type { OnResolveArgs, PluginBuild } from 'esbuild';

const resolveTslibEsm = () => ({
  from: 'tslib',
  to: async ({ resolve, args }: { resolve: PluginBuild['resolve']; args: OnResolveArgs }) => {
    const result = await resolve(args.path, {
      kind: args.kind,
      resolveDir: args.resolveDir,
    });

    if (result.errors.length) {
      throw new Error(`resolveTslibEsm: ${args.path}`);
    }

    return result.path.replace(/(tslib\.js|modules\/index\.js)$/, 'tslib.es6.js');
  },
  exact: true,
});

export const optimizations = { resolveTslibEsm };
