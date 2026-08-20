import vm from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import { getPreludeConfig } from './prelude';
import { createContainer, exposeModule, registerShared } from '../runtime/registry';

type GlobalFixture = Record<string, unknown>;

type Scenario = {
  readonly name: string;
  readonly createGlobal: () => GlobalFixture;
};

type ParityObservation = {
  readonly canonicalKeys: readonly string[];
  readonly legacyImported: unknown;
  readonly modernImported: unknown;
  readonly sharedImported: unknown;
};

type Implementation = {
  readonly name: string;
  readonly execute: (globalObject: GlobalFixture, moduleValue: object, sharedValue: object) => ParityObservation;
};

const scenarios: readonly Scenario[] = [
  { name: 'empty', createGlobal: () => ({}) },
  {
    name: 'legacy-first',
    createGlobal: () => ({ __MICRO_FRONTEND__: { __SHARED__: {}, __INSTANCES__: [] } }),
  },
];

function requireObject(value: unknown): object {
  if (typeof value !== 'object' || value == null) {
    throw new Error('Expected generated registry object');
  }
  return value;
}

function observe(globalObject: GlobalFixture): ParityObservation {
  const context = requireObject(Reflect.get(globalObject, '__MICRO_FRONTEND__'));
  const instances = requireObject(Reflect.get(context, '__INSTANCES__'));
  const legacyIndex = Reflect.get(instances, 'parity-app');
  if (typeof legacyIndex !== 'number') {
    throw new Error('Expected generated legacy container index');
  }
  const legacyContainer = requireObject(Reflect.get(instances, legacyIndex));
  const modernContainer = requireObject(
    Reflect.get(requireObject(Reflect.get(context, '__CONTAINERS__')), 'parity-app')
  );
  const sharedModule = requireObject(Reflect.get(requireObject(Reflect.get(context, '__SHARED__')), 'react'));
  const sharedGetter = Reflect.get(sharedModule, 'get');
  if (typeof sharedGetter !== 'function') {
    throw new Error('Expected generated shared module getter');
  }
  return {
    canonicalKeys: Object.keys(context),
    legacyImported: Reflect.get(requireObject(Reflect.get(legacyContainer, 'exposeMap')), 'App'),
    modernImported: Reflect.get(requireObject(Reflect.get(modernContainer, 'exposedModules')), './App'),
    sharedImported: Reflect.apply(sharedGetter, sharedModule, []),
  };
}

const implementations: readonly Implementation[] = [
  {
    name: 'runtime',
    execute(globalObject, moduleValue, sharedValue) {
      Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
      Reflect.deleteProperty(globalThis, '_graniteMicroFrontend');
      for (const key of Reflect.ownKeys(globalObject)) {
        Reflect.set(globalThis, key, Reflect.get(globalObject, key));
      }
      const container = createContainer('parity-app');
      exposeModule(container, './App', moduleValue);
      registerShared('react', sharedValue);
      return observe(globalThis);
    },
  },
  {
    name: 'generated string',
    execute(globalObject, moduleValue, sharedValue) {
      const config = getPreludeConfig({}, 'parity-app');
      vm.runInNewContext(
        [
          config.banner,
          config.preludeScript,
          'exposeModule(__container, "./App", moduleValue);',
          'registerShared("react", sharedValue);',
        ].join('\n'),
        { global: globalObject, moduleValue, sharedValue }
      );
      return observe(globalObject);
    },
  },
];

afterEach(() => {
  Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
  Reflect.deleteProperty(globalThis, '_graniteMicroFrontend');
});

describe.each(implementations)('$name generated-prelude parity', ({ execute }) => {
  it.each(scenarios)('supports canonical and unchanged legacy imports when $name', ({ createGlobal }) => {
    // Given
    const moduleValue = { route: 'parity' };
    const sharedValue = { version: '19' };

    // When
    const result = execute(createGlobal(), moduleValue, sharedValue);

    // Then
    expect(result.canonicalKeys).toEqual(['__INSTANCES__', '__SHARED__', '__CONTAINERS__']);
    expect(result.modernImported).toBe(moduleValue);
    expect(result.legacyImported).toBe(moduleValue);
    expect(result.sharedImported).toBe(sharedValue);
  });
});
