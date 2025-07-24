import * as esbuild from 'esbuild';
import { logger } from '../../../logger';
import { getBundleOutputs } from '../../../utils/getBundleOutputs';
import { getSourcemapName } from '../../../utils/getSourcemapName';
import { BuildResult } from '../../types';
import { PluginOptions } from '../types';

export interface BuildStatusPluginOptions {
  onPrepare: () => void | Promise<void>;
  onStart: () => void | Promise<void>;
  onLoad: (loadData: { moduleCount: number }) => void | Promise<void>;
  onEnd: (buildResult: BuildResult) => void | Promise<void>;
}

export function buildStatusPlugin({ context, ...hooks }: PluginOptions<BuildStatusPluginOptions>): esbuild.Plugin {
  return {
    name: 'build-status-plugin',
    setup(build) {
      let buildStartedAt = 0;
      let moduleCount = 0;

      build.onStart(async () => {
        logger.debug('Preparing build', { id: context.id });
        await hooks.onPrepare();

        moduleCount = 0;
        buildStartedAt = performance.now();
        logger.debug('Build started', { id: context.id, buildStartedAt });

        await hooks.onStart();
      });

      build.onLoad({ filter: /.*/ }, async () => {
        await hooks.onLoad({ moduleCount: ++moduleCount });
        return null;
      });

      build.onEnd(async (result) => {
        const endAt = performance.now();
        const { buildConfig } = context.config;
        const { outfile, sourcemapOutfile, platform, extra } = buildConfig;
        const { source, sourcemap } = getBundleOutputs(outfile, result);
        const duration = endAt - buildStartedAt;

        if (source && sourcemap) {
          /**
           * esbuild promise 가 fulfilled 처리되기 전에 onEnd 콜백에서 결과를 조작할 수 있음.
           *
           * @see {@link https://esbuild.github.io/plugins/#on-end}
           */
          Object.defineProperties(result, {
            bundle: { value: { source, sourcemap }, enumerable: true },
            outfile: { value: outfile, enumerable: true },
            sourcemapOutfile: { value: sourcemapOutfile ?? getSourcemapName(outfile), enumerable: true },
            platform: { value: platform, enumerable: true },
            extra: { value: extra, enumerable: true },
            totalModuleCount: { value: moduleCount, enumerable: true },
            duration: { value: duration, enumerable: true },
            size: { value: source.contents.byteLength, enumerable: true },
          });

          logger.debug('Build completed', { id: context.id });

          await hooks.onEnd(result as unknown as BuildResult);
        } else {
          throw new Error('invalid bundle result');
        }
      });
    },
  };
}
