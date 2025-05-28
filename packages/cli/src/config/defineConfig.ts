import path from 'path';
import {
  babelConfigSchema,
  esbuildConfigSchema,
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
import { service } from '../presets/service';
import { shared } from '../presets/shared';

const graniteConfigSchema = z.object({
  appName: z.string(),
  scheme: z.string(),
  plugins: z.custom<PluginInput>(),
  outdir: z.string().default('dist'),
  entryFile: z.string().default('./src/_app.tsx'),
  cwd: z.string().default(process.cwd()),
  mpack: mpackConfigScheme.optional(),
  babel: babelConfigSchema.optional(),
  esbuild: esbuildConfigSchema.optional(),
  metro: z.custom<Partial<AdditionalMetroConfig>>().optional(),
  INTERNAL__useSharedPreset: z.boolean().optional(),
});

export type GraniteConfigInput = z.input<typeof graniteConfigSchema> & {
  /**
   * @internal
   */
  INTERNAL__useSharedPreset?: boolean;
};

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

export const defineConfig = async (config: GraniteConfigInput): Promise<GraniteConfigResponse> => {
  const parsedConfig = graniteConfigSchema.parse(config);

  const appName = parsedConfig.appName;
  const scheme = parsedConfig.scheme;
  const outdir = path.join(getPackageRoot(), parsedConfig.outdir);
  const entryFile = parsedConfig.entryFile;

  const plugins = await flattenPlugins(parsedConfig.plugins);
  const mergedConfig = await mergeConfigFromPlugins(plugins);
  const mergedTransform = await mergeTransformFromPlugins(plugins);

  const esbuild = mergedConfig?.esbuild ? merge(mergedConfig.esbuild, parsedConfig?.esbuild ?? {}) : void 0;
  const metro = mergedConfig?.metro ? merge(mergedConfig.metro, parsedConfig?.metro ?? {}) : void 0;
  const babel = mergedConfig?.babel ? merge(mergedConfig.babel, parsedConfig?.babel ?? {}) : void 0;
  const mpackDevServer = mergedConfig?.mpack?.devServer
    ? merge(mergedConfig?.mpack?.devServer ?? {}, parsedConfig?.mpack?.devServer ?? {})
    : void 0;

  const buildPreset = config.INTERNAL__useSharedPreset ? shared : service;
  const createTask = (platform: 'ios' | 'android'): TaskConfig => ({
    tag: `${appName}-${platform}`,
    presets: [buildPreset()],
    build: {
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
          services: {
            /* TODO: Plugin 구조로 변경 필요 */
            sentry: {
              enabled: false,
            },
          },
          devServer: {
            presets: [buildPreset()],
            build: {
              entry: entryFile,
            },
          },
          tasks: [],
        },
      },
      build: {
        config: {
          appName,
          scheme,
          services: {
            /* TODO: Plugin 구조로 변경 필요 */
            sentry: {
              enabled: false,
            },
          },
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
