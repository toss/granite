import { transformAsync } from '@babel/core';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { defineStepName } from '../../../../utils/defineStepName';

interface FullyBabelTransformStepConfig {
  dev: boolean;
  plugins?: (string | [string, any])[];
  presets?: (string | [string, any])[];
}

export function createFullyBabelTransformStep(config: FullyBabelTransformStepConfig): AsyncTransformStep {
  const { dev, plugins, presets } = config;

  const fullyBabelStep: AsyncTransformStep = async function fullyBabel(code, args) {
    const transformedResult = await transformAsync(code, {
      filename: args.path,
      minified: false,
      compact: false,
      babelrc: false,
      configFile: false,
      presets: [
        [require.resolve('@react-native/babel-preset'), { enableBabelRuntime: false, dev }],
        ...(presets ?? []),
      ],
      plugins: plugins ?? [],
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

  defineStepName(fullyBabelStep, 'fully-babel');
  return fullyBabelStep;
}
