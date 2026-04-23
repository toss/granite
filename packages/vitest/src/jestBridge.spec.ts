import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  installVitestJestBridge,
  installVitestPrettierWorkaround,
} from './jestBridge';

type JestBridgeGlobals = typeof globalThis & {
  jest?: {
    fn: typeof vi.fn;
    now: () => number;
    requireActual: (moduleName: string) => unknown;
    useFakeTimers: typeof vi.useFakeTimers;
    useRealTimers: typeof vi.useRealTimers;
  };
};

describe('jestBridge helpers', () => {
  afterEach(() => {
    const runtimeGlobals = globalThis as JestBridgeGlobals;

    vi.doUnmock('prettier');
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete runtimeGlobals.jest;
  });

  it('installs a Jest-shaped global on top of Vitest', () => {
    const runtimeGlobals = globalThis as JestBridgeGlobals;

    installVitestJestBridge();

    expect(runtimeGlobals.jest).toBeDefined();
    const jestBridge = runtimeGlobals.jest!;

    expect(jestBridge).toMatchObject({
      fn: expect.any(Function),
      now: expect.any(Function),
      requireActual: expect.any(Function),
      useFakeTimers: expect.any(Function),
      useRealTimers: expect.any(Function),
    });

    const mock = jestBridge.fn();
    mock('value');

    expect(mock).toHaveBeenCalledWith('value');

    jestBridge.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    expect(jestBridge.now()).toBe(Date.parse('2024-01-01T00:00:00Z'));
    expect(jestBridge.requireActual('node:path')).toBe(path);

    jestBridge.useRealTimers();
  });

  it('lets setup skip optional prettier mocking when prettier is absent', () => {
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
