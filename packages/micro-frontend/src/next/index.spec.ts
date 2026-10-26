import { flattenPluginOption, type Config, type Plugin } from 'rollipop';
import { describe, expect, it } from 'vitest';
import { microFrontend } from './index';

describe('microFrontend plugin', () => {
  it('enables execution bootstrap and async compilation together', async () => {
    const plugins = await flattenPluginOption(microFrontend({ appName: 'remote-app', executionOwnership: true }));
    const prelude = getPlugin(plugins, 'granite:micro-frontend:prelude');
    const execution = getPlugin(plugins, 'granite:micro-frontend:execution-ownership');
    if (typeof prelude.config !== 'function' || prelude.load == null || typeof prelude.load === 'function') {
      throw new Error('Missing prelude hooks');
    }
    await prelude.config.call({} as never, { root: '/service', polyfills: [] } as Config);
    const bootstrap = await prelude.load.handler.call({} as never, '\0granite:micro-frontend');
    expect(bootstrap).toContain("initializeExecution();");
    if (execution.transform == null || typeof execution.transform === 'function') {
      throw new Error('Missing execution transform');
    }
    const transformed = await execution.transform.handler.call(
      {} as never,
      'async function shared() { await work(); return nativeModule.identify(); }',
      '/service/shared.js',
      { moduleType: 'js' }
    );
    expect(transformed).toMatchObject({ code: expect.stringContaining('granite:execution-internal') });
  });

  it('composes prelude, shared-module, and dispose responsibilities as separate plugins', async () => {
    const plugins = await flattenPluginOption(
      microFrontend({
        appName: 'remote-app',
        exposes: { './App': './src/App.tsx' },
        shared: { react: { eager: true }, lodash: {} },
      })
    );

    expect(plugins.map(({ name }) => name)).toEqual([
      'granite:micro-frontend:prelude',
      'granite:micro-frontend:shared-modules',
      'granite:micro-frontend:dispose',
    ]);

    const prelude = getPlugin(plugins, 'granite:micro-frontend:prelude');
    const shared = getPlugin(plugins, 'granite:micro-frontend:shared-modules');
    expect(prelude.load).toMatchObject({ filter: { id: /^\0granite:micro-frontend$/ } });
    expect(shared.load).toMatchObject({ filter: { id: /^\0granite:shared:/ } });
    expect(prelude).not.toHaveProperty('transform');
    expect(shared).not.toHaveProperty('transform');
  });

  it('omits the shared-module plugin when every shared module is eager', async () => {
    const plugins = await flattenPluginOption(
      microFrontend({ appName: 'remote-app', shared: { react: { eager: true } } })
    );

    expect(plugins.map(({ name }) => name)).toEqual([
      'granite:micro-frontend:prelude',
      'granite:micro-frontend:dispose',
    ]);
  });

  it('generates the virtual prelude from the resolved project root', async () => {
    const plugins = await flattenPluginOption(
      microFrontend({ appName: 'remote-app', exposes: { './App': './src/App.tsx' } })
    );
    const prelude = getPlugin(plugins, 'granite:micro-frontend:prelude');
    const config = { root: '/service', polyfills: [] } as Config;
    if (typeof prelude.config !== 'function') {
      throw new Error('Missing config hook');
    }
    const result = await prelude.config.call({} as never, config);
    expect(result).toEqual({ prelude: ['\0granite:micro-frontend'] });

    if (prelude.load == null || typeof prelude.load === 'function') {
      throw new Error('Missing filtered load hook');
    }
    const source = await prelude.load.handler.call({} as never, '\0granite:micro-frontend');
    expect(source).toContain('createContainer("remote-app"');
    expect(source).toContain('/service/src/App.tsx');
  });
});

function getPlugin(plugins: Plugin[], name: string): Plugin {
  const plugin = plugins.find((item) => item.name === name);
  if (plugin == null) {
    throw new Error(`Missing plugin ${name}`);
  }
  return plugin;
}
