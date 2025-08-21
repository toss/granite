import { describe, expect, it } from 'vitest';
import { resolveConfig } from './resolveConfig';
import { GranitePluginCore } from '../types';
import { resolvePlugins } from './resolvePlugins';

describe('resolveConfig', () => {
  const CONFIG_SHIMS = {
    appName: 'test',
    cwd: '/',
    entryFile: '/app.ts',
    outdir: '/dist',
    pluginHooks: {
      build: {
        preHandlers: [],
        postHandlers: [],
      },
      devServer: {
        preHandlers: [],
        postHandlers: [],
      },
    },
  };

  function dummyPlugin(): GranitePluginCore {
    let count = 0;

    return {
      name: 'dummy-plugin',
      config: () => {
        return {
          esbuild: {
            banner: {
              js: `console.log('dynamic config resolved #${++count}');`,
            },
          },
          babel: {
            plugins: ['foo', 'bar', 'baz'],
          },
          transformer: {
            transformSync: (_id, code) => {
              return [code + '// replaced code'].join('\n');
            },
          },
        };
      },
    };
  }

  it('should return resolved config', async () => {
    const { configs } = await resolvePlugins([dummyPlugin()]);

    const result1 = await resolveConfig({ ...CONFIG_SHIMS, pluginConfigs: configs });
    const result2 = await resolveConfig({ ...CONFIG_SHIMS, pluginConfigs: configs });

    const value1 = result1.esbuild?.banner?.js;
    const value2 = result2.esbuild?.banner?.js;

    expect(value1).toMatchInlineSnapshot(`"console.log('dynamic config resolved #1');"`);
    expect(value2).toMatchInlineSnapshot(`"console.log('dynamic config resolved #2');"`);
    expect(value1).not.toEqual(value2);
  });

  it('should resolve metro config', async () => {
    const { configs } = await resolvePlugins([dummyPlugin()]);

    const result = await resolveConfig({ ...CONFIG_SHIMS, pluginConfigs: configs });

    // Granite config
    expect(result.transformer?.transformSync).toBeDefined();
    expect(result.babel?.plugins).toEqual(['foo', 'bar', 'baz']);

    // Metro config (compatibilities)
    expect(result.metro?.transformSync).toBeDefined();
    expect(result.transformer?.transformSync?.('file.js', 'ident')).toEqual('ident// replaced code');
    expect(result.metro?.babelConfig?.plugins).toEqual(['foo', 'bar', 'baz']);
  });
});
