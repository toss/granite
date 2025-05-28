import os from 'os';
import { afterAll, afterEach, beforeAll, describe, expect, it, vitest, type MockInstance } from 'vitest';

describe('esbuildUtils', () => {
  describe('normalizePath', () => {
    let mockedType: MockInstance;

    beforeAll(() => {
      mockedType = vitest.spyOn(os, 'type');
    });

    afterEach(() => {
      vitest.resetModules();
    });

    afterAll(() => {
      mockedType.mockRestore();
    });

    it('Posix 계열의 플랫폼인 경우 값이 그대로 반환된다', async () => {
      mockedType.mockReturnValueOnce('Darwin');
      const path = '/path/to/code.js';
      const { normalizePath } = await import('../esbuildUtils.js');

      expect(normalizePath(path)).toBe(path);
    });

    it('Win32 계열의 플랫폼인 경우 `\\` 구분자가 `/` 치한된 뒤 반환된다', async () => {
      mockedType.mockReturnValueOnce('Windows_NT');
      const path = 'C:\\path\\to\\code.js';
      const expected = 'C:/path/to/code.js';
      const { normalizePath } = await import('../esbuildUtils.js');

      expect(normalizePath(path)).toBe(expected);
    });
  });
});
