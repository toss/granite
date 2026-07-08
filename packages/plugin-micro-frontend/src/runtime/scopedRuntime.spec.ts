import { afterEach, describe, expect, it } from 'vitest';
import type { RuntimeContext } from './types';
import {
  createContainer,
  createScopedRuntime,
  exposeModule,
  getContainer,
  importRemoteModule,
  registerShared,
} from './index';

type RemoteTopLevelGlobal = {
  remoteTopLevel?: string;
};

type ScopedGlobal = Record<string, unknown>;

type TimerHandle = {
  readonly id: string;
};

type TimerGlobal = ScopedGlobal & {
  readonly hostOwned?: string;
  readonly setTimeout: (callback: () => void, delay: number) => TimerHandle;
  readonly clearTimeout: (handle: TimerHandle) => void;
  readonly setInterval: (callback: () => void, delay: number) => TimerHandle;
  readonly clearInterval: (handle: TimerHandle) => void;
};

type MicroFrontendGlobal = ScopedGlobal & {
  __MICRO_FRONTEND__?: RuntimeContext;
};

describe('createScopedRuntime', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'remoteTopLevel');
    Reflect.deleteProperty(global, '__MICRO_FRONTEND__');
  });

  it('imports an exposed module from a function-scope remote without leaking top-level globals to the host', () => {
    const scope = createScopedRuntime();

    try {
      scope.evaluate((runtimeGlobal: RemoteTopLevelGlobal, runtimeGlobalThis: RemoteTopLevelGlobal) => {
        runtimeGlobalThis.remoteTopLevel = 'car';
        expect(runtimeGlobal.remoteTopLevel).toBe('car');

        const container = createContainer('car', {});
        exposeModule(container, './Screen', { default: 'screen' });
      });

      expect(scope.importRemoteModule('car/Screen').default).toBe('screen');
      expect(scope.global.remoteTopLevel).toBe('car');
      expect(Reflect.get(globalThis, 'remoteTopLevel')).toBeUndefined();
      expect(getContainer('car')).toBe(null);
      expect(() => importRemoteModule('car/Screen')).toThrow('car container not found');
    } finally {
      scope.dispose();
    }
  });

  it('clears scoped timers and owned properties while preserving host globals on dispose', () => {
    const timeoutHandle = { id: 'timeout' };
    const intervalHandle = { id: 'interval' };
    const clearedHandles: TimerHandle[] = [];
    const hostGlobal: TimerGlobal = {
      hostOwned: 'keep',
      setTimeout: () => timeoutHandle,
      clearTimeout: (handle) => {
        clearedHandles.push(handle);
      },
      setInterval: () => intervalHandle,
      clearInterval: (handle) => {
        clearedHandles.push(handle);
      },
    };
    const scope = createScopedRuntime({ global: hostGlobal });

    scope.evaluate((global: TimerGlobal) => {
      global.setTimeout(() => undefined, 1);
      global.setInterval(() => undefined, 1);
      scope.global.scopeOwned = true;
      expect(() =>
        Object.defineProperty(scope.global, 'nonConfigurableScopeOwned', {
          value: true,
          configurable: false,
        })
      ).toThrow('Scoped runtime globals must be configurable');
      expect(() =>
        Object.defineProperty(scope.global, 'defaultNonConfigurableScopeOwned', {
          value: true,
        })
      ).toThrow('Scoped runtime globals must be configurable');
      Object.defineProperty(scope.global, 'definedScopeOwned', {
        value: true,
        configurable: true,
      });
    });

    scope.dispose();

    expect(clearedHandles).toEqual([timeoutHandle, intervalHandle]);
    expect(hostGlobal.hostOwned).toBe('keep');
    expect('scopeOwned' in scope.global).toBe(false);
    expect('definedScopeOwned' in scope.global).toBe(false);
    expect('nonConfigurableScopeOwned' in scope.global).toBe(false);
    expect('defaultNonConfigurableScopeOwned' in scope.global).toBe(false);
  });

  it('exposes the scoped micro-frontend context to generated shared-module code', () => {
    const scope = createScopedRuntime();

    try {
      scope.evaluate((global: MicroFrontendGlobal) => {
        registerShared('react', { version: 'scoped' });

        expect(global.__MICRO_FRONTEND__).toBe(scope.context);
        expect(global.__MICRO_FRONTEND__?.__SHARED__['react']?.get().version).toBe('scoped');
      });

      expect(scope.context.__SHARED__['react']?.get().version).toBe('scoped');
      expect(global.__MICRO_FRONTEND__?.__SHARED__['react']).toBeUndefined();
    } finally {
      scope.dispose();
    }
  });

  it('rejects async factories before executing them', () => {
    const scope = createScopedRuntime();
    let asyncFactoryRan = false;

    try {
      expect(() =>
        scope.evaluate(async () => {
          asyncFactoryRan = true;
          await Promise.resolve();

          const container = createContainer('async-leak', {});
          exposeModule(container, './Screen', { default: 'leaked' });
        })
      ).toThrow('Scoped runtime factories must be synchronous');

      expect(asyncFactoryRan).toBe(false);
      expect(getContainer('async-leak')).toBe(null);
    } finally {
      scope.dispose();
    }
  });

  it('rejects promise-returning factories without leaking async runtime calls to the host', async () => {
    const scope = createScopedRuntime();
    let continuationRan = false;

    try {
      expect(() =>
        scope.evaluate(() =>
          Promise.resolve().then(() => {
            continuationRan = true;

            const container = createContainer('promise-leak', {});
            exposeModule(container, './Screen', { default: 'leaked' });
          })
        )
      ).toThrow('Scoped runtime factories must be synchronous');

      await Promise.resolve();
      await Promise.resolve();

      expect(continuationRan).toBe(true);
      expect(getContainer('promise-leak')).toBe(null);
    } finally {
      scope.dispose();
    }
  });

  it('rejects promise-like factories without leaking scheduled continuations to the host', async () => {
    const scope = createScopedRuntime();
    let continuationRan = false;
    let continuationError: unknown;

    try {
      expect(() =>
        scope.evaluate(() => {
          queueMicrotask(() => {
            continuationRan = true;

            try {
              const container = createContainer('thenable-leak', {});
              exposeModule(container, './Screen', { default: 'leaked' });
            } catch (error) {
              continuationError = error;
            }
          });

          return {
            then(resolve: (value: void) => void) {
              resolve();
            },
          };
        })
      ).toThrow('Scoped runtime factories must be synchronous');

      await Promise.resolve();
      await Promise.resolve();

      expect(continuationRan).toBe(true);
      expect(continuationError).toStrictEqual(new Error('Scoped runtime factories must be synchronous'));
      expect(getContainer('thenable-leak')).toBe(null);
    } finally {
      scope.dispose();
    }
  });

  it('does not poison the default runtime when a rejected promise-returning factory stays pending', () => {
    const scope = createScopedRuntime();

    try {
      expect(() =>
        scope.evaluate(() => new Promise(() => undefined))
      ).toThrow('Scoped runtime factories must be synchronous');

      scope.dispose();

      const hostContainer = createContainer('host-after-pending-promise', {});
      exposeModule(hostContainer, './Screen', { default: 'host-screen' });

      expect(importRemoteModule('host-after-pending-promise/Screen').default).toBe('host-screen');
    } finally {
      Reflect.deleteProperty(global, '__MICRO_FRONTEND__');
    }
  });
});
