import type { BuildResult } from '@granite-js/plugin-core';
import * as esbuild from 'esbuild';
import { logger } from '../../../logger';
import { getBundleOutputs } from '../../../utils/getBundleOutputs';
import { getSourcemapName } from '../../../utils/getSourcemapName';
import type { PluginOptions } from '../types';

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
        const duration = endAt - buildStartedAt;
        const { buildConfig } = context.config;
        const { outfile, sourcemapOutfile, platform, extra } = buildConfig;
        const { source, sourcemap } = getBundleOutputs(outfile, result);
        const buildResult = extendBuildResult(
          result,
          source && sourcemap
            ? {
                bundle: { source, sourcemap },
                outfile,
                sourcemapOutfile: sourcemapOutfile ?? getSourcemapName(outfile),
                platform,
                extra,
                duration,
                size: source.contents.byteLength,
                totalModuleCount: moduleCount,
              }
            : { platform, extra, duration }
        );

        await hooks.onEnd(buildResult);
      });
    },
  };
}

function extendBuildResult(result: esbuild.BuildResult, properties: Record<string, unknown>): BuildResult {
  /**
   * Can define properties to the result object before it is fulfilled.
   *
   * @see {@link https://esbuild.github.io/plugins/#on-end}
   */
  return Object.defineProperties(
    result,
    Object.fromEntries(Object.entries(properties).map(([property, value]) => [property, { value, enumerable: true }]))
  ) as BuildResult;
}
