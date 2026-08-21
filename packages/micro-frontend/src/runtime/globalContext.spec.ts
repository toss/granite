import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { getMicroFrontendGlobalContext } from './globalContext';
import { getPreludeConfig } from '../../../plugin-micro-frontend/src/prelude';

const CANONICAL_GLOBAL_KEY = '__MICRO_FRONTEND__';

describe('getMicroFrontendGlobalContext', () => {
  it('installs only the canonical global', () => {
    // Given
    const globalObject = {};

    // When
    getMicroFrontendGlobalContext(globalObject);

    // Then
    expect(Object.keys(globalObject)).toEqual([CANONICAL_GLOBAL_KEY]);
  });

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

  it('adds only the container registry when a canonical-order legacy global loads first', () => {
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
    expect(Object.keys(globalObject)).toEqual([CANONICAL_GLOBAL_KEY]);
  });
});
