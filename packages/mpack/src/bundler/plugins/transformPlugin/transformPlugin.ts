import assert from 'assert';
import * as fs from 'fs/promises';
import { Plugin } from 'esbuild';
import { PluginOptions } from '../types';
import * as preludeScript from './helpers/preludeScript';
import { createCacheSteps } from './steps/createCacheSteps';
import { createFlowStripStep } from './steps/createFlowStripStep';
import { createSwcOnlyStep } from './steps/createSwcOnlyStep';
import { createTransformCodegenStep } from './steps/createTransformCodegenStep';
import { Performance } from '../../../performance';
import { AsyncTransformPipeline } from '../../../transformer';

interface TransformPluginOptions {
  transformSync?: (id: string, code: string) => string;
  transformAsync?: (id: string, code: string) => Promise<string>;
}

const sourceRegExp = /\.([mc]js|[tj]sx?)$/;

/**
 * NativeComponent pattern matcher
 */
const NATIVE_COMPONENT_PATTERN = /(?:^|[\\/])(?:Native\w+|(\w+)NativeComponent)\.[jt]sx?$/;

function isNativeComponentPath(path: string): boolean {
  return NATIVE_COMPONENT_PATTERN.test(path);
}

/**
 * Transform plugin using SWC-only approach (faster):
 * - Flow modules (FLOW_TYPED_MODULES) → flow-remove-types → SWC
 * - Non-Flow modules → SWC directly
 * - NativeComponent files → Codegen transform
 */
export function transformPlugin({ context, ...options }: PluginOptions<TransformPluginOptions>): Plugin {
  return {
    name: 'transform-plugin',
    setup(build) {
      const { id, config } = context;
      const { dev, cache, buildConfig } = config;
      const { esbuild, swc, flow } = buildConfig;

      assert(id, 'id 값이 존재하지 않습니다');
      assert(typeof dev === 'boolean', 'dev 값이 존재하지 않습니다');
      assert(typeof cache === 'boolean', 'cache 값이 존재하지 않습니다');

      const cacheSteps = createCacheSteps({ id, enabled: cache });

      // Create flow strip step (if enabled)
      const flowStripStep = flow?.enabled !== false
        ? createFlowStripStep({
            include: flow?.include,
            exclude: flow?.exclude,
            all: flow?.all ?? true,
            removeEmptyImports: flow?.removeEmptyImports ?? true,
            checkFlowTypedModules: true,
          })
        : undefined;

      // Build transform pipeline (swc-only)
      const transformPipeline = new AsyncTransformPipeline()
        .beforeStep(cacheSteps.beforeTransform)
        // Custom transform hooks
        .addStep(async (code, args) => {
          if (options.transformSync) {
            code = options.transformSync(args.path, code);
          }
          if (options.transformAsync) {
            code = await options.transformAsync(args.path, code);
          }
          return { code };
        })
        // Step 1: Codegen for NativeComponents, otherwise flow strip (if enabled)
        .addStep({
          if: ({ path }) => isNativeComponentPath(path),
          then: createTransformCodegenStep(),
          else: flowStripStep,
        })
        // Step 2: SWC transform for all files
        .addStep(createSwcOnlyStep({ dev, swc }))
        .afterStep(cacheSteps.afterTransform);

      preludeScript.registerEntryPointMarker(build);
      preludeScript.registerPreludeScriptResolver(build);

      /**
       * 구성한 transform pipeline 에 원본 코드를 전달하여 변환 처리
       */
      build.onLoad({ filter: sourceRegExp }, async (args) => {
        let code = await fs.readFile(args.path, 'utf-8');

        if (preludeScript.isEntryPoint(args)) {
          code = preludeScript.injectPreludeScript(code, {
            preludeScriptPaths: esbuild?.prelude ?? [],
          });
        }

        const result = await Performance.withTrace(() => transformPipeline.transform(code, args), {
          name: 'transform',
          startOptions: { detail: { file: args.path } },
        });

        return { contents: result.code, loader: 'js' };
      });
    },
  };
}
