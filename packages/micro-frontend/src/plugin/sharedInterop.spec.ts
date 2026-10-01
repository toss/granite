import vm from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import { getPreludeConfig } from '../plugin-utils/prelude';
import { getMicroFrontendRuntimeContext, registerShared } from '../runtime/registry';

function registerGenerated(moduleValue: unknown, appName = 'shared-host'): void {
  const config = getPreludeConfig({}, appName);
  vm.runInNewContext([config.banner, config.preludeScript, 'registerShared("shared", moduleValue);'].join('\n'), {
    global: globalThis,
    moduleValue,
  });
}

function readShared(): unknown {
  return getMicroFrontendRuntimeContext().sharedModules.shared?.get();
}

function requireObject(value: unknown): object {
  if ((typeof value !== 'object' || value == null) && typeof value !== 'function') {
    throw new Error('Expected a shared namespace');
  }
  return value;
}

afterEach(() => Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__'));

describe.each([
  { name: 'runtime', register: (value: unknown) => registerShared('shared', value) },
  { name: 'generated prelude', register: registerGenerated },
])('$name shared interop', ({ register }) => {
  it('marks an immutable namespace for legacy default imports without mutating it', () => {
    const defaultExport = () => 'shared';
    const namespace = Object.freeze({ default: defaultExport, named: 'named' });
    register(namespace);

    const imported = requireObject(readShared());
    expect(Reflect.get(imported, '__esModule')).toBe(true);
    expect(Reflect.get(imported, 'default')).toBe(defaultExport);
    expect(Reflect.get(imported, 'named')).toBe('named');
    expect(Reflect.has(namespace, '__esModule')).toBe(false);
    expect(readShared()).toBe(imported);
  });

  it.each([null, undefined])('preserves an explicit %s default export', (value) => {
    register(Object.freeze({ default: value }));
    expect(Reflect.get(requireObject(readShared()), 'default')).toBe(value);
  });

  it('preserves live default, named, hidden and symbol exports', () => {
    let value = 1;
    const symbol = Symbol('export');
    const namespace = Object.freeze(
      Object.defineProperties(
        {},
        {
          default: { enumerable: true, get: () => value },
          named: { enumerable: true, get: () => value },
          hidden: { get: () => value },
          [symbol]: { enumerable: true, get: () => value },
        }
      )
    );
    register(namespace);
    const imported = requireObject(readShared());
    value = 2;
    for (const key of ['default', 'named', 'hidden', symbol]) {
      expect(Reflect.get(imported, key)).toBe(2);
    }
    expect(Object.keys(imported).sort()).toEqual(['default', 'named']);
  });

  it('keeps marked namespaces unchanged', () => {
    const namespace = Object.freeze({ __esModule: true, default: 'value' });
    register(namespace);
    expect(readShared()).toBe(namespace);
  });

  it('provides the original value as the default when it is absent', () => {
    const value = Object.freeze({ named: 'value' });
    register(value);
    expect(Reflect.get(requireObject(readShared()), 'default')).toBe(value);
  });

  it('preserves callable values and their receiver', () => {
    const value = Object.freeze(function (this: { offset: number }, input: number) {
      return this.offset + input;
    });
    register(value);
    const imported = readShared();
    expect(typeof imported).toBe('function');
    if (typeof imported !== 'function') {
      throw new Error('Expected a callable export');
    }
    expect(Reflect.apply(imported, { offset: 2 }, [3])).toBe(5);
    expect(Reflect.get(imported, 'default')).toBe(value);
  });

  it.each([null, undefined, 42, 'value'])('preserves primitive %s registrations', (value) => {
    register(value);
    expect(readShared()).toBe(value);
    expect(() => registerShared('shared', value)).not.toThrow();
  });

  it('does not publish an entry when namespace normalization fails', () => {
    const value = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('namespace unavailable');
        },
      }
    );
    expect(() => register(value)).toThrow('namespace unavailable');
    expect(getMicroFrontendRuntimeContext().sharedModules.shared).toBeUndefined();
  });
});

describe.each(['runtime-first', 'prelude-first'])('%s registration ownership', (order) => {
  it('accepts the same original namespace across bundles and rejects a different one', () => {
    const namespace = Object.freeze({ default: 'value' });
    if (order === 'runtime-first') {
      registerShared('shared', namespace);
    }
    registerGenerated(namespace);
    const imported = readShared();
    registerShared('shared', namespace);
    registerShared('shared', imported);
    registerGenerated(namespace, 'another-host');
    expect(readShared()).toBe(imported);
    expect(() => registerShared('shared', { default: 'value' })).toThrow('already registered');
    expect(() => registerGenerated({ default: 'value' }, 'conflicting-host')).toThrow('already registered');
    expect(Object.keys(getMicroFrontendRuntimeContext().sharedModules.shared ?? {})).toEqual(['get', 'loaded']);
    expect(readShared()).toBe(imported);
  });
});
