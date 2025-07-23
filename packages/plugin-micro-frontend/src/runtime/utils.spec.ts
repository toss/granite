import { describe, it, expect, beforeAll } from 'vitest';
import { createContainer } from './createContainer';
import { exposeModule } from './exposeModule';
import { normalizePath, parseRemotePath, importRemoteModule, getContainer } from './utils';

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
});
