import { flattenPluginOption, type Config, type Plugin } from 'rollipop';
import { describe, expect, it } from 'vitest';
import { microFrontend } from './index';

describe('microFrontend plugin', () => {
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
    expect(prelude.load).toMatchObject({ filter: { id: /^\0granite:(?:micro-frontend$|shared-namespace:)/ } });
    expect(shared.load).toMatchObject({ filter: { id: /^\0granite:shared:/ } });
    expect(prelude).not.toHaveProperty('transform');
    expect(shared).not.toHaveProperty('transform');
  });

  it('checks the shared modules a remote bundle uses before the bundle runs', async () => {
    const plugins = await flattenPluginOption(
      microFrontend({ appName: 'remote-app', shared: { lodash: {}, 'date-fns': {}, unused: {} } })
    );
    const shared = getPlugin(plugins, 'granite:micro-frontend:shared-modules');
    if (typeof shared.intro !== 'function') {
      throw new Error('Missing intro hook');
    }
    const chunk = { moduleIds: ['/app/src/App.tsx', '\0granite:shared:lodash', '\0granite:shared:date-fns'] };
    const intro = String(await shared.intro.call({} as never, chunk as never));
    expect(intro).toContain('["date-fns","lodash"]');
    expect(intro).not.toContain('unused');

    const run = (registry: Record<string, unknown>) =>
      new Function('globalThis', intro)({ __MICRO_FRONTEND__: { __SHARED__: registry } });
    expect(() => run({ lodash: {}, 'date-fns': {} })).not.toThrow();
    expect(() => run({ lodash: {} })).toThrow('Shared module date-fns is not registered');

    const noShared = { moduleIds: ['/app/src/App.tsx'] };
    expect(await shared.intro.call({} as never, noShared as never)).toBe('');
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

  it('loads a lazy host shared module through a namespace module so the package keeps its import', async () => {
    const plugins = await flattenPluginOption(
      microFrontend({ appName: 'shared', shared: { 'react-native-svg': { eager: true, lazy: true } } })
    );
    const prelude = getPlugin(plugins, 'granite:micro-frontend:prelude');
    if (typeof prelude.config !== 'function' || prelude.load == null || typeof prelude.load === 'function') {
      throw new Error('Missing prelude hooks');
    }
    if (prelude.resolveId == null || typeof prelude.resolveId === 'function') {
      throw new Error('Missing filtered resolveId hook');
    }
    await prelude.config.call({} as never, { root: '/service', polyfills: [] } as Config);
    const source = String(await prelude.load.handler.call({} as never, '\0granite:micro-frontend'));
    const namespaceId = '\0granite:shared-namespace:react-native-svg';

    expect(source).toContain(`return require(${JSON.stringify(namespaceId)}).ns;`);
    expect(source).not.toContain('import * as __shared0');
    expect(await prelude.resolveId.handler.call({} as never, namespaceId, undefined, {} as never)).toBe(namespaceId);
    expect(await prelude.load.handler.call({} as never, namespaceId)).toBe(
      'import * as ns from "react-native-svg";\nexport { ns };\n'
    );
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
