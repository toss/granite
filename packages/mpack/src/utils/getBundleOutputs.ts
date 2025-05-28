import * as path from 'path';
import * as esbuild from 'esbuild';
import { getSourcemapName } from './getSourcemapName';
import type { BuildResult } from '../bundler/types';

export function getBundleOutputs(outputFile: string, buildResult: esbuild.BuildResult) {
  const filename = path.basename(outputFile);
  const outputFiles = buildResult.outputFiles;
  const source = findOutputFile(filename, outputFiles);
  const sourcemap = findOutputFile(getSourcemapName(filename), outputFiles);

  return { source, sourcemap };
}

function findOutputFile(targetFile: string, outputFiles: BuildResult['outputFiles']) {
  return outputFiles?.find((outfile) => outfile.path.endsWith(targetFile));
}
