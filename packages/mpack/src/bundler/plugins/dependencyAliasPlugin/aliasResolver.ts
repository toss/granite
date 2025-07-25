import path from 'path';
import type { AliasConfig } from '@granite-js/plugin-core';
import type { PluginBuild, ResolveOptions } from 'esbuild';
import { Performance } from '../../../performance';
import { normalizePath } from '../../../utils/esbuildUtils';
import { replaceModulePath } from '../../../utils/replaceModulePath';
import { swcHelperOptimizationRules } from '../shared/swc';

const resolved = Symbol();

export function setupAliasResolver(build: PluginBuild, rootDir: string, aliasConfig: AliasConfig[]) {
  function aliasResolver(path: string, options: ResolveOptions) {
    return build.resolve(path, {
      ...options,
      pluginData: {
        ...options?.pluginData,
        [resolved]: true,
      },
    });
  }

  [swcHelperOptimizationRules.getAliasConfig(), ...aliasConfig].forEach(({ from, to, exact }) => {
    const resolveResultCache = new Map<string, { path: string }>();
    const filter = new RegExp(exact ? `^${from}$` : `^${from}(?:$|/)`);

    build.onResolve({ filter }, async (args) => {
      if (args.pluginData?.[resolved]) {
        return;
      }

      const trace = Performance.trace('alias-resolver', {
        detail: { pattern: filter, path: args.path },
      });
      const resolvedPath =
        typeof to === 'string' ? replaceModulePath(args.path, from, to) : await to({ resolve: aliasResolver, args });
      const normalizedPath = normalizePath(resolvedPath);

      const cacheKey = `${args.kind}:${normalizedPath}`;

      if (resolveResultCache.has(cacheKey)) {
        trace.stop({ detail: { cacheHit: true } });
        return resolveResultCache.get(cacheKey);
      }

      if (path.isAbsolute(normalizedPath)) {
        trace.stop({ detail: { isAbsolute: true } });
        const result = { path: normalizedPath };
        resolveResultCache.set(cacheKey, result);
        return result;
      }

      const result = await build.resolve(normalizedPath, {
        resolveDir: rootDir,
        kind: args.kind,
        pluginData: {
          [resolved]: true,
        },
      });

      trace.stop({ detail: { cacheHit: false, isAbsolute: false } });

      resolveResultCache.set(cacheKey, result);

      return result;
    });
  });
}
