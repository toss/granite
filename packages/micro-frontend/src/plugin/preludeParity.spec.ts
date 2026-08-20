import vm from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import { getPreludeConfig } from './prelude';
import { createContainer, exposeModule, importModule, registerShared, removeContainer } from '../runtime/registry';

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

type AtomicExposure = {
  readonly expose: () => void;
  readonly legacyModules: object;
  readonly modernModules: object;
};

type AtomicExposureImplementation = {
  readonly name: string;
  readonly setup: (globalObject: GlobalFixture, moduleValue: object) => AtomicExposure;
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

const atomicExposureImplementations: readonly AtomicExposureImplementation[] = [
  {
    name: 'runtime',
    setup(globalObject, moduleValue) {
      Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
      Reflect.deleteProperty(globalThis, '_graniteMicroFrontend');
      for (const key of Reflect.ownKeys(globalObject)) {
        Reflect.set(globalThis, key, Reflect.get(globalObject, key));
      }
      const container = createContainer('atomic-parity-app');
      const context = requireObject(Reflect.get(globalThis, '__MICRO_FRONTEND__'));
      const instances = requireObject(Reflect.get(context, '__INSTANCES__'));
      const legacyContainer = requireObject(Reflect.get(instances, Reflect.get(instances, 'atomic-parity-app')));
      const legacyModules = requireObject(Reflect.get(legacyContainer, 'exposeMap'));
      Object.preventExtensions(legacyModules);
      return {
        expose: () => exposeModule(container, './App', moduleValue),
        legacyModules,
        modernModules: container.exposedModules,
      };
    },
  },
  {
    name: 'generated string',
    setup(globalObject, moduleValue) {
      const config = getPreludeConfig({}, 'atomic-parity-app');
      vm.runInNewContext(
        [
          config.banner,
          config.preludeScript,
          'const __legacy = global.__MICRO_FRONTEND__.__INSTANCES__[0];',
          'Object.preventExtensions(__legacy.exposeMap);',
          'global.__exposeAtomicParity = function () { exposeModule(__container, "./App", moduleValue); };',
        ].join('\n'),
        { global: globalObject, moduleValue }
      );
      const context = requireObject(Reflect.get(globalObject, '__MICRO_FRONTEND__'));
      const instances = requireObject(Reflect.get(context, '__INSTANCES__'));
      const containers = requireObject(Reflect.get(context, '__CONTAINERS__'));
      const expose: unknown = Reflect.get(globalObject, '__exposeAtomicParity');
      if (typeof expose !== 'function') {
        throw new Error('Expected generated exposure function');
      }
      return {
        expose: () => Reflect.apply(expose, globalObject, []),
        legacyModules: requireObject(Reflect.get(requireObject(Reflect.get(instances, 0)), 'exposeMap')),
        modernModules: requireObject(
          Reflect.get(requireObject(Reflect.get(containers, 'atomic-parity-app')), 'exposedModules')
        ),
      };
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

describe.each(atomicExposureImplementations)('$name atomic-exposure parity', ({ setup }) => {
  it('rolls back both registry views when the legacy expose map rejects the definition', () => {
    // Given
    const exposure = setup({}, { route: 'atomic parity' });

    // When / Then
    expect(exposure.expose).toThrow();
    expect(Reflect.has(exposure.modernModules, './App')).toBe(false);
    expect(Reflect.has(exposure.legacyModules, 'App')).toBe(false);
  });
});

describe('generated-prelude runtime ownership', () => {
  it('imports a generated container through a separately bundled runtime', () => {
    // Given
    const moduleValue = { route: 'generated' };
    const config = getPreludeConfig({}, 'generated-app');
    vm.runInNewContext(
      [config.banner, config.preludeScript, 'exposeModule(__container, "./App", moduleValue);'].join('\n'),
      { global: globalThis, moduleValue }
    );

    // When
    const imported = importModule<typeof moduleValue>('generated-app/App');

    // Then
    expect(imported).toBe(moduleValue);
  });

  it('removes both generated registry paths before same-name registration', () => {
    // Given
    const config = getPreludeConfig({}, 'generated-reused-app');
    vm.runInNewContext(config.banner + '\n' + config.preludeScript, { global: globalThis });
    const originalContext = requireObject(Reflect.get(globalThis, '__MICRO_FRONTEND__'));
    const originalInstances = requireObject(Reflect.get(originalContext, '__INSTANCES__'));
    const originalContainers = requireObject(Reflect.get(originalContext, '__CONTAINERS__'));
    const originalModern = requireObject(Reflect.get(originalContainers, 'generated-reused-app'));
    const originalLegacy = requireObject(
      Reflect.get(originalInstances, Reflect.get(originalInstances, 'generated-reused-app'))
    );

    // When
    removeContainer('generated-reused-app');
    const replacement = createContainer('generated-reused-app');
    const context = requireObject(Reflect.get(globalThis, '__MICRO_FRONTEND__'));
    const instances = requireObject(Reflect.get(context, '__INSTANCES__'));
    const containers = requireObject(Reflect.get(context, '__CONTAINERS__'));

    // Then
    expect(replacement.appName).toBe('generated-reused-app');
    expect(Reflect.get(instances, 'length')).toBe(1);
    expect(Reflect.get(containers, 'generated-reused-app')).toBe(replacement);
    expect(Object.getOwnPropertySymbols(originalModern)).toEqual([]);
    expect(Object.getOwnPropertySymbols(originalLegacy)).toEqual([]);
  });

  it('keeps generated pairing metadata out of public enumerable shapes', () => {
    // Given
    const config = getPreludeConfig({}, 'generated-shaped-app');
    vm.runInNewContext(config.banner + '\n' + config.preludeScript, { global: globalThis });
    const context = requireObject(Reflect.get(globalThis, '__MICRO_FRONTEND__'));
    const instances = requireObject(Reflect.get(context, '__INSTANCES__'));
    const legacyIndex = Reflect.get(instances, 'generated-shaped-app');
    const containers = requireObject(Reflect.get(context, '__CONTAINERS__'));
    const modernContainer = Reflect.get(containers, 'generated-shaped-app');
    const legacyContainer = Reflect.get(instances, legacyIndex);

    // When
    const shapes = {
      modernJson: JSON.stringify(modernContainer),
      modernKeys: Object.keys(modernContainer),
      legacyJson: JSON.stringify(legacyContainer),
      legacyKeys: Object.keys(legacyContainer),
    };

    // Then
    expect(shapes).toEqual({
      modernJson: '{"appName":"generated-shaped-app","config":{},"exposedModules":{}}',
      modernKeys: ['appName', 'config', 'exposedModules'],
      legacyJson: '{"name":"generated-shaped-app","config":{},"exposeMap":{}}',
      legacyKeys: ['name', 'config', 'exposeMap'],
    });
  });
});
