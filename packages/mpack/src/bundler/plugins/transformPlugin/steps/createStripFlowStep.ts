import path from 'path';
import * as babel from '@babel/core';
import * as sucrase from 'sucrase';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { defineStepName } from '../../../../utils/defineStepName';

interface StripFlowStepConfig {
  dev: boolean;
}

export function createStripFlowStep(config: StripFlowStepConfig): AsyncTransformStep {
  /**
   * 아래 flow 구문(import typeof)은 변환되지 않기에 import typeof 구문을 직접 필터링하여 제거
   *
   * ```js
   * import typeof foo from '...';
   * ```
   */
  const stripImportTypeofStatements = (code: string): string => {
    return code
      .split('\n')
      .filter((line) => !line.startsWith('import typeof '))
      .join('\n');
  };

  const stripFlowStep: AsyncTransformStep = async function stripFlow(code, args) {
    // .js 확장자인 경우에만 flow 구문 변환
    const shouldTransform = args.path.endsWith('.js');

    if (!shouldTransform) {
      return { code };
    }

    try {
      const result = sucrase.transform(code, {
        transforms: ['flow', 'jsx'],
        jsxRuntime: 'preserve',
        disableESTransforms: true,
      });

      return { code: stripImportTypeofStatements(result.code) };
    } catch {
      // sucrase 에서 처리할 수 없는 구문인 경우 babel 로 처리
      const result = await babel.transformAsync(code, {
        configFile: false,
        minified: false,
        compact: false,
        babelrc: false,
        envName: config.dev ? 'development' : 'production',
        caller: {
          name: 'mpack-strip-flow-plugin',
          supportsStaticESM: true,
        },
        presets: [
          /**
           * flow 구문과 jsx 구문이 함께 존재하는 경우가 있기에 preset-react 사용
           */
          [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
        ],
        plugins: [
          /**
           * flow 구문 변환을 위해 flow-strip-types 사용
           */
          require.resolve('@babel/plugin-transform-flow-strip-types'),
        ],
        filename: path.basename(args.path),
      });

      if (result?.code != null) {
        return { code: result.code };
      }

      throw new Error('babel transform result is null');
    }
  };

  defineStepName(stripFlowStep, 'strip-flow');

  return stripFlowStep;
}
