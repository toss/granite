import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { getPreludeConfig } from './prelude';

function requireObject(value: unknown): object {
  if (typeof value !== 'object' || value == null) {
    throw new Error('Expected generated container object');
  }
  return value;
}

describe('getPreludeConfig', () => {
  it('registers the Granite app container and exposed modules directly in the prelude', () => {
    // Given
    const options = {
      exposes: {
        './App': './src/_app.tsx',
      },
      shared: {
        react: { eager: true },
        'react-native': { eager: true },
      },
    } as const;

    // When
    const config = getPreludeConfig(options);

    // Then
    expect(config.preludeScript).not.toContain('@granite-js/micro-frontend');
    expect(config.preludeScript).toContain('global.__MICRO_FRONTEND__.__CONTAINERS__');
    expect(config.preludeScript).toContain('createContainer(global.__granite.app.name');
    expect(config.preludeScript).toContain('exposeModule(__container, "./App", __expose0)');
    expect(config.banner).toContain('global._graniteMicroFrontend');
    expect(config.banner).toContain('function dispose(appName, callback)');
    expect(config.banner).toContain('disposeCallbacksByApp');
  });

  it('creates a container without importing a private runtime entry', () => {
    // When
    const config = getPreludeConfig({});

    // Then
    expect(config.preludeScript).not.toContain('import { createContainer');
    expect(config.preludeScript).toContain('global.__MICRO_FRONTEND__.__CONTAINERS__');
  });

  it('embeds the remote app name instead of reading the host global at evaluation time', () => {
    // When
    const config = getPreludeConfig({}, 'app-1');

    // Then
    expect(config.preludeScript).toContain('createContainer("app-1"');
    expect(config.preludeScript).not.toContain('global.__granite.app.name');
  });

  it.each([
    ['empty', {}],
    ['legacy-first', { __MICRO_FRONTEND__: { __SHARED__: {}, __INSTANCES__: [] } }],
  ])('registers one hybrid container from a %s global', (_name, globalObject) => {
    // Given
    const exposedValue = { default: 'remote app' };
    const config = getPreludeConfig({}, 'remote-app');

    // When
    vm.runInNewContext(
      [
        config.banner,
        config.preludeScript,
        'exposeModule(__container, "./App", exposedValue);',
        'registerShared("react", sharedValue);',
      ].join('\n'),
      { exposedValue, global: globalObject, sharedValue: { version: '19' } }
    );
    const context = Reflect.get(globalObject, '__MICRO_FRONTEND__');
    const instances = Reflect.get(context, '__INSTANCES__');
    const legacyIndex = Reflect.get(instances, 'remote-app');
    const legacyContainer = Reflect.get(instances, legacyIndex);
    const modernContainer = Reflect.get(Reflect.get(context, '__CONTAINERS__'), 'remote-app');

    // Then
    expect(Object.keys(context)).toEqual(['__INSTANCES__', '__SHARED__', '__CONTAINERS__']);
    expect(Reflect.get(modernContainer, 'appName')).toBe('remote-app');
    expect(Reflect.get(Reflect.get(modernContainer, 'exposedModules'), './App')).toBe(exposedValue);
    expect(Reflect.get(legacyContainer, 'name')).toBe('remote-app');
    const legacyModule = Reflect.get(Reflect.get(legacyContainer, 'exposeMap'), 'App');
    expect(Reflect.get(legacyModule, '__esModule')).toBe(true);
    expect(Reflect.get(legacyModule, 'default')).toBe('remote app');
    expect(Reflect.get(Reflect.get(context, '__SHARED__'), 'react')).toMatchObject({ loaded: true });
  });

  it('rejects a legacy name conflict without installing a canonical container', () => {
    // Given
    const legacyContainer = { name: 'remote-app', config: {}, exposeMap: {} };
    const instances = [legacyContainer];
    Reflect.defineProperty(instances, 'remote-app', { configurable: true, value: 0 });
    const globalObject = { __MICRO_FRONTEND__: { __INSTANCES__: instances, __SHARED__: {} } };
    const config = getPreludeConfig({}, 'remote-app');

    // When
    const evaluate = () =>
      vm.runInNewContext([config.banner, config.preludeScript].join('\n'), { global: globalObject });

    // Then
    expect(evaluate).toThrow("App container 'remote-app' is already registered");
    expect(instances).toHaveLength(1);
    expect(Reflect.get(instances, 'remote-app')).toBe(0);
    expect(Reflect.has(Reflect.get(globalObject.__MICRO_FRONTEND__, '__CONTAINERS__'), 'remote-app')).toBe(false);
  });

  it('rolls back the generated legacy name when container evaluation is interrupted', () => {
    // Given
    const instances: unknown[] = [];
    Reflect.defineProperty(instances, 'length', { writable: false });
    const globalObject = { __MICRO_FRONTEND__: { __INSTANCES__: instances, __SHARED__: {} } };
    const config = getPreludeConfig({}, 'interrupted-app');

    // When
    const evaluate = () =>
      vm.runInNewContext([config.banner, config.preludeScript].join('\n'), { global: globalObject });

    // Then
    expect(evaluate).toThrow();
    expect(Reflect.has(instances, 'interrupted-app')).toBe(false);
    expect(Reflect.has(Reflect.get(globalObject.__MICRO_FRONTEND__, '__CONTAINERS__'), 'interrupted-app')).toBe(false);
  });

  it('rolls back generated registry slots when the legacy name definition throws after writing', () => {
    // Given
    const instancesTarget: unknown[] = [];
    const instances = new Proxy(instancesTarget, {
      defineProperty(target, property, descriptor) {
        Reflect.defineProperty(target, property, descriptor);
        throw new Error('generated legacy name definition interrupted');
      },
    });
    const globalObject = {
      __MICRO_FRONTEND__: { __INSTANCES__: instances, __SHARED__: {}, __CONTAINERS__: {} },
    };
    const config = getPreludeConfig({}, 'throwing-name-app');

    // When
    const evaluate = () => vm.runInNewContext(config.banner + '\n' + config.preludeScript, { global: globalObject });

    // Then
    expect(evaluate).toThrow('generated legacy name definition interrupted');
    expect(Reflect.has(instancesTarget, 'throwing-name-app')).toBe(false);
    expect(instancesTarget).toHaveLength(0);
    expect(Reflect.has(globalObject.__MICRO_FRONTEND__.__CONTAINERS__, 'throwing-name-app')).toBe(false);
  });

  it('rolls back both container stores when canonical registration throws after writing', () => {
    // Given
    const containerTarget = {};
    const containers = new Proxy(containerTarget, {
      set(target, property, value) {
        Reflect.set(target, property, value);
        throw new Error('canonical registration interrupted');
      },
    });
    const instances: unknown[] = [];
    const globalObject = {
      __MICRO_FRONTEND__: { __INSTANCES__: instances, __SHARED__: {}, __CONTAINERS__: containers },
    };
    const config = getPreludeConfig({}, 'throwing-set-app');

    // When
    const evaluate = () =>
      vm.runInNewContext([config.banner, config.preludeScript].join('\n'), { global: globalObject });

    // Then
    expect(evaluate).toThrow('canonical registration interrupted');
    expect(instances).toHaveLength(0);
    expect(Reflect.has(instances, 'throwing-set-app')).toBe(false);
    expect(Reflect.has(containerTarget, 'throwing-set-app')).toBe(false);
  });

  it('rolls back both pair markers when the second marker definition is interrupted', () => {
    // Given
    let modernValue: unknown;
    let legacyValue: unknown;
    let pairDefinitions = 0;
    const containers = new Proxy(
      {},
      {
        set(target, property, value) {
          modernValue = value;
          return Reflect.set(target, property, value);
        },
      }
    );
    const instances = new Proxy<unknown[]>([], {
      set(target, property, value) {
        if (property === '0') {
          legacyValue = value;
        }
        return Reflect.set(target, property, value);
      },
    });
    const interruptedReflect = {
      defineProperty(target: object, property: PropertyKey, descriptor: PropertyDescriptor) {
        const result = Reflect.defineProperty(target, property, descriptor);
        if (typeof property === 'symbol' && ++pairDefinitions === 2) {
          throw new Error('pair definition interrupted');
        }
        return result;
      },
      deleteProperty: Reflect.deleteProperty,
      has: Reflect.has,
      set: Reflect.set,
    };
    const globalObject = {
      __MICRO_FRONTEND__: { __INSTANCES__: instances, __SHARED__: {}, __CONTAINERS__: containers },
    };
    const config = getPreludeConfig({}, 'interrupted-pair-app');

    // When
    const evaluate = () =>
      vm.runInNewContext(config.banner + '\n' + config.preludeScript, {
        global: globalObject,
        Reflect: interruptedReflect,
      });

    // Then
    expect(evaluate).toThrow('pair definition interrupted');
    expect(Object.getOwnPropertySymbols(requireObject(modernValue))).toEqual([]);
    expect(Object.getOwnPropertySymbols(requireObject(legacyValue))).toEqual([]);
    expect(instances).toHaveLength(0);
    expect(Reflect.has(containers, 'interrupted-pair-app')).toBe(false);
  });

  it('rolls back the modern exposure when the legacy expose map is non-extensible', () => {
    // Given
    const moduleValue = { default: 'interrupted exposure' };
    const globalObject = {};
    const config = getPreludeConfig({}, 'locked-expose-app');
    const expose = [
      config.banner,
      config.preludeScript,
      'const __legacy = global.__MICRO_FRONTEND__.__INSTANCES__[0];',
      'Object.preventExtensions(__legacy.exposeMap);',
      'exposeModule(__container, "./App", moduleValue);',
    ].join('\n');

    // When
    const evaluate = () => vm.runInNewContext(expose, { global: globalObject, moduleValue });

    // Then
    expect(evaluate).toThrow();
    const context = Reflect.get(globalObject, '__MICRO_FRONTEND__');
    const modernContainer = Reflect.get(Reflect.get(context, '__CONTAINERS__'), 'locked-expose-app');
    const legacyContainer = Reflect.get(Reflect.get(context, '__INSTANCES__'), 0);
    expect(Reflect.has(Reflect.get(modernContainer, 'exposedModules'), './App')).toBe(false);
    expect(Reflect.has(Reflect.get(legacyContainer, 'exposeMap'), 'App')).toBe(false);
  });

  it('rolls back both exposure descriptors when legacy definition throws after writing', () => {
    // Given
    const legacyExposeTarget = {};
    const throwingExposeMap = new Proxy(legacyExposeTarget, {
      defineProperty(target, property, descriptor) {
        Reflect.defineProperty(target, property, descriptor);
        throw new Error('legacy exposure interrupted');
      },
    });
    const moduleValue = { default: 'partially exposed' };
    const globalObject = {};
    const config = getPreludeConfig({}, 'throwing-expose-app');
    const expose = [
      config.banner,
      config.preludeScript,
      'const __legacy = global.__MICRO_FRONTEND__.__INSTANCES__[0];',
      '__legacy.exposeMap = throwingExposeMap;',
      'exposeModule(__container, "./App", moduleValue);',
    ].join('\n');

    // When
    const evaluate = () => vm.runInNewContext(expose, { global: globalObject, moduleValue, throwingExposeMap });

    // Then
    expect(evaluate).toThrow('legacy exposure interrupted');
    const context = Reflect.get(globalObject, '__MICRO_FRONTEND__');
    const modernContainer = Reflect.get(Reflect.get(context, '__CONTAINERS__'), 'throwing-expose-app');
    expect(Reflect.has(Reflect.get(modernContainer, 'exposedModules'), './App')).toBe(false);
    expect(Reflect.has(legacyExposeTarget, 'App')).toBe(false);
  });
});
