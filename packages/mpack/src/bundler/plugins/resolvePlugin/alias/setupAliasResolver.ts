import path from 'path';
import type { AliasConfig, ResolveResult } from '@granite-js/plugin-core';
import { assert } from 'es-toolkit';
import type { OnResolveArgs, PluginBuild, ResolveOptions } from 'esbuild';
import { Performance } from '../../../../performance';
import { normalizePath } from '../../../../utils/esbuildUtils';
import { replaceModulePath } from '../../../../utils/replaceModulePath';
import { createNonRecursiveResolver, isResolved } from '../../resolveHelpers';
import { swcHelperOptimizationRules } from '../../shared/swc';

export function setupAliasResolver(build: PluginBuild, aliasConfig: AliasConfig[]) {
  const resolver = createNonRecursiveResolver(build);

  [swcHelperOptimizationRules.getAliasConfig(), ...aliasConfig].forEach((aliasConfig) => {
    const resolveResultCache = new Map<string, { path: string }>();
    const { filter, resolveAlias } = resolveAliasConfig(build, aliasConfig);

    build.onResolve({ filter }, async (args) => {
      if (isResolved(args)) {
        return null;
      }

      const trace = Performance.trace('alias-resolver', {
        detail: { pattern: filter, path: args.path },
      });

      const defaultResolveOptions = {
        resolveDir: args.resolveDir,
        importer: args.importer,
        kind: args.kind,
        with: args.with,
      };

      const resolveResult = await resolveAlias(args);
      const resolvePath = resolveResult.path;
      const resolveOptions = { ...defaultResolveOptions, ...(resolveResult.options ?? {}) };

      const cacheKey = `${resolveOptions.kind}:${resolveOptions.resolveDir}:${resolvePath}`;

      if (resolveResultCache.has(cacheKey)) {
        trace.stop({ detail: { cacheHit: true } });
        return resolveResultCache.get(cacheKey);
      }

      if (path.isAbsolute(resolvePath)) {
        trace.stop({ detail: { isAbsolute: true } });
        const result = { path: resolvePath };
        resolveResultCache.set(cacheKey, result);
        return result;
      }

      const pathOverriddenArgs = { ...args, path: resolvePath };
      const result = await resolver(pathOverriddenArgs, resolveOptions);

      if (result) {
        trace.stop({ detail: { cacheHit: false, isAbsolute: false } });

        resolveResultCache.set(cacheKey, result);

        return result;
      }

      return null;
    });
  });
}

function resolveAliasConfig(build: PluginBuild, aliasConfig: AliasConfig) {
  const { from, to, exact } = aliasConfig;
  const filter = new RegExp(exact ? `^${from}$` : `^${from}(?:$|/)`);
  const resolver = createNonRecursiveResolver(build);

  const aliasResolver = (boundArgs: OnResolveArgs, path: string, options: ResolveOptions) => {
    const result = resolver({ ...boundArgs, path }, options);
    assert(result, 'resolver should return result');
    return result;
  };

  const resolveAlias = async (args: OnResolveArgs) => {
    if (typeof to === 'string') {
      return normalizeResolveResult(replaceModulePath(args.path, from, to));
    }

    if (typeof to === 'function') {
      const result = await to({ resolve: aliasResolver.bind(null, args), args });
      return normalizeResolveResult(result);
    }

    return normalizeResolveResult(to);
  };

  return { filter, resolveAlias };
}

function normalizeResolveResult(result: ResolveResult) {
  if (typeof result === 'string') {
    return { path: normalizePath(result), options: undefined };
  }

  const { path, ...options } = result;
  return { path, options };
}
