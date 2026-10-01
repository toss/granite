import * as fs from 'fs/promises';
import { SourceMapConsumer, SourceMapGenerator } from 'source-map';

export async function writeComposedSourcemap(jsSourcemapPath: string, hbcSourcemapPath: string) {
  const sourcemapContent = await composeSourcemap(jsSourcemapPath, hbcSourcemapPath);

  await fs.writeFile(hbcSourcemapPath, sourcemapContent, 'utf-8');
}

async function composeSourcemap(jsSourcemapPath: string, hbcSourcemapPath: string) {
  const [jsSourceMapContent, hbcSourceMapContent] = await Promise.all([
    fs.readFile(jsSourcemapPath, 'utf8'),
    fs.readFile(hbcSourcemapPath, 'utf8'),
  ]);

  const jsMapConsumer = await new SourceMapConsumer(jsSourceMapContent);
  const hermesMapConsumer = await new SourceMapConsumer(hbcSourceMapContent);

  const generator = SourceMapGenerator.fromSourceMap(hermesMapConsumer);

  generator.applySourceMap(jsMapConsumer, hermesMapConsumer.sources[0]);

  return generator.toString();
}
