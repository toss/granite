import * as fs from 'fs/promises';
import * as path from 'path';
import { BuildResult } from '@granite-js/mpack';

export async function writeMetafile(buildResult: BuildResult) {
  if (buildResult.metafile == null) {
    return;
  }

  const metafilePath = buildResult.outfile.replace(new RegExp(`${path.extname(buildResult.outfile)}$`), '.json');

  await fs.writeFile(metafilePath, JSON.stringify(buildResult.metafile), 'utf-8');

  return metafilePath;
}
