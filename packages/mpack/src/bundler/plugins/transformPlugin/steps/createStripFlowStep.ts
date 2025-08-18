import { transformFromAstAsync, transformAsync } from '@babel/core';
import flowRemoveTypes from 'flow-remove-types';
import * as HermesParser from 'hermes-parser';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { defineStepName } from '../../../../utils/defineStepName';

export function createStripFlowStep(): AsyncTransformStep {
  const stripFlowStep: AsyncTransformStep = async function stripFlow(code, args) {
    const shouldTransform = args.path.endsWith('.js') || args.path.endsWith('.jsx');
    const isNativeComponent = /(?:^|[\\/])(?:Native\w+|(\w+)NativeComponent)\.[jt]sx?$/.test(args.path);

    if (isNativeComponent) {
      const transformedResult = await transformAsync(code, {
        test: /(?:^|[\\/])(?:Native\w+|(\w+)NativeComponent)\.[jt]sx?$/,
        filename: args.path,
        minified: false,
        compact: false,
        babelrc: false,
        configFile: false,
        plugins: [
          require.resolve('babel-plugin-syntax-hermes-parser'),
          require.resolve('@babel/plugin-transform-flow-strip-types'),
          [require.resolve('@babel/plugin-syntax-typescript'), false],
          require.resolve('@react-native/babel-plugin-codegen'),
        ],
        overrides: [
          {
            test: /\.ts$/,
            plugins: [[require.resolve('@babel/plugin-syntax-typescript'), { isTSX: false, allowNamespaces: true }]],
          },
          {
            test: /\.tsx$/,
            plugins: [[require.resolve('@babel/plugin-syntax-typescript'), { isTSX: true, allowNamespaces: true }]],
          },
        ],
      });

      return { code: transformedResult?.code ?? code };
    }
    if (!shouldTransform) {
      return { code };
    }

    const codeWithoutFlowTypes = flowRemoveTypes(code, {});

    // @see https://flow.org/en/docs/react/component-syntax/
    // This is necessary to transform component syntax, etc.
    const parsedAst = HermesParser.parse(codeWithoutFlowTypes.toString(), {
      flow: 'all',
      babel: true,
    });

    const transformedResult = await transformFromAstAsync(parsedAst as any, undefined, {
      filename: args.path,
      minified: false,
      compact: false,
      babelrc: false,
      configFile: false,
      plugins: [],
    });

    const finalCode = transformedResult?.code ?? code;

    return { code: finalCode.replace('import type', 'import') };
  };

  defineStepName(stripFlowStep, 'strip-flow');

  return stripFlowStep;
}
