import type { CompleteGraniteConfig } from '@granite-js/plugin-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EXPERIMENTAL__server } from './serve';

const mocks = vi.hoisted(() => ({
  DevServer: vi.fn(),
  attachKeyHandlers: vi.fn(),
  close: vi.fn(),
  initialize: vi.fn(),
  listen: vi.fn(),
  post: vi.fn(),
  pre: vi.fn(),
  resolveConfig: vi.fn(),
}));

vi.mock('@granite-js/plugin-core', () => ({
  createPluginHooksDriver: () => ({ devServer: { post: mocks.post, pre: mocks.pre } }),
  resolveConfig: mocks.resolveConfig,
}));
vi.mock('../server/DevServer', () => ({ DevServer: mocks.DevServer }));
vi.mock('../../operations/attachKeyHandlers', () => ({ default: mocks.attachKeyHandlers }));
vi.mock('../../operations/keyReporter', () => ({ keyReporter: {} }));
vi.mock('../../utils/printLogo', () => ({ printLogo: vi.fn() }));
vi.mock('../../utils/printServerUrl', () => ({ printServerUrl: vi.fn() }));

describe('EXPERIMENTAL__server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.DevServer.mockImplementation(function DevServerMock() {
      return {
        broadcastCommand: vi.fn(),
        close: mocks.close,
        initialize: mocks.initialize,
        listen: mocks.listen,
      };
    });
  });

  it('forwards Metro-compatible middlewares to the experimental dev server', async () => {
    // Given
    const metroMiddleware = vi.fn();
    const devServerMiddleware = vi.fn();
    mocks.resolveConfig.mockResolvedValue({
      devServer: { middlewares: [devServerMiddleware] },
      metro: { middlewares: [metroMiddleware] },
    });
    const config = {
      cwd: '/fixtures',
      entryFile: '/fixtures/index.ts',
    } as CompleteGraniteConfig;

    // When
    await EXPERIMENTAL__server({ config });

    // Then
    expect(mocks.DevServer).toHaveBeenCalledWith(
      expect.objectContaining({
        metroMiddlewares: [metroMiddleware],
        middlewares: [devServerMiddleware],
      })
    );
  });
});
