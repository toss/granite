import fs from 'fs';
import path from 'path';
import {
  createPluginHooksDriver,
  resolveConfig,
  resolveRollipopAdapterConfig,
  type BuildSuccessResult,
  type CompleteGraniteConfig,
} from '@granite-js/plugin-core';
import * as Rollipop from 'rollipop';

type Platform = 'android' | 'ios';

export interface RollipopBuildOptions {
  cache: boolean;
  dev: boolean;
  metafile: boolean;
}

export interface RollipopServerOptions {
  host?: string;
  port?: number;
  cache?: boolean;
}

export async function runRollipopServer(config: CompleteGraniteConfig, options: RollipopServerOptions) {
  const host = options.host;
  const port = options.port;
  const driver = createPluginHooksDriver(config);
  const resolvedPort = port ?? 8081;
  const resolvedHost = host ?? 'localhost';

  await driver.devServer.pre({ host: resolvedHost, port: resolvedPort });

  const rollipopConfig = await loadRollipopConfig(config, 'development');
  await Rollipop.runServer(rollipopConfig, { host, port, buildOptions: { cache: options.cache } });

  await driver.devServer.post({ host: resolvedHost, port: resolvedPort });
}

export async function runRollipopBuildAll(config: CompleteGraniteConfig, options: RollipopBuildOptions) {
  const driver = createPluginHooksDriver(config);
  const resolvedGraniteConfig = await resolveConfig(config, { command: 'build' });
  const rollipopConfig = await loadRollipopConfig(config, options.dev ? 'development' : 'production');
  const buildResults: BuildSuccessResult[] = [];

  await fs.promises.mkdir(config.outdir, { recursive: true });
  await driver.build.pre();

  for (const platform of ['android', 'ios'] as const) {
    const startedAt = Date.now();
    const outfile = path.resolve(config.outdir, `bundle.${platform}.js`);
    const sourcemapOutfile = `${outfile}.map`;
    const chunk = await Rollipop.runBuild(rollipopConfig, {
      platform,
      dev: options.dev,
      cache: options.cache,
      outfile,
      sourcemap: true,
      sourcemapOutfile,
      assetsDir: config.outdir,
    });

    const duration = Date.now() - startedAt;
    buildResults.push(
      createBuildResult({
        platform,
        outfile,
        sourcemapOutfile,
        code: chunk.code,
        sourcemap: fs.existsSync(sourcemapOutfile) ? fs.readFileSync(sourcemapOutfile, 'utf-8') : '',
        totalModuleCount: chunk.moduleIds.length,
        duration,
        extra: resolvedGraniteConfig.extra,
      })
    );
  }

  await driver.build.post({ buildResults });

  if (options.metafile) {
    console.warn('Rollipop experimental build does not emit mpack metafiles yet.');
  }

  return buildResults;
}

async function loadRollipopConfig(config: CompleteGraniteConfig, mode: NonNullable<Rollipop.Config['mode']>) {
  const defaultConfig = await Rollipop.getDefaultConfig(config.cwd, mode);
  const adapterConfig = await resolveRollipopAdapterConfig(config, {
    command: mode === 'development' ? 'serve' : 'build',
  });
  const userConfig = Rollipop.mergeConfig(
    adapterConfig as Rollipop.PluginFlattenConfig,
    (config.rollipopConfig ?? {}) as Rollipop.PluginFlattenConfig
  );
  const plugins = await Rollipop.flattenPluginOption(userConfig.plugins);
  const baseConfig = Rollipop.mergeConfig(defaultConfig, { ...userConfig, plugins });
  const pluginConfig = await Rollipop.resolvePluginConfig(baseConfig, plugins);
  const resolvedConfig = { ...pluginConfig, plugins };

  await Rollipop.invokeConfigResolved(resolvedConfig, plugins);

  return resolvedConfig;
}

function createBuildResult({
  platform,
  outfile,
  sourcemapOutfile,
  code,
  sourcemap,
  totalModuleCount,
  duration,
  extra,
}: {
  platform: Platform;
  outfile: string;
  sourcemapOutfile: string;
  code: string;
  sourcemap: string;
  totalModuleCount: number;
  duration: number;
  extra: unknown;
}): BuildSuccessResult {
  return {
    errors: [],
    warnings: [],
    outputFiles: undefined,
    metafile: undefined,
    mangleCache: undefined,
    bundle: {
      source: createOutputFile(outfile, code),
      sourcemap: createOutputFile(sourcemapOutfile, sourcemap),
    },
    outfile,
    sourcemapOutfile,
    platform,
    extra,
    totalModuleCount,
    duration,
    size: Buffer.byteLength(code),
  };
}

function createOutputFile(filePath: string, text: string): BuildSuccessResult['bundle']['source'] {
  return {
    path: filePath,
    contents: Buffer.from(text),
    hash: '',
    text,
  };
}
