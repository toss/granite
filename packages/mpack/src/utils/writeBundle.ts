import * as fs from 'fs/promises';
import * as path from 'path';
import type { BundleData } from '@granite-js/plugin-core';
import type { Metafile } from 'esbuild';
import { getSourcemapName } from './getSourcemapName';

export async function writeBundle(outputPath: string, { source, sourcemap }: BundleData) {
  await createDirectories(path.dirname(outputPath));

  const baseDirectory = path.dirname(outputPath);
  const basename = path.basename(outputPath);

  await Promise.all([
    fs.writeFile(outputPath, source.contents, 'utf-8'),
    fs.writeFile(path.join(baseDirectory, getSourcemapName(basename)), sourcemap.contents, 'utf-8'),
  ]);
}

export async function writeMetafile(outputPath: string, metafile: Metafile) {
  const outputDir = path.dirname(outputPath);
  const extname = path.extname(outputPath);
  const destination = path.join(outputDir, `${path.basename(outputPath, extname)}-meta.json`);

  await createDirectories(outputDir);
  await fs.writeFile(destination, JSON.stringify(metafile, null, 2), 'utf-8');
}

function createDirectories(directoryPath: string) {
  return fs.mkdir(directoryPath, { recursive: true });
}
