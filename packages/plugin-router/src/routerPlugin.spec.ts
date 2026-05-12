import { beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from './routerPlugin';

const mocks = vi.hoisted(() => ({
  generateRouterFile: vi.fn(),
  watchRouter: vi.fn(),
}));

vi.mock('./generateRouterFile', () => ({
  generateRouterFile: mocks.generateRouterFile,
}));

vi.mock('./watchRouter', () => ({
  watchRouter: mocks.watchRouter,
}));

describe('router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('watches route files by default when options are empty', () => {
    const plugin = router({});

    plugin.dev?.handler.call({ meta: {} }, {} as never);

    expect(mocks.generateRouterFile).toHaveBeenCalledOnce();
    expect(mocks.watchRouter).toHaveBeenCalledOnce();
  });
});
