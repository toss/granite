import assert from 'assert';
import type { BuildConfig } from '@granite-js/plugin-core';
import { omit, toMerged } from 'es-toolkit';
import * as esbuild from 'esbuild';

export type BuildWithEsbuildResult = esbuild.BuildResult & {
  readonly code: string;
};

export async function buildWithEsbuild(
  buildConfig: BuildConfig,
  options?: esbuild.BuildOptions
): Promise<BuildWithEsbuildResult> {
  let esbuildOptions = options;

  if (buildConfig?.esbuild) {
    esbuildOptions = toMerged(omit(buildConfig.esbuild, ['prelude']), options ?? {});
  }

  const result = await esbuild.build({
    ...esbuildOptions,
    entryPoints: [buildConfig.entry],
    bundle: true,
    write: false,
  });

  let code: string | undefined;

  Object.defineProperty(result, 'code', {
    get() {
      const output = result.outputFiles?.[0]?.contents;
      assert(output, 'output contents is empty');

      code ??= Buffer.from(output).toString();
      return code;
    },
  });

  return result as BuildWithEsbuildResult;
}
