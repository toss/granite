import { generate } from '@babel/generator';
import flowRemoveTypes from 'flow-remove-types';
import * as HermesParser from 'hermes-parser';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { defineStepName } from '../../../../utils/defineStepName';

export function createFlowStripStep(): AsyncTransformStep {
  const flowStripStep: AsyncTransformStep = async function flowStrip(code, args) {
    const shouldTransform = args.path.endsWith('.js') || args.path.endsWith('.jsx');

    if (!shouldTransform) {
      return { code };
    }

    try {
      const transformedCode = flowRemoveTypes(code, {});

      // @see https://flow.org/en/docs/react/component-syntax/
      // This is necessary to transform component syntax, etc.
      const parsedAst = HermesParser.parse(transformedCode.toString(), {
        flow: 'all',
        babel: true,
      });

      const transformedResult = generate(parsedAst as any);

      return { code: transformedResult?.code ?? code };
    } catch {
      return { code };
    }
  };

  defineStepName(flowStripStep, 'flow-strip');

  return flowStripStep;
}
