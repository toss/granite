import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { microFrontendPlugin } from './microFrontendPlugin';

let cwd: string;
beforeEach(async () => {
  cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'granite-mf-contract-'));
  vi.spyOn(process, 'cwd').mockReturnValue(cwd);
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await fs.rm(cwd, { recursive: true, force: true });
});

describe('microfrontend bundler-independent configuration', () => {
  it.each([undefined, 'standalone', 'custom'])(
    'emits legacy runtime flags independently of BUNDLE=%s',
    async (mode) => {
      vi.stubEnv('BUNDLE', mode);
      const plugin = await microFrontendPlugin({ name: 'remote', shared: ['react-native'] });
      expect(plugin.config).toMatchObject({
        extra: { skipReactNativePolyfills: true, skipReactNativeInitializeCore: true },
        resolver: {
          alias: expect.arrayContaining([{ from: 'react-native', to: 'virtual-shared:react-native', exact: true }]),
        },
      });
    }
  );

  it.each([undefined, [], ['react'], { 'react-native': { eager: true } }].map((shared) => ({ shared })))(
    'keeps initialization for unshared or eager RN: %j',
    async ({ shared }) => {
      const plugin = await microFrontendPlugin({ name: 'host', shared });
      expect(plugin.config).toMatchObject({ extra: undefined });
    }
  );

  it('supports non-eager object configuration', async () => {
    const plugin = await microFrontendPlugin({ name: 'remote', shared: { 'react-native': { eager: false } } });
    expect(plugin.config).toMatchObject({
      extra: { skipReactNativePolyfills: true, skipReactNativeInitializeCore: true },
    });
  });
});
