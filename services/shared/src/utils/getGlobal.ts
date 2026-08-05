import type { GraniteGlobal } from '../types';

declare const window: unknown;

export function getGlobal(this: unknown) {
  return (
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof global !== 'undefined'
        ? global
        : typeof window !== 'undefined'
          ? window
          : this
  ) as GraniteGlobal;
}
