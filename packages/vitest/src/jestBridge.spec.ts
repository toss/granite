import { afterEach, describe, expect, it, vi } from 'vitest';
import { installVitestPrettierWorkaround } from './jestBridge';

describe('installVitestPrettierWorkaround', () => {
  afterEach(() => {
    vi.doUnmock('prettier');
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('registers a prettier mock when the module is resolvable', () => {
    const doMockSpy = vi.spyOn(vi, 'doMock');
    const fakePrettierModule = {
      format: vi.fn(),
    };
    const fakeRequire = Object.assign(
      (resolvedId: string) => {
        expect(resolvedId).toBe('/virtual/prettier.js');
        return fakePrettierModule;
      },
      {
        resolve(moduleName: string) {
          expect(moduleName).toBe('prettier');
          return '/virtual/prettier.js';
        },
      },
    );

    installVitestPrettierWorkaround(fakeRequire as never);

    expect(doMockSpy).toHaveBeenCalledWith('prettier', expect.any(Function));
    const mockFactory = doMockSpy.mock.calls[0]?.[1] as (() => unknown) | undefined;

    expect(mockFactory?.()).toBe(fakePrettierModule);
  });

  it('ignores missing prettier installations', () => {
    const missingRequire = Object.assign(
      () => {
        throw new Error('should not load prettier');
      },
      {
        resolve() {
          throw Object.assign(new Error('missing prettier'), {
            code: 'MODULE_NOT_FOUND',
          });
        },
      },
    );

    expect(() =>
      installVitestPrettierWorkaround(missingRequire as never),
    ).not.toThrow();
  });
});
