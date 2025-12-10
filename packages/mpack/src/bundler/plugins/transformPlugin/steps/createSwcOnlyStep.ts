import path from 'path';
import * as swc from '@swc/core';
import { isNotNil } from 'es-toolkit';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { defineStepName } from '../../../../utils/defineStepName';
import { swcHelperOptimizationRules } from '../../shared/swc';
import { getSwcParserConfig ,type  SwcLoaderOptions } from '../utils';

export interface SwcOnlyStepConfig {
  dev: boolean;
  swc?: SwcLoaderOptions;
}

/**
 * Creates an SWC-only transform step.
 * This is the faster path that doesn't involve Babel at all.
 * Uses file extension to determine the correct SWC parser.
 */
export function createSwcOnlyStep({
  dev,
  swc: swcOptions = {},
}: SwcOnlyStepConfig): AsyncTransformStep {
  const {
    plugins = [],
    externalHelpers = true,
    jsxRuntime = 'automatic',
    importSource = 'react',
  } = swcOptions;

  const filteredPlugins = plugins.filter(isNotNil) as NonNullable<
    swc.JscConfig['experimental']
  >['plugins'];

  const swcOnlyStep: AsyncTransformStep = async function swcOnly(code, args) {
    const parserConfig = getSwcParserConfig(args.path);

    const options: swc.Options = {
      minify: false,
      isModule: true,
      jsc: {
        ...swcHelperOptimizationRules.jsc,
        externalHelpers,
        parser: {
          ...parserConfig,
          dynamicImport: true,
        },
        target: 'es5',
        keepClassNames: true,
        transform: {
          react: {
            runtime: jsxRuntime,
            development: dev,
            importSource,
          },
        },
        experimental: { plugins: filteredPlugins },
        loose: false,
        assumptions: {
          setPublicClassFields: true,
          privateFieldsAsProperties: true,
        },
      },
      inputSourceMap: false,
      sourceMaps: 'inline',
      filename: path.basename(args.path),
    };

    const result = await swc.transform(code, options);
    return { code: result.code };
  };

  defineStepName(swcOnlyStep, 'swc-only');

  return swcOnlyStep;
}
