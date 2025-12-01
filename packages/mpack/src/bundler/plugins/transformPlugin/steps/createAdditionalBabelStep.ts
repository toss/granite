import * as path from 'path';
import * as babel from '@babel/core';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { defineStepName } from '../../../../utils/defineStepName';

interface AdditionalBabelStepConfig {
  dev: boolean;
  additionalBabelOptions?: babel.TransformOptions;
}

export function createAdditionalBabelStep({
  dev,
  additionalBabelOptions,
}: AdditionalBabelStepConfig): AsyncTransformStep {
  const additionalBabelStep: AsyncTransformStep = async function additionalBabel(code, args) {
    const hasPlugins = additionalBabelOptions?.plugins && additionalBabelOptions.plugins.length > 0;
    const hasPresets = additionalBabelOptions?.presets && additionalBabelOptions.presets.length > 0;

    if (!hasPlugins && !hasPresets) {
      return { code };
    }

    const babelOptions = babel.loadOptions({
      minified: false,
      compact: false,
      babelrc: false,
      configFile: additionalBabelOptions?.configFile || false,
      envName: dev ? 'development' : 'production',
      presets: additionalBabelOptions?.presets ?? [],
      plugins: additionalBabelOptions?.plugins ?? [],
      sourceMaps: 'inline',
      filename: path.basename(args.path),
      caller: {
        name: 'mpack-additional-babel-plugin',
        supportsStaticESM: false,
      },
    }) as babel.TransformOptions | null;

    if (!babelOptions) {
      return { code };
    }

    if (babelOptions.sourceMaps) {
      babelOptions.sourceFileName = path.basename(args.path);
    }

    const result = await babel.transformAsync(code, babelOptions);

    if (!result?.code) {
      throw new Error('babel transform result is null');
    }

    return { code: result.code };
  };

  defineStepName(additionalBabelStep, 'additional-babel');

  return additionalBabelStep;
}
