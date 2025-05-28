import type { GranitePluginCore } from '@granite-js/plugin-core';
import { describe, expect, it } from 'vitest';
import { mergeTransformFromPlugins } from './mergeTransformFromPlugins.js';

describe('mergeTransformFromPlugins', () => {
  it('can merge config from a single plugin', async () => {
    const plugin: GranitePluginCore = {
      name: 'plugin-1',
      transformSync: (id: string) => `sync#${id}`,
      transformAsync: (id: string) => Promise.resolve(`async#${id}`),
    };

    const result = await mergeTransformFromPlugins([plugin]);
    expect(result.transformSync('file-1.js', 'code')).toEqual('sync#file-1.js');
    expect(await result.transformAsync('file-2.js', 'code')).toEqual('async#file-2.js');
  });

  it('can merge config from multiple plugins', async () => {
    const plugins: GranitePluginCore[] = [
      {
        name: 'plugin-1',
        transformSync: (id: string) => `sync#${id}`,
        transformAsync: (id: string) => Promise.resolve(`async#${id}`),
      },
      {
        name: 'plugin-2',
        transformSync: (_id: string, code: string) => `${code}#sync-plugin-2`,
        transformAsync: (_id: string, code: string) => Promise.resolve(`${code}#async-plugin-2`),
      },
      {
        name: 'plugin-3',
        transformSync: (_id: string, code: string) => `${code}#3`,
        transformAsync: (_id: string, code: string) => Promise.resolve(`${code}#3`),
      },
    ];

    const result = await mergeTransformFromPlugins(plugins);
    expect(result.transformSync('file-1.js', 'code')).toEqual('sync#file-1.js#sync-plugin-2#3');
    expect(await result.transformAsync('file-2.js', 'code')).toEqual('async#file-2.js#async-plugin-2#3');
  });
});
