import { describe, it, expect, beforeAll } from 'vitest';
import { createContainer } from './createContainer';
import { exposeModule } from './exposeModule';
import { registerShared } from './registerShared';

describe('runtime', () => {
  beforeAll(() => {
    global.__MICRO_FRONTEND__ = {
      __INSTANCES__: [] as any,
      __SHARED__: {},
    };
  });

  describe('container', () => {
    const CONTAINER_NAME = 'test-app';

    it('should register a new container', () => {
      const container = createContainer(CONTAINER_NAME, { shared: { lib: { eager: true } } });

      expect(container.name).toBe(CONTAINER_NAME);
      expect(global.__MICRO_FRONTEND__.__INSTANCES__.length).toBe(1);
      expect(global.__MICRO_FRONTEND__.__INSTANCES__).toMatchInlineSnapshot(`
        [
          {
            "config": {
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
      expect(() => createContainer(CONTAINER_NAME, { shared: { react: { eager: true } } })).toThrow();
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
      expect(() => registerShared('lib-name', {})).toThrow();
    });
  });

  describe('exposeModule', () => {
    it('should expose a module', () => {
      const mod = {};
      const container = createContainer('exposed-app-1', {});
      exposeModule(container, './my-module', mod);
      exposeModule(container, 'my-module/foo', mod);
      exposeModule(container, '../../../my-module', mod);

      expect(container.exposeMap['my-module']).toEqual(mod);
      expect(container.exposeMap['my-module/foo']).toEqual(mod);
      expect(container.exposeMap['../../../my-module']).toEqual(mod);
    });

    it('should throw an error if a module is already exposed', () => {
      const mod = {};
      const container = createContainer('exposed-app-2', {});
      exposeModule(container, './my-module', mod);
      exposeModule(container, 'my-module/foo', mod);
      exposeModule(container, '../../../my-module', mod);

      expect(() => exposeModule(container, 'my-module', mod)).toThrow();
      expect(() => exposeModule(container, 'my-module/foo', mod)).toThrow();
      expect(() => exposeModule(container, '../../../my-module', mod)).toThrow();
    });
  });
});
