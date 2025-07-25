import { isNotNil } from 'es-toolkit';
import type { PluginMetroConfig } from '../types';

export function mergeMetro(source?: PluginMetroConfig, target?: PluginMetroConfig): PluginMetroConfig | undefined {
  if (!(source || target)) {
    return undefined;
  }

  if (source == null) {
    return target;
  }

  if (target == null) {
    return source;
  }

  return {
    ...source,
    ...target,
    middlewares: [...(source.middlewares || []), ...(target.middlewares || [])],
    resolver: mergeResolver(source.resolver, target.resolver),
    serializer: mergeSerializer(source.serializer, target.serializer),
    reporter: mergeReporter(source.reporter, target.reporter),
  };
}

function mergeResolver(
  source?: PluginMetroConfig['resolver'],
  target?: PluginMetroConfig['resolver']
): PluginMetroConfig['resolver'] {
  if (!(source || target)) {
    return undefined;
  }

  if (source == null) {
    return target;
  }

  if (target == null) {
    return source;
  }

  return {
    ...source,
    ...target,
    blockList: [
      ...((Array.isArray(source.blockList) ? source.blockList : [source.blockList]) || []),
      ...((Array.isArray(target.blockList) ? target.blockList : [target.blockList]) || []),
    ].filter(isNotNil),
  };
}

function mergeSerializer(
  source?: PluginMetroConfig['serializer'],
  target?: PluginMetroConfig['serializer']
): PluginMetroConfig['serializer'] {
  if (!(source || target)) {
    return undefined;
  }

  if (source == null) {
    return target;
  }

  if (target == null) {
    return source;
  }

  return {
    ...source,
    ...target,
    getPolyfills: () => [...(source.getPolyfills?.() || []), ...(target.getPolyfills?.() || [])],
  };
}

function mergeReporter(
  source?: PluginMetroConfig['reporter'],
  target?: PluginMetroConfig['reporter']
): PluginMetroConfig['reporter'] {
  if (!(source || target)) {
    return undefined;
  }

  if (source == null) {
    return target;
  }

  if (target == null) {
    return source;
  }

  return {
    update: (event) => {
      source.update?.(event);
      target.update?.(event);
    },
  };
}
