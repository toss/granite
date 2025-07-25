import { isNotNil } from 'es-toolkit';
import type { MetroConfig } from '../types';

export function mergeMetro(source?: MetroConfig, target?: MetroConfig): MetroConfig | undefined {
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

function mergeResolver(source?: MetroConfig['resolver'], target?: MetroConfig['resolver']): MetroConfig['resolver'] {
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
  source?: MetroConfig['serializer'],
  target?: MetroConfig['serializer']
): MetroConfig['serializer'] {
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

function mergeReporter(source?: MetroConfig['reporter'], target?: MetroConfig['reporter']): MetroConfig['reporter'] {
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
