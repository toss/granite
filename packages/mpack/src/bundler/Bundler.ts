import * as path from 'path';
import { isNotNil } from 'es-toolkit';
import * as esbuild from 'esbuild';
import { PluginDriver } from './PluginDriver';
import { buildStatusPlugin, dependencyAliasPlugin, requireContextPlugin, transformPlugin } from './plugins';
import type { BuildResult } from './types';
import {
  SOURCE_EXTENSIONS,
  ASSET_EXTENSIONS,
  RESOLVER_MAIN_FIELDS,
  RESOLVER_EXPORTS_MAP_CONDITIONS,
} from '../constants';
import { logger } from '../logger';
import { BundlerConfig, INTERNAL__Id } from '../types';
import { Plugin } from '../types/Plugin';
import { getId } from '../utils/getId';
import { PromiseHandler } from '../utils/promiseHandler';
import { combineWithBaseBuildConfig } from './internal/presets';

type BundlerStatus = 'idle' | 'prepared' | 'building';

export class Bundler {
  private id: INTERNAL__Id;
  private revisionId = 0;
  private status: BundlerStatus = 'idle';
  private pluginDriver: PluginDriver;
  private esbuildContext: esbuild.BuildContext | null = null;
  private bundleTask: PromiseHandler<BuildResult> | null = null;

  constructor(private config: BundlerConfig) {
    const id = getId(config);

    this.id = id;
    this.pluginDriver = new PluginDriver(id);
    this.config.buildConfig.entry = path.resolve(this.config.rootDir, this.config.buildConfig.entry);
    this.config.buildConfig.outfile = path.resolve(this.config.rootDir, this.config.buildConfig.outfile);
    this.config.buildConfig = combineWithBaseBuildConfig(this.config, {
      rootDir: this.config.rootDir,
      dev: this.config.dev,
    });

    logger.debug('Bundler.constructor', { id, config });
  }

  async build(options?: { withDispose?: boolean }) {
    const { withDispose = true } = options ?? {};

    if (this.esbuildContext == null) {
      this.esbuildContext = await esbuild.context(this.getBaseBuildOptions());
    }

    if (this.status === 'prepared' || this.status === 'building') {
      this.bundleTask?.abort();
    }

    this.bundleTask = new PromiseHandler(this.revisionId++);
    this.esbuildContext.rebuild();
    this.status = 'prepared';

    const result = await this.bundleTask.wait();
    await (withDispose && this.esbuildContext.dispose());

    return result;
  }

  getId() {
    return this.id;
  }

  addPlugin(plugin: Plugin) {
    this.pluginDriver.addPlugin(plugin);
    return this;
  }

  private getBaseBuildOptions(): esbuild.BuildOptions {
    const { rootDir, metafile, buildConfig } = this.config;
    const { platform, entry, outfile = 'bundle.js', esbuild = {} } = buildConfig;
    const { prelude: _, ...esbuildOptions } = esbuild;

    const platforms = [platform, 'native', 'react-native'] as const;
    const supportedExtensions = [...SOURCE_EXTENSIONS, ...ASSET_EXTENSIONS];
    const pluginContext = { id: this.id, config: this.config };

    /**
     * 모듈 resolution 시 아래와 같은 순서로 처리하기 위한 구성 (.ts 기준)
     *
     * - (1) .{platform}.ts
     * - (2) .native.ts
     * - (3) .react-native.ts
     * - (4) .ts
     */
    const resolveExtensions = [
      ...platforms.map((platform) => supportedExtensions.map((ext) => `.${platform}${ext}` as const)),
      ...supportedExtensions,
    ].flat();

    this.setupEnvironment();

    return {
      entryPoints: [path.resolve(rootDir, entry)],
      outfile: path.resolve(rootDir, outfile),
      sourcemap: true,
      sourcesContent: true,
      bundle: true,
      resolveExtensions,
      mainFields: RESOLVER_MAIN_FIELDS,
      conditions: RESOLVER_EXPORTS_MAP_CONDITIONS,
      target: 'hermes0.11',
      format: 'iife',
      loader: {
        /**
         * 토스에서는 에셋을 로컬에서 로드하지 않고 Remote 에서
         * 로드하기 때문에 empty loader 를 사용하여 에셋을 번들링 결과에서 제외
         *
         * @see docs {@link https://esbuild.github.io/content-types/#empty-file}
         */
        ...Object.fromEntries(ASSET_EXTENSIONS.map((ext) => [ext, 'empty'])),
      },
      supported: {
        'const-and-let': false,
      },
      legalComments: 'none',
      jsx: 'automatic',
      logLevel: 'silent',
      ...esbuildOptions,
      /**
       * 번들 결과를 파일 시스템에 저장하지 않고 메모리 내에 들고 처리하기 위해 false 로 지정
       *
       * - 빌드: 메모리의 있는 번들 직접 File System에 쓰기
       * - 개발 서버: 메모리에서 번들 로드
       *
       * @see {@link https://esbuild.github.io/api/#write}
       * @see {handleEnd}
       */
      write: false,
      metafile,
      plugins: [
        buildStatusPlugin({
          context: pluginContext,
          onPrepare: () => this.handlePrepare(),
          onStart: () => this.handleStart(),
          onLoad: (moduleCount) => this.handleLoad(moduleCount),
          onEnd: (buildResult) => this.handleEnd(buildResult),
        }),
        dependencyAliasPlugin({ context: pluginContext }),
        requireContextPlugin(),
        transformPlugin({
          context: pluginContext,
          transformSync: buildConfig.transformSync,
          transformAsync: buildConfig.transformAsync,
        }),
        ...(esbuildOptions?.plugins ?? []),
      ].filter(isNotNil),
    };
  }

  private setupEnvironment() {
    const envString = (this.config.dev ?? true) ? 'development' : 'production';

    /**
     * babel 플러그인에서 환경변수 값을 참조하고 있기에 값을 지정해주어야 함
     * (reanimated 등 env 에 영향을 받는 경우가 있음)
     *
     * @see {@link https://github.com/babel/babel/blob/v7.23.0/packages/babel-core/src/config/helpers/environment.ts#L2}
     */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    process.env.NODE_ENV = envString;
    process.env.BABEL_ENV = envString;
  }

  private handlePrepare() {
    this.status = 'prepared';
    this.pluginDriver.hookSync('prepare', [this.config]);
  }

  private handleStart() {
    this.status = 'building';
    this.pluginDriver.hookSync('buildStart', []);
  }

  private handleLoad({ moduleCount }: { moduleCount: number }) {
    this.pluginDriver.hookSync('load', [moduleCount]);
  }

  private handleEnd(buildResult: BuildResult) {
    this.status = 'idle';
    this.bundleTask?.done(buildResult);
    this.pluginDriver.hookSync('buildEnd', [buildResult]);
  }
}
