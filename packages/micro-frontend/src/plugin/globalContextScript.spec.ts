import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { globalContextScript } from './globalContextScript';
import { getMicroFrontendGlobalContext } from '../runtime/globalContext';

type GlobalFixture = Record<string, unknown>;

type BootstrapImplementation = {
  readonly name: string;
  readonly bootstrap: (globalObject: GlobalFixture) => unknown;
};

const implementations: readonly BootstrapImplementation[] = [
  {
    name: 'runtime',
    bootstrap: (globalObject) => getMicroFrontendGlobalContext(globalObject),
  },
  {
    name: 'generated script',
    bootstrap(globalObject) {
      vm.runInNewContext(globalContextScript, { global: globalObject });
      return Reflect.get(globalObject, '__MICRO_FRONTEND__');
    },
  },
];

const writeInterruptions = [
  {
    name: 'returns false',
    interrupt: () => false,
  },
  {
    name: 'throws after writing',
    interrupt(target: Record<PropertyKey, unknown>, property: PropertyKey, value: unknown) {
      Reflect.set(target, property, value);
      throw new Error('compatibility adoption interrupted');
    },
  },
] as const;

describe.each(implementations)('$name global-context bootstrap', ({ bootstrap }) => {
  it('creates the exact canonical registry shape from an empty global', () => {
    // Given
    const globalObject: GlobalFixture = {};

    // When
    const context = bootstrap(globalObject);

    // Then
    expect(Object.keys(context ?? {})).toEqual(['__INSTANCES__', '__SHARED__', '__CONTAINERS__']);
    expect(Reflect.get(globalObject, '__MICRO_FRONTEND__')).toBe(context);
    expect(Reflect.get(Reflect.get(globalObject, '_graniteMicroFrontend') ?? {}, 'sharedModules')).toBe(
      Reflect.get(context ?? {}, '__SHARED__')
    );
    expect(Reflect.get(Reflect.get(globalObject, '_graniteMicroFrontend') ?? {}, 'containers')).toBe(
      Reflect.get(context ?? {}, '__CONTAINERS__')
    );
  });

  it('adopts legacy stores while normalizing the canonical registry key order', () => {
    // Given
    const instances: unknown[] = [];
    const shared = {};
    const legacyContext = { __SHARED__: shared, __INSTANCES__: instances };
    const globalObject: GlobalFixture = { __MICRO_FRONTEND__: legacyContext };

    // When
    const context = bootstrap(globalObject);

    // Then
    expect(Object.keys(context ?? {})).toEqual(['__INSTANCES__', '__SHARED__', '__CONTAINERS__']);
    expect(Reflect.get(context ?? {}, '__INSTANCES__')).toBe(instances);
    expect(Reflect.get(context ?? {}, '__SHARED__')).toBe(shared);
    expect(Object.keys(legacyContext)).toEqual(['__SHARED__', '__INSTANCES__']);
  });

  it('leaves both globals untouched when duplicate shared entries conflict', () => {
    // Given
    const canonicalContext = { __SHARED__: { react: {} }, __INSTANCES__: [] };
    const compatibilityContext = { containers: {}, sharedModules: { react: {} } };
    const globalObject: GlobalFixture = {
      __MICRO_FRONTEND__: canonicalContext,
      _graniteMicroFrontend: compatibilityContext,
    };

    // When
    const initialize = () => bootstrap(globalObject);

    // Then
    expect(initialize).toThrow();
    expect(Reflect.get(globalObject, '__MICRO_FRONTEND__')).toBe(canonicalContext);
    expect(Reflect.get(globalObject, '_graniteMicroFrontend')).toBe(compatibilityContext);
    expect(Object.keys(canonicalContext)).toEqual(['__SHARED__', '__INSTANCES__']);
  });

  it('reuses the installed canonical and compatibility identities on repeated bootstrap', () => {
    // Given
    const globalObject: GlobalFixture = {};
    const firstContext = bootstrap(globalObject);
    const firstAdapter = Reflect.get(globalObject, '_graniteMicroFrontend');

    // When
    const secondContext = bootstrap(globalObject);

    // Then
    expect(secondContext).toBe(firstContext);
    expect(Reflect.get(globalObject, '_graniteMicroFrontend')).toBe(firstAdapter);
  });

  it('rejects a malformed canonical value without installing compatibility state', () => {
    // Given
    const malformedContext = { __SHARED__: [] };
    const globalObject: GlobalFixture = { __MICRO_FRONTEND__: malformedContext };

    // When
    const initialize = () => bootstrap(globalObject);

    // Then
    expect(initialize).toThrow();
    expect(Reflect.get(globalObject, '__MICRO_FRONTEND__')).toBe(malformedContext);
    expect(Reflect.has(globalObject, '_graniteMicroFrontend')).toBe(false);
  });

  it.each(writeInterruptions)(
    'rolls back multiple pending entries when the second compatibility write $name, then retries',
    ({ interrupt }) => {
      // Given
      const stableValue = {};
      const sharedTarget = { stable: stableValue };
      let shouldInterrupt = true;
      const shared = new Proxy(sharedTarget, {
        set(target, property, value) {
          return property === 'second' && shouldInterrupt
            ? interrupt(target, property, value)
            : Reflect.set(target, property, value);
        },
      });
      const firstValue = {};
      const secondValue = {};
      const compatibilityContext = {
        containers: {},
        sharedModules: { first: firstValue, second: secondValue },
      };
      const globalObject: GlobalFixture = {
        __MICRO_FRONTEND__: { __INSTANCES__: [], __SHARED__: shared, __CONTAINERS__: {} },
        _graniteMicroFrontend: compatibilityContext,
      };

      // When
      const initialize = () => bootstrap(globalObject);

      // Then
      expect(initialize).toThrow();
      expect(sharedTarget).toEqual({ stable: stableValue });
      expect(Reflect.get(globalObject, '_graniteMicroFrontend')).toBe(compatibilityContext);

      // When
      shouldInterrupt = false;
      const context = initialize();

      // Then
      expect(sharedTarget).toEqual({ stable: stableValue, first: firstValue, second: secondValue });
      expect(Reflect.get(globalObject, '_graniteMicroFrontend')).not.toBe(compatibilityContext);
      expect(Reflect.get(Reflect.get(globalObject, '_graniteMicroFrontend') ?? {}, 'sharedModules')).toBe(
        Reflect.get(context ?? {}, '__SHARED__')
      );
    }
  );
});
