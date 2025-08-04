import type { OnResolveArgs, PluginBuild, ResolveOptions } from 'esbuild';

const RESOLVED_FLAG_KEY = Symbol.for('mpack:REAOLVED_FLAG');

export function createNonRecursiveResolver(build: PluginBuild) {
  return (args: OnResolveArgs, options: ResolveOptions) => {
    if (args.pluginData?.[RESOLVED_FLAG_KEY]) {
      return null;
    }

    const pluginDataWithResolvedFlag = {
      ...options?.pluginData,
      [RESOLVED_FLAG_KEY]: true,
    };

    return build.resolve(args.path, { ...options, pluginData: pluginDataWithResolvedFlag });
  };
}

export function isResolved(args: OnResolveArgs) {
  return args.pluginData?.[RESOLVED_FLAG_KEY];
}
