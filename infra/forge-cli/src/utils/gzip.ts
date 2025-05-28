// gzipUtil.ts
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';

/**
 * Compresses inputFile using gzip and saves it to outputFile.
 *
 * @param {string} inputFile  - Path to the source file to compress
 * @param {string} outputFile - Path to save the gzipped file (recommended to use .gz extension)
 * @throws Throws an error if compression fails
 */
export async function gzipFile({ inputFile, outputFile }: { inputFile: string; outputFile: string }): Promise<void> {
  await pipeline(createReadStream(inputFile), createGzip(), createWriteStream(outputFile));
}
