import type { Hooks, INTERNAL__Id, Plugin, PluginHooks } from '../types';

export class PluginDriver {
  private plugins: Plugin[] = [];

  constructor(private id: INTERNAL__Id) {}

  addPlugin(plugin: Plugin) {
    this.plugins.push(plugin);
  }

  hookSync<H extends Hooks>(hookName: H, parameters: Parameters<PluginHooks[H]>) {
    this.runHook(hookName, parameters);
  }

  private runHook<H extends Hooks>(hookName: H, parameters: Parameters<PluginHooks[H]>) {
    for (const plugin of this.plugins) {
      const handler = plugin[hookName];

      if (typeof handler === 'function') {
        (handler as (...args: Parameters<PluginHooks[H]>) => void).apply({ id: this.id }, parameters);
      }
    }
  }
}
