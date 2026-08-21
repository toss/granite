import vm from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createContainer,
  disposeAppResources,
  exposeModule,
  getMicroFrontendRuntimeContext,
  hasContainer,
  registerShared,
  removeContainer,
} from './registry';
import { virtualSharedConfig } from '../../../plugin-micro-frontend/src/resolver';

type SharedModuleEntry = {
  readonly get: () => unknown;
  readonly loaded: boolean;
};

function clearMicroFrontendGlobals(): void {
  Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
}

function installLegacySharedRegistry(shared: Record<string, SharedModuleEntry>): void {
  Reflect.defineProperty(globalThis, '__MICRO_FRONTEND__', {
    configurable: true,
    enumerable: true,
    value: { __INSTANCES__: [], __SHARED__: shared },
    writable: true,
  });
}

async function getLegacyResolverContents(moduleName: string): Promise<string> {
  const config = virtualSharedConfig([[moduleName, {}]]);
  const load = config.protocols?.['virtual-shared']?.load;
  if (load == null) {
    throw new Error('Legacy shared resolver did not provide a loader');
  }
  const result = await load({
    path: moduleName,
    namespace: 'virtual-shared',
    suffix: '',
    pluginData: undefined,
    with: {},
  });
  const contents = result.contents;
  if (typeof contents !== 'string') {
    throw new Error('Legacy shared resolver did not generate executable JavaScript');
  }
  return contents;
}

describe('micro-frontend module registry', () => {
  beforeEach(() => {
    clearMicroFrontendGlobals();
  });

  afterEach(() => {
    clearMicroFrontendGlobals();
  });

  it('registers a shared module as an eagerly loaded entry and accepts its duplicate value', () => {
    // Given
    const sharedModule = { default: 'default export', named: 'named export' };

    // When
    registerShared('shared-module', sharedModule);
    registerShared('shared-module', sharedModule);

    // Then
    const entry = getMicroFrontendRuntimeContext().sharedModules['shared-module'];
    expect(entry?.loaded).toBe(true);
    expect(entry?.get()).toBe(sharedModule);
  });

  it('rejects a different value registered under an existing shared module name', () => {
    // Given
    registerShared('shared-module', { default: 'first value' });

    // When
    const registerDifferentValue = () => registerShared('shared-module', { default: 'second value' });

    // Then
    expect(registerDifferentValue).toThrow("Shared module 'shared-module' is already registered");
  });

  it('reads an entry written by the legacy registry through the new runtime registry', () => {
    // Given
    const sharedModule = { default: 'legacy default export', named: 'legacy named export' };
    const legacyEntry: SharedModuleEntry = { get: () => sharedModule, loaded: true };
    installLegacySharedRegistry({ 'legacy-shared-module': legacyEntry });

    // When
    const entry = getMicroFrontendRuntimeContext().sharedModules['legacy-shared-module'];

    // Then
    expect(entry).toBe(legacyEntry);
    expect(entry?.get()).toBe(sharedModule);
  });

  it('makes a new runtime registration consumable by the unchanged legacy generated resolver', async () => {
    // Given
    const sharedModule = { default: 'new default export', named: 'new named export' };
    installLegacySharedRegistry({});
    registerShared('new-shared-module', sharedModule);
    const legacyModule = { exports: undefined };

    // When
    vm.runInNewContext(await getLegacyResolverContents('new-shared-module'), {
      global: globalThis,
      module: legacyModule,
    });

    // Then
    expect(legacyModule.exports).toBe(sharedModule);
  });

  it('clears exposed modules before removing an app container', () => {
    // Given
    const container = createContainer('cart');
    exposeModule(container, './App', { default: () => 'cart' });

    // When
    removeContainer('cart');

    // Then
    expect(hasContainer('cart')).toBe(false);
    expect(container.exposedModules).toEqual({});
  });

  it('runs app session callbacks without removing the evaluated app resources', async () => {
    // Given
    const context = getMicroFrontendRuntimeContext();
    const container = createContainer('cart');
    exposeModule(container, './App', { default: () => 'cart' });
    const calls: string[] = [];
    context.dispose('cart', () => {
      calls.push('cart:first');
    });
    context.dispose('cart', async () => {
      calls.push('cart:second');
    });
    const catalogDispose = vi.fn();
    context.dispose('catalog', catalogDispose);

    // When
    await disposeAppResources('cart');
    await disposeAppResources('cart');

    // Then
    expect(calls).toEqual(['cart:second', 'cart:first', 'cart:second', 'cart:first']);
    expect(catalogDispose).not.toHaveBeenCalled();
    expect(hasContainer('cart')).toBe(true);
    expect(container.exposedModules['./App']).toBeDefined();
    expect(context.disposeCallbacksByApp.cart).toBeDefined();
    expect(context.disposeCallbacksByApp.catalog?.has(catalogDispose)).toBe(true);
  });

  it('rejects an untransformed source-level dispose call', () => {
    const context = getMicroFrontendRuntimeContext();

    expect(() => context.dispose(() => undefined)).toThrow('dispose() must be compiled with the microFrontend plugin');
  });
});
