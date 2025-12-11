import { generate } from '@babel/generator';
import flowRemoveTypes from 'flow-remove-types';
import * as HermesParser from 'hermes-parser';
import { AsyncTransformStep } from '../../../../transformer/TransformPipeline';
import { defineStepName } from '../../../../utils/defineStepName';
import { isFlowTypedModule, isJavaScriptSource } from '../utils';

export interface FlowStripStepConfig {
  /**
   * Array of module names to include for Flow transformation.
   * Defaults to FLOW_TYPED_MODULES.
   */
  include?: string[];
  /**
   * Array of module names to exclude from Flow transformation.
   */
  exclude?: string[];
  /**
   * Whether to bypass looking for @flow pragma comment before parsing.
   * Defaults to true.
   */
  all?: boolean;
  /**
   * Whether to remove empty import statements which were only used for importing Flow types.
   * Defaults to true.
   */
  removeEmptyImports?: boolean;
  /**
   * Whether to check FLOW_TYPED_MODULES pattern.
   * If false, all .js/.jsx files will be processed.
   * Defaults to true.
   */
  checkFlowTypedModules?: boolean;
}

export function createFlowStripStep(config: FlowStripStepConfig = {}): AsyncTransformStep {
  const {
    include,
    exclude,
    all = true,
    removeEmptyImports = true,
    checkFlowTypedModules = true,
  } = config;

  const flowStripStep: AsyncTransformStep = async function flowStrip(code, args) {
    // Only process .js and .jsx files
    if (!isJavaScriptSource(args.path)) {
      return { code };
    }

    // Check if this file should be processed:
    // 1. If checkFlowTypedModules is false, process all JS files
    // 2. If file matches FLOW_TYPED_MODULES pattern, process it
    // 3. If file has @flow pragma, process it (for user code with Flow types)
    // Note: Use multiline flag (m) to match @flow pragma even after prelude script injection
    const hasFlowPragma = /^\s*\/[/*]\s*@flow/m.test(code);
    if (checkFlowTypedModules && !isFlowTypedModule(args.path, { include, exclude }) && !hasFlowPragma) {
      return { code };
    }

    try {
      const transformedCode = flowRemoveTypes(code, {
        all,
      });

      // @see https://flow.org/en/docs/react/component-syntax/
      // This is necessary to transform component syntax, etc.
      const parsedAst = HermesParser.parse(transformedCode.toString(), {
        flow: 'all',
        babel: true,
      });

      const transformedResult = generate(parsedAst as any);
      let resultCode = transformedResult?.code ?? code;

      // Remove empty imports if enabled
      if (removeEmptyImports) {
        resultCode = resultCode.replace(/^import\s*['"][^'"]+['"];?\s*$/gm, '');
      }

      return { code: resultCode };
    } catch {
      return { code };
    }
  };

  defineStepName(flowStripStep, 'flow-strip');

  return flowStripStep;
}
