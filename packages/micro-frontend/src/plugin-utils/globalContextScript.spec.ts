import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { globalContextScript } from './globalContextScript';
import { getMicroFrontendGlobalContext } from '../runtime/globalContext';

type GlobalFixture = Record<string, unknown>;

type BootstrapImplementation = {
  readonly name: string;
  readonly bootstrap: (globalObject: GlobalFixture) => unknown;
};

const CANONICAL_KEY = '__MICRO_FRONTEND__';
const CANONICAL_KEYS = ['__INSTANCES__', '__SHARED__', '__CONTAINERS__'] as const;

const implementations: readonly BootstrapImplementation[] = [
  {
    name: 'runtime',
    bootstrap: (globalObject) => getMicroFrontendGlobalContext(globalObject),
  },
  {
    name: 'generated script',
    bootstrap(globalObject) {
      vm.runInNewContext(globalContextScript, { global: globalObject });
      return Reflect.get(globalObject, CANONICAL_KEY);
    },
  },
];

describe.each(implementations)('$name global-context bootstrap', ({ bootstrap }) => {
  it('creates the exact canonical registry shape from an empty global', () => {
    // Given
    const globalObject: GlobalFixture = {};

    // When
    const context = bootstrap(globalObject);

    // Then
    expect(Object.keys(context ?? {})).toEqual(CANONICAL_KEYS);
    expect(Object.keys(globalObject)).toEqual([CANONICAL_KEY]);
    expect(Reflect.get(globalObject, CANONICAL_KEY)).toBe(context);
  });

  it('adopts legacy stores while normalizing the canonical registry key order', () => {
    // Given
    const instances: unknown[] = [];
    const shared = {};
    const legacyContext = { __SHARED__: shared, __INSTANCES__: instances };
    const globalObject: GlobalFixture = { [CANONICAL_KEY]: legacyContext };

    // When
    const context = bootstrap(globalObject);

    // Then
    expect(Object.keys(context ?? {})).toEqual(CANONICAL_KEYS);
    expect(Reflect.get(context ?? {}, '__INSTANCES__')).toBe(instances);
    expect(Reflect.get(context ?? {}, '__SHARED__')).toBe(shared);
    expect(Object.keys(legacyContext)).toEqual(['__SHARED__', '__INSTANCES__']);
  });

  it('completes a canonical-order legacy context in place', () => {
    // Given
    const legacyContext = { __INSTANCES__: [], __SHARED__: {} };
    const globalObject: GlobalFixture = { [CANONICAL_KEY]: legacyContext };

    // When
    const context = bootstrap(globalObject);

    // Then
    expect(context).toBe(legacyContext);
    expect(Object.keys(context ?? {})).toEqual(CANONICAL_KEYS);
  });

  it('preserves a complete canonical context across repeated bootstrap', () => {
    // Given
    const canonicalContext = { __INSTANCES__: [], __SHARED__: {}, __CONTAINERS__: {} };
    const globalObject: GlobalFixture = { [CANONICAL_KEY]: canonicalContext };

    // When
    const firstContext = bootstrap(globalObject);
    const secondContext = bootstrap(globalObject);

    // Then
    expect(firstContext).toBe(canonicalContext);
    expect(secondContext).toBe(canonicalContext);
    expect(Object.keys(globalObject)).toEqual([CANONICAL_KEY]);
  });

  it('leaves a malformed canonical value untouched and succeeds after repair', () => {
    // Given
    const malformedContext = { __SHARED__: [] };
    const globalObject: GlobalFixture = { [CANONICAL_KEY]: malformedContext };

    // When
    const initialize = () => bootstrap(globalObject);

    // Then
    expect(initialize).toThrow('Cannot establish the micro-frontend global context: canonical-global-is-not-adoptable');
    expect(Reflect.get(globalObject, CANONICAL_KEY)).toBe(malformedContext);

    // When
    const repairedContext = { __INSTANCES__: [], __SHARED__: {} };
    Reflect.set(globalObject, CANONICAL_KEY, repairedContext);
    const context = initialize();

    // Then
    expect(context).toBe(repairedContext);
    expect(Object.keys(context ?? {})).toEqual(CANONICAL_KEYS);
  });

  it('rejects a locked legacy descriptor without mutating it', () => {
    // Given
    const legacyContext = { __SHARED__: {}, __INSTANCES__: [] };
    const globalObject: GlobalFixture = {};
    Object.defineProperty(globalObject, CANONICAL_KEY, {
      configurable: false,
      enumerable: true,
      value: legacyContext,
      writable: false,
    });

    // When
    const initialize = () => bootstrap(globalObject);

    // Then
    expect(initialize).toThrow('Cannot establish the micro-frontend global context: canonical-global-is-locked');
    expect(Reflect.get(globalObject, CANONICAL_KEY)).toBe(legacyContext);
    expect(Object.keys(legacyContext)).toEqual(['__SHARED__', '__INSTANCES__']);
  });

  it('rolls back a false canonical descriptor installation and then retries', () => {
    // Given
    const globalTarget: GlobalFixture = {};
    let rejectCanonical = true;
    const globalObject = new Proxy(globalTarget, {
      defineProperty(target, property, descriptor) {
        return property === CANONICAL_KEY && rejectCanonical
          ? false
          : Reflect.defineProperty(target, property, descriptor);
      },
    });

    // When
    const initialize = () => bootstrap(globalObject);

    // Then
    expect(initialize).toThrow('Cannot establish the micro-frontend global context: canonical-global-is-not-adoptable');
    expect(Object.keys(globalTarget)).toEqual([]);

    // When
    rejectCanonical = false;
    const context = initialize();

    // Then
    expect(Reflect.get(globalTarget, CANONICAL_KEY)).toBe(context);
    expect(Object.keys(globalTarget)).toEqual([CANONICAL_KEY]);
  });

  it('rolls back a canonical descriptor write that throws and then retries', () => {
    // Given
    const globalTarget: GlobalFixture = {};
    let interruptCanonical = true;
    const globalObject = new Proxy(globalTarget, {
      defineProperty(target, property, descriptor) {
        const result = Reflect.defineProperty(target, property, descriptor);
        if (property === CANONICAL_KEY && interruptCanonical) {
          interruptCanonical = false;
          throw new Error('canonical definition interrupted');
        }
        return result;
      },
    });

    // When
    const initialize = () => bootstrap(globalObject);

    // Then
    expect(initialize).toThrow('canonical definition interrupted');
    expect(Object.keys(globalTarget)).toEqual([]);

    // When
    const context = initialize();

    // Then
    expect(Reflect.get(globalTarget, CANONICAL_KEY)).toBe(context);
    expect(Object.keys(context ?? {})).toEqual(CANONICAL_KEYS);
  });
});
