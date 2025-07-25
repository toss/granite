import type { CompleteGraniteConfig } from '../schema/pluginConfig';
import type {
  GranitePluginConfig,
  GranitePluginDevHandlerArgs,
  GranitePluginPostHandlerArgs,
  PluginContext,
} from '../types';

export function createPluginHooksDriver(config: CompleteGraniteConfig) {
  const context = createPluginContext();
  const { devServer: devServerHooks, build: buildHooks } = config.pluginHooks;
  const baseArgs = {
    cwd: config.cwd,
    appName: config.appName,
    entryFile: config.entryFile,
    outdir: config.outdir,
  };

  return {
    devServer: {
      pre: async (args: Omit<GranitePluginDevHandlerArgs, keyof GranitePluginConfig>) => {
        for (const handler of devServerHooks.preHandlers) {
          await handler.call(context, { ...baseArgs, ...args });
        }
      },
      post: async (args: Omit<GranitePluginDevHandlerArgs, keyof GranitePluginConfig>) => {
        for (const handler of devServerHooks.postHandlers) {
          await handler.call(context, { ...baseArgs, ...args });
        }
      },
    },
    build: {
      pre: async () => {
        for (const handler of buildHooks.preHandlers) {
          await handler.call(context, { ...baseArgs });
        }
      },
      post: async (args: Omit<GranitePluginPostHandlerArgs, keyof GranitePluginConfig>) => {
        for (const handler of buildHooks.postHandlers) {
          await handler.call(context, { ...baseArgs, ...args });
        }
      },
    },
  };
}

export function createPluginContext(): PluginContext {
  const meta = Object.create(null);
  const context: PluginContext = {
    meta,
  };

  return context;
}
