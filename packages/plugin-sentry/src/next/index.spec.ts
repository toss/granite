import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { flattenPluginOption, type Plugin, type ResolvedConfig } from 'rollipop';
import { describe, expect, it } from 'vitest';
import { sentry } from './index';

describe('Sentry plugin', () => {
  it('does not register hooks when disabled', () => {
    expect(sentry({ enabled: false })).toEqual([]);
  });

  it('does not inject debug ID snippets in development', async () => {
    const plugins = await flattenPluginOption(sentry({ useClient: false }));
    await resolve(plugins, 'development');
    const debugIdPlugin = getPlugin(plugins, 'granite:sentry:debug-id');

    expect(await callAddon(debugIdPlugin.banner, 'bundle.js')).toBe('');
    expect(await callAddon(debugIdPlugin.footer, 'bundle.js')).toBe('');
  });

  it('exposes Rolldown hooks directly and keeps the bundle debug ID consistent', async () => {
    const plugins = await flattenPluginOption(sentry({ useClient: false }));
    await resolve(plugins, 'production');
    const debugIdPlugin = getPlugin(plugins, 'granite:sentry:debug-id');
    const uploadPlugin = getPlugin(plugins, 'granite:sentry:upload');

    const banner = await callAddon(debugIdPlugin.banner, 'bundle.ios.js');
    const footer = await callAddon(debugIdPlugin.footer, 'bundle.ios.js');

    expect(plugins.map(({ name }) => name)).toEqual([
      'granite:sentry:config',
      'granite:sentry:debug-id',
      'granite:sentry:upload',
    ]);
    expect(debugIdPlugin).not.toHaveProperty('writeBundle');
    expect(uploadPlugin.writeBundle).toMatchObject({ order: 'post', sequential: true });
    expect(banner).toMatch(/SENTRY_DEBUG_ID=([\da-f-]{36})/);
    expect(footer).toMatch(/^\/\/# debugId=[\da-f-]{36}$/);
    expect(banner.match(/SENTRY_DEBUG_ID=([\da-f-]{36})/)?.[1]).toBe(footer.slice('//# debugId='.length));
  });

  it('injects the final bundle debug ID into the sourcemap and resets it for the next build', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'granite-sentry-'));
    const plugins = await flattenPluginOption(sentry({ useClient: false }));
    await resolve(plugins, 'production', root);

    try {
      const firstFooter = await writeBundle(plugins, root, 'bundle.js');
      const sourcemap = JSON.parse(await fs.readFile(path.join(root, 'bundle.js.map'), 'utf8'));
      expect(sourcemap.debugId).toBe(firstFooter.slice('//# debugId='.length));

      const secondFooter = await writeBundle(plugins, root, 'bundle.js');
      expect(secondFooter).not.toBe(firstFooter);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

async function resolve(plugins: Plugin[], mode: 'development' | 'production', root = '/service') {
  for (const plugin of plugins) {
    if (typeof plugin.configResolved === 'function') {
      await plugin.configResolved.call({} as never, { root, mode } as ResolvedConfig);
    }
  }
}

async function callAddon(hook: Plugin['banner'], fileName: string) {
  if (typeof hook !== 'function') {
    throw new Error('Missing addon hook');
  }
  return hook.call({} as never, { fileName } as never);
}

async function writeBundle(plugins: Plugin[], root: string, fileName: string) {
  const debugIdPlugin = getPlugin(plugins, 'granite:sentry:debug-id');
  const uploadPlugin = getPlugin(plugins, 'granite:sentry:upload');
  const banner = await callAddon(debugIdPlugin.banner, fileName);
  const footer = await callAddon(debugIdPlugin.footer, fileName);
  await fs.writeFile(path.join(root, fileName), `${banner}\nconsole.log('test');\n${footer}`);
  await fs.writeFile(path.join(root, `${fileName}.map`), '{}');

  if (uploadPlugin.writeBundle == null || typeof uploadPlugin.writeBundle === 'function') {
    throw new Error('Missing ordered writeBundle hook');
  }
  await uploadPlugin.writeBundle.handler.call({} as never, { file: fileName } as never, {});
  return footer;
}

function getPlugin(plugins: Plugin[], name: string): Plugin {
  const plugin = plugins.find((item) => item.name === name);
  if (plugin == null) {
    throw new Error(`Missing plugin ${name}`);
  }
  return plugin;
}
