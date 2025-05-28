import path from 'path';
import * as swc from '@swc/core';
import { isNotNil } from 'es-toolkit';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { BuildConfig } from '../../../../types';
import { defineStepName } from '../../../../utils/defineStepName';
import { swcHelperOptimizationRules } from '../../shared/swc';

interface TransformToHermesSyntaxStepConfig {
  dev: boolean;
  additionalSwcOptions?: BuildConfig['swc'];
}

function getParserConfig(filepath: string) {
  return /\.tsx?$/.test(filepath)
    ? ({
        syntax: 'typescript',
        tsx: true,
        dynamicImport: true,
      } as swc.TsParserConfig)
    : ({
        syntax: 'ecmascript',
        jsx: true,
        exportDefaultFrom: true,
      } as swc.EsParserConfig);
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
        parser: getParserConfig(args.path),
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
        /**
         * 타입정의가 없지만 실제로는 동작하는 것이 스펙
         *
         * @see {@link https://github.com/swc-project/swc/blob/v1.4.10/crates/swc_ecma_transforms_base/src/assumptions.rs#L11}
         */
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
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
