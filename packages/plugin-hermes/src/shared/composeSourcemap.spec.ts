import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { encode, type SourceMapSegment } from '@jridgewell/sourcemap-codec';
import { SourceMapConsumer, SourceMapGenerator } from 'source-map';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeComposedSourcemap } from './composeSourcemap';

describe('Hermes sourcemap composition', () => {
  let directory: string;
  let jsPath: string;
  let hbcPath: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'granite-hermes-map-'));
    jsPath = path.join(directory, 'bundle.js.map');
    hbcPath = path.join(directory, 'bundle.hbc.map');
    const map = new SourceMapGenerator({ file: 'bundle.js' });
    map.addMapping({ generated: { line: 1, column: 0 }, original: { line: 10, column: 2 }, source: 'app.ts' });
    map.addMapping({ generated: { line: 2, column: 0 }, original: { line: 20, column: 4 }, source: 'app.ts' });
    map.setSourceContent('app.ts', 'original source');
    await fs.writeFile(jsPath, map.toString());
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it.each([false, true])('preserves valid mappings with missing Hermes locations: %s', async (missingLocation) => {
    await writeHermesMap([[0, 0, 0, 0], missingLocation ? [5, 0, -1, -1] : [5], [10, 0, 1, 0]]);

    await writeComposedSourcemap(jsPath, hbcPath);

    await SourceMapConsumer.with(await fs.readFile(hbcPath, 'utf8'), null, (consumer) => {
      expect(consumer.originalPositionFor({ line: 1, column: 0 })).toMatchObject({
        source: 'app.ts',
        line: 10,
        column: 2,
      });
      expect(consumer.originalPositionFor({ line: 1, column: 7 })).toMatchObject({
        source: null,
        line: null,
        column: null,
      });
      expect(consumer.originalPositionFor({ line: 1, column: 10 })).toMatchObject({
        source: 'app.ts',
        line: 20,
        column: 4,
      });
      expect(consumer.sourceContentFor('app.ts')).toBe('original source');
    });
  });

  it.each<SourceMapSegment>([
    [0, 0, 0, -1],
    [0, -1, -1, -1],
  ])('still rejects malformed mapping %j', async (...segment) => {
    await writeHermesMap([segment]);
    await expect(writeComposedSourcemap(jsPath, hbcPath)).rejects.toThrow(/negative/);
  });

  it('preserves files, columns, names and source content on both sides of an unmapped interval', async () => {
    const map = new SourceMapGenerator({ file: 'bundle.js', sourceRoot: '/sources' });
    map.addMapping({
      generated: { line: 1, column: 0 },
      original: { line: 7, column: 3 },
      source: 'initializer.ts',
      name: 'initializeValue',
    });
    map.addMapping({
      generated: { line: 1, column: 20 },
      original: { line: 42, column: 8 },
      source: 'method.ts',
      name: 'run',
    });
    map.setSourceContent('initializer.ts', 'initializer source');
    map.setSourceContent('method.ts', 'method source');
    await fs.writeFile(jsPath, map.toString());
    await writeHermesMap([
      [0, 0, 0, 0],
      [5, 0, -1, -1],
      [10, 0, 0, 20],
    ]);

    await writeComposedSourcemap(jsPath, hbcPath);

    await SourceMapConsumer.with(await fs.readFile(hbcPath, 'utf8'), null, (consumer) => {
      for (const column of [0, 4]) {
        expect(consumer.originalPositionFor({ line: 1, column })).toEqual({
          source: '/sources/initializer.ts',
          line: 7,
          column: 3,
          name: 'initializeValue',
        });
      }
      for (const column of [5, 9]) {
        expect(consumer.originalPositionFor({ line: 1, column })).toEqual({
          source: null,
          line: null,
          column: null,
          name: null,
        });
      }
      for (const column of [10, 11]) {
        expect(consumer.originalPositionFor({ line: 1, column })).toEqual({
          source: '/sources/method.ts',
          line: 42,
          column: 8,
          name: 'run',
        });
      }
      expect(consumer.sourceContentFor('/sources/initializer.ts')).toBe('initializer source');
      expect(consumer.sourceContentFor('/sources/method.ts')).toBe('method source');
    });
  });

  it('produces the same composed map as explicit unmapped segments across multiple bytecode lines', async () => {
    async function compose(missingLocation: boolean) {
      await fs.writeFile(
        hbcPath,
        JSON.stringify({
          version: 3,
          sources: ['bundle.js'],
          names: [],
          mappings: encode([
            [[0, 0, 0, 0], missingLocation ? [5, 0, -1, -1] : [5], missingLocation ? [6, 0, -1, -1] : [6]],
            [[0, 0, 1, 0]],
          ]),
        })
      );
      await writeComposedSourcemap(jsPath, hbcPath);
      return fs.readFile(hbcPath, 'utf8');
    }
    const explicit = await compose(false);
    expect(await compose(true)).toBe(explicit);
    await SourceMapConsumer.with(explicit, null, (consumer) => {
      expect(consumer.originalPositionFor({ line: 1, column: 6 }).source).toBeNull();
      expect(consumer.originalPositionFor({ line: 2, column: 0 })).toMatchObject({
        source: 'app.ts',
        line: 20,
        column: 4,
      });
    });
  });

  async function writeHermesMap(segments: SourceMapSegment[]) {
    await fs.writeFile(
      hbcPath,
      JSON.stringify({ version: 3, sources: ['bundle.js'], names: [], mappings: encode([segments]) })
    );
  }
});
