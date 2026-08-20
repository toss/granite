import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createContainer,
  exposeModule,
  getContainer,
  getMicroFrontendRuntimeContext,
  importModule,
  removeContainer,
} from './registry';
import { createContainer as createLegacyContainer } from '../../../plugin-micro-frontend/src/runtime/createContainer';
import { exposeModule as exposeLegacyModule } from '../../../plugin-micro-frontend/src/runtime/exposeModule';
import {
  getContainer as getLegacyContainer,
  importRemoteModule as importLegacyModule,
} from '../../../plugin-micro-frontend/src/runtime/utils';

function clearMicroFrontendGlobals(): void {
  Reflect.deleteProperty(globalThis, '_graniteMicroFrontend');
  Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
}

describe('container registry', () => {
  beforeEach(() => {
    clearMicroFrontendGlobals();
    getMicroFrontendRuntimeContext();
  });
  afterEach(clearMicroFrontendGlobals);

  it('creates, exposes, imports, and removes a modern container', () => {
    // Given
    const exposedValue = { route: 'baseline' };
    const container = createContainer('baseline-app');
    exposeModule(container, 'App', exposedValue);

    // When
    const imported = importModule<typeof exposedValue>('baseline-app/App');

    // Then
    expect(imported).toBe(exposedValue);
    expect(container.appName).toBe('baseline-app');
    expect(container.exposedModules['./App']).toBe(exposedValue);

    // Given
    const exposedModules = container.exposedModules;

    // When
    removeContainer('baseline-app');

    // Then
    expect(exposedModules).toEqual({});
    expect(() => importModule('baseline-app/App')).toThrow();
  });

  it('makes a modern container importable through the unchanged legacy runtime', () => {
    // Given
    const exposedValue = { route: 'modern' };
    const modernContainer = createContainer('modern-app');
    exposeModule(modernContainer, './App', exposedValue);

    // When
    const legacyContainer = getLegacyContainer('modern-app');
    const imported = importLegacyModule('modern-app/App');

    // Then
    expect(legacyContainer?.name).toBe('modern-app');
    expect(imported).toBe(exposedValue);
    expect(Reflect.get(imported, '__esModule')).toBe(true);
    expect(Reflect.get(imported, 'default')).toBe(exposedValue);
  });

  it('imports a legacy-only container through the modern runtime with normalized module names', () => {
    // Given
    const exposedValue = { default: 'legacy' };
    const legacyContainer = createLegacyContainer('legacy-app', {});
    exposeLegacyModule(legacyContainer, './App', exposedValue);

    // When
    const withoutPrefix = importModule<typeof exposedValue>('legacy-app/App');
    const withPrefix = importModule<typeof exposedValue>('legacy-app/./App');

    // Then
    expect(withoutPrefix).toBe(exposedValue);
    expect(withPrefix).toBe(exposedValue);
    expect(getContainer('legacy-app')?.appName).toBe('legacy-app');
  });

  it('imports a module exposed later through the paired legacy view', () => {
    // Given
    const exposedValue = { default: 'late legacy exposure' };
    createContainer('paired-app');
    const legacyContainer = getLegacyContainer('paired-app');
    expect(legacyContainer).not.toBeNull();
    if (legacyContainer == null) {
      return;
    }
    exposeLegacyModule(legacyContainer, './App', exposedValue);

    // When
    const imported = importModule<typeof exposedValue>('paired-app/App');

    // Then
    expect(imported).toBe(exposedValue);
  });

  it('rejects independent canonical and legacy containers with the same name', () => {
    // Given
    const modernContainer = createContainer('conflicting-app');
    const containers = getMicroFrontendRuntimeContext().containers;
    removeContainer('conflicting-app');
    Reflect.set(containers, 'conflicting-app', modernContainer);
    createLegacyContainer('conflicting-app', {});

    // When
    const resolveConflict = () => getContainer('conflicting-app');

    // Then
    expect(resolveConflict).toThrow("App container 'conflicting-app' is already registered");
  });

  it('does not overwrite a malformed legacy name index', () => {
    // Given
    const instances = globalThis.__MICRO_FRONTEND__.__INSTANCES__;
    Reflect.defineProperty(instances, 'malformed-app', { configurable: true, value: 99 });

    // When
    const resolveMalformed = () => getContainer('malformed-app');
    const registerOverMalformed = () => createContainer('malformed-app');

    // Then
    expect(resolveMalformed()).toBeNull();
    expect(registerOverMalformed).toThrow("App container 'malformed-app' is already registered");
  });

  it('removes a middle modern container and rebuilds remaining mixed legacy indices', () => {
    // Given
    const first = createLegacyContainer('first-app', {});
    const middle = createContainer('middle-app');
    const last = createLegacyContainer('last-app', {});
    expect(globalThis.__MICRO_FRONTEND__.__INSTANCES__).toHaveLength(3);

    // When
    removeContainer('middle-app');
    const instances = globalThis.__MICRO_FRONTEND__.__INSTANCES__;

    // Then
    expect(instances).toEqual([first, last]);
    expect(Reflect.get(instances, 'first-app')).toBe(0);
    expect(Reflect.get(instances, 'middle-app')).toBeUndefined();
    expect(Reflect.get(instances, 'last-app')).toBe(1);
    expect(getLegacyContainer('first-app')).toBe(first);
    expect(getLegacyContainer('last-app')).toBe(last);
    expect(getContainer('middle-app')).toBeNull();
    expect(middle.exposedModules).toEqual({});
  });

  it('clears both paired module views and allows clean same-name re-registration', () => {
    // Given
    const exposedValue = { route: 'first' };
    const modernContainer = createContainer('reused-app');
    exposeModule(modernContainer, 'App', exposedValue);
    const legacyContainer = getLegacyContainer('reused-app');
    const legacyExposeMap = legacyContainer?.exposeMap;

    // When
    removeContainer('reused-app');
    const replacement = createContainer('reused-app');

    // Then
    expect(modernContainer.exposedModules).toEqual({});
    expect(legacyExposeMap).toEqual({});
    expect(replacement).not.toBe(modernContainer);
    expect(getLegacyContainer('reused-app')?.name).toBe('reused-app');
  });

  it('removes a legacy-only container with non-configurable getters and re-registers its name', () => {
    // Given
    const legacyContainer = createLegacyContainer('legacy-reused-app', {});
    exposeLegacyModule(legacyContainer, './App', { default: 'legacy value' });
    const modernView = getContainer('legacy-reused-app');

    // When
    removeContainer('legacy-reused-app');
    const replacement = createContainer('legacy-reused-app');

    // Then
    expect(legacyContainer.exposeMap).toEqual({});
    expect(modernView?.exposedModules).toEqual({});
    expect(replacement.appName).toBe('legacy-reused-app');
    expect(getLegacyContainer('legacy-reused-app')?.name).toBe('legacy-reused-app');
  });
});
