import { transformFromAstAsync } from '@babel/core';
import flowRemoveTypes from 'flow-remove-types';
import * as HermesParser from 'hermes-parser';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { defineStepName } from '../../../../utils/defineStepName';

export function createStripFlowStep(): AsyncTransformStep {
  const stripFlowStep: AsyncTransformStep = async function stripFlow(code, args) {
    const shouldTransform = args.path.endsWith('.js') || args.path.endsWith('.jsx');

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
      minified: false,
      compact: false,
      babelrc: false,
      configFile: false,
    });

    const finalCode = transformedResult?.code ?? code;

    return { code: finalCode };
  };

  defineStepName(stripFlowStep, 'strip-flow');

  return stripFlowStep;
}
