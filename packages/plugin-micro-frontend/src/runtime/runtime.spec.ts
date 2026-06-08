import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createContainer } from './createContainer';
import { exposeModule } from './exposeModule';
import { registerShared } from './registerShared';
import { getRemoteContext, getRemoteScope, releaseRemoteScope, setScopedTimeout } from './remoteScope';

describe('runtime', () => {
  beforeEach(() => {
    global.__MICRO_FRONTEND__ = {
      __INSTANCES__: [] as any,
      __SHARED__: {},
    };
    delete (globalThis as any).__GRANITE_MICRO_FRONTEND_REMOTE__;
    vi.useRealTimers();
  });

  describe('container', () => {
    const CONTAINER_NAME = 'test-app';

    it('should register a host container', () => {
      const container = createContainer(CONTAINER_NAME, {
        remote: {
          host: 'localhost',
          port: 8082,
        },
        shared: { lib: { eager: true } },
      });

      expect(container.name).toBe(CONTAINER_NAME);
      expect(global.__MICRO_FRONTEND__.__INSTANCES__.length).toBe(1);
      expect(global.__MICRO_FRONTEND__.__INSTANCES__).toMatchInlineSnapshot(`
        [
          {
            "config": {
              "remote": {
                "host": "localhost",
                "port": 8082,
              },
              "shared": {
                "lib": {
                  "eager": true,
                },
              },
            },
            "exposeMap": {},
            "name": "test-app",
          },
        ]
      `);
    });

    it('should throw an error if a container is already registered', () => {
      const config = {
        remote: {
          host: 'localhost',
          port: 8082,
        },
        shared: { react: { eager: true } },
      };

      createContainer(CONTAINER_NAME, config);

      expect(() => createContainer(CONTAINER_NAME, config)).toThrow();
    });

    it('should keep remote containers in a weak runtime scope instead of the global instance registry', () => {
      const container = createContainer(CONTAINER_NAME, { shared: { lib: { eager: true } } });
      const remoteContext = getRemoteContext();
      const scope = getRemoteScope(CONTAINER_NAME);

      expect(global.__MICRO_FRONTEND__.__INSTANCES__.length).toBe(0);
      expect(container.scope).toBe(scope);
      expect(scope?.container).toBe(container);
      expect(remoteContext.currentScope).toBe(scope);
      expect((globalThis as any).__GRANITE_MICRO_FRONTEND_REMOTE__).toBe(remoteContext);
    });

    it('should release remote containers and scoped resources', () => {
      vi.useFakeTimers();
      const container = createContainer(CONTAINER_NAME, {});
      const scope = getRemoteScope(CONTAINER_NAME);
      const callback = vi.fn();
      const timeoutId = setScopedTimeout(scope, callback, 1000);

      expect(scope?.resources.timeouts).toContain(timeoutId);

      expect(releaseRemoteScope(scope)).toBe(true);

      vi.advanceTimersByTime(1000);

      expect(callback).not.toHaveBeenCalled();
      expect(container.exposeMap).toEqual({});
      expect(container.scope).toBe(null);
      expect(scope?.container).toBe(null);
      expect(getRemoteScope(CONTAINER_NAME)).toBe(null);
    });
  });

  describe('registerShared', () => {
    it('should register a shared module', () => {
      const mod = {};
      registerShared('lib-name', mod);

      expect(global.__MICRO_FRONTEND__.__SHARED__['lib-name']).toBeTruthy();
      expect(global.__MICRO_FRONTEND__.__SHARED__['lib-name']?.get()).toEqual(mod);
    });

    it('should throw an error if a shared module is already registered', () => {
      registerShared('lib-name', {});

      expect(() => registerShared('lib-name', {})).toThrow();
    });
  });

  describe('exposeModule', () => {
    it('should expose a module', () => {
      const mod = {};
      const container = createContainer('exposed-app-1', {
        remote: {
          host: 'localhost',
          port: 8082,
        },
      });
      exposeModule(container, './my-module', mod);
      exposeModule(container, 'my-module/foo', mod);
      exposeModule(container, '../../../my-module', mod);

      expect(container.exposeMap['my-module']).toEqual(mod);
      expect(container.exposeMap['my-module/foo']).toEqual(mod);
      expect(container.exposeMap['../../../my-module']).toEqual(mod);
    });

    it('should throw an error if a module is already exposed', () => {
      const mod = {};
      const container = createContainer('exposed-app-2', {
        remote: {
          host: 'localhost',
          port: 8082,
        },
      });
      exposeModule(container, './my-module', mod);
      exposeModule(container, 'my-module/foo', mod);
      exposeModule(container, '../../../my-module', mod);

      expect(() => exposeModule(container, 'my-module', mod)).toThrow();
      expect(() => exposeModule(container, 'my-module/foo', mod)).toThrow();
      expect(() => exposeModule(container, '../../../my-module', mod)).toThrow();
    });
  });
});
