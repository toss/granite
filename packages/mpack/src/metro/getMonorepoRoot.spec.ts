import path from 'path';
import { afterAll, beforeAll, describe, expect, it, MockInstance, vitest } from 'vitest';
import { getMonorepoRoot } from './getMonorepoRoot';

describe('getMonorepoRoot', () => {
  describe('워크스페이스 프로젝트가 아닌 경우', () => {
    beforeAll(() => {
      vitest.mock('./pnpapi', () => {
        return {
          pnpapi: undefined,
        };
      });
    });

    describe('posix', () => {
      let dirnameSpy: MockInstance;

      beforeAll(() => {
        dirnameSpy = vitest.spyOn(path, 'dirname');
        vitest.mock('path', async () => {
          const path = await vitest.importActual('path');

          return { ...path, default: path.posix };
        });
      });

      afterAll(() => {
        vitest.restoreAllMocks();
      });

      it('루트 경로까지 탐색한뒤 기존 경로를 반환한다', async () => {
        const root = await getMonorepoRoot('/foo/bar/baz/my-project');
        expect(root).toBe('/foo/bar/baz/my-project');
        expect(dirnameSpy).toBeCalledWith('/foo/bar/baz/my-project');
        expect(dirnameSpy).toBeCalledWith('/foo/bar/baz');
        expect(dirnameSpy).toBeCalledWith('/foo/bar');
        expect(dirnameSpy).toBeCalledWith('/foo');
        expect(dirnameSpy).toBeCalledWith('/');
      });
    });

    describe('windows', () => {
      let dirnameSpy: MockInstance;

      beforeAll(() => {
        dirnameSpy = vitest.spyOn(path, 'dirname');
        vitest.mock('path', async () => {
          const path = await vitest.importActual('path');

          return { ...path, default: path.win32 };
        });
      });

      afterAll(() => {
        vitest.restoreAllMocks();
      });

      it('루트 경로까지 탐색한뒤 기존 경로를 반환한다', async () => {
        const root = await getMonorepoRoot('C:\\foo\\bar\\baz\\my-project');
        expect(root).toBe('C:\\foo\\bar\\baz\\my-project');
        expect(dirnameSpy).toBeCalledWith('C:\\foo\\bar\\baz\\my-project');
        expect(dirnameSpy).toBeCalledWith('C:\\foo\\bar\\baz');
        expect(dirnameSpy).toBeCalledWith('C:\\foo\\bar');
        expect(dirnameSpy).toBeCalledWith('C:\\foo');
        expect(dirnameSpy).toBeCalledWith('C:\\');
      });
    });
  });
});
