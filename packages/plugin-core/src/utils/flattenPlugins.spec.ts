import { describe, it, expect } from 'vitest';
import { flattenPlugins } from './flattenPlugins';
import type { PluginInput } from '../core';

describe('flattenPlugins', () => {
  it('단일 플러그인을 처리할 수 있다', async () => {
    const plugin: PluginInput = {
      name: 'test',
    };

    const result = await flattenPlugins(plugin);
    expect(result).toEqual([plugin]);
  });

  it('플러그인 배열을 처리할 수 있다', async () => {
    const plugins: PluginInput = [{ name: 'test1' }, { name: 'test2' }];

    const result = await flattenPlugins(plugins);
    expect(result).toEqual(plugins);
  });

  it('Promise로 감싸진 플러그인을 처리할 수 있다', async () => {
    const plugin: PluginInput = {
      name: 'test',
    };

    const result = await flattenPlugins(Promise.resolve(plugin));
    expect(result).toEqual([plugin]);
  });

  it('Promise로 감싸진 플러그인 배열을 처리할 수 있다', async () => {
    const plugins: PluginInput = [{ name: 'test1' }, { name: 'test2' }];

    const result = await flattenPlugins(await Promise.resolve(plugins));
    expect(result).toEqual(plugins);
  });

  it('중첩된 플러그인 배열을 평탄화할 수 있다', async () => {
    const plugins = [{ name: 'test1' }, { name: 'test2' }];
    const plugins2 = Promise.resolve([{ name: 'test3' }, { name: 'test4' }]);

    const nestedPlugins: PluginInput = [plugins, plugins2 as any];
    const result = await flattenPlugins(nestedPlugins);
    expect(result).toEqual([{ name: 'test1' }, { name: 'test2' }, { name: 'test3' }, { name: 'test4' }]);
  });
});
