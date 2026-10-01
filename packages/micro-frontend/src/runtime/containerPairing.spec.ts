import { describe, expect, it } from 'vitest';
import {
  clearContainerPair,
  defineContainerPair,
  getLegacyContainerPair,
  rememberContainerPair,
} from './containerPairing';

describe('container pairing', () => {
  it('rolls back both markers when the second definition is interrupted', () => {
    // Given
    const first = {};
    const secondTarget = {};
    const second = new Proxy(secondTarget, {
      defineProperty(target, property, descriptor) {
        Reflect.defineProperty(target, property, descriptor);
        throw new Error('pair definition interrupted');
      },
    });

    // When
    const definePair = () => defineContainerPair(first, second);

    // Then
    expect(definePair).toThrow('pair definition interrupted');
    expect(Object.getOwnPropertySymbols(first)).toEqual([]);
    expect(Object.getOwnPropertySymbols(secondTarget)).toEqual([]);
  });

  it('does not retain registered ownership after another bundle clears the stable marker', () => {
    // Given
    const modern = { appName: 'cross-copy-app', config: {}, exposedModules: {} };
    const legacy = { name: 'cross-copy-app', config: {}, exposeMap: {} };
    defineContainerPair(modern, legacy);
    rememberContainerPair(modern, legacy);

    // When
    clearContainerPair(modern, legacy);

    // Then
    expect(getLegacyContainerPair(modern)).toBeUndefined();
  });
});
