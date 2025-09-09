import { describe, it, expect, beforeAll } from 'vitest';
import { createContainer } from './createContainer';
import { exposeModule } from './exposeModule';
import { normalizePath, parseRemotePath, importRemoteModule, getContainer, toESM } from './utils';

describe('utils', () => {
  describe('getContainer', () => {
    beforeAll(() => {
      global.__MICRO_FRONTEND__ = {
        __INSTANCES__: [] as any,
        __SHARED__: {},
      };
    });

    it('should return the container', () => {
      const container = createContainer('remoteApp', {});

      expect(getContainer('remoteApp')).toBe(container);
      expect(getContainer('unknown')).toBe(null);
    });
  });

  describe('normalizePath', () => {
    it('should normalize path', () => {
      expect(normalizePath('./components/Button')).toBe('components/Button');
      expect(normalizePath('components/Button')).toBe('components/Button');
      expect(normalizePath('../../components/Button')).toBe('../../components/Button');
    });
  });

  describe('parseRemotePath', () => {
    it('should parse remote path', () => {
      expect(parseRemotePath('remoteA/components/Button')).toEqual({
        remoteName: 'remoteA',
        modulePath: 'components/Button',
        fullRequest: 'remoteA/components/Button',
      });
      expect(parseRemotePath('remoteB/./components/Button')).toEqual({
        remoteName: 'remoteB',
        modulePath: './components/Button',
        fullRequest: 'remoteB/./components/Button',
      });
      expect(parseRemotePath('remoteC/../../components/Button')).toEqual({
        remoteName: 'remoteC',
        modulePath: '../../components/Button',
        fullRequest: 'remoteC/../../components/Button',
      });
    });
  });

  describe('importRemoteModule', () => {
    beforeAll(() => {
      global.__MICRO_FRONTEND__ = {
        __INSTANCES__: [] as any,
        __SHARED__: {},
      };
    });

    it('should return the exposed module', () => {
      const Button = {};
      const container = createContainer('remoteApp', {});

      exposeModule(container, './components/Button', { default: Button });
      exposeModule(container, '../../../components/Button', { default: Button });

      // Relative path
      expect(importRemoteModule('remoteApp/./components/Button')).toEqual(
        expect.objectContaining({
          default: Button,
        })
      );
      expect(importRemoteModule('remoteApp/components/Button')).toEqual(
        expect.objectContaining({
          default: Button,
        })
      );

      // Relative path (parent)
      expect(importRemoteModule('remoteApp/../../../components/Button')).toEqual(
        expect.objectContaining({
          default: Button,
        })
      );
    });
  });

  describe('toESM', () => {
    it('should return the ESM compatible module', () => {
      // Non-ESM compatible module
      const module1 = { foo: 'foo' };

      // ESM Compatible modules
      const module2 = { bar: 'bar', default: {} };
      const module3 = { baz: 'baz', default: {} };

      Object.defineProperty(module2, '__esModule', { value: true, configurable: false });
      Object.defineProperty(module3, '__esModule', { get: () => true, configurable: true });
      expect(() => Object.defineProperty(module2, '__esModule', { value: false })).toThrowErrorMatchingInlineSnapshot(
        `[TypeError: Cannot redefine property: __esModule]`
      );
      expect(() => Object.assign(module3, { __esModule: true })).toThrowErrorMatchingInlineSnapshot(
        `[TypeError: Cannot set property __esModule of #<Object> which has only a getter]`
      );

      const result1 = toESM(module1);
      const result2 = toESM(module2);
      const result3 = toESM(module3);

      expect(result1.__esModule).toEqual(true);
      expect(result1.foo).toEqual('foo');
      expect(result1.default).toEqual(module1);

      expect(result2.__esModule).toEqual(true);
      expect(result2.bar).toEqual('bar');

      expect(result3.__esModule).toEqual(true);
      expect(result3.baz).toEqual('baz');
    });
  });
});
