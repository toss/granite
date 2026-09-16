import vm from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import { getPreludeConfig } from './prelude';
import { createContainer, exposeModule } from '../runtime/registry';

type Exposure = {
  readonly legacy: unknown;
  readonly modern: unknown;
};

type Implementation = {
  readonly expose: (moduleValue: object) => Exposure;
  readonly prepare: (moduleValue: object) => PreparedExposure;
  readonly name: string;
};

type PreparedExposure = {
  readonly expose: () => void;
  readonly legacyModules: object;
  readonly modernModules: object;
};

function requireObject(value: unknown): object {
  if ((typeof value !== 'object' || value == null) && typeof value !== 'function') {
    throw new Error('Expected registry object');
  }
  return value;
}

function observe(globalObject: Record<string, unknown>, appName: string): Exposure {
  const context = requireObject(Reflect.get(globalObject, '__MICRO_FRONTEND__'));
  const instances = requireObject(Reflect.get(context, '__INSTANCES__'));
  const containers = requireObject(Reflect.get(context, '__CONTAINERS__'));
  const legacy = requireObject(Reflect.get(instances, Reflect.get(instances, appName)));
  const modern = requireObject(Reflect.get(containers, appName));
  return {
    legacy: Reflect.get(requireObject(Reflect.get(legacy, 'exposeMap')), 'App'),
    modern: Reflect.get(requireObject(Reflect.get(modern, 'exposedModules')), './App'),
  };
}

const implementations: readonly Implementation[] = [
  {
    name: 'runtime',
    expose(moduleValue) {
      const container = createContainer('immutable-parity-app');
      exposeModule(container, './App', moduleValue);
      return observe(globalThis, 'immutable-parity-app');
    },
    prepare(moduleValue) {
      const container = createContainer('immutable-parity-app');
      const context = requireObject(Reflect.get(globalThis, '__MICRO_FRONTEND__'));
      const instances = requireObject(Reflect.get(context, '__INSTANCES__'));
      const legacy = requireObject(Reflect.get(instances, Reflect.get(instances, 'immutable-parity-app')));
      return {
        expose: () => exposeModule(container, './App', moduleValue),
        legacyModules: requireObject(Reflect.get(legacy, 'exposeMap')),
        modernModules: container.exposedModules,
      };
    },
  },
  {
    name: 'generated prelude',
    expose(moduleValue) {
      const globalObject: Record<string, unknown> = {};
      const config = getPreludeConfig({}, 'immutable-parity-app');
      vm.runInNewContext(
        [config.banner, config.preludeScript, 'exposeModule(__container, "./App", moduleValue);'].join('\n'),
        { global: globalObject, moduleValue }
      );
      return observe(globalObject, 'immutable-parity-app');
    },
    prepare(moduleValue) {
      const globalObject: Record<string, unknown> = {};
      const config = getPreludeConfig({}, 'immutable-parity-app');
      vm.runInNewContext(
        [
          config.banner,
          config.preludeScript,
          'global.__exposeImmutableParity = function () { exposeModule(__container, "./App", moduleValue); };',
        ].join('\n'),
        { global: globalObject, moduleValue }
      );
      const context = requireObject(Reflect.get(globalObject, '__MICRO_FRONTEND__'));
      const instances = requireObject(Reflect.get(context, '__INSTANCES__'));
      const containers = requireObject(Reflect.get(context, '__CONTAINERS__'));
      const legacy = requireObject(Reflect.get(instances, Reflect.get(instances, 'immutable-parity-app')));
      const modern = requireObject(Reflect.get(containers, 'immutable-parity-app'));
      const expose = Reflect.get(globalObject, '__exposeImmutableParity');
      if (typeof expose !== 'function') {
        throw new Error('Expected generated exposure function');
      }
      return {
        expose: () => Reflect.apply(expose, globalObject, []),
        legacyModules: requireObject(Reflect.get(legacy, 'exposeMap')),
        modernModules: requireObject(Reflect.get(modern, 'exposedModules')),
      };
    },
  },
];

afterEach(() => {
  Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
});

