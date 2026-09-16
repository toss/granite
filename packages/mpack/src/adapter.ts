import type { BundlerAdapter, BundlerBuildOption } from '@granite-js/config';
import type { MpackConfig } from './config';
import { loadMpackConfig } from './loadConfig';
import { build } from './operations/build';
import { runServer } from './operations/serve';
import { statusPlugin } from './plugins';
import { prepareConfig, type LegacyCompatibleBuildOption } from './prepareConfig';

export interface MpackConfigFileOptions extends Partial<Record<keyof MpackConfig, never>> {
  config?: string;
}

export interface MpackInlineOptions extends MpackConfig {
  config?: never;
}

export type MpackOptions = MpackConfigFileOptions | MpackInlineOptions;

/** @deprecated Retained for backward compatibility. */
export function mpack(options: MpackOptions = {}): BundlerAdapter {
  const hasInlineOptions = Object.keys(options).some((key) => key !== 'config');
  if (hasInlineOptions && options.config !== undefined) {
    throw new Error('Mpack config file options cannot be combined with inline configuration.');
  }
  const inlineConfig: MpackConfig | undefined = hasInlineOptions ? options : undefined;
  const configFile = options.config;

  return {
    name: 'mpack',
    async runBuild(buildOption: BundlerBuildOption) {
      const legacyBuildOption = buildOption as LegacyCompatibleBuildOption;
      const context = this.getContext();
      const userConfig =
        inlineConfig ??
        (await loadMpackConfig(context, {
          configFile,
          command: 'build',
          dev: buildOption.dev,
        }));
      const config = await prepareConfig(userConfig, context, {
        outdir: buildOption.outdir,
        outdirSuffix: buildOption.outdirSuffix,
        extra: buildOption.extra,
        legacyConfigs: legacyBuildOption.legacyConfigs,
      });
      return build({
        config,
        platform: buildOption.platform,
        outfile: buildOption.outfile ?? `bundle.${buildOption.platform}.js`,
        dev: buildOption.dev ?? false,
        cache: buildOption.cache ?? true,
        metafile: buildOption.metafile ?? false,
        plugins: [statusPlugin, ...(userConfig.buildPlugins ?? [])],
      });
    },
    async runServer(serverOptions) {
      const previousDevServer = process.env.MPACK_DEV_SERVER;
      process.env.MPACK_DEV_SERVER = 'true';
      const restoreDevServer = () => {
        if (previousDevServer == null) {
          delete process.env.MPACK_DEV_SERVER;
        } else {
          process.env.MPACK_DEV_SERVER = previousDevServer;
        }
      };

      const context = this.getContext();
      try {
        const userConfig = inlineConfig ?? (await loadMpackConfig(context, { configFile, command: 'serve' }));
        const config = await prepareConfig(userConfig, context);
        const server = await runServer({
          config,
          host: serverOptions.host,
          port: serverOptions.port,
          interactive: serverOptions.interactive,
        });
        return {
          close: () =>
            new Promise<void>((resolve, reject) => {
              try {
                server.close((error?: Error) => {
                  restoreDevServer();
                  if (error) {
                    reject(error);
                  } else {
                    resolve();
                  }
                });
              } catch (error) {
                restoreDevServer();
                reject(error);
              }
            }),
        };
      } catch (error) {
        restoreDevServer();
        throw error;
      }
    },
  };
}
