import path from 'path';
import {
  babelConfigSchema,
  esbuildConfigSchema,
  resolverConfigSchema,
  type AdditionalMetroConfig,
  type Config as MpackConfig,
  type TaskConfig,
} from '@granite-js/mpack';
import { flattenPlugins, mpackConfigScheme, type PluginInput } from '@granite-js/plugin-core';
import { getPackageRoot } from '@granite-js/utils';
import { HandleFunction } from 'connect';
import { merge } from 'es-toolkit';
import { z } from 'zod';
import { mergeConfigFromPlugins } from './mergeConfigFromPlugins';
import { mergeTransformFromPlugins } from './mergeTransformFromPlugins';

const graniteConfigSchema = z.object({
  appName: z.string(),
  scheme: z.string(),
  plugins: z.custom<PluginInput>(),
  outdir: z.string().default('dist'),
  entryFile: z.string().default('./src/_app.tsx'),
  cwd: z.string().default(process.cwd()),
  resolver: resolverConfigSchema.optional(),
  mpack: mpackConfigScheme.optional(),
  babel: babelConfigSchema.optional(),
  esbuild: esbuildConfigSchema.optional(),
  metro: z.custom<Partial<AdditionalMetroConfig>>().optional(),
});

export type GraniteConfigInput = z.input<typeof graniteConfigSchema>;

export interface GraniteConfigResponse extends z.infer<typeof graniteConfigSchema> {
  mpack: {
    devServer: {
      middlewares: HandleFunction[];
      config: MpackConfig;
    };
    build: {
      config: MpackConfig;
    };
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
 * @param config.appName - Your app's unique identifier
 * @param config.scheme - URL scheme for launching your app (e.g. 'granite')
 * @param config.plugins - Granite plugins to enhance functionality
 * @param config.outdir - Where to output build files (defaults to 'dist')
 * @param config.entryFile - Your app's entry point (defaults to './src/_app.tsx')
 * @param config.cwd - Working directory for build process (defaults to process.cwd())
 * @param config.mpack - Fine-tune mpack bundler behavior
 * @param config.babel - Customize Babel transpilation
 * @param config.esbuild - Adjust ESBuild bundling
 * @param config.metro - Configure Metro bundler settings
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
export const defineConfig = async (config: GraniteConfigInput): Promise<GraniteConfigResponse> => {
  const parsedConfig = graniteConfigSchema.parse(config);

  const appName = parsedConfig.appName;
  const scheme = parsedConfig.scheme;
  const outdir = path.join(getPackageRoot(), parsedConfig.outdir);
  const entryFile = parsedConfig.entryFile;

  const plugins = await flattenPlugins(parsedConfig.plugins);
  const mergedConfig = await mergeConfigFromPlugins(plugins);
  const mergedTransform = await mergeTransformFromPlugins(plugins);

  const resolver = mergedConfig?.resolver ? merge(mergedConfig.resolver, parsedConfig?.resolver ?? {}) : void 0;
  const esbuild = mergedConfig?.esbuild ? merge(mergedConfig.esbuild, parsedConfig?.esbuild ?? {}) : void 0;
  const metro = mergedConfig?.metro ? merge(mergedConfig.metro, parsedConfig?.metro ?? {}) : void 0;
  const babel = mergedConfig?.babel ? merge(mergedConfig.babel, parsedConfig?.babel ?? {}) : void 0;
  const mpackDevServer = mergedConfig?.mpack?.devServer
    ? merge(mergedConfig?.mpack?.devServer ?? {}, parsedConfig?.mpack?.devServer ?? {})
    : void 0;

  const createTask = (platform: 'ios' | 'android'): TaskConfig => ({
    tag: `${appName}-${platform}`,
    build: {
      resolver,
      esbuild,
      babel,
      platform,
      entry: entryFile,
      outfile: path.join(outdir, `bundle.${platform}.js`),
      transformSync: mergedTransform?.transformSync,
      transformAsync: mergedTransform?.transformAsync,
    },
  });

  return {
    ...parsedConfig,
    outdir,
    mpack: {
      devServer: {
        middlewares: (mpackDevServer?.middlewares as HandleFunction[]) ?? [],
        config: {
          appName,
          scheme,
          devServer: {
            build: {
              entry: entryFile,
              resolver,
              esbuild,
              babel,
              transformSync: mergedTransform?.transformSync,
              transformAsync: mergedTransform?.transformAsync,
            },
          },
          tasks: [],
        },
      },
      build: {
        config: {
          appName,
          scheme,
          concurrency: 2,
          tasks: [createTask('ios'), createTask('android')],
        },
      },
    },
    metro: {
      ...metro,
      babelConfig: babel,
      transformSync: mergedTransform?.transformSync,
    },
  };
};
