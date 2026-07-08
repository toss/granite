import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { GranitePluginCore, StaticPluginConfig } from '@granite-js/plugin-core';
import { afterEach, describe, expect, it } from 'vitest';
import { microFrontendPlugin } from './microFrontendPlugin';

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
});

describe('microFrontendPlugin', () => {
  it('keeps bundle scoping enabled by default', async () => {
    const plugin = await microFrontendPlugin({ name: 'remoteApp' });
    const config = await getBuildConfig(plugin, 'showcase');

    expect(config?.transformer?.transformBundleAsync).toBeTypeOf('function');
  });

  it('can disable bundle scoping for host bundles', async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'granite-plugin-mf-'));
    process.chdir(cwd);

    const plugin = await microFrontendPlugin({ name: 'shared', scopeBundle: false });
    const config = await getBuildConfig(plugin, 'shared');

    expect(config?.esbuild?.prelude).toHaveLength(1);
    expect(config?.transformer).toBeUndefined();
  });
});

async function getBuildConfig(
  plugin: GranitePluginCore,
  appName: string
): Promise<StaticPluginConfig | null | undefined | void> {
  if (typeof plugin.config !== 'function') {
    return plugin.config;
  }

  return await plugin.config({ command: 'build', appName });
}
