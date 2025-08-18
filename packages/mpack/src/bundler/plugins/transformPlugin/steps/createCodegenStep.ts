import { transformAsync } from '@babel/core';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { defineStepName } from '../../../../utils/defineStepName';

export function createCodegenStep(): AsyncTransformStep {
  const codegenStep: AsyncTransformStep = async function codegen(code, args) {
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
  };

  defineStepName(codegenStep, 'codegen');

  return codegenStep;
}
