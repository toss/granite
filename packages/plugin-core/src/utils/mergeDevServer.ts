import { DevServerConfig } from '@granite-js/mpack';

export function mergeDevServer(source?: DevServerConfig, target?: DevServerConfig) {
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
    middlewares: [...(source.middlewares ?? []), ...(target.middlewares ?? [])],
  };
}
