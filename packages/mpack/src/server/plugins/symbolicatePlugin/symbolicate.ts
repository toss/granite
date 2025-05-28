import path from 'path';
import { codeFrameColumns } from '@babel/code-frame';
import sourceMap, { MappedPosition } from 'source-map';
import { StackFrame } from './parseStackFrame';

interface CollapsedMappedPosition extends MappedPosition {
  /**
   * 소스맵 추적이 불가하거나, Private 한 코드인 경우 `collapse: true` 추가
   *
   * @see {@link https://github.com/facebook/react-native/blob/v0.72.6/packages/react-native/Libraries/LogBox/UI/LogBoxInspectorStackFrames.js#L40}
   */
  collapse: true;
}

interface CodeFrame {
  content: string;
  location: { column: number; row: number };
  fileName: string;
}

/**
 * React Native 클라이언트로부터 stack frame 을 전달받아 원본 코드와 매핑한 데이터로 반환
 *
 * @see {@link https://github.com/facebook/react-native/blob/v0.72.6/packages/react-native/Libraries/Core/Devtools/symbolicateStackTrace.js#L32-L47}
 * @see {@link https://github.com/facebook/react-native/blob/v0.72.6/packages/react-native/Libraries/LogBox/Data/LogBoxSymbolication.js#L24-L25}
 */
export async function symbolicate(rawSourcemap: Uint8Array, stackFrame: StackFrame[]) {
  const { stack, codeFrame } = await sourceMap.SourceMapConsumer.with(
    Buffer.from(rawSourcemap).toString('utf-8'),
    null,
    consumer => {
      const originalStackFrame = stackFrame.map(frame => {
        const originalPosition = consumer.originalPositionFor({
          column: frame.column,
          line: frame.lineNumber,
        });

        return originalPosition.line == null
          ? ({
              collapse: true,
              column: originalPosition.column ?? frame.column,
              line: originalPosition.line ?? frame.lineNumber,
              name: originalPosition.name ?? frame.methodName,
              source: originalPosition.source ?? frame.file,
            } as CollapsedMappedPosition)
          : (originalPosition as MappedPosition);
      });

      /**
       * @see {@link https://github.com/facebook/metro/blob/v0.80.8/packages/metro/src/Server.js#L1127-L1166}
       */
      const targetFrame = originalStackFrame.find(frame => !('collapse' in frame));
      const content = targetFrame?.source && consumer.sourceContentFor(targetFrame?.source);
      let codeFrame: CodeFrame | null = null;

      if (targetFrame != null && content != null) {
        codeFrame = {
          content: codeFrameColumns(content, { start: targetFrame }, { highlightCode: true }),
          location: { column: targetFrame.column, row: targetFrame.line },
          fileName: path.basename(targetFrame.source),
        };
      }

      return {
        /**
         * React Native 와 source-map 라이브러리가 서로 호환되지 않아, React Native 에 맞게 데이터 매핑
         */
        stack: originalStackFrame.map(({ column, line, source, name }) => ({
          column,
          lineNumber: line,
          file: source,
          methodName: name,
        })),
        codeFrame,
      };
    }
  );

  return { stack, codeFrame };
}
