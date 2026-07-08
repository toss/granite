import { SourceMapConsumer, SourceMapGenerator } from 'source-map';
import type { ScopeBundleTransform } from './scopeBundle';

export async function transformSourcemap(sourcemap: string, transform: ScopeBundleTransform) {
  const rawSourcemap = JSON.parse(sourcemap);
  const consumer = await new SourceMapConsumer(rawSourcemap);
  const generator = new SourceMapGenerator({
    file: rawSourcemap.file,
    sourceRoot: rawSourcemap.sourceRoot,
  });
  const originalLineStarts = getLineStarts(transform.originalSource);
  const transformedLineStarts = getLineStarts(transform.source);

  try {
    consumer.eachMapping((mapping) => {
      if (mapping.source == null || mapping.originalLine == null || mapping.originalColumn == null) {
        return;
      }

      const generatedIndex = positionToIndex(originalLineStarts, mapping.generatedLine, mapping.generatedColumn);
      const transformedIndex = transformGeneratedIndex(generatedIndex, transform);

      if (transformedIndex == null) {
        return;
      }

      generator.addMapping({
        generated: indexToPosition(transformedLineStarts, transformedIndex),
        original: {
          line: mapping.originalLine,
          column: mapping.originalColumn,
        },
        source: mapping.source,
        name: mapping.name ?? undefined,
      });
    });

    for (const source of consumer.sources) {
      const sourceContent = consumer.sourceContentFor(source, true);

      if (sourceContent != null) {
        generator.setSourceContent(source, sourceContent);
      }
    }

    return withSourcemapMetadata(generator.toString(), rawSourcemap);
  } finally {
    consumer.destroy();
  }
}

function withSourcemapMetadata(sourcemap: string, rawSourcemap: Record<string, unknown>) {
  const result = JSON.parse(sourcemap);

  for (const property of ['debugId', 'ignoreList', 'x_google_ignoreList']) {
    if (rawSourcemap[property] != null) {
      result[property] = rawSourcemap[property];
    }
  }

  return JSON.stringify(result);
}

function transformGeneratedIndex(generatedIndex: number, transform: ScopeBundleTransform) {
  if (generatedIndex < transform.statementStartIndex) {
    return generatedIndex;
  }

  if (generatedIndex >= transform.bodyStartIndex && generatedIndex < transform.bodyEndIndex) {
    return transform.transformedBodyStartIndex + (generatedIndex - transform.bodyStartIndex);
  }

  if (generatedIndex >= transform.statementEndIndex) {
    return transform.transformedSuffixStartIndex + (generatedIndex - transform.statementEndIndex);
  }

  return null;
}

function getLineStarts(source: string) {
  const lineStarts = [0];

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') {
      lineStarts.push(index + 1);
    }
  }

  return lineStarts;
}

function positionToIndex(lineStarts: readonly number[], line: number, column: number) {
  return (lineStarts[line - 1] ?? 0) + column;
}

function indexToPosition(lineStarts: readonly number[], index: number) {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if ((lineStarts[middle] ?? 0) <= index) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const lineIndex = Math.max(0, high);

  return {
    line: lineIndex + 1,
    column: index - (lineStarts[lineIndex] ?? 0),
  };
}
