import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getMicroFrontendGlobalContext } from './globalContext';
import { createContainer, exposeModule, getMicroFrontendRuntimeContext } from './registry';

function clearMicroFrontendGlobals(): void {
  Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
}

function getLegacyExposeMap(appName: string): object {
  const context = getMicroFrontendGlobalContext();
  const index: unknown = Reflect.get(context.__INSTANCES__, appName);
  if (typeof index !== 'number') {
    throw new Error('Expected paired legacy container index');
  }
  const container: unknown = context.__INSTANCES__[index];
  if (typeof container !== 'object' || container == null) {
    throw new Error('Expected paired legacy container');
  }
  const exposeMap: unknown = Reflect.get(container, 'exposeMap');
  if (typeof exposeMap !== 'object' || exposeMap == null) {
    throw new Error('Expected paired legacy expose map');
  }
  return exposeMap;
}

describe('container module exposure', () => {
  beforeEach(() => {
    clearMicroFrontendGlobals();
    getMicroFrontendRuntimeContext();
  });
  afterEach(clearMicroFrontendGlobals);

  it('preserves the original paired module when a duplicate exposure is rejected', () => {
    // Given
    const originalModule = { route: 'original' };
    const container = createContainer('duplicate-module-app');
    exposeModule(container, './App', originalModule);

    // When
    const exposeDuplicate = () => exposeModule(container, 'App', { route: 'duplicate' });

    // Then
    expect(exposeDuplicate).toThrow(
      "Exposed module './App' is already registered in app container 'duplicate-module-app'"
    );
    expect(container.exposedModules['./App']).toBe(originalModule);
    expect(Reflect.get(Reflect.get(getLegacyExposeMap('duplicate-module-app'), 'App'), 'default')).toBe(originalModule);
  });

  it('rolls back the modern exposure when the legacy expose map is non-extensible', () => {
    // Given
    const container = createContainer('locked-expose-app');
    const legacyExposeMap = getLegacyExposeMap('locked-expose-app');
    Object.preventExtensions(legacyExposeMap);

    // When
    const expose = () => exposeModule(container, './App', { route: 'locked' });

    // Then
    expect(expose).toThrow('Cannot establish the micro-frontend global context: registry-is-not-extensible');
    expect(Reflect.has(container.exposedModules, './App')).toBe(false);
    expect(Reflect.has(legacyExposeMap, 'App')).toBe(false);
  });

  it('rolls back both exposure descriptors when the legacy definition throws after writing', () => {
    // Given
    const container = createContainer('throwing-expose-app');
    const legacyContainerIndex = Reflect.get(getMicroFrontendGlobalContext().__INSTANCES__, 'throwing-expose-app');
    if (typeof legacyContainerIndex !== 'number') {
      throw new Error('Expected paired legacy container index');
    }
    const legacyContainer: unknown = getMicroFrontendGlobalContext().__INSTANCES__[legacyContainerIndex];
    if (typeof legacyContainer !== 'object' || legacyContainer == null) {
      throw new Error('Expected paired legacy container');
    }
    const legacyExposeTarget: Record<string, unknown> = {};
    const throwingExposeMap = new Proxy(legacyExposeTarget, {
      defineProperty(target, property, descriptor) {
        Reflect.defineProperty(target, property, descriptor);
        throw new Error('legacy exposure interrupted');
      },
    });
    Reflect.set(legacyContainer, 'exposeMap', throwingExposeMap);

    // When
    const expose = () => exposeModule(container, './App', { route: 'partial' });

    // Then
    expect(expose).toThrow('legacy exposure interrupted');
    expect(Reflect.has(container.exposedModules, './App')).toBe(false);
    expect(Reflect.has(legacyExposeTarget, 'App')).toBe(false);
  });

  it('exposes a frozen namespace through an immutable legacy ESM facade', () => {
    // Given
    let route = 'initial';
    const module = Object.freeze(
      Object.defineProperty({}, 'route', {
        enumerable: true,
        get: () => route,
      })
    );
    const originalDescriptors = Object.getOwnPropertyDescriptors(module);
    const container = createContainer('frozen-namespace-app');

    // When
    exposeModule(container, './App', module);
    const legacyModule = Reflect.get(getLegacyExposeMap('frozen-namespace-app'), 'App');
    route = 'updated';

    // Then
    expect(container.exposedModules['./App']).toBe(module);
    expect(legacyModule).not.toBe(module);
    expect(Reflect.get(legacyModule, '__esModule')).toBe(true);
    expect(Reflect.get(legacyModule, 'default')).toBe(module);
    expect(Reflect.get(legacyModule, 'route')).toBe('updated');
    expect(Object.getOwnPropertyDescriptors(module)).toEqual(originalDescriptors);
    expect(Object.isFrozen(module)).toBe(true);
  });

  it('keeps a frozen callable callable through the immutable legacy ESM facade', () => {
    // Given
    let version = '1';
    const module = Object.freeze(
      Object.defineProperty(
        function (this: { readonly prefix: string }, value: string): string {
          return `${this.prefix}${value}`;
        },
        'version',
        { enumerable: true, get: () => version }
      )
    );
    const originalDescriptors = Object.getOwnPropertyDescriptors(module);
    const container = createContainer('frozen-callable-app');

    // When
    exposeModule(container, './App', module);
    const legacyModule = Reflect.get(getLegacyExposeMap('frozen-callable-app'), 'App');
    version = '2';

    // Then
    expect(container.exposedModules['./App']).toBe(module);
    expect(typeof legacyModule).toBe('function');
    expect(Reflect.apply(legacyModule, { prefix: 'legacy:' }, ['value'])).toBe('legacy:value');
    expect(Reflect.get(legacyModule, 'version')).toBe('2');
    expect(Reflect.get(legacyModule, 'default')).toBe(module);
    expect(Object.getOwnPropertyDescriptors(module)).toEqual(originalDescriptors);
    expect(Object.isFrozen(module)).toBe(true);
  });

  it('publishes neither registry entry when immutable facade construction fails', () => {
    // Given
    const container = createContainer('failed-facade-app');
    const legacyExposeMap = getLegacyExposeMap('failed-facade-app');
    const module = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('legacy facade construction failed');
        },
      }
    );

    // When
    const expose = () => exposeModule(container, './App', module);

    // Then
    expect(expose).toThrow('legacy facade construction failed');
    expect(Reflect.has(container.exposedModules, './App')).toBe(false);
    expect(Reflect.has(legacyExposeMap, 'App')).toBe(false);
  });
});
