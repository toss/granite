import path from 'path';
import type { BuildConfig } from '@granite-js/plugin-core';
import * as swc from '@swc/core';
import { isNotNil } from 'es-toolkit';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { defineStepName } from '../../../../utils/defineStepName';
import { swcHelperOptimizationRules } from '../../shared/swc';

interface TransformToHermesSyntaxStepConfig {
  dev: boolean;
  additionalSwcOptions?: BuildConfig['swc'];
}

function getParserConfig() {
  return {
    syntax: 'typescript',
    tsx: true,
    dynamicImport: true,
  } as swc.TsParserConfig;
}

export function createTransformToHermesSyntaxStep({
  dev,
  additionalSwcOptions = {},
}: TransformToHermesSyntaxStepConfig): AsyncTransformStep {
  const plugins = (additionalSwcOptions.plugins ?? []).filter(isNotNil) as NonNullable<
    swc.JscConfig['experimental']
  >['plugins'];

  const transformToHermesSyntaxStep: AsyncTransformStep = async function transformToHermesSyntax(code, args) {
    const options: swc.Options = {
      minify: false,
      isModule: true,
      jsc: {
        ...swcHelperOptimizationRules.jsc,
        parser: getParserConfig(),
        target: 'es5',
        keepClassNames: true,
        transform: {
          react: {
            runtime: 'automatic',
            development: dev,
          },
        },
        experimental: { plugins },
        loose: false,
        assumptions: {
          setPublicClassFields: true,
          privateFieldsAsProperties: true,
        },
      },
      /**
       * False error 로그가 찍히고 있어 비활성화
       */
      inputSourceMap: false,
      sourceMaps: 'inline',
      filename: path.basename(args.path),
    };

    const result = await swc.transform(code, options);
    return { code: result.code };
  };

  defineStepName(transformToHermesSyntaxStep, 'hermes-syntax');

  return transformToHermesSyntaxStep;
}
