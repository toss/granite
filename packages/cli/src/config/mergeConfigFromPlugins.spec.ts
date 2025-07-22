import { flattenPlugins } from '@granite-js/plugin-core';
import type { HandleFunction } from "connect";
import { describe, expect, it } from 'vitest';
import { mergeConfigFromPlugins } from './mergeConfigFromPlugins';

describe('mergeConfigFromPlugins', () => {
  it('can merge config from a single plugin', async () => {
    const plugins = await flattenPlugins([
      {
        name: 'plugin-1',
        config: {
          babel: {
            plugins: ['plugin-1'],
          },
        },
      },
    ]);

    const result = await mergeConfigFromPlugins(plugins);
    expect(result).toEqual({
      babel: {
        plugins: ['plugin-1'],
      },
    });
  });

  it('can merge config from multiple plugins', async () => {
    const middleware1: HandleFunction = () => {};
    const middleware2: HandleFunction = () => {};

    
    const plugins = await flattenPlugins([
      {
        name: 'plugin-1',
        config: {
          babel: {
            plugins: ['plugin-1'],
          },
          esbuild: {
            banner: {
              js: 'console.log("banner:plugin-1");',
            },
            footer: {
              js: 'console.log("footer:plugin-1");',
            },
          },
        },
      },
      {
        name: 'plugin-2',
        config: {
          babel: {
            plugins: ['plugin-2'],
            presets: ['preset-1'],
          },
          esbuild: {
            banner: {
              js: 'console.log("banner:plugin-2");',
            },
            footer: {
              js: 'console.log("footer:plugin-2");',
            },
          },
        },
      },
      Promise.resolve({
        name: 'plugin-3',
        config: {
          mpack: {
            devServer: {
              middlewares: [middleware1, middleware2],
            },
          },
        },
      }),
    ]);

    const result = await mergeConfigFromPlugins(plugins);
    expect(result).toEqual({
      babel: {
        plugins: ['plugin-1', 'plugin-2'],
        presets: ['preset-1'],
      },
      esbuild: {
        banner: {
          js: 'console.log("banner:plugin-1");\nconsole.log("banner:plugin-2");',
        },
        footer: {
          js: 'console.log("footer:plugin-1");\nconsole.log("footer:plugin-2");',
        },
      },
      mpack: {
        devServer: {
          middlewares: [middleware1, middleware2],
        },
      },
    });
  });

  it('can handle promise-wrapped plugins', async () => {
    const plugins = await flattenPlugins([
      Promise.resolve({
        name: 'plugin-1',
        config: {
          babel: {
            plugins: ['plugin-1'],
          },
        },
      }),
    ]);

    const result = await mergeConfigFromPlugins(plugins);
    expect(result).toEqual({
      babel: {
        plugins: ['plugin-1'],
      },
    });
  });

  it('can handle nested plugin arrays', async () => {
    const plugins = await flattenPlugins([
      [
        {
          name: 'plugin-1',
          config: {
            babel: {
              plugins: ['plugin-1'],
            },
          },
        },
        {
          name: 'plugin-2',
          config: {
            babel: {
              presets: ['preset-1'],
            },
          },
        },
      ],
    ]);

    const result = await mergeConfigFromPlugins(plugins);
    expect(result).toEqual({
      babel: {
        plugins: ['plugin-1'],
        presets: ['preset-1'],
      },
    });
  });

  it('can handle plugins without config', async () => {
    const plugins = [
      {
        name: 'plugin-1',
        config: undefined,
      },
    ];

    const result = await mergeConfigFromPlugins(plugins);
    expect(result).toEqual({});
  });
});
