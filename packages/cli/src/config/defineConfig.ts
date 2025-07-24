import path from 'path';
import type {
  DevServerConfig,
  MetroDevServerConfig,
  AdditionalMetroConfig,
  BuildConfig as InternalBuildConfig,
} from '@granite-js/mpack';
import {
  resolvePlugins,
  mergeConfig,
  type GranitePluginBuildPostHandler,
  type GranitePluginBuildPreHandler,
  type GranitePluginDevPostHandler,
  type GranitePluginDevPreHandler,
  type BuildConfig,
  type PluginInput,
} from '@granite-js/plugin-core';
import { getPackageRoot } from '@granite-js/utils';
import { isNotNil } from 'es-toolkit';
import { z } from 'zod';
import { prepareGraniteGlobalsScript } from './graniteGlobals';

const graniteConfigSchema = z.object({
  cwd: z.string().default(process.cwd()),
  appName: z.string(),
  scheme: z.string(),
  outdir: z.string().default('dist'),
  entryFile: z.string().default('./src/_app.tsx'),
  build: z.custom<BuildConfig>().optional(),
  devServer: z.custom<DevServerConfig>().optional(),
  metro: z.custom<AdditionalMetroConfig & MetroDevServerConfig>().optional(),
  plugins: z.custom<PluginInput>(),
});

export type GraniteConfig = z.input<typeof graniteConfigSchema>;
export type CompleteGraniteConfig = Omit<z.output<typeof graniteConfigSchema>, 'build' | 'plugins'> & {
  build: Omit<InternalBuildConfig, 'platform' | 'outfile'>;
  pluginHooks: GranitePluginHooks;
};

export interface GranitePluginHooks {
  devServer: {
    preHandlers: GranitePluginDevPreHandler[];
    postHandlers: GranitePluginDevPostHandler[];
  };
  build: {
    preHandlers: GranitePluginBuildPreHandler[];
    postHandlers: GranitePluginBuildPostHandler[];
  };
}

/**
 * @public
 * @category Configuration
 * @name defineConfig
 * @description
 * Configures your Granite application by defining key settings in `granite.config.ts`.
 *
 * The configuration lets you specify:
 * - How users will access your app through a URL scheme (e.g. `granite://`)
 * - Your app's unique name that appears in the URL (e.g. `granite://my-service`)
 * - Build settings for bundlers like ESBuild and Metro
 * - Code transformation settings through Babel
 * - Additional functionality through Granite plugins
 *
 * @param config - Configuration options
 * @param config.cwd - Working directory for build process (defaults to process.cwd())
 * @param config.appName - Your app's unique identifier
 * @param config.scheme - URL scheme for launching your app (e.g. 'granite')
 * @param config.outdir - Where to output build files (defaults to 'dist')
 * @param config.entryFile - Your app's entry point (defaults to './src/_app.tsx')
 * @param config.build - Customize build settings
 * @param config.metro - Configure Metro bundler settings
 * @param config.devServer - Configure Mpack dev server settings
 * @param config.plugins - Granite plugins to enhance functionality
 * @returns The processed configuration
 *
 * @example
 * Here's a basic configuration that:
 * - Makes your app accessible via the `granite://` scheme
 * - Names your service "my-app" so it's reachable at `granite://my-app`
 * - Uses the Hermes plugin to optimize JavaScript bundles into bytecode
 *
 * ```ts
 * import { defineConfig } from '@granite-js/react-native/config';
 * import { hermes } from '@granite-js/plugin-hermes';
 *
 * export default defineConfig({
 *   // The name of your microservice
 *   appName: 'my-app',
 *   // The URL scheme for deep linking
 *   scheme: 'granite',
 *   // Entry file path
 *   entryFile: 'index.ts',
 *   // Array of plugins to use
 *   plugins: [hermes()],
 * });
 * ```
 */
export const defineConfig = async (config: GraniteConfig): Promise<CompleteGraniteConfig> => {
  const parsed = graniteConfigSchema.parse(config);

  const cwd = parsed.cwd ?? getPackageRoot();
  const appName = parsed.appName;
  const scheme = parsed.scheme;
  const entryFile = path.resolve(cwd, parsed.entryFile);
  const outdir = path.join(cwd, parsed.outdir);
  const parsedBuildConfig = parsed.build;
  const parsedDevServerConfig = parsed.devServer;
  const parsedMetroConfig = parsed.metro;
  const parsedConfig = {
    ...parsedBuildConfig,
    devServer: parsedDevServerConfig,
    metro: parsedMetroConfig,
  };

  const { configs, pluginHooks } = await resolvePlugins(parsed.plugins);
  const globalsScriptConfig = prepareGraniteGlobalsScript({ rootDir: cwd, appName, scheme });
  const mergedConfig = mergeConfig(parsedConfig, ...[globalsScriptConfig, ...configs].filter(isNotNil));
  const { metro, devServer, ...buildConfig } = mergedConfig ?? {};

  return {
    cwd,
    entryFile,
    appName,
    scheme,
    outdir,
    devServer,
    pluginHooks,
    build: {
      ...buildConfig,
      entry: entryFile,
    },
    metro: {
      ...metro,
      babelConfig: mergedConfig?.babel,
      transformSync: mergedConfig?.transformer?.transformSync,
    },
  };
};
