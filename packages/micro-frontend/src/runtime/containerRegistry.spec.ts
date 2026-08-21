import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getMicroFrontendGlobalContext } from './globalContext';
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
    expect(imported).not.toBe(exposedValue);
    expect(Reflect.get(imported, '__esModule')).toBe(true);
    expect(Reflect.get(imported, 'default')).toBe(exposedValue);
    expect(Reflect.get(imported, 'route')).toBe('modern');
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

  it.each([
    ['unilateral', false],
    ['counterfeit', true],
  ])('rejects independent containers with a %s pair marker', (_name, markLegacy) => {
    // Given
    const appName = `${_name}-marker-app`;
    const pairSymbol = Symbol.for('granite.micro-frontend.container-pair');
    const modernContainer = { appName, config: {}, exposedModules: {} };
    const legacyContainer = { name: appName, config: {}, exposeMap: {} };
    const context = getMicroFrontendGlobalContext();
    Reflect.set(context.__CONTAINERS__, appName, modernContainer);
    context.__INSTANCES__.push(legacyContainer);
    Reflect.defineProperty(context.__INSTANCES__, appName, { configurable: true, value: 0 });
    Reflect.defineProperty(modernContainer, pairSymbol, {
      configurable: true,
      value: legacyContainer,
      writable: false,
    });
    if (markLegacy) {
      Reflect.defineProperty(legacyContainer, pairSymbol, {
        configurable: true,
        value: { appName },
        writable: false,
      });
    }

    // When
    const resolveConflict = () => getContainer(appName);

    // Then
    expect(resolveConflict).toThrow(`App container '${appName}' is already registered`);
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

  it('rolls back the legacy name index when the indexed array cannot grow', () => {
    // Given
    const context = globalThis.__MICRO_FRONTEND__;
    Reflect.defineProperty(context.__INSTANCES__, 'length', { writable: false });

    // When
    const registerContainer = () => createContainer('locked-length-app');

    // Then
    expect(registerContainer).toThrow();
    expect(Reflect.has(context.__INSTANCES__, 'locked-length-app')).toBe(false);
    expect(Reflect.has(getMicroFrontendRuntimeContext().containers, 'locked-length-app')).toBe(false);
  });

  it('rolls back every registry slot when the legacy name definition throws after writing', () => {
    // Given
    const context = globalThis.__MICRO_FRONTEND__;
    const instancesTarget: unknown[] = [];
    const instances = new Proxy(instancesTarget, {
      defineProperty(target, property, descriptor) {
        Reflect.defineProperty(target, property, descriptor);
        throw new Error('legacy name definition interrupted');
      },
    });
    Reflect.set(context, '__INSTANCES__', instances);

    // When
    const registerContainer = () => createContainer('throwing-name-app');

    // Then
    expect(registerContainer).toThrow('legacy name definition interrupted');
    expect(Reflect.has(instancesTarget, 'throwing-name-app')).toBe(false);
    expect(instancesTarget).toHaveLength(0);
    expect(Reflect.has(getMicroFrontendRuntimeContext().containers, 'throwing-name-app')).toBe(false);
  });

  it('rejects a false legacy name definition without returning a partial container, then retries', () => {
    // Given
    const context = globalThis.__MICRO_FRONTEND__;
    const instancesTarget: unknown[] = [];
    let rejectName = true;
    const instances = new Proxy(instancesTarget, {
      defineProperty(target, property, descriptor) {
        return property === 'false-name-app' && rejectName
          ? false
          : Reflect.defineProperty(target, property, descriptor);
      },
    });
    Reflect.set(context, '__INSTANCES__', instances);

    // When
    const registerContainer = () => createContainer('false-name-app');

    // Then
    expect(registerContainer).toThrow('Cannot establish the micro-frontend global context: registry-is-not-extensible');
    expect(Reflect.has(instancesTarget, 'false-name-app')).toBe(false);
    expect(instancesTarget).toHaveLength(0);
    expect(Reflect.has(getMicroFrontendRuntimeContext().containers, 'false-name-app')).toBe(false);

    // When
    rejectName = false;
    const container = registerContainer();

    // Then
    expect(container.appName).toBe('false-name-app');
    expect(Reflect.get(instancesTarget, 'false-name-app')).toBe(0);
    expect(instancesTarget).toHaveLength(1);
    expect(Reflect.get(getMicroFrontendRuntimeContext().containers, 'false-name-app')).toBe(container);
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

  it('drops runtime ownership of a legacy-only container with externally captured non-configurable getters', () => {
    // Given
    const legacyContainer = createLegacyContainer('legacy-reused-app', {});
    exposeLegacyModule(legacyContainer, './App', { default: 'legacy value' });
    const originalExposeMap = legacyContainer.exposeMap;
    const originalDescriptor = Object.getOwnPropertyDescriptor(originalExposeMap, 'App');
    const modernView = getContainer('legacy-reused-app');

    // When
    removeContainer('legacy-reused-app');
    const replacement = createContainer('legacy-reused-app');

    // Then
    expect(legacyContainer.exposeMap).toEqual({});
    expect(modernView?.exposedModules).toEqual({});
    expect(originalDescriptor?.configurable).toBe(false);
    expect(originalExposeMap['App']).toEqual({ default: 'legacy value' });
    expect(() => importModule('legacy-reused-app/App')).toThrow();
    expect(() => importLegacyModule('legacy-reused-app/App')).toThrow();
    expect(replacement.appName).toBe('legacy-reused-app');
    expect(getLegacyContainer('legacy-reused-app')?.name).toBe('legacy-reused-app');
  });
});
