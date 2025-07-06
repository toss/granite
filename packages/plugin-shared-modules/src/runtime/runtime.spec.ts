import { describe, it, expect, beforeAll } from 'vitest';
import { createContainer } from './createContainer';
import { registerShared } from './registerShared';

describe('runtime', () => {
  beforeAll(() => {
    global.__SHARED_MODULES__ = {
      __INSTANCES__: [] as any,
      __SHARED__: {},
    };
  });

  describe('container', () => {
    const CONTAINER_NAME = 'test-app';

    it('should create a container', () => {
      createContainer(CONTAINER_NAME, { shared: { lib: { singleton: true } } });
      expect(global.__SHARED_MODULES__.__INSTANCES__).toMatchInlineSnapshot(`
        [
          {
            "config": {
              "shared": {
                "lib": {
                  "singleton": true,
                },
              },
            },
            "name": "test-app",
          },
        ]
      `);
    });

    it('should throw an error if a container is already registered', () => {
      expect(() => createContainer(CONTAINER_NAME, { shared: { react: { singleton: true } } })).toThrow();
    });
  });

  describe('registerShared', () => {
    it('should register a shared module', () => {
      const mod = {};
      registerShared('lib-name', mod);
      expect(global.__SHARED_MODULES__.__SHARED__['lib-name']).toBeTruthy();
      expect(global.__SHARED_MODULES__.__SHARED__['lib-name']?.get()).toEqual(mod);
    });
  });
});
