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
    expect(prelude.load).toMatchObject({ filter: { id: /^\0granite:micro-frontend$/ } });
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

  it('registers a lazy shared ESM package through named imports and getters, following export *', async () => {
    const modules: Record<string, { code: string; exports: string[]; inputFormat: 'es' | 'cjs'; stars?: string[] }> = {
      '/pkg/index.js': { code: 'index', exports: ['A', 'default', '*'], inputFormat: 'es', stars: ['./star.js'] },
      '/pkg/star.js': { code: 'star', exports: ['S', 'default'], inputFormat: 'es' },
      '/cjs/index.js': { code: 'cjs', exports: [], inputFormat: 'cjs' },
    };
    const warnings: string[] = [];
    const context = {
      async resolve(source: string) {
        const id = { pkg: '/pkg/index.js', cjs: '/cjs/index.js', './star.js': '/pkg/star.js' }[source];
        return id == null ? null : { id, external: false };
      },
      async load({ id }: { id: string }) {
        return modules[id];
      },
      parse(code: string) {
        const stars = Object.values(modules).find((module) => module.code === code)?.stars ?? [];
        return {
          body: stars.map((source) => ({ type: 'ExportAllDeclaration', exported: null, source: { value: source } })),
        };
      },
      warn(message: string) {
        warnings.push(message);
      },
    };
    const plugins = await flattenPluginOption(
      microFrontend({
        appName: 'host',
        shared: { pkg: { eager: true, lazy: true }, cjs: { eager: true, lazy: true } },
      })
    );
    const prelude = getPlugin(plugins, 'granite:micro-frontend:prelude');
    if (typeof prelude.config !== 'function' || prelude.load == null || typeof prelude.load === 'function') {
      throw new Error('Missing prelude hooks');
    }
    await prelude.config.call({} as never, { root: '/service', polyfills: [] } as Config);

    const source = String(await prelude.load.handler.call(context as never, '\0granite:micro-frontend'));

    expect(source).toContain('import { A as __shared0_0, S as __shared0_1, default as __shared0_2 } from "pkg";');
    expect(source).not.toContain('require("pkg")');
    expect(source).toContain('createLazySharedFacade(["A","S","default"]');
    expect(source).toContain('case 1: return __shared0_1;');
    expect(source).toContain('registerLazyShared("cjs", function () { return require("cjs"); });');
    expect(warnings).toEqual([expect.stringContaining("Lazy shared module 'cjs' is loaded with require()")]);
  });
});

function getPlugin(plugins: Plugin[], name: string): Plugin {
  const plugin = plugins.find((item) => item.name === name);
  if (plugin == null) {
    throw new Error(`Missing plugin ${name}`);
  }
  return plugin;
}
