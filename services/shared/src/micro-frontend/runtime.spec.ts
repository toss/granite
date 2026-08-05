import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadBundle } from './runtime';

const { nativeLoadBundle } = vi.hoisted(() => ({
  nativeLoadBundle: vi.fn(async ({ appName }: { readonly appName: string }) => `/bundles/${appName}.hbc`),
}));

vi.mock('react-native', () => ({
  TurboModuleRegistry: {
    getEnforcing: vi.fn(() => ({ loadBundle: nativeLoadBundle })),
  },
}));

vi.mock('@granite-js/micro-frontend', () => ({
  createMicroFrontendRuntime: vi.fn(() => ({})),
}));

describe('example micro-frontend bundle loader', () => {
  beforeEach(() => {
    nativeLoadBundle.mockClear();
  });

  it.each(['bare', 'showcase'] as const)('loads the %s app through an object request', async (appName) => {
    await expect(loadBundle(appName)).resolves.toBe(`/bundles/${appName}.hbc`);
    expect(nativeLoadBundle).toHaveBeenLastCalledWith({ appName });
  });

  it('rejects apps outside the example allowlist', async () => {
    await expect(loadBundle('unknown')).rejects.toThrow('Unknown example app: unknown');
    expect(nativeLoadBundle).not.toHaveBeenCalled();
  });
});
