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
    prelude: [...(source.prelude || []), ...(target.prelude || [])],
    reporter: mergeReporter(source.reporter, target.reporter),
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
