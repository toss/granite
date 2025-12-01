import { transformSync } from '@babel/core';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { defineStepName } from '../../../../utils/defineStepName';

export function createTransformUnicodePropertyEscapeStep(): AsyncTransformStep {
  const unicodePropertyEscapeRegExp = /\\p\{[^}]+\}/u;

  const transformUnicodePropertyEscapeStep: AsyncTransformStep = async (code, args) => {
    if (!unicodePropertyEscapeRegExp.test(code)) {
      return { code };
    }

    const result = transformSync(code, {
      presets: [require.resolve('@babel/preset-typescript')],
      plugins: [require.resolve('@babel/plugin-transform-unicode-regex')],
      filename: args.path,
      sourceMaps: false,
      babelrc: false,
      configFile: false,
    });

    if (result?.code != null) {
      return { code: result.code };
    }

    return { code };
  };

  defineStepName(transformUnicodePropertyEscapeStep, 'transform-unicode-property-escape');

  return transformUnicodePropertyEscapeStep;
}
