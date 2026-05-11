import path from 'path';
import type { AliasConfig, ResolveResult, ResolveResultWithOptions } from '@granite-js/plugin-core';
import { assert } from 'es-toolkit';
import type { OnResolveArgs, OnResolveResult, PluginBuild, ResolveOptions } from 'esbuild';
import { Performance } from '../../../../performance';
import { normalizePath } from '../../../../utils/esbuildUtils';
import { replaceModulePath } from '../../../../utils/replaceModulePath';
import { createNonRecursiveResolver, isResolved } from '../../resolveHelpers';
import { swcHelperOptimizationRules } from '../../shared/swc';

export function setupAliasResolver(build: PluginBuild, aliasConfig: AliasConfig[]) {
  const resolver = createNonRecursiveResolver(build);

  [swcHelperOptimizationRules.getAliasConfig(), ...aliasConfig].forEach((aliasConfig) => {
    const resolveResultCache = new Map<string, OnResolveResult>();
    const { filter, resolveAlias } = resolveAliasConfig(build, aliasConfig);

    build.onResolve({ filter }, async (args) => {
      if (isResolved(args)) {
        return null;
      }

      const trace = Performance.trace('alias-resolver', {
        detail: { pattern: filter, path: args.path },
      });

      const resolveResult = await resolveAlias(args);
      const resolvePath = resolveResult.path;
      const resolveOptions = toResolveOptions(args, resolveResult);

      const cacheKey = `${resolveOptions.kind}:${resolveOptions.resolveDir}:${resolvePath}`;

      if (resolveResultCache.has(cacheKey)) {
        trace.stop({ detail: { cacheHit: true } });
        return resolveResultCache.get(cacheKey);
      }

      if (path.isAbsolute(resolvePath)) {
        trace.stop({ detail: { isAbsolute: true } });
        const result: OnResolveResult = { path: resolvePath };
        applyOnResolveResultOptions(result, resolveResult);
        resolveResultCache.set(cacheKey, result);
        return result;
      }

      const pathOverriddenArgs: OnResolveArgs = {
        path: resolvePath,
        importer: args.importer,
        namespace: args.namespace,
        resolveDir: args.resolveDir,
        kind: args.kind,
        pluginData: args.pluginData,
        with: args.with,
      };
      const result = await resolver(pathOverriddenArgs, resolveOptions);

      if (result) {
        trace.stop({ detail: { cacheHit: false, isAbsolute: false } });

        applyOnResolveResultOptions(result, resolveResult);
        resolveResultCache.set(cacheKey, result);

        return result;
      }

      return null;
    });
  });
}

function resolveAliasConfig(build: PluginBuild, aliasConfig: AliasConfig) {
  const { from, to, exact } = aliasConfig;
  const escapedFrom = escapeRegExpString(from);
  const filter = new RegExp(exact ? `^${escapedFrom}$` : `^${escapedFrom}(?:$|/)`);
  const resolver = createNonRecursiveResolver(build);

  const aliasResolver = (args: OnResolveArgs, path: string, options: ResolveOptions) => {
    const result = resolver(
      {
        path,
        importer: args.importer,
        namespace: args.namespace,
        resolveDir: args.resolveDir,
        kind: args.kind,
        pluginData: args.pluginData,
        with: args.with,
      },
      options
    );
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

function escapeRegExpString(str: string) {
  return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function normalizeResolveResult(result: ResolveResult): ResolveResultWithOptions {
  if (typeof result === 'string') {
    return { path: normalizePath(result) };
  }

  return result;
}

function toResolveOptions(args: OnResolveArgs, result: ResolveResultWithOptions): ResolveOptions {
  return {
    resolveDir: result.resolveDir ?? args.resolveDir,
    importer: result.importer ?? args.importer,
    kind: result.kind ?? args.kind,
    with: result.with ?? args.with,
  };
}

function applyOnResolveResultOptions(target: OnResolveResult, source: OnResolveResult) {
  if (source.pluginName !== undefined) {
    target.pluginName = source.pluginName;
  }

  if (source.errors !== undefined) {
    target.errors = source.errors;
  }

  if (source.warnings !== undefined) {
    target.warnings = source.warnings;
  }

  if (source.external !== undefined) {
    target.external = source.external;
  }

  if (source.sideEffects !== undefined) {
    target.sideEffects = source.sideEffects;
  }

  if (source.namespace !== undefined) {
    target.namespace = source.namespace;
  }

  if (source.suffix !== undefined) {
    target.suffix = source.suffix;
  }

  if (source.pluginData !== undefined) {
    target.pluginData = source.pluginData;
  }

  if (source.watchFiles !== undefined) {
    target.watchFiles = source.watchFiles;
  }

  if (source.watchDirs !== undefined) {
    target.watchDirs = source.watchDirs;
  }
}
