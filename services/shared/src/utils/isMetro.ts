import { getGlobal } from './getGlobal';

export function isMetro() {
  const global = getGlobal() as any;
  const metroGlobalPrefix = global.__METRO_GLOBAL_PREFIX__ ?? '';

  // If `__r` (= metroRequire) is defined, current bundle is built by Metro.
  return `${metroGlobalPrefix}__r` in global;
}