describe.each(implementations)('$name immutable legacy ESM parity', ({ expose, prepare }) => {
  it('preserves the identity of a real ESM namespace', () => {
    // Given
    const moduleValue = Object.freeze(Object.defineProperty({ namedExport: 'esm' }, '__esModule', { value: true }));

    // When
    const exposure = expose(moduleValue);

    // Then
    expect(exposure.modern).toBe(moduleValue);
    expect(exposure.legacy).toBe(moduleValue);
  });

  it.each([undefined, null])(
    'preserves frozen namespace descriptors and an own %s default while forwarding exports live',
    (ownDefault) => {
      // Given
      const symbolExport = Symbol('symbolExport');
      let namedExport = 'before';
      let hiddenExport = 'hidden-before';
      let symbolValue = 'symbol-before';
      const moduleValue = Object.freeze(
        Object.defineProperties(
          {},
          {
            default: { enumerable: true, value: ownDefault },
            hiddenExport: { enumerable: false, get: () => hiddenExport },
            namedExport: { enumerable: true, get: () => namedExport },
            [symbolExport]: { enumerable: false, get: () => symbolValue },
          }
        )
      );
      const originalDescriptors = Object.getOwnPropertyDescriptors(moduleValue);

      // When
      const exposure = expose(moduleValue);
      namedExport = 'after';
      hiddenExport = 'hidden-after';
      symbolValue = 'symbol-after';
      const legacyModule = requireObject(exposure.legacy);

      // Then
      expect(exposure.modern).toBe(moduleValue);
      expect(legacyModule).not.toBe(moduleValue);
      expect(Reflect.get(legacyModule, '__esModule')).toBe(true);
      expect(Reflect.get(legacyModule, 'default')).toBe(ownDefault);
      expect(Reflect.get(legacyModule, 'namedExport')).toBe('after');
      expect(Reflect.get(legacyModule, 'hiddenExport')).toBe('hidden-after');
      expect(Reflect.get(legacyModule, symbolExport)).toBe('symbol-after');
      expect(Object.getOwnPropertyDescriptor(legacyModule, 'hiddenExport')?.enumerable).toBe(false);
      expect(Object.getOwnPropertyDescriptor(legacyModule, symbolExport)?.enumerable).toBe(false);
      expect(Object.getOwnPropertyDescriptors(moduleValue)).toEqual(originalDescriptors);
      expect(Object.isFrozen(moduleValue)).toBe(true);
    }
  );

  it('falls back to the original namespace only when the default export is absent', () => {
    // Given
    const moduleValue = Object.freeze({ namedExport: 'value' });

    // When
    const exposure = expose(moduleValue);

    // Then
    expect(Reflect.get(requireObject(exposure.legacy), 'default')).toBe(moduleValue);
  });

  it('keeps a frozen callable callable with its receiver and arguments', () => {
    // Given
    let namedExport = 'before';
    const moduleValue = Object.freeze(
      Object.defineProperty(
        function (this: { readonly prefix: string }, value: string): string {
          return `${this.prefix}${value}`;
        },
        'namedExport',
        { enumerable: true, get: () => namedExport }
      )
    );
    const originalDescriptors = Object.getOwnPropertyDescriptors(moduleValue);

    // When
    const exposure = expose(moduleValue);
    namedExport = 'after';
    if (typeof exposure.legacy !== 'function') {
      throw new Error('Expected callable legacy facade');
    }

    // Then
    expect(exposure.modern).toBe(moduleValue);
    expect(typeof exposure.legacy).toBe('function');
    expect(Reflect.apply(exposure.legacy, { prefix: 'receiver:' }, ['argument'])).toBe('receiver:argument');
    expect(Reflect.get(exposure.legacy, 'namedExport')).toBe('after');
    expect(Reflect.get(exposure.legacy, 'default')).toBe(moduleValue);
    expect(Reflect.get(exposure.legacy, 'name')).toBe(Reflect.get(moduleValue, 'name'));
    expect(Reflect.get(exposure.legacy, 'length')).toBe(Reflect.get(moduleValue, 'length'));
    expect(Object.getOwnPropertyDescriptor(exposure.legacy, 'prototype')?.configurable).toBe(false);
    expect(Object.getOwnPropertyDescriptors(moduleValue)).toEqual(originalDescriptors);
    expect(Object.isFrozen(moduleValue)).toBe(true);
  });

  it('publishes neither view when facade construction fails', () => {
    // Given
    const moduleValue = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('legacy facade construction failed');
        },
      }
    );
    const exposure = prepare(moduleValue);

    // When
    const exposeModuleValue = exposure.expose;

    // Then
    expect(exposeModuleValue).toThrow('legacy facade construction failed');
    expect(Reflect.has(exposure.modernModules, './App')).toBe(false);
    expect(Reflect.has(exposure.legacyModules, 'App')).toBe(false);
  });
});
