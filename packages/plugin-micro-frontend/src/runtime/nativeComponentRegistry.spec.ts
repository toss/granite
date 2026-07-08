import { describe, expect, it, vi } from 'vitest';
import { toDuplicateTolerantNativeComponentRegistry } from './nativeComponentRegistry';

describe('toDuplicateTolerantNativeComponentRegistry', () => {
  it('recovers from duplicate view registration by returning the component name', () => {
    const registered = new Set<string>();
    const registry = {
      get: (name: string) => {
        if (registered.has(name)) {
          throw new Error(`Tried to register two views with the same name ${name}`);
        }
        registered.add(name);
        return name;
      },
    };

    const tolerant = toDuplicateTolerantNativeComponentRegistry(registry);

    expect(tolerant.get('GraniteImage')).toBe('GraniteImage');
    expect(tolerant.get('GraniteImage')).toBe('GraniteImage');
  });

  it('rethrows unrelated registration errors and keeps other members intact', () => {
    const setRuntimeConfigProvider = vi.fn();
    const registry = {
      get: () => {
        throw new Error('codegenNativeComponent import failed');
      },
      setRuntimeConfigProvider,
    };

    const tolerant = toDuplicateTolerantNativeComponentRegistry(registry);

    expect(() => tolerant.get('GraniteImage')).toThrow('codegenNativeComponent import failed');
    tolerant.setRuntimeConfigProvider();
    expect(setRuntimeConfigProvider).toHaveBeenCalledOnce();
  });
});
