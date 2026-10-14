import * as fs from 'fs/promises';
import { decode, encode } from '@jridgewell/sourcemap-codec';
import { SourceMapConsumer, SourceMapGenerator, type RawSourceMap } from 'source-map';

export async function writeComposedSourcemap(jsSourcemapPath: string, hbcSourcemapPath: string) {
  const sourcemapContent = await composeSourcemap(jsSourcemapPath, hbcSourcemapPath);

  await fs.writeFile(hbcSourcemapPath, sourcemapContent, 'utf-8');
}

async function composeSourcemap(jsSourcemapPath: string, hbcSourcemapPath: string) {
  const [jsSourceMapContent, hbcSourceMapContent] = await Promise.all([
    fs.readFile(jsSourcemapPath, 'utf8'),
    fs.readFile(hbcSourcemapPath, 'utf8'),
  ]);

  return SourceMapConsumer.with(jsSourceMapContent, null, (jsMapConsumer) =>
    SourceMapConsumer.with(normalizeHermesLocations(hbcSourceMapContent), null, (hermesMapConsumer) => {
      const generator = SourceMapGenerator.fromSourceMap(hermesMapConsumer);
      generator.applySourceMap(jsMapConsumer, hermesMapConsumer.sources[0]);
      return generator.toString();
    })
  );
}

function normalizeHermesLocations(content: string): string {
  const map = JSON.parse(content) as RawSourceMap;
  const mappings = decode(map.mappings);
  let changed = false;
  for (const line of mappings) {
    for (let index = 0; index < line.length; index++) {
      const segment = line[index]!;
      // Hermes can emit (-1, -1) for synthesized class initializers without a source location.
      // Keep the unmapped boundary so these instructions do not inherit the preceding location.
      if (
        segment.length === 4 &&
        segment[1] >= 0 &&
        segment[1] < map.sources.length &&
        segment[2] === -1 &&
        segment[3] === -1
      ) {
        line[index] = [segment[0]];
        changed = true;
      }
    }
  }
  return changed ? JSON.stringify({ ...map, mappings: encode(mappings) }) : content;
}
