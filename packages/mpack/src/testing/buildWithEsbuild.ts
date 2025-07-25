import assert from 'assert';
import type { BuildConfig } from '@granite-js/plugin-core';
import { omit, toMerged } from 'es-toolkit';
import * as esbuild from 'esbuild';

export async function buildWithEsbuild(buildConfig: BuildConfig, options?: esbuild.BuildOptions) {
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

  const output = result.outputFiles?.[0]?.contents;

  assert(output, 'output contents is empty');

  return Buffer.from(output).toString();
}
