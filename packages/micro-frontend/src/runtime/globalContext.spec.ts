import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { getMicroFrontendGlobalContext, MicroFrontendGlobalContextCompatibilityError } from './globalContext';
import { getPreludeConfig } from '../../../plugin-micro-frontend/src/prelude';

const CANONICAL_GLOBAL_KEY = '__MICRO_FRONTEND__';
const COMPATIBILITY_GLOBAL_KEY = '_graniteMicroFrontend';

describe('getMicroFrontendGlobalContext', () => {
  it('normalizes the real legacy banner field order while adopting its stores', () => {
    // Given
    const sandbox = { global: {} };
    vm.runInNewContext(getPreludeConfig({ name: 'legacy-app' }).banner, sandbox);
    const legacyContext = Reflect.get(sandbox.global, CANONICAL_GLOBAL_KEY);
    const instances = Reflect.get(legacyContext, '__INSTANCES__');
    const shared = Reflect.get(legacyContext, '__SHARED__');

    // When
    const context = getMicroFrontendGlobalContext(sandbox.global);

    // Then
    expect(Object.keys(context)).toEqual(['__INSTANCES__', '__SHARED__', '__CONTAINERS__']);
    expect(context.__INSTANCES__).toBe(instances);
    expect(context.__SHARED__).toBe(shared);
    expect(Reflect.get(sandbox.global, CANONICAL_GLOBAL_KEY)).toBe(context);
    expect(Object.keys(legacyContext)).toEqual(['__SHARED__', '__INSTANCES__']);
  });

  it('adopts legacy stores and adds only the canonical container field when legacy loads first', () => {
    // Given
    const instances: unknown[] = [];
    const shared = {};
    const legacyContext = { __INSTANCES__: instances, __SHARED__: shared };
    const globalObject = { [CANONICAL_GLOBAL_KEY]: legacyContext };

    // When
    const context = getMicroFrontendGlobalContext(globalObject);

    // Then
    expect(context).toBe(legacyContext);
    expect(Object.keys(context)).toEqual(['__INSTANCES__', '__SHARED__', '__CONTAINERS__']);
    expect(context.__INSTANCES__).toBe(instances);
    expect(context.__SHARED__).toBe(shared);
    expect(Reflect.get(Reflect.get(globalObject, COMPATIBILITY_GLOBAL_KEY), 'containers')).toBe(context.__CONTAINERS__);
    expect(Reflect.get(Reflect.get(globalObject, COMPATIBILITY_GLOBAL_KEY), 'sharedModules')).toBe(shared);
  });

  it('adopts current stores into the canonical owner when current new code loads first', () => {
    // Given
    const containers = {};
    const sharedModules = {};
    const currentContext = { containers, sharedModules };
    const globalObject = { [COMPATIBILITY_GLOBAL_KEY]: currentContext };

    // When
    const context = getMicroFrontendGlobalContext(globalObject);

    // Then
    expect(Object.keys(context)).toEqual(['__INSTANCES__', '__SHARED__', '__CONTAINERS__']);
    expect(context.__SHARED__).toBe(sharedModules);
    expect(context.__CONTAINERS__).toBe(containers);
    expect(Reflect.get(globalObject, COMPATIBILITY_GLOBAL_KEY)).toBe(currentContext);
  });

  it('preserves a complete canonical owner when canonical code loads first', () => {
    // Given
    const canonicalContext = {
      __INSTANCES__: [],
      __SHARED__: {},
      __CONTAINERS__: {},
    };
    const globalObject = { [CANONICAL_GLOBAL_KEY]: canonicalContext };

    // When
    const context = getMicroFrontendGlobalContext(globalObject);

    // Then
    expect(context).toBe(canonicalContext);
    expect(Object.keys(context)).toEqual(['__INSTANCES__', '__SHARED__', '__CONTAINERS__']);
    expect(Reflect.get(Reflect.get(globalObject, COMPATIBILITY_GLOBAL_KEY), 'containers')).toBe(
      canonicalContext.__CONTAINERS__
    );
    expect(Reflect.get(Reflect.get(globalObject, COMPATIBILITY_GLOBAL_KEY), 'sharedModules')).toBe(
      canonicalContext.__SHARED__
    );
  });

  it('keeps one adapter and accepts its self-assignment', () => {
    // Given
    const globalObject = {};
    getMicroFrontendGlobalContext(globalObject);
    const adapter = Reflect.get(globalObject, COMPATIBILITY_GLOBAL_KEY);

    // When
    const didAssign = Reflect.set(globalObject, COMPATIBILITY_GLOBAL_KEY, adapter);
    const context = getMicroFrontendGlobalContext(globalObject);

    // Then
    expect(didAssign).toBe(true);
    expect(Reflect.get(globalObject, COMPATIBILITY_GLOBAL_KEY)).toBe(adapter);
    expect(Reflect.get(adapter, 'containers')).toBe(context.__CONTAINERS__);
    expect(Reflect.get(adapter, 'sharedModules')).toBe(context.__SHARED__);
  });

  it('rejects a non-writable current global without creating canonical state', () => {
    // Given
    const globalObject = {};
    Object.defineProperty(globalObject, COMPATIBILITY_GLOBAL_KEY, {
      configurable: false,
      enumerable: true,
      value: { containers: {}, sharedModules: {} },
      writable: false,
    });

    // When
    const initialize = () => getMicroFrontendGlobalContext(globalObject);

    // Then
    expect(initialize).toThrow(MicroFrontendGlobalContextCompatibilityError);
    expect(Reflect.has(globalObject, CANONICAL_GLOBAL_KEY)).toBe(false);
  });

  it('rejects different duplicate shared entries without completing either state', () => {
    // Given
    const canonicalSharedValue = {};
    const currentSharedValue = {};
    const canonicalContext = {
      __SHARED__: { react: canonicalSharedValue },
      __INSTANCES__: [],
    };
    const currentContext = {
      containers: {},
      sharedModules: { react: currentSharedValue },
    };
    const globalObject = {
      [CANONICAL_GLOBAL_KEY]: canonicalContext,
      [COMPATIBILITY_GLOBAL_KEY]: currentContext,
    };

    // When
    const initialize = () => getMicroFrontendGlobalContext(globalObject);

    // Then
    expect(initialize).toThrow(MicroFrontendGlobalContextCompatibilityError);
    expect(Reflect.get(globalObject, CANONICAL_GLOBAL_KEY)).toBe(canonicalContext);
    expect(Reflect.get(globalObject, COMPATIBILITY_GLOBAL_KEY)).toBe(currentContext);
    expect(Object.keys(canonicalContext)).toEqual(['__SHARED__', '__INSTANCES__']);
    expect(canonicalContext.__SHARED__.react).toBe(canonicalSharedValue);
    expect(currentContext.sharedModules.react).toBe(currentSharedValue);
  });

  it('rejects a false compatibility write and removes an earlier entry added by the attempt', () => {
    // Given
    const stableValue = {};
    const sharedTarget = { stable: stableValue };
    const shared = new Proxy(sharedTarget, {
      set(target, property, value) {
        return property === 'second' ? false : Reflect.set(target, property, value);
      },
    });
    const compatibilityContext = { containers: {}, sharedModules: { first: {}, second: {} } };
    const globalObject = {
      [CANONICAL_GLOBAL_KEY]: { __INSTANCES__: [], __SHARED__: shared, __CONTAINERS__: {} },
      [COMPATIBILITY_GLOBAL_KEY]: compatibilityContext,
    };

    // When
    const initialize = () => getMicroFrontendGlobalContext(globalObject);

    // Then
    expect(initialize).toThrow(MicroFrontendGlobalContextCompatibilityError);
    expect(sharedTarget).toEqual({ stable: stableValue });
    expect(Reflect.get(globalObject, COMPATIBILITY_GLOBAL_KEY)).toBe(compatibilityContext);
  });
});
