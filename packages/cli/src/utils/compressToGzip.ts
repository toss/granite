import fs from 'fs';
import path from 'path';
import stream from 'stream';
import util from 'util';
import zlib from 'zlib';

interface CompressToGzipOptions {
  rootDir: string;
  filePath: string;
}

const pipelinePromisify = util.promisify(stream.pipeline);

export async function compressToGzip(options: CompressToGzipOptions) {
  const { rootDir, filePath } = options;
  const inputPath = path.resolve(rootDir, filePath);
  const outfile = `${inputPath}.gz`;

  await pipelinePromisify(fs.createReadStream(inputPath), zlib.createGzip({ level: 9 }), fs.createWriteStream(outfile));

  return { outfile };
}
